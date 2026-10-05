import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Save, Loader2, AlertCircle } from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: 'gd', label: 'GD (Group Discussion)' },
  { value: 'debate', label: 'Debate' },
];

const STATUS_OPTIONS = [
  { value: 'FREE', label: 'Free' },
  { value: 'READY', label: 'Ready' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'BREAK', label: 'Break' },
  { value: 'JUDGES_ABSENT', label: 'Judges Absent' },
];

/**
 * AddEditPanelModal
 * Modal for creating or editing VERBAFEST evaluation panels.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.panel - Existing panel if editing, null if creating
 * @param {Array} props.rooms - Venue rooms list for room_id selection
 * @param {Function} props.onSuccess - Callback on success
 */
const AddEditPanelModal = ({
  isOpen,
  onClose,
  panel = null,
  rooms = [],
  onSuccess,
}) => {
  const isEditing = Boolean(panel && panel.id);

  const [panelCode, setPanelCode] = useState('');
  const [eventType, setEventType] = useState('gd');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [status, setStatus] = useState('FREE');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form fields
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (panel) {
        setPanelCode(panel.panel_code || '');
        setEventType(panel.event_type || 'gd');
        setName(panel.name || '');
        setRoomId(panel.room_id ? String(panel.room_id) : (rooms[0]?.id ? String(rooms[0].id) : ''));
        setCapacity(panel.capacity !== undefined ? Number(panel.capacity) : 10);
        setStatus(panel.status || 'FREE');
      } else {
        setPanelCode('GD-');
        setEventType('gd');
        setName('');
        setRoomId(rooms[0]?.id ? String(rooms[0].id) : '');
        setCapacity(10);
        setStatus('FREE');
      }
    }
  }, [isOpen, panel, rooms]);

  // Update suggested code prefix when event type changes on create
  const handleEventTypeChange = (newType) => {
    setEventType(newType);
    if (!isEditing) {
      if (newType === 'gd' && (!panelCode || panelCode.startsWith('DEB-'))) {
        setPanelCode('GD-');
      } else if (newType === 'debate' && (!panelCode || panelCode.startsWith('GD-'))) {
        setPanelCode('DEB-');
      }
    }
  };

  // Close on Escape
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

    const trimmedCode = panelCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const selectedRoomId = parseInt(roomId, 10);
    const capNum = parseInt(capacity, 10);

    if (!trimmedCode) {
      setErrorMessage('Panel code is required.');
      return;
    }
    if (!trimmedName) {
      setErrorMessage('Panel name is required.');
      return;
    }
    if (isNaN(selectedRoomId) || selectedRoomId <= 0) {
      setErrorMessage('Please select a valid venue room.');
      return;
    }
    if (isNaN(capNum) || capNum <= 0) {
      setErrorMessage('Capacity must be a positive integer greater than 0.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isEditing ? 'Updating panel…' : 'Creating panel…');

    try {
      const payload = {
        panel_code: trimmedCode,
        event_type: eventType,
        name: trimmedName,
        room_id: selectedRoomId,
        capacity: capNum,
        status: status,
      };

      if (isEditing) {
        await axios.put(`/events/verbafest/panels/${panel.id}`, payload);
        toast.success(`Panel ${trimmedCode} updated successfully.`, { id: toastId });
      } else {
        await axios.post('/events/verbafest/panels', payload);
        toast.success(`Panel ${trimmedCode} created successfully.`, { id: toastId });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save panel:', err);
      const apiErr = err.response?.data?.error || (isEditing ? 'Failed to update panel.' : 'Failed to create panel.');
      setErrorMessage(apiErr);
      toast.error(apiErr, { id: toastId });
    } finally {
      setLoading(false);
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
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {isEditing ? `Edit Panel — ${panel?.panel_code}` : 'Add Evaluation Panel'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing
                    ? 'Update panel room, capacity, and operational status'
                    : 'Configure a new evaluation panel for VERBAFEST 2026'}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Event Type */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Event Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Panel Code */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Panel Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={panelCode}
                  onChange={(e) => setPanelCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GD-01, DEB-02"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            {/* Panel Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Panel Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Panel 1 - Blue Hall"
                disabled={loading}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
            </div>

            {/* Room Assignment */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Assigned Venue Room <span className="text-rose-500">*</span>
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={loading || rooms.length === 0}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
              >
                {rooms.length === 0 && (
                  <option value="">No rooms available — create a room first</option>
                )}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_code} — {r.name} ({r.capacity} seats, {r.room_type?.replace('_', ' ')})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Panels must map to an active physical room or laboratory.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Capacity */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Panel Capacity (Participants) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
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
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{isEditing ? 'Save Changes' : 'Create Panel'}</span>
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

export default AddEditPanelModal;
