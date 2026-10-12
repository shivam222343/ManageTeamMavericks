import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft,
  Shuffle,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Layers,
  ChevronRight,
  Sliders,
  Check,
  Building2,
  Calendar
} from 'lucide-react';

const AutoGroupSubEventPage = () => {
  const { id: eventId, subId: subEventId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subEvent, setSubEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [participants, setParticipants] = useState([]);

  // Auto-group settings
  const [capacity, setCapacity] = useState(4);
  const [strategy, setStrategy] = useState('year_based'); // 'year_based' | 'random'
  const [onlyPresent, setOnlyPresent] = useState(true);
  const [groupPrefix, setGroupPrefix] = useState('Group');

  // Filters & selection
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [crRes, roundsRes] = await Promise.all([
          axios.get(`/events/${eventId}/sub-events/${subEventId}/control-room`),
          axios.get(`/events/${eventId}/sub-events/${subEventId}/rounds`)
        ]);

        setSubEvent(crRes.data?.sub_event);
        const fetchedRounds = roundsRes.data || [];
        setRounds(fetchedRounds);

        const initialRoundId =
          searchParams.get('round_id') ||
          fetchedRounds.find((r) => r.status === 'ongoing')?.id ||
          fetchedRounds[0]?.id ||
          '';
        setSelectedRoundId(initialRoundId ? String(initialRoundId) : '');
      } catch (err) {
        toast.error('Failed to load sub-event information');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, subEventId, searchParams]);

  // Fetch participants for the selected round
  useEffect(() => {
    if (!selectedRoundId) return;
    const fetchCandidates = async () => {
      try {
        const res = await axios.get(
          `/events/${eventId}/sub-events/${subEventId}/participants?round_id=${selectedRoundId}`
        );
        const list = res.data || [];
        setParticipants(list);

        // Pre-select all available participants who are not currently in a group
        const available = list.filter((p) => {
          const isPresent = p.attendance == 1 || p.sub_attendance == 1 || p.main_attendance == 1;
          const isNotGrouped = p.availability !== 'in_group' && p.availability !== 'In Group' && !p.group;
          return (!onlyPresent || isPresent) && isNotGrouped;
        });
        setSelectedIds(available.map((p) => p.registration_id));
      } catch (err) {
        console.error('Failed to load participants', err);
      }
    };
    fetchCandidates();
  }, [eventId, subEventId, selectedRoundId, onlyPresent]);

  const selectedRound = useMemo(() => {
    return rounds.find((r) => String(r.id) === String(selectedRoundId));
  }, [rounds, selectedRoundId]);

  const isInitialRound = useMemo(() => {
    if (!rounds || rounds.length === 0) return true;
    const sorted = [...rounds].sort((a, b) => (a.round_number || 0) - (b.round_number || 0));
    return selectedRound ? String(selectedRound.id) === String(sorted[0].id) : true;
  }, [rounds, selectedRound]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const isPresent = p.attendance == 1 || p.sub_attendance == 1 || p.main_attendance == 1;
      if (onlyPresent && !isPresent) return false;
      const matchesSearch =
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search) ||
        p.registration_token?.toLowerCase().includes(search.toLowerCase()) ||
        p.token?.toLowerCase().includes(search.toLowerCase());

      const matchesYear = yearFilter === 'ALL' || (p.year && p.year.toUpperCase().includes(yearFilter));
      return matchesSearch && matchesYear;
    });
  }, [participants, search, yearFilter, onlyPresent]);

  // Year breakdown counts of selected candidates
  const yearStats = useMemo(() => {
    const selectedParticipants = participants.filter((p) => selectedIds.includes(p.registration_id));
    const counts = { FY: 0, SY: 0, TY: 0, 'B.Tech': 0, Other: 0 };
    selectedParticipants.forEach((p) => {
      const y = (p.year || '').toUpperCase();
      if (y.includes('FY') || y.includes('FIRST')) counts.FY++;
      else if (y.includes('SY') || y.includes('SECOND')) counts.SY++;
      else if (y.includes('TY') || y.includes('THIRD')) counts.TY++;
      else if (y.includes('FINAL') || y.includes('B.TECH') || y.includes('LY')) counts['B.Tech']++;
      else counts.Other++;
    });
    return counts;
  }, [participants, selectedIds]);

  const estimatedGroupsCount = useMemo(() => {
    const total = selectedIds.length;
    if (total === 0 || capacity < 1) return 0;
    return Math.ceil(total / capacity);
  }, [selectedIds, capacity]);

  const handleToggleSelectAll = () => {
    const eligibleVisible = filteredParticipants.filter((p) => p.availability !== 'In Group');
    const eligibleVisibleIds = eligibleVisible.map((p) => p.registration_id);
    const allSelected = eligibleVisibleIds.length > 0 && eligibleVisibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !eligibleVisibleIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...eligibleVisibleIds]));
      setSelectedIds(merged);
    }
  };

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    if (!selectedRoundId) {
      toast.error('Please select a target round');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Please select at least 2 participants to form groups');
      return;
    }
    if (selectedIds.length < 2) {
      toast.error('At least 2 participants are required to form groups');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`/events/${eventId}/sub-events/${subEventId}/groups/auto-generate`, {
        round_id: parseInt(selectedRoundId),
        capacity: parseInt(capacity),
        strategy,
        only_present: onlyPresent,
        group_prefix: groupPrefix.trim() || 'Group',
        registration_ids: selectedIds
      });

      toast.success(
        `Successfully generated ${res.data.groups_created} groups (${res.data.participants_grouped} participants)!`
      );
      navigate(`/dashboard/events/${eventId}/sub-events/${subEventId}?tab=groups&round_id=${selectedRoundId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to auto-generate groups');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <MajorLoader message="Loading participant roster and grouping engine..." />;
  }

  return (
    <div className="min-h-screen pb-24 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/dashboard/events/${eventId}/sub-events/${subEventId}`)}
            className="p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {subEvent?.name}
              </span>
              <span className="text-xs text-zinc-400">•</span>
              <span className="text-xs font-mono uppercase text-zinc-400">Smart Grouping Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Shuffle className="text-purple-600 dark:text-purple-400" size={26} />
              <span>Auto-Generate Candidate Groups</span>
            </h1>
          </div>
        </div>

        <button
          onClick={handleAutoGenerate}
          disabled={submitting || selectedIds.length < 2}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50"
        >
          <Sparkles size={16} />
          <span>{submitting ? 'Generating...' : `Generate ${estimatedGroupsCount} Groups`}</span>
        </button>
      </div>

      {/* Main Grid: Left Configuration & Stats, Right Participant Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (5 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Configuration Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" />
              <span>Grouping Configuration</span>
            </h3>

            {/* Target Round */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Target Round
              </label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    Round {r.round_number}: {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Group Capacity
                </label>
                <span className="font-mono font-black text-purple-600 dark:text-purple-400">
                  {capacity} Candidates / Group
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>2 (Pairs)</span>
                <span>4 (Standard)</span>
                <span>6 (Medium)</span>
                <span>10 (Large)</span>
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block">
                Distribution Strategy
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <div
                  onClick={() => setStrategy('year_based')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    strategy === 'year_based'
                      ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">Year-Based Diversity</span>
                    {strategy === 'year_based' && <Check size={16} />}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Equally balances FY, SY, TY, and Final Year candidates. If not enough candidates of a specific year exist, slots are automatically filled with random available candidates.
                  </p>
                </div>

                <div
                  onClick={() => setStrategy('random')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    strategy === 'random'
                      ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">Pure Random Shuffle</span>
                    {strategy === 'random' && <Check size={16} />}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Completely shuffles selected candidates randomly regardless of academic year.
                  </p>
                </div>
              </div>
            </div>

            {/* Group Name Prefix */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Group Name Prefix
              </label>
              <input
                type="text"
                value={groupPrefix}
                onChange={(e) => setGroupPrefix(e.target.value)}
                placeholder="e.g. Group, Team, Debate Cluster"
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Only Present Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Only Candidates Marked Present
              </span>
              <input
                type="checkbox"
                checked={onlyPresent}
                onChange={(e) => setOnlyPresent(e.target.checked)}
                className="w-4 h-4 accent-purple-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Year Diversity Distribution Live Stats */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-500" />
                <span>Selected Candidates Diversity</span>
              </span>
              <span className="text-xs font-mono font-black text-purple-600">{selectedIds.length} Total</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">First Year (FY)</span>
                <span className="font-mono font-black text-sm">{yearStats.FY}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Second Year (SY)</span>
                <span className="font-mono font-black text-sm">{yearStats.SY}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">Third Year (TY)</span>
                <span className="font-mono font-black text-sm">{yearStats.TY}</span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">Final Year (B.Tech)</span>
                <span className="font-mono font-black text-sm">{yearStats['B.Tech']}</span>
              </div>
            </div>

            {/* Estimated Output Preview Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-purple-950/20 border border-purple-500/30 text-xs space-y-1">
              <p className="font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                ⚡ Formation Preview
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">
                Will form <strong className="text-purple-600 dark:text-purple-400 font-black">{estimatedGroupsCount}</strong> groups with up to <strong className="text-purple-600 dark:text-purple-400 font-black">{capacity}</strong> members each.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Participant Selection Table (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Table Filters Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  isInitialRound
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {isInitialRound ? 'Initial Round (All Registered)' : 'Shortlisted Candidates Only'}
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {filteredParticipants.length} Available for {selectedRound?.name || 'Round'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                >
                  Toggle Select All
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  placeholder="Search participants by name, email, PRN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase cursor-pointer"
                >
                  <option value="ALL">All Years</option>
                  <option value="FY">First Year (FY)</option>
                  <option value="SY">Second Year (SY)</option>
                  <option value="TY">Third Year (TY)</option>
                  <option value="B.TECH">Final Year (B.Tech)</option>
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-500 uppercase">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Participant</th>
                    <th className="p-3">Academic Year</th>
                    <th className="p-3">Attendance</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-zinc-400">
                        {!isInitialRound && participants.length === 0 ? (
                          <div className="space-y-1.5 py-4">
                            <p className="font-bold text-zinc-700 dark:text-zinc-300">
                              No candidates shortlisted for {selectedRound?.name || 'this round'} yet.
                            </p>
                            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                              Please evaluate or promote candidates from the previous round in the Shortlist tab.
                            </p>
                          </div>
                        ) : (
                          'No participants match the criteria.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => {
                      const isSelected = selectedIds.includes(p.registration_id);
                      const isAlreadyInGroup = p.availability === 'In Group';

                      return (
                        <tr
                          key={p.registration_id}
                          onClick={() => {
                            if (isAlreadyInGroup) return;
                            if (isSelected) {
                              setSelectedIds(selectedIds.filter((id) => id !== p.registration_id));
                            } else {
                              setSelectedIds([...selectedIds, p.registration_id]);
                            }
                          }}
                          className={`cursor-pointer transition ${
                            isAlreadyInGroup
                              ? 'opacity-40 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-800/30'
                              : isSelected
                              ? 'bg-purple-500/10 hover:bg-purple-500/15'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              disabled={isAlreadyInGroup}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds([...selectedIds, p.registration_id]);
                                } else {
                                  setSelectedIds(selectedIds.filter((id) => id !== p.registration_id));
                                }
                              }}
                              className="accent-purple-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-zinc-900 dark:text-white">{p.full_name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">{p.email} • {p.phone || 'No phone'}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                              {p.year || 'FY'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                p.attendance
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}
                            >
                              {p.attendance ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                isAlreadyInGroup
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              }`}
                            >
                              {p.availability || 'Available'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Selection Counter */}
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 font-mono font-bold">
              <span>{selectedIds.length} candidate(s) selected for grouping</span>
              <span>{filteredParticipants.length} candidates visible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoGroupSubEventPage;
