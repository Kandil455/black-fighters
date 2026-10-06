const DB_NAME = "iiiak-offline";
const DB_VERSION = 1;
const SNAPSHOTS = "snapshots";
const QUEUE = "syncQueue";
const memorySnapshots = new Map();
const memoryQueue = new Map();
let memoryQueueId = 0;

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openOfflineDb() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("indexeddb_unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "key" });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setOfflineSnapshot(key, value) {
  if (!hasIndexedDb()) {
    memorySnapshots.set(key, { value, updatedAt: Date.now() });
    return value;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(SNAPSHOTS, "readwrite");
  tx.objectStore(SNAPSHOTS).put({ key, value, updatedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getOfflineSnapshot(key) {
  if (!hasIndexedDb()) return memorySnapshots.get(key)?.value ?? null;
  const db = await openOfflineDb();
  try {
    const row = await requestResult(db.transaction(SNAPSHOTS).objectStore(SNAPSHOTS).get(key));
    return row?.value ?? null;
  } finally {
    db.close();
  }
}

export async function deleteOfflineSnapshot(key) {
  if (!hasIndexedDb()) {
    memorySnapshots.delete(key);
    return;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(SNAPSHOTS, "readwrite");
  tx.objectStore(SNAPSHOTS).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function queueOfflineAction(action) {
  if (!hasIndexedDb()) {
    memoryQueueId += 1;
    memoryQueue.set(memoryQueueId, { ...action, id: memoryQueueId, queuedAt: Date.now() });
    return memoryQueueId;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(QUEUE, "readwrite");
  tx.objectStore(QUEUE).add({ ...action, queuedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function flushOfflineActions(handler) {
  if (!hasIndexedDb()) {
    let synced = 0;
    for (const [id, row] of memoryQueue) {
      try {
        await handler(row);
        memoryQueue.delete(id);
        synced += 1;
      } catch {
        break;
      }
    }
    return synced;
  }
  const db = await openOfflineDb();
  const rows = await requestResult(db.transaction(QUEUE).objectStore(QUEUE).getAll());
  db.close();
  let synced = 0;
  for (const row of rows) {
    try {
      await handler(row);
      const writeDb = await openOfflineDb();
      const tx = writeDb.transaction(QUEUE, "readwrite");
      tx.objectStore(QUEUE).delete(row.id);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      writeDb.close();
      synced++;
    } catch {
      break;
    }
  }
  return synced;
}
