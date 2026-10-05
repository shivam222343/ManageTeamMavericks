import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, Minus, Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * OccupancyModal
 * Allows coordinators/core members to update room live occupancy.
 * Supports absolute occupancy updates with quick steppers.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.room - Selected room
 * @param {Function} props.onSuccess - Callback on successful update
 */
const OccupancyModal = ({
  isOpen,
  onClose,
  room,
  onSuccess
}) => {
  const [occupancy, setOccupancy] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const capacity = room ? Number(room.capacity) : 30;

  useEffect(() => {
    if (isOpen && room) {
      setOccupancy(Number(room.current_occupancy) || 0);
      setErrorMessage('');
    }
  }, [isOpen, room]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !room) return null;

  const handleAdjust = (delta) => {
    setOccupancy((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > capacity) return capacity;
      return next;
    });
  };

  const percent = Math.min(100, Math.round((occupancy / (capacity || 1)) * 100));
  const available = Math.max(0, capacity - occupancy);

  // Status threshold coloring
  let progressColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  let statusText = 'Normal';

  if (percent >= 100) {
    progressColor = 'bg-rose-500';
    badgeColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    statusText = 'Full';
  } else if (percent >= 70) {
    progressColor = 'bg-amber-500';
    badgeColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    statusText = 'High Occupancy';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const occNum = parseInt(occupancy, 10);
    if (isNaN(occNum) || occNum < 0) {
      setErrorMessage('Occupancy cannot be negative.');
      return;
    }
    if (occNum > capacity) {
      setErrorMessage(`Occupancy (${occNum}) exceeds room capacity (${capacity}).`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Updating room occupancy…');

    try {
      const res = await axios.patch(`/events/verbafest/rooms/${room.id}/occupancy`, {
        current_occupancy: occNum,
      });

      toast.success(res.data?.message || 'Occupancy updated successfully!', { id: toastId });
      if (onSuccess) {
        onSuccess({
          ...room,
          current_occupancy: occNum,
          available_capacity: capacity - occNum,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to update occupancy:', err);
      const apiError = err.response?.data?.error || err.response?.data?.message || 'Failed to update occupancy.';
      setErrorMessage(apiError);
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
        aria-labelledby="occupancy-modal-title"
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
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Users size={20} />
              </div>
              <div>
                <h2 id="occupancy-modal-title" className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">
                  Live Occupancy
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {room.room_code} — {room.name}
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

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Capacity Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Current</span>
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">{occupancy}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Capacity</span>
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">{capacity}</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Available</span>
                <span className={`text-lg font-black font-display ${available === 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {available}
                </span>
              </div>
            </div>

            {/* Progress Bar & Status */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Occupancy Load:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md border ${badgeColor}`}>
                    {statusText}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-50">{percent}%</span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${progressColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Stepper Input */}
            <div className="space-y-2">
              <label htmlFor="occupancy_input" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono text-center">
                Adjust Current Occupancy
              </label>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAdjust(-5)}
                  disabled={occupancy <= 0 || loading}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Decrease by 5"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust(-1)}
                  disabled={occupancy <= 0 || loading}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Decrease by 1"
                >
                  <Minus size={16} />
                </button>

                <input
                  id="occupancy_input"
                  type="number"
                  min="0"
                  max={capacity}
                  value={occupancy}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) setOccupancy(0);
                    else setOccupancy(Math.max(0, Math.min(capacity, val)));
                  }}
                  className="w-24 text-center py-2.5 px-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-lg font-black font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />

                <button
                  type="button"
                  onClick={() => handleAdjust(1)}
                  disabled={occupancy >= capacity || loading}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Increase by 1"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust(5)}
                  disabled={occupancy >= capacity || loading}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  title="Increase by 5"
                >
                  +5
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOccupancy(0)}
                  disabled={occupancy === 0 || loading}
                  className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer disabled:opacity-40"
                >
                  Set Empty (0)
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  type="button"
                  onClick={() => setOccupancy(capacity)}
                  disabled={occupancy === capacity || loading}
                  className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer disabled:opacity-40"
                >
                  Set Full ({capacity})
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                <span>Save Occupancy</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OccupancyModal;
