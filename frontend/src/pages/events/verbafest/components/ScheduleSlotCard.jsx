import React from 'react';
import { Clock, DoorOpen, Layers, Users, Eye, Edit, Trash2 } from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';

const formatTimeStr = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dtStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
};

const formatDateStr = (dtStr) => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const getDurationMinutes = (startStr, endStr) => {
  if (!startStr || !endStr) return null;
  try {
    const s = new Date(startStr.replace(' ', 'T')).getTime();
    const e = new Date(endStr.replace(' ', 'T')).getTime();
    return Math.round((e - s) / (1000 * 60));
  } catch {
    return null;
  }
};

/**
 * ScheduleSlotCard
 * Visual timeline/grid card for a schedule slot.
 *
 * @param {Object} props
 * @param {Object} props.slot
 * @param {boolean} [props.canManage]
 * @param {Function} props.onViewDetails
 * @param {Function} [props.onEdit]
 * @param {Function} [props.onDelete]
 */
const ScheduleSlotCard = ({
  slot,
  canManage = false,
  onViewDetails,
  onEdit,
  onDelete,
}) => {
  const duration = getDurationMinutes(slot.start_time, slot.end_time);
  const participantCount = Number(slot.allocated_participants_count) || 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between gap-4 group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-50">
              {slot.slot_code}
            </span>
            <EventBadge event={slot.event_type} size="sm" />
          </div>

          {slot.panel_status && (
            <PanelStatusBadge status={slot.panel_status} size="sm" />
          )}
        </div>

        {/* Slot Title */}
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-blue transition-colors">
          {slot.slot_label}
        </h4>

        {/* Timing Window */}
        <div className="mt-3.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-primary-blue" />
              <span>
                {formatTimeStr(slot.start_time)} – {formatTimeStr(slot.end_time)}
              </span>
            </div>
            {duration !== null && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {duration} min
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-400 pl-5">
            {formatDateStr(slot.start_time)}
          </div>
        </div>

        {/* Allocation Info (Panel & Room & Attendees) */}
        <div className="mt-3.5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          {/* Room */}
          <div className="flex items-center gap-2">
            <DoorOpen size={14} className="text-primary-blue shrink-0" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {slot.room_code || 'Unassigned Venue'}
            </span>
            {slot.room_name && (
              <span className="text-zinc-400 truncate max-w-[140px]">({slot.room_name})</span>
            )}
          </div>

          {/* Panel (if assigned) */}
          {slot.panel_code && (
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-primary-blue shrink-0" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {slot.panel_code}
              </span>
              {slot.panel_name && (
                <span className="text-zinc-400 truncate max-w-[140px]">({slot.panel_name})</span>
              )}
            </div>
          )}

          {/* Attendees count */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400 text-[11px]">Allocated Attendees:</span>
            <span
              className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                participantCount > 0
                  ? 'bg-primary-blue/10 text-primary-blue'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Users size={12} />
              <span>{participantCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onViewDetails(slot.id)}
          className="text-xs font-bold text-primary-blue hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <Eye size={13} />
          <span>View Details</span>
        </button>

        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(slot)}
              className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              title="Edit slot"
              aria-label="Edit slot"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(slot)}
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
              title="Delete slot"
              aria-label="Delete slot"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSlotCard;
