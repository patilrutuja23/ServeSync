import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MapPin, Mail, ArrowLeft } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { RatingDisplay, CompletedTasksBadge } from '../../lib/trust.tsx';

export default function VolunteerPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [volunteer, setVolunteer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    console.log('[PublicProfile] Fetching volunteer:', id);
    getDoc(doc(db, 'users', id))
      .then(snap => {
        if (snap.exists()) {
          setVolunteer({ id: snap.id, ...snap.data() });
          console.log('[PublicProfile] Loaded:', snap.data());
        }
      })
      .catch(err => console.error('[PublicProfile] Error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto py-20 text-center text-slate-400">Loading profile...</div>
  );

  if (!volunteer) return (
    <div className="max-w-2xl mx-auto py-20 text-center text-slate-400">
      <p className="text-lg font-bold text-slate-900 mb-2">Profile not found</p>
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} className="mr-2" /> Go back</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" className="text-slate-500 -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className="mr-2" /> Back
      </Button>

      <Card className="sleek-card p-0 overflow-hidden">
        <div className="h-28 bg-linear-to-r from-primary to-secondary opacity-90" />
        <div className="px-8 pb-8">
          <div className="flex items-end gap-6 -mt-12 mb-6">
            <div className="w-24 h-24 rounded-[20px] border-4 border-white shadow-xl overflow-hidden bg-slate-100 shrink-0">
              <UserAvatar src={volunteer.photoURL} alt={volunteer.displayName} className="w-full h-full rounded-none object-cover" />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900">{volunteer.displayName}</h1>
                <span className="role-badge">Volunteer</span>
                {volunteer.completedTasks > 0 && <CompletedTasksBadge count={volunteer.completedTasks} />}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm mt-1">
                {volunteer.email && <span className="flex items-center gap-1"><Mail size={13} /> {volunteer.email}</span>}
                {volunteer.location && <span className="flex items-center gap-1"><MapPin size={13} /> {volunteer.location}</span>}
                {volunteer.rating > 0 && <RatingDisplay rating={volunteer.rating} count={volunteer.ratingCount} />}
              </div>
            </div>
          </div>

          {volunteer.bio && (
            <div className="mb-6">
              <h3 className="section-title">About</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">{volunteer.bio}</p>
            </div>
          )}

          {volunteer.skills?.length > 0 && (
            <div className="mb-6">
              <h3 className="section-title">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {volunteer.skills.map((s: string) => (
                  <span key={s} className="bg-slate-50 text-slate-600 text-[13px] font-bold px-4 py-1.5 rounded-xl border border-slate-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          {volunteer.availability && (
            <div>
              <h3 className="section-title">Availability</h3>
              <p className="text-slate-500 text-[14px]">{volunteer.availability}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
