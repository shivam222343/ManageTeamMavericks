import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  HelpCircle,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  CheckCircle2,
  XCircle,
  Flame,
  Info,
  ChevronRight,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Clock,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

// Web Audio API Synthesizer
class SwitchSoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.14, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.22);
      });
    } catch (e) {}
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch (e) {}
  }

  playStreak() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.18);
      });
    } catch (e) {}
  }
}

const soundFX = new SwitchSoundFX();

// Symbol SVG Renderer Component (Dark, bold high-contrast tones on white boxes)
const SymbolIcon = ({ symbol, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
    xl: 'w-16 h-16 sm:w-20 sm:h-20'
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  switch (symbol) {
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="50" cy="50" r="42" fill="#15803D" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <rect x="10" y="10" width="80" height="80" rx="10" fill="#B91C1C" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <polygon points="50,10 90,88 10,88" fill="#1D4ED8" strokeLinejoin="round" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <path
            d="M36 10 H64 V36 H90 V64 H64 V90 H36 V64 H10 V36 H36 Z"
            fill="#6D28D9"
          />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <path
            d="M22 10 L50 38 L78 10 L90 22 L62 50 L90 78 L78 90 L50 62 L22 90 L10 78 L38 50 L10 22 Z"
            fill="#C2410C"
          />
        </svg>
      );
    case 'percent':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="28" cy="28" r="16" fill="#0F172A" />
          <circle cx="72" cy="72" r="16" fill="#0F172A" />
          <line x1="82" y1="18" x2="18" y2="82" stroke="#0F172A" strokeWidth="16" strokeLinecap="round" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <polygon
            points="50,8 62,38 95,38 68,58 78,90 50,70 22,90 32,58 5,38 38,38"
            fill="#4338CA"
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <polygon points="50,10 90,50 50,90 10,50" fill="#B45309" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="50" cy="50" r="40" fill="#0F172A" />
        </svg>
      );
  }
};

// Default progressive switch challenge levels
const fallbackLevels = [
  {
    level: 1,
    title: 'Level 1: 4-Symbol Switch Warmup',
    difficulty: 'easy',
    symbol_count: 4,
    time_limit: 25,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols: ['circle', 'square', 'triangle', 'plus'],
    output_symbols: ['triangle', 'square', 'plus', 'circle'],
    correct_code: '3241',
    options: ['3241', '2341', '3421', '4231']
  },
  {
    level: 2,
    title: 'Level 2: 4-Symbol Inversion',
    difficulty: 'easy',
    symbol_count: 4,
    time_limit: 25,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols: ['square', 'plus', 'circle', 'triangle'],
    output_symbols: ['triangle', 'circle', 'plus', 'square'],
    correct_code: '4321',
    options: ['4321', '3421', '4231', '3412']
  },
  {
    level: 3,
    title: 'Level 3: 4-Symbol Cross Matrix',
    difficulty: 'easy',
    symbol_count: 4,
    time_limit: 25,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols: ['percent', 'circle', 'square', 'plus'],
    output_symbols: ['square', 'percent', 'plus', 'circle'],
    correct_code: '3142',
    options: ['3142', '1342', '3412', '3124']
  },
  {
    level: 4,
    title: 'Level 4: 5-Symbol Pentagram Switch',
    difficulty: 'medium',
    symbol_count: 5,
    time_limit: 25,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols: ['circle', 'square', 'percent', 'plus', 'cross'],
    output_symbols: ['cross', 'percent', 'circle', 'plus', 'square'],
    correct_code: '53142',
    options: ['53142', '51342', '43152', '53412']
  },
  {
    level: 5,
    title: 'Level 5: 6-Symbol Rapid Reaction',
    difficulty: 'hard',
    symbol_count: 6,
    time_limit: 20,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols: ['circle', 'square', 'percent', 'plus', 'cross', 'triangle'],
    output_symbols: ['circle', 'cross', 'triangle', 'plus', 'percent', 'square'],
    correct_code: '156432',
    options: ['542361', '624153', '415362', '156432']
  }
];

const SwitchChallengeGame = ({
  puzzleData = null,
  onComplete,
  onScoreUpdate,
  isProctored = true,
  maxTournamentScore = 100
}) => {
  const levels = Array.isArray(puzzleData) && puzzleData.length > 0 ? puzzleData : fallbackLevels;

  // Game flow state
  const [hasStarted, setHasStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [movesLog, setMovesLog] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // 'correct' | 'wrong' | null
  const [isMuted, setIsMuted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Per-level timer state
  const currentLevel = levels[currentLevelIdx] || levels[0];
  const [levelTimer, setLevelTimer] = useState(currentLevel?.time_limit || 25);
  const timerRef = useRef(null);

  // Sync mute with soundFX
  useEffect(() => {
    soundFX.muted = isMuted;
  }, [isMuted]);

  // Per-level countdown
  useEffect(() => {
    if (!hasStarted || isGameOver || showHowToPlay) return;

    setLevelTimer(currentLevel?.time_limit || 25);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setLevelTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, currentLevelIdx, isGameOver, showHowToPlay]);

  // Handle timeout on current question
  const handleTimeOut = () => {
    soundFX.playWrong();
    setWrongCount((prev) => prev + 1);
    setStreak(0);
    setFeedbackStatus('wrong');
    toast.error('⏰ Time expired for this switch! -1 PT', { duration: 1500 });

    const newScore = Math.max(0, score - 1);
    setScore(newScore);
    if (onScoreUpdate) onScoreUpdate(newScore);

    setMovesLog((prev) => [
      ...prev,
      {
        level: currentLevel.level,
        action: 'timeout',
        correct_code: currentLevel.correct_code,
        scoreDelta: -1,
        timestamp: new Date().toISOString()
      }
    ]);

    setTimeout(() => {
      setFeedbackStatus(null);
      advanceToNextLevel(newScore);
    }, 1000);
  };

  // Option selection handler
  const handleOptionClick = (optionCode) => {
    if (feedbackStatus !== null || isGameOver || !hasStarted) return;

    soundFX.playClick();
    setSelectedOption(optionCode);

    const isCorrect = optionCode === currentLevel.correct_code;

    if (isCorrect) {
      soundFX.playCorrect();
      const points = currentLevel.points_award || 3;
      const newScore = Math.min(maxTournamentScore, score + points);
      const newStreak = streak + 1;

      setScore(newScore);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setCorrectCount((prev) => prev + 1);
      setFeedbackStatus('correct');

      if (newStreak > 1 && newStreak % 3 === 0) {
        soundFX.playStreak();
        toast.success(`🔥 ${newStreak}x STREAK COMBO! +${points} PTS`, { duration: 1500 });
      } else {
        toast.success(`+${points} PTS! Correct Switch Match!`, { duration: 1200 });
      }

      if (onScoreUpdate) onScoreUpdate(newScore);

      setMovesLog((prev) => [
        ...prev,
        {
          level: currentLevel.level,
          action: 'answer',
          selected: optionCode,
          correct: true,
          scoreDelta: points,
          timestamp: new Date().toISOString()
        }
      ]);

      setTimeout(() => {
        setFeedbackStatus(null);
        setSelectedOption(null);
        advanceToNextLevel(newScore);
      }, 750);
    } else {
      soundFX.playWrong();
      const penalty = currentLevel.penalty_deduct || 1;
      const newScore = Math.max(0, score - penalty);

      setScore(newScore);
      setStreak(0);
      setWrongCount((prev) => prev + 1);
      setFeedbackStatus('wrong');
      toast.error(`Wrong Code! Expected: ${currentLevel.correct_code} (-1 PT)`, { duration: 1400 });

      if (onScoreUpdate) onScoreUpdate(newScore);

      setMovesLog((prev) => [
        ...prev,
        {
          level: currentLevel.level,
          action: 'answer',
          selected: optionCode,
          correct: false,
          scoreDelta: -penalty,
          timestamp: new Date().toISOString()
        }
      ]);

      setTimeout(() => {
        setFeedbackStatus(null);
        setSelectedOption(null);
        advanceToNextLevel(newScore);
      }, 950);
    }
  };

  // Keyboard shortcut listener for options (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!hasStarted || showHowToPlay || isGameOver || feedbackStatus !== null) return;
      const key = e.key;
      const num = parseInt(key);
      if (num >= 1 && num <= (currentLevel?.options?.length || 4)) {
        const opt = currentLevel.options[num - 1];
        if (opt) handleOptionClick(opt);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, showHowToPlay, isGameOver, feedbackStatus, currentLevel]);

  // Advance level
  const advanceToNextLevel = (currentCalculatedScore) => {
    if (currentLevelIdx + 1 < levels.length) {
      setCurrentLevelIdx((prev) => prev + 1);
    } else {
      // Tournament round finished!
      setIsGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (onComplete) {
        onComplete({
          score: currentCalculatedScore,
          maxScore: maxTournamentScore,
          correctCount: correctCount + (feedbackStatus === 'correct' ? 1 : 0),
          wrongCount,
          maxStreak,
          movesLog
        });
      }
    }
  };

  const handleStartGame = () => {
    setShowHowToPlay(false);
    setHasStarted(true);
    soundFX.init();
    soundFX.playClick();
  };

  return (
    <div className="w-full flex flex-col items-center justify-between text-slate-900 dark:text-white font-sans select-none max-w-4xl mx-auto">
      {/* FREE FLOATING SCORE BAR ON TOP */}
      <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 mb-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20 flex items-center justify-center font-bold">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Switch Challenge
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20">
                Logical Reasoning
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              Level {currentLevelIdx + 1} of {levels.length} • Match Input to Output Permutation
            </span>
          </div>
        </div>

        {/* Right Stats & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {streak > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-600 dark:text-orange-400 text-xs font-mono font-bold animate-pulse">
              <Flame size={13} />
              <span>{streak}x</span>
            </div>
          )}

          {/* Live Score Pill */}
          <div className="relative flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-zinc-800 border border-indigo-200 dark:border-zinc-700 rounded-xl">
            <Trophy size={13} className="text-amber-500" />
            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
              {score} <span className="text-[10px] text-slate-500 dark:text-zinc-400">PTS</span>
            </span>
          </div>

          {/* Timer Countdown Pill */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border font-mono text-xs font-bold ${
            levelTimer <= 5
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
              : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
          }`}>
            <Clock size={12} />
            <span>{levelTimer}s</span>
          </div>

          {/* Sound Mute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* How to Play info */}
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            title="Rules & How to Play"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* COMPACT PROGRESS BAR */}
      <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1 mb-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-lime-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentLevelIdx + 1) / levels.length) * 100}%` }}
        />
      </div>

      {/* COMPACT GAME ARENA CANVAS (NO SCROLLING - DARK THEME) */}
      <div className="w-full flex flex-col justify-between items-center rounded-3xl bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#030712] text-white p-4 sm:p-5 shadow-2xl border border-slate-700/60 overflow-hidden relative">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* TOP LEVEL: INPUT CODE ROW */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/30 px-3 py-0.5 rounded-full border border-white/10 mb-2">
            Top Level (Input Code)
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-md">
            {currentLevel?.input_symbols?.map((sym, idx) => (
              <div key={`input-${idx}`} className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl shadow-md flex items-center justify-center border-2 border-white/80">
                  <SymbolIcon symbol={sym} size="sm" />
                </div>
                <span className="mt-1 text-[10px] font-mono font-black text-white/90 bg-black/40 px-2 py-0.2 rounded border border-white/10">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER TRANSFORMATION & ANSWER PANEL */}
        <div className="relative z-10 my-3 w-full flex flex-col items-center">
          {/* Connector Arrow */}
          <div className="flex flex-col items-center justify-center gap-0.5 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-md shadow-lime-400/40">
              <ArrowUp size={14} strokeWidth={3} />
            </div>
          </div>

          {/* Options Grid (4 Cards) */}
          <div className="w-full max-w-xl">
            <div className="text-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/40 px-3 py-0.5 rounded-full border border-white/15">
                Select Output Switch Code (Keys 1-4)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {currentLevel?.options?.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentLevel.correct_code;

                let cardStyle = "bg-white hover:bg-zinc-50 text-rose-600 hover:scale-[1.03] shadow-md border-2 border-white/70";
                if (isSelected && feedbackStatus === 'correct') {
                  cardStyle = "bg-emerald-500 text-white scale-105 shadow-xl shadow-emerald-500/40 border-2 border-white ring-4 ring-emerald-300";
                } else if (isSelected && feedbackStatus === 'wrong') {
                  cardStyle = "bg-red-600 text-white animate-shake shadow-xl shadow-red-500/40 border-2 border-white";
                } else if (feedbackStatus === 'wrong' && isCorrect) {
                  cardStyle = "bg-emerald-500/90 text-white border-2 border-white animate-pulse";
                }

                return (
                  <motion.button
                    key={`opt-${idx}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOptionClick(opt)}
                    disabled={feedbackStatus !== null}
                    className={`relative rounded-xl p-2.5 sm:p-3 text-center font-mono font-black text-base sm:text-xl tracking-wider transition-all duration-200 cursor-pointer ${cardStyle}`}
                  >
                    <span className="absolute top-1 left-2 text-[8px] font-sans font-bold opacity-60">
                      #{idx + 1}
                    </span>
                    <span className="block mt-0.5">{opt}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Down Arrow Connector */}
          <div className="flex flex-col items-center justify-center gap-0.5 mt-2">
            <div className="w-6 h-6 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-md shadow-lime-400/40">
              <ArrowDown size={14} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* BOTTOM LEVEL: OUTPUT CODE ROW */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-md">
            {currentLevel?.output_symbols?.map((sym, idx) => (
              <div key={`output-${idx}`} className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl shadow-md flex items-center justify-center border-2 border-white/80">
                  <SymbolIcon symbol={sym} size="sm" />
                </div>
              </div>
            ))}
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/30 px-3 py-0.5 rounded-full border border-white/10 mt-2">
            Bottom Level (Output Code)
          </span>
        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 pt-2 border-t border-white/10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <CheckCircle2 size={13} /> {correctCount} Correct (+3)
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <XCircle size={13} /> {wrongCount} Wrong (-1)
          </span>
        </div>
        <div className="font-mono text-[11px] text-zinc-500">
          Scoring: +3 pts for correct, -1 pt for wrong attempt
        </div>
      </div>

      {/* INSTRUCTIONS / "HOW TO PLAY" MODAL (MATCHING IMAGE 1 EXACTLY) */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-5 overflow-hidden"
            >
              {/* Header */}
              <div className="text-center space-y-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-orange-500 uppercase tracking-tight">
                  Switch Challenge
                </h3>
                <div className="inline-block px-3 py-0.5 rounded-full bg-white text-zinc-900 text-xs font-black uppercase tracking-wider shadow-sm">
                  Power of Logical Thinking
                </div>
              </div>

              {/* Instructions text */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-center">
                Here a few different symbols are displayed on both the top (input) and bottom (output) levels of the screen. Your task is to find the correct code of the output, based on the order of the input, from the given options in between the screen. For clear understanding observe the below Practice.
              </p>

              {/* Practice demo box */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-center">
                  {/* Input Code */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Input Code
                    </span>
                    <div className="flex items-center justify-center gap-1.5 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="circle" size="sm" />
                        <span className="text-[9px] text-zinc-500 font-bold">1</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="square" size="sm" />
                        <span className="text-[9px] text-zinc-500 font-bold">2</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="triangle" size="sm" />
                        <span className="text-[9px] text-zinc-500 font-bold">3</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="plus" size="sm" />
                        <span className="text-[9px] text-zinc-500 font-bold">4</span>
                      </div>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="space-y-1 text-center">
                    <span className="text-xs font-mono font-bold text-zinc-300 block">
                      Answer : <strong className="text-emerald-400 font-mono text-base">3241</strong>
                    </span>
                    <h4 className="text-base font-black text-orange-400 uppercase tracking-wide">
                      How to Play
                    </h4>
                  </div>

                  {/* Output Code */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Output Code
                    </span>
                    <div className="flex items-center justify-center gap-1.5 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="triangle" size="sm" />
                        <span className="text-[9px] text-emerald-400 font-bold">3</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="square" size="sm" />
                        <span className="text-[9px] text-emerald-400 font-bold">2</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="plus" size="sm" />
                        <span className="text-[9px] text-emerald-400 font-bold">4</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <SymbolIcon symbol="circle" size="sm" />
                        <span className="text-[9px] text-emerald-400 font-bold">1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bullet rules */}
              <ul className="text-xs text-zinc-300 space-y-2 list-disc list-inside">
                <li><strong className="text-white">Time duration</strong> is 20 seconds or 25 seconds for each level.</li>
                <li>You need to <strong className="text-white">Click on the correct answer</strong> from the Answer Panel (or use keyboard keys 1-4).</li>
                <li><strong className="text-emerald-400">Three marks (+3)</strong> added for each correct attempt and <strong className="text-rose-400">one mark (-1)</strong> is subtracted for each wrong attempt.</li>
              </ul>

              {/* Play Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleStartGame}
                  className="w-full sm:w-64 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={18} fill="currentColor" /> Play
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAME OVER / VICTORY OVERLAY */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl text-white"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-lime-500 to-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-lime-500/30">
                <Award size={32} className="text-zinc-950" />
              </div>

              <div>
                <h3 className="text-2xl font-black uppercase text-white">
                  Switch Challenge Completed!
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Logical Permutation Challenge Finalized
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Final Score</span>
                  <span className="text-2xl font-black text-amber-300 font-mono">{score} PTS</span>
                </div>
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Max Streak</span>
                  <span className="text-2xl font-black text-orange-400 font-mono">{maxStreak}x</span>
                </div>
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Correct</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{correctCount}</span>
                </div>
                <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Accuracy</span>
                  <span className="text-xl font-black text-blue-400 font-mono">
                    {correctCount + wrongCount > 0
                      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
                      : 100}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onComplete) {
                    onComplete({
                      score,
                      maxScore: maxTournamentScore,
                      correctCount,
                      wrongCount,
                      maxStreak,
                      movesLog
                    });
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
              >
                Submit & Proceed
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwitchChallengeGame;
