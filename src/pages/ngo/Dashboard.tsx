import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Plus, MapPin, Calendar, Users, CheckCircle2, XCircle, Trash2, Send, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { VerifiedBadge, RatingDisplay, RateDialog, completeTask, rateVolunteer } from '../../lib/trust.tsx';

export default function NGODashboard() {
  const { profile, user } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [acceptedCounts, setAcceptedCounts] = useState<Record<string, number>>({});

  const [ratingTarget, setRatingTarget] = useState<{ connId: string; volunteerId: string } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [skills, setSkills] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const oppQ = query(
      collection(db, 'opportunities'),
      where('ngoId', '==', user.uid)
    );

    const unsubOpp = onSnapshot(oppQ, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      console.log('Opportunities snapshot:', docs);
      setOpportunities(docs);
      setLoading(false);
    }, (error) => {
      console.error('Opportunities listener error:', error);
      setLoading(false);
    });

    const reqQ = query(
      collection(db, 'connections'),
      where('ngoId', '==', user.uid),
      where('type', '==', 'request'),
      where('status', '==', 'pending')
    );

    const unsubReq = onSnapshot(reqQ, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, (error) => {
      console.error('Requests listener error:', error);
    });

    const acceptedQ = query(
      collection(db, 'connections'),
      where('ngoId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const unsubAccepted = onSnapshot(acceptedQ, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(d => {
        const oppId = (d.data() as any).opportunityId;
        if (oppId) counts[oppId] = (counts[oppId] ?? 0) + 1;
      });
      setAcceptedCounts(counts);
    }, (error) => {
      console.error('Accepted connections listener error:', error);
    });

    return () => {
      unsubOpp();
      unsubReq();
      unsubAccepted();
    };
  }, [user]);

  const handleCreateOpportunity = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !profile) return;
    console.log('Form submitted:', { title, description, location, dateTime, skills });
    setSubmitting(true);
    try {
      const requiredSkills = skills.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
      const data = {
        title,
        description,
        location,
        dateTime,
        requiredSkills,
        ngoId: user.uid,
        ngoName: profile.displayName || profile.organizationName || 'NGO',
        createdAt: new Date().toISOString(),
      };
      console.log('Saving opportunity:', data);
      await addDoc(collection(db, 'opportunities'), data);
      toast.success('Opportunity posted successfully!');
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setDateTime('');
      setSkills('');
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      handleFirestoreError(error, OperationType.CREATE, 'opportunities');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManageParticipants = async (opp: any) => {
    setSelectedOpp(opp);
    setParticipantsOpen(true);
    setLoadingParticipants(true);
    try {
      const q = query(
        collection(db, 'connections'),
        where('opportunityId', '==', opp.id),
        where('type', '==', 'request')
      );
      const snap = await getDocs(q);
      const conns = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      // Fetch volunteer profiles by direct doc read (no index needed)
      const enriched = await Promise.all(conns.map(async (conn) => {
        try {
          const vDoc = await import('firebase/firestore').then(({ getDoc, doc: firestoreDoc }) =>
            getDoc(firestoreDoc(db, 'users', conn.volunteerId))
          );
          const volunteer = vDoc.exists() ? vDoc.data() : {};
          return { ...conn, volunteerName: (volunteer as any).displayName || conn.volunteerId, volunteerPhoto: (volunteer as any).photoURL || '' };
        } catch {
          return { ...conn, volunteerName: conn.volunteerId, volunteerPhoto: '' };
        }
      }));
      setParticipants(enriched);
    } catch (error) {
      console.error('Failed to load participants:', error);
      toast.error('Failed to load participants.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleCompleteTask = async (connId: string, volunteerId: string) => {
    try {
      await completeTask(connId, volunteerId);
      setParticipants(prev => prev.map(p => p.id === connId ? { ...p, status: 'completed' } : p));
      toast.success('Task marked as completed!');
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to mark task complete.');
    }
  };

  const handleRateVolunteer = async (rating: number) => {
    if (!ratingTarget) return;
    await rateVolunteer(ratingTarget.volunteerId, rating);
    toast.success('Rating submitted!');
    setRatingTarget(null);
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;
    try {
      // Delete the opportunity
      await deleteDoc(doc(db, 'opportunities', id));
      // Clean up orphaned connections for this opportunity
      const connSnap = await getDocs(query(collection(db, 'connections'), where('opportunityId', '==', id)));
      await Promise.all(connSnap.docs.map(d => deleteDoc(doc(db, 'connections', d.id))));
      // Clean up orphaned invites for this opportunity
      const inviteSnap = await getDocs(query(collection(db, 'invites'), where('opportunityId', '==', id)));
      await Promise.all(inviteSnap.docs.map(d => deleteDoc(doc(db, 'invites', d.id))));
      toast.success('Opportunity deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `opportunities/${id}`);
    }
  };

  const handleRequestAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'connections', requestId), { status });
      toast.success(`Request ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `connections/${requestId}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">NGO Dashboard</h1>
          <p className="text-slate-500">Manage your opportunities and connect with volunteers.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
                <Plus className="mr-2" size={20} /> Post New Opportunity
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[480px] rounded-3xl border border-slate-300 bg-white shadow-2xl p-0 overflow-hidden">
            <div className="max-h-[85vh] overflow-y-auto">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-2xl font-bold">Create Opportunity</DialogTitle>
              <DialogDescription className="px-0">Fill in the details for your new volunteering event.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateOpportunity} className="space-y-4 px-6 pt-4 pb-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Weekend Beach Cleanup" className="rounded-xl border-slate-200 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-sm font-semibold text-slate-700">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe the role and impact..." className="rounded-xl border-slate-200 focus:ring-primary min-h-[120px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loc" className="text-sm font-semibold text-slate-700">Location</Label>
                  <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="City, Area" className="rounded-xl border-slate-200 focus:ring-primary" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-semibold text-slate-700">Date & Time</Label>
                  <Input id="date" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required className="rounded-xl border-slate-200 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills" className="text-sm font-semibold text-slate-700">Required Skills (comma separated)</Label>
                <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Teaching, First Aid, etc." className="rounded-xl border-slate-200 focus:ring-primary" />
              </div>
              <Button
                type="button"
                onClick={() => handleCreateOpportunity()}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold mt-4"
                disabled={submitting}
              >
                {submitting ? 'Posting...' : 'Post Opportunity'}
              </Button>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Left Column: Requests */}
        <div className="space-y-6">
          <h4 className="section-title flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Volunteer Requests ({requests.length})
          </h4>
          <div className="space-y-4">
            <AnimatePresence>
              {requests.length > 0 ? requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="sleek-card hover-lift border-l-4 border-l-secondary bg-secondary/5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/10 p-2 rounded-lg text-secondary">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">New Request</p>
                          <p className="text-[11px] text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-600 italic leading-relaxed">"{req.message}"</p>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-[12px] rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => handleRequestAction(req.id, 'rejected')}>
                          Reject
                        </Button>
                        <Button size="sm" className="flex-1 h-8 text-[12px] rounded-lg bg-primary hover:bg-primary/90 text-white" onClick={() => handleRequestAction(req.id, 'accepted')}>
                          Accept
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="py-12 text-center text-slate-400 bg-white rounded-[16px] border border-dashed border-slate-200 text-sm">
                  No pending requests.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Opportunities */}
        <div className="space-y-6">
          <h4 className="section-title flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Your Opportunities
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            {opportunities.length > 0 ? opportunities.map((opp) => (
              <Card key={opp.id} className="sleek-card hover-lift flex flex-col group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{opp.title}</h3>
                    {opp.verified && <VerifiedBadge />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(acceptedCounts[opp.id] ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Users size={10} /> {acceptedCounts[opp.id]} joined
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-lg" onClick={() => handleDeleteOpportunity(opp.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                {(opp.rating > 0) && (
                  <div className="mb-3"><RatingDisplay rating={opp.rating} count={opp.ratingCount} /></div>
                )}
                <div className="flex-1 space-y-4">
                  <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2">{opp.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.requiredSkills?.map((skill: string) => (
                      <span key={skill} className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-slate-400 pt-2">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {opp.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(opp.dateTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50">
                  <Button variant="ghost" className="w-full h-9 text-secondary hover:text-secondary hover:bg-secondary/5 text-[13px] font-bold rounded-lg" onClick={() => handleManageParticipants(opp)}>
                    Manage Participants
                  </Button>
                </div>
              </Card>
            )) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
                <p className="text-slate-400">You haven't posted any opportunities yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants Dialog */}
      <Dialog open={participantsOpen} onOpenChange={setParticipantsOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl border border-slate-300 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Participants — {selectedOpp?.title}</DialogTitle>
            <DialogDescription>Volunteers who expressed interest in this opportunity.</DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-2 max-h-[400px] overflow-y-auto">
            {loadingParticipants ? (
              <div className="py-10 text-center text-slate-400 text-sm">Loading...</div>
            ) : participants.length > 0 ? participants.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {p.volunteerPhoto
                    ? <img src={p.volunteerPhoto} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{p.volunteerName?.charAt(0)}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-slate-900 truncate">{p.volunteerName}</p>
                  <p className="text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {p.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-[12px] rounded-lg border-slate-200" onClick={() => handleRequestAction(p.id, 'rejected')}>
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                      <Button size="sm" className="h-8 text-[12px] rounded-lg bg-primary hover:bg-primary/90 text-white" onClick={() => handleRequestAction(p.id, 'accepted')}>
                        <CheckCircle2 size={14} className="mr-1" /> Accept
                      </Button>
                    </div>
                  ) : p.status === 'accepted' ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-[12px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleCompleteTask(p.id, p.volunteerId)}>
                        <CheckCircle2 size={13} className="mr-1" /> Mark Complete
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-[12px] rounded-lg border-slate-200" onClick={() => setRatingTarget({ connId: p.id, volunteerId: p.volunteerId })}>
                        Rate
                      </Button>
                    </div>
                  ) : (
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${
                      p.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-600'
                    }`}>{p.status}</span>
                  )}
                  {ratingTarget?.connId === p.id && (
                    <RateDialog
                      label={`Rate ${p.volunteerName}`}
                      onSubmit={handleRateVolunteer}
                      onCancel={() => setRatingTarget(null)}
                    />
                  )}
                </div>
              </div>
            )) : (
              <div className="py-16 text-center text-slate-400 text-sm">No volunteers have applied yet.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
