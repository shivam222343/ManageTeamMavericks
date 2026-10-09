import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Video,
  Mic,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Pencil,
  RotateCcw,
  Check,
  Sparkles,
  Maximize2,
  X,
  Volume2,
  ArrowRight,
  Sun,
  Moon,
  VideoOff
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import DrawingCanvasModal from '../../components/ui/DrawingCanvasModal';
import VoiceAnswerRecorder from '../../components/ui/VoiceAnswerRecorder';
import './MindSagaTheme.css';

const MindSagaAptitudeTestPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { theme, toggleTheme } = useTheme ? useTheme() : { theme: 'dark', toggleTheme: () => {} };
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Test Session State
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: answerValue }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [remainingSeconds, setRemainingSeconds] = useState(1800);
  const [savingStatus, setSavingStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Proctoring & Media State
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('connecting'); // 'connected' | 'denied' | 'disconnected'
  const [micStatus, setMicStatus] = useState('connecting');
  const [violationCount, setViolationCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(10);
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: '', message: '', isFullscreenWarning: false });
  const [isFullscreen, setIsFullscreen] = useState(Boolean(typeof document !== 'undefined' && document.fullscreenElement));
  const [exitConfirmModal, setExitConfirmModal] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false); // Must enter fullscreen before test begins

  // Drawing modal state
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);

  const videoRef = useRef(null);
  const captureVideoRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const fullscreenExitsRef = useRef(0);
  const isFullscreenWarningRef = useRef(false);

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
    fullscreenExitsRef.current = fullscreenExits;
  }, [fullscreenExits]);

  // Fullscreen countdown timer
  useEffect(() => {
    if (!warningModal.isOpen || !warningModal.isFullscreenWarning || testResult) return;

    const timer = setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('Auto-submitted due to failure to return to full-screen in 10s.');
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [warningModal.isOpen, warningModal.isFullscreenWarning, testResult]);

  // 1. Initialize Test Session
  const initSession = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('mind_saga_auth_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/start`);
      const data = res.data;

      if (['submitted', 'auto_submitted', 'terminated'].includes(data.status)) {
        setTestResult(data);
        setLoading(false);
        return;
      }

      setSessionData(data);
      setQuestions(data.questions || []);
      setRemainingSeconds(data.remaining_seconds || 1800);
      setViolationCount(data.violation_count || 0);

      if (data.saved_answers && typeof data.saved_answers === 'object') {
        setAnswers(data.saved_answers);
      }
    } catch (err) {
      console.error('Failed to start test session:', err);
      toast.error(err.response?.data?.error || 'Failed to start test');
      navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`);
    } finally {
      setLoading(false);
    }
  }, [eventId, subEventId, navigate]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // 2. Camera & Microphone Setup
  const startMedia = useCallback(async () => {
    try {
      setCameraStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      setCameraStream(stream);
      setCameraStatus('connected');
      setMicStatus('connected');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (captureVideoRef.current) {
        captureVideoRef.current.srcObject = stream;
        captureVideoRef.current.play().catch(() => {});
      }

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraStatus('disconnected');
          if (sessionData?.session_token) {
            axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/snapshot`, {
              session_token: sessionData.session_token,
              image_data: null,
              camera_status: 'disconnected',
              round: 1
            }).catch(() => {});
          }
        };
      });
    } catch (err) {
      console.warn('Camera/mic access denied:', err);
      setCameraStatus('denied');
      setMicStatus('denied');
    }
  }, [sessionData, eventId, subEventId]);

  useEffect(() => {
    startMedia();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
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
      syncVid(captureVideoRef.current);
    }
  }, [cameraStream, fullscreenReady, isFullscreen]);

  // Periodic CCTV Live Frame Streaming & Admin Heartbeat Listener
  const sendSnapshotFrame = useCallback(async () => {
    if (!sessionData?.session_token || testResult || cameraStatus !== 'connected') return;
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
        const candidates = [captureVideoRef.current, videoRef.current];
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
        session_token: sessionData.session_token,
        image_data: snapshotData,
        camera_status: cameraStatus,
        round: 1
      });

      if (res.data?.terminated) {
        const blockReason = res.data?.termination_reason || 'Terminated by Proctor Administrator.';
        setWarningModal({
          isOpen: true,
          title: 'Test Terminated by Administrator',
          message: `Your test session has been immediately blocked and terminated: ${blockReason}`,
          isFullscreenWarning: false
        });
        handleSubmitTest(true);
      }
    } catch (err) {
      // Silent fail on minor network hiccups
    }
  }, [sessionData, testResult, cameraStatus, cameraStream, eventId, subEventId]);

  useEffect(() => {
    if (!sessionData?.session_token || testResult || cameraStatus !== 'connected') return;

    // Send initial snapshot immediately
    sendSnapshotFrame();

    const streamInterval = setInterval(sendSnapshotFrame, 2500);
    return () => clearInterval(streamInterval);
  }, [sessionData, testResult, cameraStatus, sendSnapshotFrame]);

  // 3. Server-side countdown timer
  useEffect(() => {
    if (!sessionData || testResult) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData, testResult]);

  // 4. Proctoring Event Logger helper
  const logProctorViolation = useCallback(async (eventType, details) => {
    if (!sessionData?.session_token || testResult) return;
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/proctor-event`, {
        session_token: sessionData.session_token,
        event_type: eventType,
        details: details
      });

      const nextViolations = res.data.violation_count;
      setViolationCount(nextViolations);

      if (res.data.auto_submitted) {
        setWarningModal({
          isOpen: true,
          title: 'Test Automatically Submitted',
          message: 'You have exceeded the maximum of 3 anti-cheating violations. Your test has been submitted.'
        });
        handleSubmitTest(true);
      } else if (res.data.warning) {
        setWarningModal({
          isOpen: true,
          title: `Proctoring Warning (${nextViolations}/3)`,
          message: res.data.warning
        });
      }
    } catch (err) {
      console.error('Failed to log violation:', err);
    }
  }, [sessionData, testResult, eventId, subEventId]);

  // 5. Anti-cheating Listeners: Fullscreen, Tab Switch, DevTools, Copy/Paste
  useEffect(() => {
    if (!sessionData || testResult || !fullscreenReady) return;

    // Visibility change / tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!document.fullscreenElement) return; // Fullscreen exit takes precedence
        logProctorViolation('tab_hidden', 'Participant navigated away from test tab.');
      }
    };

    // Window blur
    const handleWindowBlur = () => {
      if (!document.fullscreenElement) return; // Fullscreen exit takes precedence
      logProctorViolation('window_blur', 'Test window lost focus.');
    };

    // Fullscreen change
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        const nextExits = fullscreenExitsRef.current + 1;
        fullscreenExitsRef.current = nextExits;
        setFullscreenExits(nextExits);

        logProctorViolation('fullscreen_exit', `Participant exited fullscreen mode (Exit #${nextExits} of 3).`);

        if (nextExits >= 3) {
          setWarningModal({
            isOpen: true,
            title: 'Test Auto-Submitted',
            message: 'You have exited full-screen 3 times (Maximum 3 strikes reached). Your test has been submitted.',
            isFullscreenWarning: false
          });
          handleSubmitTest(true);
        } else {
          setFullscreenCountdown(10);
          setWarningModal({
            isOpen: true,
            title: `Full-Screen Exit Warning (${nextExits}/3 Strikes)`,
            message: `You exited full-screen mode (Strike ${nextExits} of 3). You have 10 seconds to return to full-screen or your test will be auto-submitted.`,
            isFullscreenWarning: true
          });
        }
      } else {
        setWarningModal((prev) => (prev.isFullscreenWarning ? { isOpen: false, title: '', message: '', isFullscreenWarning: false } : prev));
      }
    };

    // Block copy / paste / right click / Devtools shortcuts
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        logProctorViolation('devtools_opened', 'Attempted to open inspection tools.');
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        // Deterrent
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionData, testResult, fullscreenReady, logProctorViolation]);

  // 6. Debounced Autosave Buffer
  const triggerAutosave = useCallback((updatedAnswers) => {
    if (!sessionData?.session_token || testResult) return;
    setSavingStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/autosave`, {
          session_token: sessionData.session_token,
          answers: updatedAnswers,
          camera_status: cameraStatus
        });
        setSavingStatus('saved');
      } catch (err) {
        setSavingStatus('error');
      }
    }, 600); // 600ms debounce
  }, [sessionData, testResult, eventId, subEventId, cameraStatus]);

  // Answer modification handlers
  const handleSelectSingleOption = (qId, optionId) => {
    const next = { ...answers, [qId]: optionId };
    setAnswers(next);
    triggerAutosave(next);
  };

  const handleToggleMultipleOption = (qId, optionId) => {
    const current = Array.isArray(answers[qId]) ? answers[qId] : [];
    const nextList = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];

    const next = { ...answers, [qId]: nextList };
    setAnswers(next);
    triggerAutosave(next);
  };

  const handleWrittenTextChange = (qId, text) => {
    const existing = typeof answers[qId] === 'object' && answers[qId] !== null ? answers[qId] : {};
    const next = { ...answers, [qId]: { ...existing, text } };
    setAnswers(next);
    triggerAutosave(next);
  };

  const handleVoiceRecordingSaved = (qId, voiceResult) => {
    const existing = typeof answers[qId] === 'object' && answers[qId] !== null ? answers[qId] : {};
    const next = {
      ...answers,
      [qId]: {
        ...existing,
        audio_url: voiceResult?.url || null,
        transcript: voiceResult?.transcript || existing.text || '',
        text: existing.text || voiceResult?.transcript || ''
      }
    };
    setAnswers(next);
    triggerAutosave(next);
    toast.success('Voice recording saved!');
  };

  const handleDrawingSaved = (qId, dataUrl) => {
    const next = { ...answers, [qId]: { data_url: dataUrl } };
    setAnswers(next);
    triggerAutosave(next);
    toast.success('Diagram saved to answer!');
  };

  const toggleReviewMark = (qId) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Fullscreen toggle request
  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement && elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
      setIsFullscreen(true);
      setWarningModal((prev) => (prev.isFullscreenWarning ? { isOpen: false, title: '', message: '', isFullscreenWarning: false } : prev));
    } catch (err) {
      toast.error('Could not enter fullscreen mode.');
    }
  };

  // Enter fullscreen (pre-flight)
  const handleEnterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      toast.error('Please allow fullscreen to begin the aptitude test.');
    }
  };

  // Officially start test once both camera is verified and fullscreen is active
  const handleStartAptitudeTest = () => {
    if (!document.fullscreenElement) {
      toast.error('Fullscreen mode is mandatory to begin.');
      return;
    }
    if (cameraStatus !== 'connected' || !cameraStream) {
      toast.error('Camera must be active and verified to begin.');
      return;
    }
    setFullscreenReady(true);
    sendSnapshotFrame();
  };

  const [redirectCountdown, setRedirectCountdown] = useState(4);

  // Auto-redirect effect when test is completed or auto-submitted
  useEffect(() => {
    if (!testResult) return;
    setWarningModal({ isOpen: false, title: '', message: '', isFullscreenWarning: false });

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
  }, [testResult, eventId, subEventId, navigate]);

  // 7. Final Submit
  const handleSubmitTest = async (isAuto = false) => {
    if (!isAuto && !window.confirm('Are you sure you want to submit your aptitude test? You cannot make further changes.')) {
      return;
    }

    setWarningModal({ isOpen: false, title: '', message: '', isFullscreenWarning: false });

    try {
      setSubmitting(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/submit`, {
        session_token: sessionData?.session_token,
        answers: answers
      });

      setTestResult({
        ...res.data,
        is_auto_submitted: isAuto || res.data?.status === 'auto_submitted'
      });
      toast.success(isAuto ? 'Test automatically submitted!' : 'Test submitted successfully!', {
        icon: isAuto ? '⏱️' : '✅'
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  // FULLSCREEN & CAMERA PRE-FLIGHT VERIFICATION SCREEN
  if (!loading && sessionData && !fullscreenReady && !testResult) {
    const isCameraReady = cameraStatus === 'connected' && Boolean(cameraStream);
    const canStart = isCameraReady && isFullscreen;

    return (
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center p-4 relative text-slate-900 dark:text-slate-100">
        {/* Animated Shooting Stars */}
        <section className="mindsaga-bg-stars">
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
        </section>

        {/* Hidden persistent capture video */}
        <video
          ref={captureVideoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, pointerEvents: 'none', opacity: 0 }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mindsaga-card max-w-lg w-full p-6 sm:p-8 space-y-5 rounded-none relative z-10"
        >
          {/* Header */}
          <div className="text-center">
            <span className="mindsaga-hud-badge border-purple-500/30 text-purple-600 dark:text-purple-300 rounded-none">
              Phase 1 Aptitude
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase mt-2 text-slate-900 dark:text-white tracking-tight">
              Pre-Flight Security Check
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Camera verification &amp; Fullscreen required to start
            </p>
          </div>

          {/* Camera Video Stream Preview Box */}
          <div className={`relative aspect-video rounded-none overflow-hidden border flex items-center justify-center shadow-inner ${
            isDark ? 'bg-zinc-950 border-white/10' : 'bg-slate-100 border-slate-300'
          }`}>
            {isCameraReady ? (
              <>
                <video
                  ref={(el) => {
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
                <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-none flex items-center gap-1.5 border border-white/10 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-ping" />
                  CAMERA ACTIVE &amp; VERIFIED
                </div>
              </>
            ) : (
              <div className="text-center p-4 space-y-2.5">
                <VideoOff className="w-9 h-9 text-rose-500 mx-auto" />
                <p className="text-xs font-mono text-rose-500 font-semibold">
                  {cameraStatus === 'denied' ? 'Camera permission denied' : 'Camera permission required'}
                </p>
                <button
                  type="button"
                  onClick={startMedia}
                  className="mindsaga-btn-space px-4 py-2 text-xs rounded-none cursor-pointer"
                >
                  Enable Camera
                </button>
              </div>
            )}
          </div>

          {/* Verification Status Badges */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-2.5 rounded-none border flex items-center justify-between ${
              isCameraReady
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}>
              <span className="font-mono font-bold uppercase text-[11px]">Camera</span>
              <span className="font-bold flex items-center gap-1 text-[11px]">
                {isCameraReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {isCameraReady ? 'Verified' : 'Required'}
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

          {/* Minimal Examination Rules */}
          <div className={`p-3 rounded-none border text-xs text-left space-y-1.5 ${
            isDark ? 'bg-zinc-950/60 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <p className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Proctoring Rules:</p>
            <p className="text-slate-600 dark:text-slate-400">• Fullscreen mode is mandatory throughout the test</p>
            <p className="text-slate-600 dark:text-slate-400">• Camera must remain clearly visible at all times</p>
            <p className="text-slate-600 dark:text-slate-400">• Exiting fullscreen triggers strike penalties (3 strikes max)</p>
          </div>

          {/* Action Button: Gated ONLY to show Start when both conditions are satisfied */}
          {canStart ? (
            <button
              type="button"
              onClick={handleStartAptitudeTest}
              className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Start Aptitude Test</span>
            </button>
          ) : !isFullscreen ? (
            <button
              type="button"
              onClick={handleEnterFullscreen}
              className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Fullscreen Mode</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startMedia}
              className="mindsaga-btn-space w-full py-3.5 text-sm uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Enable Camera to Begin</span>
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  // SUBMITTED / AUTO-SUBMITTED RESULT VIEW
  if (testResult) {
    const isAuto = testResult.is_auto_submitted || testResult.status === 'auto_submitted';

    return (
      <div className="mindsaga-space-bg min-h-screen flex items-center justify-center p-4 relative text-slate-900 dark:text-slate-100">
        <section className="mindsaga-bg-stars">
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
          <span className="mindsaga-star"></span>
        </section>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mindsaga-card max-w-md w-full p-6 sm:p-8 text-center space-y-5 rounded-none relative z-10"
        >
          <div className={`w-14 h-14 rounded-none border flex items-center justify-center mx-auto ${
            isAuto
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}>
            {isAuto ? <Clock className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>

          <div>
            <h2 className="text-xl font-bold font-mono uppercase text-slate-900 dark:text-white">
              {isAuto ? 'Test Auto-Submitted' : 'Test Completed'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAuto ? 'Auto-submitted due to timeout or strike limit.' : 'Answers recorded and evaluated.'}
            </p>
          </div>

          <div className={`p-4 rounded-none border space-y-2 text-xs ${
            isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Score</span>
              <span className="font-bold text-indigo-500 dark:text-indigo-400 text-sm font-mono">{testResult.score ?? testResult.total_score ?? 0} pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Percentage</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">{testResult.percentage ?? 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className={`font-semibold uppercase text-[11px] ${
                isAuto ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {testResult.status || (isAuto ? 'AUTO_SUBMITTED' : 'SUBMITTED')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`)}
              className="mindsaga-btn-space w-full py-3 text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{redirectCountdown > 0 ? `Arena in ${redirectCountdown}s...` : 'Return to Arena'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/game`)}
              className="mindsaga-btn-outline w-full py-2.5 text-xs font-semibold rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Launch Round 2 Gaming</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const qId = currentQ?.id;
  const currentAnswer = answers[qId];

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mindsaga-space-bg min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
      {/* Animated Shooting Stars */}
      <section className="mindsaga-bg-stars">
        <span className="mindsaga-star"></span>
        <span className="mindsaga-star"></span>
        <span className="mindsaga-star"></span>
        <span className="mindsaga-star"></span>
        <span className="mindsaga-star"></span>
      </section>

      {/* Hidden persistent capture video */}
      <video
        ref={captureVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, pointerEvents: 'none', opacity: 0 }}
      />

      {/* Test Header */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{sessionData?.test?.title || 'Aptitude Test'}</h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Q {currentQIndex + 1}/{questions.length}</span>
              <span>•</span>
              <span className={`font-mono ${savingStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>
                {savingStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className={`px-3.5 py-1 rounded-none border flex items-center gap-2 font-mono font-bold text-xs ${
          remainingSeconds < 300
            ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'
            : isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
        }`}>
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTimer(remainingSeconds)}</span>
        </div>

        {/* Right side controls & submit button */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 rounded-none transition cursor-pointer text-slate-700 dark:text-slate-200"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            type="button"
            onClick={requestFullscreen}
            className="p-1.5 rounded-none border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer text-xs font-mono"
            title="Toggle Full Screen Mode"
          >
            <Maximize2 className="w-4 h-4 text-sky-500" />
            <span className="hidden md:inline">{isFullscreen ? 'Full Screen' : 'Go Full Screen'}</span>
          </button>

          <button
            onClick={() => handleSubmitTest(false)}
            disabled={submitting}
            className="mindsaga-btn-space px-3.5 py-1 text-xs rounded-none cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>

          <button
            onClick={() => setExitConfirmModal(true)}
            className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-600 dark:text-red-300 border border-red-500/30 rounded-none text-xs font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Exit Test"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Test Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4 relative z-10">
        {/* Left/Main Question Pane */}
        <main className="flex-1 mindsaga-card p-5 sm:p-6 rounded-none flex flex-col justify-between space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Header & Review Flag */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="mindsaga-hud-badge border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs rounded-none">
                    {currentQ.question_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{currentQ.marks} Marks</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleReviewMark(qId)}
                  className={`px-3 py-1 rounded-none text-xs font-medium flex items-center gap-1.5 border transition cursor-pointer ${
                    markedForReview.has(qId)
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                      : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${markedForReview.has(qId) ? 'fill-amber-400' : ''}`} />
                  <span>{markedForReview.has(qId) ? 'Marked' : 'Mark Review'}</span>
                </button>
              </div>

              {/* Question Statement */}
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white leading-relaxed">
                  {currentQIndex + 1}. {currentQ.question_text}
                </h2>

                {currentQ.image_url && (
                  <img src={currentQ.image_url} alt="Question diagram" className="max-h-60 rounded-none border border-slate-300 dark:border-white/10 my-2" />
                )}
              </div>

              {/* Question Answers Engine */}
              <div className="space-y-3 pt-2">
                {/* 1. SINGLE CHOICE */}
                {currentQ.question_type === 'single_choice' && (
                  <div className="space-y-2">
                    {currentQ.options?.map((opt) => {
                      const isSelected = currentAnswer === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectSingleOption(qId, opt.id)}
                          className={`w-full text-left p-3.5 rounded-none border flex items-center gap-3 transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/15 border-indigo-500 text-slate-900 dark:text-white font-semibold'
                              : isDark
                                ? 'bg-zinc-950/70 border-white/10 text-slate-300 hover:bg-zinc-900 hover:border-white/20'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-none border flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-400 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="text-xs sm:text-sm">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. MULTIPLE CHOICE */}
                {currentQ.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">Select all correct options:</p>
                    {currentQ.options?.map((opt) => {
                      const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleMultipleOption(qId, opt.id)}
                          className={`w-full text-left p-3.5 rounded-none border flex items-center gap-3 transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/15 border-purple-500 text-slate-900 dark:text-white font-semibold'
                              : isDark
                                ? 'bg-zinc-950/70 border-white/10 text-slate-300 hover:bg-zinc-900 hover:border-white/20'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-none border flex items-center justify-center text-xs ${
                            isSelected ? 'border-purple-500 bg-purple-600 text-white' : 'border-slate-400 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <span className="font-bold text-xs text-slate-500 dark:text-zinc-400">{opt.id}.</span>
                          <span className="text-xs sm:text-sm">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. WRITTEN RESPONSE (with optional Voice Answer) */}
                {currentQ.question_type === 'written_response' && (
                  <div className="space-y-3">
                    <textarea
                      rows="5"
                      value={typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer.text || '' : currentAnswer || ''}
                      onChange={(e) => handleWrittenTextChange(qId, e.target.value)}
                      placeholder="Type response here..."
                      className={`w-full rounded-none p-3.5 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 leading-relaxed font-sans border ${
                        isDark ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />

                    {currentQ.allow_voice_answer && (
                      <VoiceAnswerRecorder
                        onRecordingComplete={(voice) => handleVoiceRecordingSaved(qId, voice)}
                      />
                    )}
                  </div>
                )}

                {/* 4. DIAGRAM / DRAWING CANVAS RESPONSE */}
                {currentQ.question_type === 'drawing_response' && (
                  <div className="space-y-3">
                    {currentAnswer?.data_url ? (
                      <div className="relative border border-slate-300 dark:border-white/10 rounded-none overflow-hidden bg-slate-900">
                        <img src={currentAnswer.data_url} alt="User sketch" className="w-full h-auto max-h-72 object-contain" />
                        <button
                          type="button"
                          onClick={() => setDrawingModalOpen(true)}
                          className="absolute top-3 right-3 px-3 py-1.5 mindsaga-btn-space rounded-none text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Diagram
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-none space-y-3 bg-black/10">
                        <Pencil className="w-8 h-8 text-indigo-400 mx-auto" />
                        <p className="text-xs text-slate-500 dark:text-zinc-400">Illustrate architecture or flowchart.</p>
                        <button
                          type="button"
                          onClick={() => setDrawingModalOpen(true)}
                          className="mindsaga-btn-space px-4 py-2 text-xs rounded-none cursor-pointer"
                        >
                          Launch Drawing Canvas
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">No question selected.</div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => prev - 1)}
              className="mindsaga-btn-outline px-4 py-2 rounded-none text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              type="button"
              disabled={currentQIndex >= questions.length - 1}
              onClick={() => setCurrentQIndex((prev) => prev + 1)}
              className="mindsaga-btn-space px-5 py-2 rounded-none text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Right Sidebar: WebRTC Video & Question Palette */}
        <aside className="w-full lg:w-72 space-y-4">
          {/* Proctoring Camera Preview Tile */}
          <div className="mindsaga-card p-3 rounded-none space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                Live Camera
              </span>
              <span className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-semibold ${
                cameraStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
              }`}>
                {cameraStatus === 'connected' ? '● Connected' : 'Disconnected'}
              </span>
            </div>

            <div className={`relative aspect-video rounded-none overflow-hidden border ${
              isDark ? 'bg-zinc-950 border-white/10' : 'bg-slate-100 border-slate-300'
            }`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>
          </div>

          {/* Question Navigator Palette */}
          <div className="mindsaga-card p-4 rounded-none space-y-3">
            <h3 className="font-bold font-mono uppercase text-slate-900 dark:text-white text-xs">Question Palette</h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = markedForReview.has(q.id);
                const isCurrent = currentQIndex === idx;

                let btnClass = isDark ? 'bg-zinc-950 text-zinc-400 border-white/10' : 'bg-slate-50 text-slate-600 border-slate-200';
                if (isCurrent) btnClass = 'ring-2 ring-indigo-500 bg-indigo-600/20 text-slate-900 dark:text-white font-bold border-indigo-500';
                else if (isMarked) btnClass = 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 font-bold';
                else if (isAnswered) btnClass = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 font-bold';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`aspect-square rounded-none border text-xs flex items-center justify-center transition cursor-pointer hover:scale-105 ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1 text-[11px] text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-none bg-emerald-500/20 border border-emerald-500/40" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-none bg-amber-500/20 border border-amber-500/40" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-none border ${isDark ? 'bg-zinc-950 border-white/10' : 'bg-slate-50 border-slate-300'}`} />
                <span>Unattempted</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Drawing Canvas Modal */}
      <DrawingCanvasModal
        isOpen={drawingModalOpen}
        onClose={() => setDrawingModalOpen(false)}
        initialDataUrl={currentAnswer?.data_url}
        onSave={(dataUrl) => handleDrawingSaved(qId, dataUrl)}
      />

      {/* Proctoring Warning Modal */}
      {warningModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="mindsaga-card rounded-none w-full max-w-md p-6 space-y-4 shadow-2xl text-center border-red-500/60">
            <div className="w-12 h-12 rounded-none bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold font-mono uppercase text-slate-900 dark:text-white text-base">{warningModal.title}</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">{warningModal.message}</p>
            </div>

            {(!document.fullscreenElement || !isFullscreen || warningModal.isFullscreenWarning) && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-none space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-medium">Return Countdown</span>
                  <span className="font-mono font-bold text-red-400 text-sm animate-pulse">{fullscreenCountdown}s</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-none h-1.5 overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, (fullscreenCountdown / 10) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Strike {fullscreenExits}/3. On 3rd exit, test auto-submits.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setWarningModal({ isOpen: false, title: '', message: '', isFullscreenWarning: false });
                requestFullscreen();
              }}
              className="mindsaga-btn-space w-full py-2.5 rounded-none text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer font-mono uppercase tracking-wider"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Full Screen & Continue</span>
            </button>
          </div>
        </div>
      )}

      {/* EXIT TEST CONFIRMATION WARNING MODAL */}
      {exitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mindsaga-card rounded-none max-w-md w-full p-6 text-center space-y-4 shadow-2xl border-red-500/50">
            <div className="w-12 h-12 rounded-none bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono uppercase text-slate-900 dark:text-white">Exit Aptitude Test?</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2">
                Submits test and consumes 1 attempt.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmModal(false)}
                className="mindsaga-btn-outline flex-1 py-2 text-xs rounded-none cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmModal(false);
                  handleSubmitTest(true);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-none text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Exit &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY WEBCAM SURVEILLANCE MODAL */}
      {cameraStatus !== 'connected' && !loading && !testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="mindsaga-card rounded-none max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl border-rose-500/80">
            <div className="w-12 h-12 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <span className="mindsaga-hud-badge border-rose-500/30 text-rose-500 rounded-none text-xs">
                Surveillance Enforced
              </span>
              <h3 className="text-lg font-bold font-mono uppercase text-slate-900 dark:text-white mt-2">Live Camera Required</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                Continuous live webcam proctoring is mandatory.
              </p>
            </div>
            <button
              type="button"
              onClick={startMedia}
              className="mindsaga-btn-space w-full py-3 rounded-none font-bold text-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Video className="w-4 h-4" />
              <span>Enable Webcam</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Floating Corner Full Screen Button */}
      <button
        type="button"
        onClick={requestFullscreen}
        className="fixed top-16 right-4 z-40 bg-slate-900/90 dark:bg-black/90 text-sky-400 hover:text-white border border-sky-500/50 hover:border-sky-400 px-3 py-2 rounded-none text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105"
        title="Enter Full Screen Mode"
      >
        <Maximize2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
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

export default MindSagaAptitudeTestPage;
