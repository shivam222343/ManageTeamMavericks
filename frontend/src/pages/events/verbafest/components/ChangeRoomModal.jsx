import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DoorOpen, Save, Loader2, AlertCircle } from 'lucide-react';

/**
 * ChangeRoomModal
 * Modal allowing authorized coordinators to reassign or change a panel's room.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.panel
 * @param {Array} props.rooms
 * @param {Function} props.onSuccess
 */
const ChangeRoomModal = ({
  isOpen,
  onClose,
  panel = null,
  rooms = [],
  onSuccess,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (panel?.room_id) {
        setSelectedRoomId(String(panel.room_id));
      } else if (rooms.length > 0) {
        setSelectedRoomId(String(rooms[0].id));
      } else {
        setSelectedRoomId('');
      }
    }
  }, [isOpen, panel, rooms]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedRoomId = parseInt(selectedRoomId, 10);
    if (isNaN(parsedRoomId) || parsedRoomId <= 0) {
      setErrorMessage('Please select a valid venue room.');
      return;
    }

    if (panel && parsedRoomId === Number(panel.room_id)) {
      toast.info('Panel is already assigned to this room.');
      onClose();
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Reassigning room…');

    try {
      await axios.patch(`/events/verbafest/panels/${panel.id}/room`, {
        room_id: parsedRoomId,
      });

      toast.success(`Room assigned to panel ${panel.panel_code} successfully.`, { id: toastId });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign room to panel:', err);
      const apiErr = err.response?.data?.error || 'Failed to assign room.';
      setErrorMessage(apiErr);
      toast.error(apiErr, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !panel) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                <DoorOpen size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  Assign Room — {panel.panel_code}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {panel.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Current Room Info */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                Currently Assigned Room
              </span>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <DoorOpen size={14} className="text-primary-blue" />
                <span>{panel.room_code || 'None'}</span>
                {panel.room_name && (
                  <span className="text-zinc-500 font-normal">({panel.room_name})</span>
                )}
              </div>
            </div>

            {/* Target Room Selection */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Select New Venue Room <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={loading || rooms.length === 0}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
              >
                {rooms.length === 0 && (
                  <option value="">No rooms available</option>
                )}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_code} — {r.name} ({r.capacity} seats, {r.room_type?.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || rooms.length === 0}
                className="px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Assign Room</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ChangeRoomModal;
