/**
 * imageExtractorDb.js
 * Persistent client-side IndexedDB library for saving and loading
 * image extraction sessions, quizzes, and history.
 */

const DB_NAME = "bf-image-library";
const DB_VERSION = 1;
const STORE_SESSIONS = "sessions";
const STORE_HISTORY = "history";

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error("IndexedDB is not supported"));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const histStore = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        histStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Save an entire extraction session with its images and quizzes
 */
export async function saveExtractionSession(session) {
  if (!hasIndexedDb()) return session;
  const db = await openDb();

  // Strip non-serializable blob objects or store lightweight dataURLs
  const serializableImages = (session.images || []).map((img) => ({
    id: img.id,
    sourceFileName: img.sourceFileName,
    sourceType: img.sourceType,
    pageOrSlideNumber: img.pageOrSlideNumber,
    thumbnailDataUrl: img.thumbnailDataUrl,
    contextText: img.contextText,
    width: img.width,
    height: img.height,
    aiClassification: img.aiClassification,
    status: img.status,
    quiz: img.quiz || null,
    createdAt: img.createdAt || new Date().toISOString(),
  }));

  const sessionRecord = {
    id: session.id || `session_${Date.now()}`,
    fileName: session.fileName || "ملف مستخرج",
    sourceType: session.sourceType || "pdf",
    images: serializableImages,
    totalImages: serializableImages.length,
    quizzesCount: serializableImages.filter((img) => img.quiz && img.quiz.length > 0).length,
    createdAt: session.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const historyRecord = {
    id: sessionRecord.id,
    fileName: sessionRecord.fileName,
    sourceType: sessionRecord.sourceType,
    totalImages: sessionRecord.totalImages,
    quizzesCount: sessionRecord.quizzesCount,
    createdAt: sessionRecord.createdAt,
  };

  const tx = db.transaction([STORE_SESSIONS, STORE_HISTORY], "readwrite");
  tx.objectStore(STORE_SESSIONS).put(sessionRecord);
  tx.objectStore(STORE_HISTORY).put(historyRecord);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve(sessionRecord);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Retrieve a saved session by ID
 */
export async function getExtractionSession(id) {
  if (!hasIndexedDb()) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const req = tx.objectStore(STORE_SESSIONS).get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/**
 * List all saved sessions from history log
 */
export async function listExtractionHistory() {
  if (!hasIndexedDb()) return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readonly");
    const req = tx.objectStore(STORE_HISTORY).getAll();
    req.onsuccess = () => {
      db.close();
      const rows = req.result || [];
      rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(rows);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export const getExtractionHistory = listExtractionHistory;

/**
 * Delete a session from database
 */
export async function deleteExtractionSession(id) {
  if (!hasIndexedDb()) return;
  const db = await openDb();
  const tx = db.transaction([STORE_SESSIONS, STORE_HISTORY], "readwrite");
  tx.objectStore(STORE_SESSIONS).delete(id);
  tx.objectStore(STORE_HISTORY).delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
