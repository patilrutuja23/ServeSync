import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 * @param file       The File object to upload
 * @param path       Storage path, e.g. "workProofs/uid/filename.jpg"
 * @param onProgress Optional callback receiving 0–100 progress
 */
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/** Validates that a file is an image and under maxMB (default 5 MB) */
export function validateImage(file: File, maxMB = 5): string | null {
  if (!file.type.startsWith('image/')) return 'Only image files are allowed.';
  if (file.size > maxMB * 1024 * 1024) return `Image must be under ${maxMB} MB.`;
  return null;
}

/** Validates that a file is a PDF or image and under maxMB (default 10 MB) */
export function validateDocument(file: File, maxMB = 10): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) return 'Only PDF or image files are allowed.';
  if (file.size > maxMB * 1024 * 1024) return `File must be under ${maxMB} MB.`;
  return null;
}
