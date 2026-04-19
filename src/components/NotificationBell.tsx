import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'post' | 'invite' | 'verification' | 'general';
  message: string;
  read: boolean;
  createdAt: any;
  link?: string;
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

const TYPE_ICON: Record<string, string> = {
  match: '🎯', message: '💬', post: '📝',
  invite: '📩', verification: '✅', general: '🔔',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Real-time notifications listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    }, (err) => console.error('[Notifications]', err));
    return unsub;
  }, [user]);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadItems = notifications.filter(n => !n.read);
    if (!unreadItems.length) return;
    const batch = writeBatch(db);
    unreadItems.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">
                Notifications {unread > 0 && <span className="text-primary">({unread})</span>}
              </span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-primary font-semibold hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No notifications yet</div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
