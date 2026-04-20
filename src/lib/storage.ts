// Upload via Cloudinary — no Firebase Storage billing required.
// Firestore is still used for all metadata/data storage (unchanged).
// Callers use the same uploadFile() signature as before.

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

/**
 * Uploads a file to Cloudinary and returns the secure public URL.
 *
 * @param file       The File object to upload
 * @param _path      Ignored (was Firebase Storage path) — kept for API compatibility
 * @param onProgress Optional callback receiving 0 at start and 100 on finish
 */
export async function uploadFile(
  file: File,
  _path: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and ' +
      'VITE_CLOUDINARY_UPLOAD_PRESET to your .env.local file.'
    );
  }

  console.log('[Cloudinary] Uploading:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
  onProgress?.(0);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Cloudinary] Upload failed:', res.status, errText);
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const url: string = data.secure_url;

  if (!url) {
    throw new Error('Cloudinary returned no URL. Check your upload preset settings.');
  }

  console.log('[Cloudinary] Upload success:', url);
  onProgress?.(100);
  return url;
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
