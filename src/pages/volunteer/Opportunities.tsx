import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, addDoc, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';
import { MapPin, Calendar, Search, Building2, Send, Filter, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { matchOpportunities, MatchResult, isSameCity } from '../../lib/matching';

export default function VolunteerOpportunities() {
  const { user, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, MatchResult>>({});
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const userCity = (profile?.location || '').toLowerCase().trim();

  useEffect(() => {
    // Filter out test/orphan docs that have no ngoId or title
    const q = query(
      collection(db, 'opportunities'),
      where('ngoId', '!=', '')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const opps = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter(o => o.ngoId && o.title); // drop malformed docs
      console.log('[Opportunities] snapshot received:', opps.length, 'valid docs');
      setOpportunities(opps);
      setLoading(false);

      // Re-run hybrid matching whenever the list changes
      if (profile && opps.length > 0) {
        setScoring(true);
        try {
          const results = await matchOpportunities(profile, opps, 10);
          const scoreMap: Record<string, MatchResult> = {};
          results.forEach(r => { scoreMap[r.opportunityId] = r; });
          setScores(scoreMap);
          console.log('[Opportunities] matching complete:', Object.keys(scoreMap).length, 'scored');
        } catch (err) {
          console.error('[Opportunities] matching error:', err);
        } finally {
          setScoring(false);
        }
      }
    }, (error) => {
      console.error('[Opportunities] snapshot error:', error);
      setLoading(false);
    });

    return unsub;
  }, [profile]);

  const handleConnect = async (opp: any) => {
    if (!user) return;
    setConnecting(opp.id);
    try {
      const snap = await getDocs(query(
        collection(db, 'connections'),
        where('volunteerId', '==', user.uid),
        where('opportunityId', '==', opp.id)
      ));
      if (!snap.empty) {
        toast.info('You have already sent a request for this opportunity.');
        return;
      }
      await addDoc(collection(db, 'connections'), {
        volunteerId: user.uid,
        ngoId: opp.ngoId,
        opportunityId: opp.id,
        status: 'pending',
        type: 'request',
        createdAt: new Date().toISOString(),
        message: `Volunteer ${profile?.displayName} is interested in your opportunity: ${opp.title}`,
      });
      toast.success('Connection request sent!');
    } catch (error) {
      console.error('[Opportunities] Failed to send connection request:', error);
      toast.error('Failed to send request.');
    } finally {
      setConnecting(null);
    }
  };


  const filteredOpportunities = opportunities
    .filter(opp => {
      const matchesSearch =
        opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.ngoName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = opp.location?.toLowerCase().includes(locationFilter.toLowerCase());
      const matchesNearby = !nearbyOnly || isSameCity(profile?.location || '', opp.location || '');
      return matchesSearch && matchesLocation && matchesNearby;
    })
    .sort((a, b) => (scores[b.id]?.hybridScore ?? -1) - (scores[a.id]?.hybridScore ?? -1));

  const getScoreBadge = (oppId: string) => {
    const result = scores[oppId];
    if (!result) return null;
    const s = result.hybridScore;
    const color = s >= 70 ? 'bg-emerald-100 text-emerald-700' : s >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';
    const label = result.aiScore !== -1 ? 'AI Match' : 'Match';
    const locLabel = result.locationScore === 100 ? ' · 📍' : result.locationScore >= 70 ? ' · 🏙️' : '';
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>
        <Zap size={10} /> {s}% {label}{locLabel}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Explore Opportunities</h1>
        <p className="text-slate-500">
          Find the perfect NGO to support with your skills.
          {scoring && <span className="ml-2 text-primary text-[12px] font-semibold animate-pulse">Calculating match scores...</span>}
        </p>
      </header>

      {/* Filters */}
      <Card className="sleek-card p-2">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <Input
              placeholder="Search by title or NGO..."
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
          <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
            <Filter className="mr-2" size={18} /> More Filters
          </Button>
          {userCity && (
            <button
              onClick={() => setNearbyOnly(n => !n)}
              className={`h-12 px-5 rounded-xl border font-bold text-[13px] transition-all shrink-0 ${
                nearbyOnly
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
              }`}
            >
              <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
              Nearby only
            </button>
          )}
        </div>
      </Card>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-80 bg-slate-50 animate-pulse rounded-[16px]" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.length > 0 ? filteredOpportunities.map((opp) => (
            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={opp.id}>
              <Card className="sleek-card h-full flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">Open</span>
                  <div className="flex items-center gap-1.5">
                    {userCity && isSameCity(userCity, opp.location || '') && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <MapPin size={9} /> Nearby
                      </span>
                    )}
                    {getScoreBadge(opp.id)}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">{opp.title}</h3>
                <div className="text-[13px] text-secondary font-semibold mb-4 flex items-center gap-1">
                  <Building2 size={14} /> {opp.ngoName}
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-3">{opp.description}</p>
                  {scores[opp.id]?.breakdown && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">{scores[opp.id].breakdown}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {opp.requiredSkills?.map((skill: string) => (
                      <span key={skill} className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5 pt-2">
                    <div className="flex items-center gap-2 text-[12px] text-slate-400">
                      <MapPin size={14} className="text-primary/50" /> {opp.location}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-400">
                      <Calendar size={14} className="text-primary/50" /> {new Date(opp.dateTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50">
                  <Button
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95"
                    onClick={() => handleConnect(opp)}
                    disabled={connecting === opp.id}
                  >
                    {connecting === opp.id ? 'Sending...' : <><Send className="mr-2" size={16} /> Connect with NGO</>}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )) : (
            <div className="col-span-full py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
              <div className="max-w-xs mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No opportunities found</h3>
                <p className="text-slate-500 text-sm">Try adjusting your search or filters to find more results.</p>
                <Button variant="ghost" className="text-primary font-bold" onClick={() => { setSearchTerm(''); setLocationFilter(''); setNearbyOnly(false); }}>
                  Clear all filters
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
