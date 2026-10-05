import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Layers,
  Plus,
  Search,
  Users,
  DoorOpen,
  Award,
  Edit,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Clock,
  UserX
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  EventBadge,
  PanelStatusBadge,
  EmptyState,
  VerbafestLoader,
  AddEditPanelModal,
  ChangeRoomModal,
  AssignJudgeModal,
  PanelDetailsModal
} from './components';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'FREE', label: 'Free' },
  { value: 'READY', label: 'Ready' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'BREAK', label: 'Break' },
  { value: 'JUDGES_ABSENT', label: 'Judges Absent' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'gd', label: 'GD (Group Discussion)' },
  { value: 'debate', label: 'Debate' },
];

/**
 * PanelManagementPage
 * VERBAFEST 2026 Phase 3B-3: Panel Management Screen.
 * Manages GD & Debate evaluation panels, room assignments, operational statuses, and judges.
 */
const PanelManagementPage = () => {
  const { user } = useAuth();

  // Role authorization: coordinators, core_members, or explicit VERBAFEST permissions
  const canManage = user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [panels, setPanels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailPanelId, setDetailPanelId] = useState(null);

  const [isChangeRoomOpen, setIsChangeRoomOpen] = useState(false);
  const [targetPanelForRoom, setTargetPanelForRoom] = useState(null);

  const [isAssignJudgeOpen, setIsAssignJudgeOpen] = useState(false);
  const [targetPanelForJudge, setTargetPanelForJudge] = useState(null);

  // Fetch panels, rooms, and judges
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [panelsRes, roomsRes, judgesRes] = await Promise.all([
        axios.get('/events/verbafest/panels'),
        axios.get('/events/verbafest/rooms').catch(() => ({ data: { data: [] } })),
        axios.get('/events/verbafest/judges').catch(() => ({ data: { data: [] } })),
      ]);

      setPanels(Array.isArray(panelsRes.data?.data) ? panelsRes.data.data : []);
      setRooms(Array.isArray(roomsRes.data?.data) ? roomsRes.data.data : []);
      setJudges(Array.isArray(judgesRes.data?.data) ? judgesRes.data.data : []);
    } catch (err) {
      console.error('Failed to load panel management data:', err);
      toast.error('Failed to load panels data. Please try again.');
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
    let total = panels.length;
    let gdCount = 0;
    let debateCount = 0;
    let freeCount = 0;
    let occupiedCount = 0;
    let breakCount = 0;
    let absentCount = 0;

    panels.forEach((p) => {
      if (p.event_type === 'gd') gdCount += 1;
      if (p.event_type === 'debate') debateCount += 1;

      const st = String(p.status || '').toUpperCase();
      if (st === 'FREE') freeCount += 1;
      else if (st === 'OCCUPIED') occupiedCount += 1;
      else if (st === 'BREAK') breakCount += 1;
      else if (st === 'JUDGES_ABSENT') absentCount += 1;
    });

    return {
      total,
      gdCount,
      debateCount,
      freeCount,
      occupiedCount,
      breakCount,
      absentCount,
    };
  }, [panels]);

  // Filtered panels
  const filteredPanels = useMemo(() => {
    return panels.filter((p) => {
      // Search by code, name, room name
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (p.panel_code || '').toLowerCase().includes(q);
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const roomMatch = (p.room_name || '').toLowerCase().includes(q) || (p.room_code || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !roomMatch) return false;
      }

      // Event type
      if (selectedEventType !== 'all' && p.event_type !== selectedEventType) {
        return false;
      }

      // Status
      if (selectedStatus !== 'all' && String(p.status || '').toUpperCase() !== selectedStatus) {
        return false;
      }

      // Room
      if (selectedRoomId !== 'all' && String(p.room_id) !== String(selectedRoomId)) {
        return false;
      }

      return true;
    });
  }, [panels, searchQuery, selectedEventType, selectedStatus, selectedRoomId]);

  // Handlers for modal actions
  const handleOpenCreate = () => {
    if (!canManage) return;
    setEditingPanel(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (panel) => {
    if (!canManage) return;
    setEditingPanel(panel);
    setIsAddEditOpen(true);
  };

  const handleOpenDetails = (panelId) => {
    setDetailPanelId(panelId);
    setIsDetailsOpen(true);
  };

  const handleOpenChangeRoom = (panel) => {
    if (!canManage) return;
    setTargetPanelForRoom(panel);
    setIsChangeRoomOpen(true);
  };

  const handleOpenAssignJudge = (panel) => {
    if (!canManage) return;
    setTargetPanelForJudge(panel);
    setIsAssignJudgeOpen(true);
  };

  const handleQuickStatusChange = async (panelId, newStatus) => {
    if (!canManage) return;
    const toastId = toast.loading(`Updating status to ${newStatus}…`);
    try {
      await axios.patch(`/events/verbafest/panels/${panelId}/status`, {
        status: newStatus,
      });
      setPanels((prev) =>
        prev.map((p) => (p.id === panelId ? { ...p, status: newStatus } : p))
      );
      toast.success('Status updated.', { id: toastId });
    } catch (err) {
      console.error('Failed to change status:', err);
      toast.error(err.response?.data?.error || 'Failed to update status.', { id: toastId });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEventType('all');
    setSelectedStatus('all');
    setSelectedRoomId('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedEventType !== 'all' || selectedStatus !== 'all' || selectedRoomId !== 'all';

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <VerbafestHeader
        title="Evaluation Panels"
        description="Configure Group Discussion and Debate evaluation panels, room allocations, live operational status, and assigned judges."
        statusText="Active Panels"
      >
        <button
          onClick={() => fetchAllData(true)}
          disabled={loading || refreshing}
          className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          title="Refresh panels list"
          aria-label="Refresh panels"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Panel</span>
          </button>
        )}
      </VerbafestHeader>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          icon={Layers}
          title="Total Panels"
          value={metrics.total}
          subtitle={`${metrics.gdCount} GD • ${metrics.debateCount} Debate`}
          loading={loading}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          title="Available / Free"
          value={metrics.freeCount}
          subtitle="Ready for new group"
          loading={loading}
          color="emerald"
        />
        <StatCard
          icon={Users}
          title="Occupied"
          value={metrics.occupiedCount}
          subtitle="Evaluations currently in session"
          loading={loading}
          color="amber"
        />
        <StatCard
          icon={metrics.absentCount > 0 ? UserX : Clock}
          title={metrics.absentCount > 0 ? 'Judges Absent' : 'On Break'}
          value={metrics.absentCount > 0 ? metrics.absentCount : metrics.breakCount}
          subtitle={metrics.absentCount > 0 ? 'Urgent: adjudicators missing' : 'Panels paused for recess'}
          loading={loading}
          color={metrics.absentCount > 0 ? 'rose' : 'zinc'}
        />
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by panel code, name, room…"
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
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Room filter */}
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer max-w-[160px] truncate"
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
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Panels Content */}
      {loading ? (
        <div className="py-20">
          <VerbafestLoader message="Loading evaluation panels…" />
        </div>
      ) : filteredPanels.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={hasActiveFilters ? 'No Matching Panels' : 'No Panels Configured'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search criteria or clearing active filters.'
              : 'Create your first GD or Debate evaluation panel to begin assigning rooms and adjudicators.'
          }
          actionLabel={canManage && !hasActiveFilters ? 'Add Panel' : hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={canManage && !hasActiveFilters ? handleOpenCreate : hasActiveFilters ? handleResetFilters : undefined}
        />
      ) : viewMode === 'table' ? (
        /* Desktop Table View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4">Panel Code</th>
                  <th className="py-3.5 px-4">Format</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Venue Room</th>
                  <th className="py-3.5 px-4 text-center">Capacity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Judges</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 text-xs">
                {filteredPanels.map((panel) => {
                  const judgeCount = Number(panel.judge_count) || 0;

                  return (
                    <tr
                      key={panel.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-50">
                        {panel.panel_code}
                      </td>

                      {/* Format */}
                      <td className="py-3 px-4">
                        <EventBadge event={panel.event_type} size="sm" />
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        {panel.name}
                      </td>

                      {/* Room */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <DoorOpen size={14} className="text-primary-blue shrink-0" />
                          <span className="font-mono font-bold">{panel.room_code || 'None'}</span>
                          {panel.room_name && (
                            <span className="text-zinc-400 truncate max-w-[130px]">({panel.room_name})</span>
                          )}
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-4 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                        {panel.capacity} seats
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {canManage ? (
                          <div className="relative inline-block">
                            <select
                              value={panel.status}
                              onChange={(e) => handleQuickStatusChange(panel.id, e.target.value)}
                              className="text-[11px] font-bold py-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary-blue cursor-pointer"
                            >
                              {STATUS_FILTER_OPTIONS.filter((s) => s.value !== 'all').map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <PanelStatusBadge status={panel.status} size="sm" />
                        )}
                      </td>

                      {/* Judges Count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            judgeCount > 0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Award size={12} />
                          <span>{judgeCount}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details for everyone */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(panel.id)}
                            className="p-1.5 text-zinc-500 hover:text-primary-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="View panel details"
                            aria-label="View details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Mutation actions only for managers */}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignJudge(panel)}
                                className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                                title="Assign judge to panel"
                                aria-label="Assign judge"
                              >
                                <Award size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenChangeRoom(panel)}
                                className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                                title="Change room"
                                aria-label="Change room"
                              >
                                <DoorOpen size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(panel)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                                title="Edit panel settings"
                                aria-label="Edit panel"
                              >
                                <Edit size={15} />
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
      ) : (
        /* Mobile / Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPanels.map((panel) => {
            const judgeCount = Number(panel.judge_count) || 0;

            return (
              <div
                key={panel.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
                      {panel.panel_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <EventBadge event={panel.event_type} size="sm" />
                      <PanelStatusBadge status={panel.status} size="sm" />
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {panel.name}
                  </h4>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <DoorOpen size={14} className="text-primary-blue shrink-0" />
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {panel.room_code || 'No Room'}
                      </span>
                      {panel.room_name && <span>({panel.room_name})</span>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span>Capacity: {panel.capacity} seats</span>
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Award size={12} />
                        <span>{judgeCount} {judgeCount === 1 ? 'Judge' : 'Judges'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(panel.id)}
                    className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignJudge(panel)}
                        className="p-1.5 text-zinc-500 hover:text-amber-600 rounded-lg transition cursor-pointer"
                        title="Assign judge"
                      >
                        <Award size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenChangeRoom(panel)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                        title="Change room"
                      >
                        <DoorOpen size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(panel)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition cursor-pointer"
                        title="Edit panel"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modals */}
      {/* Create / Edit Panel Modal */}
      <AddEditPanelModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        panel={editingPanel}
        rooms={rooms}
        onSuccess={() => fetchAllData(true)}
      />

      {/* Change Room Modal */}
      <ChangeRoomModal
        isOpen={isChangeRoomOpen}
        onClose={() => setIsChangeRoomOpen(false)}
        panel={targetPanelForRoom}
        rooms={rooms}
        onSuccess={() => fetchAllData(true)}
      />

      {/* Assign Judge Modal */}
      <AssignJudgeModal
        isOpen={isAssignJudgeOpen}
        onClose={() => setIsAssignJudgeOpen(false)}
        panel={targetPanelForJudge}
        judgesList={judges}
        onSuccess={() => fetchAllData(true)}
      />

      {/* Panel Details Modal */}
      <PanelDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        panelId={detailPanelId}
        canManage={canManage}
        onRefreshParent={() => fetchAllData(true)}
        onOpenEdit={(panel) => {
          setEditingPanel(panel);
          setIsAddEditOpen(true);
        }}
        onOpenChangeRoom={(panel) => {
          setTargetPanelForRoom(panel);
          setIsChangeRoomOpen(true);
        }}
        onOpenAssignJudge={(panel) => {
          setTargetPanelForJudge(panel);
          setIsAssignJudgeOpen(true);
        }}
      />
    </div>
  );
};

export default PanelManagementPage;
