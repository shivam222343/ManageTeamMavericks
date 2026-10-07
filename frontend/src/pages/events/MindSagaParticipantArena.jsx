import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
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
  Play,
  Sparkles,
  ArrowLeft
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

  const [loading, setLoading] = useState(true);
  const [arenaData, setArenaData] = useState(null);

  useEffect(() => {
    fetchParticipantStatus();
  }, [eventId, subEventId]);

  const fetchParticipantStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participant-status`);
      setArenaData(res.data);
    } catch (err) {
      console.error('Failed to load Mind Saga status:', err);
      toast.error(err.response?.data?.error || 'Failed to load Mind Saga status');
    } finally {
      setLoading(false);
    }
  };

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
  const isR2Unlocked = qualStatus !== 'in_round_1' || r1Completed;
  const isR3Unlocked = ['qualified_round_3', 'finalist'].includes(qualStatus);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20 selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/user/dashboard"
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                Mind Saga Arena
              </h1>
              <p className="text-xs text-zinc-400">3-Round Cognitive Championship</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {qualStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Welcome Header Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Individual Cognitive Tournament
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {arenaData?.participant?.full_name}!
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Mind Saga is an elite 3-round individual competition evaluating cognitive speed, deductive reasoning, logic, and professional articulation.
            </p>
          </div>
        </div>

        {/* 3-Round Progression Pipeline Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Championship Rounds</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ROUND 1: APTITUDE */}
            <div className={`bg-zinc-900/60 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              r1Completed ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-zinc-800 hover:border-indigo-500/50'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r1Completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {r1Completed ? 'Completed' : 'Round 1'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Aptitude Test</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    MCQ, Multiple select, written technical explanations, diagram sketches & voice responses.
                  </p>
                </div>

                <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-semibold text-white">{arenaData?.round1_aptitude?.test?.duration_minutes || 30} Mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weightage:</span>
                    <span className="font-semibold text-indigo-400">{arenaData?.config?.round1_weight || 30}%</span>
                  </div>
                  {r1Completed && (
                    <div className="flex justify-between text-emerald-400 font-semibold pt-1">
                      <span>Score:</span>
                      <span>{r1Session.total_score} pts ({r1Session.percentage}%)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5">
                {r1Completed ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-zinc-800 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 opacity-80 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Submitted
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/test`)}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Round 1
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 2: GAMING */}
            <div className={`bg-zinc-900/60 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              isR2Unlocked ? 'border-zinc-800 hover:border-indigo-500/50' : 'border-zinc-900 opacity-60'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400">
                    Round 2
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Gaming Arena</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Motion Challenge cognitive reflex & 4x4 Latin Square symbol deduction puzzles.
                  </p>
                </div>

                <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span>Games:</span>
                    <span className="font-semibold text-white">Motion + Logic Grid</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weightage:</span>
                    <span className="font-semibold text-purple-400">{arenaData?.config?.round2_weight || 30}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {isR2Unlocked ? (
                  <button
                    onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/game`)}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Enter Gaming Arena
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 bg-zinc-800/60 text-zinc-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" /> Complete Round 1 First
                  </button>
                )}
              </div>
            </div>

            {/* ROUND 3: PERSONAL INTERVIEW */}
            <div className={`bg-zinc-900/60 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
              isR3Unlocked ? 'border-zinc-800 hover:border-indigo-500/50' : 'border-zinc-900 opacity-60'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400">
                    Round 3
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Personal Interview</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Live 1-on-1 evaluation with expert panelists on technical poise, architecture & problem solving.
                  </p>
                </div>

                <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span>Venue:</span>
                    <span className="font-semibold text-white">{arenaData?.round3_interview?.panel?.venue || 'CSBS Dept'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weightage:</span>
                    <span className="font-semibold text-amber-400">{arenaData?.config?.round3_weight || 40}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {isR3Unlocked ? (
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-300 font-semibold">
                    Qualified for Interview! Report to venue.
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 bg-zinc-800/60 text-zinc-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" /> Shortlist Pending
                  </button>
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
