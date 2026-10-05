import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  School,
  Hash,
  Calendar,
  Clock,
  Layers,
  DoorOpen,
  UserCheck,
  Copy,
  Check,
  Brain,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import AttendanceBadge from './AttendanceBadge';
import EventBadge from './EventBadge';
import ParticipantRegistrations from './ParticipantRegistrations';

/**
 * ParticipantDetailModal
 * Comprehensive detail modal displaying participant identity, registration badges,
 * live check-in status, and assigned event allocations & slots.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.participant - Basic participant data
 * @param {Function} [props.onCheckin] - Trigger checkin action
 * @param {boolean} [props.canCheckin=false] - Authorization flag
 */
const ParticipantDetailModal = ({
  isOpen,
  onClose,
  participant: initialParticipant,
  onCheckin,
  canCheckin = false
}) => {
  const [participant, setParticipant] = useState(initialParticipant);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch full details (including allocations and mindsaga sync)
  const fetchFullDetails = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/events/verbafest/participants/${id}`);
      if (res.data?.data) {
        setParticipant(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch full participant details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && initialParticipant?.id) {
      setParticipant(initialParticipant);
      fetchFullDetails(initialParticipant.id);
    }
  }, [isOpen, initialParticipant, fetchFullDetails]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyCode = () => {
    if (!participant?.participant_code) return;
    navigator.clipboard.writeText(participant.participant_code);
    setCopied(true);
    toast.success('Participant code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not recorded';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen || !participant) return null;

  const isCheckedIn = participant.checkin_status === 'checked_in';
  const allocations = participant.allocations || [];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="participant-detail-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-primary-blue dark:text-blue-400 flex items-center justify-center border border-blue-500/20 font-black text-lg">
                {participant.full_name?.charAt(0) || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="participant-detail-title" className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-display">
                    {participant.full_name}
                  </h2>
                  <AttendanceBadge status={participant.checkin_status} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                    title="Click to copy code"
                  >
                    <span>{participant.participant_code}</span>
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-zinc-400" />}
                  </button>
                  {participant.prn && (
                    <span className="text-xs font-mono text-zinc-400">
                      PRN: {participant.prn}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchFullDetails(participant.id)}
                disabled={loading}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Refresh details"
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
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Identity & Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2.5">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400 block">
                  Contact Information
                </span>

                <div className="flex items-center gap-2 text-xs">
                  <Mail size={14} className="text-zinc-400 shrink-0" />
                  <a
                    href={`mailto:${participant.email}`}
                    className="font-medium text-primary-blue hover:underline truncate"
                  >
                    {participant.email}
                  </a>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Phone size={14} className="text-zinc-400 shrink-0" />
                  <a
                    href={`tel:${participant.phone}`}
                    className="font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:underline"
                  >
                    {participant.phone}
                  </a>
                </div>

                {participant.prn && (
                  <div className="flex items-center gap-2 text-xs">
                    <Hash size={14} className="text-zinc-400 shrink-0" />
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      PRN: {participant.prn}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2.5">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400 block">
                  Institution & Registration
                </span>

                <div className="flex items-start gap-2 text-xs">
                  <School size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {participant.college || 'KIT College of Engineering'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Calendar size={14} className="text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Registered: {formatDateTime(participant.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Registrations */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">
                  Event Registration Status
                </span>
                <ParticipantRegistrations
                  regGd={participant.reg_gd}
                  regDebate={participant.reg_debate}
                  regMindsaga={participant.reg_mindsaga}
                  size="sm"
                  short={false}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className={`p-3 rounded-lg border text-center ${participant.reg_gd ? 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                  <span className="text-[10px] font-mono font-bold uppercase block">Group Discussion</span>
                  <span className="text-xs font-black">{participant.reg_gd ? 'Enrolled' : 'Not Registered'}</span>
                </div>
                <div className={`p-3 rounded-lg border text-center ${participant.reg_debate ? 'bg-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                  <span className="text-[10px] font-mono font-bold uppercase block">Debate</span>
                  <span className="text-xs font-black">{participant.reg_debate ? 'Enrolled' : 'Not Registered'}</span>
                </div>
                <div className={`p-3 rounded-lg border text-center ${participant.reg_mindsaga ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                  <span className="text-[10px] font-mono font-bold uppercase block">Mind Saga</span>
                  <span className="text-xs font-black">{participant.reg_mindsaga ? 'Enrolled' : 'Not Registered'}</span>
                </div>
              </div>

              {/* Mind Saga Sync details if available */}
              {participant.mindsaga_sync && (
                <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="shrink-0" />
                    <span>Mind Saga Sync: <strong className="font-mono uppercase">{participant.mindsaga_sync.mind_saga_status || 'Pending'}</strong></span>
                  </div>
                  {participant.mindsaga_sync.score !== null && participant.mindsaga_sync.score !== undefined && (
                    <span className="font-mono font-bold">Score: {participant.mindsaga_sync.score}</span>
                  )}
                </div>
              )}
            </div>

            {/* Check-in Status Card */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400 block">
                  Check-in Information
                </span>
                <div className="flex items-center gap-2">
                  <AttendanceBadge status={participant.checkin_status} size="md" />
                  {isCheckedIn && participant.checkin_time && (
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      Checked in at {formatDateTime(participant.checkin_time)}
                    </span>
                  )}
                </div>
              </div>

              {!isCheckedIn && canCheckin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onCheckin) onCheckin(participant);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <UserCheck size={14} />
                  <span>Check In Now</span>
                </button>
              )}
            </div>

            {/* Event Allocations & Schedule Activity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">
                  Event Allocations & Schedule ({allocations.length})
                </span>
              </div>

              {loading ? (
                <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 animate-pulse space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              ) : allocations.length === 0 ? (
                <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  <AlertCircle size={20} className="mx-auto mb-2 text-zinc-400 opacity-60" />
                  No group allocations or schedule slots assigned to this participant yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allocations.map((alloc) => (
                    <div
                      key={alloc.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <EventBadge event={alloc.event_type} size="sm" />
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {alloc.group_code}
                          </span>
                          {alloc.slot_label && (
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {alloc.slot_label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          {(alloc.start_time || alloc.end_time) && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Clock size={12} className="text-zinc-400" />
                              {formatTimeOnly(alloc.start_time)} – {formatTimeOnly(alloc.end_time)}
                            </span>
                          )}

                          {alloc.panel_code && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Layers size={12} className="text-zinc-400" />
                              {alloc.panel_code} {alloc.panel_name ? `(${alloc.panel_name})` : ''}
                            </span>
                          )}

                          {alloc.room_code && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <DoorOpen size={12} className="text-zinc-400" />
                              {alloc.room_code} {alloc.room_name ? `(${alloc.room_name})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {alloc.attendance_status && (
                          <AttendanceBadge status={alloc.attendance_status} size="sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-zinc-400 font-mono">
              ID: {participant.id} • Registered in VERBAFEST 2026
            </span>
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

export default ParticipantDetailModal;
