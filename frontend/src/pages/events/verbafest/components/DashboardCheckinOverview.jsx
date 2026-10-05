import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  UserCheck
} from 'lucide-react';

const formatCheckinTime = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
};

/**
 * DashboardCheckinOverview
 * Live attendee check-in progress, registration compliance, and recent arrivals log.
 *
 * @param {Object} props
 * @param {Array} props.participants - List of participants
 * @param {number} props.totalCount - Total participants count
 */
const DashboardCheckinOverview = ({ participants = [], totalCount = 0 }) => {
  const actualTotal = totalCount || participants.length;

  const checkedInList = participants.filter((p) => p.checkin_status === 'checked_in');

  const checkedInCount = checkedInList.length;
  const pendingCount = actualTotal - checkedInCount;
  const pct = actualTotal > 0 ? Math.round((checkedInCount / actualTotal) * 100) : 0;

  // Recent check-ins sorted by checkin_time desc
  const recentCheckins = [...checkedInList]
    .sort((a, b) => new Date(b.checkin_time || 0) - new Date(a.checkin_time || 0))
    .slice(0, 5);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Participant Check-In Overview
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Arrivals, verification status, and attendance rate
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/participants"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Open Participants</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Progress Bar & KPI Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Checked In
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              {checkedInCount}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
            {pct}%
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Pending Check-In
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-display">
              {pendingCount}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20">
            {100 - pct}%
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Total Registered
            </span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-display">
              {actualTotal}
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400">Attendees</span>
        </div>
      </div>

      {/* Check-in Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-500 dark:text-zinc-400">Arrival Completion</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{pct}% Completed</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Recent Check-ins List */}
      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Recently Checked-In Attendees
        </div>
        {recentCheckins.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
            No attendees checked in yet today.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {recentCheckins.map((p) => (
              <div
                key={p.id}
                className="px-3.5 py-2.5 bg-zinc-50/30 dark:bg-zinc-800/20 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    {p.participant_code}
                  </span>
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                      {p.full_name}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate max-w-[200px] block">
                      {p.college || '—'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-emerald-500" />
                    <span>{formatCheckinTime(p.checkin_time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCheckinOverview;
