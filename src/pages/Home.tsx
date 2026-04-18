import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { HandHeart, Users, Building2, Sparkles, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-8 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold tracking-wide uppercase"
            >
              <Sparkles size={16} /> ServeSync AI Powered platform
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]"
            >
              Connecting Passion with <span className="text-primary">Purpose</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto"
            >
              ServeSync AI uses intelligent matching to connect volunteers with NGOs based on skills, impact, and availability.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link to="/register">
                <Button className="h-14 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  Start Volunteering
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="h-14 px-10 border-slate-200 text-slate-600 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all">
                  NGO Partnership
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Volunteers', value: '10k+' },
              { label: 'NGO Partners', value: '500+' },
              { label: 'Hours Contributed', value: '1.2M' },
              { label: 'Impact Created', value: '$25M+' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-2"
              >
                <div className="text-4xl font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32">
        <div className="container mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Intelligent Impact</h2>
            <p className="text-slate-500 text-lg">Our platform is designed to make volunteering more effective and rewarding for everyone.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'AI Matching',
                desc: 'Our Gemini-powered engine analyzes skills and needs to find the perfect fit.',
                icon: <Sparkles className="text-primary" size={24} />,
                color: 'bg-primary/10'
              },
              {
                title: 'Real-time Sync',
                desc: 'Instant notifications and live updates for seamless collaboration.',
                icon: <Clock className="text-secondary" size={24} />,
                color: 'bg-secondary/10'
              },
              {
                title: 'Impact Tracking',
                desc: 'Visualize your contribution and the value you bring to NGOs.',
                icon: <TrendingUp className="text-emerald-600" size={24} />,
                color: 'bg-emerald-50'
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="sleek-card group"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-slate-50">
        <div className="container mx-auto px-8 text-center text-slate-400 text-sm">
          <p>© 2026 ServeSync AI. Empowering communities through technology.</p>
        </div>
      </footer>
    </div>
  );
}
