import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Save, Loader2, AlertCircle } from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: 'gd', label: 'Group Discussion (GD)' },
  { value: 'debate', label: 'Debate' },
  { value: 'mindsaga', label: 'Mind Saga' },
];

const toDatetimeLocal = (dtStr) => {
  if (!dtStr) return '';
  return dtStr.replace(' ', 'T').slice(0, 16);
};

const toBackendDatetime = (localStr) => {
  if (!localStr) return '';
  return localStr.replace('T', ' ') + (localStr.length === 16 ? ':00' : '');
};

/**
 * AddEditScheduleModal
 * Modal for configuring and modifying VERBAFEST schedule slots.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.slot - Existing slot if editing, null if creating
 * @param {Array} props.panels - Panels list for panel_id dropdown
 * @param {Array} props.rooms - Rooms list for room_id dropdown
 * @param {Function} props.onSuccess - Callback on successful create/update
 * @param {Function} props.onConflict - Callback if backend returns 409 conflict
 */
const AddEditScheduleModal = ({
  isOpen,
  onClose,
  slot = null,
  panels = [],
  rooms = [],
  onSuccess,
  onConflict,
}) => {
  const isEditing = Boolean(slot && slot.id);

  const [slotCode, setSlotCode] = useState('');
  const [eventType, setEventType] = useState('gd');
  const [slotLabel, setSlotLabel] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [panelId, setPanelId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (slot) {
        setSlotCode(slot.slot_code || '');
        setEventType(slot.event_type || 'gd');
        setSlotLabel(slot.slot_label || '');
        setStartTime(toDatetimeLocal(slot.start_time));
        setEndTime(toDatetimeLocal(slot.end_time));
        setPanelId(slot.panel_id ? String(slot.panel_id) : '');
        setRoomId(slot.room_id ? String(slot.room_id) : '');
      } else {
        const today = new Date().toISOString().slice(0, 10);
        setSlotCode('SLOT-GD-');
        setEventType('gd');
        setSlotLabel('');
        setStartTime(`${today}T09:00`);
        setEndTime(`${today}T09:45`);
        setPanelId('');
        setRoomId('');
      }
    }
  }, [isOpen, slot]);

  // Update suggested code when event type changes on create
  const handleEventTypeChange = (newType) => {
    setEventType(newType);
    if (!isEditing) {
      if (newType === 'gd') setSlotCode('SLOT-GD-');
      else if (newType === 'debate') setSlotCode('SLOT-DEB-');
      else if (newType === 'mindsaga') setSlotCode('SLOT-MS-');
    }
    // If panel doesn't match new type, reset panel
    const curPanel = panels.find((p) => String(p.id) === String(panelId));
    if (curPanel && curPanel.event_type !== newType) {
      setPanelId('');
    }
  };

  // When panel changes, auto-populate room if empty
  const handlePanelChange = (selectedPanelId) => {
    setPanelId(selectedPanelId);
    if (selectedPanelId) {
      const found = panels.find((p) => String(p.id) === String(selectedPanelId));
      if (found && found.room_id) {
        setRoomId(String(found.room_id));
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

  // Filter panels compatible with current event_type
  const compatiblePanels = panels.filter((p) => p.event_type === eventType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedCode = slotCode.trim().toUpperCase();
    const trimmedLabel = slotLabel.trim();
    const bStartTime = toBackendDatetime(startTime);
    const bEndTime = toBackendDatetime(endTime);

    if (!trimmedCode) {
      setErrorMessage('Slot code is required.');
      return;
    }
    if (!trimmedLabel) {
      setErrorMessage('Slot label is required.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage('Both start time and end time are required.');
      return;
    }
    if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
      setErrorMessage('Start time must be strictly before end time.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isEditing ? 'Updating schedule slot…' : 'Creating schedule slot…');

    try {
      const payload = {
        slot_code: trimmedCode,
        event_type: eventType,
        slot_label: trimmedLabel,
        start_time: bStartTime,
        end_time: bEndTime,
        panel_id: panelId ? parseInt(panelId, 10) : null,
        room_id: roomId ? parseInt(roomId, 10) : null,
      };

      if (isEditing) {
        await axios.put(`/events/verbafest/schedule/${slot.id}`, payload);
        toast.success(`Slot ${trimmedCode} updated successfully.`, { id: toastId });
      } else {
        await axios.post('/events/verbafest/schedule', payload);
        toast.success(`Slot ${trimmedCode} created successfully.`, { id: toastId });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save schedule slot:', err);

      // Handle backend conflict detection response
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        toast.dismiss(toastId);
        onClose();
        if (onConflict) {
          onConflict(err.response.data.conflict, err.response.data.error);
        }
        return;
      }

      const apiErr = err.response?.data?.error || (isEditing ? 'Failed to update schedule slot.' : 'Failed to create schedule slot.');
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
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {isEditing ? `Edit Slot — ${slot?.slot_code}` : 'Create Schedule Slot'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing
                    ? 'Adjust schedule timing, venue room, or assigned evaluation panel'
                    : 'Schedule a time slot for GD, Debate, or Mind Saga'}
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
                  Event Format <span className="text-rose-500">*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => handleEventTypeChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Code */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Slot Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={slotCode}
                  onChange={(e) => setSlotCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SLOT-GD-01"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            {/* Slot Label */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Slot Label / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                placeholder="e.g. GD Preliminary Round 1 — Batch A"
                disabled={loading}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
            </div>

            {/* Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Start Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  End Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            {/* Panel & Room dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Panel dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Assigned Panel {eventType === 'mindsaga' ? '(Optional)' : ''}
                </label>
                <select
                  value={panelId}
                  onChange={(e) => handlePanelChange(e.target.value)}
                  disabled={loading || compatiblePanels.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  <option value="">No panel assigned</option>
                  {compatiblePanels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.panel_code} — {p.name}
                    </option>
                  ))}
                </select>
                {eventType !== 'mindsaga' && compatiblePanels.length === 0 && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    No {eventType.toUpperCase()} panels configured yet.
                  </p>
                )}
              </div>

              {/* Room dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Venue Room (Optional)
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  <option value="">Auto-inherit from panel</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_code} — {r.name}
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
                    <span>{isEditing ? 'Save Changes' : 'Create Slot'}</span>
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

export default AddEditScheduleModal;
