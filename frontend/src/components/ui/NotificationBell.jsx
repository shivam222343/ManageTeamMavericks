import React from 'react';
import { Bell } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = ({ className = '' }) => {
  const { unseenCount, toggleDrawer, isDrawerOpen, socketConnected } = useNotification();

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      aria-label="Open notifications"
      title="Notifications"
      className={`relative p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
        isDrawerOpen
          ? 'bg-blue-500/15 border-blue-500/40 text-primary-blue shadow-md'
          : 'bg-white/80 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
      } ${className}`}
    >
      <Bell size={18} className="transition-transform group-hover:rotate-12" />

      {/* Unseen Count Badge */}
      <AnimatePresence>
        {unseenCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white font-mono font-black text-[10px] leading-none shadow-lg shadow-rose-500/40 ring-2 ring-white dark:ring-zinc-950"
          >
            <span className="relative z-10">{unseenCount > 99 ? '99+' : unseenCount}</span>
            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status Dot */}
      <span
        title={socketConnected ? 'Connected' : 'Connecting...'}
        className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-zinc-950 ${
          socketConnected ? 'bg-emerald-500' : 'bg-amber-400'
        }`}
      />
    </button>
  );
};

export default NotificationBell;
