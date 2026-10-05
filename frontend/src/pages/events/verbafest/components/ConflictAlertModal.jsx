import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import EventBadge from './EventBadge';

/**
 * Format datetime string for human readability
 */
const formatTimeStr = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dtStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
};

const formatDateStr = (dtStr) => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

/**
 * ConflictAlertModal
 * Modal that renders comprehensive schedule conflict analysis directly from
 * backend ConflictDetectionService responses.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.conflictData - The conflict object returned by the backend
 * @param {string} [props.errorTitle] - Main error message returned by API
 */
const ConflictAlertModal = ({
  isOpen,
  onClose,
  conflictData = null,
  errorTitle = 'Scheduling Conflict Detected',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !conflictData) return null;

  const isBuffer = conflictData.conflict_type === 'buffer_violation';
  const isOverlap = conflictData.conflict_type === 'overlap';
  const conflictingSlot = conflictData.conflicting_slot;
  const requestedSlot = conflictData.requested_slot;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950 dark:text-rose-100">
                  {isBuffer ? 'Buffer Interval Violation' : isOverlap ? 'Direct Schedule Collision' : errorTitle}
                </h3>
                <p className="text-xs text-rose-600/90 dark:text-rose-400">
                  Backend ConflictDetectionService rule violation
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 rounded-xl hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Primary Conflict Reason Banner */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
              {conflictData.reason || errorTitle}
            </div>

            {/* Requested vs Conflicting Slots Comparison */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                Collision Analysis
              </span>

              {/* Requested Slot */}
              {requestedSlot && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                      Requested Slot Times
                    </span>
                    {requestedSlot.event_type && <EventBadge event={requestedSlot.event_type} size="sm" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Clock size={13} className="text-primary-blue shrink-0" />
                    <span>
                      {formatTimeStr(requestedSlot.start_time)} – {formatTimeStr(requestedSlot.end_time)}
                    </span>
                    {formatDateStr(requestedSlot.start_time) && (
                      <span className="text-zinc-400 font-normal">
                        ({formatDateStr(requestedSlot.start_time)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Collision Divider */}
              <div className="flex items-center justify-center gap-2 py-0.5 text-rose-500 text-xs font-bold">
                <AlertTriangle size={14} />
                <span>Conflicts With</span>
              </div>

              {/* Conflicting Slot */}
              {conflictingSlot && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {conflictingSlot.slot_code}
                      </span>
                      {conflictingSlot.group_code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                          Group {conflictingSlot.group_code}
                        </span>
                      )}
                    </div>
                    {conflictingSlot.event_type && <EventBadge event={conflictingSlot.event_type} size="sm" />}
                  </div>

                  {conflictingSlot.slot_label && (
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-1 truncate">
                      {conflictingSlot.slot_label}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <Clock size={13} className="text-amber-500 shrink-0" />
                    <span>
                      {formatTimeStr(conflictingSlot.start_time)} – {formatTimeStr(conflictingSlot.end_time)}
                    </span>
                    {formatDateStr(conflictingSlot.start_time) && (
                      <span className="text-zinc-400 font-normal">
                        ({formatDateStr(conflictingSlot.start_time)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Buffer Notice if applicable */}
            {isBuffer && conflictData.buffer_minutes && (
              <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <Clock size={14} className="text-zinc-400 shrink-0" />
                <span>
                  The event configuration mandates a minimum transition buffer of{' '}
                  <strong>{conflictData.buffer_minutes} minutes</strong> between successive participant activities.
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white/90 transition cursor-pointer"
            >
              Acknowledge & Adjust Times
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConflictAlertModal;
