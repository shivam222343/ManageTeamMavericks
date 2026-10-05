import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Layers,
  DoorOpen,
  Search,
  RefreshCw,
  Coffee,
  Loader2
} from 'lucide-react';
import EventBadge from './EventBadge';
import AttendanceBadge from './AttendanceBadge';
import PanelStatusBadge from './PanelStatusBadge';
import VerbafestLoader from './VerbafestLoader';
import EmptyState from './EmptyState';

const formatTimeOnly = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dtStr;
  }
};

const formatDateOnly = (dtStr) => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

/**
 * Calculate difference in minutes between two datetimes
 */
const getGapMinutes = (prevEndStr, nextStartStr) => {
  if (!prevEndStr || !nextStartStr) return 0;
  try {
    const pEnd = new Date(prevEndStr.replace(' ', 'T')).getTime();
    const nStart = new Date(nextStartStr.replace(' ', 'T')).getTime();
    return Math.round((nStart - pEnd) / (1000 * 60));
  } catch {
    return 0;
  }
};

/**
 * ParticipantScheduleModal
 * Timeline view for a specific participant's full itinerary across GD, Debate, and Mind Saga.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {number|string|null} [props.initialParticipantId]
 * @param {Function} [props.onSelectSlot]
 */
const ParticipantScheduleModal = ({
  isOpen,
  onClose,
  initialParticipantId = null,
  onSelectSlot,
}) => {
  const [selectedId, setSelectedId] = useState(initialParticipantId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync initial participant
  useEffect(() => {
    if (isOpen) {
      if (initialParticipantId) {
        setSelectedId(initialParticipantId);
      }
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, initialParticipantId]);

  // Fetch participant schedule
  const fetchSchedule = useCallback(async (partId) => {
    if (!partId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/events/verbafest/participants/${partId}/schedule`);
      setScheduleData(res.data || null);
    } catch (err) {
      console.error('Failed to load participant schedule:', err);
      toast.error('Failed to load participant timeline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedId) {
      fetchSchedule(selectedId);
    } else {
      setScheduleData(null);
    }
  }, [isOpen, selectedId, fetchSchedule]);

  // Handle participant search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`/events/verbafest/participants?limit=5&search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data?.data || []);
      } catch (err) {
        console.error('Failed to search participants:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const participant = scheduleData?.participant;
  const scheduleSlots = scheduleData?.schedule || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {participant ? `${participant.full_name}'s Schedule` : 'Participant Itinerary Lookup'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {participant
                    ? `${participant.participant_code} • Timeline across all registered tracks`
                    : 'Search any participant to review their allocated time slots and transit intervals'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedId && (
                <button
                  onClick={() => fetchSchedule(selectedId)}
                  disabled={loading}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Refresh schedule"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search Box (Always accessible) */}
          <div className="px-6 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 relative">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participant by name, code, or college…"
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={13} className="animate-spin text-zinc-400" />
                </div>
              )}
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-6 right-6 top-14 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                        {p.participant_code} — {p.full_name}
                      </span>
                      <span className="text-zinc-500 text-[11px] block">{p.college || '—'}</span>
                    </div>
                    <AttendanceBadge status={p.checkin_status || 'not_arrived'} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="py-12">
                <VerbafestLoader message="Loading participant timeline…" />
              </div>
            ) : !selectedId ? (
              <div className="py-10">
                <EmptyState
                  icon={Search}
                  title="Search for a Participant"
                  description="Use the search bar above to look up any participant and inspect their complete multi-event itinerary."
                />
              </div>
            ) : scheduleSlots.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={Calendar}
                  title="No Scheduled Slots"
                  description={`${participant?.full_name || 'Participant'} does not currently have any assigned group slots in the schedule.`}
                />
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {scheduleSlots.map((item, index) => {
                  const prevItem = index > 0 ? scheduleSlots[index - 1] : null;
                  const gapMins = prevItem ? getGapMinutes(prevItem.end_time, item.start_time) : 0;

                  return (
                    <React.Fragment key={item.allocation_id || index}>
                      {/* Transition / Break Gap Indicator */}
                      {index > 0 && (
                        <div className="relative -ml-6 pl-6 py-1">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                              gapMins < 15 && gapMins > 0
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60'
                            }`}
                          >
                            <Coffee size={12} />
                            <span>
                              {gapMins > 0
                                ? `${gapMins} min transition window`
                                : gapMins === 0
                                ? 'Back-to-back (0 min buffer)'
                                : `${Math.abs(gapMins)} min schedule overlap!`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Timeline Slot Card */}
                      <div className="relative group">
                        {/* Dot on line */}
                        <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-white dark:bg-zinc-900 border-2 border-primary-blue shadow-xs" />

                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectSlot && item.slot_id && onSelectSlot(item.slot_id)}
                                className={`font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 ${
                                  onSelectSlot ? 'hover:text-primary-blue hover:underline cursor-pointer' : ''
                                }`}
                              >
                                {item.slot_code}
                              </button>
                              <EventBadge event={item.event_type} size="sm" />
                              {item.group_code && (
                                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue font-bold">
                                  Group {item.group_code}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <AttendanceBadge status={item.attendance_status || 'pending'} size="sm" />
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {item.slot_label || 'Scheduled Session'}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <div className="flex items-center gap-2">
                              <Clock size={13} className="text-primary-blue shrink-0" />
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatTimeOnly(item.start_time)} – {formatTimeOnly(item.end_time)}
                              </span>
                              <span className="text-zinc-400">({formatDateOnly(item.start_time)})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <DoorOpen size={13} className="text-primary-blue shrink-0" />
                              <span>{item.room_code || 'Venue Room'}</span>
                              {item.room_name && <span className="text-zinc-400">({item.room_name})</span>}
                            </div>

                            {item.panel_code && (
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <Layers size={13} className="text-primary-blue shrink-0" />
                                <span>Panel: {item.panel_code} ({item.panel_name || 'Evaluation'})</span>
                                {item.panel_status && <PanelStatusBadge status={item.panel_status} size="sm" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white/90 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ParticipantScheduleModal;
