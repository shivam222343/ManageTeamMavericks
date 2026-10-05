import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  Mail,
  Phone,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  School,
  X
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  AttendanceBadge,
  EmptyState,
  VerbafestLoader,
  CheckinConfirmModal,
  ParticipantDetailModal,
  ParticipantRegistrations
} from './components';

const REG_FILTER_OPTIONS = [
  { value: 'all', label: 'All Registrations' },
  { value: 'gd', label: 'GD (Group Discussion)' },
  { value: 'debate', label: 'Debate' },
  { value: 'mindsaga', label: 'Mind Saga' },
];

const CHECKIN_FILTER_OPTIONS = [
  { value: 'all', label: 'All Check-in Statuses' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'not_arrived', label: 'Not Arrived (Pending)' },
  { value: 'completed', label: 'Completed' },
  { value: 'disqualified', label: 'Disqualified' },
];

/**
 * ParticipantManagementPage
 * VERBAFEST 2026 Phase 3B-2: Participant Management Console.
 * Manages participant registrations, search, filtering, detailed profiles, and on-site check-in.
 */
const ParticipantManagementPage = () => {
  const { user } = useAuth();

  // Role authorization: Only coordinators, core_members, or users with explicit VERBAFEST permissions
  const canCheckin = user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState('all');
  const [selectedCheckin, setSelectedCheckin] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('');

  // Metrics summary
  const [metrics, setMetrics] = useState({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    gd: 0,
    debate: 0,
    mindSaga: 0,
  });

  // Modal states
  const [detailParticipant, setDetailParticipant] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [confirmCheckinParticipant, setConfirmCheckinParticipant] = useState(null);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch summary metrics via Phase 2 API count query params
  const fetchMetrics = useCallback(async () => {
    try {
      const [allRes, checkedRes, notArrivedRes, gdRes, debateRes, msRes] = await Promise.all([
        axios.get('/events/verbafest/participants?limit=1'),
        axios.get('/events/verbafest/participants?limit=1&checkin_status=checked_in'),
        axios.get('/events/verbafest/participants?limit=1&checkin_status=not_arrived'),
        axios.get('/events/verbafest/participants?limit=1&reg_gd=1'),
        axios.get('/events/verbafest/participants?limit=1&reg_debate=1'),
        axios.get('/events/verbafest/participants?limit=1&reg_mindsaga=1'),
      ]);

      setMetrics({
        total: allRes.data?.pagination?.total ?? 0,
        checkedIn: checkedRes.data?.pagination?.total ?? 0,
        notCheckedIn: notArrivedRes.data?.pagination?.total ?? 0,
        gd: gdRes.data?.pagination?.total ?? 0,
        debate: debateRes.data?.pagination?.total ?? 0,
        mindSaga: msRes.data?.pagination?.total ?? 0,
      });
    } catch (err) {
      console.warn('Could not load separate metric counts, using local list stats:', err);
    }
  }, []);

  // Fetch paginated participants list
  const fetchParticipants = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = {
        page,
        limit,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (selectedReg === 'gd') params.reg_gd = 1;
      if (selectedReg === 'debate') params.reg_debate = 1;
      if (selectedReg === 'mindsaga') params.reg_mindsaga = 1;

      if (selectedCheckin !== 'all') {
        params.checkin_status = selectedCheckin;
      }
      if (collegeFilter.trim()) {
        params.college = collegeFilter.trim();
      }

      const res = await axios.get('/events/verbafest/participants', { params });
      const data = res.data?.data || [];
      const pagination = res.data?.pagination || {};

      setParticipants(Array.isArray(data) ? data : []);
      setTotalCount(pagination.total ?? (Array.isArray(data) ? data.length : 0));
      setTotalPages(pagination.total_pages ?? Math.max(1, Math.ceil((pagination.total || 0) / limit)));
    } catch (err) {
      console.error('Failed to load participants:', err);
      toast.error('Failed to load participants list. Please check connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, debouncedSearch, selectedReg, selectedCheckin, collegeFilter]);

  // Initial load & when filters change
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Handle modal interactions
  const handleOpenDetail = (participant) => {
    setDetailParticipant(participant);
    setIsDetailOpen(true);
  };

  const handleOpenCheckin = (participant) => {
    if (!canCheckin) {
      toast.error('You do not have permission to perform participant check-ins.');
      return;
    }
    setConfirmCheckinParticipant(participant);
    setIsCheckinOpen(true);
  };

  // On successful check-in
  const handleCheckinSuccess = (updatedParticipant) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p))
    );
    if (detailParticipant?.id === updatedParticipant.id) {
      setDetailParticipant((prev) => ({ ...prev, ...updatedParticipant }));
    }
    fetchMetrics();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedReg('all');
    setSelectedCheckin('all');
    setCollegeFilter('');
    setPage(1);
  };

  const isFiltered = Boolean(debouncedSearch || selectedReg !== 'all' || selectedCheckin !== 'all' || collegeFilter);

  // Fallback metrics if API count call failed
  const displayMetrics = useMemo(() => {
    if (metrics.total > 0) return metrics;
    let gd = 0, debate = 0, mindSaga = 0, checked = 0, notChecked = 0;
    participants.forEach((p) => {
      if (Number(p.reg_gd)) gd++;
      if (Number(p.reg_debate)) debate++;
      if (Number(p.reg_mindsaga)) mindSaga++;
      if (p.checkin_status === 'checked_in') checked++;
      else notChecked++;
    });
    return {
      total: totalCount || participants.length,
      checkedIn: checked,
      notCheckedIn: notChecked,
      gd,
      debate,
      mindSaga,
    };
  }, [metrics, participants, totalCount]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <VerbafestHeader
        title="Participants"
        description="Manage VERBAFEST registrations, check-ins, attendee credentials and event allocations."
        eventStatus="VERBAFEST 2026"
      >
        <button
          type="button"
          onClick={() => {
            fetchParticipants(true);
            fetchMetrics();
          }}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
          title="Refresh participants list"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary-blue' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </VerbafestHeader>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        <StatCard
          icon={Users}
          title="Total Registered"
          value={displayMetrics.total}
          subtitle="All confirmed candidates"
          loading={loading && metrics.total === 0}
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          title="Checked In"
          value={displayMetrics.checkedIn}
          subtitle="Arrived on venue"
          loading={loading && metrics.total === 0}
          color="emerald"
        />
        <StatCard
          icon={UserX}
          title="Not Checked In"
          value={displayMetrics.notCheckedIn}
          subtitle="Awaiting arrival"
          loading={loading && metrics.total === 0}
          color="amber"
        />
        <StatCard
          icon={Sparkles}
          title="GD Enrolled"
          value={displayMetrics.gd}
          subtitle="Group Discussion"
          loading={loading && metrics.total === 0}
          color="blue"
        />
        <StatCard
          icon={Sparkles}
          title="Debate Enrolled"
          value={displayMetrics.debate}
          subtitle="Debate rounds"
          loading={loading && metrics.total === 0}
          color="violet"
        />
        <StatCard
          icon={Sparkles}
          title="Mind Saga"
          value={displayMetrics.mindSaga}
          subtitle="Lab assessment"
          loading={loading && metrics.total === 0}
          color="amber"
        />
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search code, name, email, phone, PRN, or college…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Registration Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedReg}
              onChange={(e) => {
                setSelectedReg(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
            >
              {REG_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Check-in Status Filter */}
            <select
              value={selectedCheckin}
              onChange={(e) => {
                setSelectedCheckin(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
            >
              {CHECKIN_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Table & Cards Display */}
      {loading ? (
        <VerbafestLoader type="table" count={8} />
      ) : participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isFiltered ? 'No matching participants found' : 'No participants registered yet'}
          description={
            isFiltered
              ? 'Try modifying your search query or resetting filters.'
              : 'Registered candidates will appear here as they sign up for VERBAFEST 2026.'
          }
          action={
            isFiltered ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : null
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/70 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-mono font-black tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4">Participant Code</th>
                    <th className="py-3.5 px-4">Name & PRN</th>
                    <th className="py-3.5 px-4">College</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Registration</th>
                    <th className="py-3.5 px-4">Check-in</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {participants.map((p) => {
                    const isCheckedIn = p.checkin_status === 'checked_in';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition group cursor-pointer"
                        onClick={() => handleOpenDetail(p)}
                      >
                        {/* Code */}
                        <td className="py-3.5 px-4 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(p)}
                            className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary-blue hover:text-primary-blue transition cursor-pointer text-left"
                          >
                            {p.participant_code}
                          </button>
                        </td>

                        {/* Name & PRN */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-primary-blue transition-colors">
                            {p.full_name}
                          </div>
                          {p.prn && (
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              PRN: {p.prn}
                            </div>
                          )}
                        </td>

                        {/* College */}
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
                          {p.college || 'KIT College of Engineering'}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 space-y-0.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <Mail size={12} className="text-zinc-400 shrink-0" />
                            <a
                              href={`mailto:${p.email}`}
                              className="hover:text-primary-blue hover:underline truncate max-w-[170px]"
                            >
                              {p.email}
                            </a>
                          </div>
                          {p.phone && (
                            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                              <Phone size={11} className="text-zinc-400 shrink-0" />
                              <a href={`tel:${p.phone}`} className="hover:underline">
                                {p.phone}
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Registration combinations */}
                        <td className="py-3.5 px-4">
                          <ParticipantRegistrations
                            regGd={p.reg_gd}
                            regDebate={p.reg_debate}
                            regMindsaga={p.reg_mindsaga}
                            size="sm"
                          />
                        </td>

                        {/* Check-in status */}
                        <td className="py-3.5 px-4">
                          <AttendanceBadge status={p.checkin_status} size="sm" />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {!isCheckedIn && canCheckin && (
                              <button
                                type="button"
                                onClick={() => handleOpenCheckin(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition cursor-pointer"
                                title="Check In Participant"
                              >
                                <UserCheck size={13} />
                                <span>Check In</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(p)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                              title="View Participant Details"
                              aria-label={`View details for ${p.full_name}`}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack */}
          <div className="block md:hidden space-y-3.5">
            {participants.map((p) => {
              const isCheckedIn = p.checkin_status === 'checked_in';

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3"
                  onClick={() => handleOpenDetail(p)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/80">
                        {p.participant_code}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 font-display mt-1.5">
                        {p.full_name}
                      </h4>
                      {p.prn && (
                        <p className="text-[10px] font-mono text-zinc-400">PRN: {p.prn}</p>
                      )}
                    </div>
                    <AttendanceBadge status={p.checkin_status} size="sm" />
                  </div>

                  {p.college && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                      <School size={12} className="shrink-0 text-zinc-400" />
                      <span className="truncate">{p.college}</span>
                    </p>
                  )}

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <ParticipantRegistrations
                      regGd={p.reg_gd}
                      regDebate={p.reg_debate}
                      regMindsaga={p.reg_mindsaga}
                      size="sm"
                    />

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isCheckedIn && canCheckin && (
                        <button
                          type="button"
                          onClick={() => handleOpenCheckin(p)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm transition"
                        >
                          Check In
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(p)}
                        className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500"
                        aria-label="View details"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Pagination Bar */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono">
              Showing <strong className="text-zinc-800 dark:text-zinc-200">{(page - 1) * limit + 1}</strong> to{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {Math.min(page * limit, totalCount)}
              </strong>{' '}
              of <strong className="text-zinc-800 dark:text-zinc-200">{totalCount}</strong> participants
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer font-bold"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer font-bold"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 6. Modals */}
      <ParticipantDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        participant={detailParticipant}
        onCheckin={handleOpenCheckin}
        canCheckin={canCheckin}
      />

      <CheckinConfirmModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        participant={confirmCheckinParticipant}
        onSuccess={handleCheckinSuccess}
      />
    </div>
  );
};

export default ParticipantManagementPage;
