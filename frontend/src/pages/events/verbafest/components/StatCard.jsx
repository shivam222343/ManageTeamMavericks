import React from 'react';

/**
 * StatCard
 * Summary metrics card with icon, value, title, subtitle, and skeleton loading state.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.title - Metric title
 * @param {string|number} props.value - Metric value
 * @param {string} [props.subtitle] - Auxiliary description / trend
 * @param {boolean} [props.loading] - Whether to render skeleton loading state
 * @param {'blue'|'emerald'|'amber'|'rose'|'violet'} [props.color] - Color theme
 */
const colorMap = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-primary-blue dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/20',
  },
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  loading = false,
  color = 'blue'
}) => {
  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colors.bg} ${colors.text} ${colors.border} transition-transform group-hover:scale-105 duration-200`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-display">
          {value ?? 0}
        </div>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
