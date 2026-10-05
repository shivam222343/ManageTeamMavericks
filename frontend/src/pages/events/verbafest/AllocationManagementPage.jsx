import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  Clock,
  DoorOpen,
  Layers,
  Edit,
  Trash2,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  HelpCircle,
  XCircle,
  CalendarCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  EventBadge,
  AttendanceBadge,
  EmptyState,
  VerbafestLoader,
  AddEditAllocationModal,
  AllocationDetailsModal,
  ParticipantScheduleModal,
  ConflictAlertModal
} from './components';

const EVENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Event Formats' },
  { value: 'gd', label: 'Group Discussion (GD)' },
  { value: 'debate', label: 'Debate' },
  { value: 'mindsaga', label: 'Mind Saga' },
];

const ATTENDANCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Attendance' },
  { value: 'pending', label: 'Pending' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
];

const formatSlotTime = (startStr, endStr) => {
  if (!startStr || !endStr) return '—';
  try {
    const s = new Date(startStr.replace(' ', 'T'));
    const e = new Date(endStr.replace(' ', 'T'));
    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${sStr} – ${eStr}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
};

/**
 * AllocationManagementPage
 * VERBAFEST 2026 Phase 3B-5: Group Allocations Management Console.
 * Organizes participants into evaluated groups for GD, Debate, and Mind Saga,
 * with real-time capacity monitoring, participant eligibility filtering, conflict detection,
 * and attendee roster controls.
 */
const AllocationManagementPage = () => {
  const { user } = useAuth();

  // Role authorization
  const canManage =
    user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [allocations, setAllocations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [slots, setSlots] = useState([]);
  const [panels, setPanels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & view states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedPanelId, setSelectedPanelId] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState('all');
  const [selectedAttendance, setSelectedAttendance] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [addModalDefaults, setAddModalDefaults] = useState({
    eventType: 'gd',
    groupCode: '',
    slotId: '',
    panelId: '',
  });

  const [selectedGroupCodeForDetails, setSelectedGroupCodeForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [selectedParticipantForSchedule, setSelectedParticipantForSchedule] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [conflictData, setConflictData] = useState(null);
  const [conflictErrorTitle, setConflictErrorTitle] = useState('');
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Fetch all prerequisite data
  const fetchData = useCallback(async () => {
    try {
      const [allocRes, partRes, slotsRes, panelsRes, roomsRes] = await Promise.all([
        axios.get('/events/verbafest/allocations'),
        axios.get('/events/verbafest/participants'),
        axios.get('/events/verbafest/schedule'),
        axios.get('/events/verbafest/panels'),
        axios.get('/events/verbafest/rooms'),
      ]);

      setAllocations(allocRes.data?.data || []);
      setParticipants(partRes.data?.data || []);
      setSlots(slotsRes.data?.data || []);
      setPanels(panelsRes.data?.data || []);
      setRooms(roomsRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load group allocations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Grouped aggregations
  const groupsMap = useMemo(() => {
    const map = new Map();
    allocations.forEach((alloc) => {
      const code = alloc.group_code;
      if (!map.has(code)) {
        map.set(code, {
          group_code: code,
          event_type: alloc.event_type,
          slot_id: alloc.slot_id,
          slot_code: alloc.slot_code,
          slot_label: alloc.slot_label,
          start_time: alloc.start_time,
          end_time: alloc.end_time,
          panel_id: alloc.panel_id,
          panel_code: alloc.panel_code,
          panel_name: alloc.panel_name,
          room_code: alloc.room_code,
          room_name: alloc.room_name,
          members: [],
        });
      }
      map.get(code).members.push(alloc);
    });
    return map;
  }, [allocations]);

  const allGroups = useMemo(() => {
    return Array.from(groupsMap.values());
  }, [groupsMap]);

  // Compute summary metrics
  const summaryMetrics = useMemo(() => {
    const totalAllocations = allocations.length;

    // Distinct GD and Debate groups
    const gdGroupsCount = allGroups.filter((g) => g.event_type === 'gd').length;
    const debateGroupsCount = allGroups.filter((g) => g.event_type === 'debate').length;

    // Build participant allocation tracking
    // Map of participantId -> Set of allocated event types
    const participantAllocMap = new Map();
    allocations.forEach((a) => {
      const pId = Number(a.participant_id);
      if (!participantAllocMap.has(pId)) {
        participantAllocMap.set(pId, new Set());
      }
      participantAllocMap.get(pId).add(a.event_type);
    });

    let unallocatedCount = 0;
    let fullyAllocatedCount = 0;

    participants.forEach((p) => {
      const pId = Number(p.id);
      const allocatedTracks = participantAllocMap.get(pId) || new Set();

      const needsGd = Boolean(p.reg_gd);
      const needsDebate = Boolean(p.reg_debate);

      const hasGd = allocatedTracks.has('gd');
      const hasDebate = allocatedTracks.has('debate');

      const isMissingTrack = (needsGd && !hasGd) || (needsDebate && !hasDebate);
      const isRegisteredForAnything = needsGd || needsDebate || Boolean(p.reg_mindsaga);

      if (isRegisteredForAnything && isMissingTrack) {
        unallocatedCount++;
      } else if (isRegisteredForAnything && (!needsGd || hasGd) && (!needsDebate || hasDebate)) {
        fullyAllocatedCount++;
      }
    });

    // Attendance stats
    const presentCount = allocations.filter((a) => a.attendance_status === 'present').length;
    const pendingCount = allocations.filter((a) => a.attendance_status === 'pending').length;

    return {
      totalAllocations,
      gdGroupsCount,
      debateGroupsCount,
      unallocatedCount,
      fullyAllocatedCount,
      presentCount,
      pendingCount,
    };
  }, [allocations, allGroups, participants]);

  // Filter individual allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((alloc) => {
      // Event filter
      if (selectedEvent !== 'all' && alloc.event_type !== selectedEvent) {
        return false;
      }

      // Panel filter
      if (selectedPanelId !== 'all' && String(alloc.panel_id) !== String(selectedPanelId)) {
        return false;
      }

      // Room filter
      if (selectedRoomId !== 'all') {
        const foundPanel = panels.find((p) => String(p.id) === String(alloc.panel_id));
        const foundSlot = slots.find((s) => String(s.id) === String(alloc.slot_id));
        const allocRoomId = foundPanel?.room_id || foundSlot?.room_id;
        if (String(allocRoomId) !== String(selectedRoomId)) {
          return false;
        }
      }

      // Attendance filter
      if (selectedAttendance !== 'all' && alloc.attendance_status !== selectedAttendance) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const groupMatch = (alloc.group_code || '').toLowerCase().includes(q);
        const nameMatch = (alloc.full_name || '').toLowerCase().includes(q);
        const codeMatch = (alloc.participant_code || '').toLowerCase().includes(q);
        const collegeMatch = (alloc.college || '').toLowerCase().includes(q);
        const panelMatch = (alloc.panel_name || alloc.panel_code || '').toLowerCase().includes(q);
        const roomMatch = (alloc.room_name || alloc.room_code || '').toLowerCase().includes(q);

        if (!groupMatch && !nameMatch && !codeMatch && !collegeMatch && !panelMatch && !roomMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allocations, selectedEvent, selectedPanelId, selectedRoomId, selectedAttendance, searchQuery, panels, slots]);

  // Filtered Groups for Card View
  const filteredGroups = useMemo(() => {
    return allGroups.filter((grp) => {
      // Event filter
      if (selectedEvent !== 'all' && grp.event_type !== selectedEvent) {
        return false;
      }

      // Panel filter
      if (selectedPanelId !== 'all' && String(grp.panel_id) !== String(selectedPanelId)) {
        return false;
      }

      // Room filter
      if (selectedRoomId !== 'all') {
        const foundPanel = panels.find((p) => String(p.id) === String(grp.panel_id));
        const foundSlot = slots.find((s) => String(s.id) === String(grp.slot_id));
        const grpRoomId = foundPanel?.room_id || foundSlot?.room_id;
        if (String(grpRoomId) !== String(selectedRoomId)) {
          return false;
        }
      }

      // Attendance filter: group must have at least one member with this status
      if (selectedAttendance !== 'all') {
        const hasMatchingMember = grp.members.some(
          (m) => m.attendance_status === selectedAttendance
        );
        if (!hasMatchingMember) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (grp.group_code || '').toLowerCase().includes(q);
        const panelMatch = (grp.panel_name || grp.panel_code || '').toLowerCase().includes(q);
        const roomMatch = (grp.room_name || grp.room_code || '').toLowerCase().includes(q);
        const anyMemberMatch = grp.members.some(
          (m) =>
            (m.full_name || '').toLowerCase().includes(q) ||
            (m.participant_code || '').toLowerCase().includes(q) ||
            (m.college || '').toLowerCase().includes(q)
        );

        if (!codeMatch && !panelMatch && !roomMatch && !anyMemberMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allGroups, selectedEvent, selectedPanelId, selectedRoomId, selectedAttendance, searchQuery, panels, slots]);

  // Quick Attendance Update for single row
  const handleQuickAttendance = async (allocationId, newStatus) => {
    if (!canManage) return;
    try {
      await axios.patch(`/events/verbafest/allocations/${allocationId}/attendance`, {
        attendance_status: newStatus,
      });

      setAllocations((prev) =>
        prev.map((a) => (a.id === allocationId ? { ...a, attendance_status: newStatus } : a))
      );
      toast.success(`Marked as ${newStatus}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attendance.');
    }
  };

  // Delete Allocation for single row
  const handleDeleteAllocation = async (allocationId, pName) => {
    if (!canManage) return;
    if (!window.confirm(`Are you sure you want to remove the allocation for "${pName}"?`)) {
      return;
    }

    try {
      await axios.delete(`/events/verbafest/allocations/${allocationId}`);
      toast.success('Allocation removed successfully.');
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete allocation.');
    }
  };

  // Open modal to add members to a specific group
  const handleOpenAddMembersToGroup = ({ groupCode, eventType, slotId, panelId }) => {
    setEditingAllocation(null);
    setAddModalDefaults({
      eventType: eventType || 'gd',
      groupCode: groupCode || '',
      slotId: slotId ? String(slotId) : '',
      panelId: panelId ? String(panelId) : '',
    });
    setIsDetailsOpen(false); // Close details modal if open
    setIsAddEditOpen(true);
  };

  // Open modal to create brand new allocation / group
  const handleOpenCreateNew = () => {
    setEditingAllocation(null);
    setAddModalDefaults({
      eventType: selectedEvent !== 'all' ? selectedEvent : 'gd',
      groupCode: '',
      slotId: '',
      panelId: selectedPanelId !== 'all' ? selectedPanelId : '',
    });
    setIsAddEditOpen(true);
  };

  // Open modal to edit existing allocation
  const handleOpenEditAllocation = (allocation) => {
    setEditingAllocation(allocation);
    setIsAddEditOpen(true);
  };

  // Open group details modal
  const handleOpenGroupDetails = (groupCode) => {
    setSelectedGroupCodeForDetails(groupCode);
    setIsDetailsOpen(true);
  };

  // Open participant schedule modal
  const handleOpenParticipantSchedule = (participantId) => {
    setSelectedParticipantForSchedule(participantId);
    setIsScheduleModalOpen(true);
  };

  // Triggered on 409 conflict
  const handleConflictDetected = (conflictObj, errorTitle) => {
    setConflictData(conflictObj);
    setConflictErrorTitle(errorTitle || 'Scheduling Conflict Detected');
    setIsConflictModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Page Header */}
      <VerbafestHeader
        title="Group Allocations Console"
        description="Manage participant group rosters, venue assignments, real-time panel capacity, and attendance for VERBAFEST 2026."
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreateNew}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Allocation / Group</span>
            </button>
          )}
        </div>
      </VerbafestHeader>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Allocations"
          value={summaryMetrics.totalAllocations}
          icon={Users}
          color="blue"
          subtitle={`${summaryMetrics.presentCount} present`}
        />
        <StatCard
          title="GD Groups"
          value={summaryMetrics.gdGroupsCount}
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Debate Groups"
          value={summaryMetrics.debateGroupsCount}
          icon={Clock}
          color="violet"
        />
        <StatCard
          title="Unallocated"
          value={summaryMetrics.unallocatedCount}
          icon={UserX}
          color={summaryMetrics.unallocatedCount > 0 ? 'amber' : 'emerald'}
          subtitle="Needs group"
        />
        <StatCard
          title="Fully Allocated"
          value={summaryMetrics.fullyAllocatedCount}
          icon={UserCheck}
          color="emerald"
          subtitle="Complete"
        />
        <StatCard
          title="Pending Attendance"
          value={summaryMetrics.pendingCount}
          icon={HelpCircle}
          color={summaryMetrics.pendingCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by group code, participant, college, room, panel..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Group Cards ({filteredGroups.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>All Allocations ({filteredAllocations.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Event Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Event Format
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {EVENT_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Panel Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Evaluation Panel
            </label>
            <select
              value={selectedPanelId}
              onChange={(e) => setSelectedPanelId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Panels</option>
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.panel_code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Room / Venue
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.room_code}] {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Attendance
            </label>
            <select
              value={selectedAttendance}
              onChange={(e) => setSelectedAttendance(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {ATTENDANCE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20">
          <VerbafestLoader message="Loading group allocations..." />
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= GROUP CARDS VIEW ================= */
        filteredGroups.length === 0 ? (
          <EmptyState
            title="No Groups Found"
            description={
              searchQuery || selectedEvent !== 'all' || selectedPanelId !== 'all' || selectedAttendance !== 'all'
                ? 'No groups match your current filter settings. Try clearing some filters.'
                : 'No participant groups have been configured yet.'
            }
            icon={Users}
            action={
              canManage && (
                <button
                  type="button"
                  onClick={handleOpenCreateNew}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
                >
                  Create First Group
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((group) => {
              // Find panel for capacity comparison
              const panel = panels.find((p) => Number(p.id) === Number(group.panel_id));
              const capacity = panel ? Number(panel.capacity) : 10;
              const memberCount = group.members.length;
              const fillPct = Math.min(100, (memberCount / (capacity || 1)) * 100);

              // Attendance breakdown
              const presentCount = group.members.filter((m) => m.attendance_status === 'present').length;
              const pendingCount = group.members.filter((m) => m.attendance_status === 'pending').length;
              const absentCount = group.members.filter((m) => m.attendance_status === 'absent').length;

              return (
                <div
                  key={group.group_code}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                          {group.group_code}
                        </span>
                        <EventBadge eventType={group.event_type} />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    {/* Schedule & Room Details */}
                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          {group.slot_label || group.slot_code} • {formatSlotTime(group.start_time, group.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          {group.panel_name || group.panel_code || 'Unassigned Panel'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <DoorOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          {group.room_name || group.room_code || 'No Venue Assigned'}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1 text-slate-500 dark:text-slate-400">
                        <span>Panel Fill</span>
                        <span>
                          {memberCount} / {capacity}
                          {memberCount >= capacity && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1">
                              (Full)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            memberCount >= capacity
                              ? 'bg-rose-500'
                              : memberCount >= capacity - 2
                              ? 'bg-amber-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Member preview chips */}
                    <div className="mb-4">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Assigned Attendees
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.members.slice(0, 4).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 truncate max-w-[120px]"
                            title={`${m.full_name} (${m.participant_code})`}
                          >
                            {m.full_name}
                          </span>
                        ))}
                        {group.members.length > 4 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium border border-indigo-200/60 dark:border-indigo-800/60">
                            +{group.members.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attendance status breakdown pill */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {presentCount} Present
                      </span>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {pendingCount} Pending
                      </span>
                      {absentCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            {absentCount} Absent
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenGroupDetails(group.group_code)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Roster
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenAddMembersToGroup({
                            groupCode: group.group_code,
                            eventType: group.event_type,
                            slotId: group.slot_id,
                            panelId: group.panel_id,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Member
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= INDIVIDUAL ALLOCATIONS TABLE VIEW ================= */
        filteredAllocations.length === 0 ? (
          <EmptyState
            title="No Allocations Found"
            description="No participant allocations matched your search and filter criteria."
            icon={Users}
          />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Group Code</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Schedule Slot</th>
                    <th className="py-3 px-4">Panel & Venue</th>
                    <th className="py-3 px-4 text-center">Attendance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredAllocations.map((alloc) => (
                    <tr
                      key={alloc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Participant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-800/50">
                            {alloc.participant_code}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {alloc.full_name}
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[180px]">
                              {alloc.college || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Group Code */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenGroupDetails(alloc.group_code)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {alloc.group_code}
                        </button>
                      </td>

                      {/* Event Format */}
                      <td className="py-3.5 px-4">
                        <EventBadge eventType={alloc.event_type} />
                      </td>

                      {/* Schedule Slot */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {alloc.slot_label || alloc.slot_code}
                        </div>
                        <div className="text-slate-400">
                          {formatSlotTime(alloc.start_time, alloc.end_time)}
                        </div>
                      </td>

                      {/* Panel & Room */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {alloc.panel_name || alloc.panel_code || 'Unassigned'}
                        </div>
                        <div className="text-slate-400">
                          {alloc.room_name || alloc.room_code || 'No Venue'}
                        </div>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4 text-center">
                        {canManage ? (
                          <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleQuickAttendance(alloc.id, 'present')}
                              className={`p-1 rounded-md transition-all ${
                                alloc.attendance_status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-emerald-600'
                              }`}
                              title="Mark Present"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAttendance(alloc.id, 'pending')}
                              className={`p-1 rounded-md transition-all ${
                                alloc.attendance_status === 'pending'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-amber-500'
                              }`}
                              title="Mark Pending"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAttendance(alloc.id, 'absent')}
                              className={`p-1 rounded-md transition-all ${
                                alloc.attendance_status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-rose-600'
                              }`}
                              title="Mark Absent"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <AttendanceBadge status={alloc.attendance_status} />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenParticipantSchedule(alloc.participant_id)}
                            title="View Itinerary"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <CalendarCheck className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAllocation(alloc)}
                                title="Edit Allocation"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteAllocation(alloc.id, alloc.full_name)}
                                title="Remove Allocation"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Add / Edit Allocation Modal */}
      <AddEditAllocationModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        allocation={editingAllocation}
        defaultEventType={addModalDefaults.eventType}
        defaultGroupCode={addModalDefaults.groupCode}
        defaultSlotId={addModalDefaults.slotId}
        defaultPanelId={addModalDefaults.panelId}
        slots={slots}
        panels={panels}
        rooms={rooms}
        participants={participants}
        existingAllocations={allocations}
        onSuccess={fetchData}
        onConflict={handleConflictDetected}
      />

      {/* Group Details & Member Roster Modal */}
      <AllocationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        groupCode={selectedGroupCodeForDetails}
        canManage={canManage}
        onAddMembers={handleOpenAddMembersToGroup}
        onViewParticipantSchedule={handleOpenParticipantSchedule}
        onDataChanged={fetchData}
      />

      {/* Participant Timeline Modal */}
      <ParticipantScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialParticipantId={selectedParticipantForSchedule}
      />

      {/* Conflict Alert Modal */}
      <ConflictAlertModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflictData={conflictData}
        errorTitle={conflictErrorTitle}
      />
    </div>
  );
};

export default AllocationManagementPage;
