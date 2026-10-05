import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Radio,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  VerbafestLoader,
  DashboardQuickActions,
  DashboardAlerts,
  DashboardLiveStatus,
  DashboardPanelBoard,
  DashboardRoomOverview,
  DashboardCheckinOverview,
  DashboardJudgeStatus,
  DashboardAllocationStatus
} from './components';

/**
 * VerbafestDashboardPage
 * VERBAFEST 2026 Phase 3B-6: Master Operational Command Center.
 * Event-day live coordination across attendees, check-in, group allocations,
 * schedule timeline, evaluation panels, venue rooms, and judge staffing.
 */
const VerbafestDashboardPage = () => {
  const { user } = useAuth();

  // Role authorization
  const canManage =
    user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Module data
  const [participants, setParticipants] = useState([]);
  const [participantTotal, setParticipantTotal] = useState(0);
  const [slots, setSlots] = useState([]);
  const [panels, setPanels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [judges, setJudges] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [settings, setSettings] = useState({});

  // API error tracking
  const [apiErrors, setApiErrors] = useState([]);

  // Auto-refresh timer ref
  const timerRef = useRef(null);

  // Fetch all operational data concurrently with graceful degradation
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    const errors = [];

    const results = await Promise.allSettled([
      axios.get('/events/verbafest/participants?limit=200'),
      axios.get('/events/verbafest/schedule'),
      axios.get('/events/verbafest/panels'),
      axios.get('/events/verbafest/rooms'),
      axios.get('/events/verbafest/judges'),
      axios.get('/events/verbafest/allocations'),
      axios.get('/events/verbafest/settings'),
    ]);

    // 0: Participants
    if (results[0].status === 'fulfilled') {
      const pData = results[0].value.data;
      setParticipants(Array.isArray(pData?.data) ? pData.data : []);
      setParticipantTotal(pData?.pagination?.total || (Array.isArray(pData?.data) ? pData.data.length : 0));
    } else {
      errors.push('Participants data could not be fetched.');
    }

    // 1: Schedule
    if (results[1].status === 'fulfilled') {
      setSlots(Array.isArray(results[1].value.data?.data) ? results[1].value.data.data : []);
    } else {
      errors.push('Schedule timeline could not be fetched.');
    }

    // 2: Panels
    if (results[2].status === 'fulfilled') {
      setPanels(Array.isArray(results[2].value.data?.data) ? results[2].value.data.data : []);
    } else {
      errors.push('Panels status could not be fetched.');
    }

    // 3: Rooms
    if (results[3].status === 'fulfilled') {
      setRooms(Array.isArray(results[3].value.data?.data) ? results[3].value.data.data : []);
    } else {
      errors.push('Room venues could not be fetched.');
    }

    // 4: Judges
    if (results[4].status === 'fulfilled') {
      setJudges(Array.isArray(results[4].value.data?.data) ? results[4].value.data.data : []);
    } else {
      errors.push('Judges roster could not be fetched.');
    }

    // 5: Allocations
    if (results[5].status === 'fulfilled') {
      setAllocations(Array.isArray(results[5].value.data?.data) ? results[5].value.data.data : []);
    } else {
      errors.push('Group allocations could not be fetched.');
    }

    // 6: Settings
    if (results[6].status === 'fulfilled') {
      setSettings(results[6].value.data?.settings || {});
    }

    setApiErrors(errors);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Periodic polling setup (30-second interval, only when autoRefresh is enabled)
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchDashboardData(true);
      }, 30000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchDashboardData]);

  // Manual refresh trigger
  const handleManualRefresh = () => {
    fetchDashboardData(true);
  };

  // Toggle event status (e.g. live, paused, scheduled) for coordinators
  const handleToggleEventStatus = async (newStatus) => {
    if (!canManage) return;
    try {
      await axios.put(`/events/verbafest/settings/event_status`, {
        setting_value: newStatus,
      });
      setSettings((prev) => ({ ...prev, event_status: newStatus }));
      toast.success(`Event status updated to: ${newStatus.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update event status.');
    }
  };

  // ----------------------------------------------------
  // Top KPI Metric Calculations
  // ----------------------------------------------------
  const kpis = useMemo(() => {
    const totalUnique = participantTotal || participants.length;
    const checkedInCount = participants.filter((p) => p.checkin_status === 'checked_in').length;
    const pendingCheckinCount = Math.max(0, totalUnique - checkedInCount);
    const checkinRate = totalUnique > 0 ? Math.round((checkedInCount / totalUnique) * 100) : 0;

    // Unique Event Registrations (non-double-counted)
    const gdRegs = participants.filter((p) => Boolean(p.reg_gd)).length;
    const debateRegs = participants.filter((p) => Boolean(p.reg_debate)).length;
    const mindsagaRegs = participants.filter((p) => Boolean(p.reg_mindsaga)).length;

    // Allocation tracking
    const allocatedParticipantIds = new Set(allocations.map((a) => Number(a.participant_id)));
    const uniqueAllocated = allocatedParticipantIds.size;

    let unallocatedCount = 0;
    participants.forEach((p) => {
      const isRegistered = Boolean(p.reg_gd) || Boolean(p.reg_debate) || Boolean(p.reg_mindsaga);
      if (isRegistered && !allocatedParticipantIds.has(Number(p.id))) {
        unallocatedCount++;
      }
    });

    return {
      totalUnique,
      checkedInCount,
      pendingCheckinCount,
      checkinRate,
      gdRegs,
      debateRegs,
      mindsagaRegs,
      uniqueAllocated,
      unallocatedCount,
    };
  }, [participants, participantTotal, allocations]);

  // ----------------------------------------------------
  // Operational Alerts Computation
  // ----------------------------------------------------
  const operationalAlerts = useMemo(() => {
    const alerts = [];
    const nowMs = Date.now();

    // 1. Panels with 0 assigned judges
    panels.forEach((p) => {
      const jCount = Number(p.judge_count) || 0;
      if (jCount === 0) {
        alerts.push({
          id: `panel-no-judges-${p.id}`,
          severity: 'warning',
          title: `Panel [${p.panel_code}] Has No Assigned Judges`,
          description: `Panel "${p.name}" requires at least 1 evaluator before evaluations begin.`,
          entity: p.panel_code,
          link: '/dashboard/events/verbafest/judges',
          linkText: 'Assign Judge',
        });
      }

      // 2. Panel status = judges_absent
      if (p.status === 'judges_absent') {
        alerts.push({
          id: `panel-absent-${p.id}`,
          severity: 'critical',
          title: `Judges Absent at Panel [${p.panel_code}]`,
          description: `Panel is currently stalled because assigned judges are marked absent.`,
          entity: p.panel_code,
          link: '/dashboard/events/verbafest/panels',
          linkText: 'Inspect Panel',
        });
      }
    });

    // 3. Upcoming schedule slots within 60 mins missing panel or room
    slots.forEach((s) => {
      try {
        const startMs = new Date(s.start_time.replace(' ', 'T')).getTime();
        const diffMins = (startMs - nowMs) / 60000;

        if (diffMins >= -30 && diffMins <= 60) {
          if (!s.panel_id && ['gd', 'debate'].includes(s.event_type)) {
            alerts.push({
              id: `slot-no-panel-${s.id}`,
              severity: 'critical',
              title: `Slot [${s.slot_code}] Missing Evaluation Panel`,
              description: `Session starting in ${Math.round(diffMins)} min has no panel assigned.`,
              entity: s.slot_code,
              link: '/dashboard/events/verbafest/schedule',
              linkText: 'Assign Panel',
            });
          }
          if (!s.room_id) {
            alerts.push({
              id: `slot-no-room-${s.id}`,
              severity: 'warning',
              title: `Slot [${s.slot_code}] Has No Designated Venue Room`,
              description: `Session starting in ${Math.round(diffMins)} min has no venue assigned.`,
              entity: s.slot_code,
              link: '/dashboard/events/verbafest/schedule',
              linkText: 'Assign Room',
            });
          }
        }
      } catch {
        // Ignore date parse issues
      }
    });

    // 4. Rooms over capacity
    rooms.forEach((r) => {
      const cap = Number(r.capacity) || 0;
      const occ = Number(r.current_occupancy) || 0;
      if (cap > 0 && occ > cap) {
        alerts.push({
          id: `room-overcap-${r.id}`,
          severity: 'warning',
          title: `Room [${r.room_code}] Exceeds Seating Capacity`,
          description: `Occupancy is ${occ} for max capacity of ${cap} (${occ - cap} excess).`,
          entity: r.room_code,
          link: '/dashboard/events/verbafest/rooms',
          linkText: 'Manage Room',
        });
      }
    });

    // 5. Unallocated participants warning if event is live
    if (kpis.unallocatedCount > 5 && settings.event_status === 'live') {
      alerts.push({
        id: 'unallocated-high',
        severity: 'info',
        title: `${kpis.unallocatedCount} Registered Participants Awaiting Group Allocation`,
        description: 'Participants are registered for GD/Debate but have not been placed into group rosters.',
        entity: 'Allocations',
        link: '/dashboard/events/verbafest/allocations',
        linkText: 'Allocate Cohorts',
      });
    }

    return alerts;
  }, [panels, slots, rooms, kpis.unallocatedCount, settings.event_status]);

  const currentEventStatus = settings.event_status || 'scheduled';

  const statusColorMap = {
    live: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    scheduled: 'bg-blue-500/15 text-primary-blue dark:text-blue-400 border-blue-500/30',
    completed: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-4 md:p-8 space-y-6">
      {/* 1. Event Header with Live Status & Refresh Controls */}
      <VerbafestHeader
        title="VERBAFEST 2026 Command Center"
        description="Event-day operational dashboard and live control center for attendees, venues, schedule, panels, and evaluators."
        badge={
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border font-mono ${
                statusColorMap[currentEventStatus] || statusColorMap.scheduled
              }`}
            >
              <Radio size={12} className={currentEventStatus === 'live' ? 'animate-ping' : ''} />
              <span>Status: {currentEventStatus.toUpperCase()}</span>
            </div>

            {settings.event_date && (
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hidden sm:inline-block">
                {settings.event_date}
              </span>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Switcher (Coordinators only) */}
          {canManage && (
            <select
              value={currentEventStatus}
              onChange={(e) => handleToggleEventStatus(e.target.value)}
              className="text-xs font-mono font-bold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              title="Set Event Operational Status"
            >
              <option value="scheduled">Scheduled</option>
              <option value="live">Live Now</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          )}

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
            }`}
            title="Auto-refresh every 30 seconds"
          >
            <Activity size={13} className={autoRefresh ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">Auto (30s)</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            title="Refresh Dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Last updated timestamp */}
          {lastUpdated && (
            <span className="text-[11px] font-mono text-zinc-400 hidden lg:inline-block">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </VerbafestHeader>

      {/* API Partial Warning Banner if any failed */}
      {apiErrors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>
            Partial dataset warning: {apiErrors.join(' • ')} (Displaying cached/available modules).
          </span>
        </div>
      )}

      {/* Loader for initial fetch */}
      {loading ? (
        <div className="py-24">
          <VerbafestLoader message="Synchronizing live VERBAFEST operational control center..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
            <StatCard
              title="Participants"
              value={kpis.totalUnique}
              icon={Users}
              color="blue"
              subtitle={`${kpis.checkedInCount} checked in`}
            />
            <StatCard
              title="Check-In Rate"
              value={`${kpis.checkinRate}%`}
              icon={CheckCircle2}
              color={kpis.checkinRate >= 70 ? 'emerald' : 'amber'}
              subtitle={`${kpis.pendingCheckinCount} pending arrival`}
            />
            <StatCard
              title="GD Track"
              value={kpis.gdRegs}
              icon={Layers}
              color="blue"
              subtitle="Registered attendees"
            />
            <StatCard
              title="Debate Track"
              value={kpis.debateRegs}
              icon={Clock}
              color="violet"
              subtitle="Registered attendees"
            />
            <StatCard
              title="Allocated Cohorts"
              value={kpis.uniqueAllocated}
              icon={Award}
              color="emerald"
              subtitle={`${kpis.unallocatedCount} unallocated`}
            />
            <StatCard
              title="Active Schedule"
              value={slots.length}
              icon={Calendar}
              color="blue"
              subtitle={`${panels.length} panels active`}
            />
          </div>

          {/* 3. Operational Quick Actions Bar */}
          <DashboardQuickActions />

          {/* 4. Attention Required / Operational Alerts */}
          <DashboardAlerts alerts={operationalAlerts} />

          {/* 5. Live Timeline & Schedule Status */}
          <DashboardLiveStatus slots={slots} />

          {/* 6. Evaluation Panels Board */}
          <DashboardPanelBoard
            panels={panels}
            canManage={canManage}
            onStatusChanged={() => fetchDashboardData(true)}
          />

          {/* 7. Check-in and Venue Rooms Grid (2 columns on lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardCheckinOverview
              participants={participants}
              totalCount={kpis.totalUnique}
            />
            <DashboardRoomOverview rooms={rooms} />
          </div>

          {/* 8. Judges Staffing and Group Allocations Grid (2 columns on lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardJudgeStatus judges={judges} panels={panels} />
            <DashboardAllocationStatus
              allocations={allocations}
              participants={participants}
              panels={panels}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VerbafestDashboardPage;
