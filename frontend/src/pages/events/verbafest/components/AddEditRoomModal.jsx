import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DoorOpen, Save, Loader2, AlertCircle } from 'lucide-react';

const ROOM_TYPES = [
  { value: 'gd_panel', label: 'GD Panel (Group Discussion)' },
  { value: 'debate_panel', label: 'Debate Panel' },
  { value: 'mindsaga_lab', label: 'Mind Saga Lab' },
  { value: 'waiting_room', label: 'Waiting Room' },
  { value: 'control_room', label: 'Control Room' },
];

/**
 * AddEditRoomModal
 * Modal for creating or editing VERBAFEST rooms.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.room - Existing room if editing, null if creating
 * @param {Function} props.onSuccess - Callback with updated/created room
 */
const AddEditRoomModal = ({
  isOpen,
  onClose,
  room = null,
  onSuccess
}) => {
  const isEditing = Boolean(room && room.id);

  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('gd_panel');
  const [capacity, setCapacity] = useState(30);
  const [currentOccupancy, setCurrentOccupancy] = useState(0);
  const [locationDetails, setLocationDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form when room prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (room) {
        setRoomCode(room.room_code || '');
        setName(room.name || '');
        setRoomType(room.room_type || 'gd_panel');
        setCapacity(room.capacity !== undefined ? Number(room.capacity) : 30);
        setCurrentOccupancy(room.current_occupancy !== undefined ? Number(room.current_occupancy) : 0);
        setLocationDetails(room.location_details || '');
      } else {
        // Suggested room code prefix based on default type
        setRoomCode('R-');
        setName('');
        setRoomType('gd_panel');
        setCapacity(30);
        setCurrentOccupancy(0);
        setLocationDetails('');
      }
    }
  }, [isOpen, room]);

  // Handle ESC key press
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

    // Client-side validations
    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const capNum = parseInt(capacity, 10);
    const occNum = parseInt(currentOccupancy, 10);

    if (!trimmedCode) {
      setErrorMessage('Room code is required.');
      return;
    }
    if (!trimmedName) {
      setErrorMessage('Room name is required.');
      return;
    }
    if (isNaN(capNum) || capNum <= 0) {
      setErrorMessage('Capacity must be a positive number greater than 0.');
      return;
    }
    if (isNaN(occNum) || occNum < 0) {
      setErrorMessage('Occupancy cannot be negative.');
      return;
    }
    if (occNum > capNum) {
      setErrorMessage(`Occupancy (${occNum}) cannot exceed room capacity (${capNum}).`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isEditing ? 'Updating room…' : 'Creating room…');

    try {
      const payload = {
        room_code: trimmedCode,
        name: trimmedName,
        room_type: roomType,
        capacity: capNum,
        current_occupancy: occNum,
        location_details: locationDetails.trim() || null,
      };

      if (isEditing) {
        const res = await axios.put(`/events/verbafest/rooms/${room.id}`, payload);
        toast.success(res.data?.message || 'Room updated successfully!', { id: toastId });
        if (onSuccess) onSuccess({ ...room, ...payload });
      } else {
        const res = await axios.post('/events/verbafest/rooms', payload);
        toast.success(res.data?.message || 'Room created successfully!', { id: toastId });
        if (onSuccess) onSuccess(res.data?.data || payload);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save room:', err);
      const apiError = err.response?.data?.error || err.response?.data?.message || 'Failed to save room. Please try again.';
      setErrorMessage(apiError);
      toast.error(apiError, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-primary-blue dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <DoorOpen size={20} />
              </div>
              <div>
                <h2 id="room-modal-title" className="text-lg font-black text-zinc-900 dark:text-zinc-50 font-display">
                  {isEditing ? 'Edit Room' : 'Add New Room'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing ? `Modifying room ${room?.room_code}` : 'Configure venue capacity and allocations'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Room Code */}
              <div>
                <label htmlFor="room_code" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                  Room Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="room_code"
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. R-101 or LAB-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue uppercase"
                />
              </div>

              {/* Room Type */}
              <div>
                <label htmlFor="room_type" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                  Room Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="room_type"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room Name */}
            <div>
              <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                Room Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Seminar Hall A, CSE Lab 3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
            </div>

            {/* Location Details */}
            <div>
              <label htmlFor="location_details" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                Location / Venue Details
              </label>
              <input
                id="location_details"
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Ground Floor, Academic Complex Building"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Capacity */}
              <div>
                <label htmlFor="capacity" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                  Capacity <span className="text-rose-500">*</span>
                </label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>

              {/* Current Occupancy */}
              <div>
                <label htmlFor="current_occupancy" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
                  Current Occupancy
                </label>
                <input
                  id="current_occupancy"
                  type="number"
                  min="0"
                  max={capacity}
                  value={currentOccupancy}
                  onChange={(e) => setCurrentOccupancy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            {/* Capacity Preview pill */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Available Seats:</span>
              <span className={`font-mono font-bold ${Number(capacity) - Number(currentOccupancy) <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {Math.max(0, Number(capacity) - Number(currentOccupancy))} / {capacity}
              </span>
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-primary-blue-dark text-white text-xs font-bold shadow-md shadow-primary-blue/20 transition cursor-pointer disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{isEditing ? 'Save Changes' : 'Create Room'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddEditRoomModal;
