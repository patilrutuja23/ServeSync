import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, where, getCountFromServer,
} from 'firebase/firestore';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldX, Clock, Users, Building2,
  FileText, CheckCircle2, XCircle, Eye,
  LogOut, LayoutDashboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Status = 'pending' | 'approved' | 'rejected';

interface VerificationRequest {
  id: string;
  ngoId: string;
  ngoName: string;
  documentUrl: string;
  status: Status;
  submittedAt: string;
  reviewNote?: string;
}

const STATUS_CFG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Clock size={12} /> },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200',             icon: <XCircle size={12} /> },
};

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests]         = useState<VerificationRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<Status | 'all'>('all');
  const [actionId, setActionId]         = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationRequest | null>(null);
  const [rejectNote, setRejectNote]     = useState('');
  const [stats, setStats]               = useState({ volunteers: 0, ngos: 0, pending: 0, approved: 0 });

  // Guard — non-admins get bounced immediately
  useEffect(() => {
    if (profile && profile.role !== 'admin') navigate('/', { replace: true });
  }, [profile, navigate]);

  // Real-time verification queue
  useEffect(() => {
    const q = query(collection(db, 'ngo_verification'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      setLoading(false);
    }, (err) => {
      console.error('[Admin] snapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Platform stats — re-fetch whenever requests list changes
  useEffect(() => {
    (async () => {
      try {
        const [v, n, p, a] = await Promise.all([
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'volunteer'))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'ngo'))),
          getCountFromServer(query(collection(db, 'ngo_verification'), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, 'ngo_verification'), where('status', '==', 'approved'))),
        ]);
        setStats({ volunteers: v.data().count, ngos: n.data().count, pending: p.data().count, approved: a.data().count });
      } catch (err) {
        console.error('[Admin] stats error:', err);
      }
    })();
  }, [requests]);

  const handleApprove = async (item: VerificationRequest) => {
    setActionId(item.id);
    try {
      await updateDoc(doc(db, 'ngo_verification', item.id), { status: 'approved' });
      await updateDoc(doc(db, 'users', item.ngoId), { isVerified: true });
      toast.success(`${item.ngoName} approved ✅`);
    } catch (err) {
      console.error('[Admin] approve error:', err);
      toast.error('Approve failed — check Firestore rules.');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    try {
      await updateDoc(doc(db, 'ngo_verification', rejectTarget.id), {
        status: 'rejected',
        reviewNote: rejectNote.trim() || 'Document not accepted.',
      });
      toast.success(`${rejectTarget.ngoName} rejected.`);
      setRejectTarget(null);
      setRejectNote('');
    } catch (err) {
      console.error('[Admin] reject error:', err);
      toast.error('Reject failed — check Firestore rules.');
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const isImage  = (url: string) => /\.(jpg|jpeg|png|webp|gif)/i.test(url) || url.includes('cloudinary');

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600" />
            <span className="text-base font-extrabold text-slate-900">Admin Panel</span>
          </div>
          <p className="text-[10px] text-slate-400 pl-9">ServeSync AI</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-bold text-[13px]">
            <ShieldCheck size={15} /> Verifications
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 text-[13px] font-medium cursor-not-allowed">
            <LayoutDashboard size={15} /> Analytics <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">soon</span>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
              {profile?.displayName?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-900 truncate">{profile?.displayName ?? 'Admin'}</p>
              <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 text-[12px] font-semibold transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">NGO Verification Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve NGO registration documents in real time.</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Volunteers',    value: stats.volunteers, icon: <Users size={16} className="text-primary" />,           bg: 'bg-primary/10' },
            { label: 'NGOs',          value: stats.ngos,       icon: <Building2 size={16} className="text-secondary" />,     bg: 'bg-secondary/10' },
            { label: 'Pending',       value: stats.pending,    icon: <Clock size={16} className="text-amber-600" />,         bg: 'bg-amber-50' },
            { label: 'Verified NGOs', value: stats.approved,   icon: <ShieldCheck size={16} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          ].map(s => (
            <Card key={s.label} className="sleek-card flex items-center gap-3 p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all capitalize ${
                filter === f
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300'
              }`}
            >
              {f === 'all'
                ? `All (${requests.length})`
                : `${f} (${requests.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white animate-pulse rounded-[16px]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
            <FileText size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">No {filter === 'all' ? '' : filter} requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(item => {
                const cfg  = STATUS_CFG[item.status];
                const busy = actionId === item.id;
                return (
                  <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <Card className="sleek-card">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">

                        {/* Doc preview */}
                        <div className="w-full md:w-24 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                          {isImage(item.documentUrl) ? (
                            <img src={item.documentUrl} alt="doc" className="w-full h-full object-cover" />
                          ) : (
                            <a href={item.documentUrl} target="_blank" rel="noopener noreferrer"
                               className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                              <FileText size={20} />
                              <span className="text-[9px] font-bold">PDF</span>
                            </a>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-[14px] font-bold text-slate-900">{item.ngoName || 'Unnamed NGO'}</h3>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Submitted {new Date(item.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {item.reviewNote && (
                            <p className="text-[11px] text-red-500 mt-0.5 italic">Note: {item.reviewNote}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <a href={item.documentUrl} target="_blank" rel="noopener noreferrer"
                             className="h-8 px-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1 transition-colors">
                            <Eye size={12} /> View
                          </a>
                          {item.status !== 'approved' && (
                            <Button size="sm" disabled={busy} onClick={() => handleApprove(item)}
                              className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold">
                              <CheckCircle2 size={12} className="mr-1" />{busy ? '…' : 'Approve'}
                            </Button>
                          )}
                          {item.status !== 'rejected' && (
                            <Button size="sm" variant="outline" disabled={busy}
                              onClick={() => { setRejectTarget(item); setRejectNote(''); }}
                              className="h-8 px-3 rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-[11px] font-bold">
                              <XCircle size={12} className="mr-1" />Reject
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── Reject modal ── */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setRejectTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900">Reject Verification</h3>
              <p className="text-[13px] text-slate-500">
                Rejecting <span className="font-bold text-slate-700">{rejectTarget.ngoName}</span>.
                Add a reason so the NGO knows what to fix.
              </p>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="e.g. Document is blurry or not a valid registration certificate."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[13px] text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => setRejectTarget(null)}>
                  Cancel
                </Button>
                <Button disabled={!!actionId} onClick={handleRejectConfirm}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold">
                  <XCircle size={13} className="mr-1.5" /> Confirm Reject
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
