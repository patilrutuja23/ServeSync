import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type NotificationType = 'match' | 'message' | 'post' | 'invite' | 'verification' | 'general';

export async function sendNotification(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      message,
      read: false,
      link: link ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[sendNotification] Error:', err);
  }
}
