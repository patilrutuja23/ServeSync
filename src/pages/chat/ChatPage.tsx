import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, setDoc, getDoc,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Send, MessageCircle, Search } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { sendNotification } from '../../lib/notifications';

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage: string;
  updatedAt: any;
}

interface Message {
  id: string;
  senderId: string;
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

// ─── Message Panel ────────────────────────────────────────────────────────────
function MessagePanel({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherId = chat.participants.find(p => p !== user?.uid) ?? '';
  const otherName = chat.participantNames[otherId] ?? 'User';
  const otherPhoto = chat.participantPhotos[otherId] ?? '';

  // Real-time messages
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
    }, err => console.error('[Chat messages]', err));
    return unsub;
  }, [chat.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: user.uid,
        text: msgText,
        createdAt: serverTimestamp(),
      });
      // Update chat metadata
      await setDoc(doc(db, 'chats', chat.id), {
        lastMessage: msgText,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      // Notify the other participant
      await sendNotification(otherId, 'message',
        `${profile?.displayName ?? 'Someone'} sent you a message: "${msgText.slice(0, 40)}${msgText.length > 40 ? '…' : ''}"`,
        '/chat'
      );
    } catch (err) {
      console.error('[Chat send]', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <button onClick={onBack} className="md:hidden text-slate-400 hover:text-slate-700 mr-1">←</button>
        <UserAvatar src={otherPhoto} alt={otherName} className="w-9 h-9 rounded-full" />
        <div>
          <p className="text-sm font-bold text-slate-900">{otherName}</p>
          <p className="text-[11px] text-emerald-500 font-medium">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-12">
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                isMine
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border-slate-200 h-11"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-11 w-11 p-0 bg-primary hover:bg-primary/90 text-white rounded-xl shrink-0"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Real-time chats list
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      setLoading(false);
    }, err => { console.error('[Chats list]', err); setLoading(false); });
    return unsub;
  }, [user]);

  // Fetch all users for new chat
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        .filter(u => u.uid && u.uid !== user.uid && u.displayName)
      );
    });
    return unsub;
  }, [user]);

  const startChat = async (otherUser: any) => {
    if (!user || !profile) return;
    // Check if chat already exists
    const existing = chats.find(c => c.participants.includes(otherUser.uid));
    if (existing) { setSelectedChat(existing); return; }

    // Create new chat
    const chatRef = doc(collection(db, 'chats'));
    const chatData: Omit<Chat, 'id'> = {
      participants: [user.uid, otherUser.uid],
      participantNames: {
        [user.uid]: profile.displayName || user.email || 'Me',
        [otherUser.uid]: otherUser.displayName,
      },
      participantPhotos: {
        [user.uid]: profile.photoURL || '',
        [otherUser.uid]: otherUser.photoURL || '',
      },
      lastMessage: '',
      updatedAt: serverTimestamp() as any,
    };
    await setDoc(chatRef, chatData);
    setSelectedChat({ id: chatRef.id, ...chatData });
    setSearch('');
  };

  const filteredUsers = allUsers.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const getChatOther = (chat: Chat) => {
    const otherId = chat.participants.find(p => p !== user?.uid) ?? '';
    return {
      name: chat.participantNames?.[otherId] ?? 'User',
      photo: chat.participantPhotos?.[otherId] ?? '',
    };
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">Messages</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex h-full">
          {/* Left: Chat list */}
          <div className={`w-full md:w-72 border-r border-slate-100 flex flex-col shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Search / new chat */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search or start new chat..."
                  className="pl-9 h-9 rounded-xl border-slate-200 text-[13px]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* User search results for new chat */}
              {search && (
                <div className="border-b border-slate-100">
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start new chat</p>
                  {filteredUsers.length === 0
                    ? <p className="px-4 py-3 text-[13px] text-slate-400">No users found</p>
                    : filteredUsers.slice(0, 5).map(u => (
                      <button key={u.id} onClick={() => startChat(u)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <UserAvatar src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate">{u.displayName}</p>
                          <p className="text-[11px] text-slate-400 capitalize">{u.role}</p>
                        </div>
                      </button>
                    ))
                  }
                </div>
              )}

              {/* Existing chats */}
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />)}
                </div>
              ) : chats.length === 0 && !search ? (
                <div className="py-16 text-center text-slate-400 text-sm px-4">
                  <MessageCircle className="mx-auto mb-3 text-slate-200" size={36} />
                  Search for a user above to start chatting
                </div>
              ) : (
                chats.map(chat => {
                  const other = getChatOther(chat);
                  return (
                    <button key={chat.id} onClick={() => setSelectedChat(chat)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-primary/5 border-r-2 border-primary' : ''}`}>
                      <UserAvatar src={other.photo} alt={other.name} className="w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{other.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                      <p className="text-[10px] text-slate-300 shrink-0">{timeAgo(chat.updatedAt)}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Message panel */}
          <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedChat ? (
              <MessagePanel chat={selectedChat} onBack={() => setSelectedChat(null)} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-slate-400 p-8">
                <div>
                  <MessageCircle className="mx-auto mb-4 text-slate-200" size={48} />
                  <p className="font-bold text-slate-900 mb-1">Select a conversation</p>
                  <p className="text-sm">Choose from your chats or search for someone new</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
