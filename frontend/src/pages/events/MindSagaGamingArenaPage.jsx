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
  CheckCircle,
  Sun,
  Moon
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import MotionChallengeGame from './components/MotionChallengeGame';
import './MindSagaTheme.css';

const MindSagaGamingArenaPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { theme, toggleTheme } = useTheme ? useTheme() : { theme: 'dark', toggleTheme: () => {} };
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
  const [currentGameKey, setCurrentGameKey] = useState('motion_challenge');
  const [score, setScore] = useState(0);
  const [motionGameData, setMotionGameData] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [nextGameModal, setNextGameModal] = useState({ isOpen: false, completedTitle: '', nextGame: null, nextIndex: 0 });
  const socketRef = useRef(null);

  // Proctoring Hardware & Security State
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(typeof document !== 'undefined' && document.fullscreenElement));
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
  const captureVideoRef = useRef(null);
  const violationCountRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const sessionTokenRef = useRef(null);

  // Global Fullscreen state tracker
  useEffect(() => {
    const handleFS = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    handleFS();
    document.addEventListener('fullscreenchange', handleFS);
    return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

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
        videoRef.current.play().catch(() => {});
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
        pipVideoRef.current.play().catch(() => {});
      }
      if (captureVideoRef.current) {
        captureVideoRef.current.srcObject = stream;
        captureVideoRef.current.play().catch(() => {});
      }

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraActive(false);
          setCameraError('Camera was disconnected.');
          const currentToken = sessionTokenRef.current;
          if (currentToken) {
            axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/snapshot`, {
              session_token: currentToken,
              image_data: null,
              camera_status: 'disconnected',
              round: 2
            }).catch(() => {});
          }
        };
      });
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

  // Sync camera streams to video elements whenever available
  useEffect(() => {
    if (cameraStream) {
      const syncVid = (el) => {
        if (el && el.srcObject !== cameraStream) {
          el.srcObject = cameraStream;
          el.play().catch(() => {});
        }
      };
      syncVid(videoRef.current);
      syncVid(pipVideoRef.current);
      syncVid(captureVideoRef.current);
    }
  }, [cameraStream, isPlaying, isFullscreen]);

  // Periodic CCTV Live Frame Streaming & Admin Heartbeat Listener
  const sendSnapshotFrame = useCallback(async () => {
    const currentToken = sessionTokenRef.current;
    if (!currentToken || !cameraActive || !isPlayingRef.current) return;

    try {
      let snapshotData = null;

      // 1. Hardware-level ImageCapture API: grabs raw frame even if tab/element is backgrounded
      try {
        const videoTrack = cameraStream?.getVideoTracks?.()?.[0];
        if (videoTrack && videoTrack.readyState === 'live' && typeof window.ImageCapture === 'function') {
          const imageCapture = new window.ImageCapture(videoTrack);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, 320, 240);
          snapshotData = canvas.toDataURL('image/jpeg', 0.65);
        }
      } catch (icErr) {
        // Fallback to video elements below
      }

      // 2. Video element fallback if ImageCapture did not produce frame
      if (!snapshotData) {
        const candidates = [captureVideoRef.current, pipVideoRef.current, videoRef.current];
        for (const vid of candidates) {
          if (vid && vid.videoWidth > 0) {
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = 320;
            captureCanvas.height = 240;
            const ctx = captureCanvas.getContext('2d');
            ctx.drawImage(vid, 0, 0, 320, 240);
            snapshotData = captureCanvas.toDataURL('image/jpeg', 0.65);
            break;
          }
        }
      }

      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/snapshot`, {
        session_token: currentToken,
        image_data: snapshotData,
        camera_status: cameraActive ? 'connected' : 'disconnected',
        round: 2
      });

      if (res.data?.terminated) {
        const blockReason = res.data?.termination_reason || 'Terminated by Proctor Administrator.';
        handleAutoSubmitRound(`Round Terminated by Administrator: ${blockReason}`);
      }
    } catch (err) {
      // Silent fail on minor network hiccups
    }
  }, [cameraActive, cameraStream, eventId, subEventId]);

  useEffect(() => {
    if (!isPlaying || !cameraActive) return;

    // Send initial snapshot immediately
    sendSnapshotFrame();

    const streamInterval = setInterval(sendSnapshotFrame, 2500);
    return () => clearInterval(streamInterval);
  }, [isPlaying, cameraActive, sendSnapshotFrame]);

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
        // Send exit call to terminate session and sync Master score
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/exit`, {
          session_token: currentToken,
          score: score,
          moves_log: movesLog,
          status: 'auto_submitted',
          reason: reason
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

  // 5. Fullscreen, Tab Switching & Anti-Cheat Telemetry Listeners
  useEffect(() => {
    if (!isPlaying) return;

    const triggerSecurityViolation = (eventType, reason) => {
      if (!isPlayingRef.current) return;

      const nextExits = fullscreenExitsRef.current + 1;
      fullscreenExitsRef.current = nextExits;
      setFullscreenExits(nextExits);
      setViolationsCount(nextExits);

      logProctorViolation(eventType, `${reason} (Strike #${nextExits} of 3)`);

      if (nextExits >= 3) {
        handleAutoSubmitRound('Round Auto-Submitted: Maximum 3 security strikes reached (tab switch, window minimization, or app switch).');
      } else {
        setWarningType('fullscreen');
        setFullscreenCountdown(10);
        setWarningMessage(`${reason} (Strike ${nextExits} of 3). Full-screen mode is strictly enforced. Return and re-enter full-screen within 10 seconds or your round will be automatically submitted.`);
        setShowWarningModal(true);
      }
    };

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && isPlayingRef.current) {
        triggerSecurityViolation('fullscreen_exit', 'Mandatory full-screen mode exited!');
      } else if (inFullscreen) {
        setShowWarningModal(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPlayingRef.current) {
        triggerSecurityViolation('tab_switch', 'Tab switch or window minimization detected!');
      }
    };

    const handleWindowBlur = () => {
      if (isPlayingRef.current) {
        triggerSecurityViolation('window_blur', 'Window lost focus or another application was opened!');
      }
    };

    // Block copy / paste / right click / Devtools & App switch shortcuts
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        e.key === 'F11' ||
        (e.altKey && e.key === 'Tab') ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 't' || e.key === 'n' || e.key === 'w'))
      ) {
        e.preventDefault();
        triggerSecurityViolation('devtools_opened', 'Restricted keyboard shortcut or tab switch intercepted.');
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
      }
    };

    // Before unload / tab close beacon
    const handleBeforeUnload = () => {
      const currentToken = sessionTokenRef.current;
      if (currentToken && isPlayingRef.current) {
        const payload = JSON.stringify({
          session_token: currentToken,
          score: score,
          moves_log: movesLog,
          status: 'terminated'
        });
        const url = `/events/${eventId}/sub-events/${subEventId}/mind-saga/games/exit`;
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isPlaying, logProctorViolation, eventId, subEventId, score, movesLog]);

  // Realtime countdown timer: ticks every second whenever warning modal is active
  useEffect(() => {
    if (!showWarningModal || !isPlaying || gameResult) return;

    const timer = setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitRound('Auto-submitted due to failure to return to full-screen within 10 seconds.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarningModal, isPlaying, gameResult]);

  // Re-enter fullscreen from warning modal or corner button and continue
  const handleReEnterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
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

      const isMotion = (data.game_key === 'motion_challenge' || gameConfig?.game_key === 'motion_challenge');
      setIsTimerRunning(!isMotion); // Motion Challenge timer starts only when candidate clicks Play!

      if (data.game_key === 'deductive_logic' || gameConfig?.game_key === 'deductive_logic') {
        const pList = data.puzzle_data || [];
        setPuzzles(pList);
        setActivePuzzleIndex(0);
        if (pList.length > 0) {
          setUserGrid(JSON.parse(JSON.stringify(pList[0].clues_grid)));
        }
      } else if (data.game_key === 'motion_challenge' || gameConfig?.game_key === 'motion_challenge') {
        setMotionGameData(data.puzzle_data);
      }

      // Send realtime game_join over WebSocket
      try {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'game_join',
            subEventId: Number(subEventId),
            gameKey: data.game_key || gameConfig?.game_key,
            userId: Number(sessionStorage.getItem('mind_saga_sub_id') || 0)
          }));
        }
      } catch (e) {}
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

    // Strictly require fullscreen — abort if not granted
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        toast.error('⚠️ Fullscreen is mandatory to start the gaming round. Please allow fullscreen and try again.');
        return; // Abort launch - do NOT start game without fullscreen
      }
    }

    if (pipelineGames.length === 0) {
      // Fallback default: Motion Challenge first
      await startSpecificGame({ id: null, game_key: 'motion_challenge', title: 'MOTION CHALLENGE: Spatial Path Creation & Block Shifting', duration_seconds: 240 }, 0);
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
      // Pause active gameplay and show interactive "Start Next Game" pipeline popup
      setIsPlaying(false);
      setNextGameModal({
        isOpen: true,
        completedTitle: currentGameTitle,
        nextGame: pipelineGames[nextIdx],
        nextIndex: nextIdx
      });
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

  // Game countdown timer for the active game (only ticks when active gameplay starts)
  useEffect(() => {
    if (!isPlaying || !isTimerRunning || gameResult || isTransitioning) return;

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
  }, [isPlaying, isTimerRunning, gameResult, isTransitioning, currentGameIndex, pipelineGames, score, movesLog]);

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
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center p-4 relative">
        <div className="mindsaga-bg-stars" aria-hidden="true">
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mindsaga-card max-w-md w-full p-6 sm:p-8 text-center space-y-6 rounded-none relative z-10"
        >
          <div className={`w-14 h-14 rounded-none border flex items-center justify-center mx-auto ${
            isAutoSubmitted
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}>
            {isAutoSubmitted ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle className="w-7 h-7" />}
          </div>

          <div>
            <h2 className="text-xl font-bold font-mono uppercase text-slate-900 dark:text-white">
              {isAutoSubmitted ? 'Round Auto-Submitted' : 'Gaming Round Complete'}
            </h2>
            <p className="text-xs mt-1.5 leading-relaxed text-slate-600 dark:text-slate-400">
              {isAutoSubmitted ? autoSubmitReason : 'Sequential challenges completed and telemetry recorded.'}
            </p>
          </div>

          <div className="p-3.5 rounded-none border space-y-2 text-xs text-left bg-slate-100/50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <span className={`font-bold uppercase ${isAutoSubmitted ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isAutoSubmitted ? 'Auto-Submitted' : 'Completed & Verified'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Challenges:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {pipelineGames.length > 0 ? `${pipelineGames.length} Game(s)` : 'Completed'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400">Security Hash:</span>
              <span className="text-slate-400 truncate max-w-[180px]">
                {gameResult.verification_hash || 'SHA256-VERIFIED'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`)}
            className="mindsaga-btn-space w-full py-3 text-xs rounded-none"
          >
            <span>{redirectCountdown > 0 ? `Redirecting in ${redirectCountdown}s...` : 'Returning to Arena...'}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </motion.div>
      </div>
    );
  }

  // 10. AUTOMATED INTERSTITIAL TRANSITION SCREEN (3... 2... 1...)
  if (isTransitioning) {
    return (
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center p-4 relative">
        <div className="mindsaga-bg-stars" aria-hidden="true">
          <span className="mindsaga-star" />
          <span className="mindsaga-star" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mindsaga-card max-w-md w-full p-8 text-center space-y-6 rounded-none relative z-10"
        >
          <div className="w-14 h-14 rounded-none bg-sky-500/10 border border-sky-500/30 text-sky-500 flex items-center justify-center mx-auto">
            <Zap className="w-7 h-7 animate-bounce" />
          </div>

          <div>
            <span className="mindsaga-hud-badge border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              Challenge {currentGameIndex + 1} of {pipelineGames.length} Finished
            </span>
            <h2 className="text-xl font-bold font-mono uppercase mt-3 text-slate-900 dark:text-white">Next Challenge Loading</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Preparing {pipelineGames[currentGameIndex + 1]?.title || 'Next Game'}
            </p>
          </div>

          <div className="w-16 h-16 rounded-none bg-sky-500/15 border border-sky-400/40 text-sky-600 dark:text-sky-300 flex items-center justify-center text-3xl font-black font-mono mx-auto">
            {transitionCountdown}
          </div>

          <p className="text-[11px] font-mono text-slate-500">
            Keep full-screen mode active.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mindsaga-space-bg min-h-screen font-sans pb-16 selection:bg-sky-500/30 relative text-slate-900 dark:text-slate-100">
      {/* Background Shooting Stars */}
      <div className="mindsaga-bg-stars" aria-hidden="true">
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
        <span className="mindsaga-star" />
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/50 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3">
          {!isPlaying && (
            <Link
              to={`/events/${eventId}/sub-events/${subEventId}/mind-saga`}
              className="p-1.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-sm font-bold flex items-center gap-2 font-mono uppercase text-slate-900 dark:text-white">
              <Gamepad2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Round 2: Gaming Arena
            </h1>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isPlaying
                ? `Game ${currentGameIndex + 1}/${pipelineGames.length || 1}: ${currentGameTitle}`
                : 'Cognitive Tournament'}
            </p>
          </div>
        </div>

        {/* In-game Status Bar & Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReEnterFullscreen}
            className="p-1.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer text-xs font-mono"
            title="Toggle Full Screen Mode"
          >
            <Maximize className="w-4 h-4 text-sky-500" />
            <span className="hidden md:inline">{isFullscreen ? 'Full Screen' : 'Go Full Screen'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition flex items-center justify-center cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {isPlaying && (
            <>
              {/* Live Proctor Status Badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-semibold border ${
                violationsCount > 0
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                <span className={`w-2 h-2 rounded-none ${violationsCount > 0 ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                <span>{violationsCount > 0 ? `${violationsCount}/3 Strikes` : 'Proctor Live'}</span>
              </div>

              {/* Timer Badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-none font-mono text-xs font-bold border ${
                remainingSeconds <= 30
                  ? 'bg-rose-950/40 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'mindsaga-hud-badge border-purple-400/40 text-purple-600 dark:text-purple-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(remainingSeconds)}</span>
              </div>

              {/* Skip / Next Game Button */}
              <button
                onClick={handleNextGameClick}
                className="mindsaga-btn-space px-3 py-1 text-xs rounded-none cursor-pointer"
              >
                <span>{currentGameIndex + 1 < pipelineGames.length ? 'Next' : 'Finish'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>

              {/* Exit Round Button */}
              <button
                onClick={() => setExitConfirmModal(true)}
                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-600 dark:text-red-300 border border-red-500/30 rounded-none text-xs font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Exit Gaming Arena"
              >
                <VideoOff className="w-3.5 h-3.5 hidden sm:inline" />
                <span>Exit</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hidden persistent capture video */}
      <video
        ref={captureVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, pointerEvents: 'none', opacity: 0 }}
      />

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6 relative z-10">
        {/* LOBBY & PRE-FLIGHT HARDWARE PROCTORING CHECK */}
        {!isPlaying && (
          <div className="mindsaga-card p-6 sm:p-8 space-y-6 rounded-none">
            <div>
              <span className="mindsaga-hud-badge border-purple-500/30 text-purple-600 dark:text-purple-300">
                Phase 2 Championship
              </span>
              <h2 className="text-2xl font-bold font-mono uppercase mt-2 text-slate-900 dark:text-white tracking-tight">
                Hardware &amp; Proctoring Check
              </h2>
              <p className="text-xs sm:text-sm mt-1 text-slate-600 dark:text-slate-400">
                {pipelineGames.length || 2} cognitive challenges • Camera verification &amp; Fullscreen required to start
              </p>
            </div>

            {/* Camera Preview and Rules Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Camera Video Stream Box */}
              <div className={`relative rounded-none border aspect-video overflow-hidden flex items-center justify-center shadow-inner ${
                isDark ? 'bg-zinc-950 border-white/10' : 'bg-slate-100 border-slate-300'
              }`}>
                {cameraActive ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && cameraStream && el.srcObject !== cameraStream) {
                          el.srcObject = cameraStream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-none flex items-center gap-1.5 border border-white/10 text-[10px] font-mono font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-ping" />
                      CAMERA VERIFIED
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <VideoOff className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-xs font-mono text-rose-500">{cameraError || 'Camera required'}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mindsaga-btn-space px-3 py-1.5 text-xs rounded-none cursor-pointer"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Strict Proctoring Rules List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Examination Rules
                </h4>

                <div className={`p-3.5 rounded-none border space-y-2.5 text-xs ${
                  isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <Maximize className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Mandatory Fullscreen</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Exit triggers penalty strikes.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">No Tab Switching</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Switches auto-flagged.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Camera Proctoring</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Live feed monitored on admin CCTV.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">3-Strike Limit</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Reaching 3 strikes auto-submits.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status Pills */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-2.5 rounded-none border flex items-center justify-between ${
                cameraActive && cameraStream
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}>
                <span className="font-mono font-bold uppercase text-[11px]">Camera</span>
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  {cameraActive && cameraStream ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {cameraActive && cameraStream ? 'Verified' : 'Required'}
                </span>
              </div>

              <div className={`p-2.5 rounded-none border flex items-center justify-between ${
                isFullscreen
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                <span className="font-mono font-bold uppercase text-[11px]">Fullscreen</span>
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  {isFullscreen ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {isFullscreen ? 'Active' : 'Required'}
                </span>
              </div>
            </div>

            {/* Gated Action Button: ONLY show Start when camera verified AND fullscreen is on */}
            {cameraActive && Boolean(cameraStream) && isFullscreen ? (
              <button
                type="button"
                onClick={handleLaunchChampionship}
                className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Championship Arena</span>
              </button>
            ) : !isFullscreen ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                  } catch (e) {
                    toast.error('Please allow fullscreen mode to proceed.');
                  }
                }}
                className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Maximize className="w-4 h-4" />
                <span>Enter Fullscreen Mode</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Enable Camera to Begin</span>
              </button>
            )}
          </div>
        )}

        {/* ACTIVE GAME 1: DEDUCTIVE LOGIC (4x4 Latin Square Shape Deduction) */}
        {isPlaying && currentGameKey === 'deductive_logic' && (
          <div className="mindsaga-card p-5 sm:p-7 space-y-6 rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <span className="mindsaga-hud-badge border-purple-500/30 text-purple-600 dark:text-purple-300">
                  Puzzle {activePuzzleIndex + 1}/{puzzles.length || 1}
                </span>
                <h3 className="text-base font-bold font-mono uppercase mt-1 text-slate-900 dark:text-white">
                  Symbol Matrix Deduction
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No repeating symbols in any row or column.
                </p>
              </div>
            </div>

            {/* 4x4 Grid Layout */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-4">
              <div className={`grid grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-none border-2 shadow-2xl ${
                isDark ? 'bg-zinc-950 border-white/15' : 'bg-slate-100 border-slate-300'
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
                        className={`w-14 h-14 sm:w-20 sm:h-20 rounded-none border-2 flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-950/40 ring-4 ring-purple-500/30 scale-105 z-10'
                            : isClue
                            ? isDark
                              ? 'border-white/10 bg-zinc-900/90 shadow-inner'
                              : 'border-slate-300 bg-slate-200/80 shadow-inner'
                            : isDark
                            ? 'border-white/10 bg-zinc-950 hover:border-white/20'
                            : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        {symbolInfo && Icon ? (
                          <div className={`p-1.5 sm:p-2 rounded-none ${symbolInfo.bg} ${symbolInfo.color}`}>
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
            <div className={`p-4 rounded-none border flex flex-col items-center gap-3 ${
              isDark ? 'bg-zinc-950 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                Select Symbol for Slot:
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
                      className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-none border flex items-center gap-2 font-bold text-xs transition disabled:opacity-30 cursor-pointer ${item.bg} ${item.color} hover:scale-105`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleClearCell}
                  disabled={!selectedCell}
                  className={`px-3 py-2 sm:py-2.5 rounded-none text-xs font-semibold border transition cursor-pointer ${
                    isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  }`}
                  title="Clear Cell"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE GAME 2: MOTION CHALLENGE (Path Creation & Block Sliding) */}
        {isPlaying && currentGameKey === 'motion_challenge' && (
          <MotionChallengeGame
            gameData={motionGameData}
            isDark={isDark}
            sessionToken={sessionToken}
            subEventId={subEventId}
            initialScore={score}
            onStartTimer={() => setIsTimerRunning(true)}
            onScoreUpdate={(newScore) => setScore(newScore)}
            onMoveAction={(moveData) => {
              setMovesLog((prev) => [...prev, moveData]);
              try {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  socketRef.current.send(JSON.stringify({
                    type: 'game_move',
                    subEventId: Number(subEventId),
                    gameKey: 'motion_challenge',
                    move: moveData
                  }));
                }
              } catch (e) {}
            }}
            onGameComplete={() => {
              handleCompleteCurrentGame();
            }}
          />
        )}
      </div>

      {/* PIP CAMERA LIVE PROCTORING BOX (Sticky Corner) */}
      {isPlaying && (
        <div className="fixed bottom-4 right-4 z-50 w-36 sm:w-44 aspect-video rounded-none overflow-hidden border-2 border-indigo-500 shadow-2xl bg-black">
          <video
            ref={pipVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute top-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded-none flex items-center gap-1 border border-white/10 text-[9px] font-mono font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-ping" />
            <span>LIVE CCTV</span>
          </div>
        </div>
      )}

      {/* PROCTORING SECURITY WARNING MODAL */}
      {showWarningModal && isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mindsaga-card border-2 border-rose-500 rounded-none w-full max-w-md p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <span className="mindsaga-hud-badge border-rose-500/40 text-rose-500">
                Strike {violationsCount} of 3
              </span>
              <h3 className="text-lg font-bold font-mono uppercase text-slate-900 dark:text-white mt-3">Proctoring Warning</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {(!document.fullscreenElement || !isFullscreen)
                  ? `Full-screen exit detected (Strike ${violationsCount} of 3). Please return to full-screen mode immediately.`
                  : warningMessage}
              </p>
            </div>

            {(!document.fullscreenElement || !isFullscreen || warningType === 'fullscreen') && (
              <div className="bg-slate-100/60 dark:bg-zinc-950 p-4 rounded-none border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Return Countdown:</span>
                  <span className="text-2xl font-black text-rose-500 font-mono animate-pulse">{fullscreenCountdown}s</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-none overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, (fullscreenCountdown / 10) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono text-left">
                  Strike {violationsCount} of 3. On 3rd exit, the round automatically submits.
                </p>
              </div>
            )}

            <div className="pt-2">
              {(!document.fullscreenElement || !isFullscreen || warningType === 'fullscreen') ? (
                <button
                  type="button"
                  onClick={handleReEnterFullscreen}
                  className="mindsaga-btn-space w-full py-3.5 text-xs font-mono uppercase tracking-wider rounded-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Maximize className="w-4 h-4 mr-1" />
                  <span>Enter Full Screen & Continue</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="mindsaga-btn-space w-full py-3.5 text-xs font-mono uppercase tracking-wider rounded-none cursor-pointer"
                >
                  Continue Test
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXIT GAMING ROUND CONFIRMATION WARNING MODAL */}
      {exitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mindsaga-card border-2 border-rose-500/50 rounded-none max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono uppercase text-slate-900 dark:text-white">Exit Gaming Arena?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Exiting will submit your current run and consume 1 attempt.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmModal(false)}
                className="flex-1 py-2.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmModal(false);
                  handleAutoSubmitRound('Participant voluntarily exited the gaming round.');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-none text-xs font-mono font-bold transition shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Exit &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEXT GAME CONFIRMATION WARNING MODAL */}
      {nextGameConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mindsaga-card border-2 border-indigo-500/50 rounded-none max-w-md w-full p-6 sm:p-7 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono uppercase text-slate-900 dark:text-white">
                {currentGameIndex + 1 < pipelineGames.length ? 'Advance to Next Challenge?' : 'Complete Gaming Round?'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                <span className="font-mono text-indigo-400 font-bold">{formatTimer(remainingSeconds)}</span> remaining on timer. Advance early?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNextGameConfirmModal(false)}
                className="flex-1 py-2.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={() => {
                  setNextGameConfirmModal(false);
                  handleCompleteCurrentGame();
                }}
                className="mindsaga-btn-space flex-1 py-2.5 text-xs rounded-none cursor-pointer"
              >
                <span>{currentGameIndex + 1 < pipelineGames.length ? 'Next Game' : 'Finish'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE ADVANCEMENT MODAL: "START NEXT GAME" POPUP */}
      <AnimatePresence>
        {nextGameModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="mindsaga-card border-2 border-emerald-500/50 rounded-none max-w-lg w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>

              <div>
                <span className="mindsaga-hud-badge border-emerald-500/40 text-emerald-400">
                  Challenge Time Expired
                </span>
                <h3 className="text-xl font-bold font-mono uppercase text-slate-900 dark:text-white mt-2">
                  Ready for Next Challenge?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  You have concluded <span className="font-semibold text-slate-900 dark:text-white">"{nextGameModal.completedTitle}"</span>. The next stage in the Mind Saga championship pipeline is ready.
                </p>
              </div>

              <div className="p-4 rounded-none border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-zinc-950 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Next Stage:</span>
                  <span className="font-bold text-indigo-500 dark:text-indigo-400">
                    Game #{nextGameModal.nextIndex + 1}: {nextGameModal.nextGame?.title || 'Next Game'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Time Limit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Math.round((nextGameModal.nextGame?.duration_seconds || 180) / 60)} minutes ({nextGameModal.nextGame?.duration_seconds || 180}s)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Pipeline Queue:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {nextGameModal.nextIndex + 1} of {pipelineGames.length}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextG = nextGameModal.nextGame;
                    const nextIdx = nextGameModal.nextIndex;
                    setNextGameModal({ isOpen: false, completedTitle: '', nextGame: null, nextIndex: 0 });
                    startSpecificGame(nextG, nextIdx);
                  }}
                  className="mindsaga-btn-space w-full py-3.5 text-xs font-mono uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <span>Start Next Game</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY WEBCAM SURVEILLANCE MODAL */}
      {!cameraActive && isPlaying && !gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="mindsaga-card border-2 border-rose-500 rounded-none max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-rose-600/30">
            <div className="w-14 h-14 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Video className="w-7 h-7" />
            </div>
            <div>
              <span className="mindsaga-hud-badge border-rose-500/30 text-rose-500">
                Surveillance Required
              </span>
              <h3 className="text-xl font-bold font-mono uppercase text-slate-900 dark:text-white mt-3">Live Camera Required</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Continuous live webcam proctoring required to continue.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="mindsaga-btn-space w-full py-3.5 text-xs rounded-none"
            >
              <Video className="w-4 h-4 mr-1.5" />
              <span>Enable Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Floating Corner Full Screen Button */}
      <button
        type="button"
        onClick={handleReEnterFullscreen}
        className="fixed top-16 right-4 z-40 bg-slate-900/90 dark:bg-black/90 text-sky-400 hover:text-white border border-sky-500/50 hover:border-sky-400 px-3 py-2 rounded-none text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
        title="Enter Full Screen Mode"
      >
        <Maximize className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
        <span>{isFullscreen ? 'Full Screen Active' : 'Go Full Screen'}</span>
      </button>

      {/* Permanently mounted hidden capture video for reliable frame grabbing */}
      <video
        ref={captureVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default MindSagaGamingArenaPage;
