import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Save,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import EventBadge from './EventBadge';
import ParticipantSelector from './ParticipantSelector';

const EVENT_OPTIONS = [
  { value: 'gd', label: 'Group Discussion (GD)' },
  { value: 'debate', label: 'Debate' },
  { value: 'mindsaga', label: 'Mind Saga' },
];

const ATTENDANCE_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
];

const formatSlotTime = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  try {
    const s = new Date(startStr.replace(' ', 'T'));
    const e = new Date(endStr.replace(' ', 'T'));
    const sStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${sStr} - ${eStr}`;
  } catch {
    return `${startStr} - ${endStr}`;
  }
};

/**
 * AddEditAllocationModal
 * Modal for creating allocations (single or batch into a group) or editing an existing allocation.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} [props.allocation] - Existing allocation if editing a single record
 * @param {string} [props.defaultEventType] - Initial event format
 * @param {string} [props.defaultGroupCode] - Initial group code
 * @param {number|string} [props.defaultSlotId] - Initial slot ID
 * @param {number|string} [props.defaultPanelId] - Initial panel ID
 * @param {Array} props.slots - Schedule slots
 * @param {Array} props.panels - Panels list
 * @param {Array} props.rooms - Rooms list
 * @param {Array} props.participants - Participants list
 * @param {Array} props.existingAllocations - All allocations
 * @param {Function} props.onSuccess - Success callback
 * @param {Function} props.onConflict - Conflict alert callback (conflictData, errorTitle)
 */
const AddEditAllocationModal = ({
  isOpen,
  onClose,
  allocation = null,
  defaultEventType = 'gd',
  defaultGroupCode = '',
  defaultSlotId = '',
  defaultPanelId = '',
  slots = [],
  panels = [],
  participants = [],
  existingAllocations = [],
  onSuccess,
  onConflict,
}) => {
  const isEditing = Boolean(allocation && allocation.id);

  // Form states
  const [eventType, setEventType] = useState('gd');
  const [groupCode, setGroupCode] = useState('');
  const [slotId, setSlotId] = useState('');
  const [panelId, setPanelId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('pending');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  // Async UI states
  const [loading, setLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { current: 1, total: 5 }
  const [errorMessage, setErrorMessage] = useState('');

  // Existing group codes for suggestions
  const existingGroupCodes = useMemo(() => {
    const set = new Set();
    existingAllocations.forEach((a) => {
      if (a.event_type === eventType && a.group_code) {
        set.add(a.group_code);
      }
    });
    return Array.from(set).sort();
  }, [existingAllocations, eventType]);

  // Filter slots matching selected event type
  const matchingSlots = useMemo(() => {
    return slots.filter((s) => s.event_type === eventType);
  }, [slots, eventType]);

  // Filter panels matching selected event type
  const matchingPanels = useMemo(() => {
    return panels.filter((p) => p.event_type === eventType);
  }, [panels, eventType]);

  // Selected panel object
  const selectedPanel = useMemo(() => {
    return panels.find((p) => Number(p.id) === Number(panelId));
  }, [panels, panelId]);

  // Capacity calculations for selected slot + panel
  const capacityInfo = useMemo(() => {
    if (!slotId || !panelId || !selectedPanel) {
      return { maxCapacity: null, currentAllocated: 0, remaining: 999 };
    }
    const maxCapacity = Number(selectedPanel.capacity) || 10;
    // Count how many allocations exist for this slot and panel
    const currentAllocated = existingAllocations.filter(
      (a) => Number(a.slot_id) === Number(slotId) && Number(a.panel_id) === Number(panelId)
    ).length;
    const remaining = Math.max(0, maxCapacity - currentAllocated);
    return { maxCapacity, currentAllocated, remaining };
  }, [slotId, panelId, selectedPanel, existingAllocations]);

  // Reset or populate form on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setBatchProgress(null);
      if (allocation) {
        // Edit mode
        setEventType(allocation.event_type || 'gd');
        setGroupCode(allocation.group_code || '');
        setSlotId(allocation.slot_id ? String(allocation.slot_id) : '');
        setPanelId(allocation.panel_id ? String(allocation.panel_id) : '');
        setAttendanceStatus(allocation.attendance_status || 'pending');
        setSelectedParticipantIds([]);
      } else {
        // Create mode
        const initialType = defaultEventType || 'gd';
        setEventType(initialType);
        setGroupCode(defaultGroupCode || (initialType === 'gd' ? 'GD-G01' : initialType === 'debate' ? 'DEB-G01' : 'MS-G01'));
        setSlotId(defaultSlotId ? String(defaultSlotId) : '');
        setPanelId(defaultPanelId ? String(defaultPanelId) : '');
        setAttendanceStatus('pending');
        setSelectedParticipantIds([]);
      }
    }
  }, [isOpen, allocation, defaultEventType, defaultGroupCode, defaultSlotId, defaultPanelId]);

  // Auto-populate panel from slot if slot specifies panel
  const handleSlotChange = (newSlotId) => {
    setSlotId(newSlotId);
    const foundSlot = slots.find((s) => Number(s.id) === Number(newSlotId));
    if (foundSlot && foundSlot.panel_id && !panelId) {
      setPanelId(String(foundSlot.panel_id));
    }
  };

  // Switch event type and adjust default group code & reset participant selection
  const handleEventTypeChange = (newType) => {
    setEventType(newType);
    setSelectedParticipantIds([]);
    setSlotId('');
    setPanelId('');

    // Suggest code for new type
    if (!defaultGroupCode) {
      if (newType === 'gd') setGroupCode('GD-G01');
      else if (newType === 'debate') setGroupCode('DEB-G01');
      else setGroupCode('MS-G01');
    }
  };

  // Generate next group code helper
  const handleSuggestNextCode = () => {
    const prefix = eventType === 'gd' ? 'GD-G' : eventType === 'debate' ? 'DEB-G' : 'MS-G';
    let maxNum = 0;
    existingGroupCodes.forEach((code) => {
      if (code.startsWith(prefix)) {
        const numPart = parseInt(code.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const nextNum = String(maxNum + 1).padStart(2, '0');
    setGroupCode(`${prefix}${nextNum}`);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!groupCode.trim()) {
      setErrorMessage('Group code is required.');
      return;
    }
    if (!slotId) {
      setErrorMessage('Please select a schedule slot.');
      return;
    }
    if (['gd', 'debate'].includes(eventType) && !panelId) {
      setErrorMessage(`Please select a panel for ${eventType.toUpperCase()} allocation.`);
      return;
    }

    if (isEditing) {
      // Single allocation update
      setLoading(true);
      try {
        await axios.put(`/events/verbafest/allocations/${allocation.id}`, {
          group_code: groupCode.trim(),
          slot_id: Number(slotId),
          panel_id: panelId ? Number(panelId) : null,
          attendance_status: attendanceStatus,
        });

        toast.success('Allocation updated successfully.');
        onSuccess?.();
        onClose();
      } catch (err) {
        if (err.response?.status === 409 && err.response?.data?.conflict) {
          onClose();
          onConflict?.(err.response.data.conflict, err.response.data.error || 'Conflict detected');
        } else {
          const msg = err.response?.data?.error || err.message || 'Failed to update allocation.';
          setErrorMessage(msg);
          toast.error(msg);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Create mode: batch participant allocation
    if (selectedParticipantIds.length === 0) {
      setErrorMessage('Please select at least one participant to allocate.');
      return;
    }

    if (capacityInfo.maxCapacity && selectedParticipantIds.length > capacityInfo.remaining) {
      setErrorMessage(
        `Selection exceeds remaining panel capacity (${capacityInfo.remaining} remaining, ${selectedParticipantIds.length} selected).`
      );
      return;
    }

    setLoading(true);
    let successCount = 0;
    const totalToAllocate = selectedParticipantIds.length;

    try {
      for (let i = 0; i < totalToAllocate; i++) {
        const pId = selectedParticipantIds[i];
        setBatchProgress({ current: i + 1, total: totalToAllocate });

        try {
          await axios.post('/events/verbafest/allocations', {
            group_code: groupCode.trim(),
            event_type: eventType,
            participant_id: pId,
            slot_id: Number(slotId),
            panel_id: panelId ? Number(panelId) : null,
            attendance_status: 'pending',
          });
          successCount++;
        } catch (postErr) {
          // If conflict or error occurs on this participant
          if (postErr.response?.status === 409 && postErr.response?.data?.conflict) {
            onClose();
            onConflict?.(
              postErr.response.data.conflict,
              postErr.response.data.error || 'Scheduling conflict encountered.'
            );
            if (successCount > 0) {
              toast.success(`Allocated ${successCount} participant(s) before conflict.`);
              onSuccess?.();
            }
            return;
          } else {
            const errDetail = postErr.response?.data?.error || postErr.message;
            toast.error(`Error on participant #${i + 1}: ${errDetail}`);
            // If already allocated some, refresh list
            if (successCount > 0) {
              onSuccess?.();
            }
            setErrorMessage(`Failed allocating participant #${i + 1}: ${errDetail}`);
            setLoading(false);
            setBatchProgress(null);
            return;
          }
        }
      }

      toast.success(`Successfully allocated ${successCount} participant(s) into ${groupCode}.`);
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isEditing ? `Edit Allocation #${allocation.id}` : 'Allocate Participants to Group'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? `Modify group, time slot, panel, or attendance for ${allocation.full_name || 'participant'}`
                    : 'Assign participants to a discussion or debate group with real-time capacity and conflict validation'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* If Editing: Display participant info banner */}
            {isEditing && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {allocation.full_name}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      {allocation.participant_code}
                    </span>
                    <EventBadge eventType={allocation.event_type} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {allocation.college || 'College not specified'} {allocation.email ? `• ${allocation.email}` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Event Format Selection (Create Mode Only) */}
            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Event Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleEventTypeChange(opt.value)}
                      disabled={loading}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition-all ${
                        eventType === opt.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group Code Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Group Code <span className="text-rose-500">*</span>
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleSuggestNextCode}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Suggest Next Code
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GD-G01, DEB-G02"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                {/* Quick picker from existing groups */}
                {!isEditing && existingGroupCodes.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">Existing:</span>
                    {existingGroupCodes.slice(0, 6).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setGroupCode(code)}
                        className={`text-xs px-2 py-0.5 rounded-md font-mono border transition-colors ${
                          groupCode === code
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance Status (Shown prominently in Edit Mode) */}
              {isEditing ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Attendance Status
                  </label>
                  <select
                    value={attendanceStatus}
                    onChange={(e) => setAttendanceStatus(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {ATTENDANCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-center text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Initial Attendance</span>
                  <span>New group allocations are registered with <strong className="text-amber-600 dark:text-amber-400">Pending</strong> attendance by default. You can update attendance anytime from the roster.</span>
                </div>
              )}
            </div>

            {/* Schedule Slot & Panel Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Schedule Slot */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Schedule Slot <span className="text-rose-500">*</span>
                </label>
                <select
                  value={slotId}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select a schedule time slot</option>
                  {matchingSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.slot_code}] {s.slot_label || 'Slot'} • {formatSlotTime(s.start_time, s.end_time)}
                      {s.room_code ? ` (${s.room_code})` : ''}
                    </option>
                  ))}
                </select>
                {matchingSlots.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No schedule slots created for {eventType.toUpperCase()} yet. Please add a slot in Schedule Management first.
                  </p>
                )}
              </div>

              {/* Panel */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Panel <span className="text-rose-500">*</span>
                </label>
                <select
                  value={panelId}
                  onChange={(e) => setPanelId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select an evaluation panel</option>
                  {matchingPanels.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.panel_code}] {p.name} (Cap: {p.capacity || 10})
                      {p.room_code ? ` • ${p.room_code}` : ''}
                    </option>
                  ))}
                </select>
                {matchingPanels.length === 0 && ['gd', 'debate'].includes(eventType) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No panels configured for {eventType.toUpperCase()}. Please configure panels first.
                  </p>
                )}
              </div>
            </div>

            {/* Capacity Progress Bar for Selected Slot + Panel */}
            {selectedPanel && slotId && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Panel Capacity: <strong className="text-slate-800 dark:text-slate-200">{selectedPanel.name}</strong>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {capacityInfo.currentAllocated} / {capacityInfo.maxCapacity} allocated
                    <span className="text-slate-400 font-normal ml-1">
                      ({capacityInfo.remaining} spots free)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      capacityInfo.remaining === 0
                        ? 'bg-rose-500'
                        : capacityInfo.remaining <= 2
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (capacityInfo.currentAllocated / (capacityInfo.maxCapacity || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                {capacityInfo.remaining === 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    This panel has reached its maximum capacity for this slot.
                  </div>
                )}
              </div>
            )}

            {/* In Create Mode: Participant Selection via ParticipantSelector */}
            {!isEditing && (
              <div className="pt-2">
                <ParticipantSelector
                  eventType={eventType}
                  participants={participants}
                  existingAllocations={existingAllocations}
                  selectedIds={selectedParticipantIds}
                  onChange={setSelectedParticipantIds}
                  disabled={loading}
                  maxAllowed={capacityInfo.remaining}
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {!isEditing && selectedParticipantIds.length > 0 && (
                  <span>
                    Ready to allocate <strong className="text-indigo-600 dark:text-indigo-400">{selectedParticipantIds.length}</strong> participant(s)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (!isEditing && selectedParticipantIds.length === 0)}
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {batchProgress
                          ? `Allocating ${batchProgress.current}/${batchProgress.total}...`
                          : 'Saving...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditing ? 'Save Changes' : `Allocate (${selectedParticipantIds.length})`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddEditAllocationModal;
