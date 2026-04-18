import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Card } from '../../components/ui/card';
import { Send, Clock, CheckCircle2, XCircle, Users } from 'lucide-react';

const statusConfig = {
  pending:  { label: 'Pending',  icon: Clock,         cls: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', icon: CheckCircle2,  cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', icon: XCircle,       cls: 'bg-red-100 text-red-600' },
};

export default function NGOSentInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'invites'), where('ngoId', '==', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      // Enrich any invite missing volunteerName by fetching from users collection
      const enriched = await Promise.all(docs.map(async (invite) => {
        if (invite.volunteerName) return invite;
        try {
          const userSnap = await getDoc(doc(db, 'users', invite.volunteerId));
          if (userSnap.exists()) {
            const u = userSnap.data() as any;
            return { ...invite, volunteerName: u.displayName || invite.volunteerId, volunteerPhoto: u.photoURL || '' };
          }
        } catch (e) {
          console.error('Failed to fetch volunteer name:', e);
        }
        return invite;
      }));

      enriched.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setInvites(enriched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching sent invites:', error);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const filtered = filter === 'all' ? invites : invites.filter(i => i.status === filter);
  const counts = {
    all: invites.length,
    pending: invites.filter(i => i.status === 'pending').length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    rejected: invites.filter(i => i.status === 'rejected').length,
  };

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sent Invites</h1>
        <p className="text-slate-500">Track all invites you've sent to volunteers.</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['all', 'pending', 'accepted', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filter === s ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <p className="text-2xl font-extrabold text-slate-900">{counts[s]}</p>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Invites list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <Card className="sleek-card divide-y divide-slate-50">
          {filtered.map((invite) => {
            const cfg = statusConfig[invite.status as keyof typeof statusConfig] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={invite.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {invite.volunteerPhoto
                    ? <img src={invite.volunteerPhoto} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold">{invite.volunteerName?.charAt(0) || <Send size={18} />}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-slate-900 truncate">
                    {invite.volunteerName || invite.volunteerId}
                  </p>
                  <p className="text-[12px] text-slate-500 truncate">{invite.opportunityTitle}</p>
                  {invite.message && (
                    <p className="text-[11px] text-slate-400 italic truncate mt-0.5">"{invite.message}"</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                  <span className="text-[10px] text-slate-300">{new Date(invite.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <div className="py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
          <Users className="mx-auto text-slate-200 mb-4" size={40} />
          <p className="text-slate-400 text-sm">
            {filter === 'all' ? "You haven't sent any invites yet." : `No ${filter} invites.`}
          </p>
        </div>
      )}
    </div>
  );
}
