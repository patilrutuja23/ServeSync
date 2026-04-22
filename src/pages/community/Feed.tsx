import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { PenSquare, Rocket, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserAvatar from '../../components/UserAvatar';
import CreatePostModal from '../../components/CreatePostModal';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userRole: 'ngo' | 'volunteer';
  userPhoto: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: any;
  likes: string[];       // array of userIds
  commentCount: number;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
}

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

// ─── Comment Section ──────────────────────────────────────────────────────────
function CommentSection({ post }: { post: Post }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'post_comments'),
      where('postId', '==', post.id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    }, err => console.error('[Comments]', err));
    return unsub;
  }, [post.id]);

  const handleSend = async () => {
    if (!text.trim() || !user || !profile || sending) return;
    setSending(true);
    const commentText = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'post_comments'), {
        postId: post.id,
        userId: user.uid,
        userName: profile.displayName || user.email || 'User',
        userPhoto: profile.photoURL || '',
        text: commentText,
        createdAt: serverTimestamp(),
      });
      // Update commentCount on post
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: (post.commentCount ?? 0) + 1,
      });
    } catch (err) {
      console.error('[Comment send]', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'post_comments', commentId));
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: Math.max(0, (post.commentCount ?? 1) - 1),
      });
    } catch (err) {
      console.error('[Comment delete]', err);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 group">
              <UserAvatar src={c.userPhoto} alt={c.userName} className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-slate-900">{c.userName}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                    {user?.uid === c.userId && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 leading-snug mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {user && (
        <div className="flex items-center gap-2">
          <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-7 h-7 rounded-full shrink-0" />
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-1.5">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Write a comment..."
              className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="text-primary disabled:opacity-30 hover:text-primary/80 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);

  const liked = user ? (post.likes ?? []).includes(user.uid) : false;
  const likeCount = (post.likes ?? []).length;

  const handleLike = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      console.error('[Like]', err);
    }
  };

  return (
    <Card className="sleek-card space-y-4">
      {/* Author */}
      <div className="flex items-center gap-3">
        <UserAvatar src={post.userPhoto} alt={post.userName} className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-slate-900 truncate">{post.userName}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              post.userRole === 'ngo' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
            }`}>
              {post.userRole === 'ngo' ? 'NGO' : 'Volunteer'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      {/* Title */}
      {post.title && <h3 className="text-[16px] font-bold text-slate-900 leading-snug">{post.title}</h3>}

      {/* Content */}
      <p className="text-[14px] text-slate-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Image */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-100">
          <img
            src={post.imageUrl}
            alt="post"
            className="w-full max-h-80 object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Like + Comment bar */}
      <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
            liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'
          }`}
        >
          <Heart size={16} className={liked ? 'fill-red-500' : ''} />
          {likeCount > 0 && <span>{likeCount}</span>}
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>

        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors"
        >
          <MessageCircle size={16} />
          {(post.commentCount ?? 0) > 0 && <span>{post.commentCount}</span>}
          <span>Comment</span>
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CommentSection post={post} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function CommunityFeed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, likes: [], commentCount: 0, ...d.data() as any }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)) as Post[];
      console.log('[CommunityFeed] Posts loaded:', data.length);
      setPosts(data);
      setLoading(false);
    }, (err) => {
      console.error('[CommunityFeed] Error:', err.code, err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Community Feed</h1>
          <p className="text-slate-500 text-sm mt-1">Stories, updates and impact from the ServeSync community.</p>
        </div>
        {user && (
          <Button
            className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-5 font-bold shadow-lg shadow-primary/20"
            onClick={() => setCreateOpen(true)}
          >
            <PenSquare size={16} className="mr-2" /> Create Post
          </Button>
        )}
      </div>

      {/* Quick post bar */}
      {user && (
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all text-left"
        >
          <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-10 h-10 rounded-full shrink-0" />
          <span className="text-slate-400 text-[14px]">Share something with the community...</span>
          <span className="ml-auto text-primary font-bold text-sm shrink-0">Post</span>
        </button>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Rocket className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-lg font-bold text-slate-900 mb-1">No posts yet</p>
          <p className="text-slate-400 text-sm">Be the first to share your impact 🚀</p>
          {user && (
            <Button className="mt-6 bg-primary hover:bg-primary/90 text-white rounded-xl" onClick={() => setCreateOpen(true)}>
              Create First Post
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {posts.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
