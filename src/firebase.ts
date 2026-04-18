import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// 🔥 Paste YOUR Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyA2cVTbOyJI4vctAfTHG-GhwMbtH6lkBio",
  authDomain: "servesync-e7dba.firebaseapp.com",
  projectId: "servesync-e7dba",
  storageBucket: "servesync-e7dba.firebasestorage.app",
  messagingSenderId: "859447385405",
  appId: "1:859447385405:web:2f6607fa12481869e5f954",
  measurementId: "G-4ZQLDNF06J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ─── Purge stale Firestore IndexedDB cache (one-time cleanup) ────────────────
// The old getFirestore() setup wrote data to IndexedDB. Even though we now use
// memory-only cache, that old IndexedDB data persists in the browser and can
// cause deleted documents to reappear. This wipes it on every app start.
// It is safe to run repeatedly — it only deletes Firestore-related databases.
function purgeFirestoreIndexedDB() {
  if (typeof indexedDB === 'undefined') return;
  indexedDB.databases?.().then(databases => {
    databases.forEach(({ name }) => {
      if (name && (name.includes('firestore') || name.includes('firebase'))) {
        indexedDB.deleteDatabase(name);
        console.log('[Firebase] Purged stale IndexedDB cache:', name);
      }
    });
  }).catch(() => {
    // indexedDB.databases() not supported in all browsers — fall back to
    // deleting the known Firestore database name directly.
    const knownDBs = [
      `firestore/[DEFAULT]/${firebaseConfig.projectId}/main`,
      `firestore/[DEFAULT]/${firebaseConfig.projectId}/metadata`,
      'firebaseLocalStorageDb',
    ];
    knownDBs.forEach(name => indexedDB.deleteDatabase(name));
  });
}
purgeFirestoreIndexedDB();

// Use memory-only cache (no IndexedDB persistence).
// This ensures deleted Firestore documents are NEVER served from a local
// cache — the UI always reflects the real server state immediately.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: false,
  // No localCache config = memory-only (session cache only, cleared on reload)
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. The client is offline.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}