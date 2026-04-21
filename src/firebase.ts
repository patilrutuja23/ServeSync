import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

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

// Standard Firestore — works on all platforms including mobile browsers.
// experimentalForceLongPolling ensures WebSocket fallback on restrictive networks.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// ─── FCM Push Notifications ───────────────────────────────────────────────────

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

/**
 * Requests notification permission and returns the FCM token.
 * Returns null if permission denied or FCM not supported.
 */
export async function requestFCMToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FCM] Not supported in this browser.');
      return null;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permission denied.');
      return null;
    }
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('[FCM] Token:', token);
    return token;
  } catch (err) {
    console.error('[FCM] requestFCMToken error:', err);
    return null;
  }
}

/**
 * Listens for foreground FCM messages and shows a browser Notification.
 * Call once on app mount for logged-in users.
 */
export async function listenForegroundMessages(): Promise<() => void> {
  try {
    const supported = await isSupported();
    if (!supported) return () => {};
    const messaging = getMessaging(app);
    const unsub = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
      const title = payload.notification?.title ?? 'ServeSync';
      const body  = payload.notification?.body  ?? '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/manifest.json' });
      }
    });
    return unsub;
  } catch (err) {
    console.error('[FCM] listenForegroundMessages error:', err);
    return () => {};
  }
}

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
