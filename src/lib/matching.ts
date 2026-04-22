// ─── 0. Standalone location score (0–100) ───────────────────────────────────

/**
 * Returns a location compatibility score between 0 and 100.
 * 100 = exact match, 70 = same city, 80 = remote, 0 = mismatch
 */
export function getLocationScore(userLocation: string, oppLocation: string): number {
  const vLoc = (userLocation || '').toLowerCase().trim();
  const oLoc = (oppLocation || '').toLowerCase().trim();
  if (!vLoc || !oLoc) return 50; // neutral if either is missing
  if (vLoc === oLoc) return 100;
  if (vLoc.split(',')[0]?.trim() === oLoc.split(',')[0]?.trim()) return 70;
  if (oLoc.includes('remote') || vLoc.includes('remote')) return 80;
  return 0;
}

/**
 * Returns true if the volunteer and opportunity are in the same city.
 */
export function isSameCity(userLocation: string, oppLocation: string): boolean {
  const vLoc = (userLocation || '').toLowerCase().trim();
  const oLoc = (oppLocation || '').toLowerCase().trim();
  if (!vLoc || !oLoc) return false;
  return vLoc === oLoc ||
    vLoc.split(',')[0]?.trim() === oLoc.split(',')[0]?.trim() ||
    oLoc.includes('remote');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  opportunityId: string;
  ruleScore: number;    // 0–100
  aiScore: number;      // 0–100  (-1 = not computed / failed)
  locationScore: number; // 0–100
  hybridScore: number;  // 0–100
  finalScore: number;   // 0–100 after personalization boost
  breakdown: string;
}

// ─── 1. Rule-based score (0–100) ─────────────────────────────────────────────

export function calculateRuleScore(volunteer: any, opportunity: any): { score: number; breakdown: string } {
  let score = 0;
  const reasons: string[] = [];

  // Skills (60 pts)
  const vSkills: string[] = (volunteer.skills || []).map((s: string) => s.toLowerCase());
  const rSkills: string[] = (opportunity.requiredSkills || []).map((s: string) => s.toLowerCase());

  if (rSkills.length > 0) {
    const matched = vSkills.filter(s => rSkills.includes(s));
    const skillScore = Math.round((matched.length / rSkills.length) * 60);
    score += skillScore;
    if (matched.length > 0) {
      reasons.push(`Skills: ${matched.join(', ')} (${skillScore}/60)`);
    } else {
      reasons.push('Skills: no overlap (0/60)');
    }
  } else {
    score += 30; // neutral if no skills required
    reasons.push('Skills: none required (+30)');
  }

  // Location (25 pts)
  const vLoc = (volunteer.location || '').toLowerCase().trim();
  const oLoc = (opportunity.location || '').toLowerCase().trim();
  if (vLoc && oLoc) {
    if (vLoc === oLoc) {
      score += 25;
      reasons.push('Location: exact match (+25)');
    } else if (vLoc.split(',')[0]?.trim() === oLoc.split(',')[0]?.trim()) {
      score += 15;
      reasons.push('Location: same city (+15)');
    } else if (oLoc.includes('remote') || vLoc.includes('remote')) {
      score += 20;
      reasons.push('Location: remote (+20)');
    } else {
      reasons.push('Location: mismatch (+0)');
    }
  } else {
    score += 12; // neutral if missing
    reasons.push('Location: unknown (+12)');
  }

  // Availability (15 pts)
  const vAvail = (volunteer.availability || '').toLowerCase();
  const oDate = opportunity.dateTime ? new Date(opportunity.dateTime) : null;
  if (vAvail && oDate) {
    const day = oDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (vAvail.includes(day) || vAvail.includes('anytime') || vAvail.includes('flexible')) {
      score += 15;
      reasons.push(`Availability: matches ${day} (+15)`);
    } else if (vAvail.includes('weekend') && ['saturday', 'sunday'].includes(day)) {
      score += 15;
      reasons.push('Availability: weekend match (+15)');
    } else {
      reasons.push('Availability: no match (+0)');
    }
  } else {
    score += 7; // neutral
    reasons.push('Availability: unknown (+7)');
  }

  const clamped = Math.min(100, Math.max(0, score));
  console.log(`[RuleScore] ${opportunity.title}: ${clamped} — ${reasons.join(' | ')}`);
  return { score: clamped, breakdown: reasons.join(' | ') };
}

// ─── 2. AI score via Gemini (0–100) ──────────────────────────────────────────

export async function getAIScore(volunteer: any, opportunity: any): Promise<number> {
  const prompt = `
You are a volunteer-opportunity matching engine.
Rate the compatibility between this volunteer and opportunity on a scale of 0 to 100.
Return ONLY a single integer — no explanation, no text, just the number.

Volunteer:
- Skills: ${(volunteer.skills || []).join(', ') || 'none'}
- Location: ${volunteer.location || 'unknown'}
- Availability: ${volunteer.availability || 'unknown'}
- Bio: ${volunteer.bio || 'none'}

Opportunity:
- Title: ${opportunity.title}
- Required Skills: ${(opportunity.requiredSkills || []).join(', ') || 'none'}
- Location: ${opportunity.location || 'unknown'}
- Description: ${opportunity.description || 'none'}
`.trim();

  try {
    const { callGemini } = await import('./geminiClient');
    const raw = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8 },
    });
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      console.warn('[AIScore] Unexpected response:', raw);
      return -1;
    }
    console.log(`[AIScore] ${opportunity.title}: ${parsed}`);
    return parsed;
  } catch (err) {
    console.error('[AIScore] Failed:', err);
    return -1;
  }
}

// ─── 3. Hybrid score ──────────────────────────────────────────────────────────

/**
 * Weights: rule 50%, ai 30%, location 20%
 * If AI is unavailable, redistributes its weight to rule (70% rule, 30% location).
 */
export function calculateHybridScore(ruleScore: number, aiScore: number, locationScore: number): number {
  if (aiScore === -1) {
    const hybrid = Math.round(ruleScore * 0.7 + locationScore * 0.3);
    console.log(`[HybridScore] AI unavailable — rule=${ruleScore} loc=${locationScore} hybrid=${hybrid}`);
    return hybrid;
  }
  const hybrid = Math.round(ruleScore * 0.5 + aiScore * 0.3 + locationScore * 0.2);
  console.log(`[HybridScore] rule=${ruleScore} ai=${aiScore} loc=${locationScore} hybrid=${hybrid}`);
  return hybrid;
}

// ─── 4. Batch matching (main entry point) ────────────────────────────────────

/**
 * Score all opportunities for a volunteer.
 * - Rule-scores everything
 * - AI-scores only the top `aiLimit` by rule score (default 10)
 * - Returns results sorted by hybridScore descending
 */
export async function matchOpportunities(
  volunteer: any,
  opportunities: any[],
  aiLimit = 10
): Promise<MatchResult[]> {
  if (!volunteer || opportunities.length === 0) return [];

  console.log(`[Matching] Scoring ${opportunities.length} opportunities for ${volunteer.displayName}`);

  // Step 1: rule-score all
  const withRuleScores = opportunities.map(opp => {
    const { score, breakdown } = calculateRuleScore(volunteer, opp);
    return { opp, ruleScore: score, breakdown };
  });

  // Step 2: sort by rule score, take top N for AI
  const sorted = [...withRuleScores].sort((a, b) => b.ruleScore - a.ruleScore);
  const topN = sorted.slice(0, aiLimit);
  const rest = sorted.slice(aiLimit);

  // Step 3: AI-score top N in parallel
  const aiScores = await Promise.all(
    topN.map(({ opp }) => getAIScore(volunteer, opp))
  );

  // Step 4: combine
  const topResults: MatchResult[] = topN.map(({ opp, ruleScore, breakdown }, i) => {
    const aiScore = aiScores[i];
    const locationScore = getLocationScore(volunteer.location || '', opp.location || '');
    const hybridScore = calculateHybridScore(ruleScore, aiScore, locationScore);
    return { opportunityId: opp.id, ruleScore, aiScore, locationScore, hybridScore, finalScore: hybridScore, breakdown };
  });

  const restResults: MatchResult[] = rest.map(({ opp, ruleScore, breakdown }) => {
    const locationScore = getLocationScore(volunteer.location || '', opp.location || '');
    const hybridScore = calculateHybridScore(ruleScore, -1, locationScore);
    return { opportunityId: opp.id, ruleScore, aiScore: -1, locationScore, hybridScore, finalScore: hybridScore, breakdown };
  });

  const all = [...topResults, ...restResults].sort((a, b) => b.hybridScore - a.hybridScore);
  console.log('[Matching] Final scores:', all.map(r => `${r.opportunityId}: ${r.hybridScore}`));
  return all;
}

// ─── 5. Personalization boost ────────────────────────────────────────────────

/**
 * Applies small boosts on top of hybridScore based on:
 * - Location match: +5
 * - Interests/bio keyword overlap with opportunity description: up to +5
 * Result is capped at 100.
 */
export function applyPersonalizationBoost(volunteer: any, opportunity: any, hybridScore: number): number {
  let boost = 0;
  const reasons: string[] = [];

  // Location boost
  const vLoc = (volunteer.location || '').toLowerCase().trim();
  const oLoc = (opportunity.location || '').toLowerCase().trim();
  if (vLoc && oLoc && (vLoc === oLoc || vLoc.split(',')[0]?.trim() === oLoc.split(',')[0]?.trim())) {
    boost += 5;
    reasons.push('location boost +5');
  }

  // Interests/bio keyword overlap boost
  const bio = (volunteer.bio || '').toLowerCase();
  const desc = (opportunity.description || '').toLowerCase();
  const title = (opportunity.title || '').toLowerCase();
  if (bio && (desc || title)) {
    const bioWords = bio.split(/\W+/).filter((w: string) => w.length > 4);
    const oppText = `${desc} ${title}`;
    const matched = bioWords.filter((w: string) => oppText.includes(w));
    if (matched.length >= 3) {
      boost += 5;
      reasons.push(`interests boost +5 (${matched.slice(0, 3).join(', ')})`);
    } else if (matched.length >= 1) {
      boost += 2;
      reasons.push(`interests boost +2 (${matched[0]})`);
    }
  }

  const final = Math.min(100, hybridScore + boost);
  if (boost > 0) console.log(`[Personalization] ${opportunity.title}: +${boost} → ${final}`);
  return final;
}

// ─── 6. Recommendations entry point ──────────────────────────────────────────

/**
 * Full recommendation pipeline for the volunteer dashboard.
 * - Fetches profile from Firestore (already passed in)
 * - Rule-scores all, AI-scores top aiLimit, applies personalization boost
 * - Returns top `limit` results sorted by finalScore descending
 */
export async function getRecommendations(
  volunteer: any,
  opportunities: any[],
  { aiLimit = 10, limit: topLimit = 5 } = {}
): Promise<(MatchResult & { opportunity: any })[]> {
  if (!volunteer || opportunities.length === 0) return [];

  console.log(`[Recommendations] Building recommendations for ${volunteer.displayName || volunteer.uid}`);

  const matchResults = await matchOpportunities(volunteer, opportunities, aiLimit);

  // Build a lookup map for opportunity objects
  const oppMap: Record<string, any> = {};
  opportunities.forEach(o => { oppMap[o.id] = o; });

  // Apply personalization boost and attach opportunity object
  const enriched = matchResults
    .map(result => {
      const opp = oppMap[result.opportunityId];
      if (!opp) return null;
      const finalScore = applyPersonalizationBoost(volunteer, opp, result.hybridScore);
      return { ...result, finalScore, opportunity: opp };
    })
    .filter(Boolean) as (MatchResult & { opportunity: any })[];

  // Sort by finalScore, return top N
  const top = enriched
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topLimit);

  console.log('[Recommendations] Top results:', top.map(r => `${r.opportunity.title}: ${r.finalScore}%`));
  return top;
}
