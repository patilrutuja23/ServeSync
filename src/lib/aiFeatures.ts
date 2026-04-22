import { callGemini } from './geminiClient';

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
  return callGemini({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 120 } });
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
    const raw = await callGemini({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 80 } });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.status && parsed.reason) return parsed as TrustResult;
    }
  } catch (err) {
    console.error('[FakeNGO] Error:', err);
  }

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
  const score =
    Math.min(metrics.totalVolunteers / 2, 30) +
    Math.min(metrics.tasksCompleted * 2, 40) +
    Math.min(metrics.postsCreated / 2, 15) +
    Math.min(metrics.activeNGOs * 3, 15);
  return Math.round(Math.min(score, 100));
}
