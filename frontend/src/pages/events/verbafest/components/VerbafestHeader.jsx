import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * VerbafestHeader
 * Standard header component for all VERBAFEST 2026 management pages.
 *
 * @param {Object} props
 * @param {string} props.title - Page/module title (e.g. "Rooms", "Overview")
 * @param {string} props.description - Concise subtitle/description
 * @param {string} [props.eventStatus] - Event edition/status pill text (default: 'VERBAFEST 2026')
 * @param {React.ReactNode} [props.badge] - Custom badge node if needed
 * @param {React.ReactNode} [props.children] - Actions slot on the right
 */
const VerbafestHeader = ({
  title,
  description,
  eventStatus = 'VERBAFEST 2026',
  badge,
  children
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-display">
            {title}
          </h1>
          {badge || (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-primary-blue dark:text-blue-400 border border-blue-500/20 shadow-sm font-mono">
              <Sparkles size={11} className="text-primary-blue dark:text-blue-400" />
              <span>{eventStatus}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default VerbafestHeader;
