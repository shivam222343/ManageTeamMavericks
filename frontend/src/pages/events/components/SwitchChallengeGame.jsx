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

// Web Audio API Synthesizer (Zero asset download latency, pure procedural sound effects)
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
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.05);
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

// Symbol SVG Renderer Component matching reference images (Crisp, pure lime-green #84CC16 icons)
const SymbolIcon = ({ symbol, size = 'md' }) => {
  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-14 h-14 sm:w-16 sm:h-16'
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const limeFill = '#84CC16';

  switch (symbol) {
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <polygon points="50,14 88,86 12,86" fill={limeFill} strokeLinejoin="round" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <rect x="14" y="14" width="72" height="72" rx="4" fill={limeFill} />
        </svg>
      );
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="50" cy="50" r="39" fill={limeFill} />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <path
            d="M36 12 H64 V36 H88 V64 H64 V88 H36 V64 H12 V36 H36 Z"
            fill={limeFill}
          />
        </svg>
      );
    case 'cross':
    case 'x':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <path
            d="M20 12 L50 42 L80 12 L88 20 L58 50 L88 80 L80 88 L50 58 L20 88 L12 80 L42 50 L12 20 Z"
            fill={limeFill}
          />
        </svg>
      );
    case 'percent':
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="28" cy="28" r="15" fill={limeFill} />
          <circle cx="72" cy="72" r="15" fill={limeFill} />
          <line x1="82" y1="18" x2="18" y2="82" stroke={limeFill} strokeWidth="15" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className={currentSize}>
          <circle cx="50" cy="50" r="36" fill={limeFill} />
        </svg>
      );
  }
};

// Procedural Progressive Switch Challenge Generator (60+ levels with increasing complexity)
const ALL_SWITCH_SYMBOLS = ['triangle', 'square', 'circle', 'plus', 'cross', 'percent'];

export const generateSwitchLevel = (level) => {
  let mode = 'single';
  let count = 4;
  let time_limit = 25;
  let difficulty = 'easy';

  if (level > 55) {
    mode = 'dual';
    count = 6;
    time_limit = 18;
    difficulty = 'expert';
  } else if (level > 45) {
    mode = 'single';
    count = 6;
    time_limit = 20;
    difficulty = 'hard';
  } else if (level > 35) {
    mode = 'dual';
    count = 5;
    time_limit = 22;
    difficulty = 'hard';
  } else if (level > 25) {
    mode = 'single';
    count = 5;
    time_limit = 22;
    difficulty = 'medium';
  } else if (level > 15) {
    mode = 'dual';
    count = 4;
    time_limit = 25;
    difficulty = 'medium';
  } else {
    mode = 'single';
    count = 4;
    time_limit = 25;
    difficulty = 'easy';
  }

  // Pick count distinct symbols from ALL_SWITCH_SYMBOLS
  const selectedSymbols = ALL_SWITCH_SYMBOLS.slice(0, count);
  // Pseudo-random shuffle based on level
  const input_symbols = [...selectedSymbols].sort((a, b) => {
    return ((a.charCodeAt(0) * 7 + level * 13) % 23) - ((b.charCodeAt(0) * 7 + level * 13) % 23);
  });

  // Helper to generate a non-identity permutation of [1...count]
  const generatePerm = (seedOffset = 0) => {
    const base = Array.from({ length: count }, (_, i) => i + 1);
    const perm = [...base].sort((a, b) => {
      return ((a * 17 + level * 29 + seedOffset * 37) % 31) - ((b * 17 + level * 29 + seedOffset * 37) % 31);
    });
    // Ensure not identical to base
    if (perm.every((v, i) => v === base[i])) {
      const tmp = perm[0];
      perm[0] = perm[1];
      perm[1] = tmp;
    }
    return perm;
  };

  const applyPerm = (symbols, perm) => {
    return perm.map((idx) => symbols[idx - 1]);
  };

  let intermediate_code = null;
  let correct_code = '';
  let output_symbols = [];

  if (mode === 'single') {
    const perm = generatePerm(1);
    correct_code = perm.join('');
    output_symbols = applyPerm(input_symbols, perm);
  } else {
    // Dual switch: Input -> Op1 (intermediate_code) -> Intermediate -> Op2 (correct_code) -> Output
    const perm1 = generatePerm(1);
    const perm2 = generatePerm(2);
    intermediate_code = perm1.join('');
    correct_code = perm2.join('');
    const intermediateSymbols = applyPerm(input_symbols, perm1);
    output_symbols = applyPerm(intermediateSymbols, perm2);
  }

  // Generate 3 distinct plausible distractors
  const distractors = new Set();
  const digits = correct_code.split('');

  // Distractor 1: Swap first two digits
  const d1 = [...digits];
  const t1 = d1[0]; d1[0] = d1[1]; d1[1] = t1;
  const d1Str = d1.join('');
  if (d1Str !== correct_code) distractors.add(d1Str);

  // Distractor 2: Swap last two digits
  const d2 = [...digits];
  const t2 = d2[count - 1]; d2[count - 1] = d2[count - 2]; d2[count - 2] = t2;
  const d2Str = d2.join('');
  if (d2Str !== correct_code) distractors.add(d2Str);

  // Distractor 3: Cycle shift
  const d3 = [digits[count - 1], ...digits.slice(0, count - 1)].join('');
  if (d3 !== correct_code) distractors.add(d3);

  // Fill up to 3 distractors with other random permutations if needed
  let attempt = 3;
  while (distractors.size < 3 && attempt < 10) {
    const alt = generatePerm(attempt).join('');
    if (alt !== correct_code) distractors.add(alt);
    attempt++;
  }

  const optionsList = [correct_code, ...Array.from(distractors).slice(0, 3)];
  // Shuffle options deterministically
  const options = optionsList.sort((a, b) => {
    return ((a.charCodeAt(0) * 11 + level * 19) % 29) - ((b.charCodeAt(0) * 11 + level * 19) % 29);
  });

  return {
    level,
    title: `Level ${level}: ${count}-Symbol ${mode === 'dual' ? 'Dual' : 'Single'} Switch`,
    mode,
    symbol_count: count,
    time_limit,
    points_award: 3,
    penalty_deduct: 1,
    input_symbols,
    intermediate_code,
    output_symbols,
    correct_code,
    options
  };
};

// 60 progressive default levels (50+ levels)
const defaultLevels = Array.from({ length: 60 }, (_, i) => generateSwitchLevel(i + 1));

const SwitchChallengeGame = ({
  gameData = null,
  puzzleData = null,
  isDark = true,
  onScoreUpdate,
  onMoveAction,
  onGameComplete,
  onComplete,
  onStartTimer,
  sessionToken,
  subEventId,
  initialScore = 0,
  maxTournamentScore = 100
}) => {
  // Determine levels list (ensure at least 60 levels)
  const [levelsList, setLevelsList] = useState(() => {
    const incoming = puzzleData || gameData?.levels || (Array.isArray(gameData) ? gameData : null);
    if (Array.isArray(incoming) && incoming.length > 0) {
      const list = [...incoming];
      while (list.length < 60) {
        list.push(generateSwitchLevel(list.length + 1));
      }
      return list;
    }
    return defaultLevels;
  });

  useEffect(() => {
    const incoming = puzzleData || gameData?.levels || (Array.isArray(gameData) ? gameData : null);
    if (Array.isArray(incoming) && incoming.length > 0) {
      const list = [...incoming];
      while (list.length < 60) {
        list.push(generateSwitchLevel(list.length + 1));
      }
      setLevelsList(list);
    }
  }, [puzzleData, gameData]);

  const levels = levelsList;

  // Game flow state
  const [hasStarted, setHasStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(initialScore);
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

    const logEntry = {
      level: currentLevel.level,
      action: 'timeout',
      correct_code: currentLevel.correct_code,
      scoreDelta: -1,
      timestamp: new Date().toISOString()
    };
    setMovesLog((prev) => [...prev, logEntry]);
    if (onMoveAction) onMoveAction(logEntry);

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

      const logEntry = {
        level: currentLevel.level,
        action: 'answer',
        selected: optionCode,
        correct: true,
        scoreDelta: points,
        timestamp: new Date().toISOString()
      };
      setMovesLog((prev) => [...prev, logEntry]);
      if (onMoveAction) onMoveAction(logEntry);

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

      const logEntry = {
        level: currentLevel.level,
        action: 'answer',
        selected: optionCode,
        correct: false,
        scoreDelta: -penalty,
        timestamp: new Date().toISOString()
      };
      setMovesLog((prev) => [...prev, logEntry]);
      if (onMoveAction) onMoveAction(logEntry);

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

  // Advance level (continues generating challenges until tournament timer ends)
  const advanceToNextLevel = (currentCalculatedScore) => {
    if (currentLevelIdx + 1 < levelsList.length) {
      setCurrentLevelIdx((prev) => prev + 1);
    } else {
      // Completed all defined levels: continuous challenge generation at master level!
      // DO NOT end game before timer ends!
      const nextLvlNum = levelsList.length + 1;
      const newLvl = generateSwitchLevel(nextLvlNum);
      setLevelsList((prev) => [...prev, newLvl]);
      setCurrentLevelIdx((prev) => prev + 1);
      toast.success(`🔥 Level ${nextLvlNum} Unlocked! Keep playing!`, { duration: 1200 });
    }
  };

  const handleStartGame = () => {
    setShowHowToPlay(false);
    setHasStarted(true);
    soundFX.init();
    soundFX.playClick();
    if (onStartTimer) onStartTimer();
  };

  return (
    <div className="w-full flex flex-col items-center justify-between text-slate-900 dark:text-white font-sans select-none max-w-4xl mx-auto">
      {/* FLOATING SCORE BAR ON TOP (Consistent Header) */}
      <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 mb-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
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
                {currentLevel?.mode === 'dual' ? 'Dual-Stage' : 'Single Switch'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              Level {currentLevelIdx + 1} of {levels.length} • Permutation Deduction
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
          <div className="relative flex items-center gap-1.5 px-3 py-1 bg-lime-500/10 dark:bg-zinc-800 border border-lime-500/30 dark:border-zinc-700 rounded-xl">
            <Trophy size={13} className="text-amber-500" />
            <span className="text-xs font-mono font-bold text-lime-700 dark:text-lime-400">
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

      {/* GAME ARENA CANVAS (NO BLUE AT BACKGROUND - SLEEK CHARCOAL/ZINC DARK THEME) */}
      <div className="w-full flex flex-col justify-between items-center rounded-3xl bg-[#141518] dark:bg-[#0c0d0f] text-white p-4 sm:p-6 shadow-2xl border border-zinc-800/80 overflow-hidden relative min-h-[460px]">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* TOP LEVEL: INPUT CODE ROW */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-900/90 px-3.5 py-0.5 rounded-full border border-zinc-700 mb-2.5 shadow-sm">
            Top Level (Input Code)
          </span>

          <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 rounded-2xl">
            {currentLevel?.input_symbols?.map((sym, idx) => (
              <div key={`input-${idx}`} className="flex flex-col items-center">
                <div className="w-13 h-13 sm:w-16 sm:h-16 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-white/90">
                  <SymbolIcon symbol={sym} size="md" />
                </div>
                <span className="mt-1 text-[10px] font-mono font-black text-zinc-300 bg-zinc-900/90 px-2 py-0.2 rounded border border-zinc-700">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>

          {/* DUAL-STAGE INTERMEDIATE OPERATOR PILL (Image 2 Reference) */}
          {currentLevel?.intermediate_code && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 flex flex-col items-center"
            >
              <div className="bg-white text-zinc-900 px-6 sm:px-8 py-1.5 sm:py-2 rounded-full font-mono font-black text-lg sm:text-xl tracking-widest shadow-xl border-2 border-slate-200">
                {currentLevel.intermediate_code}
              </div>
            </motion.div>
          )}
        </div>

        {/* CENTER TRANSFORMATION & CHOICE ARROWS */}
        <div className="relative z-10 my-3 w-full flex flex-col items-center">
          {/* Top Arrow pointing up */}
          <div className="flex flex-col items-center justify-center -mb-1">
            <svg viewBox="0 0 40 32" className="w-7 h-5 sm:w-8 sm:h-6 fill-lime-500">
              <polygon points="20,2 38,30 2,30" />
            </svg>
          </div>

          {/* Options Grid (4 White Cards) */}
          <div className="w-full max-w-xl py-1">
            <div className="text-center mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
                {currentLevel?.mode === 'dual' ? 'Select Second Switch Code' : 'Select Switch Code'} (Keys 1-4)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {currentLevel?.options?.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt === currentLevel.correct_code;

                // Card styling matching Image 1 & 2
                let cardStyle = "bg-white hover:bg-zinc-100 text-[#e11d48] hover:scale-[1.03] shadow-lg border-2 border-white/80";
                if (isSelected && feedbackStatus === 'correct') {
                  cardStyle = "bg-emerald-500 text-white scale-105 shadow-xl shadow-emerald-500/50 border-2 border-white ring-4 ring-emerald-300";
                } else if (isSelected && feedbackStatus === 'wrong') {
                  cardStyle = "bg-red-600 text-white animate-shake shadow-xl shadow-red-500/50 border-2 border-white";
                } else if (feedbackStatus === 'wrong' && isCorrect) {
                  cardStyle = "bg-emerald-500/90 text-white border-2 border-white animate-pulse";
                }

                return (
                  <motion.button
                    key={`opt-${idx}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOptionClick(opt)}
                    disabled={feedbackStatus !== null}
                    className={`relative rounded-xl p-2.5 sm:p-3 text-center font-mono font-black text-lg sm:text-2xl tracking-wider transition-all duration-200 cursor-pointer ${cardStyle}`}
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

          {/* Bottom Arrow pointing down */}
          <div className="flex flex-col items-center justify-center -mt-1">
            <svg viewBox="0 0 40 32" className="w-7 h-5 sm:w-8 sm:h-6 fill-lime-500">
              <polygon points="20,30 38,2 2,2" />
            </svg>
          </div>
        </div>

        {/* BOTTOM LEVEL: OUTPUT CODE ROW */}
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 rounded-2xl">
            {currentLevel?.output_symbols?.map((sym, idx) => (
              <div key={`output-${idx}`} className="flex flex-col items-center">
                <div className="w-13 h-13 sm:w-16 sm:h-16 bg-white rounded-xl shadow-lg flex items-center justify-center border-2 border-white/90">
                  <SymbolIcon symbol={sym} size="md" />
                </div>
              </div>
            ))}
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-900/90 px-3.5 py-0.5 rounded-full border border-zinc-700 mt-2.5 shadow-sm">
            Bottom Level (Output Code)
          </span>
        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="mt-3.5 w-full flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-500 font-bold">
            <CheckCircle2 size={13} /> {correctCount} Correct (+3)
          </span>
          <span className="flex items-center gap-1 text-rose-500 font-bold">
            <XCircle size={13} /> {wrongCount} Wrong (-1)
          </span>
        </div>
        <div className="font-mono text-[11px] text-zinc-500">
          Scoring: +3 pts for correct, -1 pt for wrong attempt • Press keys 1-4
        </div>
      </div>

      {/* INSTRUCTIONS / "HOW TO PLAY" MODAL (MATCHING IMAGE 1 & 2 INFO) */}
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
                <h3 className="text-2xl sm:text-3xl font-black text-lime-400 uppercase tracking-tight">
                  Switch Challenge
                </h3>
                <div className="inline-block px-3 py-0.5 rounded-full bg-white text-zinc-900 text-xs font-black uppercase tracking-wider shadow-sm">
                  Power of Logical Thinking
                </div>
              </div>

              {/* Instructions text */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-center">
                Here a few different symbols are displayed on both the top (input) and bottom (output) levels of the screen. Your task is to find the correct code of the output, based on the order of the input, from the given options in between the screen. For clear understanding observe the below practice.
              </p>

              {/* Practice demo box (Image 1 demo) */}
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-center">
                  {/* Input Code */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Input Order
                    </span>
                    <div className="flex items-center justify-center gap-1.5 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="triangle" size="xs" />
                        </div>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">1</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="square" size="xs" />
                        </div>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">2</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="circle" size="xs" />
                        </div>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">3</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="plus" size="xs" />
                        </div>
                        <span className="text-[9px] text-zinc-400 font-bold mt-0.5">4</span>
                      </div>
                    </div>
                  </div>

                  {/* Transformation Arrow & Answer */}
                  <div className="space-y-1 text-center">
                    <span className="text-xs font-mono font-bold text-zinc-300 block">
                      Answer : <strong className="text-lime-400 font-mono text-base">3142</strong>
                    </span>
                    <h4 className="text-xs font-black text-lime-400 uppercase tracking-wide">
                      Single &amp; Dual Switch
                    </h4>
                  </div>

                  {/* Output Code */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Output Target
                    </span>
                    <div className="flex items-center justify-center gap-1.5 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="circle" size="xs" />
                        </div>
                        <span className="text-[9px] text-lime-400 font-bold mt-0.5">3</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="triangle" size="xs" />
                        </div>
                        <span className="text-[9px] text-lime-400 font-bold mt-0.5">1</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="plus" size="xs" />
                        </div>
                        <span className="text-[9px] text-lime-400 font-bold mt-0.5">4</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                          <SymbolIcon symbol="square" size="xs" />
                        </div>
                        <span className="text-[9px] text-lime-400 font-bold mt-0.5">2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bullet rules */}
              <ul className="text-xs text-zinc-300 space-y-2 list-disc list-inside">
                <li><strong className="text-white">Time duration</strong> is 20 to 25 seconds for each round.</li>
                <li>In <strong className="text-white">Dual-Stage levels</strong>, apply the top pill code first, then find the code to reach the bottom row.</li>
                <li><strong className="text-lime-400">Three marks (+3)</strong> added for each correct attempt and <strong className="text-rose-400">one mark (-1)</strong> subtracted for wrong attempts.</li>
                <li>Use <strong className="text-white">keys 1, 2, 3, 4</strong> or click buttons directly.</li>
              </ul>

              {/* Play Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleStartGame}
                  className="w-full sm:w-64 py-3.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-zinc-950 font-black text-base uppercase tracking-widest rounded-2xl shadow-xl shadow-lime-500/20 hover:scale-[1.02] active:scale-95 transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
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
                  <span className="text-2xl font-black text-lime-400 font-mono">{score} PTS</span>
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
                  <span className="text-xl font-black text-lime-400 font-mono">
                    {correctCount + wrongCount > 0
                      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
                      : 100}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const summary = {
                    score,
                    maxScore: maxTournamentScore,
                    correctCount,
                    wrongCount,
                    maxStreak,
                    movesLog
                  };
                  if (onComplete) onComplete(summary);
                  if (onGameComplete) onGameComplete(summary);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-zinc-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-lime-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
              >
                Submit &amp; Proceed
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwitchChallengeGame;
