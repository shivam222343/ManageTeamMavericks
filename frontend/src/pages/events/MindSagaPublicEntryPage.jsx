import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  Key,
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import './MindSagaTheme.css';

const MindSagaPublicEntryPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth ? useAuth() : { login: () => {} };
  const { theme, toggleTheme } = useTheme ? useTheme() : { theme: 'dark', toggleTheme: () => {} };
  const isDark = theme === 'dark';

  const [accessKey, setAccessKey] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(null);
  const [checkingInfo, setCheckingInfo] = useState(false);
  const [pollingStatus, setPollingStatus] = useState('locked');

  // Fetch Public Platform Info & Live/Locked Status
  const fetchPublicInfo = async () => {
    if (!subEventId) return;
    try {
      setCheckingInfo(true);
      const res = await axios.get(`/mindsaga/public/${subEventId}`);
      setPlatformInfo(res.data);
      setPollingStatus(res.data.platform_status || 'locked');
    } catch (err) {
      console.warn('Public info fetch error:', err);
    } finally {
      setCheckingInfo(false);
    }
  };

  useEffect(() => {
    fetchPublicInfo();
    // 5-second heartbeat poll for live/locked state change
    const interval = setInterval(fetchPublicInfo, 5000);
    return () => clearInterval(interval);
  }, [subEventId]);

  const handleKeyLogin = async (e) => {
    e.preventDefault();
    if (!accessKey.trim() && !email.trim()) {
      toast.error('Please enter your Mind Saga Access Key or registered email.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/mindsaga/auth/login-with-key', {
        access_key: accessKey.trim(),
        email: email.trim()
      });

      const data = res.data;
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.candidate));
      }

      if (!data.is_live && data.platform_status === 'locked') {
        toast.error('Mind Saga platform is currently LOCKED by the admin. Please wait for the admin to start the round.', {
          icon: '🔒',
          duration: 5000
        });
        setPollingStatus('locked');
        return;
      }

      toast.success(`Welcome, ${data.candidate?.full_name}! Entering Mind Saga...`, {
        icon: '🚀'
      });

      const eId = data.candidate?.event_id || eventId || 1;
      const sId = data.candidate?.sub_event_id || subEventId || 1;
      navigate(`/events/${eId}/sub-events/${sId}/mind-saga`);
    } catch (err) {
      console.error('Key login failed:', err);
      toast.error(err.response?.data?.error || 'Invalid Access Key. Check your dashboard or email.');
    } finally {
      setLoading(false);
    }
  };

  const isLive = pollingStatus === 'live';

  return (
    <div className="mindsaga-space-bg min-h-screen flex flex-col justify-between selection:bg-indigo-500/30 relative">
      {/* Background Shooting Stars */}
      <div className="mindsaga-bg-stars" aria-hidden="true">
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
      </div>

      {/* Top Bar with Micro Telemetry & Theme Toggle */}
      <header className="relative z-10 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/40 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-none bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/25">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-wider uppercase font-mono">Team Mavericks</h1>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Mind Saga Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition flex items-center justify-center cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <span className="mindsaga-hud-badge">
            <span className={isLive ? 'mindsaga-radar-dot' : 'w-2 h-2 rounded-none bg-amber-400'} />
            <span>PORTAL: {isLive ? 'LIVE' : 'STANDBY'}</span>
          </span>
          <span className="hidden sm:inline-flex mindsaga-hud-badge border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400">
            [ SECURE GATE ]
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-[425px]"
        >
          {/* Uiverse Retro Space Form with 0 Curved Corners */}
          <form className="mindsaga-space-form" onSubmit={handleKeyLogin}>
            {/* Header Titles */}
            <div className="form-title">
              <span>access key</span>
            </div>
            <div className="title-2">
              <span>MINDSAGA</span>
            </div>

            {/* Inner Shooting Stars */}
            <section className="bg-stars">
              <span className="star" />
              <span className="star" />
              <span className="star" />
              <span className="star" />
            </section>

            {/* Platform Status Notice Banner */}
            {!isLive && (
              <div className="mb-3.5 bg-amber-500/10 border border-amber-500/30 rounded-none p-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px] font-mono">Platform locked by administrator.</span>
              </div>
            )}

            {/* Email Input */}
            <div className="input-container">
              <input
                placeholder="Email"
                type="email"
                className="input-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Access Key Input */}
            <div className="input-container">
              <input
                placeholder="Access Key"
                type="text"
                className="input-pwd font-mono font-bold uppercase tracking-wider"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <button className="submit" type="submit" disabled={loading}>
              <span className="sign-text">
                {loading ? 'Verifying...' : isLive ? 'Enter Arena' : 'Verify Key'}
              </span>
            </button>

            {/* Dashboard Link */}
            <p className="signup-link">
              No key?{' '}
              <Link to="/user-login" className="up">
                Check Pass
              </Link>
            </p>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/30">
        TEAM MAVERICKS • MINDSAGA ARENA
      </footer>
    </div>
  );
};

export default MindSagaPublicEntryPage;
