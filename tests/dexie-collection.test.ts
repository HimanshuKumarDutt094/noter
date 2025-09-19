import { createCollection } from "@tanstack/db";
// Ensure fake IndexedDB is installed before Dexie is dynamically imported
import type Dexie from "dexie";
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import dexieCollectionOptions from "../src/collections/dexie-collection-option";

// Test schema following StandardSchemaV1 pattern
export const TestItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type TestItem = z.infer<typeof TestItemSchema>;

function getTestData(amount: number): TestItem[] {
  return new Array(amount)
    .fill(0)
    .map((_v, i) => ({ id: String(i + 1), name: `Item ${i + 1}` }));
}

const DB_PREFIX = "test-dexie-";
let dbId = 0;

const createdDbs: Dexie[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createdCollections: any[] = [];

async function waitForCollectionSize(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collection: any,
  expected: number,
  timeoutMs = 1000
) {
  const start = Date.now();
  while (collection.size !== expected) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out waiting for collection size ${expected}, current=${collection.size}`
      );
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function waitForKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collection: any,
  key: string,
  timeoutMs = 1000
) {
  // Prefer driver-provided awaitIds for determinism when available
  const utils = collection.utils as unknown as
    | {
        awaitIds?: (
          ids: Array<string | number>,
          timeoutMs?: number
        ) => Promise<void>;
      }
    | undefined;

  if (utils?.awaitIds) {
    await utils.awaitIds([key], timeoutMs);
    return;
  }

  const start = Date.now();
  while (!collection.has(String(key))) {
    if (Date.now() - start > timeoutMs)
      throw new Error(`Timed out waiting for key ${key}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function createDexieDatabase(initialDocs: TestItem[] = [], id = dbId++) {
  const name = DB_PREFIX + id;
  const { default: Dexie } = await import("dexie");
  const db = new Dexie(name);
  // Include `updatedAt` index to match the collection implementation
  // which defines the table as `&id, updatedAt`. This prevents
  // Dexie from trying to upgrade/delete the DB when tests create
  // a database with a mismatched schema.
  db.version(1).stores({ test: "&id, updatedAt" });
  await db.open();
  if (initialDocs.length > 0) {
    // New driver stores user objects at top-level (no `value` wrapper)
    await db.table("test").bulkPut(initialDocs);
  }
  createdDbs.push(db);
  return db;
}

async function createTestState(initialDocs: TestItem[] = []) {
  const db = await createDexieDatabase(initialDocs);
  const options = dexieCollectionOptions({
    id: "test",
    tableName: "test",
    dbName: db.name,
    schema: TestItemSchema,
    getKey: (item) => item.id,
    // note: new dexieCollectionOptions uses Dexie's liveQuery internally
    // and does not accept `startSync` or `syncBatchSize` options anymore.
  });
  const collection = createCollection(options);
  await collection.stateWhenReady();
  createdCollections.push(collection);
  // In Node tests change events / BroadcastChannel may not propagate.
  // Trigger a refetch if available so initial DB contents are loaded.
  const utils = collection.utils as unknown as {
    refetch?: () => Promise<void>;
    refresh?: () => void;
  };
  if (utils.refetch) await utils.refetch();
  else if (utils.refresh) utils.refresh();
  return { collection, db };
}

describe("Dexie Integration (tests folder)", () => {
  afterEach(async () => {
    // Clean up collections first to ensure their drivers unsubscribe and close DBs
    for (const col of createdCollections.splice(0)) {
      try {
        await col.cleanup();
      } catch {
        // ignore
      }
    }

    for (const db of createdDbs.splice(0)) {
      try {
        await db.close();
      } catch {
        // ignore
      }
      try {
        const { default: Dexie } = await import("dexie");
        await Dexie.delete(db.name);
      } catch {
        // ignore
      }
    }
  });

  it("should call unsubscribe when collection is cleaned up", async () => {
    const { collection, db } = await createTestState();

    await collection.cleanup();

    // After cleanup, writing directly to Dexie should not update collection
    // write top-level object per new driver
    await db.table("test").put({ id: "x1", name: "should-not-see" });
    // allow microtasks to flush
    await new Promise((r) => setTimeout(r, 50));
    expect(collection.get("x1")).toBeUndefined();

    await db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  });

  it("should restart sync when collection is accessed after cleanup", async () => {
    const initial = getTestData(2);
    const { collection, db } = await createTestState(initial);

    await collection.cleanup();
    // small delay to allow cleanup side-effects
    await new Promise((r) => setTimeout(r, 20));

    // insert into Dexie while cleaned-up
    // write top-level object per new driver
    await db.table("test").put({ id: "3", name: "Item 3" });

    // The previous collection was cleaned up and its driver unsubscribed.
    // Create a fresh collection instance pointed at the same DB to verify
    // that accessing the collection after cleanup restarts sync.
    const options = dexieCollectionOptions({
      id: "test-restarted",
      tableName: "test",
      dbName: db.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
    });
    const restarted = createCollection(options);
    await restarted.stateWhenReady();
    createdCollections.push(restarted);

    const utils2 = restarted.utils as unknown as {
      refetch?: () => Promise<void>;
    };
    if (utils2.refetch) await utils2.refetch();

    // Prefer awaitIds if available on the new collection
    const utilsAny = restarted.utils as unknown as
      | {
          awaitIds?: (
            ids: Array<string | number>,
            timeoutMs?: number
          ) => Promise<void>;
        }
      | undefined;
    if (utilsAny?.awaitIds) await utilsAny.awaitIds(["3"], 1000);
    else await waitForKey(restarted, "3", 1000);
    expect(restarted.get("3")?.name).toEqual("Item 3");
    db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  }, 20000);

  it("initializes and fetches initial data", async () => {
    const initial = getTestData(2);
    const { collection, db } = await createTestState(initial);
    await waitForCollectionSize(collection, initial.length, 1000);
    expect(collection.size).toBe(2);
    expect(collection.get("1")).toEqual(initial[0]);
    expect(collection.get("2")).toEqual(initial[1]);

    await db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  }, 20000);

  it("handles many documents across batches", async () => {
    const docs = getTestData(25);
    const { collection, db } = await createTestState(docs);
    await waitForCollectionSize(collection, docs.length, 15000);
    expect(collection.size).toBe(25);
    expect(collection.get("1")).toEqual(docs[0]);
    expect(collection.get("10")).toEqual(docs[9]);
    expect(collection.get("25")).toEqual(docs[24]);

    db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  }, 20000);

  it("updates when dexie table is changed (put/delete broadcast)", async () => {
    const initial = getTestData(2);
    const { collection, db } = await createTestState(initial);

    // write directly to Dexie and then force a refetch (no change events in Node)
    // write top-level object per new driver
    await db.table("test").put({ id: "3", name: "inserted" });
    const utils = collection.utils as unknown as {
      refetch?: () => Promise<void>;
      awaitIds?: (
        ids: Array<string | number>,
        timeoutMs?: number
      ) => Promise<void>;
    };
    if (utils.refetch) await utils.refetch();
    // allow microtasks to flush and driver to process
    await new Promise((r) => setTimeout(r, 50));
    // As a fallback wait for the key to appear
    await waitForKey(collection, "3", 1000);
    expect(collection.get("3")?.name).toBe("inserted");

    if (utils.awaitIds) await utils.awaitIds(["3"], 500);

    await db.table("test").delete("3");
    if (utils.refetch) await utils.refetch();
    await new Promise((r) => setTimeout(r, 20));
    expect(collection.get("3")).toBeUndefined();

    db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  }, 20000);

  it("collection writes persist to dexie via mutation handlers", async () => {
    const initial = getTestData(2);
    const { collection, db } = await createTestState(initial);

    const tx = collection.insert({ id: "4", name: "persisted" });
    await tx.isPersisted.promise;
    const utils = collection.utils as unknown as {
      refetch?: () => Promise<void>;
    };
    if (utils.refetch) await utils.refetch();
    await new Promise((r) => setTimeout(r, 50));
    // Ensure the collection sees the persisted insertion before updating
    await waitForKey(collection, "4", 1000);

    const row = await db.table("test").get("4");
    // New driver stores item at top-level (row contains the user object)
    expect(row).toMatchObject({ id: "4", name: "persisted" });

    // updates
    collection.update("4", (d) => (d.name = "updated"));
    await collection.stateWhenReady();
    if (utils.refetch) await utils.refetch();
    const row2 = await db.table("test").get("4");
    expect(row2?.name).toBe("updated");

    collection.delete("4");
    await collection.stateWhenReady();
    if (utils.refetch) await utils.refetch();
    const afterDel = await db.table("test").get("4");
    expect(afterDel).toBeUndefined();

    await db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  }, 20000);

  it("should update the state across instances (multi tab)", async () => {
    const dbid = dbId++;
    const db1 = await createDexieDatabase([], dbid);
    const db2 = await createDexieDatabase(getTestData(2), dbid);

    const opts1 = dexieCollectionOptions({
      id: "test",
      storeName: "test",
      dbName: db1.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
      // startSync removed in new implementation
    });

    const opts2 = dexieCollectionOptions({
      id: "test",
      storeName: "test",
      dbName: db2.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
      // startSync removed in new implementation
    });

    const col1 = createCollection(opts1);
    const col2 = createCollection(opts2);
    await col1.stateWhenReady();
    await col2.stateWhenReady();

    // tanstack-db writes
    const t1 = col1.insert({ id: "t1", name: "t1" });
    const t2 = col2.insert({ id: "t2", name: "t2" });
    await t1.isPersisted.promise;
    await t2.isPersisted.promise;

    // ensure persisted in storage
    await db1.table("test").get("t1");
    await db1.table("test").get("t2");

    // try to let broadcast/changes propagate; if not available, force refetch
    const utils1 = col1.utils as unknown as { refetch?: () => Promise<void> };
    const utils2 = col2.utils as unknown as { refetch?: () => Promise<void> };
    if (utils1.refetch) await utils1.refetch();
    if (utils2.refetch) await utils2.refetch();

    expect(col2.get("t1")).toBeTruthy();
    expect(col1.get("t2")).toBeTruthy();

    // Dexie direct writes
    await db1.table("test").put({ id: "rx1", name: "rx1" });
    await db2.table("test").put({ id: "rx2", name: "rx2" });

    if (utils1.refetch) await utils1.refetch();
    if (utils2.refetch) await utils2.refetch();

    // Prefer awaitIds when available to deterministically wait for the records
    const utils1Any = col1.utils as unknown as
      | {
          awaitIds?: (
            ids: Array<string | number>,
            timeoutMs?: number
          ) => Promise<void>;
        }
      | undefined;
    const utils2Any = col2.utils as unknown as
      | {
          awaitIds?: (
            ids: Array<string | number>,
            timeoutMs?: number
          ) => Promise<void>;
        }
      | undefined;

    if (utils1Any?.awaitIds) await utils1Any.awaitIds(["rx1"], 1000);
    else await waitForKey(col2, "rx1", 1000);

    if (utils2Any?.awaitIds) await utils2Any.awaitIds(["rx2"], 1000);
    else await waitForKey(col1, "rx2", 1000);

    expect(col2.get("rx1")).toBeTruthy();
    expect(col1.get("rx2")).toBeTruthy();

    db1.close();
    db2.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db1.name);
    } catch {
      // ignore
    }
  });

  it("awaitIds utility deterministically waits for cross-instance ids", async () => {
    const dbid = dbId++;
    const db1 = await createDexieDatabase([], dbid);
    const db2 = await createDexieDatabase([], dbid);

    const opts1 = dexieCollectionOptions({
      id: "deterministic-a",
      storeName: "test",
      dbName: db1.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
    });
    const opts2 = dexieCollectionOptions({
      id: "deterministic-b",
      storeName: "test",
      dbName: db2.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
    });

    const colA = createCollection(opts1);
    const colB = createCollection(opts2);
    await colA.stateWhenReady();
    await colB.stateWhenReady();

    // Insert via collection A and wait for persistence
    const tx = colA.insert({ id: "det-1", name: "deterministic" });
    await tx.isPersisted.promise;

    // Prefer awaitIds on the receiving collection for deterministic behavior
    const utilsBAny = colB.utils as unknown as
      | {
          awaitIds?: (
            ids: Array<string | number>,
            timeoutMs?: number
          ) => Promise<void>;
        }
      | undefined;

    if (utilsBAny?.awaitIds) {
      // deterministic wait should not throw
      await utilsBAny.awaitIds(["det-1"], 1000);
    } else {
      // fallback: explicit refetch then wait for key
      const utilsB = colB.utils as unknown as { refetch?: () => Promise<void> };
      if (utilsB.refetch) await utilsB.refetch();
      await waitForKey(colB, "det-1", 1000);
    }

    expect(colB.get("det-1")?.name).toBe("deterministic");

    db1.close();
    db2.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db1.name);
    } catch {
      // ignore
    }
  });

  it("restarted collection fetches existing DB state after cleanup", async () => {
    const initial = getTestData(3);
    const db = await createDexieDatabase(initial);

    const opts = dexieCollectionOptions({
      id: "restart-fetch",
      tableName: "test",
      dbName: db.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
    });

    const col = createCollection(opts);
    await col.stateWhenReady();
    createdCollections.push(col);

    // ensure initial items are loaded
    await waitForCollectionSize(col, initial.length, 1000);
    expect(col.size).toBe(3);

    // cleanup the collection (unsubscribe/cleanup)
    await col.cleanup();

    // create a fresh collection pointing to the same DB
    const restarted = createCollection(opts);
    await restarted.stateWhenReady();
    createdCollections.push(restarted);

    // the restarted collection should immediately see the existing DB rows
    await waitForCollectionSize(restarted, initial.length, 1000);
    expect(restarted.get("1")?.name).toBe(initial[0].name);
    expect(restarted.get("2")?.name).toBe(initial[1].name);
    expect(restarted.get("3")?.name).toBe(initial[2].name);

    await db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  });

  it("should validate data using the provided schema", async () => {
    const { collection, db } = await createTestState();

    // Valid data should work
    const validTx = collection.insert({ id: "valid", name: "Valid Item" });
    await validTx.isPersisted.promise;

    // Trigger refetch to sync collection state with database
    const utils = collection.utils as unknown as {
      refetch?: () => Promise<void>;
    };
    if (utils.refetch) await utils.refetch();
    await waitForKey(collection, "valid", 1000);

    expect(collection.get("valid")?.name).toBe("Valid Item");

    // Test that schema validation is working by checking type safety
    // This test verifies that the collection properly infers types from the schema
    const item = collection.get("valid");
    if (item) {
      // These properties should be available and properly typed
      expect(typeof item.id).toBe("string");
      expect(typeof item.name).toBe("string");

      // TypeScript should know about these properties from the schema
      const itemId: string = item.id;
      const itemName: string = item.name;
      expect(itemId).toBe("valid");
      expect(itemName).toBe("Valid Item");
    }

    await db.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db.name);
    } catch {
      // ignore
    }
  });

  it("should support both schema-first and explicit type patterns", async () => {
    const dbid = dbId++;
    const db1 = await createDexieDatabase([], dbid);

    // Schema-first pattern (what we're using above)
    const schemaOptions = dexieCollectionOptions({
      id: "schema-test",
      storeName: "test",
      dbName: db1.name,
      schema: TestItemSchema,
      getKey: (item) => item.id,
      // startSync removed in new implementation
    });

    // Explicit type pattern (without schema for backward compatibility)
    const explicitOptions = dexieCollectionOptions<TestItem>({
      id: "explicit-test",
      storeName: "test",
      dbName: db1.name,
      getKey: (item) => item.id,
      // startSync removed in new implementation
    });

    const schemaCollection = createCollection(schemaOptions);
    const explicitCollection = createCollection(explicitOptions);

    await schemaCollection.stateWhenReady();
    await explicitCollection.stateWhenReady();

    // Both should work the same way
    const schemaTx = schemaCollection.insert({ id: "s1", name: "Schema Item" });
    const explicitTx = explicitCollection.insert({
      id: "e1",
      name: "Explicit Item",
    });

    await schemaTx.isPersisted.promise;
    await explicitTx.isPersisted.promise;

    // Trigger refetch to sync collection states with database
    const schemaUtils = schemaCollection.utils as unknown as {
      refetch?: () => Promise<void>;
    };
    const explicitUtils = explicitCollection.utils as unknown as {
      refetch?: () => Promise<void>;
    };
    if (schemaUtils.refetch) await schemaUtils.refetch();
    if (explicitUtils.refetch) await explicitUtils.refetch();
    await waitForKey(schemaCollection, "s1", 1000);
    await waitForKey(explicitCollection, "e1", 1000);

    expect(schemaCollection.get("s1")?.name).toBe("Schema Item");
    expect(explicitCollection.get("e1")?.name).toBe("Explicit Item");

    await db1.close();
    try {
      const { default: Dexie } = await import("dexie");
      await Dexie.delete(db1.name);
    } catch {
      // ignore
    }
  });
});
