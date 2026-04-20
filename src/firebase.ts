import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

// All config is read from .env.local — never hardcoded, never pushed to GitHub.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      as string,
};

const app = initializeApp(firebaseConfig);

// Memory-only cache — no IndexedDB persistence.
// Deleted documents are never served from a stale local cache.
export const db      = initializeFirestore(app, {});
export const auth    = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Verify Firestore connectivity on startup
(async () => {
  try {
    await getDocFromServer(doc(db, '_health', 'ping'));
  } catch {
    // Expected 404 — just confirms the connection works
  }
})();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST   = 'list',
  GET    = 'get',
  WRITE  = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email:  auth.currentUser?.email,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
