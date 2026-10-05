import React from 'react';
import { MessageSquare, Scale, Brain, Layers } from 'lucide-react';

/**
 * EventBadge
 * Renders badges for VERBAFEST events:
 * - GD: blue
 * - Debate: violet
 * - Mind Saga: amber
 * - Both (GD & Debate): emerald
 *
 * @param {Object} props
 * @param {'gd'|'debate'|'mindsaga'|'both'|string} props.event - Event type or name
 * @param {'sm'|'md'} [props.size] - Badge size
 * @param {boolean} [props.showIcon] - Whether to show the event icon
 */
const EVENT_CONFIG = {
  gd: {
    label: 'Group Discussion',
    shortLabel: 'GD',
    icon: MessageSquare,
    classes: 'bg-blue-500/10 text-primary-blue dark:text-blue-400 border-blue-500/20',
  },
  debate: {
    label: 'Debate',
    shortLabel: 'Debate',
    icon: Scale,
    classes: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  mindsaga: {
    label: 'Mind Saga',
    shortLabel: 'Mind Saga',
    icon: Brain,
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  both: {
    label: 'GD & Debate',
    shortLabel: 'Both',
    icon: Layers,
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

const normalizeEventType = (raw) => {
  if (!raw) return 'gd';
  const val = String(raw).toLowerCase().trim();
  if (val.includes('both') || val.includes('all')) return 'both';
  if (val.includes('debate')) return 'debate';
  if (val.includes('mind') || val.includes('saga')) return 'mindsaga';
  if (val.includes('gd') || val.includes('discussion')) return 'gd';
  return 'gd';
};

const EventBadge = ({
  event,
  size = 'md',
  showIcon = true,
  short = false,
  className = ''
}) => {
  const normalized = normalizeEventType(event);
  const cfg = EVENT_CONFIG[normalized] || EVENT_CONFIG.gd;
  const Icon = cfg.icon;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold font-mono uppercase tracking-wider rounded-lg border ${cfg.classes} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon size={size === 'sm' ? 11 : 13} className="shrink-0" />}
      <span>{short ? cfg.shortLabel : cfg.label}</span>
    </span>
  );
};

export default EventBadge;
