import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'volunteer' | 'ngo' | 'admin';
  skills?: string[];
  location?: string;
  availability?: string;
  bio?: string;
  organizationName?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Safety timeout — if Firebase auth doesn't respond in 8s, unblock the UI
    const timeout = setTimeout(() => {
      console.warn('[Auth] Timeout — unblocking UI');
      setLoading(false);
      setIsAuthReady(true);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        } catch (err) {
          console.error('[Auth] Failed to fetch profile:', err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
      setIsAuthReady(true);
    }, (err) => {
      clearTimeout(timeout);
      console.error('[Auth] onAuthStateChanged error:', err);
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch (err) {
      console.error('[Auth] refreshProfile error:', err);
    }
  };

  const signOut = () => auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
