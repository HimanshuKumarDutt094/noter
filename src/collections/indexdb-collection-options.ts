import { pg as singletonPg } from "@/lib/pglite";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  CollectionConfig,
  DeleteMutationFnParams,
  InsertMutationFnParams,
  SyncConfig,
  UpdateMutationFnParams,
} from "@tanstack/db";

// Define the configuration interface for IndexDB collection using PGlite
interface IndexDBCollectionConfig<TItem extends object> {
  // Core collection config fields we use
  id: string;
  getKey?: (item: TItem) => string | number | undefined;
  dbName?: string; // Optional database name, defaults to 'noter'
  tableName: string; // Required table name
  schema?: StandardSchemaV1<TItem>; // Optional schema for validation/type inference
  // Optional codec for parse/serialize to preserve typed fields
  codec?: {
    parse?: (raw: unknown) => TItem;
    serialize?: (item: TItem) => unknown;
  };
  rowUpdateMode?: "partial" | "full";
  // How many rows to process per batch during initial sync
  syncBatchSize?: number;
}

export function indexdbCollectionOptions<TItem extends { id: string | number }>(
  config: IndexDBCollectionConfig<TItem>
): CollectionConfig<TItem> {
  const db = singletonPg;
  const notificationChannel = `tanstack_db_change_${config.tableName}`;
  // Sanitize names for function/trigger identifiers
  const sanitizeIdent = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, "_");
  const funcName = sanitizeIdent(`${notificationChannel}_func`);
  const triggerName = sanitizeIdent(`${notificationChannel}_trigger`);
  let isListenerRunning = true;
  let unsubscribe: (() => Promise<void>) | null = null;
  let notificationHandler: ((payload: string) => void) | null = null;
  let initialSyncComplete = false;
  const bufferedEvents: string[] = [];
  // Track last seen ids to emit deletes on refetch
  const lastSeenIds = new Set<string | number>();
  // Track IDs written locally to ignore echo notifications from the same client
  const locallyWrittenIds = new Map<string | number, number>();
  // Global seen ids + event target for awaitIds semantics
  const seenIdsMap = new Map<string | number, number>();
  const seenEventTarget = new EventTarget();

  const seenIdsMapSet = (id: string | number, ts: number) => {
    try {
      seenIdsMap.set(id, ts);
      seenEventTarget.dispatchEvent(
        new CustomEvent("seen", { detail: { id } })
      );
    } catch {
      // ignore
    }
  };

  // Prune locallyWrittenIds to avoid unbounded growth
  const pruneLocallyWrittenIds = () => {
    const now = Date.now();
    const ttl = 60_000; // 60s
    for (const [k, t] of Array.from(locallyWrittenIds.entries())) {
      if (now - t > ttl) locallyWrittenIds.delete(k);
    }
  };

  const awaitIds = (ids: Array<string | number>, timeoutMs = 10000) => {
    const missing = ids.filter((id) => !seenIdsMap.has(id));
    if (missing.length === 0) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const onSeen = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as
          | { id: string | number }
          | undefined;
        if (!detail) return;
        const allSeen = ids.every((id) => seenIdsMap.has(id));
        if (allSeen) {
          seenEventTarget.removeEventListener("seen", onSeen as EventListener);
          clearTimeout(timeout);
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        seenEventTarget.removeEventListener("seen", onSeen as EventListener);
        reject(new Error("awaitIds timeout"));
      }, timeoutMs);

      seenEventTarget.addEventListener("seen", onSeen as EventListener);
    });
  };

  const sync: SyncConfig<TItem>["sync"] = async (params) => {
    const { begin, write, commit, markReady } = params;
    // Track which IDs we've already applied within the current session to avoid duplicate inserts
    const seenIds = new Set<string | number>();
    // NOTE: use the outer `locallyWrittenIds` map (do NOT shadow it here)

    const setupNotifications = async () => {
      // Create notification function that handles INSERT/UPDATE/DELETE safely
      await db.query(
        `CREATE OR REPLACE FUNCTION "${funcName}"()
         RETURNS TRIGGER AS $$
         DECLARE
           payload TEXT;
         BEGIN
          IF TG_OP = 'DELETE' THEN
            payload := json_build_object('op', TG_OP, 'id', OLD.id, 'row', row_to_json(OLD))::text;
          ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            payload := json_build_object('op', TG_OP, 'id', NEW.id, 'row', row_to_json(NEW))::text;
           ELSE
             payload := json_build_object('op', TG_OP)::text;
           END IF;
           PERFORM pg_notify('${notificationChannel}', payload);
           RETURN COALESCE(NEW, OLD);
         END;
         $$ LANGUAGE plpgsql;`
      );

      // Create trigger for INSERT, UPDATE, DELETE operations
      await db.query(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "${config.tableName}";`
      );
      await db.query(
        `CREATE TRIGGER "${triggerName}"
         AFTER INSERT OR UPDATE OR DELETE ON "${config.tableName}"
         FOR EACH ROW EXECUTE FUNCTION "${funcName}"();`
      );
    };

    // Helper to re-fetch all data and update the collection state
    // Fetch a single row by id and apply the corresponding write
    const refetchRow = async (id: string | number) => {
      try {
        const res = await db.query<{
          id: string | number;
          data: Record<string, unknown>;
        }>(`SELECT id, data FROM "${config.tableName}" WHERE id = $1`, [
          String(id),
        ]);

        begin();

        if (res.rows.length === 0) {
          // Row missing -> delete locally
          write({ type: "delete", value: { id } as TItem });
        } else {
          const row = res.rows[0];
          const raw = row.data as unknown;
          const parsed = config.codec?.parse
            ? config.codec.parse(raw)
            : ({ id: row.id, ...(raw as Record<string, unknown>) } as TItem);

          // ensure id present
          // ensure id present (non-invasive)
          try {
            const p = parsed as unknown as Record<string, unknown>;
            if (p && p.id === undefined) p.id = row.id;
          } catch {
            // ignore
          }

          const opType = seenIds.has(row.id) ? "update" : "insert";
          write({ type: opType as "insert" | "update", value: parsed });
          seenIds.add(row.id);

          // mark seen for awaitIds
          seenIdsMapSet(row.id, Date.now());
        }

        commit();
      } catch (error) {
        console.error(
          `Error refetching row ${String(id)} for table ${config.tableName}:`,
          error
        );
      }
    };

    const refetchAll = async () => {
      try {
        const batchSize = config.syncBatchSize ?? 1000;
        const currentIds = new Set<string | number>();

        let offset = 0;
        while (true) {
          const page = await db.query<{
            id: string | number;
            data: Record<string, unknown>;
          }>(
            `SELECT id, data FROM "${config.tableName}" ORDER BY id LIMIT $1 OFFSET $2`,
            [batchSize, offset]
          );

          if (!page.rows.length) break;

          begin();
          for (const row of page.rows) {
            const raw = row.data as unknown;
            const parsed = config.codec?.parse
              ? config.codec.parse(raw)
              : ({ id: row.id, ...(raw as Record<string, unknown>) } as TItem);

            try {
              try {
                const p = parsed as unknown as Record<string, unknown>;
                if (p && p.id === undefined) p.id = row.id;
              } catch {
                // ignore
              }

              const opType = seenIds.has(row.id) ? "update" : "insert";
              write({ type: opType as "insert" | "update", value: parsed });
              seenIds.add(row.id);
              currentIds.add(row.id);

              // mark seen globally
              seenIdsMapSet(row.id, Date.now());
            } catch (e) {
              console.error(
                `Write failed for id ${String(row.id)} in table ${
                  config.tableName
                }:`,
                e
              );
            }
          }
          commit();

          if (page.rows.length < batchSize) break;
          offset += page.rows.length;
        }

        // Emit deletes for rows no longer present
        if (lastSeenIds.size) {
          begin();
          for (const id of lastSeenIds) {
            if (!currentIds.has(id)) {
              write({ type: "delete", value: { id } as TItem });
            }
          }
          commit();
        }

        lastSeenIds.clear();
        currentIds.forEach((id) => lastSeenIds.add(id));
      } catch (error) {
        console.error(
          `Error refetching data for table ${config.tableName}:`,
          error
        );
      }
    };

    try {
      // Initialize the table with id and JSONB data column (single statement -> use query)
      await db.query(
        `CREATE TABLE IF NOT EXISTS "${config.tableName}" (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        );`
      );

      // Start listening FIRST and buffer events to avoid race with initial sync
      isListenerRunning = true;
      notificationHandler = (payload: string) => {
        if (!isListenerRunning) return;
        try {
          const parsed = JSON.parse(payload);
          const id = parsed.id;
          // Ignore notifications we recently wrote locally (within 2s)
          const lastWritten = locallyWrittenIds.get(id);
          const now = Date.now();
          if (lastWritten && now - lastWritten < 2000) {
            // skip echo
            return;
          }

          if (!initialSyncComplete) {
            bufferedEvents.push(payload);
            return;
          }

          // If the notification contains row payload, apply it directly
          if (parsed.row) {
            begin();
            if (parsed.op === "DELETE") {
              write({ type: "delete", value: { id } as TItem });
            } else {
              const rowData = parsed.row.data ?? parsed.row;
              const item = { id, ...rowData } as TItem;
              const opType = seenIds.has(id) ? "update" : "insert";
              write({ type: opType as "insert" | "update", value: item });
              seenIds.add(id);
            }
            commit();
          } else {
            // Fallback: fetch single row
            void refetchRow(id).catch((error) =>
              console.error(
                `Notification handler error for ${config.tableName}:`,
                error
              )
            );
          }
        } catch (err) {
          console.error("Failed to handle notification payload", err);
        }
      };
      unsubscribe = await db.listen(notificationChannel, notificationHandler);

      // Set up real-time notifications (function/trigger)
      await setupNotifications();

      // Perform initial data fetch
      await refetchAll();

      // Mark ready then flush buffered events via a single refetch
      markReady();
      initialSyncComplete = true;
      if (bufferedEvents.length) {
        bufferedEvents.length = 0; // clear buffer
        await refetchAll();
      }
    } catch (error) {
      console.error(
        `Sync initialization failed for ${config.tableName}:`,
        error
      );
      // Even on error, mark collection as ready to avoid blocking the app
      markReady();
      throw error;
    }

    // Return cleanup function
    return async () => {
      isListenerRunning = false;

      try {
        // Unsubscribe from notifications
        if (unsubscribe) {
          await unsubscribe();
          unsubscribe = null;
        }
      } catch (error) {
        console.error(`Cleanup error for ${config.tableName}:`, error);
      } finally {
        // Do not close the shared singleton DB here; it is closed centrally on unload
      }
    };
  };

  // Handle insert mutations
  const onInsert = async ({
    transaction,
  }: InsertMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          const item = mutation.modified as TItem;
          const id =
            (item as unknown as { id?: string | number }).id ?? mutation.key;
          const stored = config.codec?.serialize
            ? config.codec.serialize(item)
            : (() => {
                const tmp = { ...(item as unknown as Record<string, unknown>) };
                delete tmp.id;
                return tmp;
              })();

          await tx.query(
            `INSERT INTO "${config.tableName}" (id, data) VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [String(id), JSON.stringify(stored)]
          );

          // mark as locally written to suppress echo notifications
          try {
            locallyWrittenIds.set(id, Date.now());
            pruneLocallyWrittenIds();
            // mark seen so awaitIds resolves for local writers
            seenIdsMapSet(id, Date.now());
          } catch {
            // ignore
          }
        }
      });
    } catch (error) {
      console.error(`Insert error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle update mutations
  const onUpdate = async ({
    transaction,
  }: UpdateMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          const key = mutation.key;
          if (config.rowUpdateMode === "partial") {
            // Merge existing stored row with changes
            const res = await tx.query<{ data: Record<string, unknown> }>(
              `SELECT data FROM "${config.tableName}" WHERE id = $1`,
              [String(key)]
            );
            const existingRaw = res.rows[0]?.data as unknown;
            const existing = existingRaw
              ? config.codec?.parse
                ? config.codec.parse(existingRaw)
                : ({
                    id: key,
                    ...(existingRaw as Record<string, unknown>),
                  } as TItem)
              : ({} as TItem);

            const next = {
              ...(existing as unknown as object),
              ...(mutation.changes as object),
            } as unknown as TItem;
            const stored = config.codec?.serialize
              ? config.codec.serialize(next)
              : (() => {
                  const tmp = {
                    ...(next as unknown as Record<string, unknown>),
                  };
                  delete tmp.id;
                  return tmp;
                })();

            await tx.query(
              `UPDATE "${config.tableName}" SET data = $1 WHERE id = $2`,
              [JSON.stringify(stored), String(key)]
            );

            try {
              locallyWrittenIds.set(key, Date.now());
              pruneLocallyWrittenIds();
              seenIdsMapSet(key, Date.now());
            } catch {
              // ignore
            }
          } else {
            // full update: replace stored row with modified
            const item = mutation.modified as TItem;
            const id = (item as unknown as { id?: string | number }).id ?? key;
            const stored = config.codec?.serialize
              ? config.codec.serialize(item)
              : (() => {
                  const tmp = {
                    ...(item as unknown as Record<string, unknown>),
                  };
                  delete tmp.id;
                  return tmp;
                })();

            await tx.query(
              `UPDATE "${config.tableName}" SET data = $1 WHERE id = $2`,
              [JSON.stringify(stored), String(id)]
            );

            try {
              locallyWrittenIds.set(id, Date.now());
              pruneLocallyWrittenIds();
              seenIdsMapSet(id, Date.now());
            } catch {
              // ignore
            }
          }
        }
      });
    } catch (error) {
      console.error(`Update error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle delete mutations
  const onDelete = async ({
    transaction,
  }: DeleteMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          await tx.query(`DELETE FROM "${config.tableName}" WHERE id = $1`, [
            String(mutation.key),
          ]);
          try {
            locallyWrittenIds.set(mutation.key, Date.now());
            pruneLocallyWrittenIds();
            seenIdsMapSet(mutation.key, Date.now());
          } catch {
            // ignore
          }
        }
      });
    } catch (error) {
      console.error(`Delete error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  return {
    id: config.id,
    getKey: config.getKey,
    sync: { sync, rowUpdateMode: config.rowUpdateMode ?? "full" },
    onInsert,
    onUpdate,
    onDelete,
    utils: {
      awaitIds,
    },
  } as CollectionConfig<TItem>;
}
