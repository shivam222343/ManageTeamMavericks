import React from 'react';
import MajorLoader from '../../../../components/ui/MajorLoader';

/**
 * VerbafestLoader
 * Reusable loading state for cards, tables, and sections.
 *
 * @param {Object} props
 * @param {'cards'|'table'|'spinner'} [props.type]
 * @param {number} [props.count]
 */
const VerbafestLoader = ({ type = 'cards', count = 6 }) => {
  if (type === 'spinner') {
    return (
      <div className="flex items-center justify-center min-h-[300px] w-full">
        <MajorLoader />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 h-12" />
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/6" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/5" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-28" />
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
          </div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-44" />
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-12" />
            </div>
            <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-full" />
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end gap-2">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-16" />
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default VerbafestLoader;
