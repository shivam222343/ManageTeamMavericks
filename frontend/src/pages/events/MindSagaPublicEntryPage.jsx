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
  Mail
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';

const MindSagaPublicEntryPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth ? useAuth() : { login: () => {} };

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between selection:bg-indigo-500/30">
      {/* Top Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Team Mavericks</h1>
            <p className="text-[11px] text-zinc-400">Mind Saga Official Platform Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            isLive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>Platform: {isLive ? 'LIVE' : 'LOCKED'}</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          {/* Header Hero */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Mind Saga Arena Access</h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Enter your unique candidate Access Key to access Round 1 Aptitude, Round 2 Gaming, and Round 3 Interview.
            </p>
          </div>

          {/* Platform Status Notice Banner */}
          {!isLive && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">Round is Currently Locked by Admin</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  You can enter your key now to verify your credentials. When the administrator starts the round, you will automatically enter the arena.
                </p>
              </div>
            </div>
          )}

          {/* Key Entry Form */}
          <form onSubmit={handleKeyLogin} className="space-y-4">
            <div className="space-y-1.5 text-xs">
              <label className="text-zinc-300 font-semibold flex items-center justify-between">
                <span>Unique Mind Saga Access Key</span>
                <span className="text-[10px] text-indigo-400 font-mono">Format: MS-XXXX-XXXX</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="e.g. MS-8B7X-9N2A"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white font-mono font-bold tracking-wider uppercase text-sm focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </div>
            </div>

            <div className="text-center text-[11px] text-zinc-500">
              <span>— OR ENTER VIA REGISTERED EMAIL —</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="registered.email@college.edu"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
            >
              {loading ? (
                <span>Validating Key...</span>
              ) : isLive ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Enter Mind Saga Arena</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Key &amp; Stand By</span>
                </>
              )}
            </button>
          </form>

          {/* Helper Instructions & Dashboard Link */}
          <div className="pt-4 border-t border-zinc-800/80 text-center space-y-2 text-xs">
            <p className="text-zinc-500">
              Don't have your access key? Check your email or view your candidate pass.
            </p>
            <Link
              to="/user-login"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Go to Participant Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-zinc-600 border-t border-zinc-900">
        Team Mavericks • Mind Saga High-Performance Evaluation Engine • All rights reserved.
      </footer>
    </div>
  );
};

export default MindSagaPublicEntryPage;
