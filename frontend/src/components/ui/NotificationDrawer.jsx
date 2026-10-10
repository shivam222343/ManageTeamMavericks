import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Calendar,
  Award,
  Sparkles,
  AlertTriangle,
  Info,
  ExternalLink,
  Trash2,
  Clock,
  Inbox
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type, isDark) => {
  switch (type) {
    case 'attendance':
      return {
        icon: Check,
        color: isDark
          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
          : 'text-emerald-800 bg-emerald-50 border-emerald-200'
      };
    case 'mindsaga':
      return {
        icon: Sparkles,
        color: isDark
          ? 'text-purple-300 bg-purple-500/15 border-purple-500/30'
          : 'text-purple-800 bg-purple-50 border-purple-200'
      };
    case 'event':
      return {
        icon: Calendar,
        color: isDark
          ? 'text-blue-300 bg-blue-500/15 border-blue-500/30'
          : 'text-blue-800 bg-blue-50 border-blue-200'
      };
    case 'award':
      return {
        icon: Award,
        color: isDark
          ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
          : 'text-amber-800 bg-amber-50 border-amber-200'
      };
    case 'alert':
      return {
        icon: AlertTriangle,
        color: isDark
          ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
          : 'text-rose-800 bg-rose-50 border-rose-200'
      };
    case 'announcement':
      return {
        icon: Bell,
        color: isDark
          ? 'text-zinc-200 bg-zinc-800 border-zinc-700'
          : 'text-zinc-800 bg-zinc-100 border-zinc-300'
      };
    default:
      return {
        icon: Info,
        color: isDark
          ? 'text-zinc-300 bg-zinc-800 border-zinc-700'
          : 'text-zinc-800 bg-zinc-100 border-zinc-200'
      };
  }
};

const NotificationDrawer = () => {
  const {
    notifications,
    isDrawerOpen,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('all');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Body scroll lock when open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'unread') return notif.is_read === 0;
      if (activeFilter === 'events') return ['event', 'attendance', 'mindsaga'].includes(notif.type);
      if (activeFilter === 'system') return ['announcement', 'alert', 'info'].includes(notif.type);
      return true;
    });
  }, [notifications, activeFilter]);

  const handleNotificationClick = (notif) => {
    if (notif.is_read === 0) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      closeDrawer();
      if (notif.link.startsWith('http')) {
        window.open(notif.link, '_blank');
      } else {
        navigate(notif.link);
      }
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Right Slide-Over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className={`w-screen max-w-md pointer-events-auto border-l shadow-2xl flex flex-col ${
                isDark
                  ? 'bg-zinc-950/95 text-zinc-100 border-zinc-800 backdrop-blur-2xl'
                  : 'bg-white/95 text-zinc-900 border-zinc-200 backdrop-blur-2xl'
              }`}
            >
              {/* Drawer Header */}
              <div className="p-5 sm:p-6 border-b border-zinc-200/90 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                        Notifications
                      </h2>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {notifications.length} update{notifications.length === 1 ? '' : 's'} across your account
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Close notifications"
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Filter Tabs & Mark All Read */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'unread', label: 'Unread' },
                      { id: 'events', label: 'Events' },
                      { id: 'system', label: 'System' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        className={`px-3 py-1 rounded-lg font-semibold text-xs transition cursor-pointer ${
                          activeFilter === tab.id
                            ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                </div>
              </div>

              {/* Notification List Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="py-20 text-center space-y-3 px-6">
                    <div className="w-14 h-14 rounded-3xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800">
                      <Inbox size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-950 dark:text-zinc-200">
                        No Notifications
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                        {activeFilter === 'unread'
                          ? "You are caught up. No unread messages."
                          : 'New event updates, round results, and credentials will appear here.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const { icon: IconComp, color } = getNotificationIcon(notif.type, isDark);
                    const isUnread = notif.is_read === 0;

                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={`group relative p-4 rounded-2xl border transition-all duration-200 ${
                          isUnread
                            ? isDark
                              ? 'bg-zinc-900 border-zinc-700 shadow-sm'
                              : 'bg-white border-zinc-300 shadow-xs'
                            : isDark
                            ? 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900'
                            : 'bg-zinc-50 border-zinc-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Type Icon */}
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${color}`}
                          >
                            <IconComp size={16} />
                          </div>

                          {/* Content */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`text-xs font-bold leading-snug truncate ${
                                  isUnread
                                    ? 'text-zinc-950 dark:text-white'
                                    : 'text-zinc-800 dark:text-zinc-300'
                                }`}
                              >
                                {notif.title}
                              </h4>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-1" />
                              )}
                            </div>

                            <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                              <span className="flex items-center gap-1 font-medium">
                                <Clock size={11} />
                                {formatTimeAgo(notif.created_at)}
                              </span>

                              {notif.link && (
                                <span className="text-zinc-900 dark:text-zinc-200 font-bold flex items-center gap-1 hover:underline">
                                  <span>View</span>
                                  <ExternalLink size={10} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action icons */}
                          <div className="flex flex-col items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notif.id)}
                                title="Mark as read"
                                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-emerald-600 transition cursor-pointer"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteNotification(notif.id)}
                              title="Delete notification"
                              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-center text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                Team Mavericks Notification Center
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;
