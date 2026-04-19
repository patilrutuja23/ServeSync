import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, addDoc, onSnapshot, getDocs, getDocsFromServer } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Search, MapPin, Send, Filter, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateRuleScore, getAIScore, calculateHybridScore } from '../../lib/matching';
import { explainMatch } from '../../lib/aiFeatures';
import { RatingDisplay, CompletedTasksBadge } from '../../lib/trust.tsx';
import UserAvatar from '../../components/UserAvatar';

interface VolunteerWithScore {
  volunteer: any;
  score: number;
  breakdown: string;
  aiScored: boolean;
  explanation?: string;
}

export default function NGOSearchVolunteers() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [ranked, setRanked] = useState<VolunteerWithScore[]>([]);

  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Invite modal state
  const [inviteTarget, setInviteTarget] = useState<any | null>(null);
  const [selectedOppId, setSelectedOppId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState<{ volunteerId: string; opportunityId: string }[]>([]);

  // Real-time volunteers — initial fetch is forced from server to bypass
  // any in-memory cache, then onSnapshot keeps it live.
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'volunteer')
    );

    // Force first read from server so deleted users never appear on mount
    getDocsFromServer(q)
      .then(snap => {
        const fresh = snap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter(v => v.uid && v.displayName); // drop incomplete/ghost docs
        console.log('[SearchVolunteers] Server fetch:', fresh.length, 'volunteers');
        setVolunteers(fresh);
        setLoading(false);
      })
      .catch(err => {
        console.error('[SearchVolunteers] Server fetch error:', err);
        setLoading(false);
      });

    // Then keep listening for real-time changes (new signups, profile edits, deletions)
    const unsub = onSnapshot(q, (snap) => {
      const live = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter(v => v.uid && v.displayName); // drop incomplete/ghost docs
      console.log('[SearchVolunteers] Live snapshot:', live.length, 'volunteers');
      setVolunteers(live);
      setLoading(false);
    }, (err) => {
      console.error('[SearchVolunteers] volunteers error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Real-time NGO opportunities
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'opportunities'), where('ngoId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setOpportunities(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    });
    return unsub;
  }, [user]);

  // Real-time sent invites
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'invites'), where('ngoId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSentInvites(snap.docs.map(d => ({
        volunteerId: (d.data() as any).volunteerId,
        opportunityId: (d.data() as any).opportunityId,
      })));
    });
    return unsub;
  }, [user]);

  // Run hybrid matching whenever volunteers or opportunities change
  const runMatching = useCallback(async (vols: any[], opps: any[]) => {
    if (vols.length === 0 || opps.length === 0) {
      // No opportunities yet — fall back to rule-only scoring against empty opp
      const fallback: VolunteerWithScore[] = vols.map(v => {
        const { score, breakdown } = calculateRuleScore(v, { requiredSkills: [], location: '', dateTime: '' });
        return { volunteer: v, score, breakdown, aiScored: false };
      }).sort((a, b) => b.score - a.score);
      setRanked(fallback);
      return;
    }

    setMatching(true);
    console.log(`[SearchVolunteers] Running hybrid matching: ${vols.length} volunteers × ${opps.length} opportunities`);

    try {
      // Score each volunteer against the best-matching opportunity
      const results: VolunteerWithScore[] = await Promise.all(
        vols.map(async (v) => {
          // Rule-score against all opportunities, pick the best
          const ruleScores = opps.map(opp => calculateRuleScore(v, opp));
          const bestRule = ruleScores.reduce((best, cur) => cur.score > best.score ? cur : best);
          const bestOpp = opps[ruleScores.indexOf(bestRule)];

          // AI-score against the best opportunity only (limit API calls)
          const aiScore = await getAIScore(v, bestOpp);
          const hybridScore = calculateHybridScore(bestRule.score, aiScore, 50);

          console.log(`[SearchVolunteers] ${v.displayName}: rule=${bestRule.score} ai=${aiScore} hybrid=${hybridScore}`);
          return {
            volunteer: v,
            score: hybridScore,
            breakdown: bestRule.breakdown,
            aiScored: aiScore !== -1,
          };
        })
      );

      results.sort((a, b) => b.score - a.score);
      setRanked(results);
      console.log('[SearchVolunteers] Matching complete. Top:', results[0]?.volunteer?.displayName, results[0]?.score);
    } catch (err) {
      console.error('[SearchVolunteers] Matching error:', err);
    } finally {
      setMatching(false);
    }
  }, []);

  // Auto-run matching when data is ready; reset ranked first to avoid stale cards
  useEffect(() => {
    if (loading) return;
    if (volunteers.length === 0) {
      setRanked([]);
      return;
    }
    setRanked([]);
    runMatching(volunteers, opportunities);
  }, [volunteers, opportunities, loading, runMatching]);

  const handleExplainMatch = async (v: any) => {
    if (explanations[v.id] || loadingExplanation === v.id) return;
    const bestOpp = opportunities[0];
    if (!bestOpp) return;
    setLoadingExplanation(v.id);
    try {
      const text = await explainMatch(v, bestOpp);
      setExplanations(prev => ({ ...prev, [v.id]: text }));
      console.log('[MatchExplain]', v.displayName, ':', text);
    } catch (err) {
      console.error('[MatchExplain] Error:', err);
    } finally {
      setLoadingExplanation(null);
    }
  };

  const isAlreadyInvited = (volunteerId: string, opportunityId: string) =>
    sentInvites.some(i => i.volunteerId === volunteerId && i.opportunityId === opportunityId);

  const openInviteModal = (volunteer: any) => {
    setInviteTarget(volunteer);
    setSelectedOppId(opportunities[0]?.id || '');
    setInviteMessage('');
  };

  const handleSendInvite = async () => {
    if (!user || !profile || !inviteTarget || !selectedOppId) {
      toast.error('Please select an opportunity.');
      return;
    }
    if (isAlreadyInvited(inviteTarget.id, selectedOppId)) {
      toast.info('You already invited this volunteer for that opportunity.');
      return;
    }
    setSending(true);
    try {
      const opp = opportunities.find(o => o.id === selectedOppId);
      await addDoc(collection(db, 'invites'), {
        ngoId: user.uid,
        ngoName: profile.displayName || profile.organizationName || 'NGO',
        volunteerId: inviteTarget.id,
        volunteerName: inviteTarget.displayName || '',
        volunteerPhoto: inviteTarget.photoURL || '',
        opportunityId: selectedOppId,
        opportunityTitle: opp?.title || '',
        message: inviteMessage.trim() || `${profile.displayName || 'An NGO'} would like to invite you to collaborate!`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      console.log('[SearchVolunteers] Invite sent to', inviteTarget.displayName);
      toast.success(`Invite sent to ${inviteTarget.displayName}! ✅`);
      setInviteTarget(null);
    } catch (error) {
      console.error('[SearchVolunteers] Failed to send invite:', error);
      toast.error('Failed to send invite.');
    } finally {
      setSending(false);
    }
  };

  const filteredRanked = ranked.filter(({ volunteer: v }) => {
    const matchesSearch = v.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.skills?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !locationFilter || v.location?.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const getScoreColor = (score: number) =>
    score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Find Volunteers</h1>
        <p className="text-slate-500">
          Search for passionate individuals to join your cause.
          {matching && <span className="ml-2 text-primary text-[12px] font-semibold animate-pulse">Calculating match scores...</span>}
        </p>
      </header>

      {/* Search & Filters */}
      <Card className="sleek-card p-2">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <Input
              placeholder="Search by name or skills..."
              className="pl-12 h-12 rounded-xl border-slate-100 focus:ring-primary bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <Input
              placeholder="Filter by location..."
              className="pl-12 h-12 rounded-xl border-slate-100 focus:ring-primary bg-slate-50/50"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            onClick={() => runMatching(volunteers, opportunities)}
            disabled={matching}
          >
            <Filter className="mr-2" size={18} /> {matching ? 'Matching...' : 'Re-Match'}
          </Button>
        </div>
      </Card>

      {/* Volunteers Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-80 bg-slate-50 animate-pulse rounded-[16px]" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRanked.length > 0 ? filteredRanked.map(({ volunteer: v, score, breakdown, aiScored }) => (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={v.id}>
              <Card className="sleek-card h-full flex flex-col group">
                <div className="flex items-center gap-4 mb-4">
                  {/* Clickable avatar → public profile */}
                  <button
                    onClick={() => { console.log('[SearchVolunteers] Navigate to profile:', v.id); navigate(`/volunteer/${v.id}`); }}
                    className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden shrink-0 hover:ring-2 hover:ring-primary/30 transition-all"
                  >
                    <UserAvatar src={v.photoURL} alt={v.displayName} className="w-full h-full rounded-none object-cover" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {/* Clickable name → public profile */}
                    <button
                      onClick={() => { console.log('[SearchVolunteers] Navigate to profile:', v.id); navigate(`/volunteer/${v.id}`); }}
                      className="text-lg font-bold text-slate-900 truncate group-hover:text-primary transition-colors text-left w-full hover:underline"
                    >
                      {v.displayName}
                    </button>
                    <div className="text-[12px] text-slate-400 flex items-center gap-1">
                      <MapPin size={12} /> {v.location || 'Remote'}
                    </div>
                    {v.availability && (
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{v.availability}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {v.rating > 0 && <RatingDisplay rating={v.rating} count={v.ratingCount} size={12} />}
                      {v.completedTasks > 0 && <CompletedTasksBadge count={v.completedTasks} />}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* Match score + explanation */}
                  <div>
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${getScoreColor(score)} border`}>
                      <span className="text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                        <Zap size={11} /> {aiScored ? 'AI Match' : 'Match'}
                      </span>
                      <span className="text-sm font-extrabold">{score}%</span>
                    </div>
                    {/* Explanation — loads on hover/click */}
                    {explanations[v.id] ? (
                      <p className="mt-2 text-[12px] text-slate-600 italic leading-relaxed">{explanations[v.id]}</p>
                    ) : (
                      <button
                        onClick={() => handleExplainMatch(v)}
                        disabled={loadingExplanation === v.id}
                        className="mt-1.5 text-[11px] text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        {loadingExplanation === v.id ? '✨ Explaining...' : '✨ Why this match?'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v.skills?.length > 0
                        ? v.skills.map((skill: string) => (
                          <span key={skill} className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-100">
                            {skill}
                          </span>
                        ))
                        : <span className="text-[11px] text-slate-300 italic">No skills listed</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50">
                  <Button
                    className="w-full h-11 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl shadow-lg shadow-secondary/10 transition-all active:scale-95"
                    onClick={() => openInviteModal(v)}
                  >
                    <Send className="mr-2" size={16} /> Invite Volunteer
                  </Button>
                </div>
              </Card>
            </motion.div>
          )) : (
            <div className="col-span-full py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">No volunteers found matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={!!inviteTarget} onOpenChange={(open) => { if (!open) setInviteTarget(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl border border-slate-300 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Invite {inviteTarget?.displayName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Volunteer summary */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                <UserAvatar src={inviteTarget?.photoURL} alt={inviteTarget?.displayName} className="w-full h-full rounded-none object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{inviteTarget?.displayName}</p>
                <p className="text-[11px] text-slate-400">{inviteTarget?.location || 'Remote'}</p>
              </div>
            </div>

            {/* Opportunity selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Select Opportunity *</Label>
              {opportunities.length === 0 ? (
                <p className="text-[13px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  You have no posted opportunities. Post one first from the Dashboard.
                </p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {opportunities.map(opp => {
                    const alreadySent = isAlreadyInvited(inviteTarget?.id, opp.id);
                    return (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => !alreadySent && setSelectedOppId(opp.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          alreadySent
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                            : selectedOppId === opp.id
                            ? 'border-secondary bg-secondary/5 text-secondary'
                            : 'border-slate-200 hover:border-secondary/40 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-[13px] font-bold">{opp.title}</p>
                        <p className="text-[11px] text-slate-400">{opp.location} · {new Date(opp.dateTime).toLocaleDateString()}</p>
                        {alreadySent && (
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Already invited
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Message (optional)</Label>
              <textarea
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                placeholder={`Hi ${inviteTarget?.displayName}, we'd love to have you join us!`}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[13px] text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-slate-200" onClick={() => setInviteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl"
                onClick={handleSendInvite}
                disabled={sending || !selectedOppId || opportunities.length === 0}
              >
                {sending ? 'Sending...' : <><Send size={15} className="mr-2" /> Send Invite</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
