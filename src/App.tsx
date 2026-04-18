import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import ChatAssistant from './components/ChatAssistant';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VolunteerDashboard from './pages/volunteer/Dashboard';
import VolunteerOpportunities from './pages/volunteer/Opportunities';
import VolunteerProfile from './pages/volunteer/Profile';
import VolunteerPublicProfile from './pages/volunteer/PublicProfile';
import NGODashboard from './pages/ngo/Dashboard';
import NGOSearchVolunteers from './pages/ngo/SearchVolunteers';
import NGOSentInvites from './pages/ngo/SentInvites';
import NGOProfile from './pages/ngo/Profile';
import NGOVerification from './pages/ngo/Verification';
import NGOBlog from './pages/ngo/Blog';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'volunteer' | 'ngo' }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Volunteer Routes */}
          <Route path="/volunteer" element={
            <ProtectedRoute role="volunteer">
              <VolunteerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/volunteer/opportunities" element={
            <ProtectedRoute role="volunteer">
              <VolunteerOpportunities />
            </ProtectedRoute>
          } />
          <Route path="/volunteer/profile" element={
            <ProtectedRoute role="volunteer">
              <VolunteerProfile />
            </ProtectedRoute>
          } />
          <Route path="/volunteer/:id" element={<VolunteerPublicProfile />} />

          {/* NGO Routes */}
          <Route path="/ngo" element={
            <ProtectedRoute role="ngo">
              <NGODashboard />
            </ProtectedRoute>
          } />
          <Route path="/ngo/search" element={
            <ProtectedRoute role="ngo">
              <NGOSearchVolunteers />
            </ProtectedRoute>
          } />
          <Route path="/ngo/invites" element={
            <ProtectedRoute role="ngo">
              <NGOSentInvites />
            </ProtectedRoute>
          } />
          <Route path="/ngo/profile" element={
            <ProtectedRoute role="ngo">
              <NGOProfile />
            </ProtectedRoute>
          } />
          <Route path="/ngo/verification" element={
            <ProtectedRoute role="ngo">
              <NGOVerification />
            </ProtectedRoute>
          } />
          <Route path="/ngo/blog" element={
            <ProtectedRoute role="ngo">
              <NGOBlog />
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster />
      <ChatAssistant />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
