import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  BrainCircuit,
  Target,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Square as SquareIcon,
  Plus as PlusIcon,
  Triangle as TriangleIcon,
  Circle as CircleIcon,
  Send,
  Zap
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';

const MindSagaGamingArenaPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { theme } = useTheme ? useTheme() : { theme: 'dark' };
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Navigation / Selection State
  const [selectedGameKey, setSelectedGameKey] = useState('deductive_logic'); // 'deductive_logic' | 'motion_challenge'
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // Active Session State
  const [sessionToken, setSessionToken] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(240);
  const [score, setScore] = useState(0);

  // --- GAME 1: Deductive Logical Thinking (4x4 Latin Square Shape Deduction) ---
  const [puzzles, setPuzzles] = useState([]);
  const [activePuzzleIndex, setActivePuzzleIndex] = useState(0);
  const [userGrid, setUserGrid] = useState([]); // 4x4 array of symbols or null
  const [selectedCell, setSelectedCell] = useState(null); // { r, c }
  const [movesLog, setMovesLog] = useState([]);

  // --- GAME 2: Motion Challenge (Rapid Reaction Matrix) ---
  const [motionTargets, setMotionTargets] = useState([]);
  const [activeTargets, setActiveTargets] = useState([]);
  const [combo, setCombo] = useState(0);

  // Symbol definitions matching audio prompt
  const symbolComponents = {
    square: { label: 'Square', icon: SquareIcon, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    plus: { label: 'Plus', icon: PlusIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
    triangle: { label: 'Triangle', icon: TriangleIcon, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
    circle: { label: 'Circle', icon: CircleIcon, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' }
  };

  // Start Game Session
  const handleStartGame = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/start`, {
        game_key: selectedGameKey,
        difficulty: difficulty
      });

      const data = res.data;
      setSessionToken(data.session_token);
      setRemainingSeconds(data.duration_seconds);
      setScore(0);
      setMovesLog([]);
      setIsPlaying(true);
      setGameResult(null);

      if (selectedGameKey === 'deductive_logic') {
        const pList = data.puzzle_data || [];
        setPuzzles(pList);
        setActivePuzzleIndex(0);
        if (pList.length > 0) {
          setUserGrid(JSON.parse(JSON.stringify(pList[0].clues_grid)));
        }
      } else if (selectedGameKey === 'motion_challenge') {
        setMotionTargets(data.puzzle_data?.targets || []);
        setActiveTargets([]);
      }
    } catch (err) {
      console.error('Failed to start game session:', err);
      toast.error(err.response?.data?.error || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  // Game countdown timer
  useEffect(() => {
    if (!isPlaying || gameResult) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameResult]);

  // Deductive Logic: Place symbol into grid cell
  const handlePlaceSymbol = (symbolKey) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;

    // Check if initial clue
    const initialClue = puzzles[activePuzzleIndex]?.clues_grid?.[r]?.[c];
    if (initialClue !== null && initialClue !== undefined) {
      toast.error('Cannot replace an initial clue shape!');
      return;
    }

    const nextGrid = JSON.parse(JSON.stringify(userGrid));
    nextGrid[r][c] = symbolKey;
    setUserGrid(nextGrid);

    // Track move log
    const move = { puzzle: activePuzzleIndex, r, c, symbol: symbolKey, timestamp: Date.now() };
    setMovesLog((prev) => [...prev, move]);

    // Check correct placement against server solution
    const sol = puzzles[activePuzzleIndex]?.solution?.[r]?.[c];
    if (sol === symbolKey) {
      setScore((prev) => prev + 5);
    }

    // Check if entire puzzle solved
    checkPuzzleCompletion(nextGrid);
  };

  const handleClearCell = () => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const initialClue = puzzles[activePuzzleIndex]?.clues_grid?.[r]?.[c];
    if (initialClue !== null) return;

    const nextGrid = JSON.parse(JSON.stringify(userGrid));
    nextGrid[r][c] = null;
    setUserGrid(nextGrid);
  };

  const checkPuzzleCompletion = (grid) => {
    const sol = puzzles[activePuzzleIndex]?.solution;
    if (!sol) return;

    let isComplete = true;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] !== sol[r][c]) {
          isComplete = false;
          break;
        }
      }
    }

    if (isComplete) {
      toast.success('Puzzle Solved! +20 Completion Bonus!', { icon: '🎉' });
      setScore((prev) => prev + 20);

      // Advance to next puzzle
      if (activePuzzleIndex < puzzles.length - 1) {
        const nextIdx = activePuzzleIndex + 1;
        setActivePuzzleIndex(nextIdx);
        setUserGrid(JSON.parse(JSON.stringify(puzzles[nextIdx].clues_grid)));
        setSelectedCell(null);
      }
    }
  };

  // Motion Challenge Game Loop
  useEffect(() => {
    if (selectedGameKey !== 'motion_challenge' || !isPlaying) return;

    const spawnInterval = setInterval(() => {
      const newTarget = {
        id: Math.random().toString(),
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 75) + 10,
        pts: 5,
        created: Date.now()
      };

      setActiveTargets((prev) => [...prev.slice(-3), newTarget]);
    }, 1100);

    return () => clearInterval(spawnInterval);
  }, [selectedGameKey, isPlaying]);

  const handleHitTarget = (targetId) => {
    setActiveTargets((prev) => prev.filter((t) => t.id !== targetId));
    setCombo((prev) => prev + 1);
    const earned = 5 + Math.min(10, combo * 2);
    setScore((prev) => prev + earned);
  };

  // Submit Final Game Score
  const handleSubmitGame = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/submit`, {
        session_token: sessionToken,
        score: score,
        moves_log: movesLog
      });

      setGameResult(res.data);
      setIsPlaying(false);
      toast.success('Game results recorded and verified!');
    } catch (err) {
      console.error('Failed to submit game score:', err);
      toast.error('Failed to submit game score');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  if (loading && !isPlaying) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  // GAME OVER / RESULTS VIEW
  if (gameResult) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Game Round Complete!</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Your cognitive gameplay has been authoritatively verified by the server engine.
            </p>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Verified Score:</span>
              <span className="font-bold text-purple-400 text-base font-mono">{gameResult.verified_score} / {gameResult.max_score} pts</span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-900">
              <span>Verification Hash:</span>
              <span className="font-mono text-zinc-400 truncate max-w-[180px]">{gameResult.verification_hash}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`)}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-purple-600/20"
          >
            Back to Mind Saga Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-16 selection:bg-purple-500/30">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            to={`/events/${eventId}/sub-events/${subEventId}/mind-saga`}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              Round 2: Gaming Arena
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              {selectedGameKey === 'deductive_logic' ? 'Deductive Symbol Grid' : 'Motion Challenge'}
            </p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 font-mono text-xs font-bold text-purple-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-purple-950/40 px-3 py-1 rounded-full border border-purple-500/30 font-mono text-xs font-bold text-white">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>Score: {score} pts</span>
            </div>

            <button
              onClick={handleSubmitGame}
              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md transition"
            >
              <Send className="w-3.5 h-3.5" /> Submit Score
            </button>
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Game Lobby / Selection */}
        {!isPlaying && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Cognitive Game Engine
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">Select Your Gaming Round Challenge</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Choose between Deductive Shape Logic (Latin Square Puzzle) or Motion Matrix Precision.
              </p>
            </div>

            {/* Game Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Game 1: Deductive Logic */}
              <div
                onClick={() => setSelectedGameKey('deductive_logic')}
                className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedGameKey === 'deductive_logic'
                    ? 'bg-purple-950/20 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 font-mono">AUDIO PROMPT PUZZLE</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Deductive Logical Thinking</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Deduce missing shapes in a 4x4 Latin Square grid. Every row and column must contain Square, Plus, Triangle, and Circle with NO repetitions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-zinc-900 text-xs text-zinc-500">
                  <span>Duration: 4 Mins</span>
                  <span>•</span>
                  <span>Max: 100 Pts</span>
                </div>
              </div>

              {/* Game 2: Motion Challenge */}
              <div
                onClick={() => setSelectedGameKey('motion_challenge')}
                className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedGameKey === 'motion_challenge'
                    ? 'bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">REACTION PRECISION</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Motion Challenge</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Track rapid velocity target matrices and trigger millisecond precision locks to build high combo multipliers.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-zinc-900 text-xs text-zinc-500">
                  <span>Duration: 3 Mins</span>
                  <span>•</span>
                  <span>Max: 100 Pts</span>
                </div>
              </div>
            </div>

            {/* Difficulty Preset */}
            <div className="space-y-2 text-xs">
              <label className="text-zinc-400 font-semibold block">Select Difficulty Level</label>
              <div className="flex items-center gap-3">
                {['easy', 'medium', 'hard'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 py-2 rounded-xl font-bold uppercase tracking-wider text-xs transition ${
                      difficulty === lvl
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Start Game Challenge
            </button>
          </div>
        )}

        {/* ACTIVE GAMEPLAY SCREEN */}
        {isPlaying && selectedGameKey === 'deductive_logic' && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-400 font-bold uppercase">
                  Puzzle {activePuzzleIndex + 1} of {puzzles.length}
                </span>
                <h3 className="text-lg font-bold text-white">4x4 Symbol Matrix Deduction</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Rule: Each row and column must contain Square, Plus, Triangle, and Circle with NO repetitions.
                </p>
              </div>
            </div>

            {/* 4x4 Grid Layout */}
            <div className="flex flex-col items-center justify-center p-4">
              <div className="grid grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-800 shadow-2xl">
                {userGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const isClue = puzzles[activePuzzleIndex]?.clues_grid?.[r]?.[c] !== null && puzzles[activePuzzleIndex]?.clues_grid?.[r]?.[c] !== undefined;
                    const symbolInfo = cell ? symbolComponents[cell] : null;
                    const Icon = symbolInfo?.icon;

                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => setSelectedCell({ r, c })}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-950/40 ring-4 ring-purple-500/30 scale-105 z-10'
                            : isClue
                            ? 'border-zinc-800 bg-zinc-900/80 shadow-inner'
                            : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        {symbolInfo && Icon ? (
                          <div className={`p-2 rounded-xl ${symbolInfo.bg} ${symbolInfo.color}`}>
                            <Icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-zinc-600">?</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Symbol Palette Selector */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col items-center gap-3">
              <span className="text-xs text-zinc-400 font-semibold">Select Symbol for Selected Slot:</span>
              <div className="flex items-center gap-3">
                {Object.keys(symbolComponents).map((key) => {
                  const item = symbolComponents[key];
                  const Icon = item.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePlaceSymbol(key)}
                      disabled={!selectedCell}
                      className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition disabled:opacity-30 ${item.bg} ${item.color} hover:scale-105`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleClearCell}
                  disabled={!selectedCell}
                  className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-semibold border border-zinc-800 transition"
                  title="Clear Cell"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE GAMEPLAY: MOTION CHALLENGE */}
        {isPlaying && selectedGameKey === 'motion_challenge' && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Motion Challenge Precision Reflex</h3>
                <p className="text-xs text-zinc-400">Click target beacons within milliseconds before they expire.</p>
              </div>
              <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Combo: x{combo}
              </div>
            </div>

            {/* Spatial Matrix Arena */}
            <div className="relative w-full h-80 bg-zinc-950 border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-inner cursor-crosshair">
              {activeTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleHitTarget(target.id)}
                  style={{ left: `${target.x}%`, top: `${target.y}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 border-2 border-white shadow-xl shadow-pink-500/40 flex items-center justify-center animate-ping transition hover:scale-125"
                >
                  <Target className="w-6 h-6 text-white" />
                </button>
              ))}

              {activeTargets.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                  Targets spawning in trajectory...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindSagaGamingArenaPage;
