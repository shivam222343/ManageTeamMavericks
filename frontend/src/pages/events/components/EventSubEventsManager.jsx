import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Users,
  User,
  Coins,
  Sparkles,
  HelpCircle,
  Tag,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  ArrowRight,
  Sliders
} from 'lucide-react';

const EventSubEventsManager = ({ eventId, event, onUpdate }) => {
  const [subEvents, setSubEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comboFee, setComboFee] = useState(event?.combo_fee || '');
  const [savingCombo, setSavingCombo] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubEvent, setEditingSubEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual',
    min_team_size: 1,
    max_team_size: 1,
    fee: 0,
    max_participants: '',
    registration_status: 'open',
    description: '',
    rules: '',
    display_order: 0
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubEvents();
    if (event?.combo_fee) {
      setComboFee(event.combo_fee);
    }
  }, [eventId, event]);

  const fetchSubEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/events/${eventId}/sub-events`);
      setSubEvents(res.data || []);
    } catch (err) {
      toast.error('Failed to load sub-events');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSubEvent(null);
    setFormData({
      name: '',
      type: 'individual',
      min_team_size: 1,
      max_team_size: 1,
      fee: 0,
      max_participants: '',
      registration_status: 'open',
      description: '',
      rules: '',
      display_order: subEvents.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSubEvent(sub);
    setFormData({
      name: sub.name,
      type: sub.type,
      min_team_size: sub.min_team_size || 1,
      max_team_size: sub.max_team_size || 1,
      fee: sub.fee || 0,
      max_participants: sub.max_participants || '',
      registration_status: sub.registration_status || 'open',
      description: sub.description || '',
      rules: sub.rules || '',
      display_order: sub.display_order || 0
    });
    setIsModalOpen(true);
  };

  const handleToggleRegistrationStatus = async (sub) => {
    const newStatus = sub.registration_status === 'open' ? 'closed' : 'open';
    try {
      setTogglingStatusId(sub.id);
      await axios.patch(`/events/${eventId}/sub-events/${sub.id}/status`, {
        registration_status: newStatus
      });
      toast.success(`Registration ${newStatus === 'open' ? 'opened' : 'closed'} for ${sub.name}!`, {
        icon: newStatus === 'open' ? '🔓' : '🔒'
      });
      fetchSubEvents();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update registration status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Sub-event name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        max_participants: formData.max_participants !== '' && formData.max_participants !== null ? parseInt(formData.max_participants) : null
      };

      if (editingSubEvent) {
        await axios.put(`/events/${eventId}/sub-events/${editingSubEvent.id}`, payload);
        toast.success('Sub-event updated successfully!');
      } else {
        await axios.post(`/events/${eventId}/sub-events`, payload);
        toast.success('Sub-event created successfully!');
      }
      setIsModalOpen(false);
      fetchSubEvents();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save sub-event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subId, subName) => {
    if (!window.confirm(`Are you sure you want to delete "${subName}"?`)) return;

    try {
      await axios.delete(`/events/${eventId}/sub-events/${subId}`);
      toast.success('Sub-event deleted');
      fetchSubEvents();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete sub-event');
    }
  };

  const handleSaveComboFee = async () => {
    try {
      setSavingCombo(true);
      await axios.put(`/events/${eventId}`, {
        combo_fee: comboFee ? parseFloat(comboFee) : null
      });
      toast.success('Combo fee updated successfully!');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update combo fee');
    } finally {
      setSavingCombo(false);
    }
  };

  const totalIndividualFees = subEvents.reduce((acc, curr) => acc + parseFloat(curr.fee || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top action bar & Combo Fee configuration */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-black tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-1">
              <Layers size={12} />
              <span>Multi-Track Sub-Events</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Sub-Events &amp; Competitions
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure independent rounds, custom seat limits, fee structures, and close registrations individually.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition cursor-pointer shadow-md shadow-primary-blue/20 shrink-0"
          >
            <Plus size={15} />
            <span>Add Sub-Event</span>
          </button>
        </div>

        {/* Combo Pricing Box */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-yellow-500" />
              All-Round Combo Package Pricing
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              If a participant selects all sub-events during registration, this discounted combo fee will automatically apply.
              {totalIndividualFees > 0 && (
                <span className="ml-1 font-mono text-primary-blue">
                  (Sum of individual fees: ₹{totalIndividualFees})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
              <input
                type="number"
                value={comboFee}
                onChange={(e) => setComboFee(e.target.value)}
                placeholder="Combo Fee (e.g. 200)"
                className="w-36 pl-7 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSaveComboFee}
              disabled={savingCombo}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              Save Combo
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">
            Loading sub-events...
          </div>
        ) : subEvents.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400 bg-white/20 dark:bg-zinc-900/20 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8">
            <Layers className="mx-auto text-zinc-400 mb-2" size={32} />
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">No sub-events added yet.</p>
            <p className="text-xs text-zinc-500 mt-1">Click "Add Sub-Event" above to create competitions like MindSaga, GD, Debate, etc.</p>
          </div>
        ) : (
          subEvents.map((sub) => {
            const maxPart = sub.max_participants ? parseInt(sub.max_participants) : null;
            const totalRegs = sub.total_registrations ? parseInt(sub.total_registrations) : 0;
            const isFull = Boolean(maxPart && maxPart > 0 && totalRegs >= maxPart);
            const isClosed = sub.registration_status === 'closed';

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase font-black tracking-widest text-primary-blue">
                          Sub-Event
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                            isClosed
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : isFull
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}
                        >
                          {isClosed ? 'Closed' : isFull ? 'Housefull' : 'Open'}
                        </span>
                      </div>

                      <h4 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                        {sub.name}
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        sub.type === 'group'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {sub.type}
                    </span>
                  </div>

                  {sub.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Fee</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white">₹{parseFloat(sub.fee || 0)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Team Size</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white">
                        {sub.type === 'group' ? `${sub.min_team_size || 2} - ${sub.max_team_size || 4} Members` : 'Individual (1)'}
                      </p>
                    </div>
                  </div>

                  {/* Participant Capacity & Registration Count */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-400">Capacity &amp; Regs:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {totalRegs} {maxPart ? `/ ${maxPart} max` : '(Unlimited)'}
                      </span>
                    </div>

                    {maxPart && maxPart > 0 && (
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isFull ? 'bg-rose-500' : totalRegs / maxPart > 0.8 ? 'bg-amber-500' : 'bg-primary-blue'
                          }`}
                          style={{ width: `${Math.min(100, (totalRegs / maxPart) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons & Quick Close/Open Toggle */}
                <div className="space-y-2 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <Link
                    to={`/dashboard/events/${eventId}/sub-events/${sub.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition shadow-md shadow-purple-600/20 cursor-pointer text-center"
                  >
                    <Sliders size={13} />
                    <span>Manage Subevent</span>
                    <ArrowRight size={13} />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRegistrationStatus(sub)}
                      disabled={togglingStatusId === sub.id}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider border transition cursor-pointer disabled:opacity-50 ${
                        isClosed
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}
                      title={isClosed ? 'Reopen Registrations for this track' : 'Close Registrations for this track'}
                    >
                      {isClosed ? <Unlock size={12} /> : <Lock size={12} />}
                      <span>{isClosed ? 'Reopen Reg' : 'Close Reg'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                      title="Edit Sub-Event"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDelete(sub.id, sub.name)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                      title="Delete Sub-event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mb-5 space-y-1">
                <span className="text-[10px] font-mono uppercase font-black tracking-widest text-primary-blue">
                  {editingSubEvent ? 'Edit Sub-Event' : 'Create New Sub-Event'}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingSubEvent ? editingSubEvent.name : 'Add Competition Track'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Sub-Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. MindSaga, GD, Debate"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Participation Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value,
                          min_team_size: e.target.value === 'individual' ? 1 : 2,
                          max_team_size: e.target.value === 'individual' ? 1 : 4
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="individual">Individual (1 Person)</option>
                      <option value="group">Group / Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Capacity & Registration Status Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Participant / Team Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited (Leave empty)"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 block">Max allowable entries for this track</span>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Registration Status
                    </label>
                    <select
                      value={formData.registration_status}
                      onChange={(e) => setFormData({ ...formData, registration_status: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="open">Open (Accepting Registrations)</option>
                      <option value="closed">Closed (Manual Close / Full)</option>
                    </select>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Quickly enable or disable track entries</span>
                  </div>
                </div>

                {formData.type === 'group' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                    <div>
                      <label className="block font-bold text-purple-700 dark:text-purple-300 mb-1 text-[11px]">
                        Min Team Members
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.min_team_size}
                        onChange={(e) => setFormData({ ...formData, min_team_size: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-purple-300 dark:border-purple-800 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-purple-700 dark:text-purple-300 mb-1 text-[11px]">
                        Max Team Members
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.max_team_size}
                        onChange={(e) => setFormData({ ...formData, max_team_size: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-purple-300 dark:border-purple-800 rounded-xl font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Description &amp; Highlights
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short summary of this sub-event track..."
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-md shadow-primary-blue/20"
                  >
                    {submitting ? 'Saving...' : editingSubEvent ? 'Update Sub-Event' : 'Create Sub-Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default EventSubEventsManager;

