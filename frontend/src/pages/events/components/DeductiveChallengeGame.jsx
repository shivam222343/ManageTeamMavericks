import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Sparkles,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

// Web Audio synthesizer for instant responsive feedback chime
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
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
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

// Solid Shape Renderers matching the reference image
const renderSolidShape = (key, sizeClass = 'w-9 h-9 sm:w-12 sm:h-12') => {
  switch (key) {
    case 'circle':
      // Solid Olive/Forest Green Circle as in screenshot
      return <div className={`${sizeClass} bg-[#658215] rounded-full shadow-sm shrink-0`} />;
    case 'triangle':
      // Solid Royal Blue Triangle as in screenshot
      return (
        <svg viewBox="0 0 24 24" className={`${sizeClass} text-[#003da5] fill-current shrink-0`}>
          <polygon points="12 2 22 21 2 21" />
        </svg>
      );
    case 'square':
      // Solid Red Square as in screenshot
      return <div className={`${sizeClass} bg-[#e01a22] rounded-none shadow-sm shrink-0`} />;
    case 'plus':
      // Solid Blue / Cyan Plus
      return (
        <svg viewBox="0 0 24 24" className={`${sizeClass} text-[#0284c7] shrink-0`}>
          <path
            d="M12 3v18M3 12h18"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="square"
          />
        </svg>
      );
    case 'diamond':
      // Solid Amber / Gold Diamond
      return <div className={`${sizeClass} bg-[#d97706] rotate-45 rounded-none shadow-sm shrink-0 transform scale-75`} />;
    default:
      return null;
  }
};

const SYMBOLS_META = {
  circle: { label: 'Circle' },
  triangle: { label: 'Triangle' },
  square: { label: 'Square' },
  plus: { label: 'Plus' },
  diamond: { label: 'Diamond' }
};

// 3 symbols for 3x3 matching user screenshot: circle, triangle, square
const BASE_3_SYMBOLS = ['circle', 'triangle', 'square'];
const ALL_SYMBOL_KEYS = ['circle', 'triangle', 'square', 'plus', 'diamond'];

// Deductive solver to verify that target cell (tr, tc) has strictly 1 unique candidate
function solveTargetCandidates(n, symbols, grid, tr, tc) {
  const candidates = [];
  for (let r = 0; r < n; r++) {
    candidates[r] = [];
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== null && grid[r][c] !== '?') {
        candidates[r][c] = [grid[r][c]];
      } else {
        candidates[r][c] = [...symbols];
      }
    }
  }

  let changed = true;
  let steps = 0;
  while (changed && steps < 15) {
    changed = false;
    steps++;

    // Row & Col elimination
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (candidates[r][c].length > 1) {
          const fixed = new Set();
          for (let c2 = 0; c2 < n; c2++) {
            if (c2 !== c && candidates[r][c2].length === 1) fixed.add(candidates[r][c2][0]);
          }
          for (let r2 = 0; r2 < n; r2++) {
            if (r2 !== r && candidates[r2][c].length === 1) fixed.add(candidates[r2][c][0]);
          }

          const before = candidates[r][c].length;
          candidates[r][c] = candidates[r][c].filter((sym) => !fixed.has(sym));
          if (candidates[r][c].length < before) changed = true;
        }
      }
    }

    // Hidden singles in rows
    for (let r = 0; r < n; r++) {
      for (const sym of symbols) {
        const possibleCols = [];
        for (let c = 0; c < n; c++) {
          if (candidates[r][c].includes(sym)) possibleCols.push(c);
        }
        if (possibleCols.length === 1 && candidates[r][possibleCols[0]].length > 1) {
          candidates[r][possibleCols[0]] = [sym];
          changed = true;
        }
      }
    }

    // Hidden singles in cols
    for (let c = 0; c < n; c++) {
      for (const sym of symbols) {
        const possibleRows = [];
        for (let r = 0; r < n; r++) {
          if (candidates[r][c].includes(sym)) possibleRows.push(r);
        }
        if (possibleRows.length === 1 && candidates[possibleRows[0]][c].length > 1) {
          candidates[possibleRows[0]][c] = [sym];
          changed = true;
        }
      }
    }

    if (candidates[tr][tc].length === 1) break;
  }

  return candidates[tr][tc];
}

// Algorithm: Generate guaranteed valid Latin Square with random EMPTY cells and a single '?'
export const generateSingleHoleLatinSquare = (level) => {
  let n = 3;
  if (level > 15) {
    n = 5;
  } else if (level > 5) {
    n = 4;
  }

  const symbols = n === 3 ? [...BASE_3_SYMBOLS] : ALL_SYMBOL_KEYS.slice(0, n);

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

  // 6. Start clues grid with solution, set target to '?'
  const cluesGrid = solution.map((row) => [...row]);
  cluesGrid[targetR][targetC] = '?';

  // 7. Randomly remove non-target cells to make them completely EMPTY (null)
  // 3x3: 4 to 5 empty cells; 4x4: 7 to 9 empty cells; 5x5: 12 to 14 empty cells
  const targetEmpty = n === 3 ? Math.floor(Math.random() * 2) + 4 : n === 4 ? Math.floor(Math.random() * 3) + 7 : Math.floor(Math.random() * 3) + 12;

  const candidateCells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r !== targetR || c !== targetC) {
        candidateCells.push([r, c]);
      }
    }
  }
  candidateCells.sort(() => Math.random() - 0.5);

  let emptyCount = 0;
  for (const [r, c] of candidateCells) {
    if (emptyCount >= targetEmpty) break;
    const backup = cluesGrid[r][c];
    cluesGrid[r][c] = null; // Mark empty

    // Check if target is still uniquely deducible
    const deduced = solveTargetCandidates(n, shuffledSymbols, cluesGrid, targetR, targetC);
    if (deduced.length === 1 && deduced[0] === correctSymbol) {
      emptyCount++;
    } else {
      cluesGrid[r][c] = backup; // Restore clue
    }
  }

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
      initialList = gameData.map((p, idx) => {
        // If server puzzle already has clues_grid with some null/empty cells
        if (p.grid_size && p.correct_symbol && p.clues_grid) {
          const hasEmpty = p.clues_grid.some((row) => row.some((c) => c === null));
          if (hasEmpty) return p;
        }
        return generateSingleHoleLatinSquare(idx + 1);
      });
    } else {
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

      // Fast transition to next puzzle (250ms)
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

      // 350ms error delay, then advance
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

    if (puzzlesList[nextLevel - 1]) {
      setCurrentPuzzle(puzzlesList[nextLevel - 1]);
    } else {
      const dynamicPuzzle = generateSingleHoleLatinSquare(nextLevel);
      setPuzzlesList((prev) => [...prev, dynamicPuzzle]);
      setCurrentPuzzle(dynamicPuzzle);
    }
  };

  // ==========================================
  // SCREEN 1: HOW TO PLAY / INTRO
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="w-full max-w-2xl mx-auto my-2">
        <div className="relative rounded-2xl bg-zinc-900 border border-zinc-700/60 p-6 sm:p-10 shadow-2xl text-white overflow-hidden">
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
              At the beginning of the game, a matrix is displayed with different symbols and random empty cells. Neither a row nor a column should have similar symbols. Select the appropriate symbol for the missing cell from the options below.
            </p>
          </div>

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

            {/* Thumbnail Preview: Shows Empty Cells + Clues + '?' exactly like Image 3 */}
            <div className="w-28 h-28 rounded-xl bg-zinc-200 dark:bg-zinc-800 p-2 border border-zinc-300 dark:border-zinc-700 shadow-md grid grid-cols-3 gap-1.5 shrink-0 items-center justify-center">
              {/* Row 0: Empty, Empty, Empty */}
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm" />
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm" />
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm" />

              {/* Row 1: Square, Empty, Circle */}
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm flex items-center justify-center">
                <div className="w-4 h-4 bg-[#e01a22]" />
              </div>
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm" />
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm flex items-center justify-center">
                <div className="w-4 h-4 bg-[#658215] rounded-full" />
              </div>

              {/* Row 2: Empty, Circle, ? */}
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm" />
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm flex items-center justify-center">
                <div className="w-4 h-4 bg-[#658215] rounded-full" />
              </div>
              <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-sm shadow-sm flex items-center justify-center font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                ?
              </div>
            </div>
          </div>

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
  // SCREEN 2: ACTIVE GAMEPLAY (MATCHING IMAGE 3)
  // ==========================================
  const gridSize = currentPuzzle?.grid_size || 3;
  const cluesGrid = currentPuzzle?.clues_grid || [];
  const targetPos = currentPuzzle?.target_pos || { r: 0, c: 0 };
  const activeSymbols = currentPuzzle?.symbols || BASE_3_SYMBOLS;

  const gridColsClass =
    gridSize === 3 ? 'grid-cols-3' : gridSize === 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between px-2 text-xs font-mono">
        <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold">
          Challenge #{currentLevel} ({gridSize}×{gridSize})
        </span>

        <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Score: {score}</span>
        </span>
      </div>

      {/* Main Game Container */}
      <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-8 shadow-xl flex flex-col items-center justify-center space-y-6">
        {/* Exact Header matching screenshot: "Please choose the correct answer" */}
        <h3 className="text-base sm:text-xl font-bold text-zinc-800 dark:text-zinc-100 text-center tracking-tight">
          Please choose the correct answer
        </h3>

        {/* Latin Square Matrix Grid with Random Empty Cells */}
        <div
          className={`grid ${gridColsClass} gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl bg-zinc-200/70 dark:bg-zinc-950/80 shadow-inner`}
        >
          {cluesGrid.map((row, r) =>
            row.map((cellKey, c) => {
              const isTargetHole = r === targetPos.r && c === targetPos.c;
              const isEmptyCell = !isTargetHole && (cellKey === null || cellKey === undefined);

              // 1. The SINGLE Question Mark Cell
              if (isTargetHole) {
                return (
                  <motion.div
                    key={`hole-${r}-${c}`}
                    animate={
                      feedback?.status === 'wrong'
                        ? { x: [-6, 6, -4, 4, 0] }
                        : feedback?.status === 'correct'
                        ? { scale: [1, 1.15, 1] }
                        : { scale: [1, 1.02, 1] }
                    }
                    transition={{
                      duration: feedback ? 0.3 : 2,
                      repeat: feedback ? 0 : Infinity
                    }}
                    className={`w-16 h-16 sm:w-22 sm:h-22 rounded-none bg-white dark:bg-zinc-800 border-2 flex items-center justify-center shadow-md transition-all ${
                      feedback?.status === 'correct'
                        ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                        : feedback?.status === 'wrong'
                        ? 'border-rose-500 ring-4 ring-rose-500/30'
                        : 'border-zinc-300 dark:border-zinc-600 shadow-[0_0_12px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    {feedback?.symbol ? (
                      renderSolidShape(feedback.symbol, 'w-8 h-8 sm:w-11 sm:h-11')
                    ) : (
                      <span className="font-sans text-3xl sm:text-5xl font-extrabold text-zinc-700 dark:text-zinc-200">
                        ?
                      </span>
                    )}
                  </motion.div>
                );
              }

              // 2. Completely EMPTY Cell (blank white tile matching screenshot)
              if (isEmptyCell) {
                return (
                  <div
                    key={`empty-${r}-${c}`}
                    className="w-16 h-16 sm:w-22 sm:h-22 rounded-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  />
                );
              }

              // 3. Normal Clue Cell (solid shape inside white tile)
              return (
                <div
                  key={`clue-${r}-${c}`}
                  className="w-16 h-16 sm:w-22 sm:h-22 rounded-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm"
                >
                  {renderSolidShape(cellKey, 'w-8 h-8 sm:w-11 sm:h-11')}
                </div>
              );
            })
          )}
        </div>

        {/* Options Row below grid: White square tiles containing solid shapes */}
        <div className="w-full pt-4 flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {activeSymbols.map((key) => (
              <button
                key={key}
                type="button"
                disabled={feedback !== null}
                onClick={() => handleSelectSymbol(key)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 flex items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer shadow-md disabled:opacity-50 hover:shadow-lg"
                title={SYMBOLS_META[key]?.label || key}
                aria-label={SYMBOLS_META[key]?.label || key}
              >
                {renderSolidShape(key, 'w-8 h-8 sm:w-11 sm:h-11')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
