import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, X, Loader2, AlertCircle } from 'lucide-react';
import ParticipantRegistrations from './ParticipantRegistrations';

/**
 * CheckinConfirmModal
 * Modal confirming intentional participant check-in before executing POST request.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.participant
 * @param {Function} props.onSuccess
 */
const CheckinConfirmModal = ({
  isOpen,
  onClose,
  participant,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !participant) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    const toastId = toast.loading(`Checking in ${participant.full_name}…`);

    try {
      const res = await axios.post(`/events/verbafest/participants/${participant.id}/checkin`);
      const updated = {
        ...participant,
        checkin_status: res.data?.checkin_status || 'checked_in',
        checkin_time: res.data?.checkin_time || new Date().toISOString().replace('T', ' ').slice(0, 19),
      };

      toast.success(res.data?.message || `Checked in ${participant.full_name} successfully!`, { id: toastId });
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('Check-in failed:', err);
      const apiError = err.response?.data?.error || err.response?.data?.message || 'Failed to complete check-in.';
      setError(apiError);
      toast.error(apiError, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 id="checkin-modal-title" className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">
                  Confirm Check-in
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  VERBAFEST 2026 Event Attendance
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Details */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              Check in <span className="font-bold text-zinc-900 dark:text-zinc-100">{participant.full_name}</span> for VERBAFEST 2026?
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Participant Code
                </span>
                <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  {participant.participant_code}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Full Name
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {participant.full_name}
                </span>
              </div>

              {participant.college && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    College
                  </span>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 text-right truncate max-w-[220px]">
                    {participant.college}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Registered Events
                </span>
                <ParticipantRegistrations
                  regGd={participant.reg_gd}
                  regDebate={participant.reg_debate}
                  regMindsaga={participant.reg_mindsaga}
                  size="sm"
                />
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Confirming check-in marks the candidate as arrived on-site and records the current timestamp.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
              <span>Confirm Check-in</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CheckinConfirmModal;
