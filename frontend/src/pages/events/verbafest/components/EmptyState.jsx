import React from 'react';
import { DoorOpen } from 'lucide-react';

/**
 * EmptyState
 * Displays a styled empty state card for VERBAFEST tables/views.
 *
 * @param {Object} props
 * @param {React.ComponentType} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 */
const EmptyState = ({
  icon: Icon = DoorOpen,
  title = 'No records found',
  description = 'Try adjusting your filters or search term.',
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 shadow-inner">
        <Icon size={28} />
      </div>
      <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 font-display">
        {title}
      </h3>
      {description && (
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-5">
          {description}
        </p>
      )}
      {action && (
        <div className="flex items-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
