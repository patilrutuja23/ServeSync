// All AI features use the existing VITE_GEMINI_API_KEY — no backend needed.

async function gemini(prompt: string, maxTokens = 120): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!apiKey) throw new Error('No VITE_GEMINI_API_KEY');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

// ─── 1. Match Explanation ─────────────────────────────────────────────────────

export async function explainMatch(
  volunteer: { displayName: string; skills: string[]; location: string; availability: string },
  opportunity: { title: string; requiredSkills: string[]; location: string; description: string }
): Promise<string> {
  const prompt = `You are a volunteer matching assistant.
In exactly 2 short sentences, explain why this volunteer is a good match for this opportunity.
Be specific, mention skills or location. No bullet points.

Volunteer: ${volunteer.displayName}
Skills: ${(volunteer.skills || []).join(', ') || 'none'}
Location: ${volunteer.location || 'unknown'}
Availability: ${volunteer.availability || 'unknown'}

Opportunity: ${opportunity.title}
Required Skills: ${(opportunity.requiredSkills || []).join(', ') || 'none'}
Location: ${opportunity.location || 'unknown'}
Description: ${opportunity.description || 'none'}`;

  console.log('[MatchExplain] Generating for:', volunteer.displayName, '→', opportunity.title);
  return gemini(prompt, 100);
}

// ─── 2. Fake NGO Detection ────────────────────────────────────────────────────

export interface TrustResult {
  status: 'trusted' | 'suspicious' | 'unverified';
  reason: string;
}

export async function detectFakeNGO(ngo: {
  displayName: string;
  bio: string;
  location: string;
  isVerified: boolean;
  opportunityCount: number;
  postCount: number;
}): Promise<TrustResult> {
  // Fast rule-based pre-check — no API call needed for obvious cases
  const flags: string[] = [];
  if (!ngo.bio || ngo.bio.trim().length < 20) flags.push('missing or very short description');
  if (!ngo.location) flags.push('no location set');
  if (ngo.opportunityCount === 0) flags.push('no opportunities posted');
  if (ngo.postCount === 0) flags.push('no community posts');

  if (!ngo.isVerified && flags.length >= 3) {
    return { status: 'suspicious', reason: `Profile incomplete: ${flags.join(', ')}.` };
  }
  if (ngo.isVerified) {
    return { status: 'trusted', reason: 'This NGO has been verified by the ServeSync team.' };
  }

  // Use AI for borderline cases
  const prompt = `You are a trust analyst for a volunteer platform.
Analyze this NGO profile and respond with ONLY a JSON object — no markdown, no extra text.
Format: {"status":"trusted"|"suspicious"|"unverified","reason":"one sentence"}

NGO Name: ${ngo.displayName}
Description: ${ngo.bio || 'none'}
Location: ${ngo.location || 'none'}
Verified: ${ngo.isVerified}
Opportunities posted: ${ngo.opportunityCount}
Community posts: ${ngo.postCount}
Flags: ${flags.join(', ') || 'none'}`;

  try {
    const raw = await gemini(prompt, 80);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.status && parsed.reason) return parsed as TrustResult;
    }
  } catch (err) {
    console.error('[FakeNGO] Parse error:', err);
  }

  // Fallback
  return flags.length > 0
    ? { status: 'unverified', reason: `Profile has ${flags.length} incomplete field(s).` }
    : { status: 'trusted', reason: 'Profile appears complete and legitimate.' };
}

// ─── 3. Impact Score ──────────────────────────────────────────────────────────

export function calculateImpactScore(metrics: {
  totalVolunteers: number;
  tasksCompleted: number;
  postsCreated: number;
  activeNGOs: number;
}): number {
  // Weighted formula — capped at 100
  const score =
    Math.min(metrics.totalVolunteers / 2, 30) +   // up to 30 pts
    Math.min(metrics.tasksCompleted * 2, 40) +     // up to 40 pts
    Math.min(metrics.postsCreated / 2, 15) +       // up to 15 pts
    Math.min(metrics.activeNGOs * 3, 15);          // up to 15 pts
  return Math.round(Math.min(score, 100));
}
