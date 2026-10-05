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
  Users,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';
import AttendanceBadge from './AttendanceBadge';
import VerbafestLoader from './VerbafestLoader';
import EmptyState from './EmptyState';

const formatFullDate = (dtStr) => {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dtStr;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dtStr;
  }
};

const formatTimeRange = (startStr, endStr) => {
  if (!startStr || !endStr) return '—';
  try {
    const s = new Date(startStr.replace(' ', 'T'));
    const e = new Date(endStr.replace(' ', 'T'));
    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffMins = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
    return `${sStr} – ${eStr} (${diffMins} min)`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
};

/**
 * ScheduleSlotDetailsModal
 * Modal displaying complete details, venue info, and allocated attendees of a slot.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {number|string|null} props.slotId
 * @param {boolean} props.canManage
 * @param {Function} props.onRefreshParent
 * @param {Function} props.onOpenEdit
 * @param {Function} props.onOpenParticipantTimeline
 */
const ScheduleSlotDetailsModal = ({
  isOpen,
  onClose,
  slotId,
  canManage = false,
  onRefreshParent,
  onOpenEdit,
  onOpenParticipantTimeline,
}) => {
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchSlotDetails = useCallback(async () => {
    if (!slotId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/events/verbafest/schedule/${slotId}`);
      setSlot(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load slot details:', err);
      toast.error('Failed to load schedule slot details.');
    } finally {
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    if (isOpen && slotId) {
      fetchSlotDetails();
    } else {
      setSlot(null);
    }
  }, [isOpen, slotId, fetchSlotDetails]);

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

  // Handle slot deletion
  const handleDelete = async () => {
    if (!canManage || !slot) return;
    const memberCount = slot.members?.length || 0;
    if (memberCount > 0) {
      toast.error(`Cannot delete slot: ${memberCount} participant(s) are currently allocated. Reassign or remove allocations first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete schedule slot "${slot.slot_code}"?`)) {
      return;
    }

    setDeleting(true);
    const toastId = toast.loading('Deleting schedule slot…');

    try {
      await axios.delete(`/events/verbafest/schedule/${slot.id}`);
      toast.success(`Slot ${slot.slot_code} deleted successfully.`, { id: toastId });
      if (onRefreshParent) onRefreshParent();
      onClose();
    } catch (err) {
      console.error('Failed to delete slot:', err);
      const apiErr = err.response?.data?.error || 'Failed to delete schedule slot.';
      toast.error(apiErr, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const memberList = slot?.members || [];

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
                <Calendar size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                    {slot?.slot_code || 'Schedule Slot'}
                  </h3>
                  {slot?.event_type && <EventBadge event={slot.event_type} size="sm" />}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {slot?.slot_label || 'Loading slot details…'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchSlotDetails}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Refresh details"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {loading && !slot ? (
              <div className="py-12">
                <VerbafestLoader message="Loading slot details and allocations…" />
              </div>
            ) : !slot ? (
              <div className="py-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Slot Not Found"
                  description="The requested schedule slot could not be loaded."
                />
              </div>
            ) : (
              <>
                {/* 1. Schedule Timing & Venue Grid */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-3">
                    Timing & Venue Allocation
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Date & Time */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Scheduled Window
                      </span>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Clock size={14} className="text-primary-blue shrink-0" />
                        <span>{formatTimeRange(slot.start_time, slot.end_time)}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        {formatFullDate(slot.start_time)}
                      </div>
                    </div>

                    {/* Venue Room */}
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Venue Room
                      </span>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <DoorOpen size={14} className="text-primary-blue shrink-0" />
                        <span>{slot.room_code || 'Unassigned Room'}</span>
                        {slot.room_name && (
                          <span className="text-zinc-500 font-normal">({slot.room_name})</span>
                        )}
                      </div>
                      {slot.room_capacity && (
                        <div className="text-[11px] text-zinc-500 mt-1">
                          Room Capacity: {slot.room_capacity} seats
                        </div>
                      )}
                    </div>

                    {/* Assigned Panel (If applicable) */}
                    {slot.panel_id && (
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 sm:col-span-2 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                            Assigned Evaluation Panel
                          </span>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Layers size={14} className="text-primary-blue shrink-0" />
                            <span>{slot.panel_code}</span>
                            <span className="text-zinc-500 font-normal">— {slot.panel_name}</span>
                          </div>
                        </div>
                        {slot.panel_status && <PanelStatusBadge status={slot.panel_status} size="sm" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Allocated Participants Roster */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      <Users size={16} className="text-primary-blue" />
                      <span>Allocated Attendees ({memberList.length})</span>
                    </div>

                    {memberList.length > 0 && (
                      <span className="text-[11px] text-zinc-400">
                        Group allocations in this slot
                      </span>
                    )}
                  </div>

                  {memberList.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                      No participants allocated to this schedule slot yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
                            <th className="py-2.5 px-3">Participant</th>
                            <th className="py-2.5 px-3">Group</th>
                            <th className="py-2.5 px-3">College</th>
                            <th className="py-2.5 px-3 text-center">Attendance</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                          {memberList.map((m) => (
                            <tr key={m.allocation_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                              <td className="py-2.5 px-3">
                                <div>
                                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block">
                                    {m.participant_code}
                                  </span>
                                  <span className="text-zinc-600 dark:text-zinc-400 block truncate max-w-[150px]">
                                    {m.full_name}
                                  </span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                {m.group_code || '—'}
                              </td>

                              <td className="py-2.5 px-3 text-zinc-500 truncate max-w-[130px]">
                                {m.college || '—'}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <AttendanceBadge status={m.attendance_status || 'pending'} size="sm" />
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onOpenParticipantTimeline) {
                                      onOpenParticipantTimeline(m.participant_id);
                                    }
                                  }}
                                  className="p-1 text-primary-blue hover:underline text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title="View participant timeline"
                                >
                                  <span>Timeline</span>
                                  <ExternalLink size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {canManage && slot && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenEdit) onOpenEdit(slot);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit size={14} />
                    <span>Edit Slot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title={memberList.length > 0 ? 'Cannot delete slots with allocated participants' : 'Delete slot'}
                  >
                    <Trash2 size={14} />
                    <span>Delete Slot</span>
                  </button>
                </>
              )}
            </div>

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

export default ScheduleSlotDetailsModal;
