import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { uploadFile, validateImage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { ImagePlus, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkProof {
  id: string;
  userId: string;
  role: 'volunteer' | 'ngo';
  imageUrl: string;
  caption: string;
  createdAt: string;
}

interface Props {
  /** If provided, shows another user's proofs (read-only) */
  targetUserId?: string;
  role: 'volunteer' | 'ngo';
}

export default function WorkProofGallery({ targetUserId, role }: Props) {
  const { user } = useAuth();
  const ownerId = targetUserId ?? user?.uid;
  const isOwner = !targetUserId || targetUserId === user?.uid;

  const [proofs, setProofs] = useState<WorkProof[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightbox, setLightbox] = useState<WorkProof | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ownerId) return;
    const q = query(
      collection(db, 'workProofs'),
      where('userId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      setLoading(false);
    }, (err) => {
      console.error('[WorkProof] snapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateImage(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);
    try {
      const path = `workProofs/${user.uid}/${Date.now()}_${file.name}`;
      const imageUrl = await uploadFile(file, path, setProgress);
      await addDoc(collection(db, 'workProofs'), {
        userId: user.uid,
        role,
        imageUrl,
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
      });
      toast.success('Work proof uploaded!');
      setFile(null);
      setPreview(null);
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      console.error('[WorkProof] upload error:', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (proof: WorkProof) => {
    if (!confirm('Delete this work proof?')) return;
    try {
      await deleteDoc(doc(db, 'workProofs', proof.id));
      toast.success('Deleted.');
    } catch (err) {
      toast.error('Failed to delete.');
    }
  };

  const cancelPreview = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Upload Panel — owner only */}
      {isOwner && (
        <div className="p-5 rounded-[16px] border border-dashed border-slate-200 bg-slate-50/50 space-y-4">
          {!preview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-8 text-slate-400 hover:text-primary transition-colors"
            >
              <ImagePlus size={32} />
              <span className="text-sm font-semibold">Click to upload a work photo</span>
              <span className="text-xs">JPG, PNG, WEBP · max 5 MB</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={cancelPreview}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Add a caption (optional)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={120}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {uploading && (
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
              >
                {uploading
                  ? <><Loader2 size={15} className="mr-2 animate-spin" /> Uploading {progress}%</>
                  : <><Upload size={15} className="mr-2" /> Upload Photo</>
                }
              </Button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-[12px]" />
          ))}
        </div>
      ) : proofs.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-[16px]">
          No work photos uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {proofs.map(proof => (
              <motion.div
                key={proof.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-square rounded-[12px] overflow-hidden bg-slate-100 cursor-pointer"
                onClick={() => setLightbox(proof)}
              >
                <img
                  src={proof.imageUrl}
                  alt={proof.caption || 'Work proof'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100">
                  {proof.caption && (
                    <p className="text-white text-[11px] font-semibold line-clamp-2 mb-1">{proof.caption}</p>
                  )}
                  <p className="text-white/70 text-[10px]">{new Date(proof.createdAt).toLocaleDateString()}</p>
                </div>
                {/* Delete button — owner only */}
                {isOwner && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(proof); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-2xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption}
                className="w-full rounded-2xl object-contain max-h-[80vh]"
              />
              {lightbox.caption && (
                <p className="text-white text-sm font-medium mt-3 text-center">{lightbox.caption}</p>
              )}
              <p className="text-white/50 text-xs text-center mt-1">
                {new Date(lightbox.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1.5 shadow-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
