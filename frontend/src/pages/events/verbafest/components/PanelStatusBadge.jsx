import React from 'react';

/**
 * PanelStatusBadge
 * Renders panel status badges according to VERBAFEST design standards:
 * - FREE: emerald
 * - READY: sky/blue
 * - OCCUPIED: amber
 * - BREAK: zinc
 * - JUDGES_ABSENT: rose
 *
 * @param {Object} props
 * @param {'FREE'|'READY'|'OCCUPIED'|'BREAK'|'JUDGES_ABSENT'|string} props.status
 * @param {'sm'|'md'} [props.size]
 */
const STATUS_CONFIG = {
  free: {
    label: 'Free',
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  ready: {
    label: 'Ready',
    classes: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
  },
  occupied: {
    label: 'Occupied',
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  break: {
    label: 'Break',
    classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    dot: 'bg-zinc-500',
  },
  judges_absent: {
    label: 'Judges Absent',
    classes: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500 animate-pulse',
  },
};

const normalizeStatus = (raw) => {
  if (!raw) return 'free';
  const val = String(raw).toLowerCase().trim().replace(/[-\s]+/g, '_');
  if (val.includes('absent')) return 'judges_absent';
  if (val.includes('break')) return 'break';
  if (val.includes('ready')) return 'ready';
  if (val.includes('occup')) return 'occupied';
  return 'free';
};

const PanelStatusBadge = ({
  status,
  size = 'md',
  showDot = true,
  className = ''
}) => {
  const normalized = normalizeStatus(status);
  const cfg = STATUS_CONFIG[normalized] || STATUS_CONFIG.free;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1.5'
    : 'text-xs px-2.5 py-1 gap-2';

  return (
    <span
      className={`inline-flex items-center font-bold font-mono uppercase tracking-wider rounded-lg border ${cfg.classes} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      )}
      <span>{cfg.label}</span>
    </span>
  );
};

export default PanelStatusBadge;
