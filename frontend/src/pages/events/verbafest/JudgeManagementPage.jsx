import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Award,
  Plus,
  Search,
  User,
  UserCheck,
  Mail,
  Phone,
  Edit,
  RefreshCw,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Layers
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  EventBadge,
  EmptyState,
  VerbafestLoader,
  AddEditJudgeModal,
  JudgeDetailsModal,
  AssignJudgeModal
} from './components';

const EVENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Qualifications' },
  { value: 'both', label: 'Both (GD & Debate)' },
  { value: 'gd', label: 'GD Only' },
  { value: 'debate', label: 'Debate Only' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'internal', label: 'Internal (Mavericks)' },
  { value: 'external', label: 'External Judges' },
];

const ASSIGNMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Assignments' },
  { value: 'assigned', label: 'Assigned to Panels' },
  { value: 'unassigned', label: 'Unassigned (Available)' },
];

/**
 * JudgeManagementPage
 * VERBAFEST 2026 Phase 3B-3: Judge Management Screen.
 * Manages internal/external judges, qualifications, credentials, and panel bindings.
 */
const JudgeManagementPage = () => {
  const { user } = useAuth();

  // Role authorization: coordinators, core_members, or explicit VERBAFEST permissions
  const canManage = user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [judges, setJudges] = useState([]);
  const [panels, setPanels] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailJudgeId, setDetailJudgeId] = useState(null);

  const [isAssignPanelOpen, setIsAssignPanelOpen] = useState(false);
  const [targetJudgeForPanel, setTargetJudgeForPanel] = useState(null);

  // Fetch judges, panels, and members
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [judgesRes, panelsRes, membersRes] = await Promise.all([
        axios.get('/events/verbafest/judges'),
        axios.get('/events/verbafest/panels').catch(() => ({ data: { data: [] } })),
        axios.get('/members').catch(() => ({ data: [] })),
      ]);

      setJudges(Array.isArray(judgesRes.data?.data) ? judgesRes.data.data : []);
      setPanels(Array.isArray(panelsRes.data?.data) ? panelsRes.data.data : []);
      // members endpoint returns an array directly
      const memData = membersRes.data;
      setMembers(Array.isArray(memData) ? memData : (Array.isArray(memData?.data) ? memData.data : []));
    } catch (err) {
      console.error('Failed to load judge management data:', err);
      toast.error('Failed to load judges data. Please try again.');
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
    const total = judges.length;
    let internalCount = 0;
    let externalCount = 0;
    let assignedCount = 0;
    let unassignedCount = 0;
    let bothCount = 0;
    let gdCount = 0;
    let debateCount = 0;

    judges.forEach((j) => {
      if (j.user_id !== null && j.user_id !== undefined) internalCount += 1;
      else externalCount += 1;

      const panelCount = Number(j.assigned_panel_count) || 0;
      if (panelCount > 0) assignedCount += 1;
      else unassignedCount += 1;

      if (j.event_type === 'both') bothCount += 1;
      else if (j.event_type === 'gd') gdCount += 1;
      else if (j.event_type === 'debate') debateCount += 1;
    });

    return {
      total,
      internalCount,
      externalCount,
      assignedCount,
      unassignedCount,
      bothCount,
      gdCount,
      debateCount,
    };
  }, [judges]);

  // Filtered judges
  const filteredJudges = useMemo(() => {
    return judges.filter((j) => {
      // Search by name, email, designation
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (j.name || '').toLowerCase().includes(q);
        const emailMatch = (j.email || '').toLowerCase().includes(q);
        const desigMatch = (j.designation || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !desigMatch) return false;
      }

      // Event qualification
      if (selectedEvent !== 'all' && j.event_type !== selectedEvent) {
        return false;
      }

      // Internal vs External
      if (selectedType === 'internal' && (!j.user_id || j.user_id === null)) {
        return false;
      }
      if (selectedType === 'external' && j.user_id) {
        return false;
      }

      // Assignment
      const panelCount = Number(j.assigned_panel_count) || 0;
      if (selectedAssignment === 'assigned' && panelCount === 0) {
        return false;
      }
      if (selectedAssignment === 'unassigned' && panelCount > 0) {
        return false;
      }

      return true;
    });
  }, [judges, searchQuery, selectedEvent, selectedType, selectedAssignment]);

  // Handlers
  const handleOpenCreate = () => {
    if (!canManage) return;
    setEditingJudge(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (judge) => {
    if (!canManage) return;
    setEditingJudge(judge);
    setIsAddEditOpen(true);
  };

  const handleOpenDetails = (judgeId) => {
    setDetailJudgeId(judgeId);
    setIsDetailsOpen(true);
  };

  const handleOpenAssignPanel = (judge) => {
    if (!canManage) return;
    setTargetJudgeForPanel(judge);
    setIsAssignPanelOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEvent('all');
    setSelectedType('all');
    setSelectedAssignment('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedEvent !== 'all' || selectedType !== 'all' || selectedAssignment !== 'all';

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <VerbafestHeader
        title="Judges & Adjudicators"
        description="Manage internal and external adjudicators, event qualifications, access credentials, and panel assignments."
        statusText="Adjudication Master"
      >
        <button
          onClick={() => fetchAllData(true)}
          disabled={loading || refreshing}
          className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          title="Refresh judges list"
          aria-label="Refresh judges"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Judge</span>
          </button>
        )}
      </VerbafestHeader>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          icon={Award}
          title="Total Judges"
          value={metrics.total}
          subtitle={`${metrics.bothCount} Both • ${metrics.gdCount} GD • ${metrics.debateCount} Debate`}
          loading={loading}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          title="Assigned to Panels"
          value={metrics.assignedCount}
          subtitle={`${metrics.unassignedCount} currently available`}
          loading={loading}
          color="emerald"
        />
        <StatCard
          icon={UserCheck}
          title="Internal Mavericks"
          value={metrics.internalCount}
          subtitle="Linked platform users"
          loading={loading}
          color="amber"
        />
        <StatCard
          icon={User}
          title="External Judges"
          value={metrics.externalCount}
          subtitle="Invited guest evaluators"
          loading={loading}
          color="purple"
        />
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by judge name, email, designation…"
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

          {/* Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Assignment */}
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
          >
            {ASSIGNMENT_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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

      {/* 4. Judges Content */}
      {loading ? (
        <div className="py-20">
          <VerbafestLoader message="Loading judges and evaluators…" />
        </div>
      ) : filteredJudges.length === 0 ? (
        <EmptyState
          icon={Award}
          title={hasActiveFilters ? 'No Matching Judges' : 'No Judges Registered'}
          description={
            hasActiveFilters
              ? 'Try modifying your search or clearing active filters.'
              : 'Register your first internal or external evaluator to begin staffing GD and Debate panels.'
          }
          actionLabel={canManage && !hasActiveFilters ? 'Add Judge' : hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={canManage && !hasActiveFilters ? handleOpenCreate : hasActiveFilters ? handleResetFilters : undefined}
        />
      ) : viewMode === 'table' ? (
        /* Desktop Table View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4">Judge Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Qualification</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-center">Panels</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 text-xs">
                {filteredJudges.map((judge) => {
                  const isInternal = Boolean(judge.user_id);
                  const panelCount = Number(judge.assigned_panel_count) || 0;

                  return (
                    <tr
                      key={judge.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Name & Designation */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-50 block">
                            {judge.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate block max-w-[200px]">
                            {judge.designation || 'Adjudicator'}
                          </span>
                        </div>
                      </td>

                      {/* Type: Internal vs External */}
                      <td className="py-3 px-4">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue dark:text-blue-400 border border-blue-500/20">
                            <UserCheck size={11} />
                            <span>Internal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <User size={11} />
                            <span>External</span>
                          </span>
                        )}
                      </td>

                      {/* Qualification */}
                      <td className="py-3 px-4">
                        <EventBadge event={judge.event_type} size="sm" />
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
                          <a
                            href={`mailto:${judge.email}`}
                            className="text-primary-blue hover:underline flex items-center gap-1.5 font-medium truncate max-w-[200px]"
                          >
                            <Mail size={12} className="shrink-0 text-zinc-400" />
                            <span>{judge.email}</span>
                          </a>
                          {judge.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                              <Phone size={11} className="shrink-0 text-zinc-400" />
                              <span>{judge.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Panels Count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            panelCount > 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Layers size={11} />
                          <span>{panelCount} {panelCount === 1 ? 'panel' : 'panels'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details for everyone */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(judge.id)}
                            className="p-1.5 text-zinc-500 hover:text-primary-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="View judge details"
                            aria-label="View details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Mutation actions only for managers */}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignPanel(judge)}
                                className="p-1.5 text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                                title="Assign judge to panel"
                                aria-label="Assign to panel"
                              >
                                <Layers size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(judge)}
                                className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                                title="Edit judge profile"
                                aria-label="Edit judge"
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
          {filteredJudges.map((judge) => {
            const isInternal = Boolean(judge.user_id);
            const panelCount = Number(judge.assigned_panel_count) || 0;

            return (
              <div
                key={judge.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {isInternal ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue dark:text-blue-400 border border-blue-500/20">
                          <UserCheck size={11} />
                          <span>Internal</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <User size={11} />
                          <span>External</span>
                        </span>
                      )}
                    </div>
                    <EventBadge event={judge.event_type} size="sm" />
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {judge.name}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {judge.designation || 'Adjudicator'}
                  </p>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail size={13} className="text-zinc-400 shrink-0" />
                      <a href={`mailto:${judge.email}`} className="text-primary-blue hover:underline truncate">
                        {judge.email}
                      </a>
                    </div>
                    {judge.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-zinc-400 shrink-0" />
                        <span>{judge.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-400">Assignments:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Layers size={12} />
                        <span>{panelCount} {panelCount === 1 ? 'Panel' : 'Panels'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(judge.id)}
                    className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>View Profile</span>
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignPanel(judge)}
                        className="p-1.5 text-zinc-500 hover:text-amber-600 rounded-lg transition cursor-pointer"
                        title="Assign to panel"
                      >
                        <Layers size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(judge)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition cursor-pointer"
                        title="Edit profile"
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
      {/* Create / Edit Judge Modal */}
      <AddEditJudgeModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        judge={editingJudge}
        members={members}
        onSuccess={() => fetchAllData(true)}
      />

      {/* Assign Panel to Judge Modal */}
      <AssignJudgeModal
        isOpen={isAssignPanelOpen}
        onClose={() => setIsAssignPanelOpen(false)}
        judge={targetJudgeForPanel}
        panelsList={panels}
        onSuccess={() => fetchAllData(true)}
      />

      {/* Judge Details Modal */}
      <JudgeDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        judgeId={detailJudgeId}
        canManage={canManage}
        onRefreshParent={() => fetchAllData(true)}
        onOpenEdit={(judge) => {
          setEditingJudge(judge);
          setIsAddEditOpen(true);
        }}
        onOpenAssignPanel={(judge) => {
          setTargetJudgeForPanel(judge);
          setIsAssignPanelOpen(true);
        }}
      />
    </div>
  );
};

export default JudgeManagementPage;
