import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer, Crosshair, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCursor } from '../../context/CursorContext';
import toast from 'react-hot-toast';

const CursorPreferenceToggle = ({ className = '' }) => {
  const { cursorType, setCursorType } = useCursor();

  const handleSelect = (type) => {
    if (cursorType === type) return;
    setCursorType(type);
    toast.success(
      type === 'target'
        ? 'Target Crosshair Cursor enabled!'
        : 'Default Classic Cursor enabled!',
      {
        icon: type === 'target' ? '🎯' : '🖱️',
        duration: 2500
      }
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-blue animate-pulse" />
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono-tag">
            Cursor &amp; Interface Experience
          </h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          Personal Preference
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option 1: Target Cursor */}
        <button
          type="button"
          onClick={() => handleSelect('target')}
          className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
            cursorType === 'target'
              ? 'bg-primary-blue/5 dark:bg-primary-blue/10 border-primary-blue shadow-md shadow-primary-blue/10 ring-1 ring-primary-blue'
              : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          {cursorType === 'target' && (
            <div className="absolute top-3 right-3 text-primary-blue">
              <CheckCircle2 size={16} />
            </div>
          )}

          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                cursorType === 'target'
                  ? 'bg-primary-blue text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Crosshair size={20} className={cursorType === 'target' ? 'animate-spin-slow' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                  Target Crosshair
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Interactive
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Rotating HUD crosshair with magnetic snapping and targeting highlights.
              </p>
            </div>
          </div>
        </button>

        {/* Option 2: Default Cursor */}
        <button
          type="button"
          onClick={() => handleSelect('default')}
          className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
            cursorType === 'default'
              ? 'bg-primary-blue/5 dark:bg-primary-blue/10 border-primary-blue shadow-md shadow-primary-blue/10 ring-1 ring-primary-blue'
              : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          {cursorType === 'default' && (
            <div className="absolute top-3 right-3 text-primary-blue">
              <CheckCircle2 size={16} />
            </div>
          )}

          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                cursorType === 'default'
                  ? 'bg-primary-blue text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <MousePointer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                  Classic Default
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                  Standard
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Clean native operating system mouse pointer with zero custom styling.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default CursorPreferenceToggle;
