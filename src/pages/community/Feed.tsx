import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { PenSquare, Rocket } from 'lucide-react';
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

export default function CommunityFeed() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any })) as Post[];
      console.log('[CommunityFeed] Posts loaded:', data.length);
      setPosts(data);
      setLoading(false);
    }, (err) => {
      console.error('[CommunityFeed] Error:', err);
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
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="sleek-card space-y-4">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <UserAvatar src={post.userPhoto} alt={post.userName} className="w-11 h-11 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-900 truncate">{post.userName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        post.userRole === 'ngo'
                          ? 'bg-secondary/10 text-secondary'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {post.userRole === 'ngo' ? 'NGO' : 'Volunteer'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Title */}
                {post.title && (
                  <h3 className="text-[16px] font-bold text-slate-900 leading-snug">{post.title}</h3>
                )}

                {/* Content — scrollable if long */}
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
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
