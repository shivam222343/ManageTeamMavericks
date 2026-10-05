import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  DoorOpen,
  Users,
  Award,
  ShieldCheck,
  Trash2,
  Plus,
  RefreshCw,
  Edit,
  AlertCircle,
  Mail
} from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';
import VerbafestLoader from './VerbafestLoader';
import EmptyState from './EmptyState';
import AttendanceBadge from './AttendanceBadge';

const STATUSES = ['FREE', 'READY', 'OCCUPIED', 'BREAK', 'JUDGES_ABSENT'];

/**
 * PanelDetailsModal
 * Comprehensive panel inspection modal showing venue info, assigned judges,
 * live status switcher, and active group participants.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {number|string|null} props.panelId
 * @param {boolean} props.canManage
 * @param {Function} props.onRefreshParent
 * @param {Function} props.onOpenEdit
 * @param {Function} props.onOpenChangeRoom
 * @param {Function} props.onOpenAssignJudge
 */
const PanelDetailsModal = ({
  isOpen,
  onClose,
  panelId,
  canManage = false,
  onRefreshParent,
  onOpenEdit,
  onOpenChangeRoom,
  onOpenAssignJudge,
}) => {
  const [panel, setPanel] = useState(null);
  const [currentGroupData, setCurrentGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [removingJudgeId, setRemovingJudgeId] = useState(null);

  const fetchPanelDetails = useCallback(async () => {
    if (!panelId) return;
    setLoading(true);
    try {
      const [detailRes, groupRes] = await Promise.all([
        axios.get(`/events/verbafest/panels/${panelId}`),
        axios.get(`/events/verbafest/panels/${panelId}/group`).catch(() => ({ data: null })),
      ]);

      setPanel(detailRes.data?.data || null);
      setCurrentGroupData(groupRes.data || null);
    } catch (err) {
      console.error('Failed to fetch panel details:', err);
      toast.error('Failed to load panel details.');
    } finally {
      setLoading(false);
    }
  }, [panelId]);

  useEffect(() => {
    if (isOpen && panelId) {
      fetchPanelDetails();
    } else {
      setPanel(null);
      setCurrentGroupData(null);
    }
  }, [isOpen, panelId, fetchPanelDetails]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle quick status change
  const handleStatusChange = async (newStatus) => {
    if (!canManage || updatingStatus || !panel) return;
    setUpdatingStatus(true);
    const toastId = toast.loading(`Updating status to ${newStatus}…`);

    try {
      await axios.patch(`/events/verbafest/panels/${panel.id}/status`, {
        status: newStatus,
      });
      setPanel((prev) => (prev ? { ...prev, status: newStatus } : prev));
      toast.success(`Panel status changed to ${newStatus}.`, { id: toastId });
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.error || 'Failed to update status.', { id: toastId });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle removing a judge from the panel
  const handleRemoveJudge = async (judgeId, judgeName) => {
    if (!canManage || !panel) return;
    if (!window.confirm(`Are you sure you want to remove judge "${judgeName}" from panel ${panel.panel_code}?`)) {
      return;
    }

    setRemovingJudgeId(judgeId);
    const toastId = toast.loading('Removing judge from panel…');

    try {
      await axios.delete(`/events/verbafest/panels/${panel.id}/judges/${judgeId}`);
      toast.success(`Judge removed from panel ${panel.panel_code}.`, { id: toastId });
      // Refresh panel
      fetchPanelDetails();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error('Failed to remove judge:', err);
      toast.error(err.response?.data?.error || 'Failed to remove judge.', { id: toastId });
    } finally {
      setRemovingJudgeId(null);
    }
  };

  if (!isOpen) return null;

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
                <Layers size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {panel?.panel_code || 'Panel Details'}
                  </h3>
                  {panel?.event_type && <EventBadge event={panel.event_type} size="sm" />}
                  {panel?.status && <PanelStatusBadge status={panel.status} size="sm" />}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {panel?.name || 'Loading panel details…'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPanelDetails}
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
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {loading && !panel ? (
              <div className="py-12">
                <VerbafestLoader message="Loading panel operational details…" />
              </div>
            ) : !panel ? (
              <div className="py-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Panel Not Found"
                  description="The requested panel could not be loaded or may have been deleted."
                />
              </div>
            ) : (
              <>
                {/* 1. Quick Status Selector (For Managers) */}
                {canManage && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Operational Status Control
                      </span>
                      <span className="text-[10px] text-zinc-400">Instant Live Update</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(st)}
                          disabled={updatingStatus || panel.status === st}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            panel.status === st
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                          } disabled:opacity-50`}
                        >
                          <PanelStatusBadge status={st} size="sm" showDot={panel.status === st} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Room & Venue Details */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      <DoorOpen size={16} className="text-primary-blue" />
                      <span>Venue Room Allocation</span>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenChangeRoom) onOpenChangeRoom(panel);
                        }}
                        className="text-xs font-bold text-primary-blue hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit size={12} />
                        <span>Change Room</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Room Code</span>
                      <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {panel.room_code || 'Unassigned'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Room Name</span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                        {panel.room_name || '—'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Capacity</span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {panel.capacity} participants
                      </span>
                    </div>
                  </div>
                  {panel.location_details && (
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Location:</span> {panel.location_details}
                    </div>
                  )}
                </div>

                {/* 3. Assigned Judges Section */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      <Award size={16} className="text-amber-500" />
                      <span>Assigned Judges ({panel.judges?.length || 0})</span>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenAssignJudge) onOpenAssignJudge(panel);
                        }}
                        className="px-3 py-1 rounded-xl bg-primary-blue/10 text-primary-blue hover:bg-primary-blue/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Assign Judge</span>
                      </button>
                    )}
                  </div>

                  {!panel.judges || panel.judges.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                      No judges currently assigned to this panel.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {panel.judges.map((j) => (
                        <div
                          key={j.id}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                              <Award size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {j.name}
                                </span>
                                {j.is_head_judge === 1 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <ShieldCheck size={11} />
                                    <span>Head Judge</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-3 mt-0.5">
                                <span>{j.designation || 'Judge'}</span>
                                {j.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail size={11} />
                                    {j.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveJudge(j.id, j.name)}
                              disabled={removingJudgeId === j.id}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                              title="Remove judge from panel"
                            >
                              <Trash2 size={14} className={removingJudgeId === j.id ? 'animate-pulse' : ''} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Active Group / Current Participants */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      <Users size={16} className="text-emerald-500" />
                      <span>Current Group Session</span>
                    </div>
                    {currentGroupData?.participants && currentGroupData.participants.length > 0 && (
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {currentGroupData.participants[0]?.group_code || 'Group Session'}
                      </span>
                    )}
                  </div>

                  {!currentGroupData?.participants || currentGroupData.participants.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                      No active participant group currently in evaluation.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
                            <th className="py-2 px-2.5">Code</th>
                            <th className="py-2 px-2.5">Participant</th>
                            <th className="py-2 px-2.5">College</th>
                            <th className="py-2 px-2.5 text-right">Attendance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                          {currentGroupData.participants.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 px-2.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                {p.participant_code}
                              </td>
                              <td className="py-2 px-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                                {p.full_name}
                              </td>
                              <td className="py-2 px-2.5 text-zinc-500 truncate max-w-[120px]">
                                {p.college || '—'}
                              </td>
                              <td className="py-2 px-2.5 text-right">
                                <AttendanceBadge status={p.attendance_status || 'pending'} size="sm" />
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
            <div>
              {canManage && panel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenEdit) onOpenEdit(panel);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit size={14} />
                  <span>Edit Panel</span>
                </button>
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

export default PanelDetailsModal;
