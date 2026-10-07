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
  ArrowRight
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import DrawingCanvasModal from '../../components/ui/DrawingCanvasModal';
import VoiceAnswerRecorder from '../../components/ui/VoiceAnswerRecorder';

const MindSagaAptitudeTestPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const { theme } = useTheme ? useTheme() : { theme: 'dark' };
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exitConfirmModal, setExitConfirmModal] = useState(false);

  // Drawing modal state
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);

  const videoRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const fullscreenExitsRef = useRef(0);
  const isFullscreenWarningRef = useRef(false);

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCameraStatus('connected');
      setMicStatus('connected');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera/mic access denied:', err);
      setCameraStatus('denied');
      setMicStatus('denied');
    }
  }, []);

  useEffect(() => {
    startMedia();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Periodic CCTV Live Frame Streaming & Admin Heartbeat Listener
  useEffect(() => {
    if (!sessionData?.session_token || testResult || cameraStatus !== 'connected') return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 320;
    captureCanvas.height = 240;
    const ctx = captureCanvas.getContext('2d');

    const streamInterval = setInterval(async () => {
      try {
        let snapshotData = null;
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          snapshotData = captureCanvas.toDataURL('image/jpeg', 0.6);
        }

        const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/snapshot`, {
          session_token: sessionData.session_token,
          image_data: snapshotData,
          camera_status: cameraStatus,
          round: 1
        });

        if (res.data?.terminated) {
          clearInterval(streamInterval);
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
    }, 2500);

    return () => clearInterval(streamInterval);
  }, [sessionData, testResult, cameraStatus, eventId, subEventId]);

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
    if (!sessionData || testResult) return;

    // Visibility change / tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctorViolation('tab_hidden', 'Participant navigated away from test tab.');
      }
    };

    // Window blur
    const handleWindowBlur = () => {
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
  }, [sessionData, testResult, logProctorViolation]);

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
  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  // SUBMITTED / AUTO-SUBMITTED RESULT VIEW
  if (testResult) {
    const isAuto = testResult.is_auto_submitted || testResult.status === 'auto_submitted';

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full rounded-3xl border p-6 sm:p-8 text-center space-y-5 shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto shadow-inner ${
            isAuto
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {isAuto ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAuto ? 'Aptitude Test Auto-Submitted!' : 'Aptitude Test Completed!'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isAuto
                ? 'Your test was automatically submitted because time expired or 3 anti-cheating strikes were reached. All your saved answers have been evaluated.'
                : 'Your answers have been securely recorded and evaluated by the server marking engine.'}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Score Earned:</span>
              <span className="font-bold text-indigo-400 text-sm font-mono">{testResult.score ?? testResult.total_score ?? 0} pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Percentage:</span>
              <span className={`font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{testResult.percentage ?? 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Submission Mode:</span>
              <span className={`font-semibold uppercase text-[11px] ${
                isAuto ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {testResult.status || (isAuto ? 'AUTO_SUBMITTED' : 'SUBMITTED')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga`)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{redirectCountdown > 0 ? `Redirecting in ${redirectCountdown}s...` : 'Returning to Arena...'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/events/${eventId}/sub-events/${subEventId}/mind-saga/game`)}
              className={`w-full py-2.5 border rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark ? 'border-zinc-800 hover:bg-zinc-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Launch Round 2 Gaming Directly</span>
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-indigo-500/30">
      {/* Test Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">{sessionData?.test?.title || 'Aptitude Test'}</h1>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Question {currentQIndex + 1} of {questions.length}</span>
              <span>•</span>
              <span className={`font-mono ${savingStatus === 'saving' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {savingStatus === 'saving' ? 'Autosaving...' : '● Autosaved'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 font-mono font-bold text-sm ${
          remainingSeconds < 300
            ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
            : 'bg-zinc-900 border-zinc-800 text-white'
        }`}>
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>{formatTimer(remainingSeconds)}</span>
        </div>

        {/* Right side proctor status & submit button */}
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <button
              onClick={requestFullscreen}
              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition hidden sm:flex"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
            </button>
          )}

          <button
            onClick={() => handleSubmitTest(false)}
            disabled={submitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish Test</span>
          </button>

          <button
            onClick={() => setExitConfirmModal(true)}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Exit Test and Submit"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Test Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
        {/* Left/Main Question Pane */}
        <main className="flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              {/* Question Header & Review Flag */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {currentQ.question_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">{currentQ.marks} Marks</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleReviewMark(qId)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                    markedForReview.has(qId)
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${markedForReview.has(qId) ? 'fill-amber-400' : ''}`} />
                  <span>{markedForReview.has(qId) ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>
              </div>

              {/* Question Statement */}
              <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-medium text-white leading-relaxed">
                  {currentQIndex + 1}. {currentQ.question_text}
                </h2>

                {currentQ.image_url && (
                  <img src={currentQ.image_url} alt="Question diagram" className="max-h-60 rounded-xl border border-zinc-800 my-2" />
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
                          className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-zinc-700 text-zinc-400'
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
                    <p className="text-[11px] text-zinc-400 italic">Select all correct options:</p>
                    {currentQ.options?.map((opt) => {
                      const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleMultipleOption(qId, opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                              : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                            isSelected ? 'border-purple-400 bg-purple-600 text-white' : 'border-zinc-700 text-zinc-400'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <span className="font-bold text-xs text-zinc-400">{opt.id}.</span>
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
                      placeholder="Type your comprehensive explanation here..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
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
                      <div className="relative border border-zinc-800 rounded-xl overflow-hidden bg-slate-900">
                        <img src={currentAnswer.data_url} alt="User sketch" className="w-full h-auto max-h-72 object-contain" />
                        <button
                          type="button"
                          onClick={() => setDrawingModalOpen(true)}
                          className="absolute top-3 right-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Diagram
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-zinc-800 rounded-xl space-y-3 bg-zinc-950/40">
                        <Pencil className="w-8 h-8 text-indigo-400 mx-auto" />
                        <p className="text-xs text-zinc-400">Illustrate architecture or flowchart for this problem.</p>
                        <button
                          type="button"
                          onClick={() => setDrawingModalOpen(true)}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
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
            <div className="text-center py-20 text-zinc-500">No question selected.</div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => prev - 1)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              type="button"
              disabled={currentQIndex >= questions.length - 1}
              onClick={() => setCurrentQIndex((prev) => prev + 1)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Right Sidebar: WebRTC Video & Question Palette */}
        <aside className="w-full lg:w-72 space-y-4">
          {/* Proctoring Camera Preview Tile */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                Live Proctor Camera
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                cameraStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {cameraStatus === 'connected' ? '● Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="relative aspect-video rounded-xl bg-zinc-950 overflow-hidden border border-zinc-800">
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
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-white text-xs">Question Palette</h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = markedForReview.has(q.id);
                const isCurrent = currentQIndex === idx;

                let btnClass = 'bg-zinc-950 text-zinc-400 border-zinc-800';
                if (isCurrent) btnClass = 'ring-2 ring-indigo-500 bg-indigo-950/40 text-white font-bold';
                else if (isMarked) btnClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
                else if (isAnswered) btnClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQIndex(idx)}
                    className={`aspect-square rounded-xl border text-xs flex items-center justify-center transition hover:scale-105 ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-1 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
                <span>Marked for review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-zinc-950 border border-zinc-800" />
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
          <div className="bg-zinc-900 border border-red-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{warningModal.title}</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{warningModal.message}</p>
            </div>

            {warningModal.isFullscreenWarning && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-300 font-medium">Auto-Submit Countdown</span>
                  <span className="font-mono font-bold text-red-400 text-sm">{fullscreenCountdown}s</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(fullscreenCountdown / 10) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Strike {fullscreenExits} of 3. On the 3rd exit, the test is submitted immediately.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setWarningModal({ isOpen: false, title: '', message: '', isFullscreenWarning: false });
                requestFullscreen();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Return to Full-Screen Now
            </button>
          </div>
        </div>
      )}

      {/* EXIT TEST CONFIRMATION WARNING MODAL */}
      {exitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-red-500/40 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Exit Aptitude Test?</h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Exiting will submit your current test progress and <strong>consume 1 attempt</strong>. If all your allowed attempts are exhausted, you will <strong>NOT</strong> be permitted to re-attempt this round.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitConfirmModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Stay in Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmModal(false);
                  handleSubmitTest(true);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Exit & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY WEBCAM SURVEILLANCE MODAL */}
      {cameraStatus !== 'connected' && !loading && !testResult && (
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
                Mind Saga enforces continuous live camera proctoring. You must allow webcam access to continue the aptitude assessment.
              </p>
            </div>
            <button
              type="button"
              onClick={startMedia}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Video className="w-4 h-4" />
              <span>Enable Webcam Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindSagaAptitudeTestPage;
