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
  ShieldAlert
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const MindSagaParticipantArena = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme ? useTheme() : { theme: 'dark' };
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Access Key Gate State: Resets to false on every page refresh!
  const [isKeyVerified, setIsKeyVerified] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [arenaData, setArenaData] = useState(null);
  const [verifiedCandidate, setVerifiedCandidate] = useState(null);

  // Check if admin preview (allows coordinators/core_members to bypass, but participants MUST verify key)
  const isAdminRole = user?.role && ['coordinator', 'core_member', 'member'].includes(user.role);

  useEffect(() => {
    if (isAdminRole) {
      setIsKeyVerified(true);
      fetchParticipantStatus();
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

  // --- ACCESS KEY CHALLENGE GATE SCREEN (Shown on every refresh) ---
  if (!isKeyVerified && !isAdminRole) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 font-sans ${
        isDark ? 'bg-[#060A12] text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
            isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Header Icon */}
          <div className="text-center space-y-2">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border ${
              isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}>
              <Key className="w-8 h-8" />
            </div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Mind Saga Security Gate
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Please enter your unique <strong>Mind Saga Access Key</strong> to access your tournament dashboard.
            </p>
          </div>

          <form onSubmit={handleVerifyKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                Unique Access Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
                  <Key size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  placeholder="e.g. MS-XXXX-YYYY"
                  autoFocus
                  className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border font-mono text-sm font-black tracking-wider transition focus:outline-none focus:ring-2 focus:ring-indigo-500/40 uppercase ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                to="/user/dashboard"
                className={`flex-1 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition text-center flex items-center justify-center ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={verifyingKey}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Unlock size={14} />
                <span>{verifyingKey ? 'Verifying...' : 'Verify & Enter'}</span>
              </button>
            </div>
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
    <div className={`min-h-screen font-sans pb-20 selection:bg-indigo-500/30 transition-colors ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Navigation */}
      <div className={`border-b sticky top-0 z-30 backdrop-blur-xl transition-colors ${
        isDark ? 'border-zinc-800/80 bg-zinc-900/40 text-white' : 'border-slate-200 bg-white/80 text-slate-900 shadow-2xs'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/user/dashboard"
              className={`p-2 rounded-xl transition ${
                isDark ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <BrainCircuit className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span>Mind Saga Arena</span>
              </h1>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>3-Round Cognitive Championship</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              isDark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {qualStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Welcome Header Hero */}
        <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-2xl transition-all ${
          isDark
            ? 'bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border-indigo-500/20 text-white'
            : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-white border-indigo-200 text-slate-900 shadow-sm'
        }`}>
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-100 border-indigo-200 text-indigo-800'
            }`}>
              <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span>Individual Cognitive Tournament</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {arenaData?.participant?.full_name || verifiedCandidate?.full_name || verifiedCandidate?.name || user?.name || 'Mind Saga Challenger'}!
            </h2>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              Mind Saga is an elite 3-round individual competition evaluating cognitive speed, deductive reasoning, logic, and professional articulation.
            </p>
          </div>
        </div>

        {/* 3-Round Progression Pipeline Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Championship Rounds
            </h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              Active Tournament Stage: <strong className="text-indigo-500">Round {activeRound}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ROUND 1: APTITUDE */}
            <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              r1AttemptsExhausted
                ? isDark
                  ? 'bg-zinc-900/60 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'bg-white border-emerald-300 ring-1 ring-emerald-200 shadow-sm'
                : isDark
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r1AttemptsExhausted
                      ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                      : isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {r1AttemptsExhausted ? 'Completed' : 'Round 1'}
                  </span>
                </div>
                <div>
                  <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Aptitude Test</h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    MCQ, Multiple select, written technical explanations, diagram sketches & voice responses.
                  </p>
                </div>

                <div className={`text-xs space-y-1 pt-2 border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-600 border-slate-200'}`}>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {arenaData?.round1_aptitude?.test?.duration_minutes || 30} Mins
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Attempts Used:</span>
                    <span className={`font-semibold ${attemptsUsedR1 >= maxAttemptsR1 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {attemptsUsedR1} / {maxAttemptsR1}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Questions:</span>
                    <span className={`font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {arenaData?.round1_aptitude?.questions_count || arenaData?.round1_aptitude?.test?.questions_count || 10} Questions
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {!isR1Unlocked ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed ${
                      isDark ? 'bg-zinc-800/60 text-zinc-500' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Round 1 Locked
                  </button>
                ) : r1AttemptsExhausted ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 opacity-80 cursor-default ${
                      isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> All Attempts Used ({attemptsUsedR1}/{maxAttemptsR1})
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/test`)}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> {attemptsUsedR1 > 0 ? `Retake Round 1 (${attemptsUsedR1}/${maxAttemptsR1})` : 'Start Round 1'}
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 2: GAMING */}
            <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              isR2Unlocked
                ? isDark
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-purple-500/50'
                  : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'
                : isDark
                  ? 'bg-zinc-900/40 border-zinc-900 opacity-60'
                  : 'bg-slate-100 border-slate-200 opacity-60'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r2AttemptsExhausted
                      ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                      : isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {r2AttemptsExhausted ? 'Completed' : 'Round 2'}
                  </span>
                </div>
                <div>
                  <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Gaming Arena</h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Sequential game challenges: Deductive Symbol Grid & Motion Matrix Reflex.
                  </p>
                </div>

                <div className={`text-xs space-y-1 pt-2 border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-600 border-slate-200'}`}>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Sequential Challenges</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Attempts Used:</span>
                    <span className={`font-semibold ${attemptsUsedR2 >= maxAttemptsR2 ? 'text-emerald-400' : 'text-purple-400'}`}>
                      {attemptsUsedR2} / {maxAttemptsR2}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Challenges:</span>
                    <span className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      {arenaData?.round2_gaming?.games_count || 2} Sequential Games
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {!isR2Unlocked ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed ${
                      isDark ? 'bg-zinc-800/60 text-zinc-500' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Round 2 Locked by Admin
                  </button>
                ) : r2AttemptsExhausted ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 opacity-80 cursor-default ${
                      isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> All Attempts Used ({attemptsUsedR2}/{maxAttemptsR2})
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/game`)}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> {attemptsUsedR2 > 0 ? `Retake Round 2 (${attemptsUsedR2}/${maxAttemptsR2})` : 'Enter Gaming Arena'}
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 3: PERSONAL INTERVIEW */}
            <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              isR3Unlocked
                ? isDark
                  ? 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/50'
                  : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
                : isDark
                  ? 'bg-zinc-900/40 border-zinc-900 opacity-60'
                  : 'bg-slate-100 border-slate-200 opacity-60'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Round 3
                  </span>
                </div>
                <div>
                  <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Personal Interview</h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Live 1-on-1 evaluation with expert panelists on technical poise, architecture & problem solving.
                  </p>
                </div>

                <div className={`text-xs space-y-1 pt-2 border-t ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-600 border-slate-200'}`}>
                  <div className="flex justify-between">
                    <span>Venue:</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {arenaData?.round3_interview?.panel?.venue || 'CSBS Dept'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      1-on-1 Panel Evaluation
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {!isR3Unlocked ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed ${
                      isDark ? 'bg-zinc-800/60 text-zinc-500' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Round 3 Locked by Admin
                  </button>
                ) : (
                  <div className={`p-2.5 rounded-xl text-center text-xs font-semibold border ${
                    isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}>
                    Qualified for Interview! Report to venue.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindSagaParticipantArena;
