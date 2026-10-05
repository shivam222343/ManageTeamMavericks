import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Calendar,
  Plus,
  Search,
  Clock,
  DoorOpen,
  Layers,
  Users,
  Brain,
  Edit,
  Trash2,
  RefreshCw,
  LayoutGrid,
  List,
  Eye
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  EventBadge,
  PanelStatusBadge,
  EmptyState,
  VerbafestLoader,
  ScheduleSlotCard,
  AddEditScheduleModal,
  ScheduleSlotDetailsModal,
  ParticipantScheduleModal,
  ConflictAlertModal
} from './components';

const EVENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Event Formats' },
  { value: 'gd', label: 'Group Discussion (GD)' },
  { value: 'debate', label: 'Debate' },
  { value: 'mindsaga', label: 'Mind Saga' },
];

const formatTimeRange = (startStr, endStr) => {
  if (!startStr || !endStr) return '—';
  try {
    const s = new Date(startStr.replace(' ', 'T'));
    const e = new Date(endStr.replace(' ', 'T'));
    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMins = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
    return `${sStr} – ${eStr} (${diffMins} min)`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
};

const formatDateOnly = (dtStr) => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

const getDateKey = (dtStr) => {
  if (!dtStr) return 'unknown';
  return dtStr.slice(0, 10);
};

/**
 * ScheduleManagementPage
 * VERBAFEST 2026 Phase 3B-4: Schedule Management Console.
 * Manages chronological time slots across GD, Debate, and Mind Saga,
 * with ConflictDetectionService integration, attendee timelines, and venue allocations.
 */
const ScheduleManagementPage = () => {
  const { user } = useAuth();

  // Role authorization
  const canManage = user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [slots, setSlots] = useState([]);
  const [panels, setPanels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedPanelId, setSelectedPanelId] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailSlotId, setDetailSlotId] = useState(null);

  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [participantLookupId, setParticipantLookupId] = useState(null);

  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [conflictErrorTitle, setConflictErrorTitle] = useState('');

  // Fetch all schedule data
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [scheduleRes, panelsRes, roomsRes] = await Promise.all([
        axios.get('/events/verbafest/schedule'),
        axios.get('/events/verbafest/panels').catch(() => ({ data: { data: [] } })),
        axios.get('/events/verbafest/rooms').catch(() => ({ data: { data: [] } })),
      ]);

      setSlots(Array.isArray(scheduleRes.data?.data) ? scheduleRes.data.data : []);
      setPanels(Array.isArray(panelsRes.data?.data) ? panelsRes.data.data : []);
      setRooms(Array.isArray(roomsRes.data?.data) ? roomsRes.data.data : []);
    } catch (err) {
      console.error('Failed to load schedule management data:', err);
      toast.error('Failed to load schedule slots. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = slots.length;
    let gdCount = 0;
    let debateCount = 0;
    let mindsagaCount = 0;
    let totalAllocatedAttendees = 0;

    slots.forEach((s) => {
      if (s.event_type === 'gd') gdCount += 1;
      else if (s.event_type === 'debate') debateCount += 1;
      else if (s.event_type === 'mindsaga') mindsagaCount += 1;

      totalAllocatedAttendees += Number(s.allocated_participants_count) || 0;
    });

    return {
      total,
      gdCount,
      debateCount,
      mindsagaCount,
      totalAllocatedAttendees,
    };
  }, [slots]);

  // Unique dates extracted from schedule
  const uniqueDates = useMemo(() => {
    const set = new Set();
    slots.forEach((s) => {
      const dKey = getDateKey(s.start_time);
      if (dKey && dKey !== 'unknown') set.add(dKey);
    });
    return Array.from(set).sort();
  }, [slots]);

  // Filtered slots list
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (s.slot_code || '').toLowerCase().includes(q);
        const labelMatch = (s.slot_label || '').toLowerCase().includes(q);
        const panelMatch = (s.panel_code || '').toLowerCase().includes(q) || (s.panel_name || '').toLowerCase().includes(q);
        const roomMatch = (s.room_code || '').toLowerCase().includes(q) || (s.room_name || '').toLowerCase().includes(q);
        if (!codeMatch && !labelMatch && !panelMatch && !roomMatch) return false;
      }

      // Event format
      if (selectedEvent !== 'all' && s.event_type !== selectedEvent) {
        return false;
      }

      // Panel
      if (selectedPanelId !== 'all' && String(s.panel_id) !== String(selectedPanelId)) {
        return false;
      }

      // Room
      if (selectedRoomId !== 'all' && String(s.room_id) !== String(selectedRoomId)) {
        return false;
      }

      // Date
      if (selectedDate !== 'all' && getDateKey(s.start_time) !== selectedDate) {
        return false;
      }

      return true;
    });
  }, [slots, searchQuery, selectedEvent, selectedPanelId, selectedRoomId, selectedDate]);

  // Handlers
  const handleOpenCreate = () => {
    if (!canManage) return;
    setEditingSlot(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (slot) => {
    if (!canManage) return;
    setEditingSlot(slot);
    setIsAddEditOpen(true);
  };

  const handleOpenDetails = (slotId) => {
    setDetailSlotId(slotId);
    setIsDetailsOpen(true);
  };

  const handleOpenParticipantLookup = (participantId = null) => {
    setParticipantLookupId(participantId);
    setIsParticipantModalOpen(true);
  };

  const handleConflictDetected = (conflict, errorTitle) => {
    setConflictData(conflict);
    setConflictErrorTitle(errorTitle || 'Schedule Conflict Detected');
    setIsConflictOpen(true);
  };

  const handleDeleteSlot = async (slot) => {
    if (!canManage) return;
    const allocCount = Number(slot.allocated_participants_count) || 0;
    if (allocCount > 0) {
      toast.error(`Cannot delete slot ${slot.slot_code}: ${allocCount} participant(s) are currently allocated. Reassign allocations first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete schedule slot "${slot.slot_code}"?`)) {
      return;
    }

    const toastId = toast.loading('Deleting schedule slot…');
    try {
      await axios.delete(`/events/verbafest/schedule/${slot.id}`);
      toast.success(`Slot ${slot.slot_code} deleted successfully.`, { id: toastId });
      fetchAllData(true);
    } catch (err) {
      console.error('Failed to delete slot:', err);
      toast.error(err.response?.data?.error || 'Failed to delete slot.', { id: toastId });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEvent('all');
    setSelectedPanelId('all');
    setSelectedRoomId('all');
    setSelectedDate('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedEvent !== 'all' || selectedPanelId !== 'all' || selectedRoomId !== 'all' || selectedDate !== 'all';

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <VerbafestHeader
        title="Event Schedule & Timelines"
        description="Chronologically coordinated time slots, venue rooms, and evaluation panels across GD, Debate, and Mind Saga."
        statusText="Active Schedule"
      >
        <button
          onClick={() => fetchAllData(true)}
          disabled={loading || refreshing}
          className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          title="Refresh schedule"
          aria-label="Refresh schedule"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {/* Participant Timeline Lookup */}
        <button
          onClick={() => handleOpenParticipantLookup(null)}
          className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Clock size={14} className="text-primary-blue" />
          <span>Participant Itinerary</span>
        </button>

        {/* Add Slot Button (Managers only) */}
        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Slot</span>
          </button>
        )}
      </VerbafestHeader>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          icon={Calendar}
          title="Total Slots"
          value={metrics.total}
          subtitle="All scheduled sessions"
          loading={loading}
          color="blue"
        />
        <StatCard
          icon={Users}
          title="Allocated Attendees"
          value={metrics.totalAllocatedAttendees}
          subtitle="Participants placed in slots"
          loading={loading}
          color="emerald"
        />
        <StatCard
          icon={Layers}
          title="GD & Debate Slots"
          value={`${metrics.gdCount + metrics.debateCount}`}
          subtitle={`${metrics.gdCount} GD • ${metrics.debateCount} Debate`}
          loading={loading}
          color="purple"
        />
        <StatCard
          icon={Brain}
          title="Mind Saga Slots"
          value={metrics.mindsagaCount}
          subtitle="Tech and quiz tracks"
          loading={loading}
          color="amber"
        />
      </div>

      {/* 3. Date Navigation Pills (If multiple dates exist) */}
      {uniqueDates.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1 shrink-0">
            Event Date:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedDate === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
            }`}
          >
            All Dates ({slots.length})
          </button>
          {uniqueDates.map((dateStr) => {
            const count = slots.filter((s) => getDateKey(s.start_time) === dateStr).length;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedDate === dateStr
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                }`}
              >
                {formatDateOnly(dateStr)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Filters & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by slot code, label, panel, room…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Format */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
          >
            {EVENT_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Panel */}
          <select
            value={selectedPanelId}
            onChange={(e) => setSelectedPanelId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Panels</option>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.panel_code} ({p.name})
              </option>
            ))}
          </select>

          {/* Room */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer max-w-[150px] truncate"
          >
            <option value="all">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_code} ({r.name})
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="hidden sm:inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Cards view"
              aria-label="Cards view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Schedule Content */}
      {loading ? (
        <div className="py-20">
          <VerbafestLoader message="Loading VERBAFEST schedule…" />
        </div>
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={hasActiveFilters ? 'No Matching Slots' : 'No Schedule Slots Configured'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search filters or selecting another date.'
              : 'Create your first schedule slot to coordinate GD, Debate, and Mind Saga event sessions.'
          }
          actionLabel={canManage && !hasActiveFilters ? 'Add Slot' : hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={canManage && !hasActiveFilters ? handleOpenCreate : hasActiveFilters ? handleResetFilters : undefined}
        />
      ) : viewMode === 'grid' ? (
        /* Timeline / Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSlots.map((slot) => (
            <ScheduleSlotCard
              key={slot.id}
              slot={slot}
              canManage={canManage}
              onViewDetails={handleOpenDetails}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteSlot}
            />
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4">Slot Code</th>
                  <th className="py-3.5 px-4">Format</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Timing Window</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Venue Room</th>
                  <th className="py-3.5 px-4">Panel</th>
                  <th className="py-3.5 px-4 text-center">Attendees</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 text-xs">
                {filteredSlots.map((slot) => {
                  const attendeeCount = Number(slot.allocated_participants_count) || 0;

                  return (
                    <tr
                      key={slot.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-50">
                        {slot.slot_code}
                      </td>

                      {/* Format */}
                      <td className="py-3 px-4">
                        <EventBadge event={slot.event_type} size="sm" />
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-medium text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
                        {slot.slot_label}
                      </td>

                      {/* Timing */}
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-primary-blue shrink-0" />
                          <span>{formatTimeRange(slot.start_time, slot.end_time)}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatDateOnly(slot.start_time)}
                      </td>

                      {/* Room */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <DoorOpen size={13} className="text-primary-blue shrink-0" />
                          <span className="font-mono font-bold">{slot.room_code || 'None'}</span>
                          {slot.room_name && (
                            <span className="text-zinc-400 truncate max-w-[120px]">({slot.room_name})</span>
                          )}
                        </div>
                      </td>

                      {/* Panel */}
                      <td className="py-3 px-4">
                        {slot.panel_code ? (
                          <div className="flex items-center gap-1.5">
                            <Layers size={13} className="text-primary-blue shrink-0" />
                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{slot.panel_code}</span>
                            {slot.panel_status && <PanelStatusBadge status={slot.panel_status} size="sm" />}
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Attendees count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            attendeeCount > 0
                              ? 'bg-primary-blue/10 text-primary-blue'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Users size={12} />
                          <span>{attendeeCount}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(slot.id)}
                            className="p-1.5 text-zinc-500 hover:text-primary-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="View slot details"
                            aria-label="View details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit / Delete (Managers) */}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(slot)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                                title="Edit slot"
                                aria-label="Edit slot"
                              >
                                <Edit size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot)}
                                className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                                title="Delete slot"
                                aria-label="Delete slot"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      {/* Create / Edit Slot Modal */}
      <AddEditScheduleModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        slot={editingSlot}
        panels={panels}
        rooms={rooms}
        onSuccess={() => fetchAllData(true)}
        onConflict={handleConflictDetected}
      />

      {/* Slot Details Modal */}
      <ScheduleSlotDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        slotId={detailSlotId}
        canManage={canManage}
        onRefreshParent={() => fetchAllData(true)}
        onOpenEdit={(slot) => {
          setEditingSlot(slot);
          setIsAddEditOpen(true);
        }}
        onOpenParticipantTimeline={(participantId) => {
          handleOpenParticipantLookup(participantId);
        }}
      />

      {/* Participant Schedule Lookup Modal */}
      <ParticipantScheduleModal
        isOpen={isParticipantModalOpen}
        onClose={() => {
          setIsParticipantModalOpen(false);
          setParticipantLookupId(null);
        }}
        initialParticipantId={participantLookupId}
        onSelectSlot={(slotId) => {
          setIsParticipantModalOpen(false);
          handleOpenDetails(slotId);
        }}
      />

      {/* Conflict Alert Modal */}
      <ConflictAlertModal
        isOpen={isConflictOpen}
        onClose={() => {
          setIsConflictOpen(false);
          setConflictData(null);
        }}
        conflictData={conflictData}
        errorTitle={conflictErrorTitle}
      />
    </div>
  );
};

export default ScheduleManagementPage;
