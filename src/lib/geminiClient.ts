/**
 * Gemini API client.
 *
 * The API key is read from VITE_GEMINI_API_KEY at BUILD TIME by Vite.
 * It is baked into the production bundle when you run `npm run build`.
 *
 * Security model:
 * - .env.local is git-ignored → key never enters your git repo
 * - You run `npm run build` locally (or in CI with the secret injected)
 *   before `firebase deploy` → key is in the compiled bundle
 * - The key is visible in the browser bundle (this is unavoidable on
 *   the Spark/free Firebase plan which has no Cloud Functions support).
 *   Mitigate by restricting the key in Google AI Studio to your domain:
 *   https://aistudio.google.com → API Keys → Add HTTP referrer restriction
 *   → add: servesync-e7dba.web.app/*
 *
 * To upgrade to a fully private backend proxy, upgrade to Firebase Blaze
 * plan and re-enable the functions/ directory.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface GeminiRequest {
  contents: { role?: string; parts: { text: string }[] }[];
  generationConfig?: { temperature?: number; maxOutputTokens?: number };
}

export async function callGemini(payload: GeminiRequest): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      'VITE_GEMINI_API_KEY is not set. Add it to .env.local and rebuild.'
    );
  }

  const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}
