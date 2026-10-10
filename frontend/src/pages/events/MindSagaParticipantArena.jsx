import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  Gamepad2,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Shield,
  Video,
  Award,
  Lock,
  Unlock,
  Play,
  Sparkles,
  ArrowLeft,
  Key,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import './MindSagaTheme.css';

// In-memory session store (persists across SPA route navigation, resets on browser refresh/tab close)
let memoryVerifiedSession = {
  verified: false,
  key: '',
  candidate: null
};

const MindSagaParticipantArena = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme ? useTheme() : { theme: 'dark', toggleTheme: () => {} };
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Access Key Gate State: initialized from in-memory session if already verified in this tab session
  const [isKeyVerified, setIsKeyVerified] = useState(() => memoryVerifiedSession.verified);
  const [keyInput, setKeyInput] = useState(() => memoryVerifiedSession.key || '');
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [arenaData, setArenaData] = useState(null);
  const [verifiedCandidate, setVerifiedCandidate] = useState(() => memoryVerifiedSession.candidate);

  // Check if admin preview (allows coordinators/core_members to bypass, but participants MUST verify key)
  const isAdminRole = user?.role && ['coordinator', 'core_member', 'member', 'admin'].includes(user.role);

  useEffect(() => {
    if (isAdminRole) {
      setIsKeyVerified(true);
      fetchParticipantStatus();
    } else if (memoryVerifiedSession.verified && memoryVerifiedSession.key) {
      fetchParticipantStatus(memoryVerifiedSession.key);
    }
  }, [eventId, subEventId, isAdminRole]);

  const fetchParticipantStatus = async (overrideKey) => {
    try {
      setLoading(true);
      const activeKey = overrideKey || keyInput.trim().toUpperCase();
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participant-status`, {
        params: activeKey ? { access_key: activeKey } : {}
      });
      setArenaData(res.data);
      if (res.data?.participant?.full_name) {
        setVerifiedCandidate(res.data.participant);
      }
    } catch (err) {
      console.error('Failed to load Mind Saga status:', err);
      toast.error(err.response?.data?.error || 'Failed to load Mind Saga status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKey = async (e) => {
    e?.preventDefault?.();
    const cleanKey = keyInput.trim().toUpperCase();
    if (!cleanKey) {
      toast.error('Please enter your unique Mind Saga Access Key.');
      return;
    }

    try {
      setVerifyingKey(true);
      const res = await axios.post('/mindsaga/auth/login-with-key', {
        access_key: cleanKey
      });

      const data = res.data;
      if (data.token) {
        localStorage.setItem('token', data.token);
        sessionStorage.setItem('mind_saga_auth_token', data.token);
        sessionStorage.setItem('mind_saga_active_key', cleanKey);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }

      if (data.candidate) {
        setVerifiedCandidate(data.candidate);
      }

      memoryVerifiedSession = {
        verified: true,
        key: cleanKey,
        candidate: data.candidate || null
      };

      if (!data.is_live && data.platform_status === 'locked' && !isAdminRole) {
        toast.error('Mind Saga platform is currently LOCKED by the admin. Please wait for the admin to unlock.', {
          icon: '🔒',
          duration: 5000
        });
        return;
      }

      const welcomeName = data.candidate?.full_name || data.candidate?.name || 'Participant';
      toast.success(`Welcome ${welcomeName}! Unlocking Mind Saga Arena...`, { icon: '🚀' });
      setIsKeyVerified(true);
      fetchParticipantStatus(cleanKey);
    } catch (err) {
      console.error('Key verification failed:', err);
      const errMsg = err.response?.data?.error || 'Invalid Access Key. Please check your credentials and try again.';
      toast.error(errMsg);
    } finally {
      setVerifyingKey(false);
    }
  };

  // --- ACCESS KEY CHALLENGE GATE SCREEN (Uiverse Retro Space Design) ---
  if (!isKeyVerified && !isAdminRole) {
    return (
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center p-4 relative">
        {/* Background Shooting Stars */}
        <div className="mindsaga-bg-stars" aria-hidden="true">
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[425px] relative z-10"
        >
          {/* Uiverse Retro Space Form */}
          <form className="mindsaga-space-form" onSubmit={handleVerifyKey}>
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

            {/* Access Key Input */}
            <div className="input-container">
              <input
                type="text"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                placeholder="Access Key (MS-XXXX-YYYY)"
                autoFocus
                className="input-pwd font-mono font-bold uppercase tracking-wider"
              />
            </div>

            {/* Submit Button with Shimmer Beam */}
            <button className="submit" type="submit" disabled={verifyingKey}>
              <span className="sign-text">
                {verifyingKey ? 'Verifying...' : 'Enter Arena'}
              </span>
            </button>

            {/* Back Link */}
            <p className="signup-link">
              No key?{' '}
              <Link to="/user/dashboard" className="up">
                Check Dashboard
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  const qualStatus = arenaData?.score_record?.qualification_status || 'in_round_1';
  const r1Session = arenaData?.round1_aptitude?.session;
  const r1Completed = r1Session && ['submitted', 'auto_submitted'].includes(r1Session.status);

  const activeRound = arenaData?.active_round || arenaData?.config?.active_round || 1;
  const attemptsUsedR1 = arenaData?.attempts_used_r1 ?? (r1Completed ? 1 : 0);
  const maxAttemptsR1 = arenaData?.max_attempts_r1 ?? (arenaData?.config?.max_attempts_r1 || 1);
  const r1AttemptsExhausted = attemptsUsedR1 >= maxAttemptsR1;

  const attemptsUsedR2 = arenaData?.attempts_used_r2 ?? (arenaData?.round2_games?.session ? 1 : 0);
  const maxAttemptsR2 = arenaData?.max_attempts_r2 ?? (arenaData?.config?.max_attempts_r2 || 1);
  const r2AttemptsExhausted = attemptsUsedR2 >= maxAttemptsR2;

  const isR1Unlocked = arenaData?.is_r1_unlocked ?? (activeRound >= 1);
  const isR2Unlocked = arenaData?.is_r2_unlocked ?? (activeRound >= 2);
  const isR3Unlocked = arenaData?.is_r3_unlocked ?? (activeRound >= 3 && ['qualified_round_3', 'finalist'].includes(qualStatus));

  return (
    <div className="mindsaga-space-bg min-h-screen pb-20 selection:bg-sky-500/30 relative font-sans text-slate-100">
      {/* Background Shooting Stars */}
      <div className="mindsaga-bg-stars" aria-hidden="true">
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
      </div>

      {/* Top Navigation Bar with Micro Telemetry & Theme Toggle */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/50 sticky top-0 z-30 backdrop-blur-xl transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/user/dashboard"
              className="p-2 rounded-none bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider flex items-center gap-2 font-mono text-slate-900 dark:text-white">
                <BrainCircuit className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <span>Mind Saga Arena</span>
              </h1>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Cognitive Championship</p>
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
              <span className="mindsaga-radar-dot" />
              <span>STATUS: {qualStatus.replace(/_/g, ' ')}</span>
            </span>
            <span className="hidden md:inline-flex mindsaga-hud-badge border-slate-300 dark:border-white/10 text-sky-600 dark:text-sky-400">
              [ STAGE: ROUND 0{activeRound} ]
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8 relative z-10">
        {/* Welcome Hero Card with Sharp 0-Radius Corners */}
        <div className="mindsaga-card p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>Cognitive Arena</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome, {arenaData?.participant?.full_name || verifiedCandidate?.full_name || verifiedCandidate?.name || user?.name || 'Candidate'}!
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              3-Round Championship: Aptitude evaluation, deductive logic gaming, and 1-on-1 panel interview.
            </p>

            {/* Candidate Telemetry Strip */}
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="mindsaga-hud-badge border-sky-400/40 text-sky-700 dark:text-sky-300">
                [ CANDIDATE: {verifiedCandidate?.full_name || user?.name || 'VERIFIED'} ]
              </span>
              {memoryVerifiedSession.key && (
                <span className="mindsaga-hud-badge border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300">
                  [ KEY: {memoryVerifiedSession.key} ]
                </span>
              )}
              <span className="mindsaga-hud-badge border-emerald-400/40 text-emerald-700 dark:text-emerald-300">
                [ ARENA: LIVE ]
              </span>
            </div>
          </div>
        </div>

        {/* 3-Round Progression Pipeline */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-white/10">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 block mindsaga-flicker">
                competition pipeline
              </span>
              <h3 className="mindsaga-title-outline text-xl sm:text-2xl mt-0.5">
                CHAMPIONSHIP ROUNDS
              </h3>
            </div>
            <span className="mindsaga-hud-badge self-start sm:self-auto text-sky-700 dark:text-sky-300 border-sky-500/30">
              Active Stage: <strong>Round {activeRound}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ROUND 1: APTITUDE TEST */}
            <div className={`mindsaga-card p-5 flex flex-col justify-between ${
              r1AttemptsExhausted ? 'mindsaga-card-emerald' : ''
            }`}>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-none bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <span className={`mindsaga-hud-badge ${
                    r1AttemptsExhausted ? 'border-emerald-400/40 text-emerald-700 dark:text-emerald-300' : 'border-sky-400/40 text-sky-700 dark:text-sky-300'
                  }`}>
                    {r1AttemptsExhausted ? 'COMPLETED' : 'ROUND 01'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-wide">Aptitude Evaluation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    MCQ, Technical &amp; Voice Reasoning.
                  </p>
                </div>

                {/* Telemetry Metrics */}
                <div className="text-xs space-y-1.5 pt-3 border-t border-slate-200 dark:border-white/10 font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {arenaData?.round1_aptitude?.test?.duration_minutes || 30} Mins
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Attempts:</span>
                    <span className={`font-bold ${attemptsUsedR1 >= maxAttemptsR1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
                      {attemptsUsedR1} / {maxAttemptsR1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Questions:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-300">
                      {arenaData?.round1_aptitude?.questions_count || arenaData?.round1_aptitude?.test?.questions_count || 10} Items
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                {!isR1Unlocked ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-none text-xs font-mono font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" /> [ ROUND 1 LOCKED ]
                  </button>
                ) : r1AttemptsExhausted ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-none text-xs font-mono font-bold flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Completed ({attemptsUsedR1}/{maxAttemptsR1})
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/test`)}
                    className="mindsaga-btn-space w-full py-2.5 rounded-none"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    <span>{attemptsUsedR1 > 0 ? `Retake (${attemptsUsedR1}/${maxAttemptsR1})` : 'Start Round 1'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 2: GAMING ARENA */}
            <div className={`mindsaga-card mindsaga-card-purple p-5 flex flex-col justify-between ${
              !isR2Unlocked ? 'opacity-60' : ''
            }`}>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-none bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <span className={`mindsaga-hud-badge ${
                    r2AttemptsExhausted ? 'border-emerald-400/40 text-emerald-700 dark:text-emerald-300' : 'border-purple-400/40 text-purple-700 dark:text-purple-300'
                  }`}>
                    {r2AttemptsExhausted ? 'COMPLETED' : 'ROUND 02'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-wide">Gaming Arena</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Deductive Grid &amp; Matrix Reflex Challenges.
                  </p>
                </div>

                {/* Telemetry Metrics */}
                <div className="text-xs space-y-1.5 pt-3 border-t border-slate-200 dark:border-white/10 font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Format:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Sequential Matrix</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Attempts:</span>
                    <span className={`font-bold ${attemptsUsedR2 >= maxAttemptsR2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                      {attemptsUsedR2} / {maxAttemptsR2}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Challenges:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-300">
                      {arenaData?.round2_gaming?.games_count || 2} Games
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                {!isR2Unlocked ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-none text-xs font-mono font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" /> [ ROUND 2 LOCKED ]
                  </button>
                ) : r2AttemptsExhausted ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-none text-xs font-mono font-bold flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Completed ({attemptsUsedR2}/{maxAttemptsR2})
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/game`)}
                    className="mindsaga-btn-space w-full py-2.5 rounded-none bg-gradient-to-r from-purple-800 to-indigo-700"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    <span>{attemptsUsedR2 > 0 ? `Retake (${attemptsUsedR2}/${maxAttemptsR2})` : 'Enter Gaming Arena'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 3: PERSONAL INTERVIEW */}
            <div className={`mindsaga-card mindsaga-card-amber p-5 flex flex-col justify-between ${
              !isR3Unlocked ? 'opacity-60' : ''
            }`}>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="mindsaga-hud-badge border-amber-400/40 text-amber-700 dark:text-amber-300">
                    ROUND 03
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-wide">Personal Interview</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    1-on-1 Panel Evaluation.
                  </p>
                </div>

                {/* Telemetry Metrics */}
                <div className="text-xs space-y-1.5 pt-3 border-t border-slate-200 dark:border-white/10 font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Venue:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {arenaData?.round3_interview?.panel?.venue || 'CSBS Dept'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Evaluation:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-300">
                      Panel Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                {!isR3Unlocked ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-none text-xs font-mono font-bold flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" /> [ ROUND 3 LOCKED ]
                  </button>
                ) : (
                  <div className="p-2.5 rounded-none text-center text-xs font-mono font-bold border border-emerald-500/40 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                    Qualified! Report to venue.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MindSagaParticipantArena;
