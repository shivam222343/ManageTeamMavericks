import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Target,
  Trophy,
  CheckCircle2,
  XCircle,
  Flame,
  Info,
  ChevronRight,
  RotateCcw,
  Clock,
  Volume2,
  VolumeX,
  HelpCircle,
  BrainCircuit,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// Web Audio API Synthesizer (Zero Latency)
class DeductiveSoundFX {
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

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, t); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.0, t + 0.12); // A5

      osc2.frequency.setValueAtTime(880.0, t);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, t + 0.15); // D6

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    } catch (e) {}
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.2);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }
}

const soundFX = new DeductiveSoundFX();

// Symbol Registry with pure SVG geometry matching the user's reference
export const DEDUCTIVE_SYMBOLS = {
  red_square: {
    id: 'red_square',
    label: 'Red Square',
    name: 'Square',
    color: '#DC2626',
    render: (size = 'md') => {
      const sizeClass = size === 'sm' ? 'w-6 h-6 sm:w-7 sm:h-7' : size === 'lg' ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-9 h-9 sm:w-11 sm:h-11';
      return (
        <div className={`${sizeClass} bg-[#DC2626] rounded-xs shadow-xs transition-transform`} />
      );
    }
  },
  blue_triangle: {
    id: 'blue_triangle',
    label: 'Blue Triangle',
    name: 'Triangle',
    color: '#0D47A1',
    render: (size = 'md') => {
      const sizeClass = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8' : size === 'lg' ? 'w-16 h-16 sm:w-18 sm:h-18' : 'w-10 h-10 sm:w-12 sm:h-12';
      return (
        <svg viewBox="0 0 100 100" className={sizeClass}>
          <polygon points="50,10 94,88 6,88" fill="#0D47A1" strokeLinejoin="round" />
        </svg>
      );
    }
  },
  green_circle: {
    id: 'green_circle',
    label: 'Green Circle',
    name: 'Circle',
    color: '#65A30D',
    render: (size = 'md') => {
      const sizeClass = size === 'sm' ? 'w-6 h-6 sm:w-7 sm:h-7' : size === 'lg' ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-9 h-9 sm:w-11 sm:h-11';
      return (
        <div className={`${sizeClass} rounded-full bg-[#65A30D] shadow-xs transition-transform`} />
      );
    }
  },
  purple_plus: {
    id: 'purple_plus',
    label: 'Purple Plus',
    name: 'Plus',
    color: '#7C3AED',
    render: (size = 'md') => {
      const sizeClass = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8' : size === 'lg' ? 'w-16 h-16 sm:w-18 sm:h-18' : 'w-10 h-10 sm:w-12 sm:h-12';
      return (
        <svg viewBox="0 0 100 100" className={sizeClass}>
          <path d="M36 10 H64 V36 H90 V64 H64 V90 H36 V64 H10 V36 H36 Z" fill="#7C3AED" />
        </svg>
      );
    }
  },
  amber_diamond: {
    id: 'amber_diamond',
    label: 'Amber Diamond',
    name: 'Diamond',
    color: '#D97706',
    render: (size = 'md') => {
      const sizeClass = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8' : size === 'lg' ? 'w-16 h-16 sm:w-18 sm:h-18' : 'w-10 h-10 sm:w-12 sm:h-12';
      return (
        <svg viewBox="0 0 100 100" className={sizeClass}>
          <polygon points="50,8 92,50 50,92 8,50" fill="#D97706" />
        </svg>
      );
    }
  }
};

const ALL_SYMBOL_KEYS = ['red_square', 'blue_triangle', 'green_circle', 'purple_plus', 'amber_diamond'];

// Procedural Latin Square Puzzle Generator with STRICT Single Question Mark and Dynamic Intersecting Clues
const generateProceduralPuzzle = (levelIndex = 0) => {
  // Dynamic progressive difficulty:
  // Levels 0-2 (Puzzles 1-3): 3x3 Grid (3 symbols)
  // Levels 3-9 (Puzzles 4-10): 4x4 Grid (4 symbols)
  // Levels 10+ (Puzzles 11+): 5x5 Grid (5 symbols)
  let gridSize = 3;
  if (levelIndex >= 10) gridSize = 5;
  else if (levelIndex >= 3) gridSize = 4;
  else gridSize = 3;

  const symbolKeys = ALL_SYMBOL_KEYS.slice(0, gridSize);

  // Generate valid full Latin square
  const fullGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      fullGrid[r][c] = symbolKeys[(r + c) % gridSize];
    }
  }

  // Shuffle rows
  for (let i = gridSize - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = fullGrid[i];
    fullGrid[i] = fullGrid[j];
    fullGrid[j] = temp;
  }

  // Shuffle columns
  for (let i = gridSize - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    for (let r = 0; r < gridSize; r++) {
      const temp = fullGrid[r][i];
      fullGrid[r][i] = fullGrid[r][j];
      fullGrid[r][j] = temp;
    }
  }

  // Random symbol permutation
  const shuffledKeys = [...symbolKeys].sort(() => Math.random() - 0.5);
  const symbolMap = {};
  symbolKeys.forEach((key, idx) => {
    symbolMap[key] = shuffledKeys[idx];
  });

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      fullGrid[r][c] = symbolMap[fullGrid[r][c]];
    }
  }

  // Pick target cell for the SINGLE '?'
  const targetR = Math.floor(Math.random() * gridSize);
  const targetC = Math.floor(Math.random() * gridSize);
  const correctSymbol = fullGrid[targetR][targetC];

  // Initialize display grid
  const displayGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

  // Determine other symbols present in target's row & column
  const otherRowCells = [];
  for (let c = 0; c < gridSize; c++) {
    if (c !== targetC) {
      otherRowCells.push({ r: targetR, c, sym: fullGrid[targetR][c] });
    }
  }

  const otherColCells = [];
  for (let r = 0; r < gridSize; r++) {
    if (r !== targetR) {
      otherColCells.push({ r, c: targetC, sym: fullGrid[r][targetC] });
    }
  }

  // Shuffle row/column cells to vary clue locations
  otherRowCells.sort(() => Math.random() - 0.5);
  otherColCells.sort(() => Math.random() - 0.5);

  const eliminatedSymbols = new Set();

  if (gridSize === 3) {
    if (levelIndex === 0 && Math.random() < 0.5) {
      // Warmup level: 2 clues in row OR 2 clues in col
      if (Math.random() < 0.5) {
        otherRowCells.forEach(cell => { displayGrid[cell.r][cell.c] = cell.sym; });
      } else {
        otherColCells.forEach(cell => { displayGrid[cell.r][cell.c] = cell.sym; });
      }
    } else {
      // Intersecting Cross: 1 in row, 1 in column (never all in one row!)
      const rPick = otherRowCells[0];
      displayGrid[rPick.r][rPick.c] = rPick.sym;
      eliminatedSymbols.add(rPick.sym);

      // Find col cell with DIFFERENT symbol
      const cPick = otherColCells.find(c => c.sym !== rPick.sym) || otherColCells[0];
      displayGrid[cPick.r][cPick.c] = cPick.sym;
      eliminatedSymbols.add(cPick.sym);
    }

    // Add 1-2 background clues in outside cells for visual richness and diverse layouts
    const outsideCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r !== targetR && c !== targetC) {
          outsideCells.push({ r, c, sym: fullGrid[r][c] });
        }
      }
    }
    outsideCells.sort(() => Math.random() - 0.5);
    const extraCount = Math.random() < 0.6 ? 2 : 1;
    for (let i = 0; i < Math.min(extraCount, outsideCells.length); i++) {
      const cell = outsideCells[i];
      displayGrid[cell.r][cell.c] = cell.sym;
    }
  } else if (gridSize === 4) {
    // 4x4 Grid (4 symbols):
    // Crucial: DO NOT place all 3 clues in the target row!
    // Instead, use cross-intersection (e.g., 2 in row + 1 in col, or 1 in row + 2 in col)
    const isRowDominant = Math.random() < 0.5;

    if (isRowDominant) {
      // 2 in row, 1 in col
      const r1 = otherRowCells[0];
      const r2 = otherRowCells[1];
      displayGrid[r1.r][r1.c] = r1.sym;
      displayGrid[r2.r][r2.c] = r2.sym;
      eliminatedSymbols.add(r1.sym);
      eliminatedSymbols.add(r2.sym);

      // Pick col cell with the remaining un-eliminated symbol
      const cPick = otherColCells.find(c => !eliminatedSymbols.has(c.sym)) || otherColCells[0];
      displayGrid[cPick.r][cPick.c] = cPick.sym;
      eliminatedSymbols.add(cPick.sym);
    } else {
      // 1 in row, 2 in col
      const c1 = otherColCells[0];
      const c2 = otherColCells[1];
      displayGrid[c1.r][c1.c] = c1.sym;
      displayGrid[c2.r][c2.c] = c2.sym;
      eliminatedSymbols.add(c1.sym);
      eliminatedSymbols.add(c2.sym);

      // Pick row cell with the remaining un-eliminated symbol
      const rPick = otherRowCells.find(r => !eliminatedSymbols.has(r.sym)) || otherRowCells[0];
      displayGrid[rPick.r][rPick.c] = rPick.sym;
      eliminatedSymbols.add(rPick.sym);
    }

    // Add 2-4 background context clues in the rest of the 4x4 grid
    const outsideCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r !== targetR && c !== targetC && !displayGrid[r][c]) {
          outsideCells.push({ r, c, sym: fullGrid[r][c] });
        }
      }
    }
    outsideCells.sort(() => Math.random() - 0.5);
    const extraCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 extra clues
    for (let i = 0; i < Math.min(extraCount, outsideCells.length); i++) {
      const cell = outsideCells[i];
      displayGrid[cell.r][cell.c] = cell.sym;
    }
  } else {
    // 5x5 Grid (5 symbols):
    // 2 in row, 2 in col (ruling out all 4 other symbols through cross intersection)
    const r1 = otherRowCells[0];
    const r2 = otherRowCells[1];
    displayGrid[r1.r][r1.c] = r1.sym;
    displayGrid[r2.r][r2.c] = r2.sym;
    eliminatedSymbols.add(r1.sym);
    eliminatedSymbols.add(r2.sym);

    const remainingCols = otherColCells.filter(c => !eliminatedSymbols.has(c.sym));
    if (remainingCols.length >= 2) {
      displayGrid[remainingCols[0].r][remainingCols[0].c] = remainingCols[0].sym;
      displayGrid[remainingCols[1].r][remainingCols[1].c] = remainingCols[1].sym;
    } else {
      otherColCells.slice(0, 2).forEach(c => {
        displayGrid[c.r][c.c] = c.sym;
      });
    }

    // Add 4-6 background clues
    const outsideCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r !== targetR && c !== targetC && !displayGrid[r][c]) {
          outsideCells.push({ r, c, sym: fullGrid[r][c] });
        }
      }
    }
    outsideCells.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(5, outsideCells.length); i++) {
      const cell = outsideCells[i];
      displayGrid[cell.r][cell.c] = cell.sym;
    }
  }

  // Set the single target cell with special identifier
  displayGrid[targetR][targetC] = '?';

  // Shuffle options
  const options = [...symbolKeys].sort(() => Math.random() - 0.5);

  return {
    level: levelIndex + 1,
    gridSize,
    displayGrid,
    targetCell: { r: targetR, c: targetC },
    correctSymbol,
    options,
    fullSolution: fullGrid
  };
};

const DeductiveChallengeGame = ({
  gameData = {},
  isDark = true,
  onScoreUpdate,
  onGameComplete,
  onStartTimer,
  sessionToken,
  subEventId,
  initialScore = 0
}) => {
  // Game Duration (Official: 4 minutes = 240 seconds)
  const totalDuration = gameData?.duration_seconds || 240;
  const [remainingTime, setRemainingTime] = useState(totalDuration);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Scoring & Stats (+1 correct, -1 wrong)
  const [score, setScore] = useState(initialScore);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  // Active Puzzle State
  const [currentPuzzleIdx, setCurrentPuzzleIdx] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState(() => generateProceduralPuzzle(0));
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // 'correct' | 'wrong' | null
  const [scoreDelta, setScoreDelta] = useState(null); // '+1' | '-1' | null

  const timerRef = useRef(null);
  const movesLogRef = useRef([]);

  // Sync audio mute
  useEffect(() => {
    soundFX.muted = isMuted;
  }, [isMuted]);

  // Main countdown timer
  useEffect(() => {
    if (!hasStarted || isGameOver) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, isGameOver]);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (onGameComplete) {
      onGameComplete({
        score,
        correctCount,
        wrongCount,
        maxStreak,
        movesLog: movesLogRef.current
      });
    }
  }, [score, correctCount, wrongCount, maxStreak, onGameComplete]);

  // Handle Option Click
  const handleSelectSymbol = (symbolKey) => {
    if (isGameOver || feedbackStatus !== null) return;

    soundFX.init();
    setSelectedOption(symbolKey);

    const isCorrect = symbolKey === currentPuzzle.correctSymbol;

    const moveRecord = {
      puzzleIndex: currentPuzzleIdx,
      gridSize: currentPuzzle.gridSize,
      target: currentPuzzle.targetCell,
      chosen: symbolKey,
      expected: currentPuzzle.correctSymbol,
      isCorrect,
      timestamp: new Date().toISOString()
    };
    movesLogRef.current.push(moveRecord);

    if (isCorrect) {
      soundFX.playCorrect();
      setFeedbackStatus('correct');
      setScoreDelta('+1');

      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setCorrectCount((prev) => prev + 1);
      setStreak(newStreak);
      setMaxStreak((prev) => Math.max(prev, newStreak));

      if (onScoreUpdate) onScoreUpdate(newScore);

      // Smooth fast transition to next puzzle (380ms)
      setTimeout(() => {
        const nextIdx = currentPuzzleIdx + 1;
        setCurrentPuzzleIdx(nextIdx);
        setCurrentPuzzle(generateProceduralPuzzle(nextIdx));
        setSelectedOption(null);
        setFeedbackStatus(null);
        setScoreDelta(null);
      }, 380);
    } else {
      soundFX.playWrong();
      setFeedbackStatus('wrong');
      setScoreDelta('-1');

      const newScore = Math.max(0, score - 1);
      setScore(newScore);
      setWrongCount((prev) => prev + 1);
      setStreak(0);

      if (onScoreUpdate) onScoreUpdate(newScore);

      // Short shake feedback before allowing next attempt or auto-advancing
      setTimeout(() => {
        setSelectedOption(null);
        setFeedbackStatus(null);
        setScoreDelta(null);
      }, 450);
    }
  };

  // Keyboard Shortcuts (1, 2, 3, 4, 5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!hasStarted || showHowToPlay || isGameOver || feedbackStatus !== null) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= currentPuzzle.options.length) {
        const opt = currentPuzzle.options[num - 1];
        if (opt) handleSelectSymbol(opt);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, showHowToPlay, isGameOver, feedbackStatus, currentPuzzle]);

  const handleStartGame = () => {
    setShowHowToPlay(false);
    setHasStarted(true);
    soundFX.init();
    soundFX.playClick();
    if (onStartTimer) onStartTimer();
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col items-center justify-between text-slate-900 dark:text-white font-sans select-none max-w-4xl mx-auto">
      {/* FREE SCORE BAR ON TOP (Compact & Floating) */}
      <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 mb-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold">
            <BrainCircuit size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Deductive Challenge
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                Processing Speed
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              Puzzle #{currentPuzzleIdx + 1} ({currentPuzzle.gridSize}x{currentPuzzle.gridSize}) • +1 Correct / -1 Wrong
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

            {/* Floating Score Delta Animation (+1 / -1) */}
            <AnimatePresence>
              {scoreDelta && (
                <motion.span
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -18, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute -top-1 right-2 text-xs font-black font-mono px-1.5 py-0.2 rounded-md ${
                    scoreDelta === '+1' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {scoreDelta}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Timer Countdown Pill */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border font-mono text-xs font-bold ${
            remainingTime <= 30
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
              : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
          }`}>
            <Clock size={12} />
            <span>{formatTimer(remainingTime)}</span>
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

      {/* GAMEPLAY CANVAS AREA */}
      <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-100/90 dark:bg-zinc-900/60 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-inner">
        {/* Title Prompt (Matching image: "Please choose the correct answer") */}
        <div className="text-center mb-4 sm:mb-5">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-zinc-100 tracking-tight">
            Please choose the correct answer
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
            Neither a row nor a column can have repeating symbols. What replaces <span className="font-bold text-orange-500">?</span>
          </p>
        </div>

        {/* LATIN SQUARE MATRIX GRID */}
        <div className="relative p-3 sm:p-4 bg-slate-200/80 dark:bg-zinc-950/80 rounded-2xl border border-slate-300 dark:border-zinc-800/80 shadow-md">
          <div
            className="grid gap-2.5 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(${currentPuzzle.gridSize}, minmax(0, 1fr))`
            }}
          >
            {currentPuzzle.displayGrid.map((row, r) =>
              row.map((cellSym, c) => {
                const isTarget = r === currentPuzzle.targetCell.r && c === currentPuzzle.targetCell.c;
                const symDef = cellSym && cellSym !== '?' ? DEDUCTIVE_SYMBOLS[cellSym] : null;

                let cellHighlight = 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-sm';
                if (isTarget) {
                  if (feedbackStatus === 'correct') {
                    cellHighlight = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-4 ring-emerald-500/30';
                  } else if (feedbackStatus === 'wrong') {
                    cellHighlight = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-4 ring-rose-500/30 animate-shake';
                  } else {
                    cellHighlight = 'bg-white dark:bg-zinc-900 border-orange-400 dark:border-orange-500 ring-2 ring-orange-500/20 shadow-md';
                  }
                }

                return (
                  <motion.div
                    key={`cell-${r}-${c}`}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl border flex items-center justify-center transition-all ${cellHighlight}`}
                  >
                    {isTarget && feedbackStatus === 'correct' && selectedOption ? (
                      DEDUCTIVE_SYMBOLS[selectedOption]?.render('md')
                    ) : isTarget ? (
                      <span className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-zinc-200 select-none">
                        ?
                      </span>
                    ) : symDef ? (
                      symDef.render('md')
                    ) : null}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* SELECTABLE OPTIONS ROW BELOW MATRIX (Matching Image 2) */}
        <div className="mt-6 sm:mt-8 w-full max-w-md flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {currentPuzzle.options.map((optKey, idx) => {
              const sym = DEDUCTIVE_SYMBOLS[optKey];
              const isSelected = selectedOption === optKey;

              let btnStyle = 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border-slate-300 dark:border-zinc-700 hover:border-slate-400 shadow-md';
              if (isSelected && feedbackStatus === 'correct') {
                btnStyle = 'bg-emerald-500 border-emerald-400 text-white ring-4 ring-emerald-300 scale-105 shadow-lg';
              } else if (isSelected && feedbackStatus === 'wrong') {
                btnStyle = 'bg-rose-500 border-rose-400 text-white ring-4 ring-rose-300 animate-shake shadow-lg';
              }

              return (
                <motion.button
                  key={`opt-${optKey}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectSymbol(optKey)}
                  disabled={feedbackStatus !== null}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  title={`${sym.label} (Press ${idx + 1})`}
                >
                  <span className="absolute top-1 left-2 text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">
                    #{idx + 1}
                  </span>
                  {sym.render('md')}
                </motion.button>
              );
            })}
          </div>

          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-2.5">
            Click option or press keys 1, 2, 3 on keyboard
          </span>
        </div>
      </div>

      {/* HOW TO PLAY & RULES MODAL (Exact instructions from reference image 1) */}
      {(showHowToPlay || !hasStarted) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-700 text-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl"
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-orange-400 tracking-tight">
                Deductive Challenge
              </h2>
              <div className="inline-block px-3 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-bold font-mono">
                Processing Speed
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-center">
              At the beginning of the game, a matrix like 3×3, 4×4, 5×5 etc is displayed on the screen with different symbols. To make it a valid Latin square matrix, you have to select the appropriate symbol for the single <span className="font-bold text-orange-400">?</span> from the options given below.
            </p>

            {/* How to Play Rules */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2.5 text-xs text-zinc-300">
              <h4 className="font-bold text-orange-400 uppercase text-xs tracking-wider">How to Play:</h4>
              <ul className="space-y-1.5 list-disc pl-4 text-[11px] sm:text-xs">
                <li><span className="font-semibold text-white">Time duration</span> is 4 minutes.</li>
                <li><span className="font-semibold text-white">Neither a row nor a column</span> should have similar/repeating symbols.</li>
                <li><span className="font-semibold text-emerald-400">One mark (+1)</span> is added for each correct attempt.</li>
                <li><span className="font-semibold text-rose-400">One mark (-1)</span> is subtracted for each wrong attempt.</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{hasStarted ? 'Resume Challenge' : 'Play'}</span>
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      )}

      {/* GAME OVER SUMMARY MODAL */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-700 text-white rounded-3xl w-full max-w-md p-6 sm:p-8 text-center space-y-5 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Trophy size={28} />
            </div>

            <div>
              <h3 className="text-xl font-bold font-mono uppercase">Deductive Challenge Complete</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Your logical deduction answers have been verified and recorded.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs font-mono">
              <div className="text-center">
                <span className="text-zinc-500 block text-[10px] uppercase">Final Score</span>
                <span className="text-lg font-bold text-amber-400">{score}</span>
              </div>
              <div className="text-center">
                <span className="text-zinc-500 block text-[10px] uppercase">Accuracy</span>
                <span className="text-lg font-bold text-emerald-400">
                  {correctCount + wrongCount > 0 ? `${Math.round((correctCount / (correctCount + wrongCount)) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-zinc-500 block text-[10px] uppercase">Max Streak</span>
                <span className="text-lg font-bold text-orange-400">{maxStreak}x</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGameOver}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Continue Next Game
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeductiveChallengeGame;
