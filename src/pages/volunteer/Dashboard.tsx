import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, updateDoc, doc, onSnapshot, getDocs, addDoc, getDoc, increment } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Calendar, Star, Sparkles, CheckCircle2, XCircle, Clock, Bell, Building2, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { getRecommendations } from '../../lib/matching';
import UserAvatar from '../../components/UserAvatar';

export default function VolunteerDashboard() {
  const { profile, user } = useAuth();
  const [skills, setSkills] = useState(profile?.skills?.join(', ') || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [availability, setAvailability] = useState(profile?.availability || '');
  const [updating, setUpdating] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [prevInviteCount, setPrevInviteCount] = useState(0);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [recScores, setRecScores] = useState<Record<string, number>>({});
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [actedOpps, setActedOpps] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({ eventsCompleted: 0, impactPoints: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Real-time listener on own user doc for live impact stats
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setLiveStats({
          eventsCompleted: d.eventsCompleted ?? 0,
          impactPoints: d.impactPoints ?? 0,
        });
      }
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const inviteQ = query(
      collection(db, 'invites'),
      where('volunteerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubInvites = onSnapshot(inviteQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      if (docs.length > prevInviteCount && prevInviteCount >= 0) {
        const newest = docs[docs.length - 1];
        toast(`📩 New invite from ${newest?.ngoName || 'an NGO'}!`, { duration: 4000 });
      }
      setPrevInviteCount(docs.length);
      setInvites(docs);
    }, (error) => {
      console.error('Error fetching invites:', error);
    });

    const actedQ = query(
      collection(db, 'connections'),
      where('volunteerId', '==', user.uid),
      where('type', 'in', ['request', 'ignored'])
    );

    const unsubActed = onSnapshot(actedQ, (snapshot) => {
      const ids = new Set(snapshot.docs.map(d => (d.data() as any).opportunityId).filter(Boolean));
      setActedOpps(ids);
    }, (error) => {
      console.error('Error fetching acted opportunities:', error);
    });

    // Real-time opportunities feed for recommendations — filters out docs missing ngoId (test/orphan data)
    const oppQ = query(
      collection(db, 'opportunities'),
      where('ngoId', '!=', '')
    );
    const unsubOpps = onSnapshot(oppQ, async (snap) => {
      if (!profile) return;
      const opps = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter(o => o.ngoId && o.title); // drop malformed test docs
      console.log('[Dashboard] Opportunities for recommendations:', opps.length);
      setLoadingRecs(true);
      try {
        const results = await getRecommendations(profile, opps, { aiLimit: 10, limit: 5 });
        const scores: Record<string, number> = {};
        results.forEach(r => { scores[r.opportunityId] = r.finalScore; });
        setRecommended(results.map(r => r.opportunity));
        setRecScores(scores);
        console.log('[Dashboard] Recommendations loaded:', results.length);
      } catch (err) {
        console.error('[Dashboard] Recommendation error:', err);
      } finally {
        setLoadingRecs(false);
      }
    }, (err) => {
      console.error('[Dashboard] Opportunities snapshot error:', err);
      setLoadingRecs(false);
    });

    // Real-time recent activity (last 5 connections for this volunteer)
    const actQ = query(
      collection(db, 'connections'),
      where('volunteerId', '==', user.uid)
    );
    const unsubActivity = onSnapshot(actQ, (snap) => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
        .slice(0, 5);
      setRecentActivity(docs);
    }, (err) => console.error('[Dashboard] Activity error:', err));

    return () => {
      unsubInvites();
      unsubActed();
      unsubOpps();
      unsubActivity();
    };
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdating(true);
    try {
      const skillList = skills.split(',').map(s => s.trim()).filter(s => s !== '');
      await updateDoc(doc(db, 'users', user.uid), {
        skills: skillList,
        location,
        availability
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleConnect = async (opp: any) => {
    if (!user || !profile) return;
    setConnecting(opp.id);
    console.log('Connecting to opportunity:', opp.id, opp.title);
    try {
      const snap = await getDocs(query(
        collection(db, 'connections'),
        where('volunteerId', '==', user.uid),
        where('opportunityId', '==', opp.id)
      ));
      if (!snap.empty) {
        toast.info('You already sent a request for this opportunity.');
        return;
      }
      await addDoc(collection(db, 'connections'), {
        volunteerId: user.uid,
        ngoId: opp.ngoId,
        opportunityId: opp.id,
        status: 'pending',
        type: 'request',
        createdAt: new Date().toISOString(),
        message: `${profile.displayName} is interested in: ${opp.title}`,
      });
      console.log('Connection request saved successfully');
      toast.success('Connection request sent!');
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to send request.');
    } finally {
      setConnecting(null);
    }
  };

  const handleIgnore = async (opp: any) => {
    if (!user) return;
    console.log('Ignoring opportunity:', opp.id);
    try {
      await addDoc(collection(db, 'connections'), {
        volunteerId: user.uid,
        opportunityId: opp.id,
        type: 'ignored',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to ignore:', error);
    }
  };

  const handleInviteAction = async (inviteId: string, status: 'accepted' | 'rejected') => {
    try {
      const inviteSnap = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteSnap.exists()) return;
      const invite = inviteSnap.data() as any;

      await updateDoc(doc(db, 'invites', inviteId), { status });

      if (status === 'accepted' && invite.opportunityId && user) {
        // Duplicate-prevention: check if already tracked
        const alreadyTracked = await getDocs(query(
          collection(db, 'connections'),
          where('volunteerId', '==', user.uid),
          where('opportunityId', '==', invite.opportunityId),
          where('impactTracked', '==', true)
        ));
        if (alreadyTracked.empty) {
          const oppSnap = await getDoc(doc(db, 'opportunities', invite.opportunityId));
          const impactValue: number = (oppSnap.exists() ? (oppSnap.data() as any).impactValue : 0) ?? 10;
          await updateDoc(doc(db, 'users', user.uid), {
            eventsCompleted: increment(1),
            impactPoints: increment(impactValue),
          });
          await addDoc(collection(db, 'connections'), {
            volunteerId: user.uid,
            ngoId: invite.ngoId,
            opportunityId: invite.opportunityId,
            status: 'accepted',
            type: 'invite-accepted',
            impactTracked: true,
            createdAt: new Date().toISOString(),
          });
          console.log(`[Impact] eventsCompleted +1, impactPoints +${impactValue} for ${user.uid}`);
        }
      }
      toast.success(`Invite ${status}!`);
    } catch (error) {
      console.error('Failed to update invite:', error);
      toast.error('Failed to update invite.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Volunteer Dashboard</h1>
        <p className="text-slate-500">Here's what's happening in your volunteer community.</p>
      </header>

      <div className="grid lg:grid-cols-[280px_1fr_300px] gap-6 items-start">
        {/* Left Column: Profile & Skills */}
        <div className="space-y-6">
          <Card className="sleek-card hover-lift text-center">
            <CardHeader className="pt-2">
              <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden mb-4">
                <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-full h-full rounded-full" />
              </div>
              <CardTitle className="text-lg font-bold">{profile?.displayName}</CardTitle>
              <CardDescription className="text-xs">{profile?.location || 'Location not set'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div className="text-xl font-extrabold text-primary">{liveStats.eventsCompleted}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Events</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div className="text-xl font-extrabold text-primary">{liveStats.impactPoints}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Impact pts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sleek-card hover-lift">
            <h4 className="section-title">My Skills</h4>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.map((skill: string) => (
                <span key={skill} className="bg-slate-100 text-slate-700 text-[12px] px-2.5 py-1 rounded-md border border-slate-200">
                  {skill}
                </span>
              ))}
              {(!profile?.skills || profile.skills.length === 0) && (
                <p className="text-xs text-slate-400 italic">No skills added yet.</p>
              )}
            </div>
          </Card>

          <Card className="sleek-card hover-lift">
            <h4 className="section-title">Availability</h4>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              {profile?.availability || "Update your preferences to show when you're available."}
            </p>
          </Card>
        </div>

        {/* Center Column: Recommended */}
        <div className="space-y-6">
          <h4 className="section-title">Recommended for you
            {loadingRecs && <span className="ml-2 text-[11px] text-primary font-semibold animate-pulse">Scoring...</span>}
          </h4>
          <div className="space-y-4">
            {recommended.filter(opp => !actedOpps.has(opp.id)).length > 0 ? recommended.filter(opp => !actedOpps.has(opp.id)).map((opp) => (
              <Card key={opp.id} className="sleek-card hover-lift border-l-4 border-l-primary relative">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[16px] font-bold text-slate-900">{opp.title}</h3>
                  {recScores[opp.id] !== undefined && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recScores[opp.id] >= 70 ? 'bg-emerald-100 text-emerald-700'
                      : recScores[opp.id] >= 40 ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Zap size={10} /> {recScores[opp.id]}% Match
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-secondary font-semibold mb-3">{opp.ngoName}</div>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-4">{opp.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[12px] text-slate-400 flex items-center gap-1">
                    <Calendar size={14} /> {new Date(opp.dateTime).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[13px] rounded-lg border-slate-200" onClick={() => handleIgnore(opp)}>Ignore</Button>
                    <Button className="h-8 text-[13px] rounded-lg bg-primary hover:bg-primary/90 text-white" disabled={connecting === opp.id} onClick={() => handleConnect(opp)}>{connecting === opp.id ? 'Sending...' : 'Connect'}</Button>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="py-20 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
                <Sparkles className="mx-auto text-slate-200 mb-4" size={40} />
                <p className="text-slate-400">Finding the best matches for you...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Invites & Activity */}
        <div className="space-y-6">
          <Card className="sleek-card hover-lift">
            <h4 className="section-title flex items-center gap-2">
              Pending Invites
              {invites.length > 0 && (
                <span className="ml-auto bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{invites.length}</span>
              )}
            </h4>
            <div className="space-y-3">
              {invites.length > 0 ? invites.map((invite) => (
                <div key={invite.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm shrink-0">
                      {invite.ngoName?.charAt(0) || 'N'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate">{invite.ngoName || 'NGO'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{invite.opportunityTitle}</p>
                    </div>
                  </div>
                  {invite.message && (
                    <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2">"{invite.message}"</p>
                  )}
                  <p className="text-[10px] text-slate-300">{new Date(invite.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-[12px] rounded-lg border-slate-200 text-slate-600" onClick={() => handleInviteAction(invite.id, 'rejected')}>
                      <XCircle size={13} className="mr-1" /> Reject
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-[12px] rounded-lg bg-primary hover:bg-primary/90 text-white" onClick={() => handleInviteAction(invite.id, 'accepted')}>
                      <CheckCircle2 size={13} className="mr-1" /> Accept
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="py-4 text-center text-xs text-slate-400">No pending invites.</p>
              )}
            </div>
          </Card>

          <Card className="sleek-card hover-lift">
            <h4 className="section-title">Recent Activity</h4>
            <div className="space-y-1">
              {recentActivity.length > 0 ? recentActivity.map((act) => (
                <div key={act.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-slate-900 capitalize">
                      {act.type === 'invite-accepted' ? 'Invite Accepted' : act.type === 'ignored' ? 'Opportunity Ignored' : 'Connection Request'}
                    </div>
                    <div className="text-[11px] text-slate-400">{act.opportunityId ? `Opp: ${act.opportunityId.slice(0, 8)}…` : ''}</div>
                  </div>
                  <div className={`text-[11px] font-bold ${
                    act.status === 'accepted' ? 'text-emerald-600' :
                    act.status === 'rejected' ? 'text-red-400' :
                    act.type === 'ignored' ? 'text-slate-400' : 'text-amber-500'
                  }`}>
                    {act.status?.toUpperCase() ?? act.type?.toUpperCase()}
                  </div>
                </div>
              )) : (
                <p className="py-4 text-center text-xs text-slate-400">No recent activity.</p>
              )}
            </div>
          </Card>

          <Card className="bg-linear-to-br from-primary to-primary/80 text-white border-0 p-6 rounded-[16px] shadow-lg">
            <h4 className="text-[14px] font-semibold uppercase tracking-[0.5px] text-white/80 mb-2">Impact Summary</h4>
            <p className="text-[13px] font-medium leading-relaxed">
              You've completed <b className="text-white">{liveStats.eventsCompleted}</b> event{liveStats.eventsCompleted !== 1 ? 's' : ''} and earned{' '}
              <b className="text-white">{liveStats.impactPoints}</b> impact points.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
