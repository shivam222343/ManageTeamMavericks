import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Award,
  User,
  UserCheck,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Layers,
  DoorOpen,
  Trash2,
  Plus,
  RefreshCw,
  Edit,
  AlertCircle
} from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';
import VerbafestLoader from './VerbafestLoader';
import EmptyState from './EmptyState';

/**
 * JudgeDetailsModal
 * Comprehensive modal displaying judge credentials, qualifications,
 * assigned panels, and management actions.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {number|string|null} props.judgeId
 * @param {boolean} props.canManage
 * @param {Function} props.onRefreshParent
 * @param {Function} props.onOpenEdit
 * @param {Function} props.onOpenAssignPanel
 */
const JudgeDetailsModal = ({
  isOpen,
  onClose,
  judgeId,
  canManage = false,
  onRefreshParent,
  onOpenEdit,
  onOpenAssignPanel,
}) => {
  const [judge, setJudge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [removingPanelId, setRemovingPanelId] = useState(null);

  const fetchJudgeDetails = useCallback(async () => {
    if (!judgeId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/events/verbafest/judges/${judgeId}`);
      setJudge(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch judge details:', err);
      toast.error('Failed to load judge details.');
    } finally {
      setLoading(false);
    }
  }, [judgeId]);

  useEffect(() => {
    if (isOpen && judgeId) {
      fetchJudgeDetails();
      setShowPin(false);
    } else {
      setJudge(null);
    }
  }, [isOpen, judgeId, fetchJudgeDetails]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copy PIN helper
  const handleCopyPin = () => {
    if (!judge?.access_pin) return;
    navigator.clipboard.writeText(judge.access_pin);
    toast.success('Access PIN copied to clipboard.');
  };

  // Remove judge from panel
  const handleRemovePanel = async (panelId, panelCode) => {
    if (!canManage || !judge) return;
    if (!window.confirm(`Are you sure you want to unassign judge "${judge.name}" from panel ${panelCode}?`)) {
      return;
    }

    setRemovingPanelId(panelId);
    const toastId = toast.loading('Removing panel assignment…');

    try {
      await axios.delete(`/events/verbafest/judges/${judge.id}/panels/${panelId}`);
      toast.success(`Removed from panel ${panelCode}.`, { id: toastId });
      fetchJudgeDetails();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error('Failed to remove panel assignment:', err);
      toast.error(err.response?.data?.error || 'Failed to remove panel assignment.', { id: toastId });
    } finally {
      setRemovingPanelId(null);
    }
  };

  if (!isOpen) return null;

  const isInternal = Boolean(judge?.user_id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {judge?.name || 'Judge Profile'}
                  </h3>
                  {judge?.event_type && <EventBadge event={judge.event_type} size="sm" />}
                  {isInternal ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue dark:text-blue-400 border border-blue-500/20">
                      <UserCheck size={11} />
                      <span>Internal</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <User size={11} />
                      <span>External</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {judge?.designation || 'VERBAFEST 2026 Adjudicator'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchJudgeDetails}
                disabled={loading}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="Refresh details"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {loading && !judge ? (
              <div className="py-12">
                <VerbafestLoader message="Loading judge profile and panel bindings…" />
              </div>
            ) : !judge ? (
              <div className="py-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Judge Not Found"
                  description="The requested judge profile could not be loaded."
                />
              </div>
            ) : (
              <>
                {/* 1. Contact & Identity Grid */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-3">
                    Contact & Authentication
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Email */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Email</span>
                        <a
                          href={`mailto:${judge.email}`}
                          className="text-xs font-semibold text-primary-blue hover:underline truncate block"
                        >
                          {judge.email}
                        </a>
                      </div>
                      <Mail size={16} className="text-zinc-400 shrink-0" />
                    </div>

                    {/* Phone */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Phone</span>
                        {judge.phone ? (
                          <a
                            href={`tel:${judge.phone}`}
                            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-primary-blue truncate block"
                          >
                            {judge.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400">Not provided</span>
                        )}
                      </div>
                      <Phone size={16} className="text-zinc-400 shrink-0" />
                    </div>

                    {/* Linked Account (If Internal) */}
                    {isInternal && (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                          Linked Maverick Account
                        </span>
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          {judge.user_account_name || 'Maverick Member'} ({judge.user_account_email || judge.email})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Access PIN Box (For Managers) */}
                  {canManage && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <KeyRound size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                            Portal Access PIN
                          </span>
                          <span className="text-sm font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                            {showPin ? judge.access_pin : '••••'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition cursor-pointer"
                          title={showPin ? 'Hide PIN' : 'Reveal PIN'}
                        >
                          {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPin}
                          className="px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Copy PIN"
                        >
                          <Copy size={13} />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Assigned Panels Section */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      <Layers size={16} className="text-primary-blue" />
                      <span>Assigned Panels ({judge.panels?.length || 0})</span>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenAssignPanel) onOpenAssignPanel(judge);
                        }}
                        className="px-3 py-1 rounded-xl bg-primary-blue/10 text-primary-blue hover:bg-primary-blue/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Assign to Panel</span>
                      </button>
                    )}
                  </div>

                  {!judge.panels || judge.panels.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                      Judge is not currently assigned to evaluate any panels.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {judge.panels.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center shrink-0">
                              <Layers size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                                  {p.panel_code}
                                </span>
                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                  {p.name}
                                </span>
                                <EventBadge event={p.event_type} size="sm" />
                                {p.is_head_judge === 1 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <ShieldCheck size={11} />
                                    <span>Head Judge</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-3 mt-0.5">
                                {p.room_code && (
                                  <span className="flex items-center gap-1">
                                    <DoorOpen size={11} />
                                    {p.room_code} {p.room_name ? `(${p.room_name})` : ''}
                                  </span>
                                )}
                                {p.status && <PanelStatusBadge status={p.status} size="sm" />}
                              </div>
                            </div>
                          </div>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemovePanel(p.id, p.panel_code)}
                              disabled={removingPanelId === p.id}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                              title="Unassign from panel"
                            >
                              <Trash2 size={14} className={removingPanelId === p.id ? 'animate-pulse' : ''} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div>
              {canManage && judge && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenEdit) onOpenEdit(judge);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit size={14} />
                  <span>Edit Judge Profile</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white/90 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JudgeDetailsModal;
