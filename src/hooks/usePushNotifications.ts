import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, requestFCMToken, listenForegroundMessages } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Requests FCM permission + token, saves it to users/{uid}.fcmToken,
 * and listens for foreground push messages.
 * Wire into AppRoutes (always mounted for logged-in users).
 */
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let unsubForeground: (() => void) | null = null;

    const init = async () => {
      const token = await requestFCMToken();
      if (token) {
        await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        console.log('[FCM] Token saved for user:', user.uid);
      }
      unsubForeground = await listenForegroundMessages();
    };

    init();
    return () => { unsubForeground?.(); };
  }, [user]);
}
