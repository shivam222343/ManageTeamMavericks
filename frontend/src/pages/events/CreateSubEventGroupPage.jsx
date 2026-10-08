import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Layers,
  Sparkles,
  Calendar,
  Check,
  UserCheck
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';

const CreateSubEventGroupPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subEvent, setSubEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [participants, setParticipants] = useState([]);

  // Form state
  const [groupName, setGroupName] = useState('Group 1');
  const [groupTopic, setGroupTopic] = useState('');
  const [selectedRegIds, setSelectedRegIds] = useState([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [onlyPresent, setOnlyPresent] = useState(false);

  const fetchControlData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/events/${eventId}/sub-events/${subEventId}/control-room`);
      setSubEvent(res.data?.sub_event);
      const rList = res.data?.rounds || [];
      setRounds(rList);

      const activeR = rList.find((r) => r.status === 'ongoing') || rList[0];
      if (activeR) {
        setSelectedRoundId(activeR.id);
      }
    } catch (err) {
      toast.error('Failed to load sub-event data');
    } finally {
      setLoading(false);
    }
  }, [eventId, subEventId]);

  const fetchParticipants = useCallback(async () => {
    if (!selectedRoundId) return;
    try {
      const res = await axios.get(
        `/events/${eventId}/sub-events/${subEventId}/participants?round_id=${selectedRoundId}`
      );
      setParticipants(res.data || []);
    } catch (err) {
      toast.error('Failed to load eligible participants');
    }
  }, [eventId, subEventId, selectedRoundId]);

  useEffect(() => {
    fetchControlData();
  }, [fetchControlData]);

  useEffect(() => {
    if (selectedRoundId) {
      fetchParticipants();
    }
  }, [selectedRoundId, fetchParticipants]);

  const selectedRound = useMemo(() => {
    return rounds.find((r) => String(r.id) === String(selectedRoundId));
  }, [rounds, selectedRoundId]);

  const isInitialRound = useMemo(() => {
    if (!rounds || rounds.length === 0) return true;
    const sorted = [...rounds].sort((a, b) => (a.round_number || 0) - (b.round_number || 0));
    return selectedRound ? String(selectedRound.id) === String(sorted[0].id) : true;
  }, [rounds, selectedRound]);

  // Filter eligible participants
  const eligibleParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchSearch =
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.registration_token?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm);

      const matchYear =
        yearFilter === 'ALL' ||
        (yearFilter === 'FY' && p.year?.includes('First')) ||
        (yearFilter === 'SY' && p.year?.includes('Second')) ||
        (yearFilter === 'TY' && p.year?.includes('Third')) ||
        (yearFilter === 'B.Tech' &&
          (p.year?.includes('B.Tech') || p.year?.includes('Last') || p.year?.includes('Final')));

      const isPresent = p.attendance == 1 || p.sub_attendance == 1 || p.main_attendance == 1;
      const isAvailable = p.availability === 'available' || p.availability === 'shortlisted' || !p.group;
      const matchAvailable = !onlyAvailable || isAvailable;
      const matchPresent = !onlyPresent || isPresent;

      return matchSearch && matchYear && matchAvailable && matchPresent;
    });
  }, [participants, searchTerm, yearFilter, onlyAvailable, onlyPresent]);

  const toggleSelectParticipant = (regId) => {
    setSelectedRegIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  const handleSelectAllFiltered = () => {
    const availableFilteredIds = eligibleParticipants
      .filter((p) => p.availability === 'available' || selectedRegIds.includes(p.registration_id))
      .map((p) => p.registration_id);

    const allSelected = availableFilteredIds.every((id) => selectedRegIds.includes(id));
    if (allSelected) {
      setSelectedRegIds((prev) => prev.filter((id) => !availableFilteredIds.includes(id)));
    } else {
      setSelectedRegIds((prev) => Array.from(new Set([...prev, ...availableFilteredIds])));
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (!selectedRoundId) {
      toast.error('Please select a target round');
      return;
    }
    if (selectedRegIds.length === 0) {
      toast.error('Please select at least one participant for this group');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/events/${eventId}/sub-events/${subEventId}/groups`, {
        round_id: selectedRoundId,
        name: groupName.trim(),
        topic: groupTopic.trim(),
        registration_ids: selectedRegIds
      });

      toast.success(`Group "${groupName}" created successfully with ${selectedRegIds.length} members!`);
      navigate(`/dashboard/events/${eventId}/sub-events/${subEventId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  // Selected participant objects
  const selectedParticipantObjs = useMemo(() => {
    return participants.filter((p) => selectedRegIds.includes(p.registration_id));
  }, [participants, selectedRegIds]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 font-sans">
      {/* Top Breadcrumb & Header */}
      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/events/${eventId}/sub-events/${subEventId}`}
            className="p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-zinc-700 dark:text-zinc-300 shrink-0"
            title="Back to Control Room"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Create Candidate Group
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {subEvent?.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Select eligible participants from the master list to form a competition group.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/events/${eventId}/sub-events/${subEventId}`}
            className="px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreateGroup}
            disabled={submitting || selectedRegIds.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-purple-600/25 flex items-center gap-2 disabled:opacity-40"
          >
            <Users size={14} />
            <span>{submitting ? 'Creating Group...' : `Create Group (${selectedRegIds.length})`}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Group Metadata & Selected Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Group Details Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Layers size={15} />
              <span>Group Details</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Round
                </label>
                <select
                  value={selectedRoundId}
                  onChange={(e) => {
                    setSelectedRoundId(e.target.value);
                    setSelectedRegIds([]);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                >
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      Round {r.round_number}: {r.name} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Group A / Team 1"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                  Topic / Motion (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Social Media: Boon or Bane"
                  value={groupTopic}
                  onChange={(e) => setGroupTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Selected Candidates Summary Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Users size={15} className="text-purple-600" />
                <span>Selected Candidates ({selectedRegIds.length})</span>
              </h3>
              {selectedRegIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRegIds([])}
                  className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedParticipantObjs.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-zinc-400">
                  No candidates selected yet. Check candidates from the table on the right to add them to this group.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedParticipantObjs.map((p) => (
                  <div
                    key={p.registration_id}
                    className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="truncate">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.full_name}</p>
                      <span className="text-[10px] font-mono text-zinc-400">{p.year || 'FY'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSelectParticipant(p.registration_id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Master List of Eligible Participants */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                    Eligible Candidates ({eligibleParticipants.length})
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    isInitialRound
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {isInitialRound ? 'Initial Round (All Registered)' : 'Shortlisted Candidates Only'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Showing eligible candidates for {selectedRound?.name || 'this round'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition cursor-pointer self-start sm:self-auto"
              >
                Toggle Select All Filtered
              </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <div className="sm:col-span-7 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, PRN..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="sm:col-span-5 flex items-center gap-1.5 overflow-x-auto">
                {['ALL', 'FY', 'SY', 'TY', 'B.Tech'].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYearFilter(y)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer border ${
                      yearFilter === y
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                <span>Only Available (Not in any group)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyPresent}
                  onChange={(e) => setOnlyPresent(e.target.checked)}
                />
                <span>Only Present</span>
              </label>
            </div>

            {/* Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden mt-3">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-zinc-500 uppercase">
                    <tr>
                      <th className="p-3 w-10 text-center">Select</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Year &amp; Dept</th>
                      <th className="p-3">Attendance</th>
                      <th className="p-3">Group Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {eligibleParticipants.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-zinc-400">
                          No matching participants found for current filter.
                        </td>
                      </tr>
                    ) : (
                      eligibleParticipants.map((p) => {
                        const isSelected = selectedRegIds.includes(p.registration_id);
                        const isAvailable = p.availability === 'available';
                        return (
                          <tr
                            key={p.registration_id}
                            onClick={() => toggleSelectParticipant(p.registration_id)}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-950/20'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectParticipant(p.registration_id)}
                              />
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-zinc-900 dark:text-white">{p.full_name}</p>
                              <span className="font-mono text-[10px] text-zinc-400">{p.email}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mr-1.5">
                                {p.year || 'FY'}
                              </span>
                              <span className="text-zinc-500 text-[11px]">{p.department}</span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                                  p.sub_attendance === 1
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {p.sub_attendance === 1 ? '✓ Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                                  isAvailable
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-blue-500/10 text-blue-500'
                                }`}
                              >
                                {isAvailable ? '● Available' : `In ${p.group?.group_name || 'Group'}`}
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
        </div>
      </div>
    </div>
  );
};

export default CreateSubEventGroupPage;
