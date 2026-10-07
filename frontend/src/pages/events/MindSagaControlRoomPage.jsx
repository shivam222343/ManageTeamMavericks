import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
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
  ExternalLink,
  Lock,
  UserCheck,
  Zap,
  Target,
  Key,
  Mail,
  Copy,
  User
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import DrawingCanvasModal from '../../components/ui/DrawingCanvasModal';

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
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testForm, setTestForm] = useState({
    title: 'Mind Saga Phase 1: Cognitive Aptitude',
    description: '',
    duration_minutes: 30,
    total_marks: 50,
    pass_marks: 20,
    negative_marking_enabled: false,
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

  // Weight Configuration Form
  const [configForm, setConfigForm] = useState({
    round1_weight: 30,
    round2_weight: 30,
    round3_weight: 40,
    sfu_server_url: 'wss://sfu.teammavericks.org',
    require_camera_r1: true,
    require_camera_r2: true,
    max_violations_allowed: 3
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
          round1_weight: parseFloat(res.data.config.round1_weight),
          round2_weight: parseFloat(res.data.config.round2_weight),
          round3_weight: parseFloat(res.data.config.round3_weight),
          sfu_server_url: res.data.config.sfu_server_url || 'wss://sfu.teammavericks.org',
          require_camera_r1: Boolean(res.data.config.require_camera_r1),
          require_camera_r2: Boolean(res.data.config.require_camera_r2),
          max_violations_allowed: res.data.config.max_violations_allowed || 3
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

  // Fetch Live Proctoring Grid
  const fetchProctoring = useCallback(async () => {
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/live?filter=${proctorFilter}`);
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.sessions) ? res.data.sessions : []);
      setProctoringList(data);
    } catch (err) {
      console.error('Failed to fetch proctoring:', err);
      setProctoringList([]);
    }
  }, [eventId, subEventId, proctorFilter]);

  // Fetch Master Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/mind-saga/leaderboard`);
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.leaderboard) ? res.data.leaderboard : []);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setLeaderboard([]);
    }
  }, [eventId, subEventId]);

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
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'aptitude') {
      fetchProctoring();
      const interval = setInterval(fetchProctoring, 10000); // 10s live poll
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchProctoring]);

  useEffect(() => {
    if (activeTab === 'scores') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  useEffect(() => {
    if (tests.length > 0 && !activeTest) {
      loadTestDetail(tests[0].id);
    }
  }, [tests, activeTest]);

  // Handle Save Test
  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/aptitude/tests`, testForm);
      toast.success('Aptitude test created successfully!');
      setTestModalOpen(false);
      fetchOverview(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create test');
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

  // Handle Terminate Session
  const handleTerminateSession = async (sessionId, name) => {
    if (!window.confirm(`Are you sure you want to immediately terminate test session for ${name}?`)) return;
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/proctoring/terminate-session`, {
        session_id: sessionId,
        reason: 'Terminated by proctor admin for anti-cheating violation.'
      });
      toast.success(`Session for ${name} terminated.`);
      fetchProctoring();
    } catch (err) {
      toast.error('Failed to terminate session');
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

  const [sendingEmails, setSendingEmails] = useState(false);
  const [regeneratingKeys, setRegeneratingKeys] = useState(false);
  const [platformStatus, setPlatformStatus] = useState('locked');

  // Handle Platform Status Toggle (Live, Locked, Paused)
  const handleTogglePlatformStatus = async (newStatus) => {
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/mind-saga/platform-status`, {
        status: newStatus
      });
      setPlatformStatus(res.data.platform_status);
      toast.success(res.data.message, { icon: newStatus === 'live' ? '🚀' : '🔒' });
      fetchOverview(true);
    } catch (err) {
      toast.error('Failed to change platform status');
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

  // Handle Regenerate Keys
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

  const handleCopyLink = (url, label = 'Link') => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20 selection:bg-indigo-500/30">
      {/* Header Banner */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/dashboard/events/${eventId}`}
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                title="Back to Event"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6 text-indigo-400" />
                    {overviewData?.sub_event?.name || 'Mind Saga'} Control Room
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    3-Round Module
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Aptitude Test Engine • Pluggable Gaming Hub • Interview Panels • Live CCTV Proctoring
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Platform Status Go Live / Lock Button */}
              {overviewData?.config?.platform_status === 'live' || platformStatus === 'live' ? (
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    PLATFORM LIVE
                  </span>
                  <button
                    onClick={() => handleTogglePlatformStatus('locked')}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Lock Platform
                  </button>
                  <button
                    onClick={() => handleTogglePlatformStatus('paused')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition"
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
                className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Copy public candidate portal link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Public Link</span>
              </button>

              <button
                onClick={() => fetchOverview(true)}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-indigo-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
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
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Registered Participants</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">{overviewData?.total_registered || 0}</div>
                <div className="text-[11px] text-zinc-500 mt-1">Individual participants</div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Active Test Sessions</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">
                  {overviewData?.live_proctor_stats?.active_count || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Taking Aptitude/Gaming now</div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
                  <span>Proctor Warnings</span>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2">
                  {overviewData?.live_proctor_stats?.warning_count || 0}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">1-2 tab/fullscreen warnings</div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
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
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" />
                    Admin Live CCTV & Proctoring Monitor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time video grid & telemetry monitoring participant cameras, screen focus, and violations.
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs">
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
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        proctorFilter === f.id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {proctoringList.map((session) => {
                    const isHighRisk = session.violation_count >= 3;
                    const hasWarning = session.violation_count > 0 && session.violation_count < 3;
                    const isOnline = session.status === 'in_progress' && session.camera_status === 'connected';

                    return (
                      <div
                        key={session.session_id}
                        className={`bg-zinc-950 border rounded-2xl overflow-hidden transition-all hover:border-indigo-500/50 flex flex-col ${
                          isHighRisk ? 'border-red-500/60 ring-1 ring-red-500/30' : hasWarning ? 'border-amber-500/50' : 'border-zinc-800'
                        }`}
                      >
                        {/* Video / Camera simulation tile */}
                        <div className="relative aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden">
                          {session.camera_status === 'connected' ? (
                            <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-zinc-900 to-indigo-950/40 flex flex-col items-center justify-center p-4 text-center relative">
                              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm mb-2 shadow-inner">
                                {session.full_name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="text-xs font-semibold text-white truncate max-w-[90%]">{session.full_name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">WebRTC SFU Feed</span>

                              {/* Live dot */}
                              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-emerald-400 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-red-950/20 flex flex-col items-center justify-center p-4 text-center">
                              <ShieldAlert className="w-8 h-8 text-red-400 mb-1" />
                              <span className="text-xs font-semibold text-red-300">Camera Disconnected</span>
                              <span className="text-[10px] text-zinc-500">Signal lost</span>
                            </div>
                          )}

                          {/* Top right status badge */}
                          <div className="absolute top-2 right-2">
                            {isHighRisk ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white shadow-sm">
                                FLAGGED ({session.violation_count})
                              </span>
                            ) : hasWarning ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-black shadow-sm">
                                {session.violation_count} WARN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {session.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Telemetry info */}
                        <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                          <div>
                            <div className="flex items-center justify-between text-zinc-400">
                              <span>Time Remaining:</span>
                              <span className="font-mono font-semibold text-white">
                                {Math.floor(session.remaining_seconds / 60)}m {session.remaining_seconds % 60}s
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-400 mt-1">
                              <span>Score / Status:</span>
                              <span className="font-semibold text-indigo-400">
                                {session.total_score} pts ({session.percentage}%)
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-900 flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedSessionDetail(session)}
                              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition"
                            >
                              <Eye className="w-3 h-3" /> Inspect Logs
                            </button>
                            {session.status === 'in_progress' && (
                              <button
                                onClick={() => handleTerminateSession(session.session_id, session.full_name)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                                title="Force Terminate Session"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                              </button>
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

        {/* TAB: PARTICIPANT ACCESS KEYS & BROADCAST */}
        {activeTab === 'keys' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
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
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3 text-center">Unique Mind Saga Access Key</th>
                      <th className="p-3 text-center">Qualification Stage</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-zinc-500">
                          No Mind Saga registered candidates found. When users register for this sub-event, their keys appear here.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((cand) => (
                        <tr key={cand.id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-3">
                            <div className="font-semibold text-white">{cand.full_name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">Reg ID #{cand.registration_id}</div>
                          </td>
                          <td className="p-3 font-mono text-zinc-300">{cand.email}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-indigo-500/30">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  Round 1: Online Aptitude Test Management
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage questions, single/multiple choice, AI written evaluation, drawing canvas questions, and test timer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestModalOpen(true)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" /> Create Test
                </button>
                {activeTest?.test && (
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
                )}
              </div>
            </div>

            {/* Active Test Card */}
            {activeTest?.test && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-lg">{activeTest.test.title}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        activeTest.test.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {activeTest.test.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{activeTest.test.description || 'No description provided.'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePublish(activeTest.test.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        activeTest.test.is_published
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {activeTest.test.is_published ? 'Unpublish Test' : 'Publish Test'}
                    </button>
                  </div>
                </div>

                {/* Test Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block">Duration</span>
                    <span className="font-bold text-white text-sm">{activeTest.test.duration_minutes} Mins</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block">Total Marks</span>
                    <span className="font-bold text-indigo-400 text-sm">{activeTest.test.total_marks} Marks</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block">Questions Count</span>
                    <span className="font-bold text-white text-sm">{activeTest.questions?.length || 0} Questions</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block">Negative Marking</span>
                    <span className="font-bold text-white text-sm">
                      {activeTest.test.negative_marking_enabled ? `-${activeTest.test.default_negative_marks}` : 'Disabled'}
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
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                  q.question_type === 'single_choice'
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
                                        className={`p-2 rounded-lg border flex items-center gap-2 ${
                                          isCorrect
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
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-400" />
                  Round 2: Pluggable Gaming Engine
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cognitive reaction and symbol logic puzzles with authoritative server verification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {games.map((g) => (
                <div key={g.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {g.game_key === 'deductive_logic' ? <BrainCircuit className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">{g.title}</h4>
                        <span className="text-[11px] text-zinc-400 font-mono">Key: {g.game_key}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {g.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {g.rules_json?.objective || 'Complete the interactive game challenge within time limit.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block">Duration</span>
                      <span className="font-bold text-white">{g.duration_seconds}s</span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block">Max Score</span>
                      <span className="font-bold text-indigo-400">{g.max_score} pts</span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-zinc-500 block">Total Attempts</span>
                      <span className="font-bold text-white">{g.total_attempts || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ROUND 3 INTERVIEW PANELS (Reusing existing Panel architecture) */}
        {activeTab === 'interview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
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
                <div key={panel.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{panel.name}</h4>
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
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  Mind Saga Multi-Round Master Leaderboard
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Calculated from: Round 1 ({configForm.round1_weight}%) + Round 2 ({configForm.round2_weight}%) + Round 3 ({configForm.round3_weight}%).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPromoteModalOpen(true)}
                  disabled={selectedRegIds.length === 0}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <UserCheck className="w-4 h-4" /> Promote Selected ({selectedRegIds.length})
                </button>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
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
                      <th className="p-3 text-center">R1: Aptitude (30%)</th>
                      <th className="p-3 text-center">R2: Gaming (30%)</th>
                      <th className="p-3 text-center">R3: Interview (40%)</th>
                      <th className="p-3 text-center font-bold text-indigo-400">Final Weighted Score</th>
                      <th className="p-3 text-center">Qualification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-10 text-zinc-500">
                          No evaluation scores recorded yet.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((item, idx) => {
                        const isSelected = selectedRegIds.includes(item.registration_id);
                        return (
                          <tr key={item.id} className={`hover:bg-zinc-900/50 transition ${isSelected ? 'bg-indigo-950/20' : ''}`}>
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
                              <div className="font-semibold text-white">{item.full_name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">{item.email}</div>
                            </td>
                            <td className="p-3 text-center font-mono">
                              {item.round1_score} / {item.round1_max}
                            </td>
                            <td className="p-3 text-center font-mono">
                              {item.round2_score} / {item.round2_max}
                            </td>
                            <td className="p-3 text-center font-mono">
                              {item.round3_score} / {item.round3_max}
                            </td>
                            <td className="p-3 text-center font-bold text-indigo-400 text-sm font-mono">
                              {Number(item.final_weighted_score).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                                item.qualification_status === 'finalist'
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
          <div className="max-w-2xl bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
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
                <span className={`text-sm font-bold ${
                  Number(configForm.round1_weight) + Number(configForm.round2_weight) + Number(configForm.round3_weight) === 100
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}>
                  {Number(configForm.round1_weight) + Number(configForm.round2_weight) + Number(configForm.round3_weight)}%
                </span>
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
                  onChange={(e) => setConfigForm({ ...configForm, max_violations_allowed: e.target.value })}
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

      {/* QUESTION BUILDER MODAL */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">
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
            <h3 className="font-bold text-white text-base">Promote {selectedRegIds.length} Participants</h3>
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

      {/* INSPECT SESSION LOGS DRAWER / MODAL */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-white text-base">{selectedSessionDetail.full_name}</h3>
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
    </div>
  );
};

export default MindSagaControlRoomPage;
