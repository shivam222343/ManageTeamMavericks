import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X, Send, Bell, Users, Globe, UserCheck, Search, Sparkles,
  AlertTriangle, Award, CheckCircle2, Calendar, ShieldCheck,
  Check, Filter, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NOTIF_TYPES = [
  { id: 'announcement', label: 'Announcement', icon: Bell, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { id: 'event', label: 'Event Alert', icon: Calendar, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { id: 'attendance', label: 'Attendance', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'mindsaga', label: 'Shortlist / Arena', icon: Award, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { id: 'alert', label: 'Urgent Alert', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10 border-red-500/30' },
];

const TEMPLATES = [
  {
    title: '📢 Important Event Announcement',
    message: 'Welcome all participants! Please verify your venue location and keep your 3D digital pass ready at the entry gate.',
    type: 'announcement'
  },
  {
    title: '🏆 Next Round Shortlist Released',
    message: 'Shortlisted candidates have been advanced to the next stage. Check your event progression section for live access details.',
    type: 'mindsaga'
  },
  {
    title: '🎟️ Attendance Check-In Open',
    message: 'Attendance verification desks are now active. Scan your pass QR at the counter to unlock your arena launcher.',
    type: 'attendance'
  },
  {
    title: '⚡ Schedule & Arena Update',
    message: 'Please take your assigned seats at the venue. The symposium stage will commence shortly.',
    type: 'event'
  }
];

export default function EventNotificationModal({
  isOpen,
  onClose,
  eventId = null,
  eventName = '',
  initialSelectedUserIds = []
}) {
  const [targetScope, setTargetScope] = useState(
    initialSelectedUserIds.length > 0 ? 'selected' : (eventId ? 'event_all' : 'all')
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [link, setLink] = useState('/user/dashboard');
  
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelectedUserIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);

  // Sync initial selection
  useEffect(() => {
    if (initialSelectedUserIds.length > 0) {
      setSelectedIds(initialSelectedUserIds);
      setTargetScope('selected');
    }
  }, [initialSelectedUserIds]);

  // Fetch recipients list
  useEffect(() => {
    if (!isOpen) return;

    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const url = eventId
          ? `/notifications/recipients?event_id=${eventId}`
          : `/notifications/recipients`;
        const res = await axios.get(url);
        setRecipients(res.data.recipients || []);
      } catch (err) {
        toast.error('Failed to load recipient directory');
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchRecipients();
  }, [isOpen, eventId]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter(
      r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.phone && r.phone.includes(q))
    );
  }, [recipients, searchQuery]);

  const toggleSelectUser = (id) => {
    if (!id) return;
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const validIds = filteredRecipients
      .map(r => r.target_user_id || r.account_user_id)
      .filter(Boolean);
    setSelectedIds(Array.from(new Set([...selectedIds, ...validIds])));
  };

  const clearAllSelected = () => {
    setSelectedIds([]);
  };

  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setType(tpl.type);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter notification title and message');
      return;
    }

    if (targetScope === 'selected' && selectedIds.length === 0) {
      toast.error('Please select at least one recipient from the list');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Dispatching notification…');

    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || '/user/dashboard',
        target: targetScope,
        event_id: eventId,
        user_ids: targetScope === 'selected' ? selectedIds : []
      };

      const res = await axios.post('/notifications/send', payload);
      toast.dismiss(toastId);
      toast.success(res.data.message || 'Notification broadcasted successfully!');
      
      // Reset & close
      setTitle('');
      setMessage('');
      setSelectedIds([]);
      onClose();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Failed to dispatch notification');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-primary-blue flex items-center justify-center ring-1 ring-blue-500/20">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-50">
                  Notification Dispatcher
                </h3>
                {eventName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-primary-blue border border-blue-500/20">
                    {eventName}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Send real-time instant alerts and targeted messages to portal users
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Audience Tabs */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Select Target Audience
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Global */}
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                  targetScope === 'all'
                    ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 text-zinc-950 dark:text-white shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${targetScope === 'all' ? 'bg-primary-blue text-white' : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <Globe size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Global (All Users)</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Entire portal broadcast</p>
                </div>
              </button>

              {/* Option 2: Event Participants */}
              {eventId && (
                <button
                  type="button"
                  onClick={() => setTargetScope('event_all')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                    targetScope === 'event_all'
                      ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 text-zinc-950 dark:text-white shadow-sm ring-1 ring-blue-500/30'
                      : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${targetScope === 'event_all' ? 'bg-primary-blue text-white' : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Event Registrants</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">All participants in {eventName || 'this event'}</p>
                  </div>
                </button>
              )}

              {/* Option 3: Selected Users */}
              <button
                type="button"
                onClick={() => setTargetScope('selected')}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                  targetScope === 'selected'
                    ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 text-zinc-950 dark:text-white shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${targetScope === 'selected' ? 'bg-primary-blue text-white' : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <UserCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    Selected Users {selectedIds.length > 0 && `(${selectedIds.length})`}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Pick from directory list</p>
                </div>
              </button>
            </div>
          </div>

          {/* User Directory Picker (If 'selected' scope is active) */}
          {targetScope === 'selected' && (
            <div className="p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by candidate name, email, or mobile…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                  >
                    Select Filtered ({filteredRecipients.length})
                  </button>
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSelected}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Recipients Multi-Select Box */}
              <div className="max-h-56 overflow-y-auto divide-y divide-zinc-200/60 dark:divide-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                {loadingRecipients ? (
                  <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                    Loading recipient directory…
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                    No matching candidates found.
                  </div>
                ) : (
                  filteredRecipients.map((rec) => {
                    const uid = rec.target_user_id || rec.account_user_id;
                    const isSelected = uid && selectedIds.includes(uid);
                    return (
                      <div
                        key={rec.registration_id || rec.target_user_id || rec.email}
                        onClick={() => uid && toggleSelectUser(uid)}
                        className={`flex items-center justify-between p-2.5 px-3 transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            disabled={!uid}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-950 dark:text-zinc-100 truncate">
                              {rec.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {rec.email} {rec.phone && `• ${rec.phone}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {rec.main_attendance === 1 && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Present
                            </span>
                          )}
                          {rec.sub_events_count > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {rec.sub_events_count} Sub-Event(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Quick Preset Templates
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-blue-500 hover:text-primary-blue transition"
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Type Selector */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
              Notification Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {NOTIF_TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                      active
                        ? t.color + ' ring-1 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields: Title, Message, Link */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Notification Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 📢 Round 2 Schedule Announced"
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Message Content *
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement or instructions for candidates…"
                className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Destination Link (Optional)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/user/dashboard or /events/..."
                className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Real-time Drawer Preview
            </label>
            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-primary-blue flex items-center justify-center shrink-0">
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-primary-blue">
                    {type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Just now</span>
                </div>
                <p className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 truncate">
                  {title || 'Notification Headline'}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                  {message || 'Your notification body copy will appear here in the user notification drawer and live toast chime.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-blue hover:bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
          >
            <Send size={14} />
            <span>
              {sending ? 'Broadcasting…' : targetScope === 'selected' ? `Dispatch to ${selectedIds.length} Selected` : 'Broadcast Now'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
