import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Layers, Users, AlertCircle, RefreshCw } from 'lucide-react';
import EventBadge from './EventBadge';
import RoomTypeBadge from './RoomTypeBadge';
import EmptyState from './EmptyState';

/**
 * RoomScheduleModal
 * Read-only modal displaying scheduled slots for a given room.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.room - Selected room
 */
const RoomScheduleModal = ({
  isOpen,
  onClose,
  room
}) => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState(null);

  const fetchSchedule = useCallback(async () => {
    if (!room?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/events/verbafest/rooms/${room.id}/schedule`);
      setSchedule(res.data?.schedule || []);
    } catch (err) {
      console.error('Failed to load room schedule:', err);
      setError(err.response?.data?.error || 'Failed to load schedule for this room.');
    } finally {
      setLoading(false);
    }
  }, [room?.id]);

  useEffect(() => {
    if (isOpen && room?.id) {
      fetchSchedule();
    }
  }, [isOpen, room?.id, fetchSchedule]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isOpen || !room) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
                <Calendar size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="schedule-modal-title" className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">
                    Room Schedule
                  </h2>
                  <RoomTypeBadge type={room.room_type} size="sm" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {room.room_code} — {room.name} {room.location_details && `• ${room.location_details}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSchedule}
                disabled={loading}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Refresh schedule"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center"
                  >
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-44" />
                    </div>
                    <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            ) : schedule.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Schedule Slots"
                description={`No slots or panels are currently assigned to room ${room.room_code}.`}
              />
            ) : (
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono mb-2">
                  Scheduled Timeline ({schedule.length} {schedule.length === 1 ? 'Slot' : 'Slots'})
                </div>

                {schedule.map((slot) => {
                  const startTime = formatDateTime(slot.start_time);
                  const endTime = formatDateTime(slot.end_time);
                  const slotDate = formatDate(slot.start_time);

                  return (
                    <div
                      key={slot.slot_id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {slot.slot_code}
                          </span>
                          <EventBadge event={slot.event_type} size="sm" />
                          {slot.slot_label && (
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {slot.slot_label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono font-medium">
                            <Clock size={12} className="text-zinc-400" />
                            {slotDate && `${slotDate} • `}{startTime} – {endTime}
                          </span>

                          {slot.panel_code && (
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                              <Layers size={12} className="text-zinc-400" />
                              {slot.panel_code} {slot.panel_name ? `(${slot.panel_name})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {slot.participant_count !== undefined && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            <Users size={12} />
                            <span>{slot.participant_count} candidates</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoomScheduleModal;
