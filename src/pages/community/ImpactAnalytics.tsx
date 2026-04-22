import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card } from '../../components/ui/card';
import { calculateImpactScore } from '../../lib/aiFeatures';
import { Users, CheckCircle2, FileText, Building2, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface Metrics {
  totalVolunteers: number;
  activeNGOs: number;
  tasksCompleted: number;
  postsCreated: number;
  impactScore: number;
}

const STAT_CARDS = (m: Metrics) => [
  { label: 'Volunteers',       value: m.totalVolunteers, icon: Users,         color: 'text-primary',   bg: 'bg-primary/10'   },
  { label: 'NGO Partners',     value: m.activeNGOs,      icon: Building2,     color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Tasks Completed',  value: m.tasksCompleted,  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Community Posts',  value: m.postsCreated,    icon: FileText,      color: 'text-violet-600', bg: 'bg-violet-50'   },
];

export default function ImpactAnalytics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use onSnapshot counts — no composite index required unlike getCountFromServer
    const unsubs: (() => void)[] = [];
    const counts = { volunteers: 0, ngos: 0, tasks: 0, posts: 0, ready: 0 };

    const trySet = () => {
      counts.ready++;
      if (counts.ready < 4) return;
      const m = {
        totalVolunteers: counts.volunteers,
        activeNGOs:      counts.ngos,
        tasksCompleted:  counts.tasks,
        postsCreated:    counts.posts,
        impactScore:     0,
      };
      m.impactScore = calculateImpactScore(m);
      console.log('[ImpactAnalytics] Metrics:', m);
      setMetrics(m);
      setLoading(false);
    };

    unsubs.push(onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'volunteer')),
      s => { counts.volunteers = s.size; trySet(); },
      e => { console.error('[ImpactAnalytics] volunteers:', e.code); setLoading(false); }
    ));
    unsubs.push(onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'ngo')),
      s => { counts.ngos = s.size; trySet(); },
      e => { console.error('[ImpactAnalytics] ngos:', e.code); setLoading(false); }
    ));
    unsubs.push(onSnapshot(
      query(collection(db, 'connections'), where('status', '==', 'completed')),
      s => { counts.tasks = s.size; trySet(); },
      e => { console.error('[ImpactAnalytics] tasks:', e.code); setLoading(false); }
    ));
    unsubs.push(onSnapshot(
      collection(db, 'posts'),
      s => { counts.posts = s.size; trySet(); },
      e => { console.error('[ImpactAnalytics] posts:', e.code); setLoading(false); }
    ));

    return () => unsubs.forEach(u => u());
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Impact Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time community impact metrics powered by ServeSync.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : metrics ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STAT_CARDS(metrics).map(({ label, value, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="sleek-card text-center space-y-3 py-6">
                  <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mx-auto`}>
                    <Icon size={22} className={color} />
                  </div>
                  <div className={`text-3xl font-extrabold ${color}`}>{value.toLocaleString()}</div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Impact Score */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="sleek-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                    <Zap size={22} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Community Impact Score</h3>
                    <p className="text-[12px] text-slate-400">Based on volunteers, tasks, posts and NGO activity</p>
                  </div>
                </div>
                <span className="text-4xl font-extrabold text-amber-500">{metrics.impactScore}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.impactScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0</span>
                <span className="font-bold text-amber-500">{metrics.impactScore} / 100</span>
                <span>100</span>
              </div>
            </Card>
          </motion.div>

          {/* Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="sleek-card">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Score Breakdown</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Volunteer base',   pts: Math.min(metrics.totalVolunteers / 2, 30),  max: 30,  color: 'bg-primary' },
                  { label: 'Tasks completed',  pts: Math.min(metrics.tasksCompleted * 2, 40),   max: 40,  color: 'bg-emerald-500' },
                  { label: 'Community posts',  pts: Math.min(metrics.postsCreated / 2, 15),     max: 15,  color: 'bg-violet-500' },
                  { label: 'NGO partners',     pts: Math.min(metrics.activeNGOs * 3, 15),       max: 15,  color: 'bg-secondary' },
                ].map(({ label, pts, max, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500 font-medium">{label}</span>
                      <span className="font-bold text-slate-700">{Math.round(pts)} / {max} pts</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(pts / max) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </>
      ) : (
        <div className="py-20 text-center text-slate-400">Failed to load metrics.</div>
      )}
    </div>
  );
}
