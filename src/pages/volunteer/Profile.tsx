import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { MapPin, Calendar, Mail, History, Send, CheckCircle2, Clock, XCircle, Pencil, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { RatingDisplay, CompletedTasksBadge } from '../../lib/trust.tsx';
import UserAvatar from '../../components/UserAvatar';
import WorkProofGallery from '../../components/WorkProofGallery';

export default function VolunteerProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editAvailability, setEditAvailability] = useState('');

  const [liveUser, setLiveUser] = useState<any>(null);

  // Real-time listener on own user doc so Impact Stats update instantly
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setLiveUser(snap.data());
    });
    return unsub;
  }, [user]);

  const eventsCompleted = liveUser?.eventsCompleted ?? (profile as any)?.eventsCompleted ?? 0;
  const impactPoints = liveUser?.impactPoints ?? (profile as any)?.impactPoints ?? 0;
  const completedTasks = liveUser?.completedTasks ?? (profile as any)?.completedTasks ?? 0;
  const rating = liveUser?.rating ?? (profile as any)?.rating ?? 0;
  const ratingCount = liveUser?.ratingCount ?? (profile as any)?.ratingCount ?? 0;

  const openEdit = () => {
    setEditBio(profile?.bio || '');
    setEditLocation(profile?.location || '');
    setEditSkills(profile?.skills?.join(', ') || '');
    setEditAvailability(profile?.availability || '');
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        bio: editBio,
        location: editLocation,
        skills: editSkills.split(',').map(s => s.trim()).filter(Boolean),
        availability: editAvailability,
      });
      await refreshProfile();
      toast.success('Profile updated!');
      setIsEditOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const actQ = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid)
    );

    const unsubActivities = onSnapshot(actQ, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
      setActivities(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching activities:', error);
      setLoading(false);
    });

    const connQ = query(
      collection(db, 'connections'),
      where('volunteerId', '==', user.uid)
    );

    const unsubConnections = onSnapshot(connQ, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setConnections(docs);
    }, (error) => {
      console.error('Error fetching connections:', error);
    });

    return () => {
      unsubActivities();
      unsubConnections();
    };
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 size={12} className="mr-1" /> Accepted</Badge>;
      case 'rejected': return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200"><XCircle size={12} className="mr-1" /> Rejected</Badge>;
      default: return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200"><Clock size={12} className="mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <Card className="sleek-card p-0 overflow-hidden">
        <div className="h-40 bg-linear-to-r from-primary to-secondary opacity-90"></div>
        <div className="relative pt-0 pb-10 px-10">
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-8">
            <div className="h-40 w-40 border-[6px] border-white shadow-2xl rounded-[32px] overflow-hidden bg-slate-100">
              <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-full h-full rounded-none object-cover" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{profile?.displayName}</h1>
                <span className="role-badge">Volunteer</span>
                {completedTasks > 0 && <CompletedTasksBadge count={completedTasks} />}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
                <span className="flex items-center gap-2 text-sm"><Mail size={16} className="text-primary" /> {profile?.email}</span>
                {profile?.location && <span className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-primary" /> {profile.location}</span>}
                {rating > 0 && <RatingDisplay rating={rating} count={ratingCount} />}
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-primary/20" onClick={openEdit}>
              Edit Profile
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-12 pt-10 border-t border-slate-50">
            <div className="md:col-span-2 space-y-10">
              <section className="space-y-4">
                <h3 className="section-title">About Me</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">
                  {profile?.bio || "No bio provided yet. Tell NGOs more about yourself!"}
                </p>
              </section>
              <section className="space-y-4">
                <h3 className="section-title">Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {profile?.skills && profile.skills.length > 0 ? profile.skills.map(skill => (
                    <span key={skill} className="bg-slate-50 text-slate-600 text-[13px] font-bold px-4 py-1.5 rounded-xl border border-slate-100">
                      {skill}
                    </span>
                  )) : <span className="text-slate-400 italic text-sm">No skills listed</span>}
                </div>
              </section>
            </div>
            <div className="space-y-8">
              <div className="p-8 rounded-[24px] bg-slate-50/50 border border-slate-100 space-y-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Impact Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Events Completed</span>
                    <span className="text-xl font-extrabold text-primary">{eventsCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Impact Points</span>
                    <span className="text-xl font-extrabold text-amber-500">{impactPoints}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Completed Tasks</span>
                    <span className="text-xl font-extrabold text-emerald-600">{completedTasks}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Connections</span>
                    <span className="text-xl font-extrabold text-secondary">{connections.length}</span>
                  </div>
                  {rating > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-1">
                      <span className="text-sm font-medium text-slate-500">Rating</span>
                      <div><RatingDisplay rating={rating} count={ratingCount} size={16} /></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl border border-slate-300 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Display Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Bio</Label>
              <Input value={editBio} onChange={e => setEditBio(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Location</Label>
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Skills (comma separated)</Label>
              <Input value={editSkills} onChange={e => setEditSkills(e.target.value)} placeholder="Teaching, Coding, etc." className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Availability</Label>
              <Input value={editAvailability} onChange={e => setEditAvailability(e.target.value)} placeholder="Weekends, Evenings, etc." className="rounded-xl border-slate-200" />
            </div>
            <Button type="button" onClick={handleSave} disabled={saving} className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl mt-2">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs for History and Connections */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="inline-flex p-1 bg-slate-50 rounded-2xl h-14 border border-slate-100 mb-8">
          <TabsTrigger value="connections" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Send size={18} /> Connections
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <History size={18} /> Activity Log
          </TabsTrigger>
          <TabsTrigger value="workproof" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Camera size={18} /> Work Photos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections">
          <Card className="sleek-card">
            <h3 className="section-title mb-6">Connection Tracking</h3>
            {connections.length > 0 ? (
              <div className="space-y-1">
                {connections.map((conn) => (
                  <div key={conn.id} className="py-4 flex items-center justify-between border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${conn.type === 'invite' ? 'bg-orange-50 text-orange-600' : 'bg-secondary/10 text-secondary'}`}>
                        {conn.type === 'invite' ? <Calendar size={20} /> : <Send size={20} />}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">
                          {conn.type === 'invite' ? 'Invite from NGO' : 'Request to NGO'}
                        </p>
                        <p className="text-[12px] text-slate-400 font-medium">{new Date(conn.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(conn.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 font-medium text-sm">No connections yet.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="sleek-card">
            <h3 className="section-title mb-8">Activity Log</h3>
            {activities.length > 0 ? (
              <div className="space-y-0">
                {activities.map((act, i) => (
                  <div key={act.id} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${i === 0 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                      <div className="w-0.5 h-full bg-slate-100 group-last:bg-transparent"></div>
                    </div>
                    <div className="pb-10">
                      <p className="text-[15px] font-bold text-slate-900 mb-1">{act.action}</p>
                      <p className="text-[13px] text-slate-500 leading-relaxed mb-2">{act.details}</p>
                      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{new Date(act.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 font-medium text-sm">No activity history found.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="workproof">
          <Card className="sleek-card">
            <h3 className="section-title mb-6">Work Photos</h3>
            <WorkProofGallery role="volunteer" />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

