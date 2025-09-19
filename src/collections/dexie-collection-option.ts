/*
Dexie Collection Options Creator for TanStack DB
- Uses Dexie's native liveQuery() for reactive sync
- Follows Pattern B (Built-in handlers) from create-collection.md
- Leverages Dexie's built-in change detection and observable patterns
- No complex driver abstraction - uses Dexie directly

Usage: pass the returned object to createCollection() from TanStack DB.
*/

/**
 * Usage Examples (moved here as JSDoc):
 *
 * // With schema (recommended)
 * import { z } from 'zod';
 * const todoSchema = z.object({ id: z.string(), text: z.string(), completed: z.boolean() });
 *
 * const todos = createCollection(
 *   dexieCollectionOptions({
 *     id: 'todos',
 *     getKey: (todo) => todo.id,
 *     schema: todoSchema,
 *     tableName: 'todos',
 *   })
 * );
 *
 * // Without schema
 * const notes = createCollection(
 *   dexieCollectionOptions<{ id: string; content: string }>({
 *     id: 'notes',
 *     getKey: (note) => note.id,
 *     tableName: 'notes',
 *   })
 * );
 *
 * // With custom codec for data transformation
 * const users = createCollection(
 *   dexieCollectionOptions({
 *     id: 'users',
 *     getKey: (user) => user.id,
 *     codec: {
 *       parse: (raw) => ({ ...raw, createdAt: new Date(raw.createdAt) }),
 *       serialize: (user) => ({ ...user, createdAt: user.createdAt.toISOString() }),
 *     }
 *   })
 * );
 *
 * // Using enhanced utilities
 * await todos.utils.awaitIds(['todo-1', 'todo-2']); // Wait for optimistic updates
 * todos.utils.refresh(); // Manual refresh
 * const table = todos.utils.getTable(); // Direct Dexie table access
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  CollectionConfig,
  DeleteMutationFnParams,
  InferSchemaOutput,
  InsertMutationFnParams,
  SyncConfig,
  UpdateMutationFnParams,
  UtilsRecord,
} from "@tanstack/db";
import Dexie, { liveQuery, type Table } from "dexie";

// Type for tracking synced record IDs (Strategy 3 from create-collection.md)
const seenIds = new Map<string | number, number>();

// Await specific IDs to be synced (optimistic state management)
const awaitIds = (ids: string[], timeoutMs = 10000): Promise<void> => {
  const allSynced = ids.every((id) => seenIds.has(id));
  if (allSynced) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for IDs: ${ids.join(", ")}`));
    }, timeoutMs);

    const checkIds = () => {
      if (ids.every((id) => seenIds.has(id))) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(checkIds, 100);
      }
    };

    checkIds();
  });
};

// Optional codec interface for data transformation
export interface DexieCodec<TItem, TStored = TItem> {
  parse?: (raw: TStored) => TItem;
  serialize?: (item: TItem) => TStored;
}

// Collection configuration interface - Pattern B: Built-in handlers
export interface DexieCollectionConfig<
  TItem extends object = Record<string, unknown>,
  TSchema extends StandardSchemaV1 = never
> extends Omit<
    CollectionConfig<TItem, string | number, TSchema>,
    "onInsert" | "onUpdate" | "onDelete" | "getKey" | "sync"
  > {
  // Dexie-specific config
  dbName?: string;
  tableName?: string;
  storeName?: string; // alias for tableName for backward compatibility
  codec?: DexieCodec<TItem>;

  // Collection options
  schema?: TSchema;
  rowUpdateMode?: "partial" | "full";
  getKey: (item: TItem) => string | number;
}

// Enhanced utils interface
interface DexieUtils extends UtilsRecord {
  // Direct database access
  getTable: () => Table<Record<string, unknown>, string>;

  // Optimistic state management
  awaitIds: (ids: string[]) => Promise<void>;

  // Manual refresh
  refresh: () => void;

  // Async refetch for tests and explicit usage
  refetch: () => Promise<void>;
}

// Function overloads for type safety - exactly like the old implementation
export function dexieCollectionOptions<T extends StandardSchemaV1>(
  config: DexieCollectionConfig<InferSchemaOutput<T>, T>
): CollectionConfig<InferSchemaOutput<T>, string | number, T> & {
  schema: T;
  utils: DexieUtils;
};

export function dexieCollectionOptions<T extends object>(
  config: DexieCollectionConfig<T> & { schema?: never }
): CollectionConfig<T, string | number> & {
  schema?: never;
  utils: DexieUtils;
};

export function dexieCollectionOptions<
  TItem extends object = Record<string, unknown>,
  TSchema extends StandardSchemaV1 = never
>(
  config: DexieCollectionConfig<TItem, TSchema>
): CollectionConfig<TItem, string | number, TSchema> & { utils: DexieUtils } {
  const dbName = config.dbName || "app-db";
  const tableName =
    config.tableName || config.storeName || config.id || "collection";

  // Initialize Dexie database
  const db = new Dexie(dbName);
  db.version(1).stores({
    [tableName]: "&id, updatedAt", // id as primary key, updatedAt for sorting/conflict resolution
  });

  const table = db.table(tableName) as Table<
    Record<string, unknown> & { id: string; updatedAt?: string },
    string
  >;

  // Schema validation helper following create-collection.md patterns
  const validateSchema = (item: unknown): TItem => {
    if (config.schema) {
      // Handle different schema validation patterns (Zod, etc.)
      const schema = config.schema as unknown as {
        parse?: (data: unknown) => TItem;
        safeParse?: (data: unknown) => {
          success: boolean;
          data?: TItem;
          error?: unknown;
        };
      };

      if (schema.parse) {
        try {
          return schema.parse(item);
        } catch (error) {
          throw new Error(
            `Schema validation failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else if (schema.safeParse) {
        const result = schema.safeParse(item);
        if (!result.success) {
          throw new Error(
            `Schema validation failed: ${JSON.stringify(result.error)}`
          );
        }
        return result.data!;
      }
    }
    return item as TItem;
  };

  // Data transformation helpers
  const parse = (raw: Record<string, unknown>): TItem => {
    let parsed: unknown = raw;

    // Apply codec parse first
    if (config.codec?.parse) {
      parsed = config.codec.parse(raw as never);
    }

    // Then validate against schema - this is where TanStack DB handles validation
    // Schema validation is handled automatically by TanStack DB during insert/update operations
    // The schema is primarily used for type inference and automatic validation
    // Here we just return the parsed data
    return validateSchema(parsed);
  };

  const serialize = (item: TItem): Record<string, unknown> => {
    let serialized: unknown = item;

    // Apply codec serialize
    if (config.codec?.serialize) {
      serialized = config.codec.serialize(item);
    } else {
      serialized = item;
    }

    return serialized as Record<string, unknown>;
  };

  // Track refresh triggers for manual refresh capability
  let refreshTrigger = 0;
  const triggerRefresh = () => {
    refreshTrigger++;
  };

  // Sync implementation using Dexie's liveQuery - the proper way!
  const sync = (params: Parameters<SyncConfig<TItem>["sync"]>[0]) => {
    const { begin, write, commit, markReady } = params;

    // Track the previous snapshot to implement proper diffing
    let previousSnapshot = new Map<string | number, TItem>();

    // Create reactive query using liveQuery - this is the Dexie way!
    const subscription = liveQuery(async () => {
      // Add refreshTrigger as dependency to enable manual refresh
      void refreshTrigger;

      // Fetch all data from the table
      const records = await table.toArray();

      // Transform records and track seen IDs
      const snapshot = new Map<string | number, TItem>();

      for (const record of records) {
        const item = parse(record);
        const key = config.getKey(item);

        // Track this ID as seen (for optimistic state management)
        seenIds.set(key, Date.now());

        snapshot.set(key, item);
      }

      return snapshot;
    }).subscribe({
      next: (currentSnapshot) => {
        // Use begin/write/commit pattern from create-collection.md
        begin();

        // Process insertions and updates
        for (const [key, item] of currentSnapshot) {
          if (previousSnapshot.has(key)) {
            // Item existed before, this is an update
            const previousItem = previousSnapshot.get(key);
            // Only write if the item actually changed (simple JSON comparison)
            if (JSON.stringify(previousItem) !== JSON.stringify(item)) {
              write({
                type: "update",
                value: item,
              });
            }
          } else {
            // New item, this is an insert
            write({
              type: "insert",
              value: item,
            });
          }
        }

        // Process deletions - items that were in previous but not in current
        for (const [key, item] of previousSnapshot) {
          if (!currentSnapshot.has(key)) {
            write({
              type: "delete",
              value: item, // Use the full item for deletion
            });
          }
        }

        // Update our snapshot for the next comparison
        previousSnapshot = new Map(currentSnapshot);

        commit();
      },
      error: (error) => {
        console.error("Dexie liveQuery error:", error);
        // Still mark ready even on error (as per create-collection.md)
        markReady();
      },
    });

    // Mark ready after subscription is established
    markReady();

    // Return cleanup function (critical requirement from create-collection.md)
    return () => {
      subscription?.unsubscribe?.();
    };
  };

  // Built-in mutation handlers (Pattern B) - we implement these directly using Dexie APIs
  const onInsert = async (params: InsertMutationFnParams<TItem>) => {
    const mutations = params.transaction.mutations;

    // Prepare items for bulk insert
    const items = mutations.map((mutation) => {
      const item = serialize(mutation.modified);
      return {
        ...item,
        id: mutation.key,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown> & { id: string; updatedAt: string };
    });

    // Perform bulk operation using Dexie transaction
    await db.transaction("rw", table, async () => {
      await table.bulkPut(items);
    });

    // Wait for the IDs to be synced back (optimistic state management)
    const ids = mutations.map((m) => m.key);
    await awaitIds(ids);

    return ids;
  };

  const onUpdate = async (params: UpdateMutationFnParams<TItem>) => {
    const mutations = params.transaction.mutations;

    await db.transaction("rw", table, async () => {
      for (const mutation of mutations) {
        const key = mutation.key;

        if (config.rowUpdateMode === "full") {
          // Full replacement
          const item = serialize(mutation.modified);
          const updateItem = {
            ...item,
            id: key,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown> & { id: string; updatedAt: string };

          await table.put(updateItem);
        } else {
          // Partial update (default)
          const changes = serialize(mutation.changes as TItem);
          const updateChanges = {
            ...changes,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>;

          await table.update(key, updateChanges);
        }
      }
    });

    // Wait for the IDs to be synced back
    const ids = mutations.map((m) => m.key);
    await awaitIds(ids);

    return ids;
  };

  const onDelete = async (params: DeleteMutationFnParams<TItem>) => {
    const mutations = params.transaction.mutations;
    const ids = mutations.map((m) => m.key);

    // Perform bulk deletion
    await db.transaction("rw", table, async () => {
      await table.bulkDelete(ids);
    });

    // Clean up seen IDs for deleted records
    ids.forEach((id) => seenIds.delete(id));

    return ids;
  };

  // Enhanced utils following the create-collection.md patterns
  const utils: DexieUtils = {
    getTable: () => table as Table<Record<string, unknown>, string>,
    awaitIds,
    refresh: triggerRefresh,
    refetch: async () => {
      // Trigger the liveQuery refresh and yield to the event loop
      triggerRefresh();
      await new Promise((r) => setTimeout(r, 0));
    },
  };

  return {
    id: config.id,
    schema: config.schema,
    getKey: config.getKey,
    rowUpdateMode: config.rowUpdateMode ?? "partial",
    sync: { sync },
    onInsert,
    onUpdate,
    onDelete,
    utils,
  } as CollectionConfig<TItem, string | number> & { utils: DexieUtils };
}

export default dexieCollectionOptions;
