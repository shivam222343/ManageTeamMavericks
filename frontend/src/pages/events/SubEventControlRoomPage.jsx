import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeft,
  Layers,
  Users,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Copy,
  Check,
  Award,
  Sliders,
  Calendar,
  MapPin,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Share2,
  Sparkles,
  Shuffle,
  GraduationCap,
  ChevronRight,
  Search,
  Filter,
  UserPlus,
  Send,
  Eye,
  Key,
  ShieldCheck,
  Settings,
  HelpCircle,
  X,
  ExternalLink,
  Table,
  BarChart3
} from 'lucide-react';

const SubEventControlRoomPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Core State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subEvent, setSubEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [activeRoundId, setActiveRoundId] = useState(null);
  const [activeTab, setActiveTab] = useState('rounds'); // 'rounds' | 'groups' | 'shortlist' | 'panels' | 'evaluations' | 'participants' | 'settings'

  // Tab Data State
  const [groups, setGroups] = useState([]);
  const [panels, setPanels] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [shortlistData, setShortlistData] = useState({ round: null, shortlist: [], total_shortlisted: 0 });
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationGroups, setEvaluationGroups] = useState([]);
  const [evaluationParams, setEvaluationParams] = useState([]);
  const [selectedEvalGroup, setSelectedEvalGroup] = useState(null);
  const [evalGroupSearch, setEvalGroupSearch] = useState('');

  // Modals State
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({ name: '', venue: 'CSBS Department | Kitcoek', round_type: 'elimination', shortlist_target: '', description: '' });

  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [panelForm, setPanelForm] = useState({
    name: 'Panel A',
    venue: 'Hall 1',
    instructions: 'Special instructions for judges...',
    judges: [{ name: 'Judge 1', email: 'judge@example.com', access_code: 'AUTO', phone: '' }],
    evaluation_parameters: [
      { name: 'Content & Articulation', max_marks: 10, weightage: 1 },
      { name: 'Presentation & Delivery', max_marks: 10, weightage: 1 },
      { name: 'Teamwork & Rebuttal', max_marks: 10, weightage: 1 }
    ]
  });

  const [assignGroupModal, setAssignGroupModal] = useState({ isOpen: false, panel: null, selectedGroupIds: [] });
  const [autoGroupModalOpen, setAutoGroupModalOpen] = useState(false);
  const [autoGroupForm, setAutoGroupForm] = useState({ capacity: 4, strategy: 'year_based', only_present: true, group_prefix: 'Group' });

  const [manualGroupModalOpen, setManualGroupModalOpen] = useState(false);
  const [manualGroupForm, setManualGroupForm] = useState({ name: '', topic: '', registration_ids: [] });

  const [spotParticipantModalOpen, setSpotParticipantModalOpen] = useState(false);
  const [spotForm, setSpotForm] = useState({ full_name: '', email: '', phone: '', year: 'First Year (FY)', department: 'CSE', college: "KIT's CoEK" });

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedPromoteIds, setSelectedPromoteIds] = useState([]);
  const [targetRoundId, setTargetRoundId] = useState('');

  const [copiedCode, setCopiedCode] = useState(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantYearFilter, setParticipantYearFilter] = useState('ALL');

  // Sub-event Settings Form
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    type: 'individual',
    min_team_size: 1,
    max_team_size: 1,
    fee: 0,
    max_participants: '',
    registration_status: 'open',
    description: '',
    rules: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Initial Data Load
  const fetchControlRoom = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/control-room`);
      const data = res.data;
      setSubEvent(data.sub_event);
      setRounds(data.rounds || []);

      if (data.sub_event) {
        setSettingsForm({
          name: data.sub_event.name || '',
          type: data.sub_event.type || 'individual',
          min_team_size: data.sub_event.min_team_size || 1,
          max_team_size: data.sub_event.max_team_size || 1,
          fee: data.sub_event.fee || 0,
          max_participants: data.sub_event.max_participants || '',
          registration_status: data.sub_event.registration_status || 'open',
          description: data.sub_event.description || '',
          rules: data.sub_event.rules || ''
        });
      }

      // Default active round if none selected
      if (!activeRoundId && data.rounds && data.rounds.length > 0) {
        // Pick ongoing round or first round
        const ongoing = data.rounds.find((r) => r.status === 'ongoing') || data.rounds[0];
        setActiveRoundId(ongoing.id);
      }
    } catch (err) {
      toast.error('Failed to load sub-event control room');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [eventId, subEventId, activeRoundId]);

  const isFetchingTabRef = useRef(false);

  // Fetch Tab Specific Data
  const fetchTabData = useCallback(async () => {
    if (!subEventId || !activeRoundId) return;
    if (isFetchingTabRef.current) return;
    isFetchingTabRef.current = true;
    try {
      setRefreshing(true);
      if (activeTab === 'groups') {
        const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/groups?round_id=${activeRoundId}`);
        setGroups(res.data || []);
      } else if (activeTab === 'panels') {
        const [panelsRes, groupsRes] = await Promise.all([
          axios.get(`/events/${eventId}/sub-events/${subEventId}/panels?round_id=${activeRoundId}`),
          axios.get(`/events/${eventId}/sub-events/${subEventId}/groups?round_id=${activeRoundId}`)
        ]);
        setPanels(panelsRes.data || []);
        setGroups(groupsRes.data || []);
      } else if (activeTab === 'shortlist') {
        const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/shortlist?round_id=${activeRoundId}`);
        setShortlistData(res.data || { round: null, shortlist: [], total_shortlisted: 0 });
      } else if (activeTab === 'evaluations') {
        const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/evaluations?round_id=${activeRoundId}`);
        const data = res.data || {};
        setEvaluationGroups(data.groups || []);
        setEvaluationParams(data.parameters || []);
        setEvaluations(data.groups || []);
      } else if (activeTab === 'participants') {
        const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/participants?round_id=${activeRoundId}`);
        setParticipants(res.data || []);
      }
    } catch (err) {
      console.error('Failed to refresh tab data', err);
    } finally {
      setRefreshing(false);
      isFetchingTabRef.current = false;
    }
  }, [eventId, subEventId, activeRoundId, activeTab]);

  useEffect(() => {
    fetchControlRoom();
  }, [fetchControlRoom]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Real-time polling every 5 seconds for Panels and Evaluations
  useEffect(() => {
    if (activeTab === 'panels' || activeTab === 'evaluations' || activeTab === 'groups') {
      const interval = setInterval(() => {
        fetchTabData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchTabData]);

  // Copy helper
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Access code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Create Round
  const handleCreateRound = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/rounds`, roundForm);
      toast.success('Round created successfully!');
      setCreateRoundOpen(false);
      setRoundForm({ name: '', venue: 'CSBS Department | Kitcoek', round_type: 'elimination', shortlist_target: '', description: '' });
      fetchControlRoom(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create round');
    }
  };

  // Update Round Status
  const handleUpdateRoundStatus = async (roundId, newStatus) => {
    try {
      await axios.put(`/events/${eventId}/sub-events/${subEventId}/rounds/${roundId}`, { status: newStatus });
      toast.success(`Round status updated to ${newStatus}`);
      fetchControlRoom(true);
    } catch (err) {
      toast.error('Failed to update round status');
    }
  };

  // Delete Round
  const handleDeleteRound = async (roundId, roundName) => {
    if (!window.confirm(`Are you sure you want to delete "${roundName}"? All groups, panels, and evaluations for this round will also be removed.`)) return;
    try {
      await axios.delete(`/events/${eventId}/sub-events/${subEventId}/rounds/${roundId}`);
      toast.success(`Round "${roundName}" deleted successfully`);
      if (activeRoundId === roundId) {
        const remaining = rounds.filter((r) => r.id !== roundId);
        setActiveRoundId(remaining.length > 0 ? remaining[0].id : null);
      }
      fetchControlRoom(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete round');
    }
  };

  // Auto Grouping
  const handleAutoGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/groups/auto-generate`, {
        round_id: activeRoundId,
        ...autoGroupForm
      });
      toast.success(`Generated ${res.data.groups_created} groups (${res.data.participants_grouped} participants grouped)!`);
      setAutoGroupModalOpen(false);
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate groups');
    }
  };

  // Manual Group Creation
  const handleCreateManualGroup = async (e) => {
    e.preventDefault();
    if (!manualGroupForm.name) {
      toast.error('Please enter a group name');
      return;
    }
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/groups`, {
        round_id: activeRoundId,
        ...manualGroupForm
      });
      toast.success(`Group ${manualGroupForm.name} created!`);
      setManualGroupModalOpen(false);
      setManualGroupForm({ name: '', topic: '', registration_ids: [] });
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to remove this group? Members will become available again.')) return;
    try {
      await axios.delete(`/events/${eventId}/sub-events/${subEventId}/groups/${groupId}`);
      toast.success('Group removed');
      fetchTabData();
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  // Create Panel
  const handleCreatePanel = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/panels`, {
        round_id: activeRoundId,
        ...panelForm
      });
      toast.success(`Panel ${panelForm.name} created with judging access codes!`);
      setCreatePanelOpen(false);
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create panel');
    }
  };

  // Assign Groups to Panel in Real-time
  const handleAssignGroups = async (panelId, groupIds) => {
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/panels/${panelId}/assign-group`, {
        group_ids: groupIds
      });
      toast.success('Assigned groups queue updated in real-time!');
      setAssignGroupModal({ isOpen: false, panel: null, selectedGroupIds: [] });
      fetchTabData();
    } catch (err) {
      toast.error('Failed to assign groups');
    }
  };

  // Regenerate Judge Codes
  const handleRegenerateCodes = async (panelId) => {
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/panels/${panelId}/regenerate-codes`);
      toast.success('Regenerated judge access codes!');
      fetchTabData();
    } catch (err) {
      toast.error('Failed to regenerate codes');
    }
  };

  // Delete Panel
  const handleDeletePanel = async (panelId) => {
    if (!window.confirm('Delete this panel? Associated judges will lose access.')) return;
    try {
      await axios.delete(`/events/${eventId}/sub-events/${subEventId}/panels/${panelId}`);
      toast.success('Panel removed');
      fetchTabData();
    } catch (err) {
      toast.error('Failed to delete panel');
    }
  };

  // Add Spot Participant
  const handleAddSpotParticipant = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/participants`, spotForm);
      toast.success(res.data.message || 'Spot participant added and marked present!');
      setSpotParticipantModalOpen(false);
      setSpotForm({ full_name: '', email: '', phone: '', year: 'First Year (FY)', department: 'CSE', college: "KIT's CoEK" });
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add spot participant');
    }
  };

  // Promote Shortlist
  const handlePromoteShortlist = async (e) => {
    e.preventDefault();
    if (selectedPromoteIds.length === 0) {
      toast.error('Please select at least one participant to shortlist');
      return;
    }
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/shortlist/promote`, {
        current_round_id: activeRoundId,
        next_round_id: targetRoundId || null,
        registration_ids: selectedPromoteIds
      });
      toast.success(`${selectedPromoteIds.length} participants shortlisted!`);
      setPromoteModalOpen(false);
      setSelectedPromoteIds([]);
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to promote shortlist');
    }
  };

  // Save Subevent Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await axios.put(`/events/${eventId}/sub-events/${subEventId}`, settingsForm);
      toast.success('Sub-event settings updated successfully!');
      fetchControlRoom(true);
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Export CSV Helper
  const handleExportCSV = (filename, headers, rows) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}.csv`);
  };

  // Export HTML Print helper
  const handleExportHTML = (title, htmlBody) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 4px; }
          p { font-size: 12px; color: #666; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f4f4f5; font-weight: bold; }
          .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>${title} - Team Mavericks</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        ${htmlBody}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchSearch =
        p.full_name?.toLowerCase().includes(participantSearch.toLowerCase()) ||
        p.email?.toLowerCase().includes(participantSearch.toLowerCase()) ||
        p.registration_token?.toLowerCase().includes(participantSearch.toLowerCase()) ||
        p.phone?.includes(participantSearch);

      const matchYear =
        participantYearFilter === 'ALL' ||
        (participantYearFilter === 'FY' && p.year?.includes('First')) ||
        (participantYearFilter === 'SY' && p.year?.includes('Second')) ||
        (participantYearFilter === 'TY' && p.year?.includes('Third')) ||
        (participantYearFilter === 'B.Tech' && (p.year?.includes('B.Tech') || p.year?.includes('Last') || p.year?.includes('Final')));

      return matchSearch && matchYear;
    });
  }, [participants, participantSearch, participantYearFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  const activeRound = rounds.find((r) => r.id === activeRoundId) || rounds[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* --- HEADER --- */}
      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/dashboard/events/${eventId}`}
              className="p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-zinc-700 dark:text-zinc-300 shrink-0"
              title="Back to Event Overview"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                  {subEvent?.name || 'Sub-Event'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {subEvent?.type || 'INDIVIDUAL'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {subEvent?.registration_status === 'closed' ? 'CLOSED' : 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Control Room &amp; Round Management • {subEvent?.event_name || 'Verbafest'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/judge-login"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-primary-blue text-xs font-bold uppercase tracking-wider transition"
            >
              <ExternalLink size={13} />
              <span>Judge Portal</span>
            </Link>

            <button
              onClick={() => fetchTabData()}
              disabled={refreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary-blue' : ''} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* --- ROUND SELECTOR STRIP --- */}
        <div className="mt-5 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1">Managing Round:</span>
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoundId(r.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border ${
                activeRoundId === r.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20 font-black'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span>
                Round {r.round_number}: {r.name}
              </span>
              {r.status === 'completed' && <CheckCircle2 size={12} className="text-emerald-300" />}
              {r.status === 'ongoing' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          ))}

          <button
            onClick={() => setCreateRoundOpen(true)}
            className="p-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-purple-500 text-zinc-500 hover:text-purple-500 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            title="Add New Round"
          >
            <Plus size={14} />
            <span className="text-[11px]">Add Round</span>
          </button>
        </div>
      </div>

      {/* --- NAVIGATION TABS --- */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider">
        {[
          { id: 'rounds', label: 'Rounds', icon: Calendar },
          { id: 'groups', label: 'Groups', icon: Users },
          { id: 'shortlist', label: 'Shortlist', icon: Award },
          { id: 'panels', label: 'Panels', icon: ShieldCheck },
          { id: 'evaluations', label: 'Evaluations', icon: BarChart3 },
          { id: 'participants', label: 'Participants', icon: UserPlus },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl border-b-2 transition cursor-pointer shrink-0 ${
                isActive
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-black'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ROUNDS */}
      {/* ========================================================= */}
      {activeTab === 'rounds' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Event Rounds &amp; Progression
              </h2>
              <p className="text-xs text-zinc-500">
                Configure elimination stages, shortlist limits, and round completion workflows.
              </p>
            </div>
            <button
              onClick={() => setCreateRoundOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition cursor-pointer shadow-md shadow-primary-blue/20"
            >
              <Plus size={14} />
              <span>Create Round</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rounds.map((r) => {
              const isCurrent = activeRoundId === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-3xl border p-6 transition flex flex-col justify-between space-y-5 relative overflow-hidden ${
                    isCurrent
                      ? 'bg-white dark:bg-zinc-900 border-purple-500 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/20'
                      : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-base flex items-center justify-center border border-purple-500/20">
                        {r.round_number}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={r.status}
                          onChange={(e) => handleUpdateRoundStatus(r.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer outline-none ${
                            r.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : r.status === 'ongoing'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-black'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <option value="pending" className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">Pending</option>
                          <option value="ongoing" className="bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 font-bold">Ongoing / Start</option>
                          <option value="completed" className="bg-white dark:bg-zinc-900 text-emerald-500 font-bold">Completed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteRound(r.id, r.name)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete this round"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                        {r.name}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin size={13} className="text-rose-500" />
                        <span>{r.venue || 'Venue TBD'}</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-zinc-400">Shortlist Target:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {r.shortlist_target ? `${r.shortlist_target} Shortlisted` : 'Open / All'}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-zinc-400">Round Type:</span>
                        <span className="font-bold uppercase text-zinc-700 dark:text-zinc-300">{r.round_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveRoundId(r.id);
                          setActiveTab('shortlist');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm text-center"
                      >
                        Manage Shortlist
                      </button>

                      {r.status !== 'completed' ? (
                        <button
                          onClick={() => handleUpdateRoundStatus(r.id, r.status === 'ongoing' ? 'completed' : 'ongoing')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                          title={r.status === 'ongoing' ? 'Mark Completed' : 'Start Round'}
                        >
                          <Play size={12} />
                          <span>{r.status === 'ongoing' ? 'Finish' : 'Start'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateRoundStatus(r.id, 'ongoing')}
                          className="px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                          title="Reopen Round"
                        >
                          Reopen
                        </button>
                      )}
                    </div>

                    {/* Export Tools (CSV, HTML, PDF) */}
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-500 pt-1">
                      <span>Exports:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/shortlist?round_id=${r.id}`);
                            const list = res.data?.shortlist || [];
                            handleExportCSV(
                              `${subEvent?.name}_${r.name}_results`,
                              ['Rank', 'Name', 'Email', 'Phone', 'Group', 'Score', 'Status'],
                              list.map((x) => [x.rank, x.full_name, x.email, x.phone, x.group_name, x.total_score, x.status])
                            );
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          CSV
                        </button>
                        <button
                          onClick={async () => {
                            const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/shortlist?round_id=${r.id}`);
                            const list = res.data?.shortlist || [];
                            const html = `
                              <table>
                                <tr><th>Rank</th><th>Participant</th><th>Group</th><th>Score</th><th>Status</th></tr>
                                ${list
                                  .map(
                                    (x) =>
                                      `<tr><td>#${x.rank}</td><td><strong>${x.full_name}</strong><br/>${x.email}</td><td>${x.group_name || 'N/A'}</td><td>${x.total_score}</td><td>${x.status}</td></tr>`
                                  )
                                  .join('')}
                              </table>
                            `;
                            handleExportHTML(`${subEvent?.name} - ${r.name} Leaderboard`, html);
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          HTML
                        </button>
                        <button
                          onClick={async () => {
                            const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/shortlist?round_id=${r.id}`);
                            const list = res.data?.shortlist || [];
                            const html = `
                              <table>
                                <tr><th>Rank</th><th>Participant</th><th>Group</th><th>Score</th><th>Status</th></tr>
                                ${list
                                  .map(
                                    (x) =>
                                      `<tr><td>#${x.rank}</td><td><strong>${x.full_name}</strong></td><td>${x.group_name || 'N/A'}</td><td><strong>${x.total_score} pts</strong></td><td>${x.status}</td></tr>`
                                  )
                                  .join('')}
                              </table>
                            `;
                            handleExportHTML(`${subEvent?.name} - ${r.name} Official Shortlist`, html);
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GROUPS */}
      {/* ========================================================= */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Group Formations • {activeRound?.name}
              </h2>
              <p className="text-xs text-zinc-500">
                Form balanced candidate groups manually or automatically using Year-based diversity algorithm.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  navigate(
                    `/dashboard/events/${eventId}/sub-events/${subEventId}/auto-group${
                      activeRoundId ? `?round_id=${activeRoundId}` : ''
                    }`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Shuffle size={14} />
                <span>Auto Group Candidates</span>
              </button>

              <button
                onClick={() =>
                  navigate(
                    `/dashboard/events/${eventId}/sub-events/${subEventId}/create-group${
                      activeRoundId ? `?round_id=${activeRoundId}` : ''
                    }`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 space-y-4">
              <Users size={36} className="mx-auto text-zinc-400" />
              <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">No Groups Formed for {activeRound?.name}</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Form balanced candidate groups automatically using smart Year-based diversity with auto-fallback, or manually customize your groups.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() =>
                    navigate(
                      `/dashboard/events/${eventId}/sub-events/${subEventId}/auto-group${
                        activeRoundId ? `?round_id=${activeRoundId}` : ''
                      }`
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-purple-600/20"
                >
                  <Shuffle size={14} />
                  <span>Launch Auto Grouping</span>
                </button>
                <button
                  onClick={() =>
                    navigate(
                      `/dashboard/events/${eventId}/sub-events/${subEventId}/create-group${
                        activeRoundId ? `?round_id=${activeRoundId}` : ''
                      }`
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Manual Group</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g) => {
                const isAssigned = Boolean(g.panel_id);
                return (
                  <div
                    key={g.id}
                    className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-black uppercase text-purple-600 dark:text-purple-400">
                            {activeRound?.name}
                          </span>
                          <h4 className="text-lg font-black uppercase text-zinc-900 dark:text-white">{g.name}</h4>
                          {g.topic && <p className="text-xs text-zinc-500 italic mt-0.5">Topic: {g.topic}</p>}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                            g.status === 'evaluated'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : isAssigned
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {isAssigned ? `📍 ${g.panel_name || 'Assigned'}` : 'Unassigned'}
                        </span>
                      </div>

                      {/* Member list */}
                      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400">
                          <span>Members ({g.members?.length || 0})</span>
                          <span>Year</span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {g.members?.map((m) => (
                            <div
                              key={m.id}
                              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="truncate">
                                <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{m.participant_name}</p>
                                <p className="text-[10px] font-mono text-zinc-400">{m.registration_token}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                {m.year || 'FY'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Disband Group</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SHORTLIST */}
      {/* ========================================================= */}
      {activeTab === 'shortlist' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                  Shortlist &amp; Elimination Leaderboard • {activeRound?.name}
                </h2>
                {activeRound?.shortlist_target && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Target: ~{activeRound.shortlist_target} (Reference Guidance)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review judge scores, ranks, and promote selected candidates to the next round. Target is for reference; admins can select and shortlist any candidate regardless of initial scoring.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeRound?.shortlist_target && shortlistData.shortlist?.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const topTarget = shortlistData.shortlist.slice(0, activeRound.shortlist_target);
                    setSelectedPromoteIds(topTarget.map((x) => x.registration_id));
                    toast.success(`Selected top ${topTarget.length} candidates according to rank`);
                  }}
                  className="px-3.5 py-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/20 transition cursor-pointer"
                >
                  <span>★ Select Top {activeRound.shortlist_target}</span>
                </button>
              )}

              <button
                onClick={() => setPromoteModalOpen(true)}
                disabled={selectedPromoteIds.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-40"
              >
                <Award size={14} />
                <span>Shortlist Selected ({selectedPromoteIds.length})</span>
              </button>

              <button
                onClick={() => {
                  const list = shortlistData.shortlist || [];
                  handleExportCSV(
                    `${subEvent?.name}_${activeRound?.name}_Leaderboard`,
                    ['Rank', 'Name', 'Email', 'Phone', 'Group', 'Score', 'Status'],
                    list.map((x) => [x.rank, x.full_name, x.email, x.phone, x.group_name, x.total_score, x.status])
                  );
                }}
                className="p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Export CSV"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-[11px] text-zinc-500 uppercase">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPromoteIds(shortlistData.shortlist.map((x) => x.registration_id));
                          } else {
                            setSelectedPromoteIds([]);
                          }
                        }}
                        checked={
                          shortlistData.shortlist.length > 0 &&
                          selectedPromoteIds.length === shortlistData.shortlist.length
                        }
                      />
                    </th>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Participant</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">Total Score</th>
                    <th className="p-4">Evaluations</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {shortlistData.shortlist.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-zinc-400">
                        No evaluated candidates found for {activeRound?.name} yet.
                      </td>
                    </tr>
                  ) : (
                    shortlistData.shortlist.map((row) => {
                      const isSelected = selectedPromoteIds.includes(row.registration_id);
                      return (
                        <tr
                          key={row.registration_id}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition ${
                            isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPromoteIds([...selectedPromoteIds, row.registration_id]);
                                } else {
                                  setSelectedPromoteIds(selectedPromoteIds.filter((id) => id !== row.registration_id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-4 font-mono font-black text-sm">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                row.rank === 1
                                  ? 'bg-yellow-500/20 text-yellow-500 font-black'
                                  : row.rank === 2
                                  ? 'bg-slate-300/30 text-slate-400 font-black'
                                  : row.rank === 3
                                  ? 'bg-amber-600/20 text-amber-600 font-black'
                                  : 'text-zinc-500'
                              }`}
                            >
                              #{row.rank}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-zinc-900 dark:text-white">{row.full_name}</p>
                            <p className="text-[11px] text-zinc-400 font-mono">{row.email}</p>
                          </td>
                          <td className="p-4 font-bold text-zinc-700 dark:text-zinc-300">
                            {row.group_name || 'Solo'}
                          </td>
                          <td className="p-4 font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                            {row.total_score.toFixed(1)} pts
                          </td>
                          <td className="p-4 font-mono text-zinc-500">
                            {row.judges_evaluated} Judge(s)
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                  row.status === 'shortlisted' || row.is_promoted
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {row.status === 'shortlisted' || row.is_promoted ? '★ SHORTLISTED' : 'PENDING'}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelected) {
                                    setSelectedPromoteIds(selectedPromoteIds.filter((id) => id !== row.registration_id));
                                  } else {
                                    setSelectedPromoteIds([...selectedPromoteIds, row.registration_id]);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                }`}
                              >
                                {isSelected ? 'Selected' : '+ Select'}
                              </button>
                            </div>
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

      {/* ========================================================= */}
      {/* TAB 4: PANELS (Matching User's Screenshot Exactly!) */}
      {/* ========================================================= */}
      {activeTab === 'panels' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Panel Management
              </h2>
              <p className="text-xs text-zinc-500">
                Manage judges, evaluation criteria, and group assignments
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={activeRoundId || ''}
                onChange={(e) => setActiveRoundId(parseInt(e.target.value))}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase cursor-pointer"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => fetchTabData()}
                className="px-4 py-2 rounded-xl border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setCreatePanelOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Plus size={14} />
                <span>Create Panel</span>
              </button>
            </div>
          </div>

          {panels.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 space-y-3">
              <ShieldCheck size={36} className="mx-auto text-zinc-400" />
              <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">No Panels Created for this Sub-Event</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Create judging panels (e.g. Panel 1, Panel 2) with custom evaluation criteria and access codes for judges. Panels are accessible across all rounds.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {panels.map((p) => {
                const assignedGroups = p.assigned_groups || [];
                const isBusy = p.is_busy;
                const statusLabel = isBusy
                  ? `• BUSY (EVALUATING ${p.evaluating_group_name?.toUpperCase() || 'GROUP'})`
                  : '• AVAILABLE';

                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Row: Panel Title + Status Pill + Edit/Delete */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                              {p.name}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider ${
                                isBusy
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">Panel #{p.panel_number}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setPanelForm({
                                name: p.name,
                                venue: p.venue,
                                instructions: p.instructions || '',
                                judges: p.judges || [],
                                evaluation_parameters: p.parameters || []
                              });
                              setCreatePanelOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                            title="Edit Panel"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePanel(p.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Panel"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Venue Pin */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
                        <MapPin size={14} className="text-rose-500 shrink-0" />
                        <span>{p.venue || 'Venue TBD'}</span>
                      </div>

                      {/* Judges Block */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            JUDGES ({p.judges?.length || 0})
                          </span>
                          <button
                            onClick={() => handleRegenerateCodes(p.id)}
                            className="text-purple-600 dark:text-purple-400 hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            <span>Regenerate Codes</span>
                          </button>
                        </div>

                        {p.judges?.map((j) => (
                          <div
                            key={j.id}
                            className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                  {j.name?.charAt(0) || 'M'}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                    {j.name}
                                  </p>
                                  <p className="text-[11px] text-zinc-400 truncate">{j.email || 'No email'}</p>
                                </div>
                              </div>
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            </div>

                            {/* Access Code Box */}
                            <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                              <div>
                                <span className="text-[8px] font-mono font-bold uppercase text-zinc-400 block leading-none">
                                  ACCESS CODE
                                </span>
                                <span className="font-mono font-black text-xs text-purple-600 dark:text-purple-400 tracking-wider">
                                  {j.access_code}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(j.access_code)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                                title="Copy Access Code"
                              >
                                {copiedCode === j.access_code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Groups Section */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-black uppercase text-zinc-700 dark:text-zinc-300 text-[11px]">
                          ASSIGNED GROUPS ({assignedGroups.length})
                        </span>
                        <button
                          onClick={() =>
                            setAssignGroupModal({
                              isOpen: true,
                              panel: p,
                              selectedGroupIds: assignedGroups.map((g) => g.id)
                            })
                          }
                          className="text-purple-600 dark:text-purple-400 hover:underline font-mono font-bold text-[11px] uppercase cursor-pointer"
                        >
                          MANAGE
                        </button>
                      </div>

                      {assignedGroups.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {assignedGroups.map((g) => {
                            const isCurrentlyEvaluating = parseInt(g.id) === parseInt(p.assigned_group_id);
                            return (
                              <span
                                key={g.id}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border transition ${
                                  isCurrentlyEvaluating
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                }`}
                              >
                                {g.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic">No groups assigned yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: EVALUATIONS (Group-Based Matrix View) */}
      {/* ========================================================= */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Group Evaluations Matrix • {activeRound?.name}
              </h2>
              <p className="text-xs text-zinc-500">
                Audit groups evaluated by judges. Click any group to view candidate scoring matrix, judge breakdowns, and comments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search group, topic, or panel..."
                  value={evalGroupSearch}
                  onChange={(e) => setEvalGroupSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Group Cards Grid */}
          {(() => {
            const filteredGroups = evaluationGroups.filter((g) => {
              if (!evalGroupSearch) return true;
              const s = evalGroupSearch.toLowerCase();
              return (
                g.name?.toLowerCase().includes(s) ||
                g.topic?.toLowerCase().includes(s) ||
                g.panel_name?.toLowerCase().includes(s)
              );
            });

            if (filteredGroups.length === 0) {
              return (
                <div className="py-16 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 space-y-2">
                  <BarChart3 size={32} className="mx-auto text-zinc-400" />
                  <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    No Evaluated Groups Found for {activeRound?.name}
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    When judges evaluate candidates from their live portal, evaluation matrices will appear here organized by group.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGroups.map((grp) => {
                  const isEvaluated = grp.status === 'evaluated' || grp.judges_evaluated > 0;
                  const memberCount = grp.members?.length || grp.member_count || 0;

                  return (
                    <div
                      key={grp.id}
                      onClick={() => setSelectedEvalGroup(grp)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 rounded-3xl p-5 transition cursor-pointer flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                              {grp.panel_name ? `${grp.panel_name}` : 'No Panel Assigned'}
                            </span>
                            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                              {grp.name}
                            </h3>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border ${
                              isEvaluated
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            {isEvaluated ? '✓ Evaluated' : 'Pending'}
                          </span>
                        </div>

                        {grp.topic && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic line-clamp-2">
                            "{grp.topic}"
                          </p>
                        )}

                        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-center font-mono">
                          <div>
                            <span className="text-[9px] text-zinc-400 uppercase block">Candidates</span>
                            <span className="text-xs font-black text-zinc-900 dark:text-white">{memberCount}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400 uppercase block">Avg Score</span>
                            <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                              {grp.avg_group_score ? `${grp.avg_group_score.toFixed(1)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-400 uppercase block">Shortlisted</span>
                            <span className="text-xs font-black text-emerald-500">
                              {grp.shortlisted_members_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {grp.judges_evaluated ? `${grp.judges_evaluated} Judge(s) Scored` : 'Awaiting Judge'}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                          <span>View Matrix</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Group Evaluation Matrix Detail Modal */}
          {selectedEvalGroup && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-5xl w-full p-6 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                        {selectedEvalGroup.name} • Candidate Evaluation Matrix
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {selectedEvalGroup.panel_name || 'Panel'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Stage: <strong className="text-zinc-700 dark:text-zinc-300">{activeRound?.name}</strong> • Venue: <span className="font-semibold">{selectedEvalGroup.panel_venue || 'Venue TBD'}</span> • {selectedEvalGroup.members?.length || 0} Candidates
                    </p>
                    {selectedEvalGroup.topic && (
                      <p className="text-xs text-zinc-400 italic mt-1">
                        Topic: "{selectedEvalGroup.topic}"
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvalGroup(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Candidate Matrix Table */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-[11px] text-zinc-500 uppercase">
                          <th className="p-4 min-w-[180px]">Candidate</th>
                          {evaluationParams.map((param) => (
                            <th key={param.id} className="p-4 min-w-[120px] text-center">
                              <div>{param.name}</div>
                              <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold block">
                                Max {param.max_marks || 10}
                              </span>
                            </th>
                          ))}
                          <th className="p-4 text-center min-w-[100px]">Total (pts)</th>
                          <th className="p-4 text-center min-w-[120px]">Shortlist Status</th>
                          <th className="p-4 min-w-[200px]">Judge Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {(!selectedEvalGroup.members || selectedEvalGroup.members.length === 0) ? (
                          <tr>
                            <td colSpan={evaluationParams.length + 4} className="p-8 text-center text-zinc-400">
                              No candidate entries found for this group.
                            </td>
                          </tr>
                        ) : (
                          selectedEvalGroup.members.map((member, idx) => {
                            const isShortlisted = member.shortlist_status === 'shortlisted';

                            return (
                              <tr
                                key={member.registration_id}
                                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition ${
                                  isShortlisted ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                                }`}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center border border-purple-500/20 shrink-0">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="font-bold text-zinc-900 dark:text-white">
                                        {member.participant_name}
                                      </p>
                                      <div className="text-[10px] text-zinc-400 font-mono">
                                        <span>{member.year || 'FY'}</span> • <span>{member.department || 'Engg'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {evaluationParams.map((param) => {
                                  const pBreakdown = (member.parameter_breakdown || []).find(
                                    (pb) => pb.parameter_id === param.id
                                  );
                                  const avgVal = pBreakdown?.avg_marks;

                                  return (
                                    <td key={param.id} className="p-3 text-center font-mono">
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                        {avgVal !== null && avgVal !== undefined ? avgVal.toFixed(1) : '—'}
                                      </span>
                                      {pBreakdown?.judge_scores && pBreakdown.judge_scores.length > 1 && (
                                        <span className="text-[9px] text-zinc-400 block" title={pBreakdown.judge_scores.map(js => `${js.judge_name}: ${js.marks}`).join(', ')}>
                                          ({pBreakdown.judge_scores.length} judges avg)
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}

                                <td className="p-4 text-center font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                                  {member.total_score ? member.total_score.toFixed(1) : '0.0'}
                                </td>

                                <td className="p-4 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                      isShortlisted
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-black'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                                    }`}
                                  >
                                    {isShortlisted ? '★ Shortlisted' : 'Standard'}
                                  </span>
                                </td>

                                <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400 italic">
                                  {member.feedback_comments || '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-zinc-400 font-mono">
                    Group Avg Score: <strong className="text-purple-600 dark:text-purple-400">{selectedEvalGroup.avg_group_score?.toFixed(1) || '0.0'} pts</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCSV(
                          `${selectedEvalGroup.name}_evaluation_matrix`,
                          ['Candidate', 'Year', 'Dept', ...evaluationParams.map(p => p.name), 'Total Score', 'Shortlist Status', 'Remarks'],
                          (selectedEvalGroup.members || []).map(m => [
                            m.participant_name,
                            m.year,
                            m.department,
                            ...evaluationParams.map(p => {
                              const pb = (m.parameter_breakdown || []).find(x => x.parameter_id === p.id);
                              return pb?.avg_marks ?? '';
                            }),
                            m.total_score,
                            m.shortlist_status,
                            m.feedback_comments
                          ])
                        );
                      }}
                      className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      <span>Export Matrix (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEvalGroup(null)}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: PARTICIPANTS */}
      {/* ========================================================= */}
      {activeTab === 'participants' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Participants &amp; Spot Registrations
              </h2>
              <p className="text-xs text-zinc-500">
                Filter by attendance, year, and group availability. Add walk-in spot entries with one click.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSpotParticipantModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <UserPlus size={14} />
                <span>Add Participant New Entry</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search by name, email, phone, token..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {['ALL', 'FY', 'SY', 'TY', 'B.Tech'].map((y) => (
                <button
                  key={y}
                  onClick={() => setParticipantYearFilter(y)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer border ${
                    participantYearFilter === y
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-[11px] text-zinc-500 uppercase">
                    <th className="p-4">Attendee</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Year &amp; Dept</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Group Status</th>
                    <th className="p-4">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-zinc-400">
                        No matching participants found.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => {
                      const isPresent = p.sub_attendance === 1;
                      const isInGroup = Boolean(p.group);
                      return (
                        <tr key={p.registration_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                          <td className="p-4">
                            <p className="font-bold text-zinc-900 dark:text-white">{p.full_name}</p>
                            <span className="font-mono text-[10px] text-zinc-400">{p.registration_token}</span>
                          </td>
                          <td className="p-4 font-mono text-zinc-600 dark:text-zinc-400">
                            <p>{p.email}</p>
                            <p className="text-[11px] text-zinc-500">{p.phone}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mr-1.5">
                              {p.year}
                            </span>
                            <span className="text-zinc-500 text-[11px]">{p.department}</span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                isPresent
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}
                            >
                              {isPresent ? '✓ Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-zinc-700 dark:text-zinc-300">
                            {isInGroup ? (
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {p.group.group_name} {p.group.panel_name && `(${p.group.panel_name})`}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">Not grouped</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                                !isPresent
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                                  : isInGroup
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-emerald-500/10 text-emerald-500 font-black'
                              }`}
                            >
                              {!isPresent ? 'Absent' : isInGroup ? 'In Group' : '● Available'}
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

      {/* ========================================================= */}
      {/* TAB 7: SETTINGS */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Sub-Event Configuration &amp; Rules
              </h2>
              <p className="text-xs text-zinc-500">Manage pricing, capacity, and participation constraints.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Sub-Event Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Competition Type
                  </label>
                  <select
                    value={settingsForm.type}
                    onChange={(e) => setSettingsForm({ ...settingsForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  >
                    <option value="individual">Individual Entry</option>
                    <option value="group">Group Discussion / Team Track</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.fee}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fee: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Max Participant Limit
                  </label>
                  <input
                    type="number"
                    value={settingsForm.max_participants}
                    onChange={(e) => setSettingsForm({ ...settingsForm, max_participants: e.target.value })}
                    placeholder="Unlimited if empty"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Registration Status
                  </label>
                  <select
                    value={settingsForm.registration_status}
                    onChange={(e) => setSettingsForm({ ...settingsForm, registration_status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  >
                    <option value="open">Open for Registration</option>
                    <option value="closed">Closed / Locked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Rules &amp; Competition Format
                </label>
                <textarea
                  rows="4"
                  value={settingsForm.rules}
                  onChange={(e) => setSettingsForm({ ...settingsForm, rules: e.target.value })}
                  placeholder="Outline the rules, round formats, speaking durations, and code of conduct..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-2xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Sub-Event Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE ROUND */}
      {/* ========================================================= */}
      <AnimatePresence>
        {createRoundOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Create New Round</h3>
                <button onClick={() => setCreateRoundOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Round Name (e.g. Semi Final)
                  </label>
                  <input
                    type="text"
                    required
                    value={roundForm.name}
                    onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Venue / Location
                  </label>
                  <input
                    type="text"
                    value={roundForm.venue}
                    onChange={(e) => setRoundForm({ ...roundForm, venue: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Round Type
                    </label>
                    <select
                      value={roundForm.round_type}
                      onChange={(e) => setRoundForm({ ...roundForm, round_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                    >
                      <option value="elimination">Elimination</option>
                      <option value="points">Points Based</option>
                      <option value="shortlist_limit">Shortlist Target</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Shortlist Target
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 4"
                      value={roundForm.shortlist_target}
                      onChange={(e) => setRoundForm({ ...roundForm, shortlist_target: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateRoundOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                  >
                    Create Round
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: CREATE PANEL (With Judges & Custom Parameters) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {createPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Create New Panel</h3>
                <button onClick={() => setCreatePanelOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePanel} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Panel Name
                    </label>
                    <input
                      type="text"
                      required
                      value={panelForm.name}
                      onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
                      placeholder="e.g. Panel A"
                      className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={panelForm.venue}
                      onChange={(e) => setPanelForm({ ...panelForm, venue: e.target.value })}
                      placeholder="e.g. Hall 1"
                      className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Instructions for Judges
                  </label>
                  <textarea
                    rows="2"
                    value={panelForm.instructions}
                    onChange={(e) => setPanelForm({ ...panelForm, instructions: e.target.value })}
                    placeholder="Special instructions for judges..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                  />
                </div>

                {/* Judges Section */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">
                      Judges
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPanelForm({
                          ...panelForm,
                          judges: [
                            ...panelForm.judges,
                            { name: `Judge ${panelForm.judges.length + 1}`, email: '', access_code: 'AUTO', phone: '' }
                          ]
                        })
                      }
                      className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Judge</span>
                    </button>
                  </div>

                  {panelForm.judges.map((judge, jIdx) => (
                    <div
                      key={jIdx}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs relative"
                    >
                      <div className="flex items-center justify-between font-bold text-zinc-600 dark:text-zinc-400">
                        <span>Judge {jIdx + 1}</span>
                        {panelForm.judges.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPanelForm({
                                ...panelForm,
                                judges: panelForm.judges.filter((_, i) => i !== jIdx)
                              })
                            }
                            className="text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Name (e.g. Dr. John Doe)"
                          value={judge.name}
                          onChange={(e) => {
                            const updated = [...panelForm.judges];
                            updated[jIdx].name = e.target.value;
                            setPanelForm({ ...panelForm, judges: updated });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                        />

                        <input
                          type="email"
                          placeholder="Email (judge@example.com)"
                          value={judge.email}
                          onChange={(e) => {
                            const updated = [...panelForm.judges];
                            updated[jIdx].email = e.target.value;
                            setPanelForm({ ...panelForm, judges: updated });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Access Code (AUTO)"
                          value={judge.access_code}
                          onChange={(e) => {
                            const updated = [...panelForm.judges];
                            updated[jIdx].access_code = e.target.value;
                            setPanelForm({ ...panelForm, judges: updated });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold"
                        />
                        <input
                          type="text"
                          placeholder="Phone (Optional)"
                          value={judge.phone}
                          onChange={(e) => {
                            const updated = [...panelForm.judges];
                            updated[jIdx].phone = e.target.value;
                            setPanelForm({ ...panelForm, judges: updated });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evaluation Parameters */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">
                      Evaluation Parameters
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPanelForm({
                          ...panelForm,
                          evaluation_parameters: [
                            ...panelForm.evaluation_parameters,
                            { name: '', max_marks: 10, weightage: 1 }
                          ]
                        })
                      }
                      className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Parameter</span>
                    </button>
                  </div>

                  {panelForm.evaluation_parameters.map((param, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Parameter Name (e.g. Content)"
                        value={param.name}
                        onChange={(e) => {
                          const updated = [...panelForm.evaluation_parameters];
                          updated[pIdx].name = e.target.value;
                          setPanelForm({ ...panelForm, evaluation_parameters: updated });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                      />
                      <input
                        type="number"
                        placeholder="Max (10)"
                        value={param.max_marks}
                        onChange={(e) => {
                          const updated = [...panelForm.evaluation_parameters];
                          updated[pIdx].max_marks = e.target.value;
                          setPanelForm({ ...panelForm, evaluation_parameters: updated });
                        }}
                        className="w-16 px-2 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-center"
                      />
                      <input
                        type="number"
                        placeholder="Weight (1)"
                        value={param.weightage}
                        onChange={(e) => {
                          const updated = [...panelForm.evaluation_parameters];
                          updated[pIdx].weightage = e.target.value;
                          setPanelForm({ ...panelForm, evaluation_parameters: updated });
                        }}
                        className="w-16 px-2 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-center"
                      />
                      {panelForm.evaluation_parameters.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPanelForm({
                              ...panelForm,
                              evaluation_parameters: panelForm.evaluation_parameters.filter((_, i) => i !== pIdx)
                            })
                          }
                          className="p-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreatePanelOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                  >
                    Create Panel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: ASSIGN GROUPS TO PANEL QUEUE */}
      {/* ========================================================= */}
      <AnimatePresence>
        {assignGroupModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase text-zinc-900 dark:text-white">
                    Manage Groups for {assignGroupModal.panel?.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Select groups to queue for this panel to evaluate in sequence
                  </p>
                </div>
                <button
                  onClick={() => setAssignGroupModal({ isOpen: false, panel: null, selectedGroupIds: [] })}
                  className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(() => {
                  const eligibleGroups = groups.filter((g) => {
                    // Exclude already evaluated groups
                    if (g.status === 'evaluated') return false;
                    // Exclude groups belonging to a different round
                    if (g.round_id && activeRoundId && parseInt(g.round_id) !== parseInt(activeRoundId)) return false;
                    // Exclude groups assigned to ANOTHER panel for this round
                    if (g.panel_id && assignGroupModal.panel?.id && parseInt(g.panel_id) !== parseInt(assignGroupModal.panel?.id)) return false;
                    return true;
                  });

                  if (eligibleGroups.length === 0) {
                    return (
                      <p className="text-xs text-zinc-400 p-6 text-center italic">
                        No pending/unassigned groups available for {activeRound?.name}.
                        <br />
                        <span className="text-[10px] text-zinc-500 block mt-1">
                          (Evaluated groups and groups assigned to other panels are hidden)
                        </span>
                      </p>
                    );
                  }

                  return eligibleGroups.map((g) => {
                    const isSelected = (assignGroupModal.selectedGroupIds || []).includes(g.id);
                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          const cur = assignGroupModal.selectedGroupIds || [];
                          if (isSelected) {
                            setAssignGroupModal({
                              ...assignGroupModal,
                              selectedGroupIds: cur.filter((id) => id !== g.id)
                            });
                          } else {
                            setAssignGroupModal({
                              ...assignGroupModal,
                              selectedGroupIds: [...cur, g.id]
                            });
                          }
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div
                            className="accent-purple-600"
                          />
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{g.name}</p>
                            <span className="text-[10px] font-mono text-zinc-400">{g.member_count || 0} Members</span>
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-purple-600 shrink-0" />}
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAssignGroupModal({ isOpen: false, panel: null, selectedGroupIds: [] })}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAssignGroups(
                      assignGroupModal.panel?.id,
                      assignGroupModal.selectedGroupIds || []
                    )
                  }
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                >
                  Save ({(assignGroupModal.selectedGroupIds || []).length} Groups)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: AUTO GROUP */}
      {/* ========================================================= */}
      <AnimatePresence>
        {autoGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Auto-Group Candidates</h3>
                  <p className="text-xs text-zinc-500">Smart clustering based on group capacity &amp; year</p>
                </div>
                <button onClick={() => setAutoGroupModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAutoGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Group Capacity (Candidates per Group)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={autoGroupForm.capacity}
                    onChange={(e) => setAutoGroupForm({ ...autoGroupForm, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Grouping Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoGroupForm({ ...autoGroupForm, strategy: 'year_based' })}
                      className={`p-3 rounded-2xl border text-left text-xs transition cursor-pointer ${
                        autoGroupForm.strategy === 'year_based'
                          ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span className="font-bold block">Year Based</span>
                      <span className="text-[10px] opacity-75">Distribute FY, SY, TY, B.Tech equally</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAutoGroupForm({ ...autoGroupForm, strategy: 'random' })}
                      className={`p-3 rounded-2xl border text-left text-xs transition cursor-pointer ${
                        autoGroupForm.strategy === 'random'
                          ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span className="font-bold block">Random Shuffle</span>
                      <span className="text-[10px] opacity-75">Pure random distribution</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="onlyPresent"
                    checked={autoGroupForm.only_present}
                    onChange={(e) => setAutoGroupForm({ ...autoGroupForm, only_present: e.target.checked })}
                  />
                  <label htmlFor="onlyPresent" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Only group candidates marked Present
                  </label>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setAutoGroupModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                  >
                    Generate Groups
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: ADD SPOT PARTICIPANT */}
      {/* ========================================================= */}
      <AnimatePresence>
        {spotParticipantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Spot Registration Entry</h3>
                  <p className="text-xs text-zinc-500">Add walk-in participant with instant present attendance</p>
                </div>
                <button onClick={() => setSpotParticipantModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSpotParticipant} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Candidate name"
                    value={spotForm.full_name}
                    onChange={(e) => setSpotForm({ ...spotForm, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={spotForm.email}
                      onChange={(e) => setSpotForm({ ...spotForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={spotForm.phone}
                      onChange={(e) => setSpotForm({ ...spotForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={spotForm.year}
                      onChange={(e) => setSpotForm({ ...spotForm, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                    >
                      <option value="First Year (FY)">First Year (FY)</option>
                      <option value="Second Year (SY)">Second Year (SY)</option>
                      <option value="Third Year (TY)">Third Year (TY)</option>
                      <option value="Last Year (B.Tech)">Last Year (B.Tech)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      placeholder="CSE, IT, Mech..."
                      value={spotForm.department}
                      onChange={(e) => setSpotForm({ ...spotForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setSpotParticipantModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                  >
                    Save &amp; Mark Present
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: PROMOTE SHORTLIST */}
      {/* ========================================================= */}
      <AnimatePresence>
        {promoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase text-zinc-900 dark:text-white">Promote Shortlist</h3>
                  <p className="text-xs text-zinc-500">Shortlist {selectedPromoteIds.length} candidate(s)</p>
                </div>
                <button onClick={() => setPromoteModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePromoteShortlist} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Target Next Round
                  </label>
                  <select
                    value={targetRoundId}
                    onChange={(e) => setTargetRoundId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                  >
                    <option value="">-- No Next Round (Final Shortlist Only) --</option>
                    {rounds
                      .filter((r) => r.id !== activeRoundId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Round {r.round_number}: {r.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setPromoteModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase cursor-pointer shadow-md"
                  >
                    Confirm Shortlist
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubEventControlRoomPage;
