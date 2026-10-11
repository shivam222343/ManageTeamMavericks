import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Square as SquareIcon,
  Plus as PlusIcon,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Diamond as DiamondIcon,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Zap,
  Sparkles
} from 'lucide-react';

// Web Audio synthesizer for instant responsive feedback sound
const playFeedbackChime = (isCorrect) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isCorrect) {
      // High bright chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Low buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    // Ignore autoplay restriction
  }
};

// Symbol dictionary with crisp colors matching reference
const SYMBOLS = {
  plus: {
    label: 'Plus',
    icon: PlusIcon,
    color: 'text-blue-500',
    fillColor: 'text-blue-500',
    cellBg: 'bg-white dark:bg-zinc-900 border-blue-400/40 text-blue-500 shadow-sm'
  },
  square: {
    label: 'Square',
    icon: SquareIcon,
    color: 'text-red-500',
    fillColor: 'text-red-500',
    cellBg: 'bg-white dark:bg-zinc-900 border-red-400/40 text-red-500 shadow-sm'
  },
  circle: {
    label: 'Circle',
    icon: CircleIcon,
    color: 'text-emerald-500',
    fillColor: 'text-emerald-500',
    cellBg: 'bg-white dark:bg-zinc-900 border-emerald-400/40 text-emerald-500 shadow-sm'
  },
  triangle: {
    label: 'Triangle',
    icon: TriangleIcon,
    color: 'text-indigo-500',
    fillColor: 'text-indigo-500',
    cellBg: 'bg-white dark:bg-zinc-900 border-indigo-400/40 text-indigo-500 shadow-sm'
  },
  diamond: {
    label: 'Diamond',
    icon: DiamondIcon,
    color: 'text-amber-500',
    fillColor: 'text-amber-500',
    cellBg: 'bg-white dark:bg-zinc-900 border-amber-400/40 text-amber-500 shadow-sm'
  }
};

const ALL_SYMBOL_KEYS = ['plus', 'square', 'circle', 'triangle', 'diamond'];

// Algorithm: Generate guaranteed valid Latin Square with single random '?' hole
export const generateSingleHoleLatinSquare = (level) => {
  let n = 3;
  if (level > 15) {
    n = 5;
  } else if (level > 5) {
    n = 4;
  }

  const symbols = ALL_SYMBOL_KEYS.slice(0, n);

  // 1. Base cyclic matrix
  const matrix = [];
  for (let r = 0; r < n; r++) {
    matrix[r] = [];
    for (let c = 0; c < n; c++) {
      matrix[r][c] = (r + c) % n;
    }
  }

  // 2. Permute rows
  const rowOrder = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
  const permutedRows = rowOrder.map((r) => matrix[r]);

  // 3. Permute columns
  const colOrder = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
  const grid = [];
  for (let r = 0; r < n; r++) {
    grid[r] = [];
    for (let c = 0; c < n; c++) {
      grid[r][c] = permutedRows[r][colOrder[c]];
    }
  }

  // 4. Randomly map symbol keys
  const shuffledSymbols = [...symbols].sort(() => Math.random() - 0.5);
  const solution = [];
  for (let r = 0; r < n; r++) {
    solution[r] = [];
    for (let c = 0; c < n; c++) {
      solution[r][c] = shuffledSymbols[grid[r][c]];
    }
  }

  // 5. Pick exactly ONE target hole
  const targetR = Math.floor(Math.random() * n);
  const targetC = Math.floor(Math.random() * n);
  const correctSymbol = solution[targetR][targetC];

  // 6. Clues grid contains only 1 null for '?'
  const cluesGrid = solution.map((row) => [...row]);
  cluesGrid[targetR][targetC] = null;

  return {
    id: `p_${level}_${Math.random().toString(36).substring(2, 7)}`,
    level,
    grid_size: n,
    symbols: shuffledSymbols,
    target_pos: { r: targetR, c: targetC },
    correct_symbol: correctSymbol,
    clues_grid: cluesGrid,
    solution
  };
};

export default function DeductiveChallengeGame({
  gameData = [],
  isDark = true,
  initialScore = 0,
  onStartTimer,
  onScoreUpdate,
  onMoveAction
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [puzzlesList, setPuzzlesList] = useState([]);
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [feedback, setFeedback] = useState(null); // { status: 'correct' | 'wrong', symbol: string }
  const [score, setScore] = useState(initialScore);
  const isTransitioningRef = useRef(false);

  // Initialize puzzles from server or generator
  useEffect(() => {
    let initialList = [];
    if (Array.isArray(gameData) && gameData.length > 0) {
      // Validate if server puzzles have single-hole structure
      initialList = gameData.map((p, idx) => {
        if (p.grid_size && p.correct_symbol && p.clues_grid) return p;
        return generateSingleHoleLatinSquare(idx + 1);
      });
    } else {
      // Generate initial pool of 35 progressive challenges
      for (let i = 1; i <= 35; i++) {
        initialList.push(generateSingleHoleLatinSquare(i));
      }
    }
    setPuzzlesList(initialList);
    setCurrentPuzzle(initialList[0] || generateSingleHoleLatinSquare(1));
    setCurrentLevel(1);
  }, [gameData]);

  // Handle Play start
  const handleStartGame = () => {
    setHasStarted(true);
    if (onStartTimer) {
      onStartTimer();
    }
  };

  // Process user symbol selection
  const handleSelectSymbol = (symbolKey) => {
    if (!currentPuzzle || isTransitioningRef.current || feedback !== null) return;
    isTransitioningRef.current = true;

    const isCorrect = symbolKey === currentPuzzle.correct_symbol;
    playFeedbackChime(isCorrect);

    if (isCorrect) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (onScoreUpdate) onScoreUpdate(nextScore);
      setFeedback({ status: 'correct', symbol: symbolKey });

      if (onMoveAction) {
        onMoveAction({
          level: currentLevel,
          chosen: symbolKey,
          correct: true,
          correct_symbol: currentPuzzle.correct_symbol,
          timestamp: Date.now()
        });
      }

      // Fast responsive transition (250ms)
      setTimeout(() => {
        advanceNextPuzzle();
      }, 250);
    } else {
      const nextScore = Math.max(0, score - 1);
      setScore(nextScore);
      if (onScoreUpdate) onScoreUpdate(nextScore);
      setFeedback({ status: 'wrong', symbol: symbolKey });

      if (onMoveAction) {
        onMoveAction({
          level: currentLevel,
          chosen: symbolKey,
          correct: false,
          correct_symbol: currentPuzzle.correct_symbol,
          timestamp: Date.now()
        });
      }

      // 350ms delay on error then auto-advance to keep speed
      setTimeout(() => {
        advanceNextPuzzle();
      }, 350);
    }
  };

  // Advance to next progressive challenge
  const advanceNextPuzzle = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    setFeedback(null);
    isTransitioningRef.current = false;

    // Check if next puzzle already exists in pool
    if (puzzlesList[nextLevel - 1]) {
      setCurrentPuzzle(puzzlesList[nextLevel - 1]);
    } else {
      // Dynamically generate new random challenge
      const dynamicPuzzle = generateSingleHoleLatinSquare(nextLevel);
      setPuzzlesList((prev) => [...prev, dynamicPuzzle]);
      setCurrentPuzzle(dynamicPuzzle);
    }
  };

  // ==========================================
  // SCREEN 1: HOW TO PLAY / INTRO (MATCHING IMAGE 1)
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="w-full max-w-3xl mx-auto my-2">
        {/* Dark Charcoal / Neutral Slate Container (No blue bg) */}
        <div className="relative rounded-2xl bg-zinc-900 border border-zinc-700/60 p-6 sm:p-10 shadow-2xl text-white overflow-hidden">
          {/* Header Title */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-500 tracking-wide">
              Deductive Challenge
            </h2>

            <div>
              <span className="inline-block bg-white text-zinc-950 font-bold text-xs uppercase px-4 py-1 rounded-full shadow-sm">
                Processing Speed
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl mx-auto pt-2">
              At the beginning of the game, a matrix like 3×3, 4×4, 5×5 etc is displayed on the screen with different symbols. To complete the picturesque matrix, select the appropriate symbol for the missing cell from the options below.
            </p>
          </div>

          {/* How to Play Section */}
          <div className="mt-8 pt-6 border-t border-zinc-700/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-amber-500">
                How to Play
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">*</span>
                  <span>Time duration is 4 minutes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">*</span>
                  <span>Neither a row nor a column should have similar symbols.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">*</span>
                  <span>One mark is added for each correct attempt and one mark is subtracted for each wrong attempt.</span>
                </li>
              </ul>
            </div>

            {/* Thumbnail Preview Mini Matrix */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-2 border-2 border-zinc-400 shadow-md grid grid-cols-3 gap-1 shrink-0 items-center justify-center">
              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <SquareIcon className="w-4 h-4 text-red-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <PlusIcon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <CircleIcon className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <CircleIcon className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border border-zinc-200 bg-red-500/10">
                <SquareIcon className="w-4 h-4 text-red-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <PlusIcon className="w-4 h-4 text-blue-500" />
              </div>

              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <PlusIcon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border border-zinc-200">
                <CircleIcon className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="w-full h-full flex items-center justify-center border-2 border-amber-500 bg-amber-500/10 text-amber-600 font-black font-mono text-xs">
                ?
              </div>
            </div>
          </div>

          {/* Action Button: Orange Play Button Matching Screenshot */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-16 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-lg tracking-wider rounded-xl shadow-xl hover:shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-400/30"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Play</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: ACTIVE DEDUCTIVE CHALLENGE GAMEPLAY
  // ==========================================
  const gridSize = currentPuzzle?.grid_size || 3;
  const cluesGrid = currentPuzzle?.clues_grid || [];
  const activeSymbols = currentPuzzle?.symbols || ALL_SYMBOL_KEYS.slice(0, gridSize);

  // Dynamic Tailwind grid columns class
  const gridColsClass =
    gridSize === 3 ? 'grid-cols-3' : gridSize === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Telemetry Strip: Low text, clean badges */}
      <div className="flex items-center justify-between px-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold">
            #{currentLevel} ({gridSize}×{gridSize})
          </span>
          <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            Latin Square Deduction
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Score: {score}</span>
          </span>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-7 shadow-2xl flex flex-col items-center justify-center space-y-6">
        {/* Latin Square Matrix Grid */}
        <div
          className={`grid ${gridColsClass} gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner`}
        >
          {cluesGrid.map((row, r) =>
            row.map((cellKey, c) => {
              const isTargetHole = cellKey === null || cellKey === undefined;
              const symbolObj = cellKey ? SYMBOLS[cellKey] : null;
              const IconComp = symbolObj?.icon;

              if (isTargetHole) {
                // The SINGLE Question Mark Cell
                return (
                  <motion.div
                    key={`hole-${r}-${c}`}
                    animate={
                      feedback?.status === 'wrong'
                        ? { x: [-6, 6, -4, 4, 0] }
                        : feedback?.status === 'correct'
                        ? { scale: [1, 1.15, 1] }
                        : { scale: [1, 1.03, 1] }
                    }
                    transition={{
                      duration: feedback ? 0.3 : 2,
                      repeat: feedback ? 0 : Infinity
                    }}
                    className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl border-2 flex items-center justify-center transition-all ${
                      feedback?.status === 'correct'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30'
                        : feedback?.status === 'wrong'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-400 ring-4 ring-rose-500/30'
                        : 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    }`}
                  >
                    {feedback?.symbol ? (
                      React.createElement(SYMBOLS[feedback.symbol]?.icon || HelpCircle, {
                        className: `w-7 h-7 sm:w-10 sm:h-10 ${
                          SYMBOLS[feedback.symbol]?.color || 'text-white'
                        }`
                      })
                    ) : (
                      <span className="font-mono text-2xl sm:text-4xl font-black text-amber-400">
                        ?
                      </span>
                    )}
                  </motion.div>
                );
              }

              // Normal Clue Cell
              return (
                <div
                  key={`cell-${r}-${c}`}
                  className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl border border-zinc-700/60 bg-zinc-900/90 flex items-center justify-center shadow-sm"
                >
                  {IconComp && (
                    <IconComp
                      className={`w-7 h-7 sm:w-10 sm:h-10 stroke-[2.2] ${symbolObj.color}`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Options Palette: Low text, icons only in buttons */}
        <div className="w-full pt-2 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {activeSymbols.map((key) => {
              const item = SYMBOLS[key];
              const Icon = item?.icon || SquareIcon;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => handleSelectSymbol(key)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-zinc-700 hover:border-amber-500 bg-zinc-950 flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer shadow-lg disabled:opacity-40 hover:shadow-amber-500/20 ${item?.color}`}
                  title={item?.label}
                  aria-label={item?.label}
                >
                  <Icon className="w-7 h-7 sm:w-9 sm:h-9 stroke-[2.5]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
