import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { ImagePlus, Send, X, Sparkles, Loader2 } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

type Tone = 'inspirational' | 'professional' | 'casual';

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: 'inspirational', label: 'Inspirational', emoji: '🌟' },
  { value: 'professional',  label: 'Professional',  emoji: '💼' },
  { value: 'casual',        label: 'Casual',        emoji: '😊' },
];

async function generateCaptions(
  title: string,
  hint: string,
  role: string,
  tone: Tone
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!apiKey) throw new Error('No VITE_GEMINI_API_KEY set.');

  const context = [title && `Title: ${title}`, hint && `Context: ${hint}`].filter(Boolean).join('\n');
  if (!context) throw new Error('empty');

  const prompt = `You are a social media caption writer for a volunteer/NGO platform called ServeSync.
Generate exactly 3 short, distinct captions for a ${role} post.
Tone: ${tone}.
Add relevant emojis. Each caption max 2 sentences.
${context}

Return ONLY a JSON array of 3 strings, no extra text. Example:
["Caption one here.", "Caption two here.", "Caption three here."]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Bad response format');
  return JSON.parse(match[0]) as string[];
}

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const { user, profile } = useAuth();
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  // AI caption state
  const [tone, setTone]             = useState<Tone>('inspirational');
  const [loadingAI, setLoadingAI]   = useState(false);
  const [captions, setCaptions]     = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const reset = () => {
    setTitle(''); setContent('');
    setImageFile(null); setImagePreview(null);
    setCaptions([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  const handleGenerateCaptions = async () => {
    if (!title.trim() && !content.trim()) {
      toast.warning('Write a title or some content first so AI has context ✨');
      return;
    }
    setLoadingAI(true);
    setCaptions([]);
    console.log('[CaptionAI] Generating captions, tone:', tone);
    try {
      const results = await generateCaptions(title, content, profile?.role ?? 'volunteer', tone);
      setCaptions(results);
      console.log('[CaptionAI] Generated:', results);
    } catch (err: any) {
      if (err.message === 'empty') {
        toast.warning('Add a title or content first so AI has context ✨');
      } else if (err.message?.includes('VITE_GEMINI')) {
        toast.error('Gemini API key not set in .env.local');
      } else {
        console.error('[CaptionAI] Error:', err);
        toast.error('AI caption generation failed. Try again.');
      }
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!content.trim()) { toast.error('Content is required.'); return; }

    setLoading(true);
    console.log('[CreatePost] Submitting post...');
    try {
      let imageUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `posts/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
        console.log('[CreatePost] Image uploaded:', imageUrl);
      }

      await addDoc(collection(db, 'posts'), {
        userId:   user.uid,
        userName: profile.displayName || user.email || 'User',
        userRole: profile.role,
        userPhoto: profile.photoURL || '',
        title:    title.trim(),
        content:  content.trim(),
        imageUrl,
        createdAt: serverTimestamp(),
      });

      console.log('[CreatePost] Post saved successfully');
      toast.success('Post shared with the community!');
      handleClose();
    } catch (err) {
      console.error('[CreatePost] Error:', err);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[540px] rounded-3xl border border-slate-200 bg-white shadow-2xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-bold">Share with Community</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Author row */}
            <div className="flex items-center gap-3">
              <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-bold text-slate-900">{profile?.displayName}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profile?.role === 'ngo' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                  {profile?.role === 'ngo' ? 'NGO' : 'Volunteer'}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">Title (optional)</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give your post a title..."
                className="rounded-xl border-slate-200"
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700">What's on your mind? *</Label>
              <textarea
                value={content}
                onChange={e => { setContent(e.target.value); if (captions.length) setCaptions([]); }}
                placeholder="Describe your activity or let AI help you ✨"
                className="w-full h-32 resize-none overflow-y-auto rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* ── AI Caption Generator ── */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[13px] font-bold text-violet-700 flex items-center gap-1.5">
                  <Sparkles size={14} /> AI Caption Generator
                </span>
                {/* Tone selector */}
                <div className="flex gap-1">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setTone(t.value); setCaptions([]); }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        tone === t.value
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={loadingAI}
                className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loadingAI
                  ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  : <><Sparkles size={14} /> Generate 3 Captions</>
                }
              </button>

              {/* Caption options */}
              {captions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tap to use</p>
                  {captions.map((cap, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setContent(cap); setCaptions([]); toast.success('Caption applied!'); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-violet-200 bg-white hover:border-violet-400 hover:bg-violet-50 text-[13px] text-slate-700 leading-relaxed transition-all"
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-400 hover:border-primary/40 hover:text-primary transition-colors text-sm font-medium"
                >
                  <ImagePlus size={18} /> Add Photo
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-slate-200" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
              >
                {loading ? 'Posting...' : <><Send size={15} className="mr-2" /> Post</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
