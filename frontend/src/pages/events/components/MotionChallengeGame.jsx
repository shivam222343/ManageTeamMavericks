import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RotateCcw,
  Zap,
  Target,
  ArrowRight,
  HelpCircle,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

// Web Audio API Sound Synthesizer (Zero asset download latency, pure procedural sound effects)
class SoundFX {
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

  playSlide() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  }

  playBallMove() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }

  playGoal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch (e) {}
  }

  playFail() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }
}

const soundManager = new SoundFX();

// Fallback progressive levels
const defaultLevels = [
  {
    level: 1,
    title: 'Level 1: Basic Path Clearance',
    difficulty: 'easy',
    grid_rows: 3,
    grid_cols: 3,
    ball: { r: 0, c: 0 },
    hole: { r: 0, c: 2 },
    blocks: [
      { id: 'b1', r: 0, c: 1, color: '#06B6D4', colorName: 'cyan', isFixed: false },
      { id: 'b2', r: 2, c: 1, color: '#A855F7', colorName: 'purple', isFixed: false }
    ],
    obstacles: [],
    optimal_moves: 3,
    max_moves: 8,
    points_award: 4,
    penalty_deduct: 1
  },
  {
    level: 2,
    title: 'Level 2: Dual Axis Sliding',
    difficulty: 'easy',
    grid_rows: 3,
    grid_cols: 3,
    ball: { r: 2, c: 0 },
    hole: { r: 0, c: 2 },
    blocks: [
      { id: 'b1', r: 1, c: 0, color: '#3B82F6', colorName: 'blue', isFixed: false },
      { id: 'b2', r: 0, c: 1, color: '#10B981', colorName: 'emerald', isFixed: false },
      { id: 'b3', r: 1, c: 2, color: '#F59E0B', colorName: 'amber', isFixed: false }
    ],
    obstacles: [],
    optimal_moves: 4,
    max_moves: 10,
    points_award: 4,
    penalty_deduct: 1
  },
  {
    level: 3,
    title: 'Level 3: Fixed Obstacle Labyrinth',
    difficulty: 'medium',
    grid_rows: 4,
    grid_cols: 4,
    ball: { r: 0, c: 0 },
    hole: { r: 3, c: 3 },
    blocks: [
      { id: 'b1', r: 0, c: 1, color: '#06B6D4', colorName: 'cyan', isFixed: false },
      { id: 'b2', r: 1, c: 2, color: '#A855F7', colorName: 'purple', isFixed: false },
      { id: 'b3', r: 2, c: 3, color: '#EC4899', colorName: 'pink', isFixed: false }
    ],
    obstacles: [
      { r: 1, c: 1 },
      { r: 2, c: 2 }
    ],
    optimal_moves: 5,
    max_moves: 12,
    points_award: 4,
    penalty_deduct: 1
  },
  {
    level: 4,
    title: 'Level 4: Multi-Block Coordination',
    difficulty: 'medium',
    grid_rows: 4,
    grid_cols: 4,
    ball: { r: 0, c: 3 },
    hole: { r: 3, c: 0 },
    blocks: [
      { id: 'b1', r: 0, c: 2, color: '#3B82F6', colorName: 'blue', isFixed: false },
      { id: 'b2', r: 1, c: 3, color: '#10B981', colorName: 'emerald', isFixed: false },
      { id: 'b3', r: 2, c: 1, color: '#F59E0B', colorName: 'amber', isFixed: false },
      { id: 'b4', r: 3, c: 1, color: '#8B5CF6', colorName: 'violet', isFixed: false }
    ],
    obstacles: [
      { r: 1, c: 1 }
    ],
    optimal_moves: 6,
    max_moves: 14,
    points_award: 4,
    penalty_deduct: 1
  },
  {
    level: 5,
    title: 'Level 5: Master Spatial Nexus',
    difficulty: 'hard',
    grid_rows: 5,
    grid_cols: 5,
    ball: { r: 0, c: 0 },
    hole: { r: 4, c: 4 },
    blocks: [
      { id: 'b1', r: 0, c: 2, color: '#06B6D4', colorName: 'cyan', isFixed: false },
      { id: 'b2', r: 2, c: 0, color: '#A855F7', colorName: 'purple', isFixed: false },
      { id: 'b3', r: 2, c: 4, color: '#EC4899', colorName: 'pink', isFixed: false },
      { id: 'b4', r: 4, c: 2, color: '#3B82F6', colorName: 'blue', isFixed: false }
    ],
    obstacles: [
      { r: 1, c: 1 },
      { r: 3, c: 3 }
    ],
    optimal_moves: 7,
    max_moves: 16,
    points_award: 4,
    penalty_deduct: 1
  }
];

const MotionChallengeGame = ({
  gameData,
  isDark = true,
  onScoreUpdate,
  onMoveAction,
  onGameComplete,
  onStartTimer,
  sessionToken,
  subEventId,
  initialScore = 0
}) => {
  // Extract levels from gameData or use defaultLevels
  const levels = (gameData?.levels && gameData.levels.length > 0) ? gameData.levels : defaultLevels;

  // Game Engine State
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [ballPos, setBallPos] = useState({ r: 0, c: 0 });
  const [blocks, setBlocks] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [holePos, setHolePos] = useState({ r: 0, c: 2 });
  const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });
  const [maxMoves, setMaxMoves] = useState(8);
  const [optimalMoves, setOptimalMoves] = useState(3);
  const [movesCount, setMovesCount] = useState(0);

  // Selection & UI State
  const [selectedEntity, setSelectedEntity] = useState(null); // 'ball' | blockId | null
  const [draggedEntity, setDraggedEntity] = useState(null);
  const [validMoves, setValidMoves] = useState([]); // Array of { r, c, steps }
  const [gameScore, setGameScore] = useState(initialScore);
  const [solvedCount, setSolvedCount] = useState(0);
  const [isLevelSuccess, setIsLevelSuccess] = useState(false);
  const [isMoveLimitExceeded, setIsMoveLimitExceeded] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const activeLevel = levels[currentLevelIndex] || levels[0];

  // Initialize or reset level board
  const loadLevel = useCallback((levelIdx) => {
    const lvl = levels[levelIdx] || levels[0];
    if (!lvl) return;

    setGridSize({ rows: lvl.grid_rows || 3, cols: lvl.grid_cols || 3 });
    setBallPos({ ...lvl.ball });
    setHolePos({ ...lvl.hole });
    setBlocks(lvl.blocks ? lvl.blocks.map((b) => ({ ...b })) : []);
    setObstacles(lvl.obstacles ? lvl.obstacles.map((o) => ({ ...o })) : []);
    setMaxMoves(lvl.max_moves || 8);
    setOptimalMoves(lvl.optimal_moves || 4);
    setMovesCount(0);
    setSelectedEntity(null);
    setDraggedEntity(null);
    setValidMoves([]);
    setIsLevelSuccess(false);
    setIsMoveLimitExceeded(false);
  }, [levels]);

  useEffect(() => {
    loadLevel(currentLevelIndex);
  }, [currentLevelIndex, loadLevel]);

  // Sync game score with parent
  useEffect(() => {
    if (onScoreUpdate) {
      onScoreUpdate(gameScore);
    }
  }, [gameScore, onScoreUpdate]);

  // Calculate open empty squares (uncoloured squares where no movable block, obstacle, or ball resides)
  const isCellEmptyForBlock = useCallback((r, c) => {
    if (r < 0 || r >= gridSize.rows || c < 0 || c >= gridSize.cols) return false;
    // Cannot move onto the ball
    if (ballPos.r === r && ballPos.c === c) return false;
    // Cannot move onto another block
    if (blocks.some((b) => b.r === r && b.c === c)) return false;
    // Cannot move onto an obstacle
    if (obstacles.some((o) => o.r === r && o.c === c)) return false;
    // Note: Blocks CAN move onto the black hole per game rules!
    return true;
  }, [gridSize, ballPos, blocks, obstacles]);

  const isCellEmptyForBall = useCallback((r, c) => {
    if (r < 0 || r >= gridSize.rows || c < 0 || c >= gridSize.cols) return false;
    // Ball can only move into uncoloured squares (no blocks on top)
    if (blocks.some((b) => b.r === r && b.c === c)) return false;
    // Cannot move onto obstacles
    if (obstacles.some((o) => o.r === r && o.c === c)) return false;
    // Ball CAN move onto the black hole or empty uncoloured squares
    return true;
  }, [gridSize, blocks, obstacles]);

  // Compute valid straight line moves (Up, Down, Left, Right raycasting to allow multi-cell skipping along same row/col)
  const computeValidMoves = useCallback((entityType, entityId = null) => {
    const directions = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];
    const results = [];

    if (entityType === 'ball') {
      for (const d of directions) {
        let step = 1;
        while (true) {
          const nr = ballPos.r + d.r * step;
          const nc = ballPos.c + d.c * step;
          if (isCellEmptyForBall(nr, nc)) {
            results.push({ r: nr, c: nc, steps: step });
            step++;
          } else {
            break;
          }
        }
      }
    } else if (entityType === 'block') {
      const block = blocks.find((b) => b.id === entityId);
      if (block && !block.isFixed) {
        for (const d of directions) {
          let step = 1;
          while (true) {
            const nr = block.r + d.r * step;
            const nc = block.c + d.c * step;
            if (isCellEmptyForBlock(nr, nc)) {
              results.push({ r: nr, c: nc, steps: step });
              step++;
            } else {
              break;
            }
          }
        }
      }
    }

    return results;
  }, [ballPos, blocks, isCellEmptyForBall, isCellEmptyForBlock]);

  // Update highlighted valid squares whenever selectedEntity changes
  useEffect(() => {
    if (!selectedEntity || isLevelSuccess || isMoveLimitExceeded) {
      setValidMoves([]);
      return;
    }

    if (selectedEntity === 'ball') {
      setValidMoves(computeValidMoves('ball'));
    } else {
      setValidMoves(computeValidMoves('block', selectedEntity));
    }
  }, [selectedEntity, isLevelSuccess, isMoveLimitExceeded, computeValidMoves]);

  // Handle entity click (Ball or Block)
  const handleSelectBall = () => {
    if (isLevelSuccess || isMoveLimitExceeded) return;
    if (selectedEntity === 'ball') {
      setSelectedEntity(null);
    } else {
      setSelectedEntity('ball');
      soundManager.init();
    }
  };

  const handleSelectBlock = (block) => {
    if (isLevelSuccess || isMoveLimitExceeded || block.isFixed) return;
    if (selectedEntity === block.id) {
      setSelectedEntity(null);
    } else {
      setSelectedEntity(block.id);
      soundManager.init();
    }
  };

  // Level Won Handler (+4 Marks)
  const handleLevelWon = (finalMovesCount) => {
    setIsLevelSuccess(true);
    soundManager.playGoal();

    // Award +4 marks
    const nextScore = gameScore + 4;
    setGameScore(nextScore);
    const nextSolved = solvedCount + 1;
    setSolvedCount(nextSolved);

    toast.success('🎯 Level Solved! (+4 Marks Awarded)', {
      icon: '✨',
      style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold' }
    });

    if (onMoveAction) {
      onMoveAction({
        level: currentLevelIndex + 1,
        movesCount: finalMovesCount,
        action: { type: 'level_solved', points: 4 },
        score: nextScore
      });
    }

    // Auto advance to next challenge after a short pause
    setTimeout(() => {
      if (currentLevelIndex + 1 < levels.length) {
        setCurrentLevelIndex((prev) => prev + 1);
      } else {
        toast.success('🏆 All Motion Challenges Completed!', { icon: '🎉' });
        if (onGameComplete) {
          onGameComplete();
        }
      }
    }, 900);
  };

  // Execute Move with fast response and exact step count
  const executeMove = useCallback((targetR, targetC, explicitEntity = null) => {
    if (isLevelSuccess || isMoveLimitExceeded) return;

    const activeEntity = explicitEntity || selectedEntity;
    if (!activeEntity) return;

    // Calculate distance / steps taken along the straight line
    let startPos = null;
    if (activeEntity === 'ball') {
      startPos = ballPos;
    } else {
      startPos = blocks.find((b) => b.id === activeEntity);
    }
    if (!startPos) return;

    const stepsTaken = Math.abs(targetR - startPos.r) + Math.abs(targetC - startPos.c);
    const movesToAdd = stepsTaken > 0 ? stepsTaken : 1;
    const nextMoves = movesCount + movesToAdd;
    setMovesCount(nextMoves);

    let moveLogged = null;

    if (activeEntity === 'ball') {
      soundManager.playBallMove();
      setBallPos({ r: targetR, c: targetC });
      setSelectedEntity(null);
      setDraggedEntity(null);
      moveLogged = { type: 'ball_move', from: { ...ballPos }, to: { r: targetR, c: targetC }, steps: stepsTaken, move_num: nextMoves };

      // Check if Ball reached the Black Hole!
      const isHoleCovered = blocks.some((b) => b.r === holePos.r && b.c === holePos.c);
      if (targetR === holePos.r && targetC === holePos.c && !isHoleCovered) {
        handleLevelWon(nextMoves);
        return;
      }
    } else {
      // Move selected block
      soundManager.playSlide();
      setBlocks((prev) =>
        prev.map((b) => (b.id === activeEntity ? { ...b, r: targetR, c: targetC } : b))
      );
      setSelectedEntity(null);
      setDraggedEntity(null);
      moveLogged = { type: 'block_shift', block_id: activeEntity, from: { ...startPos }, to: { r: targetR, c: targetC }, steps: stepsTaken, move_num: nextMoves };
    }

    if (onMoveAction && moveLogged) {
      onMoveAction({
        level: currentLevelIndex + 1,
        movesCount: nextMoves,
        action: moveLogged,
        score: gameScore
      });
    }

    // Check if move limit exceeded without reaching hole
    if (nextMoves >= maxMoves) {
      if (activeEntity === 'ball' && targetR === holePos.r && targetC === holePos.c) {
        // Solved on last move!
      } else {
        setIsMoveLimitExceeded(true);
        soundManager.playFail();
        toast.error('Move limit reached! Reset the puzzle to try again.', { icon: '⚠️' });
      }
    }
  }, [
    isLevelSuccess,
    isMoveLimitExceeded,
    movesCount,
    maxMoves,
    selectedEntity,
    ballPos,
    blocks,
    holePos,
    currentLevelIndex,
    gameScore,
    onMoveAction
  ]);

  // Handle Board Cell Click
  const handleCellClick = (r, c) => {
    // If user clicked a valid highlighted move target
    const isValidTarget = validMoves.some((m) => m.r === r && m.c === c);
    if (isValidTarget) {
      executeMove(r, c);
      return;
    }

    // If clicked on ball
    if (ballPos.r === r && ballPos.c === c) {
      handleSelectBall();
      return;
    }

    // If clicked on a movable block
    const clickedBlock = blocks.find((b) => b.r === r && b.c === c);
    if (clickedBlock && !clickedBlock.isFixed) {
      handleSelectBlock(clickedBlock);
      return;
    }

    // Clicked elsewhere on board -> Deselect
    setSelectedEntity(null);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, entityType, entityId = null) => {
    if (isLevelSuccess || isMoveLimitExceeded) return;
    const dragId = entityType === 'ball' ? 'ball' : entityId;
    setDraggedEntity(dragId);
    setSelectedEntity(dragId);
    soundManager.init();
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', dragId);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e, r, c) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e, targetR, targetC) => {
    e.preventDefault();
    const entity = draggedEntity || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : selectedEntity);
    if (!entity) return;

    // Check if (targetR, targetC) is in valid moves for this entity
    const currentValidMoves = computeValidMoves(entity === 'ball' ? 'ball' : 'block', entity === 'ball' ? null : entity);
    const isValid = currentValidMoves.some((m) => m.r === targetR && m.c === targetC);
    if (isValid) {
      executeMove(targetR, targetC, entity);
    }
    setDraggedEntity(null);
  };

  // Level Reset Handler (-1 Mark penalty on failed reset)
  const handleResetLevel = (isPenalty = false) => {
    if (isPenalty || isMoveLimitExceeded) {
      const nextScore = Math.max(0, gameScore - 1);
      setGameScore(nextScore);
      toast.error('Level Reset: -1 Mark Deducted', { icon: '🔻' });
    } else {
      toast('Level Reset', { icon: '🔄' });
    }
    soundManager.playSlide();
    loadLevel(currentLevelIndex);
  };

  // Skip Level Handler (-1 Mark penalty)
  const handleSkipLevel = () => {
    if (currentLevelIndex + 1 < levels.length) {
      const nextScore = Math.max(0, gameScore - 1);
      setGameScore(nextScore);
      toast('Level Skipped (-1 Mark)', { icon: '⏩' });
      setCurrentLevelIndex((prev) => prev + 1);
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedEntity || isLevelSuccess || isMoveLimitExceeded) return;

      let targetDir = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') targetDir = { r: -1, c: 0 };
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') targetDir = { r: 1, c: 0 };
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') targetDir = { r: 0, c: -1 };
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') targetDir = { r: 0, c: 1 };

      if (targetDir) {
        e.preventDefault();
        const currentPos =
          selectedEntity === 'ball'
            ? ballPos
            : blocks.find((b) => b.id === selectedEntity);

        if (currentPos) {
          const targetR = currentPos.r + targetDir.r;
          const targetC = currentPos.c + targetDir.c;
          const isValid = validMoves.some((m) => m.r === targetR && m.c === targetC);
          if (isValid) {
            executeMove(targetR, targetC);
          }
        }
      } else if (e.key === 'Escape') {
        setSelectedEntity(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntity, isLevelSuccess, isMoveLimitExceeded, ballPos, blocks, validMoves, executeMove]);

  return (
    <div className="w-full space-y-5 select-none">
      {/* 1. HOW TO PLAY OFFICIAL RULES OVERLAY (Timer will only start after clicking Play) */}
      <AnimatePresence>
        {showHowToPlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-none shadow-2xl overflow-hidden p-6 sm:p-8 text-white space-y-6"
              style={{
                backgroundImage: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)'
              }}
            >
              {/* Header Title */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black font-display-heavy tracking-wider text-orange-500 uppercase">
                  MOTION CHALLENGE
                </h2>
                <div className="inline-block bg-orange-500/15 border border-orange-500/40 text-orange-400 px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider">
                  Imagination, Decision making, Time Management
                </div>
              </div>

              {/* Exact Rules Body from Screenshot */}
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-64 sm:max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                <p>
                  In this game you are given a grid designed with coloured and uncoloured squares. In addition to this the grid consists of a <strong>red ball</strong> and a <strong>black hole</strong> in different squares.
                </p>
                <p>
                  Your aim is to move the red ball into the black hole. You can move the ball only into the <strong>uncoloured squares</strong>. The squares with a <strong>cross mark (X)</strong> cannot be moved.
                </p>
                <p>
                  You can move the coloured squares horizontally and vertically into the uncoloured squares. For moving the red ball into the hole you must move the coloured squares and create a path for the red ball into the hole.
                </p>
                <p>
                  Every time you move the coloured square or the ball it is counted as one move. You can <strong>drag or click</strong> squares and the ball in straight lines across open squares (moves are counted according to distance). <strong>You can move the squares upon the black hole but you cannot move it upon the ball.</strong>
                </p>
              </div>

              {/* How to Play Bullet Points + Thumbnail Grid Preview */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-none bg-black/40 border border-zinc-800">
                <div className="space-y-1.5 text-xs font-medium">
                  <h4 className="text-orange-400 font-bold uppercase tracking-wide text-xs">How to Play</h4>
                  <ul className="space-y-1 text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <span className="text-orange-400 font-bold">*</span> Time duration is four minutes (starts when you click Play)
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">*</span> For every <strong>Correct attempt +4 marks</strong> is awarded
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-rose-400 font-bold">*</span> For every <strong>incorrect attempt -1 mark</strong> is deducted
                    </li>
                  </ul>
                </div>

                {/* Mini Grid Thumbnail Preview */}
                <div className="w-16 h-20 bg-zinc-800 border-2 border-white/20 p-1.5 grid grid-cols-3 gap-0.5 shadow-md shrink-0">
                  <div className="bg-red-500 rounded-full w-3.5 h-3.5 mx-auto" />
                  <div className="bg-purple-500 rounded-sm" />
                  <div className="bg-black border border-white/40 rounded-full w-3.5 h-3.5 mx-auto" />
                  <div className="bg-slate-700/60" />
                  <div className="bg-cyan-500 rounded-sm" />
                  <div className="bg-amber-500 rounded-sm" />
                  <div className="bg-blue-500 rounded-sm" />
                  <div className="bg-slate-700/60" />
                  <div className="bg-emerald-500 rounded-sm" />
                </div>
              </div>

              {/* Prominent Play Button matching screenshot */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowHowToPlay(false);
                    setHasStartedPlaying(true);
                    soundManager.init();
                    if (onStartTimer) {
                      onStartTimer();
                    }
                  }}
                  className="w-full sm:w-64 py-3.5 px-8 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold font-display text-base tracking-widest uppercase transition shadow-lg shadow-orange-500/30 cursor-pointer rounded-none inline-flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Play</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. GAME HUD & LIVE IN-GAME SCORE STRIP */}
      <div className={`p-4 sm:p-5 rounded-none border shadow-md flex flex-wrap items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-zinc-900/90 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-none bg-orange-500/15 border border-orange-500/30 text-orange-500">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-500">
                Motion Challenge
              </span>
              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Level {currentLevelIndex + 1} / {levels.length}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {activeLevel.title || `Challenge #${currentLevelIndex + 1}`}
            </h3>
          </div>
        </div>

        {/* Live Game Specific Score & Stats HUD */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Live In-Game Score */}
          <div className="px-3.5 py-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <span className="text-[9px] font-mono uppercase block text-emerald-500/80 leading-none">Game Score</span>
              <span className="font-mono text-sm sm:text-base font-black text-emerald-400 leading-none">
                {gameScore >= 0 ? `+${gameScore}` : gameScore} pts
              </span>
            </div>
          </div>

          {/* Moves Count Ring / Badge */}
          <div className={`px-3 py-1.5 rounded-none border flex items-center gap-2 ${
            movesCount >= maxMoves
              ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 animate-pulse'
              : movesCount >= maxMoves - 2
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
          }`}>
            <Flame className="w-4 h-4 text-orange-400" />
            <div className="text-left">
              <span className="text-[9px] font-mono uppercase block text-slate-400 leading-none">Moves</span>
              <span className="font-mono text-xs sm:text-sm font-bold leading-none">
                <span className={movesCount >= maxMoves ? 'text-rose-400' : ''}>{movesCount}</span>
                <span className="text-slate-500"> / {maxMoves} max</span>
              </span>
            </div>
          </div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMuted(!isMuted);
              soundManager.muted = !isMuted;
            }}
            className="p-2 rounded-none border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 cursor-pointer"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
          </button>

          {/* How to Play Modal Re-opener */}
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="p-2 rounded-none border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 cursor-pointer"
            title="View Rules & Scoring"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* 3. INTERACTIVE SPATIAL GRID BOARD */}
      <div className={`p-6 sm:p-8 rounded-none border flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
        isDark ? 'bg-zinc-950 border-white/10 shadow-2xl' : 'bg-slate-100 border-slate-300 shadow-inner'
      }`}>
        {/* Board Background Gridlines */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Selected Entity Instruction Indicator */}
        <div className="mb-4 text-xs font-mono text-center">
          {selectedEntity === 'ball' ? (
            <span className="text-red-400 font-bold animate-pulse">
              [ RED BALL SELECTED ] — Drag or click any reachable open square along the line to roll the ball.
            </span>
          ) : selectedEntity ? (
            <span className="text-sky-400 font-bold animate-pulse">
              [ COLOURED SQUARE SELECTED ] — Drag or click any reachable open square along the line to slide the block.
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              <strong>Drag or click</strong> the <strong>Red Ball</strong> or any <strong>Coloured Square</strong> to shift.
            </span>
          )}
        </div>

        {/* Responsive CSS Grid Container */}
        <div
          className="relative grid gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-none border-2 border-slate-300 dark:border-white/15 bg-slate-200 dark:bg-zinc-900 shadow-2xl select-none"
          style={{
            gridTemplateRows: `repeat(${gridSize.rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: gridSize.rows }).map((_, r) =>
            Array.from({ length: gridSize.cols }).map((_, c) => {
              const isBall = ballPos.r === r && ballPos.c === c;
              const isHole = holePos.r === r && holePos.c === c;
              const block = blocks.find((b) => b.r === r && b.c === c);
              const obstacle = obstacles.find((o) => o.r === r && o.c === c);
              const targetMove = validMoves.find((m) => m.r === r && m.c === c);
              const isValidTarget = Boolean(targetMove);
              const isSelected =
                (selectedEntity === 'ball' && isBall) ||
                (selectedEntity === block?.id && block);

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onDragOver={(e) => handleDragOver(e, r, c)}
                  onDrop={(e) => handleDrop(e, r, c)}
                  className={`w-14 h-14 sm:w-20 sm:h-20 rounded-none relative flex items-center justify-center transition-colors duration-100 cursor-pointer ${
                    isSelected
                      ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-black z-20'
                      : isValidTarget
                      ? 'ring-2 ring-sky-400 ring-offset-1 bg-sky-500/20 border-2 border-dashed border-sky-400 z-10'
                      : isDark
                      ? 'bg-zinc-950 border border-white/10 hover:border-white/20'
                      : 'bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Underneath Black Hole */}
                  {isHole && (
                    <div
                      className={`absolute inset-1.5 rounded-full flex items-center justify-center transition-opacity duration-100 ${
                        block ? 'opacity-30 scale-75' : 'opacity-100'
                      }`}
                      style={{
                        background: 'radial-gradient(circle, #000000 65%, #312e81 85%, #6366f1 100%)',
                        boxShadow: '0 0 14px rgba(99, 102, 241, 0.6), inset 0 0 8px #000'
                      }}
                      title="Destination: Black Hole"
                    >
                      <div className="w-3 h-3 rounded-full border border-indigo-400/80 animate-ping" />
                    </div>
                  )}

                  {/* Red Ball (Super Fast Drag & Drop + Click) */}
                  {isBall && (
                    <div
                      draggable={!isLevelSuccess && !isMoveLimitExceeded}
                      onDragStart={(e) => handleDragStart(e, 'ball')}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBall();
                      }}
                      className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full relative z-20 cursor-grab active:cursor-grabbing shadow-lg transition-transform duration-100 ease-out hover:scale-105 active:scale-95 ${
                        isSelected ? 'ring-4 ring-orange-500 scale-110 shadow-orange-500/50' : ''
                      }`}
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #ff8a80, #e53935 60%, #b71c1c 100%)',
                        boxShadow: '0 4px 14px rgba(229, 57, 53, 0.6), inset -2px -2px 6px rgba(0,0,0,0.5), inset 2px 2px 4px rgba(255,255,255,0.6)',
                        touchAction: 'none'
                      }}
                    >
                      {/* Specular highlight */}
                      <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-white/70 blur-[0.5px] ml-2 mt-2" />
                    </div>
                  )}

                  {/* Coloured Movable Block (Super Fast Drag & Drop + Click) */}
                  {block && !block.isFixed && (
                    <div
                      draggable={!isLevelSuccess && !isMoveLimitExceeded && !block.isFixed}
                      onDragStart={(e) => handleDragStart(e, 'block', block.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBlock(block);
                      }}
                      className={`w-11 h-11 sm:w-16 sm:h-16 rounded-sm relative z-15 flex items-center justify-center font-bold text-white shadow-md transition-transform duration-100 ease-out hover:scale-105 active:scale-95 ${
                        block.isFixed ? 'cursor-not-allowed opacity-90' : 'cursor-grab active:cursor-grabbing'
                      } ${isSelected ? 'ring-4 ring-orange-500 scale-105 shadow-orange-500/50' : ''}`}
                      style={{
                        backgroundColor: block.color || '#3B82F6',
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%, rgba(0,0,0,0.2) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.3)',
                        touchAction: 'none'
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-white/30" />
                    </div>
                  )}

                  {/* Immovable Fixed Square ('X' Cross Obstacle) */}
                  {(block?.isFixed || obstacle) && (
                    <div
                      className="w-full h-full rounded-none bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center text-zinc-400 font-mono font-black text-xl select-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, #27272a, #27272a 6px, #18181b 6px, #18181b 12px)'
                      }}
                      title="Immovable Obstacle"
                    >
                      <span className="text-zinc-300 drop-shadow-md font-black">✕</span>
                    </div>
                  )}

                  {/* Valid move target guidance dot */}
                  {isValidTarget && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-sky-400 opacity-85 shadow-lg shadow-sky-400/50 flex items-center justify-center text-[9px] font-mono font-bold text-black">
                        {targetMove?.steps > 1 ? `+${targetMove.steps}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 4. CONTROLS STRIP (Reset / Next / Guidance) */}
        <div className="mt-6 flex items-center justify-between gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={() => handleResetLevel(false)}
            className={`px-4 py-2.5 rounded-none border text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isDark
                ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800 text-slate-300'
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
            <span>Reset Puzzle</span>
          </button>

          {isMoveLimitExceeded && (
            <button
              type="button"
              onClick={() => handleResetLevel(true)}
              className="px-4 py-2.5 rounded-none bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer animate-bounce"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry (-1 Penalty)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSkipLevel}
            disabled={currentLevelIndex >= levels.length - 1}
            className="px-4 py-2.5 rounded-none border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <span>Skip (-1)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotionChallengeGame;
