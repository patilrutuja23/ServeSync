import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { 
  HandHeart, 
  LayoutDashboard, 
  Search, 
  User, 
  LogOut, 
  Bell,
  Menu,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import UserAvatar from './UserAvatar';
import NotificationBell from './NotificationBell';

import { useLocation } from 'react-router-dom';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="glass-effect border-b border-slate-100 sticky top-0 z-50 h-[72px] flex items-center shrink-0">
      <div className="container mx-auto px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-linear-to-br from-primary to-secondary rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            ServeSync<span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {user && profile?.role === 'volunteer' && (
            <>
              <Link to="/volunteer" className={`text-sm font-medium transition-colors ${location.pathname === '/volunteer' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Dashboard</Link>
              <Link to="/volunteer/opportunities" className={`text-sm font-medium transition-colors ${location.pathname === '/volunteer/opportunities' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Opportunities</Link>
              <Link to="/community" className={`text-sm font-medium transition-colors ${location.pathname === '/community' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Community</Link>
              <Link to="/impact" className={`text-sm font-medium transition-colors ${location.pathname === '/impact' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Impact</Link>
              <Link to="/volunteer/profile" className={`text-sm font-medium transition-colors ${location.pathname === '/volunteer/profile' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>My Profile</Link>
            </>
          )}
          {user && profile?.role === 'ngo' && (
            <>
              <Link to="/ngo" className={`text-sm font-medium transition-colors ${location.pathname === '/ngo' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Dashboard</Link>
              <Link to="/ngo/search" className={`text-sm font-medium transition-colors ${location.pathname === '/ngo/search' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Find Volunteers</Link>
              <Link to="/community" className={`text-sm font-medium transition-colors ${location.pathname === '/community' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Community</Link>
              <Link to="/impact" className={`text-sm font-medium transition-colors ${location.pathname === '/impact' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Impact</Link>
              <Link to="/ngo/invites" className={`text-sm font-medium transition-colors ${location.pathname === '/ngo/invites' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Sent Invites</Link>
              <Link to="/ngo/verification" className={`text-sm font-medium transition-colors ${location.pathname === '/ngo/verification' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>Verification</Link>
              <Link to="/ngo/profile" className={`text-sm font-medium transition-colors ${location.pathname === '/ngo/profile' ? 'text-primary border-b-2 border-primary pb-[24px] -mb-[24px]' : 'text-slate-500 hover:text-slate-900'}`}>NGO Profile</Link>
            </>
          )}
          {!user && (
            <>
              <Link to="/#features" className="text-sm font-medium text-slate-500 hover:text-slate-900">Features</Link>
              <Link to="/#impact" className="text-sm font-medium text-slate-500 hover:text-slate-900">Impact</Link>
              <Link to="/admin-login" className="text-sm font-medium text-slate-500 hover:text-violet-700 transition-colors">Admin</Link>
            </>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {deferredPrompt && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleInstall}
              className="hidden lg:flex border-primary/20 text-primary hover:bg-primary/5 rounded-lg"
            >
              Install App
            </Button>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="role-badge hidden sm:inline-block">
                {profile?.role === 'volunteer' ? 'Volunteer Role' : 'NGO Partner'}
              </span>
              <Link to="/chat" className="relative w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors" title="Messages">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </Link>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-10 w-10 rounded-full p-0 border border-slate-200 bg-transparent hover:bg-transparent focus:outline-none overflow-hidden">
                  <UserAvatar src={profile?.photoURL} alt={profile?.displayName} className="w-full h-full rounded-full" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-slate-500">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(profile?.role === 'volunteer' ? '/volunteer/profile' : '/ngo/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(profile?.role === 'volunteer' ? '/volunteer' : '/ngo')}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">Log in</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg px-5">Get Started</Button>
              </Link>
            </div>
          )}
          
          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-slate-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>
    </header>
  );
}
