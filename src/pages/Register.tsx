import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from 'sonner';
import { UserPlus, Chrome, Users, Building2 } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'volunteer' | 'ngo') || 'volunteer';
  
  const [role, setRole] = useState<'volunteer' | 'ngo'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        role: role,
        createdAt: new Date().toISOString(),
        skills: [],
        location: '',
        bio: '',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
      });
      
      toast.success('Account created successfully!');
      navigate(role === 'volunteer' ? '/volunteer' : '/ngo');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          role: role,
          createdAt: new Date().toISOString(),
          skills: [],
          location: '',
          bio: '',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
        });
        toast.success('Account created with Google!');
      } else {
        toast.info('Account already exists. Logging you in.');
      }
      
      const updatedSnap = await getDoc(docRef);
      const profile = updatedSnap.data();
      navigate(profile?.role === 'volunteer' ? '/volunteer' : '/ngo');
    } catch (error: any) {
      toast.error(error.message || 'Google registration failed');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] py-10">
      <Card className="w-full max-w-md sleek-card border-0 shadow-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-8">
          <CardTitle className="text-3xl font-extrabold text-center tracking-tight text-slate-900">Create Account</CardTitle>
          <CardDescription className="text-center text-slate-500">
            Join the community and start making an impact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue={role} onValueChange={(v) => setRole(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-50 rounded-xl h-14 border border-slate-100">
              <TabsTrigger value="volunteer" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex gap-2 font-bold text-[13px]">
                <Users size={16} /> Volunteer
              </TabsTrigger>
              <TabsTrigger value="ngo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-secondary data-[state=active]:shadow-sm flex gap-2 font-bold text-[13px]">
                <Building2 size={16} /> NGO
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name / Organization Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe / Hope Foundation" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required 
                className="rounded-xl h-12 border-slate-200 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="rounded-xl h-12 border-slate-200 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="rounded-xl h-12 border-slate-200 focus:ring-primary"
              />
            </div>
            <Button type="submit" className={`w-full h-12 rounded-xl font-bold shadow-lg text-white ${role === 'volunteer' ? 'bg-primary hover:bg-primary/90 shadow-primary/20' : 'bg-secondary hover:bg-secondary/90 shadow-secondary/20'}`} disabled={loading}>
              {loading ? 'Creating account...' : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up as {role === 'volunteer' ? 'Volunteer' : 'NGO'}
                </>
              )}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-white px-4 text-slate-400">Or continue with</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50" onClick={handleGoogleRegister}>
            <Chrome className="mr-2 h-4 w-4" /> Google
          </Button>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-6">
          <p className="text-center text-sm text-slate-500 w-full">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
