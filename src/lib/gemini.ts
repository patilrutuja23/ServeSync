// Backward-compatible rule-based score (used by SearchVolunteers, NGO dashboard)
export function getMatchingScore(volunteer: any, opportunity: any): { score: number; reason: string } {
  const volunteerSkills: string[] = (volunteer.skills || []).map((s: string) => s.toLowerCase());
  const requiredSkills: string[] = (opportunity.requiredSkills || []).map((s: string) => s.toLowerCase());

  if (!requiredSkills.length) return { score: 50, reason: 'No required skills specified.' };

  const matched = volunteerSkills.filter(s => requiredSkills.includes(s));
  const score = Math.round((matched.length / requiredSkills.length) * 100);

  const reason = matched.length
    ? `Matches ${matched.length} of ${requiredSkills.length} required skills: ${matched.join(', ')}.`
    : 'No direct skill overlap found.';

  return { score, reason };
}

// Re-export hybrid matching utilities
export { calculateRuleScore, getAIScore, calculateHybridScore, applyPersonalizationBoost, getRecommendations, matchOpportunities } from './matching';
export type { MatchResult } from './matching';
