import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Layers,
  DoorOpen,
  Users,
  ArrowRight,
  Radio,
  CheckCircle2,
  Hourglass
} from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';

const formatTimeOnly = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
};

const getRelativeTimeLabel = (startStr, endStr, nowMs) => {
  if (!startStr || !endStr) return '';
  try {
    const s = new Date(startStr.replace(' ', 'T')).getTime();
    const e = new Date(endStr.replace(' ', 'T')).getTime();

    if (nowMs >= s && nowMs <= e) {
      const remainingMins = Math.max(0, Math.round((e - nowMs) / 60000));
      return `${remainingMins} min remaining`;
    } else if (nowMs < s) {
      const startInMins = Math.round((s - nowMs) / 60000);
      if (startInMins < 60) return `Starts in ${startInMins} min`;
      const hrs = Math.floor(startInMins / 60);
      const mins = startInMins % 60;
      return `Starts in ${hrs}h ${mins}m`;
    } else {
      return 'Concluded';
    }
  } catch {
    return '';
  }
};

/**
 * DashboardLiveStatus
 * Live event timeline highlighting running sessions, next upcoming batches,
 * and recently concluded slots.
 *
 * @param {Object} props
 * @param {Array} props.slots - All schedule slots
 * @param {Date} props.currentTimestamp - Live current time
 */
const DashboardLiveStatus = ({ slots = [], currentTimestamp = new Date() }) => {
  const nowMs = currentTimestamp.getTime();

  // Categorize slots
  const runningSlots = [];
  const upcomingSlots = [];
  const completedSlots = [];

  slots.forEach((s) => {
    try {
      const start = new Date(s.start_time.replace(' ', 'T')).getTime();
      const end = new Date(s.end_time.replace(' ', 'T')).getTime();

      if (nowMs >= start && nowMs <= end) {
        runningSlots.push(s);
      } else if (nowMs < start) {
        upcomingSlots.push(s);
      } else {
        completedSlots.push(s);
      }
    } catch {
      upcomingSlots.push(s);
    }
  });

  // Sort upcoming ascending, completed descending
  upcomingSlots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  completedSlots.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  const displayedUpcoming = upcomingSlots.slice(0, 3);
  const displayedCompleted = completedSlots.slice(0, 2);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Live Timeline & Schedule</span>
              {runningSlots.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Active sessions, upcoming batches, and venue coordination
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/schedule"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline"
        >
          <span>Open Full Schedule</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CURRENTLY RUNNING */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Radio size={13} className="animate-pulse text-emerald-500" />
              Currently Running ({runningSlots.length})
            </span>
          </div>

          {runningSlots.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-center text-xs text-zinc-400 py-6">
              No sessions actively running at this moment.
            </div>
          ) : (
            <div className="space-y-2.5">
              {runningSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {slot.slot_code}
                      </span>
                      <EventBadge eventType={slot.event_type} />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {getRelativeTimeLabel(slot.start_time, slot.end_time, nowMs)}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {slot.slot_label || 'Scheduled Session'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock size={12} className="text-emerald-500 shrink-0" />
                      <span>{formatTimeOnly(slot.start_time)} – {formatTimeOnly(slot.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <DoorOpen size={12} className="text-emerald-500 shrink-0" />
                      <span>{slot.room_code || slot.room_name || 'No Room'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers size={12} className="text-emerald-500 shrink-0" />
                      <span>{slot.panel_name || slot.panel_code || 'No Panel'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Users size={12} className="text-emerald-500 shrink-0" />
                      <span>{slot.allocated_participants_count || 0} participants</span>
                    </div>
                  </div>

                  {slot.panel_status && (
                    <div className="pt-1 flex justify-end">
                      <PanelStatusBadge status={slot.panel_status} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEXT UP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Hourglass size={13} className="text-blue-500" />
              Next Up ({upcomingSlots.length})
            </span>
          </div>

          {displayedUpcoming.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-center text-xs text-zinc-400 py-6">
              No upcoming slots on schedule.
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedUpcoming.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {slot.slot_code}
                      </span>
                      <EventBadge eventType={slot.event_type} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      {getRelativeTimeLabel(slot.start_time, slot.end_time, nowMs)}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {slot.slot_label || 'Upcoming Session'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock size={12} className="text-primary-blue shrink-0" />
                      <span>{formatTimeOnly(slot.start_time)} – {formatTimeOnly(slot.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <DoorOpen size={12} className="text-primary-blue shrink-0" />
                      <span>{slot.room_code || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers size={12} className="text-primary-blue shrink-0" />
                      <span>{slot.panel_code || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Users size={12} className="text-primary-blue shrink-0" />
                      <span>{slot.allocated_participants_count || 0} allocated</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENTLY COMPLETED */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <CheckCircle2 size={13} className="text-zinc-400" />
              Recently Completed ({completedSlots.length})
            </span>
          </div>

          {displayedCompleted.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-center text-xs text-zinc-400 py-6">
              No completed sessions yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedCompleted.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-800/20 opacity-80 hover:opacity-100 transition-opacity space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {slot.slot_code}
                      </span>
                      <EventBadge eventType={slot.event_type} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Concluded {formatTimeOnly(slot.end_time)}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {slot.slot_label}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                    <span>{slot.room_code || '—'} • {slot.panel_code || '—'}</span>
                    <span>{slot.allocated_participants_count || 0} evaluated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLiveStatus;
