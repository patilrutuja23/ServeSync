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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { MapPin, Calendar, Mail, History, Send, CheckCircle2, Clock, XCircle, Building2, Camera, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import UserAvatar from '../../components/UserAvatar';
import WorkProofGallery from '../../components/WorkProofGallery';
import { VerifiedBadge } from '../../lib/trust.tsx';

export default function NGOProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const openEdit = () => {
    setEditName(profile?.displayName || profile?.organizationName || '');
    setEditBio(profile?.bio || '');
    setEditLocation(profile?.location || '');
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

    const oppQ = query(
      collection(db, 'opportunities'),
      where('ngoId', '==', user.uid)
    );

    const unsubOpp = onSnapshot(oppQ, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setOpportunities(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching opportunities:', error);
      setLoading(false);
    });

    const connQ = query(
      collection(db, 'connections'),
      where('ngoId', '==', user.uid),
      where('type', '==', 'invite')
    );

    const unsubInvites = onSnapshot(connQ, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setSentInvites(docs);
    }, (error) => {
      console.error('Error fetching invites:', error);
    });

    return () => {
      unsubOpp();
      unsubInvites();
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
        <div className="h-40 bg-linear-to-r from-secondary to-primary opacity-90"></div>
        <div className="relative pt-0 pb-10 px-10">
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-8">
            <div className="h-40 w-40 border-[6px] border-white shadow-2xl rounded-[32px] overflow-hidden bg-slate-100">
              <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-full h-full rounded-none object-cover" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{profile?.displayName || profile?.organizationName}</h1>
                <span className="role-badge bg-secondary/10 text-secondary">NGO</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-slate-500 font-medium">
                <span className="flex items-center gap-2 text-sm"><Mail size={16} className="text-secondary" /> {profile?.email}</span>
                {profile?.location && <span className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-secondary" /> {profile.location}</span>}
                {(profile as any)?.isVerified
                  ? <VerifiedBadge size="md" />
                  : <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full"><ShieldCheck size={12} /> Verification Pending</span>
                }
              </div>
            </div>
            <Button className="bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold px-8 h-12 shadow-lg shadow-secondary/20" onClick={openEdit}>
              Edit Profile
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-12 pt-10 border-t border-slate-50">
            <div className="md:col-span-2 space-y-10">
              <section className="space-y-4">
                <h3 className="section-title">Organization Mission</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">
                  {profile?.bio || "Tell volunteers about your mission and the impact you're making."}
                </p>
              </section>
            </div>
            <div className="space-y-8">
              <div className="p-8 rounded-[24px] bg-slate-50/50 border border-slate-100 space-y-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Impact Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Opportunities</span>
                    <span className="text-xl font-extrabold text-secondary">{opportunities.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Invites Sent</span>
                    <span className="text-xl font-extrabold text-primary">{sentInvites.length}</span>
                  </div>
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
            <DialogTitle className="text-xl font-bold">Edit NGO Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Organization Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Mission / Bio</Label>
              <Input value={editBio} onChange={e => setEditBio(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Location</Label>
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
            <Button type="button" onClick={handleSave} disabled={saving} className="w-full h-11 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl mt-2">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs for Opportunities and Invites */}
      <Tabs defaultValue="opportunities" className="w-full">
        <TabsList className="inline-flex p-1 bg-slate-50 rounded-2xl h-14 border border-slate-100 mb-8">
          <TabsTrigger value="opportunities" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-secondary data-[state=active]:shadow-sm">
            <Building2 size={18} /> Our Opportunities
          </TabsTrigger>
          <TabsTrigger value="invites" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-secondary data-[state=active]:shadow-sm">
            <Send size={18} /> Sent Invites
          </TabsTrigger>
          <TabsTrigger value="workproof" className="rounded-xl px-8 flex gap-2 font-bold text-[13px] data-[state=active]:bg-white data-[state=active]:text-secondary data-[state=active]:shadow-sm">
            <Camera size={18} /> Work Photos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="opportunities">
          <div className="grid md:grid-cols-2 gap-6">
            {opportunities.length > 0 ? opportunities.map((opp) => (
              <Card key={opp.id} className="sleek-card group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-secondary transition-colors">{opp.title}</h3>
                  <span className="bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">Active</span>
                </div>
                <div className="text-[12px] text-slate-400 font-medium mb-4 flex items-center gap-1">
                  <Calendar size={14} className="text-secondary/50" /> {new Date(opp.dateTime).toLocaleDateString()}
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-3">{opp.description}</p>
              </Card>
            )) : (
              <div className="col-span-full py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No opportunities posted yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invites">
          <Card className="sleek-card">
            <h3 className="section-title mb-6">Invite Tracking</h3>
            {sentInvites.length > 0 ? (
              <div className="space-y-1">
                {sentInvites.map((invite) => (
                  <div key={invite.id} className="py-4 flex items-center justify-between border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Send size={20} />
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-slate-900">Invite Sent</p>
                        <p className="text-[12px] text-slate-400 font-medium">{new Date(invite.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(invite.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 font-medium text-sm">No invites sent yet.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="workproof">
          <Card className="sleek-card">
            <h3 className="section-title mb-6">Work Photos</h3>
            <WorkProofGallery role="ngo" />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
