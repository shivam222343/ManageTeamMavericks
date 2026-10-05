import React from 'react';
import { MessageSquare, Scale, Brain, Clock, Shield } from 'lucide-react';

/**
 * RoomTypeBadge
 * Renders badges for VERBAFEST room types:
 * - gd_panel: blue
 * - debate_panel: violet
 * - mindsaga_lab: amber
 * - waiting_room: zinc
 * - control_room: purple / indigo
 */
const ROOM_TYPE_CONFIG = {
  gd_panel: {
    label: 'GD Panel',
    icon: MessageSquare,
    classes: 'bg-blue-500/10 text-primary-blue dark:text-blue-400 border-blue-500/20',
  },
  debate_panel: {
    label: 'Debate Panel',
    icon: Scale,
    classes: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  mindsaga_lab: {
    label: 'Mind Saga Lab',
    icon: Brain,
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  waiting_room: {
    label: 'Waiting Room',
    icon: Clock,
    classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
  control_room: {
    label: 'Control Room',
    icon: Shield,
    classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
};

const RoomTypeBadge = ({
  type,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const cfg = ROOM_TYPE_CONFIG[type] || {
    label: type || 'General Room',
    icon: MessageSquare,
    classes: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  };
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

export default RoomTypeBadge;
