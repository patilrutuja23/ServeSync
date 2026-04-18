import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ShieldCheck, Star } from 'lucide-react';

// ─── Firestore update functions ───────────────────────────────────────────────

/**
 * Recalculates and saves a new average rating for a user (volunteer or NGO).
 * Uses a running average: newAvg = (oldAvg * oldCount + newRating) / (oldCount + 1)
 */
async function updateRating(userId: string, newRating: number) {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const oldAvg: number = data.rating ?? 0;
  const oldCount: number = data.ratingCount ?? 0;
  const newCount = oldCount + 1;
  const newAvg = parseFloat(((oldAvg * oldCount + newRating) / newCount).toFixed(1));

  await updateDoc(ref, { rating: newAvg, ratingCount: newCount });
  console.log(`[Trust] Rating updated for ${userId}: ${newAvg} (${newCount} ratings)`);
}

/** Rate a volunteer after task completion */
export async function rateVolunteer(volunteerId: string, rating: number): Promise<void> {
  await updateRating(volunteerId, rating);
}

/** Rate an NGO after collaboration */
export async function rateNGO(ngoId: string, rating: number): Promise<void> {
  await updateRating(ngoId, rating);
}

/**
 * Marks a connection as completed and increments the volunteer's completedTasks.
 * Also sets the connection status to 'completed'.
 */
export async function completeTask(connectionId: string, volunteerId: string): Promise<void> {
  await updateDoc(doc(db, 'connections', connectionId), { status: 'completed' });
  await updateDoc(doc(db, 'users', volunteerId), { completedTasks: increment(1) });
  console.log(`[Trust] Task completed for volunteer ${volunteerId}`);
}

// ─── UI Components ────────────────────────────────────────────────────────────

/** Renders 5 interactive or display-only stars */
export function StarRating({
  value = 0,
  onChange,
  size = 16,
}: {
  value?: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default pointer-events-none'}
          aria-label={`${star} star`}
        >
          <Star
            size={size}
            className={star <= display ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}

/** Compact rating display: stars + numeric value */
export function RatingDisplay({ rating, count, size = 13 }: { rating?: number; count?: number; size?: number }) {
  const r = rating ?? 0;
  if (r === 0 && !count) return <span className="text-[11px] text-slate-300 italic">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <StarRating value={Math.round(r)} size={size} />
      <span className="text-[12px] font-bold text-slate-700">{r.toFixed(1)}</span>
      {count !== undefined && <span className="text-[11px] text-slate-400">({count})</span>}
    </span>
  );
}

/** Green verified badge for NGOs */
export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[12px] px-3 py-1'}`}>
      <ShieldCheck size={size === 'sm' ? 11 : 14} />
      Verified
    </span>
  );
}

/** Completed tasks pill */
export function CompletedTasksBadge({ count }: { count?: number }) {
  const n = count ?? 0;
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full">
      ✓ {n} task{n !== 1 ? 's' : ''} completed
    </span>
  );
}

/** Inline rate dialog — renders a star picker + confirm button */
export function RateDialog({
  label,
  onSubmit,
  onCancel,
}: {
  label: string;
  onSubmit: (rating: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSaving(true);
    await onSubmit(rating);
    setSaving(false);
  };

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
      <p className="text-[13px] font-semibold text-slate-700">{label}</p>
      <StarRating value={rating} onChange={setRating} size={22} />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 h-8 text-[12px] rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!rating || saving}
          className="flex-1 h-8 text-[12px] rounded-lg bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Saving...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
