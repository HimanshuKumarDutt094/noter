import type {
  CollectionConfig,
  SyncConfig,
  InsertMutationFnParams,
  UpdateMutationFnParams,
  DeleteMutationFnParams,
} from "@tanstack/db";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { pg as singletonPg } from "@/lib/pglite";

// Define the configuration interface for IndexDB collection using PGlite
interface IndexDBCollectionConfig<TItem extends object>
  extends Omit<
    CollectionConfig<TItem>,
    "onInsert" | "onUpdate" | "onDelete" | "sync"
  > {
  dbName?: string; // Optional database name, defaults to 'todoist'
  tableName: string; // Required table name
  schema?: StandardSchemaV1<TItem>; // Optional schema for validation/type inference
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

  const sync: SyncConfig<TItem>["sync"] = async (params) => {
    const { begin, write, commit, markReady } = params;
    // Track which IDs we've already applied within the current session to avoid duplicate inserts
    const seenIds = new Set<string | number>();

    const setupNotifications = async () => {
      // Create notification function that handles INSERT/UPDATE/DELETE safely
      await db.query(
        `CREATE OR REPLACE FUNCTION "${funcName}"()
         RETURNS TRIGGER AS $$
         DECLARE
           payload TEXT;
         BEGIN
           IF TG_OP = 'DELETE' THEN
             payload := json_build_object('op', TG_OP, 'id', OLD.id)::text;
           ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
             payload := json_build_object('op', TG_OP, 'id', NEW.id)::text;
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
    const refetchAll = async () => {
      try {
        const currentData = await db.query<{
          id: string | number;
          data: Record<string, unknown>;
        }>(`SELECT id, data FROM "${config.tableName}"`);

        begin();

        // Insert/update all items from database
        const currentIds = new Set<string | number>();
        for (const row of currentData.rows) {
          // Construct item and let TanStack DB schema (if provided) validate/coerce
          const payload: Record<string, unknown> = row.data as Record<string, unknown>;
          const item = ({ id: row.id, ...payload }) as TItem;

          try {
            // Use insert for new IDs, update for ones we've already seen to avoid DuplicateKeySyncError
            const opType = seenIds.has(row.id) ? "update" : "insert";
            write({ type: opType as "insert" | "update", value: item });
            // Mark as seen for subsequent refetch cycles
            seenIds.add(row.id);
            currentIds.add(row.id);
          } catch (e) {
            console.error(`Write failed for id ${String(row.id)} in table ${config.tableName}:`, e);
          }
        }

        // Emit deletes for rows no longer present
        for (const id of lastSeenIds) {
          if (!currentIds.has(id)) {
            write({ type: "delete", value: { id } as TItem });
          }
        }

        // Update last seen ids snapshot
        lastSeenIds.clear();
        currentIds.forEach((id) => lastSeenIds.add(id));

        commit();
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
        if (!initialSyncComplete) {
          bufferedEvents.push(payload);
          return;
        }
        void refetchAll().catch((error) => {
          console.error(
            `Notification handler error for ${config.tableName}:`,
            error
          );
        });
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
  const onInsert = async ({ transaction }: InsertMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          const { id, ...data } = mutation.modified;
          await tx.query(
            `INSERT INTO "${config.tableName}" (id, data) VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [String(id), JSON.stringify(data)]
          );
        }
      });
    } catch (error) {
      console.error(`Insert error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle update mutations
  const onUpdate = async ({ transaction }: UpdateMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          const data = { ...(mutation.modified as Record<string, unknown>) };
          // Ensure we don't persist id inside the JSON data blob
          if ("id" in data) delete (data as Record<string, unknown>).id;
          await tx.query(
            `UPDATE "${config.tableName}" SET data = $1 WHERE id = $2`,
            [JSON.stringify(data), String(mutation.key)]
          );
        }
      });
    } catch (error) {
      console.error(`Update error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle delete mutations
  const onDelete = async ({ transaction }: DeleteMutationFnParams<TItem>): Promise<void> => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          await tx.query(`DELETE FROM "${config.tableName}" WHERE id = $1`, [
            String(mutation.key),
          ]);
        }
      });
    } catch (error) {
      console.error(`Delete error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  return {
    id: config.id,
    schema: config.schema,
    getKey: config.getKey,
    sync: { sync, rowUpdateMode: "full" },
    onInsert,
    onUpdate,
    onDelete,
  };
}
