import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Clock,
  DoorOpen,
  Layers,
  UserPlus,
  RefreshCw,
  Trash2,
  CalendarCheck,
  Phone,
  Mail,
  School,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import EventBadge from './EventBadge';
import AttendanceBadge from './AttendanceBadge';
import VerbafestLoader from './VerbafestLoader';

const formatSlotTime = (startStr, endStr) => {
  if (!startStr || !endStr) return '—';
  try {
    const s = new Date(startStr.replace(' ', 'T'));
    const e = new Date(endStr.replace(' ', 'T'));
    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${sStr} – ${eStr}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
};

/**
 * AllocationDetailsModal
 * Comprehensive modal displaying group details, time slot, panel, venue room,
 * and roster of allocated participants with live attendance toggles, removal, and schedule inspection.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string|null} props.groupCode
 * @param {boolean} [props.canManage] - User management authorization
 * @param {Function} [props.onAddMembers] - Callback to open add member modal for this group
 * @param {Function} [props.onViewParticipantSchedule] - Callback with participantId to open timeline
 * @param {Function} [props.onDataChanged] - Callback when an allocation or attendance changes
 */
const AllocationDetailsModal = ({
  isOpen,
  onClose,
  groupCode = null,
  canManage = false,
  onAddMembers,
  onViewParticipantSchedule,
  onDataChanged,
}) => {
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch full group details
  const fetchGroupDetails = useCallback(async () => {
    if (!groupCode) return;
    setLoading(true);
    try {
      const res = await axios.get(`/events/verbafest/allocations/groups/${encodeURIComponent(groupCode)}`);
      setGroupData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  }, [groupCode]);

  useEffect(() => {
    if (isOpen && groupCode) {
      fetchGroupDetails();
    } else {
      setGroupData(null);
    }
  }, [isOpen, groupCode, fetchGroupDetails]);

  // Derive group metadata from first member
  const firstMember = useMemo(() => {
    if (!groupData || !groupData.members || groupData.members.length === 0) return null;
    return groupData.members[0];
  }, [groupData]);

  // Attendance breakdown counts
  const attendanceCounts = useMemo(() => {
    if (!groupData?.members) return { present: 0, pending: 0, absent: 0 };
    return groupData.members.reduce(
      (acc, m) => {
        const s = m.attendance_status || 'pending';
        if (s === 'present') acc.present++;
        else if (s === 'absent') acc.absent++;
        else acc.pending++;
        return acc;
      },
      { present: 0, pending: 0, absent: 0 }
    );
  }, [groupData]);

  // Update participant attendance status
  const handleUpdateAttendance = async (allocationId, newStatus) => {
    if (!canManage) return;
    setUpdatingAttendanceId(allocationId);
    try {
      await axios.patch(`/events/verbafest/allocations/${allocationId}/attendance`, {
        attendance_status: newStatus,
      });

      // Update local state
      setGroupData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.allocation_id === allocationId ? { ...m, attendance_status: newStatus } : m
          ),
        };
      });

      toast.success(`Attendance updated to ${newStatus}.`);
      onDataChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attendance.');
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  // Remove participant from group
  const handleRemoveMember = async (allocationId, memberName) => {
    if (!canManage) return;
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this group?`)) {
      return;
    }

    setDeletingId(allocationId);
    try {
      await axios.delete(`/events/verbafest/allocations/${allocationId}`);
      toast.success(`Removed ${memberName} from group.`);

      // Update local state
      setGroupData((prev) => {
        if (!prev) return prev;
        const newMembers = prev.members.filter((m) => m.allocation_id !== allocationId);
        return {
          ...prev,
          member_count: newMembers.length,
          members: newMembers,
        };
      });

      onDataChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen || !groupCode) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                    {groupCode}
                  </h2>
                  {firstMember && <EventBadge eventType={firstMember.event_type} />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  VERBAFEST 2026 Group Roster and Session Details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchGroupDetails}
                disabled={loading}
                title="Refresh Group"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {loading && !groupData ? (
              <div className="py-16">
                <VerbafestLoader message="Loading group roster..." />
              </div>
            ) : groupData ? (
              <>
                {/* Session Meta Info Grid */}
                {firstMember ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Time & Slot */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        Schedule Slot
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {firstMember.slot_label || firstMember.slot_code}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatSlotTime(firstMember.start_time, firstMember.end_time)}
                      </div>
                    </div>

                    {/* Panel */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        Evaluation Panel
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {firstMember.panel_name || firstMember.panel_code || 'Unassigned'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {firstMember.panel_code || '—'}
                      </div>
                    </div>

                    {/* Venue Room */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        <DoorOpen className="w-3.5 h-3.5 text-indigo-500" />
                        Allocated Room
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {firstMember.room_name || firstMember.room_code || 'No Room Assigned'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {firstMember.room_code || '—'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    No members are currently allocated to this group.
                  </div>
                )}

                {/* Attendance Summary Banner + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Total Members:</span>
                      <span className="ml-1.5 font-bold text-slate-900 dark:text-white text-base">
                        {groupData.member_count}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                        {attendanceCounts.present} Present
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800/60">
                        {attendanceCounts.pending} Pending
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800/60">
                        {attendanceCounts.absent} Absent
                      </span>
                    </div>
                  </div>

                  {/* Add Member Button (if authorized) */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        onAddMembers?.({
                          groupCode: groupCode,
                          eventType: firstMember?.event_type || 'gd',
                          slotId: firstMember?.slot_id,
                          panelId: firstMember?.panel_id,
                        })
                      }
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Members
                    </button>
                  )}
                </div>

                {/* Member Roster Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Participant</th>
                          <th className="py-3 px-4">College</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4 text-center">Attendance</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                        {groupData.members.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                              No participants currently assigned to this group.
                            </td>
                          </tr>
                        ) : (
                          groupData.members.map((member, idx) => (
                            <tr
                              key={member.allocation_id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* Index */}
                              <td className="py-3 px-4 text-xs font-medium text-slate-400">
                                {idx + 1}
                              </td>

                              {/* Participant Details */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-800/50">
                                    {member.participant_code}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {member.full_name}
                                  </span>
                                </div>
                              </td>

                              {/* College */}
                              <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5 truncate max-w-xs">
                                  <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{member.college || '—'}</span>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                                <div className="space-y-0.5">
                                  {member.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      <span className="truncate max-w-[150px]">{member.email}</span>
                                    </div>
                                  )}
                                  {member.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{member.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Attendance with Quick Switcher */}
                              <td className="py-3 px-4 text-center">
                                {canManage ? (
                                  <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button
                                      type="button"
                                      disabled={updatingAttendanceId === member.allocation_id}
                                      onClick={() => handleUpdateAttendance(member.allocation_id, 'present')}
                                      className={`px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                        member.attendance_status === 'present'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                                      }`}
                                      title="Mark Present"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingAttendanceId === member.allocation_id}
                                      onClick={() => handleUpdateAttendance(member.allocation_id, 'pending')}
                                      className={`px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                        member.attendance_status === 'pending'
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
                                      }`}
                                      title="Mark Pending"
                                    >
                                      <HelpCircle className="w-3 h-3" />
                                      Pending
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingAttendanceId === member.allocation_id}
                                      onClick={() => handleUpdateAttendance(member.allocation_id, 'absent')}
                                      className={`px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                                        member.attendance_status === 'absent'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                                      }`}
                                      title="Mark Absent"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Absent
                                    </button>
                                  </div>
                                ) : (
                                  <AttendanceBadge status={member.attendance_status} />
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Schedule Modal */}
                                  <button
                                    type="button"
                                    onClick={() => onViewParticipantSchedule?.(member.participant_id)}
                                    title="View Full Itinerary / Schedule"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <CalendarCheck className="w-4 h-4" />
                                  </button>

                                  {/* Remove Member */}
                                  {canManage && (
                                    <button
                                      type="button"
                                      disabled={deletingId === member.allocation_id}
                                      onClick={() =>
                                        handleRemoveMember(member.allocation_id, member.full_name)
                                      }
                                      title="Remove from group"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                                    >
                                      {deletingId === member.allocation_id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Allocations are linked in real-time to evaluator marksheets.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AllocationDetailsModal;
