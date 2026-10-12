import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  GripVertical,
  BrainCircuit,
  Layers,
  Gamepad2,
  Users,
  Video,
  Award,
  Settings,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Play,
  Pause,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Download,
  Share2,
  Sparkles,
  Search,
  Filter,
  Mic,
  Pencil,
  Image as ImageIcon,
  Check,
  X,
  Sliders,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Lock,
  UserCheck,
  Zap,
  Target,
  Key,
  Mail,
  Copy,
  User,
  Maximize2,
  Minimize2,
  Ban,
  Printer,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Star,
  StarOff,
  History,
  SortAsc,
  SortDesc,
  ListFilter,
  Trophy
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import DrawingCanvasModal from '../../components/ui/DrawingCanvasModal';
import MotionChallengeGame from './components/MotionChallengeGame';
import SwitchChallengeGame from './components/SwitchChallengeGame';
import { MAVERICKS_LOGO_BASE64 } from '../../assets/logo_base64';

const MindSagaControlRoomPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Navigation State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'aptitude' | 'gaming' | 'interview' | 'scores' | 'config'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [overviewData, setOverviewData] = useState(null);
  const [tests, setTests] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [games, setGames] = useState([]);
  const [proctoringList, setProctoringList] = useState([]);
  const [proctorFilter, setProctorFilter] = useState('all');
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  // Modals & Forms
  const [editingTestId, setEditingTestId] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testForm, setTestForm] = useState({
    title: 'Mind Saga Phase 1: Cognitive Aptitude',
    description: '',
    duration_minutes: 25,
    total_marks: 40,
    pass_marks: 16,
    negative_marking_enabled: true,
    default_negative_marks: 0.5,
    shuffle_questions: true,
    shuffle_options: true,
    random_question_count: ''
  });

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'single_choice',
    marks: 2,
    negative_marks: 0,
    partial_marking_enabled: true,
    allow_voice_answer: false,
    image_url: '',
    expected_answer: '',
    keywords_text: '',
    evaluation_mode: 'ai_assisted',
    options: [
      { id: 'A', text: '', is_correct: true },
      { id: 'B', text: '', is_correct: false },
      { id: 'C', text: '', is_correct: false },
      { id: 'D', text: '', is_correct: false }
    ]
  });

  const [aiPreviewModalOpen, setAiPreviewModalOpen] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState({ answer_text: '', expected_answer: '', keywords: [], max_marks: 5, result: null });
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState('qualified_round_2');
  const [selectedRegIds, setSelectedRegIds] = useState([]);
  const [maximizedSession, setMaximizedSession] = useState(null);
  const [blockModal, setBlockModal] = useState({
    isOpen: false,
    session: null,
    reason: 'Frequent tab-switching & full-screen exit violation.'
  });

  // Participant Management & Separate Round Attempts State
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantStatusFilter, setParticipantStatusFilter] = useState('all');
  const [attemptModalOpen, setAttemptModalOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState(null);
  const [attemptForm, setAttemptForm] = useState({
    max_attempts_r1: 1,
    max_attempts_r2: 1,
    max_attempts_r3: 1
  });
  const [bulkAttemptModalOpen, setBulkAttemptModalOpen] = useState(false);
  const [bulkAttemptForm, setBulkAttemptForm] = useState({
    max_attempts_r1: '',
    max_attempts_r2: '',
    max_attempts_r3: ''
  });
  const [isSavingAttempts, setIsSavingAttempts] = useState(false);

  // Score History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyParticipant, setHistoryParticipant] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Export Options Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv' | 'html' | 'print'
  const [exportSortBy, setExportSortBy] = useState('final_weighted_score'); // 'final_weighted_score' | 'round1_score' | 'round2_score' | 'round3_score' | 'name'
  const [exportSortDir, setExportSortDir] = useState('desc'); // 'desc' | 'asc'
  const [exportScoreMode, setExportScoreMode] = useState('current'); // 'current' (max score saved) | 'attempt_1' | 'attempt_last'

  // Shortlist State
  const [shortlistMode, setShortlistMode] = useState(false);
  const [shortlistedIds, setShortlistedIds] = useState([]); // IDs currently shortlisted (local tracking from leaderboard)
  const [shortlistModalOpen, setShortlistModalOpen] = useState(false);
  const [isSavingShortlist, setIsSavingShortlist] = useState(false);


  // Gaming Pipeline State & Modal
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [testPlayGame, setTestPlayGame] = useState(null);
  const [gameForm, setGameForm] = useState({
    title: 'MOTION CHALLENGE: Spatial Path Creation & Block Shifting',
    game_key: 'motion_challenge',
    difficulty: 'medium',
    duration_seconds: 240,
    max_score: 100,
    is_active: 1
  });

  // Weight Configuration Form
  const [configForm, setConfigForm] = useState({
    round1_weight: 30,
    round2_weight: 30,
    round3_weight: 40,
    sfu_server_url: 'wss://sfu.teammavericks.org',
    require_camera_r1: true,
    require_camera_r2: true,
    max_violations_allowed: 3,
    active_round: 1,
    max_attempts_r1: 1,
    max_attempts_r2: 1
  });

  // Fetch Overview Data
  const fetchOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/overview`);
      setOverviewData(res.data);
      setTests(res.data.tests || []);
      setGames(res.data.games || []);
      if (res.data.config) {
        setConfigForm({
          round1_weight: parseFloat(res.data.config.round1_weight) || 30,
          round2_weight: parseFloat(res.data.config.round2_weight) || 30,
          round3_weight: parseFloat(res.data.config.round3_weight) || 40,
          sfu_server_url: res.data.config.sfu_server_url || 'wss://sfu.teammavericks.org',
          require_camera_r1: Boolean(res.data.config.require_camera_r1),
          require_camera_r2: Boolean(res.data.config.require_camera_r2),
          max_violations_allowed: res.data.config.max_violations_allowed || 3,
          active_round: parseInt(res.data.config.active_round) || 1,
          max_attempts_r1: parseInt(res.data.config.max_attempts_r1) || 1,
          max_attempts_r2: parseInt(res.data.config.max_attempts_r2) || 1
        });
      }
    } catch (err) {
      console.error('Failed to load Mind Saga overview:', err);
      toast.error('Failed to load Mind Saga data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, subEventId]);

  const isFetchingProctorRef = useRef(false);

  // Fetch Live Proctoring Grid (Realtime Camera Telemetry)
  const fetchProctoring = useCallback(async () => {
    if (isFetchingProctorRef.current) return;
    isFetchingProctorRef.current = true;
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/live?filter=${proctorFilter}`);
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.sessions) ? res.data.sessions : []);
      setProctoringList(data);

      // Also keep maximized modal session synced with freshest telemetry
      setMaximizedSession((prev) => {
        if (!prev) return null;
        const fresh = data.find((s) => s.session_id === prev.session_id || s.session_token === prev.session_token);
        return fresh || prev;
      });
    } catch (err) {
      console.error('Failed to fetch proctoring:', err);
      setProctoringList([]);
    } finally {
      isFetchingProctorRef.current = false;
    }
  }, [eventId, subEventId, proctorFilter]);

  // Fetch Master Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/leaderboard`);
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : []);
      setLeaderboard(data);
      // Sync shortlisted IDs from server
      setShortlistedIds(data.filter((d) => Number(d.is_shortlisted) === 1).map((d) => d.registration_id));
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaderboard([]);
    }
  }, [eventId, subEventId]);

  // Open History Modal for a participant
  const handleOpenHistory = async (cand) => {
    setHistoryParticipant(cand);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participant-history?registration_id=${cand.registration_id}`);
      setHistoryData(res.data);
    } catch (err) {
      toast.error('Failed to load attempt history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Toggle a participant in/out of local shortlist selection
  const handleToggleShortlist = (regId) => {
    setShortlistedIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  // Save shortlist to backend
  const handleSaveShortlist = async () => {
    setIsSavingShortlist(true);
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/shortlist`, {
        registration_ids: shortlistedIds,
        action: 'set'
      });
      toast.success(res.data.message || `Shortlisted ${shortlistedIds.length} participant(s)!`, { icon: '⭐' });
      setShortlistModalOpen(false);
      setShortlistMode(false);
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save shortlist');
    } finally {
      setIsSavingShortlist(false);
    }
  };

  // Get sorted leaderboard for export
  const getSortedLeaderboardForExport = () => {
    const sorted = [...leaderboard].sort((a, b) => {
      let aVal, bVal;
      if (exportSortBy === 'name') {
        aVal = (a.full_name || '').toLowerCase();
        bVal = (b.full_name || '').toLowerCase();
        return exportSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      aVal = Number(a[exportSortBy] || 0);
      bVal = Number(b[exportSortBy] || 0);
      return exportSortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  };



  // Fetch specific test details & questions
  const loadTestDetail = async (testId) => {
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests/${testId}`);
      setActiveTest(res.data);
    } catch (err) {
      toast.error('Failed to load test details');
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchLeaderboard();
  }, [fetchOverview, fetchLeaderboard]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'aptitude') {
      fetchProctoring();
      const interval = setInterval(fetchProctoring, 5000); // 5s realtime live camera poll
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchProctoring]);

  useEffect(() => {
    if (activeTab === 'scores' || activeTab === 'keys' || activeTab === 'participants') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  useEffect(() => {
    if (tests.length > 0 && !activeTest) {
      loadTestDetail(tests[0].id);
    }
  }, [tests, activeTest]);

  // Open Test Settings Modal (for Edit or Create)
  const handleOpenEditTest = (testObj) => {
    const t = testObj || activeTest?.test;
    if (t) {
      setEditingTestId(t.id);
      setTestForm({
        title: t.title || 'Mind Saga Phase 1: Cognitive Aptitude',
        description: t.description || '',
        duration_minutes: t.duration_minutes || 25,
        total_marks: parseFloat(t.total_marks) || 40,
        pass_marks: parseFloat(t.pass_marks) || 16,
        negative_marking_enabled: Boolean(t.negative_marking_enabled),
        default_negative_marks: parseFloat(t.default_negative_marks) || 0.5,
        shuffle_questions: t.shuffle_questions !== undefined ? Boolean(t.shuffle_questions) : true,
        shuffle_options: t.shuffle_options !== undefined ? Boolean(t.shuffle_options) : true,
        random_question_count: t.random_question_count || '',
        is_published: Boolean(t.is_published),
        schedule_start: t.schedule_start || '',
        schedule_end: t.schedule_end || ''
      });
    } else {
      setEditingTestId(null);
      setTestForm({
        title: 'Mind Saga Phase 1: Cognitive Aptitude',
        description: '',
        duration_minutes: 25,
        total_marks: 40,
        pass_marks: 16,
        negative_marking_enabled: true,
        default_negative_marks: 0.5,
        shuffle_questions: true,
        shuffle_options: true,
        random_question_count: '',
        is_published: true,
        schedule_start: '',
        schedule_end: ''
      });
    }
    setTestModalOpen(true);
  };

  // Handle Save Test
  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      if (editingTestId) {
        await axios.put(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests/${editingTestId}`, testForm);
        toast.success('Aptitude test settings updated successfully!');
      } else {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests`, testForm);
        toast.success('Aptitude test created successfully!');
      }
      setTestModalOpen(false);
      fetchOverview(true);
      if (editingTestId || activeTest?.test?.id) {
        loadTestDetail(editingTestId || activeTest?.test?.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save test settings');
    }
  };

  // Handle Save Question
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!activeTest?.test?.id) return;
    try {
      const payload = {
        ...questionForm,
        correct_answers: questionForm.options.filter((o) => o.is_correct).map((o) => o.id),
        keywords: questionForm.keywords_text ? questionForm.keywords_text.split(',').map((k) => k.trim()).filter(Boolean) : []
      };

      if (editingQuestion) {
        await axios.put(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/questions/${editingQuestion.id}`, payload);
        toast.success('Question updated successfully!');
      } else {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests/${activeTest.test.id}/questions`, payload);
        toast.success('Question added successfully!');
      }

      setQuestionModalOpen(false);
      setEditingQuestion(null);
      loadTestDetail(activeTest.test.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await axios.delete(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/questions/${qId}`);
      toast.success('Question deleted.');
      loadTestDetail(activeTest.test.id);
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  const handleTogglePublish = async (testId) => {
    try {
      const res = await axios.patch(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests/${testId}/publish`);
      toast.success(res.data.message);
      fetchOverview(true);
      if (activeTest?.test?.id === testId) {
        loadTestDetail(testId);
      }
    } catch (err) {
      toast.error('Failed to toggle publish status');
    }
  };

  // Gaming Pipeline CRUD Handlers
  const handleSaveGame = async (e) => {
    e.preventDefault();
    try {
      if (editingGame) {
        await axios.put(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/${editingGame.id}`, gameForm);
        toast.success('Game challenge updated successfully!');
      } else {
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games`, gameForm);
        toast.success('Game challenge added to pipeline!');
      }
      setGameModalOpen(false);
      setEditingGame(null);
      fetchOverview(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save game');
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to remove this game challenge from the pipeline?')) return;
    try {
      await axios.delete(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/${gameId}`);
      toast.success('Game challenge removed.');
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to delete game');
    }
  };

  const handleToggleGameActive = async (g) => {
    try {
      await axios.put(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/${g.id}`, {
        is_active: g.is_active ? 0 : 1
      });
      toast.success(g.is_active ? 'Game deactivated' : 'Game activated');
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to update game status');
    }
  };

  const reorderTimeoutRef = useRef(null);

  const handleReorderGames = (newGames) => {
    // 1. Instant optimistic update for 60fps silky smooth drag
    setGames(newGames);

    // 2. Debounced realtime server sync
    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }
    reorderTimeoutRef.current = setTimeout(async () => {
      try {
        const gameIds = newGames.map((g) => g.id);
        await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/games/reorder`, { game_ids: gameIds });
        toast.success('Sequence saved realtime! ⚡', { id: 'reorder-sync-toast', duration: 1800 });
      } catch (err) {
        console.error('Reorder sync error:', err);
        toast.error('Failed to sync game sequence to server');
        fetchOverview(true);
      }
    }, 280);
  };

  const handleMoveGame = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= games.length) return;
    const newGames = [...games];
    const [moved] = newGames.splice(index, 1);
    newGames.splice(targetIndex, 0, moved);

    handleReorderGames(newGames);
  };

  // Handle Save Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const sum = Number(configForm.round1_weight) + Number(configForm.round2_weight) + Number(configForm.round3_weight);
    if (Math.abs(sum - 100) > 0.1) {
      toast.error('The sum of all round weights must equal 100%');
      return;
    }
    try {
      await axios.put(`/events/${eventId}/sub-events/${subEventId}/mind-saga/config`, configForm);
      toast.success('Mind Saga configuration & weights updated!');
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to update configuration');
    }
  };

  // Handle Terminate Session & Direct Block
  const handleTerminateSession = async (session, customReason = null) => {
    const reasonToUse = customReason || blockModal.reason || 'Terminated by proctor admin for anti-cheating breach.';
    const sessionId = typeof session === 'object' ? session.session_id : session;
    const sessionToken = typeof session === 'object' ? session.session_token : null;
    const name = typeof session === 'object' ? session.full_name : 'Candidate';

    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/terminate-session`, {
        session_id: sessionId,
        session_token: sessionToken,
        round: typeof session === 'object' ? session.round_number : 1,
        reason: reasonToUse
      });
      toast.success(`Session for ${name} blocked and terminated with warning.`);
      setBlockModal({ isOpen: false, session: null, reason: '' });
      if (maximizedSession?.session_id === sessionId) {
        setMaximizedSession((prev) => (prev ? { ...prev, status: 'terminated' } : null));
      }
      fetchProctoring();
    } catch (err) {
      toast.error('Failed to terminate session');
    }
  };

  // Handle Dismiss / Remove Stream from Admin Live Monitor
  const handleDismissStream = async (session) => {
    if (!session) return;
    const sessionId = typeof session === 'object' ? session.session_id : session;
    const sessionToken = typeof session === 'object' ? session.session_token : null;
    const regId = typeof session === 'object' ? session.registration_id : null;
    const name = typeof session === 'object' ? session.full_name : 'Candidate';

    // Optimistically remove from grid
    setProctoringList((prev) => prev.filter((s) => s.session_id !== sessionId && s.registration_id !== regId));
    if (maximizedSession?.session_id === sessionId) {
      setMaximizedSession(null);
    }

    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/dismiss-stream`, {
        session_id: sessionId,
        session_token: sessionToken,
        registration_id: regId
      });
      toast.success(`Removed ${name}'s camera feed from monitor.`);
    } catch (err) {
      console.error('Failed to dismiss stream:', err);
      fetchProctoring();
    }
  };

  // Handle Promote Participants
  const handlePromoteSubmit = async () => {
    if (selectedRegIds.length === 0) {
      toast.error('Select at least one participant.');
      return;
    }
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/promote`, {
        registration_ids: selectedRegIds,
        target_status: promoteTarget
      });
      toast.success(`Updated ${selectedRegIds.length} participant(s) to ${promoteTarget}!`);
      setPromoteModalOpen(false);
      setSelectedRegIds([]);
      fetchLeaderboard();
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to promote participants');
    }
  };

  // Filtered Participants Memo for Participants Tab
  const filteredParticipants = useMemo(() => {
    if (!Array.isArray(leaderboard)) return [];
    return leaderboard.filter((p) => {
      const q = participantSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.prn && p.prn.toLowerCase().includes(q)) ||
        (p.access_key && p.access_key.toLowerCase().includes(q)) ||
        (String(p.registration_id).includes(q));

      const matchesStatus = participantStatusFilter === 'all' || p.qualification_status === participantStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leaderboard, participantSearch, participantStatusFilter]);

  // Open Attempt Configuration Modal for Single Participant
  const handleOpenAttemptModal = (cand) => {
    setTargetParticipant(cand);
    setAttemptForm({
      max_attempts_r1: cand.effective_attempts_r1 ?? cand.default_attempts_r1 ?? 1,
      max_attempts_r2: cand.effective_attempts_r2 ?? cand.default_attempts_r2 ?? 1,
      max_attempts_r3: cand.effective_attempts_r3 ?? cand.default_attempts_r3 ?? 1
    });
    setAttemptModalOpen(true);
  };

  // Save Attempt Configuration for Single Participant
  const handleSaveParticipantAttempts = async (e) => {
    if (e) e.preventDefault();
    if (!targetParticipant) return;
    setIsSavingAttempts(true);
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participants/attempts`, {
        registration_id: targetParticipant.registration_id,
        max_attempts_r1: parseInt(attemptForm.max_attempts_r1) || 1,
        max_attempts_r2: parseInt(attemptForm.max_attempts_r2) || 1,
        max_attempts_r3: parseInt(attemptForm.max_attempts_r3) || 1
      });
      toast.success(`Updated attempts for ${targetParticipant.full_name}!`);
      setAttemptModalOpen(false);
      setTargetParticipant(null);
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attempts');
    } finally {
      setIsSavingAttempts(false);
    }
  };

  // Quick Inline Increment (+1 Attempt for Round 1, 2, or 3)
  const handleQuickIncrementAttempt = async (cand, round) => {
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participants/reset-attempt`, {
        registration_id: cand.registration_id,
        round,
        action: 'grant_extra'
      });
      toast.success(`+1 Attempt granted to ${cand.full_name} for Round ${round}!`, { icon: '✨' });
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to grant attempt for Round ${round}`);
    }
  };

  // Reset / Clear Participant Session for Fresh Attempt
  const handleResetParticipantSession = async (cand, round) => {
    const roundName = round === 1 ? 'Round 1 (Aptitude)' : 'Round 2 (Gaming)';
    if (!window.confirm(`Are you sure you want to reset ${cand.full_name}'s session for ${roundName}? Existing answers and session will be cleared so they can start fresh.`)) {
      return;
    }
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participants/reset-attempt`, {
        registration_id: cand.registration_id,
        round,
        action: 'clear_session'
      });
      toast.success(`${roundName} session reset for ${cand.full_name}. They can retake fresh!`);
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to reset session for ${roundName}`);
    }
  };

  // Bulk Attempts Save
  const handleSaveBulkAttempts = async (e) => {
    if (e) e.preventDefault();
    if (selectedRegIds.length === 0) {
      toast.error('No participants selected.');
      return;
    }
    setIsSavingAttempts(true);
    try {
      const payload = {
        registration_ids: selectedRegIds
      };
      if (bulkAttemptForm.max_attempts_r1 !== '') payload.max_attempts_r1 = parseInt(bulkAttemptForm.max_attempts_r1);
      if (bulkAttemptForm.max_attempts_r2 !== '') payload.max_attempts_r2 = parseInt(bulkAttemptForm.max_attempts_r2);
      if (bulkAttemptForm.max_attempts_r3 !== '') payload.max_attempts_r3 = parseInt(bulkAttemptForm.max_attempts_r3);

      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/participants/attempts`, payload);
      toast.success(`Updated attempts for ${selectedRegIds.length} participant(s)!`);
      setBulkAttemptModalOpen(false);
      setSelectedRegIds([]);
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update bulk attempts');
    } finally {
      setIsSavingAttempts(false);
    }
  };

  // Export CSV (uses sorted leaderboard from export options)
  const handleExportCSV = (sortedData) => {
    const data = sortedData || getSortedLeaderboardForExport();
    if (!data || data.length === 0) {
      toast.error('No participant records to export.');
      return;
    }

    const headers = [
      'Rank',
      'Full Name',
      'PRN / Roll No',
      'Email Address',
      'Phone',
      'Access Key',
      'Shortlisted for R2',
      'Round 1 Aptitude Score',
      'Round 1 Max',
      'R1 Attempts Used',
      'R1 Attempts Allowed',
      'Round 2 Gaming Score',
      'Round 2 Max',
      'R2 Attempts Used',
      'R2 Attempts Allowed',
      'Round 3 Interview Score',
      'Round 3 Max',
      'Final Weighted Score',
      'Qualification Status'
    ];

    const rows = data.map((cand, idx) => [
      idx + 1,
      `"${(cand.full_name || '').replace(/"/g, '""')}"`,
      `"${(cand.prn || '').replace(/"/g, '""')}"`,
      `"${(cand.email || '').replace(/"/g, '""')}"`,
      `"${(cand.phone || '').replace(/"/g, '""')}"`,
      `"${(cand.access_key || '').replace(/"/g, '""')}"`,
      Number(cand.is_shortlisted) === 1 ? 'YES' : 'NO',
      Number(cand.round1_score || 0).toFixed(2),
      Number(cand.round1_max || 50).toFixed(2),
      cand.attempts_used_r1 ?? 0,
      cand.effective_attempts_r1 ?? 1,
      Number(cand.round2_score || 0).toFixed(2),
      Number(cand.round2_max || 100).toFixed(2),
      cand.attempts_used_r2 ?? 0,
      cand.effective_attempts_r2 ?? 1,
      Number(cand.round3_score || 0).toFixed(2),
      Number(cand.round3_max || 100).toFixed(2),
      Number(cand.final_weighted_score || 0).toFixed(2),
      `"${(cand.qualification_status || 'in_round_1').replace(/_/g, ' ').toUpperCase()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MindSaga_Participant_Scores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV score sheet exported successfully!');
  };

  // Export HTML with Team Mavericks Logo Background Watermark (40% Opacity)
  const handleExportHTML = (sortedData) => {
    const data = sortedData || getSortedLeaderboardForExport();
    if (!data || data.length === 0) {
      toast.error('No participant records to export.');
      return;
    }

    const title = `${overviewData?.sub_event?.name || 'Mind Saga'} - Participant Score & Attempts Ledger`;
    const genDate = new Date().toLocaleString();
    const sortLabel = { final_weighted_score: 'Final Score', round1_score: 'R1 Score', round2_score: 'R2 Score', round3_score: 'R3 Score', name: 'Name' }[exportSortBy] || 'Final Score';

    const tableRows = data.map((cand, idx) => `
      <tr>
        <td style="text-align:center;font-weight:bold;">#${idx + 1}</td>
        <td>
          <div style="font-weight:600;color:#0f172a;">${cand.full_name || 'N/A'}</div>
          <div style="font-size:11px;color:#64748b;">${cand.prn ? 'PRN: ' + cand.prn : 'ID: ' + cand.registration_id}</div>
        </td>
        <td style="font-family:monospace;font-size:11px;color:#334155;">
          ${cand.email || ''}<br><span style="color:#64748b;">${cand.phone || ''}</span>
        </td>
        <td style="text-align:center;font-family:monospace;font-weight:700;color:#4f46e5;border-radius:6px;">
          ${cand.access_key || '—'}
        </td>
        <td style="text-align:center;">
          ${Number(cand.is_shortlisted) === 1
            ? '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#fef08a;color:#854d0e;border:1px solid #ca8a04;">⭐ Shortlisted</span>'
            : '<span style="font-size:10px;color:#94a3b8;">—</span>'}
        </td>
        <td style="text-align:center;">
          <span style="font-weight:700;color:#0f172a;">${Number(cand.round1_score || 0).toFixed(2)}</span> / ${cand.round1_max || 50}
          <div style="font-size:10px;color:#64748b;">Att: ${cand.attempts_used_r1 || 0} / ${cand.effective_attempts_r1 || 1}</div>
        </td>
        <td style="text-align:center;">
          <span style="font-weight:700;color:#0f172a;">${Number(cand.round2_score || 0).toFixed(2)}</span> / ${cand.round2_max || 100}
          <div style="font-size:10px;color:#64748b;">Att: ${cand.attempts_used_r2 || 0} / ${cand.effective_attempts_r2 || 1}</div>
        </td>
        <td style="text-align:center;">
          <span style="font-weight:700;color:#0f172a;">${Number(cand.round3_score || 0).toFixed(2)}</span> / ${cand.round3_max || 100}
        </td>
        <td style="text-align:center;font-weight:800;color:#4338ca;font-size:13px;">
          ${Number(cand.final_weighted_score || 0).toFixed(2)}
        </td>
        <td style="text-align:center;">
          <span style="display:inline-block;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">
            ${(cand.qualification_status || 'in_round_1').replace(/_/g, ' ')}
          </span>
        </td>
      </tr>
    `).join('');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #ffffff;
      position: relative;
      min-height: 100vh;
    }
    /* Fixed background watermark with 40% opacity repeating on every page */
    .watermark-layer {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 480px;
      height: 480px;
      background-image: url('${MAVERICKS_LOGO_BASE64}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.40;
      pointer-events: none;
      z-index: 0;
    }
    .content-wrapper {
      position: relative;
      z-index: 1;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 0 0 4px 0;
    }
    .brand-sub {
      font-size: 13px;
      color: #475569;
      margin: 0;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: transparent;
      margin-top: 10px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background: rgba(248,250,252,0.85);
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      background: transparent;
    }
    tr:nth-child(even) td { background: rgba(248,250,252,0.5); }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="watermark-layer"></div>
  <div class="content-wrapper">
    <div class="header">
      <div>
        <h1 class="brand-title">TEAM MAVERICKS • MIND SAGA</h1>
        <p class="brand-sub">${title} | Sorted by: ${sortLabel} (${exportSortDir === 'desc' ? 'High → Low' : 'Low → High'})</p>
      </div>
      <div class="meta-box">
        <div><strong>Generated:</strong> ${genDate}</div>
        <div><strong>Candidates Count:</strong> ${data.length}</div>
        <div><strong>Weights:</strong> R1 (${configForm.round1_weight}%) | R2 (${configForm.round2_weight}%) | R3 (${configForm.round3_weight}%)</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;text-align:center;">#</th>
          <th>Participant & ID</th>
          <th>Contact & Email</th>
          <th style="text-align:center;">Access Key</th>
          <th style="text-align:center;">Shortlisted</th>
          <th style="text-align:center;">R1 Aptitude (Score & Att.)</th>
          <th style="text-align:center;">R2 Gaming (Score & Att.)</th>
          <th style="text-align:center;">R3 Interview</th>
          <th style="text-align:center;">Final Weighted</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="footer">
      <span>Official Mind Saga Telemetry Ledger • Team Mavericks Assessment Engine</span>
      <span>Confidential & Certified Result Sheet</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MindSaga_Score_Report_${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('HTML score ledger downloaded with 40% Team Mavericks watermark!');
  };

  // Print / PDF Trigger (uses sorted data)
  const handlePrintReport = () => {
    if (!leaderboard || leaderboard.length === 0) {
      toast.error('No participant records to print.');
      return;
    }
    window.print();
  };

  // Unified export handler - dispatches based on format choice from export modal
  const handleExportWithOptions = () => {
    const sortedData = getSortedLeaderboardForExport();
    if (exportFormat === 'csv') {
      handleExportCSV(sortedData);
    } else if (exportFormat === 'html') {
      handleExportHTML(sortedData);
    } else if (exportFormat === 'print') {
      handlePrintReport();
    }
    setExportModalOpen(false);
  };


  const [sendingEmails, setSendingEmails] = useState(false);
  const [regeneratingKeys, setRegeneratingKeys] = useState(false);
  const [platformStatus, setPlatformStatus] = useState('locked');

  // Handle Active Round Progression Stage (Instant Smooth Optimistic Update)
  const handleSetActiveRound = async (roundNum) => {
    // Instant optimistic state change
    setOverviewData((prev) => prev ? {
      ...prev,
      config: { ...prev.config, active_round: roundNum }
    } : prev);
    setConfigForm((prev) => ({ ...prev, active_round: roundNum }));

    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/active-round`, {
        active_round: roundNum
      });
      toast.success(res.data.message || `Round ${roundNum} is now active!`, { icon: '🎯' });
    } catch (err) {
      toast.error('Failed to change active round stage');
      fetchOverview(true);
    }
  };

  // Handle Platform Status Toggle (Live, Locked, Paused) (Instant Smooth Optimistic Update)
  const handleTogglePlatformStatus = async (newStatus) => {
    // Instant optimistic state change
    setPlatformStatus(newStatus);
    setOverviewData((prev) => prev ? {
      ...prev,
      config: { ...prev.config, platform_status: newStatus }
    } : prev);

    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/platform-status`, {
        status: newStatus
      });
      if (res.data.platform_status) {
        setPlatformStatus(res.data.platform_status);
      }
      toast.success(res.data.message || `Platform is now ${newStatus.toUpperCase()}`, { icon: newStatus === 'live' ? '🚀' : '🔒' });
    } catch (err) {
      toast.error('Failed to change platform status');
      fetchOverview(true);
    }
  };

  // Handle Broadcast Keys Email
  const handleSendKeysEmail = async () => {
    if (!window.confirm('Broadcast unique Mind Saga access keys and the entry link to all participants via email?')) {
      return;
    }
    try {
      setSendingEmails(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/send-keys-email`, {
        registration_ids: selectedRegIds
      });
      toast.success(res.data.message, { icon: '📧' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch emails');
    } finally {
      setSendingEmails(false);
    }
  };

  // Handle Regenerate Keys (All)
  const handleRegenerateKeys = async () => {
    if (!window.confirm('Are you sure you want to regenerate unique keys for all participants? Old keys will become invalid.')) {
      return;
    }
    try {
      setRegeneratingKeys(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/regenerate-keys`);
      toast.success(res.data.message);
      fetchLeaderboard();
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to regenerate keys');
    } finally {
      setRegeneratingKeys(false);
    }
  };

  // Handle Regenerate Single Candidate Key
  const handleRegenerateSingleKey = async (registrationId, name) => {
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/regenerate-keys`, {
        registration_id: registrationId
      });
      toast.success(`Generated new key for ${name}: ${res.data.access_key}`);
      fetchLeaderboard();
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to regenerate key for candidate');
    }
  };

  const handleCopyLink = (url, label = 'Link') => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-20 selection:bg-indigo-500/30 transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header Banner */}
      <div className="border-b border-slate-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/dashboard/events/${eventId}`}
                className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
                title="Back to Event"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6 text-indigo-400" />
                    {overviewData?.sub_event?.name || 'Mind Saga'}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Aptitude Test Engine • Live CCTV Proctoring
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Active Round Stage Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-zinc-950/80 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-2 sm:px-2.5">
                  Stage:
                </span>
                {[
                  { num: 1, label: 'Round 1', title: 'Round 1 (Aptitude) Active' },
                  { num: 2, label: 'Round 2', title: 'Round 1 + 2 (Gaming) Active' },
                  { num: 3, label: 'Round 3', title: 'Round 1 + 2 + 3 (Interview) Active' }
                ].map((r) => {
                  const currentActive = parseInt(overviewData?.config?.active_round) || 1;
                  const isSelected = currentActive === r.num;
                  return (
                    <button
                      key={r.num}
                      type="button"
                      onClick={() => handleSetActiveRound(r.num)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-zinc-800/80'
                        }`}
                      title={r.title}
                    >
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Platform Status Go Live / Lock Button */}
              {overviewData?.config?.platform_status === 'live' || platformStatus === 'live' ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-zinc-950 p-1 rounded-2xl border border-emerald-500/40 shadow-sm">
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    PLATFORM LIVE
                  </span>
                  <button
                    onClick={() => handleTogglePlatformStatus('locked')}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Lock Platform
                  </button>
                  <button
                    onClick={() => handleTogglePlatformStatus('paused')}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                    title="Pause Round"
                  >
                    Pause
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleTogglePlatformStatus('live')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition animate-pulse"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Mind Saga (Go Live)</span>
                </button>
              )}

              <button
                onClick={() => handleCopyLink(`${window.location.origin}/events/${eventId}/sub-events/${subEventId}/mind-saga/enter`, 'Public Mind Saga Arena Entry Link')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Copy public candidate portal link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Public Link</span>
              </button>

              <button
                onClick={() => fetchOverview(true)}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview & CCTV', icon: Video, count: (Array.isArray(proctoringList) ? proctoringList : []).filter(s => s.status === 'in_progress').length },
              { id: 'participants', label: 'Participants & Attempts', icon: UserCheck, count: (Array.isArray(leaderboard) ? leaderboard.length : 0) || overviewData?.total_registered || 0 },
              { id: 'keys', label: 'Participant Keys & Broadcast', icon: Key, count: (Array.isArray(leaderboard) ? leaderboard.length : 0) || overviewData?.total_registered || 0 },
              { id: 'aptitude', label: 'Round 1: Aptitude', icon: BrainCircuit, count: activeTest?.questions?.length || 0 },
              { id: 'gaming', label: 'Round 2: Gaming', icon: Gamepad2, count: (Array.isArray(games) ? games.length : 0) },
              { id: 'interview', label: 'Round 3: Interview Panels', icon: Users, count: overviewData?.panels?.length || 0 },
              { id: 'scores', label: 'Final Scores & Qualification', icon: Award, count: (Array.isArray(leaderboard) ? leaderboard.length : 0) },
              { id: 'config', label: 'Weights & SFU Config', icon: Sliders }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* TAB 1: OVERVIEW & CCTV PROCTORING */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Registered Participants</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{overviewData?.total_registered || 0}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Individual participants</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Active Test Sessions</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">
                  {overviewData?.live_proctor_stats?.active_count || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Taking Aptitude/Gaming now</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Proctor Warnings</span>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2">
                  {overviewData?.live_proctor_stats?.warning_count || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">1-2 tab/fullscreen warnings</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>High Risk / Flagged</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400 mt-2">
                  {overviewData?.live_proctor_stats?.flagged_count || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">&ge;3 violations triggered</div>
              </div>
            </div>

            {/* LIVE CCTV MONITORING GRID */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 rounded-2xl shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" />
                    Admin Live CCTV & Proctoring Monitor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time video grid & telemetry monitoring participant cameras, screen focus, and violations.
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-950/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'online', label: 'Online' },
                    { id: 'disconnected', label: 'Cam Disconnected' },
                    { id: 'warnings', label: 'Warnings' },
                    { id: 'flagged', label: 'Flagged' },
                    { id: 'submitted', label: 'Submitted' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setProctorFilter(f.id)}
                      className={`px-3 py-1 rounded-lg font-medium transition ${proctorFilter === f.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {proctoringList.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
                  <Video className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400 font-medium">No participant test sessions match filter "{proctorFilter}".</p>
                  <p className="text-xs text-zinc-500 mt-1">When participants start Round 1 or 2, their live CCTV feed will stream here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {proctoringList.map((session) => {
                    const isHighRisk = session.violation_count >= 3 || session.status === 'terminated';
                    const hasWarning = session.violation_count > 0 && session.violation_count < 3;
                    const isOnline = session.status === 'in_progress' && session.camera_status === 'connected';

                    return (
                      <div
                        key={`${session.round_number || 1}-${session.session_id}`}
                        className={`bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/50 flex flex-col group shadow-xs ${session.status === 'terminated'
                          ? 'border-red-600 bg-red-950/10 ring-1 ring-red-600/40'
                          : isHighRisk
                            ? 'border-red-500/60 ring-1 ring-red-500/30'
                            : hasWarning
                              ? 'border-amber-500/50'
                              : 'border-zinc-800'
                          }`}
                      >
                        {/* Real-time Video Stream Tile */}
                        <div
                          onClick={() => setMaximizedSession(session)}
                          className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden cursor-pointer group/cam"
                          title="Click to Maximize Live Feed"
                        >
                          {session.latest_snapshot ? (
                            <img
                              src={session.latest_snapshot}
                              alt={session.full_name}
                              className="w-full h-full object-cover transform -scale-x-100 transition duration-300 group-hover/cam:scale-105"
                            />
                          ) : (session.camera_status === 'disconnected' || session.camera_status === 'denied') ? (
                            <div className="w-full h-full bg-red-950/20 flex flex-col items-center justify-center p-4 text-center">
                              <ShieldAlert className="w-8 h-8 text-red-400 mb-1" />
                              <span className="text-xs font-semibold text-red-300">Camera Disconnected</span>
                              <span className="text-[10px] text-zinc-500">Signal lost</span>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-zinc-900 to-indigo-950/40 flex flex-col items-center justify-center p-4 text-center relative">
                              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm mb-2 shadow-inner">
                                {session.full_name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="text-xs font-semibold text-white truncate max-w-[90%]">{session.full_name}</span>
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Live Camera Active • Syncing Feed
                              </span>
                            </div>
                          )}

                          {/* Top Left: Live Status & Round Tag */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                            <span className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-emerald-400 font-mono font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              LIVE
                            </span>
                            <span className="bg-indigo-950/80 border border-indigo-500/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-indigo-300 font-bold">
                              {session.round_name || (session.round_number === 2 ? 'R2: Gaming' : 'R1: Aptitude')}
                            </span>
                          </div>

                          {/* Top Right: Status Badge & Maximize Button */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                            {session.status === 'terminated' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-700 text-white shadow-sm">
                                TERMINATED / BLOCKED
                              </span>
                            ) : isHighRisk ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white shadow-sm">
                                FLAGGED ({session.violation_count})
                              </span>
                            ) : hasWarning ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-black shadow-sm">
                                {session.violation_count} WARN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                                {session.status}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissStream(session);
                              }}
                              className="p-1 rounded-md bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white transition backdrop-blur-md shadow"
                              title="Remove Feed from Monitor"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMaximizedSession(session);
                              }}
                              className="p-1 rounded-md bg-black/70 hover:bg-indigo-600 text-white transition backdrop-blur-md shadow"
                              title="Maximize Stream"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Hover Overlay Hint */}
                          <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover/cam:opacity-100 transition flex items-center justify-center pointer-events-none">
                            <span className="px-3 py-1 rounded-xl bg-black/80 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1 border border-indigo-500/30">
                              <Maximize2 className="w-3 h-3" /> Click to Maximize
                            </span>
                          </div>
                        </div>

                        {/* Telemetry info */}
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-xs">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[170px]" title={session.full_name}>
                                {session.full_name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {session.email?.split('@')[0]}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-zinc-400 mt-2 text-[11px]">
                              <span>Remaining Time:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {Math.floor(session.remaining_seconds / 60)}m {session.remaining_seconds % 60}s
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-zinc-400 mt-1 text-[11px]">
                              <span>Violations:</span>
                              <span className={`font-bold ${session.violation_count >= 3 ? 'text-red-400' : session.violation_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {session.violation_count} / 3 Strikes
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-900 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedSessionDetail(session)}
                              className="flex-1 py-1.5 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" /> Inspect Logs
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDismissStream(session)}
                              className="p-1.5 bg-zinc-800/80 hover:bg-rose-600/30 text-zinc-400 hover:text-rose-300 rounded-xl transition border border-transparent hover:border-rose-500/30"
                              title="Remove Stream Tile from Monitor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {session.status === 'in_progress' ? (
                              <button
                                onClick={() => setBlockModal({ isOpen: true, session, reason: 'Frequent tab-switching & full-screen exit violation.' })}
                                className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl font-bold text-[11px] flex items-center gap-1 transition border border-red-500/30"
                                title="Block Participant & Terminate Round"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Block</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono italic px-2">
                                {session.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PARTICIPANTS & ATTEMPTS MANAGEMENT */}
        {activeTab === 'participants' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Total Participants</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                  {leaderboard.length || overviewData?.total_registered || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Registered for Mind Saga</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Aptitude (R1) Attempted</span>
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">
                  {leaderboard.filter((l) => (l.attempts_used_r1 || 0) > 0).length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Candidates took test</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Gaming (R2) Attempted</span>
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-400 mt-2">
                  {leaderboard.filter((l) => (l.attempts_used_r2 || 0) > 0).length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Played game arena</div>
              </div>

              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Qualified / Finalists</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2">
                  {leaderboard.filter((l) => ['qualified_round_2', 'qualified_round_3', 'finalist'].includes(l.qualification_status)).length}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Passed initial stages</div>
              </div>
            </div>

            {/* Action Bar with Title, Export Options, and Bulk Tools */}
            <div className="bg-white dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  Candidate Directory & Round Attempt Controller
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  View Aptitude and Gaming scores, set individual attempt limits for each round separately, or print/export official scorecards.
                </p>
              </div>

              {/* Export Buttons Group */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-300 border border-emerald-600/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Download CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportHTML}
                  className="px-3.5 py-2 bg-indigo-700/20 hover:bg-indigo-700/30 text-indigo-300 border border-indigo-600/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Download standalone HTML report with Team Mavericks watermark"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export HTML</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Print or Save as PDF with Team Mavericks watermark on every page"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Search candidate name, email, PRN, access key..."
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  {participantSearch && (
                    <button
                      onClick={() => setParticipantSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={participantStatusFilter}
                  onChange={(e) => setParticipantStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="all">All Stages ({leaderboard.length})</option>
                  <option value="in_round_1">In Round 1</option>
                  <option value="qualified_round_2">Qualified Round 2</option>
                  <option value="qualified_round_3">Qualified Round 3</option>
                  <option value="finalist">Grand Finalists</option>
                  <option value="eliminated">Eliminated</option>
                </select>
              </div>

              {/* Bulk Action Controls */}
              {selectedRegIds.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end animate-in fade-in">
                  <span className="text-xs text-indigo-400 font-semibold">
                    {selectedRegIds.length} Selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkAttemptForm({
                        max_attempts_r1: overviewData?.config?.max_attempts_r1 || 1,
                        max_attempts_r2: overviewData?.config?.max_attempts_r2 || 1,
                        max_attempts_r3: 1
                      });
                      setBulkAttemptModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Set Attempts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoteModalOpen(true)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Promote</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRegIds([])}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Participants Data Table */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedRegIds.length === filteredParticipants.length && filteredParticipants.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRegIds(filteredParticipants.map((p) => p.registration_id));
                            else setSelectedRegIds([]);
                          }}
                          className="rounded border-zinc-700"
                        />
                      </th>
                      <th className="p-3 w-12">#</th>
                      <th className="p-3">Candidate Details</th>
                      <th className="p-3 text-center">Access Key</th>
                      <th className="p-3 text-center">Round 1 (Aptitude)</th>
                      <th className="p-3 text-center">Round 2 (Gaming)</th>
                      <th className="p-3 text-center">Round 3 (Interview)</th>
                      <th className="p-3 text-center">Final Score</th>
                      <th className="p-3 text-center">Stage</th>
                      <th className="p-3 text-right">Attempts Config</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/60">
                    {filteredParticipants.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-12 text-zinc-500">
                          {participantSearch ? 'No participants match your search criteria.' : 'No participant records found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredParticipants.map((cand, idx) => {
                        const isSelected = selectedRegIds.includes(cand.registration_id);
                        return (
                          <tr
                            key={cand.id}
                            className={`hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition ${isSelected ? 'bg-indigo-950/20' : ''}`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRegIds((prev) => [...prev, cand.registration_id]);
                                  else setSelectedRegIds((prev) => prev.filter((id) => id !== cand.registration_id));
                                }}
                                className="rounded border-zinc-700"
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-700 dark:text-zinc-300">
                              #{idx + 1}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{cand.full_name}</span>
                                {cand.prn && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                    PRN: {cand.prn}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {cand.email} {cand.phone ? `• ${cand.phone}` : ''}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">
                                <span className="font-mono font-bold text-indigo-400 text-[11px]">
                                  {cand.access_key || '—'}
                                </span>
                                {cand.access_key && (
                                  <button
                                    onClick={() => handleCopyLink(cand.access_key, `Access Key for ${cand.full_name}`)}
                                    className="text-zinc-400 hover:text-white p-0.5"
                                    title="Copy Access Key"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            {/* Round 1 Aptitude Score & Attempt */}
                            <td className="p-3 text-center">
                              <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                {Number(cand.round1_score || 0).toFixed(1)} / {cand.round1_max || 50}
                              </div>
                              <div className="inline-flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                  Att: {cand.attempts_used_r1 || 0} / {cand.effective_attempts_r1 || 1}
                                </span>
                                <button
                                  onClick={() => handleQuickIncrementAttempt(cand, 1)}
                                  className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-400 transition"
                                  title="Grant +1 Attempt for Round 1"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                                {(cand.attempts_used_r1 || 0) > 0 && (
                                  <button
                                    onClick={() => handleResetParticipantSession(cand, 1)}
                                    className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-400 transition"
                                    title="Clear / Reset Round 1 Session"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            {/* Round 2 Gaming Score & Attempt */}
                            <td className="p-3 text-center">
                              <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                {Number(cand.round2_score || 0).toFixed(1)} / {cand.round2_max || 100}
                              </div>
                              <div className="inline-flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-500/30">
                                  Att: {cand.attempts_used_r2 || 0} / {cand.effective_attempts_r2 || 1}
                                </span>
                                <button
                                  onClick={() => handleQuickIncrementAttempt(cand, 2)}
                                  className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-purple-600 hover:text-white text-zinc-400 transition"
                                  title="Grant +1 Attempt for Round 2"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                                {(cand.attempts_used_r2 || 0) > 0 && (
                                  <button
                                    onClick={() => handleResetParticipantSession(cand, 2)}
                                    className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-400 transition"
                                    title="Clear / Reset Round 2 Session"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            {/* Round 3 Interview Score */}
                            <td className="p-3 text-center">
                              <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                {Number(cand.round3_score || 0).toFixed(1)} / {cand.round3_max || 100}
                              </div>
                              <div className="inline-flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-500/30">
                                  Limit: {cand.effective_attempts_r3 || 1}
                                </span>
                                <button
                                  onClick={() => handleQuickIncrementAttempt(cand, 3)}
                                  className="p-1 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-400 transition"
                                  title="Grant +1 Allowed Attempt for Round 3"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </td>
                            {/* Final Weighted Score */}
                            <td className="p-3 text-center font-bold text-indigo-400 font-mono text-sm">
                              {Number(cand.final_weighted_score || 0).toFixed(2)}
                            </td>
                            {/* Qualification Status */}
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                  cand.qualification_status === 'finalist'
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                    : cand.qualification_status === 'qualified_round_3'
                                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                    : cand.qualification_status === 'qualified_round_2'
                                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                                    : cand.qualification_status === 'eliminated'
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {(cand.qualification_status || 'in_round_1').replace(/_/g, ' ')}
                              </span>
                            </td>
                            {/* Action Button */}
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenAttemptModal(cand)}
                                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ml-auto"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Set Attempts</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PARTICIPANT ACCESS KEYS & BROADCAST */}
        {activeTab === 'keys' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="bg-white dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  Candidate Access Keys & Email Dispatch
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Every participant has a unique private key to access their Mind Saga arena. Send keys via email or copy them directly.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSendKeysEmail}
                  disabled={sendingEmails}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition"
                >
                  <Mail className={`w-4 h-4 ${sendingEmails ? 'animate-bounce' : ''}`} />
                  <span>{sendingEmails ? 'Broadcasting Emails...' : 'Broadcast Keys via Email'}</span>
                </button>

                <button
                  onClick={handleRegenerateKeys}
                  disabled={regeneratingKeys}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingKeys ? 'animate-spin' : ''}`} />
                  <span>Regenerate Keys</span>
                </button>
              </div>
            </div>

            {/* Public Link Callout Box */}
            <div className="bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-purple-950/30 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-white block">Public Mind Saga Arena Entry Link</span>
                  <span className="text-zinc-400 font-mono text-[11px]">
                    {`${window.location.origin}/events/${eventId}/sub-events/${subEventId}/mind-saga/enter`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCopyLink(`${window.location.origin}/events/${eventId}/sub-events/${subEventId}/mind-saga/enter`, 'Public Mind Saga Arena Entry Link')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5 transition self-start sm:self-auto shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Arena URL</span>
              </button>
            </div>

            {/* Participant Keys Table */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3 text-center">Unique Mind Saga Access Key</th>
                      <th className="p-3 text-center">Qualification Stage</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/60">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-zinc-500">
                          No Mind Saga registered candidates found. When users register for this sub-event, their keys appear here.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((cand) => (
                        <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{cand.full_name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">Reg ID #{cand.registration_id}</div>
                          </td>
                          <td className="p-3 font-mono text-zinc-300">{cand.email}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-indigo-500/30 shadow-xs">
                              <span className="font-mono font-bold text-indigo-300 tracking-wider">
                                {cand.access_key || 'GENERATING...'}
                              </span>
                              <button
                                onClick={() => handleCopyLink(cand.access_key, `Access Key for ${cand.full_name}`)}
                                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                                title="Copy Access Key"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-300">
                              {cand.qualification_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRegenerateSingleKey(cand.registration_id, cand.full_name)}
                                className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-indigo-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1 transition"
                                title="Regenerate unique key for this candidate"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Regen Key</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleCopyLink(
                                    `Hello ${cand.full_name}, your Mind Saga Access Key is: ${cand.access_key}\nEnter here: ${window.location.origin}/events/${eventId}/sub-events/${subEventId}/mind-saga/enter`,
                                    'Candidate Access Credentials'
                                  );
                                }}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[11px] font-medium transition"
                              >
                                Copy Message
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROUND 1 APTITUDE TEST BUILDER & QUESTIONS */}
        {activeTab === 'aptitude' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  Round 1: Online Aptitude Test Management
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage questions, single/multiple choice, AI written evaluation, drawing canvas questions, and test timer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditTest(null)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-700 hover:border-zinc-600"
                >
                  <Plus className="w-4 h-4" /> Create Test
                </button>
                {activeTest?.test && (
                  <>
                    <button
                      onClick={() => handleOpenEditTest(activeTest.test)}
                      className="px-3.5 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 hover:border-indigo-500/60 shadow-sm transition"
                    >
                      <Settings className="w-4 h-4 text-indigo-400" /> Edit Test Settings
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuestion(null);
                        setQuestionForm({
                          question_text: '',
                          question_type: 'single_choice',
                          marks: 2,
                          negative_marks: 0,
                          partial_marking_enabled: true,
                          allow_voice_answer: false,
                          image_url: '',
                          expected_answer: '',
                          keywords_text: '',
                          evaluation_mode: 'ai_assisted',
                          options: [
                            { id: 'A', text: '', is_correct: true },
                            { id: 'B', text: '', is_correct: false },
                            { id: 'C', text: '', is_correct: false },
                            { id: 'D', text: '', is_correct: false }
                          ]
                        });
                        setQuestionModalOpen(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
                    >
                      <Plus className="w-4 h-4" /> Add Question
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Active Test Card */}
            {activeTest?.test && (
              <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{activeTest.test.title}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${activeTest.test.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                        {activeTest.test.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{activeTest.test.description || 'No description provided.'}</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenEditTest(activeTest.test)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition flex items-center gap-1.5"
                      title="Edit Duration, Marks, Negative Marking & Shuffle settings"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> Edit Settings
                    </button>
                    <button
                      onClick={() => handleTogglePublish(activeTest.test.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${activeTest.test.is_published
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        }`}
                    >
                      {activeTest.test.is_published ? 'Unpublish Test' : 'Publish Test'}
                    </button>
                  </div>
                </div>

                {/* Test Metrics Grid (Clickable to Edit) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div
                    onClick={() => handleOpenEditTest(activeTest.test)}
                    className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 hover:border-indigo-500/50 hover:bg-zinc-900/80 cursor-pointer transition group relative"
                    title="Click to change Duration"
                  >
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>Duration</span>
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
                    </div>
                    <span className="font-bold text-white text-sm">{activeTest.test.duration_minutes} Mins</span>
                  </div>

                  <div
                    onClick={() => handleOpenEditTest(activeTest.test)}
                    className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 hover:border-indigo-500/50 hover:bg-zinc-900/80 cursor-pointer transition group relative"
                    title="Click to change Total Marks"
                  >
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>Total Marks</span>
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
                    </div>
                    <span className="font-bold text-indigo-400 text-sm">{Number(activeTest.test.total_marks).toFixed(2)} Marks</span>
                  </div>

                  <div
                    onClick={() => handleOpenEditTest(activeTest.test)}
                    className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 hover:border-indigo-500/50 hover:bg-zinc-900/80 cursor-pointer transition group relative"
                    title="Questions in this test"
                  >
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>Questions Count</span>
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
                    </div>
                    <span className="font-bold text-white text-sm">{activeTest.questions?.length || 0} Questions</span>
                  </div>

                  <div
                    onClick={() => handleOpenEditTest(activeTest.test)}
                    className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 hover:border-indigo-500/50 hover:bg-zinc-900/80 cursor-pointer transition group relative"
                    title="Click to change Negative Marking"
                  >
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>Negative Marking</span>
                      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
                    </div>
                    <span className="font-bold text-white text-sm">
                      {activeTest.test.negative_marking_enabled ? `-${Number(activeTest.test.default_negative_marks).toFixed(2)}` : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-semibold text-zinc-200 text-sm">Questions in this Test ({activeTest.questions?.length || 0})</h5>

                  {activeTest.questions?.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                      No questions in this test yet. Click "Add Question" above.
                    </div>
                  ) : (
                    activeTest.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 transition hover:border-zinc-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${q.question_type === 'single_choice'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : q.question_type === 'multiple_choice'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : q.question_type === 'written_response'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                  {q.question_type.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-zinc-400 font-semibold">{q.marks} Marks</span>
                                {q.allow_voice_answer && (
                                  <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                                    <Mic className="w-3 h-3" /> Voice Enabled
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-white leading-relaxed">{q.question_text}</p>
                              {q.image_url && (
                                <img src={q.image_url} alt="Question Attachment" className="max-h-48 rounded-lg border border-zinc-800 my-2" />
                              )}

                              {/* Options preview */}
                              {(q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                  {q.options?.map((opt) => {
                                    const isCorrect = q.correct_answers?.includes(opt.id);
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`p-2 rounded-lg border flex items-center gap-2 ${isCorrect
                                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 font-medium'
                                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                                          }`}
                                      >
                                        <span className="font-bold">{opt.id}.</span>
                                        <span>{opt.text}</span>
                                        {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Written Response AI concepts preview */}
                              {q.question_type === 'written_response' && q.keywords?.length > 0 && (
                                <div className="text-xs text-zinc-400 pt-1">
                                  <span className="text-zinc-500 font-medium">AI Keywords: </span>
                                  {q.keywords.map((kw, i) => (
                                    <span key={i} className="inline-block bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] text-indigo-300 mr-1.5 mt-1">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingQuestion(q);
                                setQuestionForm({
                                  question_text: q.question_text,
                                  question_type: q.question_type,
                                  marks: q.marks,
                                  negative_marks: q.negative_marks,
                                  partial_marking_enabled: Boolean(q.partial_marking_enabled),
                                  allow_voice_answer: Boolean(q.allow_voice_answer),
                                  image_url: q.image_url || '',
                                  expected_answer: q.expected_answer || '',
                                  keywords_text: q.keywords ? q.keywords.join(', ') : '',
                                  evaluation_mode: q.evaluation_mode || 'ai_assisted',
                                  options: q.options && q.options.length > 0 ? q.options.map((o) => ({
                                    ...o,
                                    is_correct: q.correct_answers?.includes(o.id)
                                  })) : [
                                    { id: 'A', text: '', is_correct: true },
                                    { id: 'B', text: '', is_correct: false },
                                    { id: 'C', text: '', is_correct: false },
                                    { id: 'D', text: '', is_correct: false }
                                  ]
                                });
                                setQuestionModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROUND 2 GAMING ENGINE */}
        {activeTab === 'gaming' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900/50 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  Round 2: Sequential Multi-Game Pipeline Manager
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Configure the sequence of games, individual timers, and difficulty levels (Easy, Medium, Hard). Difficulty tiers are automatically hidden from participants during live gameplay.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingGame(null);
                  setGameForm({
                    title: games.length % 2 === 0 ? 'Deductive Symbol Matrix Deduction' : 'Motion Matrix Reflex Challenge',
                    game_key: games.length % 2 === 0 ? 'deductive_logic' : 'motion_challenge',
                    difficulty: games.length === 0 ? 'easy' : games.length === 1 ? 'medium' : 'hard',
                    duration_seconds: 180,
                    max_score: 100,
                    is_active: 1
                  });
                  setGameModalOpen(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Game to Pipeline</span>
              </button>
            </div>

            {/* Pipeline Order Summary & Visual Stage Flow */}
            <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-black font-mono text-sm shadow-xs">
                    {games.length}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">
                        Gaming Tournament Pipeline
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Realtime Draggable
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-400 text-[11px] mt-0.5">
                      {games.length === 0
                        ? 'No games configured yet. Add games to create the Round 2 tournament pipeline.'
                        : 'Drag any card up or down to instantly reorder the sequence. Changes persist to the server in real time.'}
                    </p>
                  </div>
                </div>

                {games.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] font-mono font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/80 px-3.5 py-1.5 rounded-xl border border-indigo-200/60 dark:border-indigo-500/20 shadow-xs">
                    <span>⏱ {Math.round(games.reduce((acc, g) => acc + (g.duration_seconds || 0), 0) / 60)} Mins Total</span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400">★ {games.reduce((acc, g) => acc + (g.max_score || 0), 0)} Pts Max</span>
                  </div>
                )}
              </div>

              {/* Visual Flow Stages Breadcrumb */}
              {games.length > 0 && (
                <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-500/10 overflow-x-auto pb-1">
                  <div className="flex items-center gap-2 min-w-max">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 font-mono shrink-0 mr-1">
                      Sequence Flow:
                    </span>
                    {games.map((g, idx) => (
                      <React.Fragment key={g.id}>
                        <div
                          onClick={() => setTestPlayGame(g)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-800 text-xs hover:border-indigo-500 transition cursor-pointer shadow-xs group"
                          title="Click to test play this stage"
                        >
                          <span className="w-5 h-5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-indigo-500 transition text-[11px]">
                            {g.title.length > 24 ? `${g.title.substring(0, 24)}…` : g.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            ({g.duration_seconds}s)
                          </span>
                        </div>
                        {idx < games.length - 1 && (
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-300 dark:text-indigo-500/50 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Draggable Kanban Pipeline Cards (Framer Motion Reorder) */}
            {games.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 space-y-3">
                <Gamepad2 className="w-10 h-10 text-indigo-400 mx-auto opacity-60" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">No Games in Tournament Pipeline</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                  Add challenges like Motion Challenge, Switch Challenge, or Deductive Logic to construct Round 2.
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={games}
                onReorder={handleReorderGames}
                className="space-y-4"
              >
                {games.map((g, idx) => (
                  <Reorder.Item
                    key={g.id}
                    value={g}
                    whileDrag={{
                      scale: 1.02,
                      zIndex: 50,
                      boxShadow: isDark
                        ? '0 25px 50px -12px rgba(99, 102, 241, 0.45)'
                        : '0 25px 50px -12px rgba(99, 102, 241, 0.3)',
                      borderColor: 'rgb(99, 102, 241)'
                    }}
                    className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4 hover:border-indigo-300 dark:hover:border-zinc-700 transition select-none touch-none group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Drag Grip Handle */}
                        <div
                          className="p-2 -ml-1 text-slate-400 hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition flex items-center justify-center shrink-0"
                          title="Drag to move sequence position"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Stage Number Badge */}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-white/10 flex items-center justify-center font-black font-mono text-xs shadow-md shadow-indigo-500/20 shrink-0">
                          #{idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                              {g.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              Stage {idx + 1} of {games.length}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5 block">
                            {g.game_key === 'deductive_logic'
                              ? 'Deductive Symbol Grid Challenge'
                              : g.game_key === 'switch_challenge'
                                ? 'Switch Challenge (Permutation Operator)'
                                : 'Motion Challenge Matrix (Spatial Path Shifting)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            g.difficulty === 'easy'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : g.difficulty === 'medium'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {g.difficulty}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            g.is_active
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          {g.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed pl-1 sm:pl-12">
                      {g.rules_json?.objective || 'Sequential gameplay challenge verified authoritatively by server.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pl-0 sm:pl-12">
                      <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-500 block text-[10px] font-mono">Stage Timer</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {g.duration_seconds}s ({Math.floor(g.duration_seconds / 60)}m {g.duration_seconds % 60}s)
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-500 block text-[10px] font-mono">Max Score</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{g.max_score} pts</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-500 block text-[10px] font-mono">Key Type</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300 font-mono text-[11px] truncate block">
                          {g.game_key}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-500 block text-[10px] font-mono">Drag Order</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          Rank #{idx + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 pl-0 sm:pl-12">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGameActive(g)}
                          className={`text-[11px] font-semibold transition px-3 py-1.5 rounded-xl border cursor-pointer ${
                            g.is_active
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white border-slate-200 dark:border-transparent'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'
                          }`}
                        >
                          {g.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Quick Up/Down Button Fallbacks */}
                        <div className="flex items-center border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveGame(idx, -1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200 dark:bg-zinc-800" />
                          <button
                            type="button"
                            disabled={idx === games.length - 1}
                            onClick={() => handleMoveGame(idx, 1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Test Play Button */}
                        <button
                          type="button"
                          onClick={() => setTestPlayGame(g)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="Test Play Challenge in modal"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/30" />
                          <span>Test Play</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingGame(g);
                            setGameForm({
                              title: g.title,
                              game_key: g.game_key,
                              difficulty: g.difficulty || 'medium',
                              duration_seconds: g.duration_seconds || (g.game_key === 'motion_challenge' ? 240 : 180),
                              max_score: g.max_score || 100,
                              is_active: g.is_active ?? 1
                            });
                            setGameModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
                          title="Edit Game"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGame(g.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-xl hover:bg-rose-50 dark:hover:bg-zinc-800 transition cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
                          title="Delete Game"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        )}

        {/* TAB 4: ROUND 3 INTERVIEW PANELS (Reusing existing Panel architecture) */}
        {activeTab === 'interview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Round 3: Personal Interview Panels
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Interview round reusing the existing Panel Dashboard architecture for individual evaluators and candidate scoring.
                </p>
              </div>

              <Link
                to={`/dashboard/events/${eventId}/sub-events/${subEventId}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Manage Panels & Access Codes</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overviewData?.panels?.map((panel) => (
                <div key={panel.id} className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{panel.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                      {panel.venue || 'CSBS Dept'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">{panel.instructions || 'Standard panel evaluation criteria.'}</p>
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                    <span>{panel.judges_count || 1} Evaluator(s)</span>
                    <span className="text-emerald-400 font-medium">{panel.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FINAL SCORES & QUALIFICATION */}
        {activeTab === 'scores' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  Mind Saga Multi-Round Master Leaderboard
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Calculated from: Round 1 ({configForm.round1_weight}%) + Round 2 ({configForm.round2_weight}%) + Round 3 ({configForm.round3_weight}%).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-300 border border-emerald-600/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export scores with sort options"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Export Options</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShortlistMode(!shortlistMode); }}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    shortlistMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                  title="Toggle shortlist mode to star participants for Round 2"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>{shortlistMode ? 'Shortlist Mode ON' : 'Shortlist R1→R2'}</span>
                </button>

                {shortlistMode && (
                  <button
                    type="button"
                    onClick={() => setShortlistModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Shortlist ({shortlistedIds.length})
                  </button>
                )}

                <button
                  onClick={() => setPromoteModalOpen(true)}
                  disabled={selectedRegIds.length === 0}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <UserCheck className="w-4 h-4" /> Promote Selected ({selectedRegIds.length})
                </button>
              </div>
            </div>

            {/* Shortlist Mode Info Bar */}
            {shortlistMode && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <Star className="w-4 h-4" />
                  <span className="font-semibold">Shortlist Mode Active</span>
                  <span className="text-amber-400/70">— Click the ★ star icon on rows to toggle shortlist. Shortlisted participants will get max_attempts_r2=1 for Round 2; others get 0.</span>
                </div>
                <span className="text-amber-400 font-bold">{shortlistedIds.length} selected</span>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRegIds(leaderboard.map((l) => l.registration_id));
                            else setSelectedRegIds([]);
                          }}
                          checked={selectedRegIds.length === leaderboard.length && leaderboard.length > 0}
                          className="rounded border-zinc-700"
                        />
                      </th>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Participant</th>
                      {shortlistMode && <th className="p-3 text-center text-amber-400">Shortlist</th>}
                      <th className="p-3 text-center">R1: Aptitude ({configForm.round1_weight}%)</th>
                      <th className="p-3 text-center">R2: Gaming ({configForm.round2_weight}%)</th>
                      <th className="p-3 text-center">R3: Interview ({configForm.round3_weight}%)</th>
                      <th className="p-3 text-center font-bold text-indigo-400">Final Weighted Score</th>
                      <th className="p-3 text-center">Qualification Status</th>
                      <th className="p-3 text-center">History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800/60">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-10 text-zinc-500">
                          No evaluation scores recorded yet.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((item, idx) => {
                        const isSelected = selectedRegIds.includes(item.registration_id);
                        const isShortlisted = shortlistedIds.includes(item.registration_id);
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition ${
                            isSelected ? 'bg-indigo-950/20' : isShortlisted ? 'bg-amber-950/10' : ''
                          }`}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRegIds((prev) => [...prev, item.registration_id]);
                                  else setSelectedRegIds((prev) => prev.filter((id) => id !== item.registration_id));
                                }}
                                className="rounded border-zinc-700"
                              />
                            </td>
                            <td className="p-3 font-bold text-white">#{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {item.full_name}
                                {Number(item.is_shortlisted) === 1 && !shortlistMode && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">⭐ Shortlisted</span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono">{item.email}</div>
                            </td>
                            {shortlistMode && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleToggleShortlist(item.registration_id)}
                                  className={`p-1.5 rounded-lg transition ${
                                    isShortlisted
                                      ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30'
                                      : 'text-zinc-500 bg-zinc-800 border border-zinc-700 hover:text-amber-400 hover:border-amber-500/40'
                                  }`}
                                  title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                                >
                                  <Star className="w-4 h-4" fill={isShortlisted ? 'currentColor' : 'none'} />
                                </button>
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                {Number(item.round1_score || 0).toFixed(1)}
                                <span className="text-zinc-400 font-normal"> / {item.round1_max || 50}</span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 mt-0.5 inline-block">
                                Att: {item.attempts_used_r1 || 0} / {item.effective_attempts_r1 || 1}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                {Number(item.round2_score || 0).toFixed(1)}
                                <span className="text-zinc-400 font-normal"> / {item.round2_max || 100}</span>
                              </div>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-500/30 mt-0.5 inline-block">
                                Att: {item.attempts_used_r2 || 0} / {item.effective_attempts_r2 || 1}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono">
                              {Number(item.round3_score || 0).toFixed(1)}
                              <span className="text-zinc-400"> / {item.round3_max || 100}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-400 text-sm font-mono">
                              <div>{Number(item.final_weighted_score || 0).toFixed(2)}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${item.qualification_status === 'finalist'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : item.qualification_status === 'qualified_round_3'
                                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                                  : item.qualification_status === 'qualified_round_2'
                                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                {item.qualification_status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(item)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-indigo-300 hover:text-indigo-200 border border-zinc-700 hover:border-indigo-500/50 rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto transition cursor-pointer"
                                title="View attempt score history"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>History</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: WEIGHTS & SFU CONFIG */}
        {activeTab === 'config' && (
          <div className="max-w-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs p-6 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Configurable Weightings & SFU Infrastructure
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Set individual round weights to compute authoritative final Mind Saga marks.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Round 1 Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={configForm.round1_weight}
                    onChange={(e) => setConfigForm({ ...configForm, round1_weight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Aptitude Test</span>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Round 2 Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={configForm.round2_weight}
                    onChange={(e) => setConfigForm({ ...configForm, round2_weight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Gaming Hub</span>
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Round 3 Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={configForm.round3_weight}
                    onChange={(e) => setConfigForm({ ...configForm, round3_weight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Personal Interview</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between font-semibold">
                <span className="text-zinc-400">Total Weight Sum:</span>
                <span className={`text-sm font-bold ${Number(configForm.round1_weight) + Number(configForm.round2_weight) + Number(configForm.round3_weight) === 100
                  ? 'text-emerald-400'
                  : 'text-red-400'
                  }`}>
                  {Number(configForm.round1_weight) + Number(configForm.round2_weight) + Number(configForm.round3_weight)}%
                </span>
              </div>

              {/* Tournament Progression & Sequential Unlock */}
              <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-bold block">
                    Active Tournament Progression Stage
                  </label>
                  <span className="text-[10px] text-indigo-400 font-semibold uppercase">Sequential Gate</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { val: 1, title: 'Round 1 Only', desc: 'Aptitude Test unlocked' },
                    { val: 2, title: 'Round 1 + Round 2', desc: 'Aptitude & Gaming unlocked' },
                    { val: 3, title: 'Round 1 + 2 + 3', desc: 'All rounds unlocked' }
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.val}
                      onClick={() => setConfigForm({ ...configForm, active_round: st.val })}
                      className={`p-3 rounded-xl border text-left transition ${Number(configForm.active_round) === st.val
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                    >
                      <span className="font-bold text-xs block">{st.title}</span>
                      <span className="text-[10px] opacity-80 mt-0.5 block">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Attempts Configuration */}
              <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-bold block">
                    Participant Attempt Limits per Round
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">Configurable Retakes</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">
                      Round 1 (Aptitude) Max Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={configForm.max_attempts_r1}
                      onChange={(e) => setConfigForm({ ...configForm, max_attempts_r1: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">Default: 1 attempt</span>
                  </div>

                  <div>
                    <label className="text-zinc-400 font-semibold block mb-1">
                      Round 2 (Gaming Arena) Max Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={configForm.max_attempts_r2}
                      onChange={(e) => setConfigForm({ ...configForm, max_attempts_r2: parseInt(e.target.value) || 1 })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">Default: 1 tournament run</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">WebRTC SFU Signaling Server URL</label>
                <input
                  type="text"
                  value={configForm.sfu_server_url}
                  onChange={(e) => setConfigForm({ ...configForm, sfu_server_url: e.target.value })}
                  placeholder="wss://sfu.teammavericks.org"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Max Cheating Violations Allowed Before Auto-Submit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={configForm.max_violations_allowed}
                  onChange={(e) => setConfigForm({ ...configForm, max_violations_allowed: parseInt(e.target.value) || 3 })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                Save Mind Saga Configuration
              </button>
            </form>
          </div>
        )}
      </div>

      {/* TEST SETTINGS & BUILDER MODAL */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingTestId ? 'Edit Aptitude Test Settings' : 'Create New Aptitude Test'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">Configure timer duration, marks, question pool, and negative marking.</p>
                </div>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Test Title *</label>
                <input
                  type="text"
                  required
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g. Mind Saga Phase 1: Cognitive Aptitude"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Test Description & Instructions</label>
                <textarea
                  rows="2"
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Instructions for participants before starting..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Duration & Marks Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 space-y-1.5">
                  <label className="text-zinc-300 font-bold block flex items-center justify-between">
                    <span>Duration (Minutes) *</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="300"
                    value={testForm.duration_minutes}
                    onChange={(e) => setTestForm({ ...testForm, duration_minutes: parseInt(e.target.value) || 25 })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 block">Exam countdown timer</span>
                </div>

                <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 space-y-1.5">
                  <label className="text-zinc-300 font-bold block flex items-center justify-between">
                    <span>Total Marks *</span>
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    value={testForm.total_marks}
                    onChange={(e) => setTestForm({ ...testForm, total_marks: parseFloat(e.target.value) || 40 })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-indigo-300 font-mono font-bold text-sm focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 block">Maximum score achievable</span>
                </div>
              </div>

              {/* Passing Marks & Random Pool Count */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 space-y-1.5">
                  <label className="text-zinc-300 font-semibold block">Pass Marks</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={testForm.pass_marks}
                    onChange={(e) => setTestForm({ ...testForm, pass_marks: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 block">Cut-off score benchmark</span>
                </div>

                <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 space-y-1.5">
                  <label className="text-zinc-300 font-semibold block">Random Question Count</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="All questions in pool"
                    value={testForm.random_question_count}
                    onChange={(e) => setTestForm({ ...testForm, random_question_count: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 block">e.g. 4 questions picked from pool</span>
                </div>
              </div>

              {/* Negative Marking Configuration */}
              <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testForm.negative_marking_enabled}
                      onChange={(e) => setTestForm({ ...testForm, negative_marking_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-zinc-200 font-bold">Enable Negative Marking</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">Deduction per incorrect answer</span>
                </div>

                {testForm.negative_marking_enabled && (
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                    <span className="text-zinc-400 font-medium">Negative Marks Penalty:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold font-mono">-</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        value={testForm.default_negative_marks}
                        onChange={(e) => setTestForm({ ...testForm, default_negative_marks: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-red-300 font-mono font-bold text-xs"
                      />
                      <span className="text-zinc-400 text-xs">Marks</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Randomization Options */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
                  <input
                    type="checkbox"
                    checked={testForm.shuffle_questions}
                    onChange={(e) => setTestForm({ ...testForm, shuffle_questions: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-zinc-300 font-medium text-xs">Shuffle Questions</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
                  <input
                    type="checkbox"
                    checked={testForm.shuffle_options}
                    onChange={(e) => setTestForm({ ...testForm, shuffle_options: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-zinc-300 font-medium text-xs">Shuffle MCQ Options</span>
                </label>
              </div>

              {/* Schedule (Optional) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Schedule Window Start</label>
                  <input
                    type="datetime-local"
                    value={testForm.schedule_start}
                    onChange={(e) => setTestForm({ ...testForm, schedule_start: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block mb-1">Schedule Window End</label>
                  <input
                    type="datetime-local"
                    value={testForm.schedule_end}
                    onChange={(e) => setTestForm({ ...testForm, schedule_end: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  {editingTestId ? 'Update Test Settings' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION BUILDER MODAL */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingQuestion ? 'Edit Question' : 'Add New Aptitude Question'}
              </h3>
              <button onClick={() => setQuestionModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Question Type</label>
                <select
                  value={questionForm.question_type}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="single_choice">Single Correct Option (Radio)</option>
                  <option value="multiple_choice">Multiple Correct Options (Checkbox)</option>
                  <option value="written_response">Written Response (AI Evaluated)</option>
                  <option value="drawing_response">Architecture / Drawing Canvas</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Question Statement</label>
                <textarea
                  rows="3"
                  required
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="Enter clear technical or logical reasoning problem..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Negative Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    value={questionForm.negative_marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, negative_marks: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Image attachment / Drawing tool button */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Diagram / Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={questionForm.image_url}
                    onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })}
                    placeholder="https://... or click Draw Diagram"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setDrawingModalOpen(true)}
                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl font-medium flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Draw
                  </button>
                </div>
              </div>

              {/* Single / Multiple Choice Options */}
              {(questionForm.question_type === 'single_choice' || questionForm.question_type === 'multiple_choice') && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="text-zinc-300 font-semibold block">Options & Correct Answer(s)</label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="w-6 font-bold text-zinc-400">{opt.id}.</span>
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => {
                          const next = [...questionForm.options];
                          next[idx].text = e.target.value;
                          setQuestionForm({ ...questionForm, options: next });
                        }}
                        placeholder={`Option ${opt.id}`}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white"
                      />
                      <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer bg-zinc-950 px-2 py-1.5 rounded-xl border border-zinc-800">
                        <input
                          type={questionForm.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                          name="correct_option"
                          checked={opt.is_correct}
                          onChange={(e) => {
                            const next = questionForm.options.map((o, i) => ({
                              ...o,
                              is_correct: questionForm.question_type === 'single_choice' ? i === idx : i === idx ? e.target.checked : o.is_correct
                            }));
                            setQuestionForm({ ...questionForm, options: next });
                          }}
                        />
                        <span className="text-[11px]">Correct</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Written Response AI concepts */}
              {questionForm.question_type === 'written_response' && (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-semibold block">Expected Ideal Answer</label>
                    <label className="flex items-center gap-1.5 text-violet-400 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={questionForm.allow_voice_answer}
                        onChange={(e) => setQuestionForm({ ...questionForm, allow_voice_answer: e.target.checked })}
                      />
                      <span>Allow Voice Recording</span>
                    </label>
                  </div>
                  <textarea
                    rows="2"
                    value={questionForm.expected_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, expected_answer: e.target.value })}
                    placeholder="Comprehensive reference answer for AI semantic comparison..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                  />
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Required Technical Keywords / Concepts (Comma separated)</label>
                    <input
                      type="text"
                      value={questionForm.keywords_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, keywords_text: e.target.value })}
                      placeholder="e.g. 3-way handshake, congestion control, connection-oriented, reliability"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWING CANVAS MODAL */}
      <DrawingCanvasModal
        isOpen={drawingModalOpen}
        onClose={() => setDrawingModalOpen(false)}
        onSave={(dataUrl) => {
          setQuestionForm((prev) => ({ ...prev, image_url: dataUrl }));
          toast.success('Diagram captured!');
        }}
      />

      {/* PROMOTE PARTICIPANTS MODAL */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Promote {selectedRegIds.length} Participants</h3>
            <p className="text-xs text-zinc-400">
              Select the next round or qualification stage for the chosen participants.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-zinc-300 font-semibold block">Target Qualification Stage</label>
              <select
                value={promoteTarget}
                onChange={(e) => setPromoteTarget(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="qualified_round_2">Qualified for Round 2: Gaming</option>
                <option value="qualified_round_3">Qualified for Round 3: Personal Interview</option>
                <option value="finalist">Grand Finalist</option>
                <option value="eliminated">Eliminated</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setPromoteModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteSubmit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs shadow-md"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE PARTICIPANT ATTEMPTS CONFIGURATION MODAL */}
      {attemptModalOpen && targetParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>Configure Round Attempts</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Set allowed attempts separately for each Mind Saga round for <strong className="text-white">{targetParticipant.full_name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttemptModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Metadata Bar */}
            <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-zinc-400">Candidate:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{targetParticipant.full_name}</span>
              </div>
              {targetParticipant.prn && (
                <div>
                  <span className="text-zinc-400">PRN:</span>{' '}
                  <span className="font-mono text-indigo-400 font-bold">{targetParticipant.prn}</span>
                </div>
              )}
              <div>
                <span className="text-zinc-400">Access Key:</span>{' '}
                <span className="font-mono text-purple-400 font-bold">{targetParticipant.access_key || '—'}</span>
              </div>
            </div>

            <form onSubmit={handleSaveParticipantAttempts} className="space-y-4 text-xs">
              {/* Round 1: Aptitude */}
              <div className="bg-slate-50 dark:bg-zinc-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Round 1: Aptitude Assessment</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Used: <strong className="text-emerald-400">{targetParticipant.attempts_used_r1 || 0}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-400 block mb-1">Max Allowed Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={attemptForm.max_attempts_r1}
                      onChange={(e) => setAttemptForm({ ...attemptForm, max_attempts_r1: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-4">
                    <button
                      type="button"
                      onClick={() => setAttemptForm((prev) => ({ ...prev, max_attempts_r1: (parseInt(prev.max_attempts_r1) || 1) + 1 }))}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      +1 Attempt
                    </button>
                    {(targetParticipant.attempts_used_r1 || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetParticipantSession(targetParticipant, 1)}
                        className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-semibold transition"
                      >
                        Reset Session
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Round 2: Gaming */}
              <div className="bg-slate-50 dark:bg-zinc-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Round 2: Gaming Arena</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Used: <strong className="text-purple-400">{targetParticipant.attempts_used_r2 || 0}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-400 block mb-1">Max Allowed Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={attemptForm.max_attempts_r2}
                      onChange={(e) => setAttemptForm({ ...attemptForm, max_attempts_r2: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-4">
                    <button
                      type="button"
                      onClick={() => setAttemptForm((prev) => ({ ...prev, max_attempts_r2: (parseInt(prev.max_attempts_r2) || 1) + 1 }))}
                      className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      +1 Attempt
                    </button>
                    {(targetParticipant.attempts_used_r2 || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetParticipantSession(targetParticipant, 2)}
                        className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-[10px] font-semibold transition"
                      >
                        Reset Session
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Round 3: Interview */}
              <div className="bg-slate-50 dark:bg-zinc-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-slate-900 dark:text-white">Round 3: Personal Interview</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Panel Evaluation
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-400 block mb-1">Max Allowed Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={attemptForm.max_attempts_r3}
                      onChange={(e) => setAttemptForm({ ...attemptForm, max_attempts_r3: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-4">
                    <button
                      type="button"
                      onClick={() => setAttemptForm((prev) => ({ ...prev, max_attempts_r3: (parseInt(prev.max_attempts_r3) || 1) + 1 }))}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      +1 Attempt
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAttemptModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAttempts}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-600/20"
                >
                  {isSavingAttempts ? 'Saving...' : 'Save Attempt Limits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK ATTEMPTS CONFIGURATION MODAL */}
      {bulkAttemptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>Bulk Set Round Attempts</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update attempt limits for <strong className="text-white">{selectedRegIds.length}</strong> selected candidate(s).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkAttemptModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkAttempts} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Round 1: Aptitude Allowed Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkAttemptForm.max_attempts_r1}
                  onChange={(e) => setBulkAttemptForm({ ...bulkAttemptForm, max_attempts_r1: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Round 2: Gaming Arena Allowed Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={bulkAttemptForm.max_attempts_r2}
                  onChange={(e) => setBulkAttemptForm({ ...bulkAttemptForm, max_attempts_r2: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Round 3: Interview Allowed Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={bulkAttemptForm.max_attempts_r3}
                  onChange={(e) => setBulkAttemptForm({ ...bulkAttemptForm, max_attempts_r3: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBulkAttemptModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAttempts}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-600/20"
                >
                  {isSavingAttempts ? 'Applying...' : 'Apply to Selected'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT SESSION LOGS DRAWER / MODAL */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedSessionDetail.full_name}</h3>
                <p className="text-xs text-zinc-400 font-mono">{selectedSessionDetail.email}</p>
              </div>
              <button onClick={() => setSelectedSessionDetail(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block">Status</span>
                <span className="font-bold text-white uppercase">{selectedSessionDetail.status}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block">Violation Count</span>
                <span className={`font-bold ${selectedSessionDetail.violation_count >= 3 ? 'text-red-400' : 'text-white'}`}>
                  {selectedSessionDetail.violation_count} / 3
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-semibold text-zinc-200 text-xs">Proctoring Telemetry Events Log</h5>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2 max-h-60 overflow-y-auto text-xs">
                {selectedSessionDetail.proctoring_events?.length === 0 ? (
                  <p className="text-zinc-500 italic">No proctoring events recorded.</p>
                ) : (
                  selectedSessionDetail.proctoring_events?.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 border-b border-zinc-900 pb-1.5 last:border-none">
                      <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-zinc-400 font-mono text-[10px]">{ev.timestamp}</span>
                        <p className="text-zinc-200 font-medium">{ev.type}</p>
                        {ev.details && <p className="text-zinc-500 text-[11px]">{ev.details}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME CHALLENGE CONFIGURATION MODAL */}
      {gameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingGame ? 'Edit Game Challenge' : 'Add Game Challenge to Pipeline'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure game type, difficulty level, and individual game timer.
                </p>
              </div>
              <button onClick={() => setGameModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-zinc-300 font-semibold block mb-1">Game Challenge Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => {
                      setGameForm({
                        ...gameForm,
                        game_key: 'deductive_logic',
                        title: editingGame ? gameForm.title : 'Deductive Symbol Matrix Deduction'
                      });
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${gameForm.game_key === 'deductive_logic'
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-950 dark:text-white ring-1 ring-purple-500'
                      : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                  >
                    <BrainCircuit className="w-5 h-5 text-purple-500 dark:text-purple-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-xs">Deductive Symbol Grid</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">4x4 Latin Square Logic</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setGameForm({
                        ...gameForm,
                        game_key: 'motion_challenge',
                        title: editingGame ? gameForm.title : 'MOTION CHALLENGE: Spatial Path Creation & Block Shifting',
                        duration_seconds: editingGame ? gameForm.duration_seconds : 240
                      });
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${gameForm.game_key === 'motion_challenge'
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-950 dark:text-white ring-1 ring-indigo-500'
                      : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                  >
                    <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-xs">Motion Challenge</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">Path Creation & Sliding</span>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setGameForm({
                        ...gameForm,
                        game_key: 'switch_challenge',
                        title: editingGame ? gameForm.title : 'SWITCH CHALLENGE: Logical Permutation Test',
                        duration_seconds: editingGame ? gameForm.duration_seconds : 240
                      });
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${gameForm.game_key === 'switch_challenge'
                      ? 'bg-lime-50 dark:bg-lime-950/30 border-lime-500 text-lime-950 dark:text-white ring-1 ring-lime-500'
                      : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                  >
                    <Zap className="w-5 h-5 text-lime-500 dark:text-lime-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-xs">Switch Challenge</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">Single & Dual Permutation</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-zinc-300 font-semibold block mb-1">Challenge Title / Display Name</label>
                <input
                  type="text"
                  required
                  value={gameForm.title}
                  onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                  placeholder="e.g. MOTION CHALLENGE: Spatial Path Creation"
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Difficulty Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-zinc-300 font-semibold block">Difficulty Level (Configured by Admin)</label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Hidden from candidate view</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'easy', label: 'Easy', desc: '10 Clues / 3x3 to 4x4 Grids' },
                    { id: 'medium', label: 'Medium', desc: '8 Clues / 4x4 to 5x5 Grids' },
                    { id: 'hard', label: 'Hard', desc: '6 Clues / Complex Obstacles' }
                  ].map((lvl) => (
                    <button
                      type="button"
                      key={lvl.id}
                      onClick={() => setGameForm({ ...gameForm, difficulty: lvl.id })}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${gameForm.difficulty === lvl.id
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:text-white'
                        }`}
                    >
                      <span className="font-bold uppercase text-xs">{lvl.label}</span>
                      <span className="text-[9px] opacity-75 mt-0.5">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer and Max Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-zinc-300 font-semibold block mb-1">
                    Game Timer (Seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="1800"
                    step="10"
                    required
                    value={gameForm.duration_seconds}
                    onChange={(e) => setGameForm({ ...gameForm, duration_seconds: parseInt(e.target.value) || 180 })}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 block mt-1">
                    = {Math.floor(gameForm.duration_seconds / 60)}m {gameForm.duration_seconds % 60}s
                  </span>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-zinc-300 font-semibold block mb-1">
                    Max Score (Points)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    required
                    value={gameForm.max_score}
                    onChange={(e) => setGameForm({ ...gameForm, max_score: parseInt(e.target.value) || 100 })}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 block mt-1">
                    Cumulative Round 2 score
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setGameModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-xl font-medium text-xs border border-slate-200 dark:border-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold text-xs shadow-md cursor-pointer"
                >
                  {editingGame ? 'Update Game' : 'Add Game to Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN TEST PLAY PREVIEW MODAL */}
      {testPlayGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 text-white border border-indigo-500/40 rounded-2xl w-full max-w-4xl p-5 sm:p-7 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base font-mono uppercase">
                      Admin Test Play Sandbox: {testPlayGame.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Sandbox Mode
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Test and verify game mechanics, sliding rules, and scoring logic without affecting participant scores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestPlayGame(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              {testPlayGame.game_key === 'motion_challenge' ? (
                <MotionChallengeGame
                  gameData={null}
                  isDark={true}
                  initialScore={0}
                  onScoreUpdate={() => {}}
                  onMoveAction={() => {}}
                  onGameComplete={() => {
                    toast.success('Admin Test Run Complete!');
                    setTestPlayGame(null);
                  }}
                />
              ) : testPlayGame.game_key === 'switch_challenge' ? (
                <SwitchChallengeGame
                  isDark={true}
                  initialScore={0}
                  onScoreUpdate={() => {}}
                  onMoveAction={() => {}}
                  onGameComplete={() => {
                    toast.success('Admin Switch Challenge Test Run Complete!');
                    setTestPlayGame(null);
                  }}
                />
              ) : (
                <div className="p-8 text-center text-xs font-mono text-zinc-400 border border-white/10">
                  Deductive Latin Square test module ready.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAXIMIZED CCTV LIVE STREAM MODAL */}
      {maximizedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-zinc-900 border border-indigo-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{maximizedSession.full_name}</h3>
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {maximizedSession.round_name || (maximizedSession.round_number === 2 ? 'Round 2: Gaming' : 'Round 1: Aptitude')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {maximizedSession.email} • ID #{maximizedSession.registration_id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaximizedSession(null)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                  title="Minimize View"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video & Telemetry Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* High-Resolution Stream Screen */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center">
                {maximizedSession.latest_snapshot ? (
                  <img
                    src={maximizedSession.latest_snapshot}
                    alt={maximizedSession.full_name}
                    className="w-full h-full object-contain transform -scale-x-100"
                  />
                ) : (maximizedSession.camera_status === 'disconnected' || maximizedSession.camera_status === 'denied') ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-red-400">
                    <ShieldAlert className="w-12 h-12" />
                    <span className="text-sm font-bold">Camera Feed Offline</span>
                    <span className="text-xs text-zinc-500">Candidate webcam disconnected or denied</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-xl font-bold">
                      {maximizedSession.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-white">Live Camera Active</span>
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Receiving realtime telemetry...
                    </span>
                  </div>
                )}

                {/* Stream Overlay Indicators */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE SURVEILLANCE
                  </span>
                  <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-zinc-300 border border-zinc-700">
                    {maximizedSession.last_snapshot_at ? `Frame: ${maximizedSession.last_snapshot_at}` : 'Realtime Stream'}
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${maximizedSession.status === 'terminated'
                    ? 'bg-red-950/80 border-red-500 text-red-300'
                    : maximizedSession.violation_count >= 3
                      ? 'bg-red-600 text-white'
                      : maximizedSession.violation_count > 0
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    }`}>
                    {maximizedSession.status === 'terminated'
                      ? 'TERMINATED'
                      : `${maximizedSession.violation_count} / 3 Strikes`}
                  </span>
                </div>
              </div>

              {/* Real-time Telemetry Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <span className="text-zinc-500 block font-medium">Session Status</span>
                  <span className="font-bold text-white uppercase text-sm mt-0.5 block">{maximizedSession.status}</span>
                </div>

                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <span className="text-zinc-500 block font-medium">Time Remaining</span>
                  <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                    {Math.floor(maximizedSession.remaining_seconds / 60)}m {maximizedSession.remaining_seconds % 60}s
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <span className="text-zinc-500 block font-medium">Camera Feed</span>
                  <span className={`font-bold text-sm mt-0.5 block ${maximizedSession.camera_status === 'connected' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {maximizedSession.camera_status === 'connected' ? '● Connected' : '✕ Disconnected'}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <span className="text-zinc-500 block font-medium">Security Strikes</span>
                  <span className={`font-bold text-sm mt-0.5 block ${maximizedSession.violation_count >= 3 ? 'text-red-400' : maximizedSession.violation_count > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                    {maximizedSession.violation_count} of 3
                  </span>
                </div>
              </div>

              {/* Telemetry Timeline Events */}
              <div className="space-y-2">
                <h5 className="font-bold text-zinc-300 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Live Proctoring Events Telemetry
                </h5>
                <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 max-h-48 overflow-y-auto space-y-2 text-xs">
                  {(!maximizedSession.proctoring_events || maximizedSession.proctoring_events.length === 0) ? (
                    <p className="text-zinc-500 italic text-[11px]">No violations recorded. Candidate test stream is clean.</p>
                  ) : (
                    maximizedSession.proctoring_events.map((ev, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 pb-2 border-b border-zinc-900 last:border-none">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono text-zinc-500">{ev.timestamp}</span>
                          <p className="font-semibold text-zinc-200">{ev.type}</p>
                          {ev.details && <p className="text-[11px] text-zinc-400">{ev.details}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaximizedSession(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Close Maximize
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissStream(maximizedSession)}
                  className="px-3 py-2 bg-zinc-800/80 hover:bg-rose-600/20 text-zinc-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-transparent hover:border-rose-500/30"
                  title="Remove Feed from Monitor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Feed</span>
                </button>
              </div>

              {maximizedSession.status === 'in_progress' && (
                <button
                  onClick={() => {
                    setBlockModal({
                      isOpen: true,
                      session: maximizedSession,
                      reason: 'Proctor Admin Block: Repeated tab-switching & full-screen exit violation.'
                    });
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/25 transition"
                >
                  <Ban className="w-4 h-4" />
                  <span>Block Candidate &amp; Terminate Test</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BLOCK CANDIDATE WITH WARNING MODAL */}
      {blockModal.isOpen && blockModal.session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-zinc-900 border border-red-500/60 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Block Candidate &amp; Auto-Submit Round</h3>
                <p className="text-xs text-zinc-400">
                  Instantly terminate {blockModal.session.full_name}'s session with an authoritative warning.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Candidate:</span>
                <span className="font-bold text-white">{blockModal.session.full_name}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Round:</span>
                <span className="font-semibold text-indigo-400">
                  {blockModal.session.round_name || 'Current Active Round'}
                </span>
              </div>
            </div>

            {/* Preset Warning Chips */}
            <div className="space-y-1.5 text-xs">
              <label className="text-zinc-300 font-semibold block">Select Warning Reason Preset</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  'Repeated full-screen exits and window blurring detected.',
                  'Multiple faces / unauthorized persons detected in camera frame.',
                  'External electronic device / notes detected during test.',
                  'Browser inspection tools / developer console opened.',
                  'Proctoring camera intentionally covered or disconnected.'
                ].map((reasonText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBlockModal({ ...blockModal, reason: reasonText })}
                    className={`p-2 rounded-xl border text-left text-xs transition ${blockModal.reason === reasonText
                      ? 'bg-red-950/40 border-red-500 text-red-200'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                  >
                    {reasonText}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Warning Reason Input */}
            <div className="space-y-1.5 text-xs">
              <label className="text-zinc-300 font-semibold block">Custom Warning Notice (Shown to Participant)</label>
              <textarea
                rows="2"
                required
                value={blockModal.reason}
                onChange={(e) => setBlockModal({ ...blockModal, reason: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs"
                placeholder="Enter exact warning reason that will be displayed to the candidate..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setBlockModal({ isOpen: false, session: null, reason: '' })}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTerminateSession(blockModal.session, blockModal.reason)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/25 flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Block &amp; Terminate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. EXPORT OPTIONS & WATERMARK CONFIGURATION MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Export Scores &amp; Telemetry Ledger</h3>
                  <p className="text-[11px] text-zinc-400">Export official results with sorting, attempt modes &amp; Team Mavericks watermark.</p>
                </div>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Export Format Selector */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1.5">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'csv', label: 'CSV Spreadsheet', icon: FileSpreadsheet, desc: 'Excel / CSV raw data' },
                    { id: 'html', label: 'HTML Ledger', icon: FileText, desc: '40% watermark report' },
                    { id: 'print', label: 'Print / PDF', icon: Printer, desc: 'Certified A4 Landscape' }
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setExportFormat(fmt.id)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          exportFormat === fmt.id
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1 text-emerald-400" />
                        <span className="font-bold block">{fmt.label}</span>
                        <span className="text-[10px] text-zinc-500 block">{fmt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attempt Score Consideration Mode */}
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                <label className="text-zinc-300 font-semibold block flex items-center justify-between">
                  <span>Score Consideration in Export</span>
                  <span className="text-[10px] text-amber-400 font-semibold">Multi-Attempt Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScoreMode('current')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      exportScoreMode === 'current'
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs block">Highest Score in All Attempts</span>
                    <span className="text-[10px] text-zinc-500 block">Best performance across attempts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScoreMode('attempt_1')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      exportScoreMode === 'attempt_1'
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs block">First Attempt Score</span>
                    <span className="text-[10px] text-zinc-500 block">Original baseline trial score</span>
                  </button>
                </div>
              </div>

              {/* Sort By & Direction Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Sort Metric</label>
                  <select
                    value={exportSortBy}
                    onChange={(e) => setExportSortBy(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    <option value="final_weighted_score">Final Weighted Score</option>
                    <option value="round1_score">Round 1 (Aptitude) Score</option>
                    <option value="round2_score">Round 2 (Gaming) Score</option>
                    <option value="round3_score">Round 3 (Interview) Score</option>
                    <option value="name">Participant Name (A-Z)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Sort Direction</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExportSortDir('desc')}
                      className={`py-2 px-2.5 rounded-xl border font-bold text-xs text-center transition ${
                        exportSortDir === 'desc'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      High → Low
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportSortDir('asc')}
                      className={`py-2 px-2.5 rounded-xl border font-bold text-xs text-center transition ${
                        exportSortDir === 'asc'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Low → High
                    </button>
                  </div>
                </div>
              </div>

              {/* Watermark Notice */}
              <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Team Mavericks Protection &amp; Watermark</span>
                </div>
                <p className="text-indigo-400/80 leading-relaxed">
                  Exported HTML and PDF reports include an official certified background watermark of the Team Mavericks crest with high resolution.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportWithOptions}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Now ({exportFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTEMPT HISTORY DETAIL MODAL (Shows all attempts for each participant with individual scores) */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Attempt History: {historyParticipant?.full_name}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {historyParticipant?.email} • PRN: {historyParticipant?.prn || 'N/A'} • Key: {historyParticipant?.access_key}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <span>Loading attempt telemetry records...</span>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Max Score Summary Header */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Round 1 (Aptitude) Max</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {historyData?.max_aptitude_score ?? historyParticipant?.round1_score ?? 0} pts
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {historyData?.aptitude_sessions?.length || 0} attempt(s) taken
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Round 2 (Gaming) Max</span>
                    <span className="text-base font-bold text-purple-400 font-mono">
                      {historyParticipant?.round2_score ?? 0} pts
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {historyData?.game_sessions?.length || 0} challenge run(s)
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Final Authoritative</span>
                    <span className="text-base font-bold text-indigo-400 font-mono">
                      {Number(historyParticipant?.final_weighted_score || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500 block uppercase font-semibold">
                      {historyParticipant?.qualification_status?.replace(/_/g, ' ') || 'Round 1'}
                    </span>
                  </div>
                </div>

                {/* Round 1 Attempts Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-emerald-400" />
                      <span>Round 1: Cognitive Aptitude Attempts</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Allowed: {historyParticipant?.effective_attempts_r1 || 1}
                    </span>
                  </div>

                  {(!historyData?.aptitude_sessions || historyData.aptitude_sessions.length === 0) ? (
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-zinc-500">
                      No aptitude test attempts recorded yet.
                    </div>
                  ) : (
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900/80 text-[10px] uppercase text-zinc-400 font-bold border-b border-zinc-800">
                          <tr>
                            <th className="p-2.5">Attempt</th>
                            <th className="p-2.5">Date &amp; Time</th>
                            <th className="p-2.5 text-center">Score</th>
                            <th className="p-2.5 text-center">Percentage</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {historyData.aptitude_sessions.map((sess, idx) => {
                            const isMax = Number(sess.total_score) === Number(historyData.max_aptitude_score) && Number(sess.total_score) > 0;
                            return (
                              <tr key={sess.id} className="hover:bg-zinc-900/40">
                                <td className="p-2.5 font-bold font-mono">
                                  Attempt #{idx + 1}
                                  {isMax && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      ⭐ Best
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-zinc-400 text-[11px] font-mono">
                                  {sess.submitted_at ? new Date(sess.submitted_at).toLocaleString() : (sess.started_at ? new Date(sess.started_at).toLocaleString() : '—')}
                                </td>
                                <td className="p-2.5 text-center font-bold text-white font-mono">
                                  {Number(sess.total_score || 0).toFixed(1)} / {sess.max_possible_score || 40}
                                </td>
                                <td className="p-2.5 text-center font-mono text-zinc-300">
                                  {Number(sess.percentage || 0).toFixed(1)}%
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    sess.status === 'submitted'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : sess.status === 'terminated'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    {sess.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Round 2 Game Sessions Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      <span>Round 2: Gaming Arena Challenge Runs</span>
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Allowed: {historyParticipant?.effective_attempts_r2 || 1}
                    </span>
                  </div>

                  {(!historyData?.game_sessions || historyData.game_sessions.length === 0) ? (
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-zinc-500">
                      No gaming arena sessions recorded yet.
                    </div>
                  ) : (
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900/80 text-[10px] uppercase text-zinc-400 font-bold border-b border-zinc-800">
                          <tr>
                            <th className="p-2.5">Challenge Title</th>
                            <th className="p-2.5">Date &amp; Time</th>
                            <th className="p-2.5 text-center">Score</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {historyData.game_sessions.map((gs) => (
                            <tr key={gs.id} className="hover:bg-zinc-900/40">
                              <td className="p-2.5 font-bold text-white">
                                <div>{gs.game_title || gs.game_key}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{gs.game_key}</div>
                              </td>
                              <td className="p-2.5 text-zinc-400 text-[11px] font-mono">
                                {gs.completed_at ? new Date(gs.completed_at).toLocaleString() : (gs.started_at ? new Date(gs.started_at).toLocaleString() : '—')}
                              </td>
                              <td className="p-2.5 text-center font-bold text-purple-400 font-mono">
                                {Number(gs.score || 0)} / {gs.max_score || 100}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  gs.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {gs.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SHORTLIST CONFIRMATION MODAL (R1 -> R2 Progression Gate) */}
      {shortlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-amber-500/50 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Confirm Shortlist for Round 2 ({shortlistedIds.length} Selected)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Authoritatively set round advancement and attempt allowances.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-2">
                <p className="font-semibold text-amber-200">
                  Eligibility &amp; Attempt Rules:
                </p>
                <ul className="list-disc list-inside space-y-1 text-amber-300/80 text-[11px]">
                  <li><strong>Shortlisted candidates ({shortlistedIds.length}):</strong> Automatically granted <strong>1 attempt</strong> for Round 2 (Gaming Arena).</li>
                  <li><strong>Non-shortlisted candidates:</strong> Round 2 attempts will be set to <strong>0</strong> (cannot access or play Round 2).</li>
                  <li>Only candidates passing Round 1 will be able to start the Gaming Arena.</li>
                </ul>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-400">Quick selection:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const top10 = [...leaderboard].sort((a,b) => Number(b.round1_score || 0) - Number(a.round1_score || 0)).slice(0, 10).map((p) => p.registration_id);
                      setShortlistedIds(top10);
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-semibold"
                  >
                    Top 10 R1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const top20 = [...leaderboard].sort((a,b) => Number(b.round1_score || 0) - Number(a.round1_score || 0)).slice(0, 20).map((p) => p.registration_id);
                      setShortlistedIds(top20);
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-semibold"
                  >
                    Top 20 R1
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortlistedIds(leaderboard.map((p) => p.registration_id))}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-semibold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortlistedIds([])}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-rose-300 rounded-lg text-[10px] font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShortlistModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShortlist}
                disabled={isSavingShortlist}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/25 flex items-center gap-2 cursor-pointer transition"
              >
                {isSavingShortlist ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm &amp; Save Shortlist ({shortlistedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT / PDF REPORT CONTAINER WITH TEAM MAVERICKS WATERMARK (14% Opacity on Every Page) */}
      <div id="mindsaga-printable-report" className="hidden print:block text-black bg-white p-6 font-sans">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm 8mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body > * {
              display: none !important;
            }
            #root, #root > * {
              display: block !important;
            }
            header, nav, aside, .no-print, button {
              display: none !important;
            }
            #mindsaga-printable-report {
              display: block !important;
              position: static !important;
              width: 100% !important;
            }
            .print-watermark-fixed {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 520px !important;
              height: 520px !important;
              opacity: 0.14 !important;
              pointer-events: none !important;
              z-index: 0 !important;
              display: block !important;
            }
            .print-table thead {
              display: table-header-group !important;
            }
            .print-table tr {
              page-break-inside: avoid !important;
            }
          }
        ` }} />

        {/* Fixed Watermark repeating on every printed/PDF page */}
        <div
          className="print-watermark-fixed"
          style={{
            backgroundImage: `url('${MAVERICKS_LOGO_BASE64}')`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain',
            opacity: 0.14
          }}
        />

        <div className="relative z-10 space-y-4">
          {/* Print Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <img
                src={MAVERICKS_LOGO_BASE64}
                alt="Team Mavericks Logo"
                className="w-14 h-14 object-contain"
              />
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  TEAM MAVERICKS • MIND SAGA EVALUATION LEDGER
                </h1>
                <p className="text-xs text-slate-700 font-medium">
                  {overviewData?.sub_event?.name || 'Mind Saga Assessment'} • Certified Multi-Round Scorecard & Telemetry
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600 font-mono">
              <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Total Candidates:</strong> {leaderboard.length}</div>
              <div><strong>Formula:</strong> R1 ({configForm.round1_weight}%) + R2 ({configForm.round2_weight}%) + R3 ({configForm.round3_weight}%)</div>
            </div>
          </div>

          {/* Print Table */}
          <table className="print-table w-full border-collapse text-left text-xs bg-white/90">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-[10px] uppercase font-bold text-slate-800">
                <th className="p-2 border border-slate-300 text-center w-8">#</th>
                <th className="p-2 border border-slate-300">Participant &amp; Identification</th>
                <th className="p-2 border border-slate-300">Contact</th>
                <th className="p-2 border border-slate-300 text-center">Access Key</th>
                <th className="p-2 border border-slate-300 text-center">Round 1 Aptitude</th>
                <th className="p-2 border border-slate-300 text-center">Round 2 Gaming</th>
                <th className="p-2 border border-slate-300 text-center">Round 3 Interview</th>
                <th className="p-2 border border-slate-300 text-center font-bold">Final Weighted</th>
                <th className="p-2 border border-slate-300 text-center">Stage</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((cand, idx) => (
                <tr key={cand.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-200 text-center font-bold">#{idx + 1}</td>
                  <td className="p-2 border border-slate-200">
                    <div className="font-bold text-slate-900">{cand.full_name}</div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      {cand.prn ? `PRN: ${cand.prn}` : `Reg ID #${cand.registration_id}`}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 font-mono text-[11px]">
                    <div>{cand.email}</div>
                    <div className="text-slate-500 text-[10px]">{cand.phone || '—'}</div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-800 text-[11px]">
                    {cand.access_key || '—'}
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span className="font-bold">{Number(cand.round1_score || 0).toFixed(1)}</span> / {cand.round1_max || 50}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Att: {cand.attempts_used_r1 || 0} / {cand.effective_attempts_r1 || 1}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span className="font-bold">{Number(cand.round2_score || 0).toFixed(1)}</span> / {cand.round2_max || 100}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Att: {cand.attempts_used_r2 || 0} / {cand.effective_attempts_r2 || 1}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center">
                    <span className="font-bold">{Number(cand.round3_score || 0).toFixed(1)}</span> / {cand.round3_max || 100}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Limit: {cand.effective_attempts_r3 || 1}
                    </div>
                  </td>
                  <td className="p-2 border border-slate-200 text-center font-black text-slate-900 text-sm bg-slate-50">
                    {Number(cand.final_weighted_score || 0).toFixed(2)}
                  </td>
                  <td className="p-2 border border-slate-200 text-center uppercase font-bold text-[10px]">
                    {cand.qualification_status ? cand.qualification_status.replace(/_/g, ' ') : 'IN ROUND 1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Print Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-300 text-[10px] text-slate-500 font-mono">
            <span>TEAM MAVERICKS ASSESSMENT PLATFORM • ALL RIGHTS RESERVED</span>
            <span>OFFICIAL CERTIFIED SCORE REPORT • WATERMARK PROTECTED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindSagaControlRoomPage;
