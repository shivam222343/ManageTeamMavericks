import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ArrowRight
} from 'lucide-react';

/**
 * DashboardAllocationStatus
 * Group formation progress, cohort coverage, and attendance readiness.
 *
 * @param {Object} props
 * @param {Array} props.allocations - All allocations
 * @param {Array} props.participants - All participants
 * @param {Array} props.panels - All panels
 */
const DashboardAllocationStatus = ({ allocations = [], participants = [], panels = [] }) => {
  // Aggregate groups
  const groupsMap = new Map();
  allocations.forEach((a) => {
    if (!groupsMap.has(a.group_code)) {
      groupsMap.set(a.group_code, {
        group_code: a.group_code,
        event_type: a.event_type,
        panel_id: a.panel_id,
        count: 0,
        present: 0,
        pending: 0,
        absent: 0,
      });
    }
    const g = groupsMap.get(a.group_code);
    g.count++;
    if (a.attendance_status === 'present') g.present++;
    else if (a.attendance_status === 'absent') g.absent++;
    else g.pending++;
  });

  const allGroups = Array.from(groupsMap.values());
  const gdGroups = allGroups.filter((g) => g.event_type === 'gd').length;
  const debateGroups = allGroups.filter((g) => g.event_type === 'debate').length;

  // Allocated vs Unallocated
  const allocatedIds = new Set(allocations.map((a) => Number(a.participant_id)));
  const uniqueAllocatedCount = allocatedIds.size;

  let unallocatedCount = 0;
  participants.forEach((p) => {
    const isReg = Boolean(p.reg_gd) || Boolean(p.reg_debate) || Boolean(p.reg_mindsaga);
    if (isReg && !allocatedIds.has(Number(p.id))) {
      unallocatedCount++;
    }
  });

  // Groups near capacity
  const fullOrNearCapacityGroups = allGroups.filter((g) => {
    const panel = panels.find((p) => Number(p.id) === Number(g.panel_id));
    const cap = panel ? Number(panel.capacity) : 10;
    return g.count >= cap - 1;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Group Allocations & Cohorts ({allGroups.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Discussion and debate groups, seating fill, and participant allocation
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/allocations"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Manage Allocations</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            GD Groups
          </span>
          <span className="text-xl font-black text-primary-blue dark:text-blue-400 font-display">
            {gdGroups}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Debate Groups
          </span>
          <span className="text-xl font-black text-violet-600 dark:text-violet-400 font-display">
            {debateGroups}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Allocated Attendees
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display">
            {uniqueAllocatedCount}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Unallocated
          </span>
          <span
            className={`text-xl font-black font-display ${
              unallocatedCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {unallocatedCount}
          </span>
        </div>
      </div>

      {/* Near Capacity Warning */}
      {fullOrNearCapacityGroups.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs flex items-center justify-between gap-3">
          <span>
            <strong>{fullOrNearCapacityGroups.length}</strong> group(s) have reached or are approaching maximum panel capacity.
          </span>
          <Link
            to="/dashboard/events/verbafest/allocations"
            className="font-bold underline shrink-0 hover:text-blue-950 dark:hover:text-blue-200"
          >
            Inspect Groups
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardAllocationStatus;
