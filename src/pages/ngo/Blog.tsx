import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { uploadFile, validateImage } from '../../lib/storage';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ImagePlus, Loader2, Upload, X, Calendar, Building2, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../../lib/trust.tsx';

interface Post {
  id: string;
  ngoId: string;
  ngoName: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

export default function NGOBlog() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'),
      where('ngoId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      setLoading(false);
    }, (err) => {
      console.error('[Blog] snapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateImage(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!user || !profile || !title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const path = `posts/${user.uid}/${Date.now()}_${file.name}`;
        imageUrl = await uploadFile(file, path, setProgress);
      }
      await addDoc(collection(db, 'posts'), {
        ngoId: user.uid,
        ngoName: profile.displayName || profile.organizationName || 'NGO',
        title: title.trim(),
        description: description.trim(),
        ...(imageUrl ? { imageUrl } : {}),
        createdAt: new Date().toISOString(),
      });
      toast.success('Post published!');
      resetForm();
      setIsOpen(false);
    } catch (err) {
      console.error('[Blog] create error:', err);
      toast.error('Failed to publish post.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete post.');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Newspaper size={24} className="text-primary" />
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Activity Posts</h1>
            <p className="text-slate-500">Share updates, stories, and impact with the community.</p>
          </div>
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-6 shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2" size={18} /> Create Post
        </Button>
      </header>

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-64 bg-slate-50 animate-pulse rounded-[16px]" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[16px] border border-dashed border-slate-200">
          <Newspaper size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No posts yet. Share your first update!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {posts.map(post => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <Card className="sleek-card overflow-hidden">
                  {post.imageUrl && (
                    <div className="w-full aspect-video overflow-hidden rounded-xl mb-5 bg-slate-100">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[12px] font-bold text-secondary">
                          <Building2 size={13} /> {post.ngoName}
                        </span>
                        {(profile as any)?.isVerified && <VerifiedBadge />}
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
                          <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{post.title}</h3>
                      <p className="text-[14px] text-slate-500 leading-relaxed whitespace-pre-line">{post.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-lg shrink-0"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Post Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { resetForm(); } setIsOpen(o); }}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Activity Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Beach Cleanup Drive — June 2025"
                className="rounded-xl border-slate-200"
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Description *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Share what happened, the impact made, and who was involved..."
                className="rounded-xl border-slate-200 min-h-[120px] resize-none"
                maxLength={1000}
              />
              <p className="text-[11px] text-slate-400 text-right">{description.length}/1000</p>
            </div>

            {/* Image upload */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Cover Image (optional)</Label>
              {!preview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-slate-50 transition-all"
                >
                  <ImagePlus size={22} className="text-slate-300" />
                  <p className="text-[12px] text-slate-400">Click to add a cover image</p>
                </div>
              ) : (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 text-right">{progress}%</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-slate-200" onClick={() => { resetForm(); setIsOpen(false); }}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={uploading || !title.trim() || !description.trim()}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
              >
                {uploading
                  ? <><Loader2 size={14} className="mr-2 animate-spin" /> Publishing…</>
                  : <><Upload size={14} className="mr-2" /> Publish Post</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
