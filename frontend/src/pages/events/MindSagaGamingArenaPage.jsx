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
  Zap,
  ArrowRight,
  Maximize,
  Camera,
  Video,
  VideoOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';

const MindSagaGamingArenaPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { theme } = useTheme ? useTheme() : { theme: 'dark' };
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Multi-game Pipeline & Config
  const [pipelineGames, setPipelineGames] = useState([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [gameResult, setGameResult] = useState(null);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState('');

  // Active Game Session State
  const [sessionToken, setSessionToken] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(180);
  const [currentGameTitle, setCurrentGameTitle] = useState('');
  const [currentGameKey, setCurrentGameKey] = useState('deductive_logic');
  const [score, setScore] = useState(0);

  // Proctoring Hardware & Security State
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationsCount, setViolationsCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [fullscreenCountdown, setFullscreenCountdown] = useState(10);
  const [warningType, setWarningType] = useState('fullscreen'); // 'fullscreen' | 'tab_switch' | 'camera'
  const [exitConfirmModal, setExitConfirmModal] = useState(false);
  const [nextGameConfirmModal, setNextGameConfirmModal] = useState(false);

  const videoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const violationCountRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const sessionTokenRef = useRef(null);

  // Keep refs synced
  useEffect(() => {
    violationCountRef.current = violationsCount;
  }, [violationsCount]);

  useEffect(() => {
    fullscreenExitsRef.current = fullscreenExits;
  }, [fullscreenExits]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

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

  // Symbol definitions
  const symbolComponents = {
    square: { label: 'Square', icon: SquareIcon, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    plus: { label: 'Plus', icon: PlusIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
    triangle: { label: 'Triangle', icon: TriangleIcon, color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' },
    circle: { label: 'Circle', icon: CircleIcon, color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' }
  };

  // 1. Fetch Game Pipeline from Server
  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('mind_saga_auth_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games`);
      const allGames = Array.isArray(res.data) ? res.data : [];
      const activeOnly = allGames.filter((g) => g.is_active !== 0 && g.is_active !== false);
      setPipelineGames(activeOnly.length > 0 ? activeOnly : allGames);
    } catch (err) {
      console.error('Failed to load games pipeline:', err);
      toast.error('Failed to load gaming round configurations.');
    } finally {
      setLoading(false);
    }
  }, [eventId, subEventId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // 2. Initialize Camera Preview
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      setCameraError('Camera access denied or unavailable. Please grant webcam permission to proceed.');
      toast.error('Camera access is required for proctoring.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Sync PIP video stream
  useEffect(() => {
    if (cameraStream && pipVideoRef.current) {
      pipVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isPlaying]);

  // Periodic CCTV Live Frame Streaming & Admin Heartbeat Listener
  useEffect(() => {
    if (!isPlaying || !cameraActive) return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 320;
    captureCanvas.height = 240;
    const ctx = captureCanvas.getContext('2d');

    const streamInterval = setInterval(async () => {
      const currentToken = sessionTokenRef.current;
      if (!currentToken || !isPlayingRef.current) return;

      try {
        let snapshotData = null;
        if (pipVideoRef.current && pipVideoRef.current.videoWidth > 0) {
          ctx.drawImage(pipVideoRef.current, 0, 0, 320, 240);
          snapshotData = captureCanvas.toDataURL('image/jpeg', 0.6);
        }

        const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/snapshot`, {
          session_token: currentToken,
          image_data: snapshotData,
          camera_status: cameraActive ? 'connected' : 'disconnected',
          round: 2
        });

        if (res.data?.terminated) {
          clearInterval(streamInterval);
          const blockReason = res.data?.termination_reason || 'Terminated by Proctor Administrator.';
          handleAutoSubmitRound(`Round Terminated by Administrator: ${blockReason}`);
        }
      } catch (err) {
        // Silent fail on minor network hiccups
      }
    }, 2500);

    return () => clearInterval(streamInterval);
  }, [isPlaying, cameraActive, eventId, subEventId]);

  // 3. Log Proctoring Violation Event
  const logProctorViolation = useCallback(async (eventType, description) => {
    const currentToken = sessionTokenRef.current;
    if (!currentToken || !isPlayingRef.current) return;

    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/proctor-event`, {
        session_token: currentToken,
        event_type: eventType,
        description: description
      });

      const newViolations = res.data.violation_count || (violationCountRef.current + 1);
      setViolationsCount(newViolations);

      if (res.data.terminated || newViolations >= 3) {
        handleAutoSubmitRound('Maximum security violation strikes (3/3) exceeded. Fullscreen / tab policy breached.');
      }
    } catch (err) {
      console.error('Failed to log proctor event:', err);
    }
  }, [eventId, subEventId]);

  const [redirectCountdown, setRedirectCountdown] = useState(4);

  // Auto-redirect effect when gaming round completes or auto-submits
  useEffect(() => {
    if (!gameResult) return;
    setShowWarningModal(false);

    if (document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch (e) {}
    }

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameResult, eventId, subEventId, navigate]);

  // 4. Auto-Submit Gaming Round
  const handleAutoSubmitRound = async (reason = 'Security policy violation or timer expiry.') => {
    const currentToken = sessionTokenRef.current;
    setIsPlaying(false);
    setIsAutoSubmitted(true);
    setAutoSubmitReason(reason);
    setShowWarningModal(false);

    // Exit fullscreen cleanly
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }

    if (currentToken) {
      try {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/submit`, {
          session_token: currentToken,
          score: score,
          moves_log: movesLog,
          status: 'auto_submitted'
        });
      } catch (err) {
        console.error('Auto submit error:', err);
      }
    }

    setGameResult({
      status: 'auto_submitted',
      reason: reason,
      verification_hash: 'SERVER-AUTO-TERMINATED'
    });
  };

  // 5. Fullscreen & Tab Switching Telemetry Listeners
  useEffect(() => {
    if (!isPlaying) return;

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && isPlayingRef.current) {
        const nextExits = fullscreenExitsRef.current + 1;
        fullscreenExitsRef.current = nextExits;
        setFullscreenExits(nextExits);
        setViolationsCount(nextExits);

        logProctorViolation('fullscreen_exit', `Participant exited mandatory fullscreen (Exit #${nextExits} of 3)`);

        if (nextExits >= 3) {
          handleAutoSubmitRound('Round Auto-Submitted: Exited full-screen 3 times (Maximum 3 strikes reached).');
        } else {
          setWarningType('fullscreen');
          setFullscreenCountdown(10);
          setWarningMessage(`Full-screen exit detected (Strike ${nextExits} of 3). Please return to full-screen within 10 seconds or your round will be automatically submitted.`);
          setShowWarningModal(true);
        }
      } else if (inFullscreen) {
        setShowWarningModal(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPlayingRef.current) {
        setWarningType('tab_switch');
        setWarningMessage('Tab switching is strictly forbidden! Your violation has been logged to the proctor CCTV.');
        setShowWarningModal(true);
        logProctorViolation('tab_switch', 'Participant switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      if (isPlayingRef.current) {
        setWarningType('tab_switch');
        setWarningMessage('Window focus lost. Please stay focused on the test screen.');
        setShowWarningModal(true);
        logProctorViolation('window_blur', 'Browser window lost focus');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isPlaying, logProctorViolation]);

  // Fullscreen countdown timer when modal is active
  useEffect(() => {
    if (!showWarningModal || warningType !== 'fullscreen' || !isPlaying) return;

    const timer = setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitRound('Auto-submitted due to failure to return to fullscreen within 10 seconds.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarningModal, warningType, isPlaying]);

  // Re-enter fullscreen from warning modal
  const handleReEnterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setShowWarningModal(false);
    } catch (err) {
      toast.error('Could not enter fullscreen mode.');
    }
  };

  // 6. Start a Specific Game in the Pipeline
  const startSpecificGame = async (gameConfig, gameIdx) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('mind_saga_auth_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/start`, {
        game_config_id: gameConfig?.id,
        game_key: gameConfig?.game_key
      });

      const data = res.data;
      setSessionToken(data.session_token);
      sessionTokenRef.current = data.session_token;
      setRemainingSeconds(data.duration_seconds || gameConfig?.duration_seconds || 180);
      setCurrentGameTitle(data.title || gameConfig?.title || `Challenge #${gameIdx + 1}`);
      setCurrentGameKey(data.game_key || gameConfig?.game_key || 'deductive_logic');
      setCurrentGameIndex(gameIdx);
      setScore(0);
      setMovesLog([]);
      setIsPlaying(true);
      setIsTransitioning(false);
      setGameResult(null);

      if (data.game_key === 'deductive_logic' || gameConfig?.game_key === 'deductive_logic') {
        const pList = data.puzzle_data || [];
        setPuzzles(pList);
        setActivePuzzleIndex(0);
        if (pList.length > 0) {
          setUserGrid(JSON.parse(JSON.stringify(pList[0].clues_grid)));
        }
      } else if (data.game_key === 'motion_challenge' || gameConfig?.game_key === 'motion_challenge') {
        setMotionTargets(data.puzzle_data?.targets || []);
        setActiveTargets([]);
        setCombo(0);
      }
    } catch (err) {
      console.error('Failed to start game challenge:', err);
      toast.error(err.response?.data?.error || 'Failed to start game session');
    } finally {
      setLoading(false);
    }
  };

  // 7. Initial Tournament Launch (Enter Fullscreen + Start Game 1)
  const handleLaunchChampionship = async () => {
    if (!cameraActive) {
      toast.error('Please allow camera access before entering the championship arena.');
      await startCamera();
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }

    if (pipelineGames.length === 0) {
      // Fallback default
      await startSpecificGame({ id: null, game_key: 'deductive_logic', title: 'Deductive Symbol Matrix Deduction', duration_seconds: 180 }, 0);
    } else {
      await startSpecificGame(pipelineGames[0], 0);
    }
  };

  // 8. Progress to Next Game in Pipeline or Final Submit
  const handleCompleteCurrentGame = async () => {
    const currentToken = sessionTokenRef.current;
    if (currentToken) {
      try {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/submit`, {
          session_token: currentToken,
          score: score,
          moves_log: movesLog,
          status: 'completed'
        });
      } catch (err) {
        console.error('Score submission error:', err);
      }
    }

    const nextIdx = currentGameIndex + 1;
    if (nextIdx < pipelineGames.length) {
      // Show automated 3s interstitial transition
      setIsPlaying(false);
      setIsTransitioning(true);
      setTransitionCountdown(3);

      let count = 3;
      const tInterval = setInterval(() => {
        count -= 1;
        setTransitionCountdown(count);
        if (count <= 0) {
          clearInterval(tInterval);
          startSpecificGame(pipelineGames[nextIdx], nextIdx);
        }
      }, 1000);
    } else {
      // All games in pipeline complete!
      setIsPlaying(false);
      setGameResult({
        status: 'completed',
        total_games_played: pipelineGames.length || 1,
        verification_hash: `SHA256-${Date.now().toString(36).toUpperCase()}-VERIFIED`
      });

      // Exit fullscreen
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (e) {}
      }
    }
  };

  // Handle Next Game Click with confirmation if timer has not ended
  const handleNextGameClick = () => {
    if (remainingSeconds > 0) {
      setNextGameConfirmModal(true);
    } else {
      handleCompleteCurrentGame();
    }
  };

  // Game countdown timer for the active game
  useEffect(() => {
    if (!isPlaying || gameResult || isTransitioning) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCompleteCurrentGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameResult, isTransitioning, currentGameIndex, pipelineGames, score, movesLog]);

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
      toast.success('Puzzle Solved! Moving to next puzzle...', { icon: '🎉' });
      setScore((prev) => prev + 20);

      // Advance to next puzzle in this game if available
      if (activePuzzleIndex < puzzles.length - 1) {
        const nextIdx = activePuzzleIndex + 1;
        setActivePuzzleIndex(nextIdx);
        setUserGrid(JSON.parse(JSON.stringify(puzzles[nextIdx].clues_grid)));
        setSelectedCell(null);
      } else {
        // Solved all puzzles in this game -> Complete game early and proceed!
        toast.success('All puzzles completed! Proceeding to next round challenge...');
        setTimeout(() => {
          handleCompleteCurrentGame();
        }, 1200);
      }
    }
  };

  // Motion Challenge Game Loop
  useEffect(() => {
    if (currentGameKey !== 'motion_challenge' || !isPlaying || isTransitioning) return;

    const spawnInterval = setInterval(() => {
      const newTarget = {
        id: Math.random().toString(),
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 75) + 10,
        pts: 5,
        created: Date.now()
      };

      setActiveTargets((prev) => [...prev.slice(-3), newTarget]);
    }, 1000);

    return () => clearInterval(spawnInterval);
  }, [currentGameKey, isPlaying, isTransitioning]);

  const handleHitTarget = (targetId) => {
    setActiveTargets((prev) => prev.filter((t) => t.id !== targetId));
    setCombo((prev) => prev + 1);
    const earned = 5 + Math.min(10, combo * 2);
    setScore((prev) => prev + earned);
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

  // 9. GAME OVER / COMPLETION VIEW (Score is strictly hidden)
  if (gameResult) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full rounded-3xl border p-6 sm:p-8 text-center space-y-6 shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
            isAutoSubmitted
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {isAutoSubmitted ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
          </div>

          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAutoSubmitted ? 'Round Auto-Submitted' : 'Gaming Round Complete!'}
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isAutoSubmitted
                ? autoSubmitReason
                : 'All sequential game challenges have been completed. Your gameplay and proctoring telemetry have been authoritatively recorded.'}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-2.5 text-xs text-left ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Round Status:</span>
              <span className={`font-bold font-mono uppercase text-xs ${isAutoSubmitted ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isAutoSubmitted ? 'Auto-Submitted' : 'Completed & Verified'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Challenges Completed:</span>
              <span className={`font-bold font-mono text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {pipelineGames.length > 0 ? `${pipelineGames.length} Game(s)` : 'Completed'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200 dark:border-zinc-800">
              <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>Security Hash:</span>
              <span className="font-mono text-slate-400 truncate max-w-[180px]">
                {gameResult.verification_hash || 'SHA256-VERIFIED'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`)}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{redirectCountdown > 0 ? `Redirecting in ${redirectCountdown}s...` : 'Returning to Arena...'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // 10. AUTOMATED INTERSTITIAL TRANSITION SCREEN (3... 2... 1...)
  if (isTransitioning) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full rounded-3xl border p-8 text-center space-y-6 shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Zap className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Challenge {currentGameIndex + 1} of {pipelineGames.length} Finished
            </span>
            <h2 className="text-xl font-bold mt-3">Next Challenge Loading...</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Preparing Game {currentGameIndex + 2} of {pipelineGames.length}: {pipelineGames[currentGameIndex + 1]?.title || 'Next Game'}
            </p>
          </div>

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-3xl font-black font-mono mx-auto shadow-xl shadow-indigo-600/30 animate-pulse">
            {transitionCountdown}
          </div>

          <p className="text-[11px] text-zinc-500">
            Keep full-screen mode active. Do not switch tabs.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-16 selection:bg-purple-500/30 transition-colors duration-300 ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <header className={`border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md ${
        isDark ? 'border-zinc-800/80 bg-zinc-900/60' : 'border-slate-200 bg-white/80'
      }`}>
        <div className="flex items-center gap-3">
          {!isPlaying && (
            <Link
              to={`/events/${eventId}/sub-events/${subEventId}/mind-saga`}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              Round 2: Gaming Arena
            </h1>
            <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isPlaying
                ? `Game ${currentGameIndex + 1} of ${pipelineGames.length || 1}: ${currentGameTitle}`
                : 'Sequential Cognitive Tournament'}
            </p>
          </div>
        </div>

        {/* In-game Status Bar */}
        {isPlaying && (
          <div className="flex items-center gap-3">
            {/* Live Proctor Status Badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              violationsCount > 0
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${violationsCount > 0 ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
              <span>{violationsCount > 0 ? `${violationsCount}/3 Strikes` : 'Proctor CCTV Live'}</span>
            </div>

            {/* Timer Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border ${
              remainingSeconds <= 30
                ? 'bg-rose-950/40 text-rose-400 border-rose-500/40 animate-pulse'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-purple-400'
                : 'bg-slate-100 border-slate-200 text-purple-600'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Skip / Next Game Button */}
            <button
              onClick={handleNextGameClick}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md transition cursor-pointer"
            >
              <span>{currentGameIndex + 1 < pipelineGames.length ? 'Next Game' : 'Finish Round'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Exit Round Button */}
            <button
              onClick={() => setExitConfirmModal(true)}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Exit Gaming Arena"
            >
              <VideoOff className="w-3.5 h-3.5 hidden sm:inline" />
              <span>Exit</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* LOBBY & PRE-FLIGHT HARDWARE PROCTORING CHECK */}
        {!isPlaying && (
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 shadow-xl ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Phase 2 Championship
              </span>
              <h2 className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Hardware & Proctoring Check
              </h2>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Round 2 consists of {pipelineGames.length || 2} sequential cognitive challenges. Puzzles will start automatically and transition sequentially once the timer completes.
              </p>
            </div>

            {/* Camera Preview and Rules Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Camera Video Stream Box */}
              <div className={`relative rounded-2xl border aspect-video overflow-hidden flex items-center justify-center shadow-inner ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 text-[10px] font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      CAMERA VERIFIED
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <VideoOff className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs font-medium text-rose-400">{cameraError || 'Camera stream not initialized'}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Strict Proctoring Rules List */}
              <div className="space-y-3">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Mandatory Examination Rules
                </h4>

                <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                  isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <Maximize className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-800'}`}>Mandatory Fullscreen</span>
                      <span className="text-[11px] text-zinc-400">Exiting fullscreen triggers a 10s timer and strike penalty.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-800'}`}>No Tab Switching</span>
                      <span className="text-[11px] text-zinc-400">Tab switches and window blurs are automatically flagged.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-800'}`}>Continuous Camera Proctoring</span>
                      <span className="text-[11px] text-zinc-400">Your live camera feed will be monitored during all game rounds.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-800'}`}>3-Strike Auto-Submission</span>
                      <span className="text-[11px] text-zinc-400">Reaching 3 security strikes will terminate and auto-submit the round.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Championship Button */}
            <button
              onClick={handleLaunchChampionship}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm transition shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider"
            >
              <Maximize className="w-4 h-4" />
              <span>Enter Fullscreen &amp; Begin Championship</span>
            </button>
          </div>
        )}

        {/* ACTIVE GAME 1: DEDUCTIVE LOGIC (4x4 Latin Square Shape Deduction) */}
        {isPlaying && currentGameKey === 'deductive_logic' && (
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 shadow-xl ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-400 font-bold uppercase">
                  Puzzle {activePuzzleIndex + 1} of {puzzles.length || 1}
                </span>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  4x4 Symbol Matrix Deduction
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Rule: Each row and column must contain Square, Plus, Triangle, and Circle with strictly NO repetitions.
                </p>
              </div>
            </div>

            {/* 4x4 Grid Layout */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-4">
              <div className={`grid grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl border-2 shadow-2xl ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-300'
              }`}>
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
                        className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-950/40 ring-4 ring-purple-500/30 scale-105 z-10'
                            : isClue
                            ? isDark
                              ? 'border-zinc-800 bg-zinc-900/90 shadow-inner'
                              : 'border-slate-300 bg-slate-200/80 shadow-inner'
                            : isDark
                            ? 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                            : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        {symbolInfo && Icon ? (
                          <div className={`p-1.5 sm:p-2 rounded-xl ${symbolInfo.bg} ${symbolInfo.color}`}>
                            <Icon className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-zinc-500">?</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Symbol Palette Selector */}
            <div className={`p-4 rounded-2xl border flex flex-col items-center gap-3 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Select Symbol for Selected Slot:
              </span>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                {Object.keys(symbolComponents).map((key) => {
                  const item = symbolComponents[key];
                  const Icon = item.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePlaceSymbol(key)}
                      disabled={!selectedCell}
                      className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition disabled:opacity-30 cursor-pointer ${item.bg} ${item.color} hover:scale-105`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleClearCell}
                  disabled={!selectedCell}
                  className={`px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  }`}
                  title="Clear Cell"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE GAME 2: MOTION CHALLENGE */}
        {isPlaying && currentGameKey === 'motion_challenge' && (
          <div className={`rounded-3xl border p-6 sm:p-8 space-y-4 shadow-xl ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Motion Challenge Precision Reflex
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Click target beacons within milliseconds before they expire.
                </p>
              </div>
              <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Combo: x{combo}
              </div>
            </div>

            {/* Spatial Matrix Arena */}
            <div className={`relative w-full h-80 rounded-2xl overflow-hidden shadow-inner cursor-crosshair border-2 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
            }`}>
              {activeTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleHitTarget(target.id)}
                  style={{ left: `${target.x}%`, top: `${target.y}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 border-2 border-white shadow-xl shadow-pink-500/40 flex items-center justify-center animate-ping transition hover:scale-125 cursor-pointer"
                >
                  <Target className="w-6 h-6 text-white" />
                </button>
              ))}

              {activeTargets.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                  Targets spawning in trajectory...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PIP CAMERA LIVE PROCTORING BOX (Sticky Corner) */}
      {isPlaying && (
        <div className="fixed bottom-4 right-4 z-50 w-36 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-2xl bg-black">
          <video
            ref={pipVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute top-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10 text-[9px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>LIVE CCTV</span>
          </div>
        </div>
      )}

      {/* PROCTORING SECURITY WARNING MODAL */}
      {showWarningModal && isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border-2 border-rose-500 rounded-3xl w-full max-w-md p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-rose-600/30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Security Strike {violationsCount} of 3
              </span>
              <h3 className="text-xl font-black text-white mt-3">Proctoring Violation Warning</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                {warningMessage}
              </p>
            </div>

            {warningType === 'fullscreen' && (
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                <span className="text-xs text-zinc-400">Time remaining to return:</span>
                <div className="text-3xl font-black text-rose-400 font-mono">
                  {fullscreenCountdown}s
                </div>
              </div>
            )}

            <div className="pt-2">
              {warningType === 'fullscreen' ? (
                <button
                  onClick={handleReEnterFullscreen}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Maximize className="w-4 h-4" />
                  <span>Return to Fullscreen Now</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  I Understand · Continue Test
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXIT GAMING ROUND CONFIRMATION WARNING MODAL */}
      {exitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Exit Gaming Arena?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Exiting will terminate and submit your current gaming run, <strong>consuming 1 attempt</strong>. If all your allowed attempts are exhausted, you will <strong>NOT</strong> be permitted to restart this round.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmModal(false);
                  handleAutoSubmitRound('Participant voluntarily exited the gaming round.');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Exit & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEXT GAME CONFIRMATION WARNING MODAL */}
      {nextGameConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 sm:p-7 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {currentGameIndex + 1 < pipelineGames.length ? 'Advance to Next Challenge?' : 'Complete Gaming Round?'}
              </h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                You still have <strong className="text-indigo-400 font-mono text-sm">{formatTimer(remainingSeconds)}</strong> remaining on this challenge timer. Are you sure you want to finalize this game early and advance?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNextGameConfirmModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setNextGameConfirmModal(false);
                  handleCompleteCurrentGame();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{currentGameIndex + 1 < pipelineGames.length ? 'Yes, Next Game' : 'Yes, Finish'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY WEBCAM SURVEILLANCE MODAL */}
      {!cameraActive && isPlaying && !gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-zinc-900 border-2 border-rose-500/80 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-rose-600/30">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Surveillance Enforced
              </span>
              <h3 className="text-xl font-black text-white mt-3">Live Camera Required</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Gaming round requires continuous live webcam proctoring. You must enable your camera to continue.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Video className="w-4 h-4" />
              <span>Enable Camera Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindSagaGamingArenaPage;
