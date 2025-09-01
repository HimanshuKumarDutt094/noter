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
  schema: StandardSchemaV1<TItem>; // Schema for validation
}

export function indexdbCollectionOptions<TItem extends { id: string | number }>(
  config: IndexDBCollectionConfig<TItem>
): CollectionConfig<TItem> {
  const db = singletonPg;
  const notificationChannel = `tanstack_db_change_${config.tableName}`;
  let isListenerRunning = true;
  let unsubscribe: (() => Promise<void>) | null = null;
  let notificationHandler: ((payload: string) => void) | null = null;

  const sync: SyncConfig<TItem>["sync"] = async (params) => {
    const { begin, write, commit, markReady } = params;
    // Track which IDs we've already applied to the collection to avoid duplicate inserts
    const seenIds = new Set<string | number>();

    const setupNotifications = async () => {
      // Create notification function for real-time updates (single statement)
      await db.query(
        `CREATE OR REPLACE FUNCTION ${notificationChannel}_func()
         RETURNS TRIGGER AS $$
         BEGIN
           PERFORM pg_notify('${notificationChannel}', row_to_json(NEW)::text);
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`
      );

      // Create trigger for INSERT, UPDATE, DELETE operations (split into single statements)
      await db.query(
        `DROP TRIGGER IF EXISTS ${notificationChannel}_trigger ON "${config.tableName}";`
      );
      await db.query(
        `CREATE TRIGGER ${notificationChannel}_trigger
         AFTER INSERT OR UPDATE OR DELETE ON "${config.tableName}"
         FOR EACH ROW EXECUTE FUNCTION ${notificationChannel}_func();`
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

        // Simple approach: insert all items from database
        // TanStack DB will handle deduplication and updates automatically
        for (const row of currentData.rows) {
          // Validate data using Standard Schema
          let validationResult = config.schema["~standard"].validate({
            id: row.id,
            ...row.data,
          });
          if (validationResult instanceof Promise) {
            validationResult = await validationResult;
          }

          if (validationResult.issues) {
            console.warn(
              `Validation failed for item ${row.id}:`,
              validationResult.issues
            );
            continue;
          }

          const item = validationResult.value;

          // Use insert for new IDs, update for ones we've already seen to avoid DuplicateKeySyncError
          const opType = seenIds.has(row.id) ? "update" : "insert";
          write({ type: opType as "insert" | "update", value: item });
          // Mark as seen for subsequent refetch cycles
          seenIds.add(row.id);
        }

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

      // Set up real-time notifications
      await setupNotifications();

      // Perform initial data fetch
      await refetchAll();

      // Listen for real-time changes using the correct PGlite API
      isListenerRunning = true;

      notificationHandler = (payload: string) => {
        void payload; // avoid unused param lint
        if (!isListenerRunning) return;
        void refetchAll().catch((error) => {
          console.error(
            `Notification handler error for ${config.tableName}:`,
            error
          );
        });
      };

      // Subscribe to the specific channel using idiomatic PGlite listen API
      unsubscribe = await db.listen(notificationChannel, notificationHandler);
    } catch (error) {
      console.error(
        `Sync initialization failed for ${config.tableName}:`,
        error
      );
      throw error;
    } finally {
      // Always mark ready, even on error
      markReady();
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
  const onInsert = async ({ transaction }: InsertMutationFnParams<TItem>) => {
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
      return transaction.mutations.map((m) => m.key);
    } catch (error) {
      console.error(`Insert error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle update mutations
  const onUpdate = async ({ transaction }: UpdateMutationFnParams<TItem>) => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          const { ...data } = mutation.modified;
          await tx.query(
            `UPDATE "${config.tableName}" SET data = $1 WHERE id = $2`,
            [JSON.stringify(data), String(mutation.key)]
          );
        }
      });
      return transaction.mutations.map((m) => m.key);
    } catch (error) {
      console.error(`Update error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  // Handle delete mutations
  const onDelete = async ({ transaction }: DeleteMutationFnParams<TItem>) => {
    try {
      await db.transaction(async (tx) => {
        for (const mutation of transaction.mutations) {
          await tx.query(`DELETE FROM "${config.tableName}" WHERE id = $1`, [
            String(mutation.key),
          ]);
        }
      });
      return transaction.mutations.map((m) => m.key);
    } catch (error) {
      console.error(`Delete error for table ${config.tableName}:`, error);
      throw error;
    }
  };

  return {
    id: config.id,
    schema: config.schema,
    getKey: config.getKey,
    sync: { sync },
    onInsert,
    onUpdate,
    onDelete,
  };
}
