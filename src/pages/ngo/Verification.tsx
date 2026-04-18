import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, addDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { uploadFile, validateDocument } from '../../lib/storage';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, ShieldX, Clock, Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { VerifiedBadge } from '../../lib/trust.tsx';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VerificationDoc {
  id: string;
  ngoId: string;
  documentUrl: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewNote?: string;
}

export default function NGOVerification() {
  const { user, profile, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<VerificationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const isVerified = (profile as any)?.isVerified === true;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'ngo_verification'),
      where('ngoId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setVerification({ id: snap.docs[0].id, ...snap.docs[0].data() as any });
      } else {
        setVerification(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('[Verification] error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateDocument(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);
    try {
      const path = `ngo_verification/${user.uid}/${Date.now()}_${file.name}`;
      const documentUrl = await uploadFile(file, path, setProgress);
      await addDoc(collection(db, 'ngo_verification'), {
        ngoId: user.uid,
        ngoName: profile?.displayName || profile?.organizationName || '',
        documentUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });
      toast.success('Verification document submitted! We\'ll review it shortly.');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('[Verification] submit error:', err);
      toast.error('Submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const StatusBanner = () => {
    if (!verification) return null;
    const map: Record<VerificationStatus, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
      pending: {
        icon: <Clock size={18} className="text-amber-600" />,
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-800',
        label: 'Verification Pending — our team will review your document within 2–3 business days.',
      },
      approved: {
        icon: <ShieldCheck size={18} className="text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-800',
        label: 'Your NGO is verified! The Verified badge is now visible on your profile.',
      },
      rejected: {
        icon: <ShieldX size={18} className="text-red-600" />,
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        label: `Verification rejected. ${verification.reviewNote ? `Reason: ${verification.reviewNote}` : 'Please resubmit with a valid document.'}`,
      },
    };
    const s = map[verification.status];
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg}`}>
        <div className="mt-0.5 shrink-0">{s.icon}</div>
        <p className={`text-[13px] font-medium ${s.text}`}>{s.label}</p>
      </div>
    );
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading verification status...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} className="text-primary" />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">NGO Verification</h2>
          <p className="text-sm text-slate-500">Submit your registration document to get a Verified badge.</p>
        </div>
        {isVerified && <div className="ml-auto"><VerifiedBadge size="md" /></div>}
      </div>

      <StatusBanner />

      {/* Already approved — nothing more to do */}
      {isVerified ? (
        <Card className="sleek-card text-center py-12 space-y-3">
          <ShieldCheck size={40} className="mx-auto text-emerald-500" />
          <p className="text-lg font-bold text-slate-900">Your NGO is Verified</p>
          <p className="text-sm text-slate-500">Your Verified badge is displayed on your profile and all opportunity listings.</p>
        </Card>
      ) : (
        <Card className="sleek-card space-y-5">
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-slate-900">Submit Verification Document</h3>
            <p className="text-[13px] text-slate-500">
              Upload your NGO registration certificate, government approval letter, or any official document proving your organization's legitimacy.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertCircle size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-blue-700">Accepted formats: PDF, JPG, PNG, WEBP · Max 10 MB</p>
          </div>

          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 py-10 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-slate-50 transition-all"
          >
            <FileText size={28} className="text-slate-300" />
            {file ? (
              <p className="text-[13px] font-semibold text-primary">{file.name}</p>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-slate-500">Click to select document</p>
                <p className="text-xs text-slate-400">PDF or image file</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />

          {uploading && (
            <div className="space-y-1">
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 text-right">{progress}%</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!file || uploading || verification?.status === 'pending'}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
          >
            {uploading
              ? <><Loader2 size={15} className="mr-2 animate-spin" /> Uploading…</>
              : verification?.status === 'pending'
              ? 'Submission Under Review'
              : <><Upload size={15} className="mr-2" /> Submit for Verification</>
            }
          </Button>

          {verification?.status === 'rejected' && (
            <p className="text-[12px] text-center text-slate-400">
              Your previous submission was rejected. Upload a new document to reapply.
            </p>
          )}
        </Card>
      )}

      {/* Previous submission info */}
      {verification && (
        <Card className="sleek-card space-y-2">
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Last Submission</p>
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-600">
              Submitted {new Date(verification.submittedAt).toLocaleDateString()}
            </p>
            <a
              href={verification.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-primary font-semibold hover:underline"
            >
              View Document ↗
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
