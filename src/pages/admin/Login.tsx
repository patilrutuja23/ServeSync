import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck, LogIn, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [busy, setBusy]         = useState(false);

  // If already logged in as admin, go straight to dashboard
  useEffect(() => {
    if (!loading && user && profile?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!snap.exists()) {
        await auth.signOut();
        toast.error('No account found for this email.');
        return;
      }

      const data = snap.data();
      if (data.role !== 'admin') {
        await auth.signOut();
        toast.error('Access denied — this account is not an admin.');
        return;
      }

      toast.success('Welcome, Admin!');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Incorrect email or password.'
          : err.code === 'auth/user-not-found'
          ? 'No account found for this email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-200 mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Access</h1>
          <p className="text-slate-500 text-sm mt-1">ServeSync AI — Restricted Area</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-sm font-semibold text-slate-700">
                Admin Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@servesync.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl border-slate-200 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-sm font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 rounded-xl border-slate-200 focus:ring-violet-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-200 transition-all active:scale-95 mt-2"
            >
              {busy
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Verifying…</>
                : <><LogIn size={16} className="mr-2" /> Sign In as Admin</>
              }
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[12px] text-slate-400">
              Not an admin?{' '}
              <a href="/login" className="text-primary font-semibold hover:underline">
                Go to regular login
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          🔒 This page is for authorized administrators only.
        </p>
      </div>
    </div>
  );
}
