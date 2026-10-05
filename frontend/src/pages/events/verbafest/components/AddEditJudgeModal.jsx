import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Save, Loader2, AlertCircle, Sparkles, User, UserCheck } from 'lucide-react';

const EVENT_TYPE_OPTIONS = [
  { value: 'both', label: 'Both (GD & Debate)' },
  { value: 'gd', label: 'Group Discussion Only' },
  { value: 'debate', label: 'Debate Only' },
];

/**
 * Generates a readable 4-digit PIN for judge portal login
 */
const generateRandomPin = () => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

/**
 * AddEditJudgeModal
 * Modal for creating or editing VERBAFEST judges (both internal and external).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.judge - Existing judge if editing, null if creating
 * @param {Array} props.members - List of internal Maverick user accounts
 * @param {Function} props.onSuccess - Callback on success
 */
const AddEditJudgeModal = ({
  isOpen,
  onClose,
  judge = null,
  members = [],
  onSuccess,
}) => {
  const isEditing = Boolean(judge && judge.id);

  // Type: 'external' vs 'internal'
  const [judgeType, setJudgeType] = useState('external');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [eventType, setEventType] = useState('both');
  const [accessPin, setAccessPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form fields
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (judge) {
        const isInternal = Boolean(judge.user_id);
        setJudgeType(isInternal ? 'internal' : 'external');
        setSelectedUserId(judge.user_id ? String(judge.user_id) : '');
        setName(judge.name || '');
        setEmail(judge.email || '');
        setPhone(judge.phone || '');
        setDesignation(judge.designation || '');
        setEventType(judge.event_type || 'both');
        setAccessPin(judge.access_pin || '');
      } else {
        setJudgeType('external');
        setSelectedUserId('');
        setName('');
        setEmail('');
        setPhone('');
        setDesignation('');
        setEventType('both');
        setAccessPin(generateRandomPin());
      }
    }
  }, [isOpen, judge]);

  // When selecting an internal user, auto-populate name and email
  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    if (!userId) return;
    const found = members.find((m) => String(m.id) === String(userId));
    if (found) {
      setName(found.name || '');
      setEmail(found.email || '');
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

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPin = accessPin.trim();

    if (!trimmedName) {
      setErrorMessage('Judge name is required.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('A valid email address is required.');
      return;
    }
    if (!trimmedPin) {
      setErrorMessage('An access PIN is required.');
      return;
    }

    const payloadUserId = judgeType === 'internal' && selectedUserId ? parseInt(selectedUserId, 10) : null;

    setLoading(true);
    const toastId = toast.loading(isEditing ? 'Updating judge profile…' : 'Registering judge…');

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || null,
        designation: designation.trim() || null,
        event_type: eventType,
        access_pin: trimmedPin,
        user_id: payloadUserId,
      };

      if (isEditing) {
        await axios.put(`/events/verbafest/judges/${judge.id}`, payload);
        toast.success(`Judge "${trimmedName}" updated successfully.`, { id: toastId });
      } else {
        await axios.post('/events/verbafest/judges', payload);
        toast.success(`Judge "${trimmedName}" added successfully.`, { id: toastId });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save judge:', err);
      const apiErr = err.response?.data?.error || (isEditing ? 'Failed to update judge.' : 'Failed to register judge.');
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
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {isEditing ? `Edit Judge — ${judge?.name}` : 'Register New Judge'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isEditing
                    ? 'Update credentials, qualifications, and profile details'
                    : 'Add an internal or external evaluator for VERBAFEST 2026'}
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

            {/* Judge Type Tabs (External vs Internal User) */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Judge Type
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setJudgeType('external');
                    setSelectedUserId('');
                  }}
                  disabled={loading}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    judgeType === 'external'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <User size={14} />
                  <span>External Judge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJudgeType('internal')}
                  disabled={loading}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    judgeType === 'internal'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <UserCheck size={14} />
                  <span>Internal Maverick</span>
                </button>
              </div>
            </div>

            {/* If Internal, show user account selector */}
            {judgeType === 'internal' && (
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  Link Maverick Account
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectUser(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  <option value="">Select a Maverick member account…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email}) — {m.role}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Linking an account automatically associates the judge with their platform profile.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Designation / Affiliation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Adjudicator / Faculty"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Event Qualification */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Event Qualification <span className="text-rose-500">*</span>
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Restricts panel assignment compatibility.
                </p>
              </div>

              {/* Access PIN */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Judge Access PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accessPin}
                    onChange={(e) => setAccessPin(e.target.value)}
                    placeholder="4-digit PIN"
                    disabled={loading}
                    required
                    maxLength={20}
                    className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setAccessPin(generateRandomPin())}
                    disabled={loading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-primary-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="Generate random PIN"
                  >
                    <Sparkles size={11} />
                    <span>Gen</span>
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Used by the judge to log into their scoring portal.
                </p>
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
                    <span>{isEditing ? 'Save Changes' : 'Register Judge'}</span>
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

export default AddEditJudgeModal;
