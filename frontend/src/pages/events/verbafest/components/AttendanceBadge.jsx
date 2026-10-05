import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

/**
 * AttendanceBadge
 * Renders attendance and checkin status badges:
 * - present / checked_in: emerald
 * - pending / not_arrived: amber / zinc
 * - absent / disqualified: rose
 *
 * @param {Object} props
 * @param {'present'|'pending'|'absent'|'checked_in'|'not_arrived'|'disqualified'|string} props.status
 * @param {'sm'|'md'} [props.size]
 * @param {boolean} [props.showIcon]
 */
const STATUS_CONFIG = {
  present: {
    label: 'Present',
    icon: CheckCircle2,
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  checked_in: {
    label: 'Checked In',
    icon: CheckCircle2,
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  not_arrived: {
    label: 'Not Arrived',
    icon: Clock,
    classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
  absent: {
    label: 'Absent',
    icon: XCircle,
    classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  disqualified: {
    label: 'Disqualified',
    icon: AlertCircle,
    classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
};

const normalizeAttendance = (raw) => {
  if (!raw) return 'pending';
  const val = String(raw).toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (val.includes('present')) return 'present';
  if (val.includes('checked')) return 'checked_in';
  if (val.includes('absent')) return 'absent';
  if (val.includes('disqualif')) return 'disqualified';
  if (val.includes('not_arr') || val.includes('unarr')) return 'not_arrived';
  return 'pending';
};

const AttendanceBadge = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const normalized = normalizeAttendance(status);
  const cfg = STATUS_CONFIG[normalized] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold font-mono uppercase tracking-wider rounded-lg border ${cfg.classes} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={size === 'sm' ? 11 : 13} className="shrink-0" />}
      <span>{cfg.label}</span>
    </span>
  );
};

export default AttendanceBadge;
