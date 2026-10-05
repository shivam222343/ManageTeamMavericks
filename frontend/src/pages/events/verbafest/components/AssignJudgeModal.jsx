import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Save, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import EventBadge from './EventBadge';

/**
 * AssignJudgeModal
 * Modal for assigning judges to panels or panels to judges.
 * Supports both Panel-centric and Judge-centric workflows.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} [props.panel] - Fixed panel when assigning a judge to a panel
 * @param {Object|null} [props.judge] - Fixed judge when assigning a panel to a judge
 * @param {Array} [props.judgesList] - All judges in system
 * @param {Array} [props.panelsList] - All panels in system
 * @param {Array} [props.existingAssignedIds] - IDs of already assigned judges or panels to prevent duplicate selection
 * @param {Function} props.onSuccess
 */
const AssignJudgeModal = ({
  isOpen,
  onClose,
  panel = null,
  judge = null,
  judgesList = [],
  panelsList = [],
  existingAssignedIds = [],
  onSuccess,
}) => {
  const isPanelMode = Boolean(panel && !judge);
  const isJudgeMode = Boolean(judge && !panel);

  const [selectedId, setSelectedId] = useState('');
  const [isHeadJudge, setIsHeadJudge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSelectedId('');
      setIsHeadJudge(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Compute compatible candidates
  const compatibleCandidates = useMemo(() => {
    if (isPanelMode && panel) {
      const panelType = panel.event_type;
      return judgesList.filter((j) => {
        // Compatibility: judge event_type 'both' or matches panel
        const isCompatible = j.event_type === 'both' || j.event_type === panelType;
        // Already assigned?
        const alreadyAssigned = existingAssignedIds.includes(Number(j.id));
        return isCompatible && !alreadyAssigned;
      });
    }

    if (isJudgeMode && judge) {
      const judgeType = judge.event_type;
      return panelsList.filter((p) => {
        // Compatibility: if judge is 'both', can evaluate any; else must match
        const isCompatible = judgeType === 'both' || p.event_type === judgeType;
        const alreadyAssigned = existingAssignedIds.includes(Number(p.id));
        return isCompatible && !alreadyAssigned;
      });
    }

    return [];
  }, [isPanelMode, isJudgeMode, panel, judge, judgesList, panelsList, existingAssignedIds]);

  // Set default selection when candidates are ready
  useEffect(() => {
    if (compatibleCandidates.length > 0 && !selectedId) {
      setSelectedId(String(compatibleCandidates[0].id));
    }
  }, [compatibleCandidates, selectedId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const targetId = parseInt(selectedId, 10);
    if (isNaN(targetId) || targetId <= 0) {
      setErrorMessage(isPanelMode ? 'Please select a judge.' : 'Please select a panel.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Assigning judge…');

    try {
      if (isPanelMode) {
        await axios.post(`/events/verbafest/panels/${panel.id}/judges`, {
          judge_id: targetId,
          is_head_judge: isHeadJudge ? 1 : 0,
        });
        toast.success('Judge assigned to panel successfully.', { id: toastId });
      } else if (isJudgeMode) {
        await axios.post(`/events/verbafest/judges/${judge.id}/panels`, {
          panel_id: targetId,
          is_head_judge: isHeadJudge ? 1 : 0,
        });
        toast.success('Panel assigned to judge successfully.', { id: toastId });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign judge:', err);
      const apiErr = err.response?.data?.error || 'Failed to complete judge assignment.';
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
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {isPanelMode ? `Assign Judge — ${panel?.panel_code}` : `Assign to Panel — ${judge?.name}`}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isPanelMode ? panel?.name : judge?.designation || 'VERBAFEST Adjudicator'}
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

            {/* Context Badge */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                  {isPanelMode ? 'Target Event Format' : 'Judge Qualifications'}
                </span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {isPanelMode
                    ? (panel?.event_type === 'gd' ? 'Group Discussion Panel' : 'Debate Panel')
                    : `Qualified for: ${judge?.event_type?.toUpperCase() || 'BOTH'}`}
                </span>
              </div>
              <EventBadge event={isPanelMode ? panel?.event_type : judge?.event_type} size="sm" />
            </div>

            {/* Candidate Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                {isPanelMode ? 'Select Qualified Judge' : 'Select Compatible Panel'}{' '}
                <span className="text-rose-500">*</span>
              </label>

              {compatibleCandidates.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No available compatible candidates found. All qualified candidates may already be assigned.
                </div>
              ) : (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
                >
                  {compatibleCandidates.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      {isPanelMode
                        ? `${cand.name} (${cand.designation || 'Judge'} • ${cand.event_type?.toUpperCase()})`
                        : `${cand.panel_code} — ${cand.name} (${cand.event_type?.toUpperCase()})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Head Judge Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer hover:border-primary-blue/50 transition">
                <input
                  type="checkbox"
                  checked={isHeadJudge}
                  onChange={(e) => setIsHeadJudge(e.target.checked)}
                  disabled={loading}
                  className="mt-0.5 rounded border-zinc-300 text-primary-blue focus:ring-primary-blue"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <ShieldCheck size={14} className="text-amber-500" />
                    <span>Designate as Head Judge</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Head judges hold primary authority for panel moderation and score finalization.
                  </p>
                </div>
              </label>
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
                disabled={loading || compatibleCandidates.length === 0}
                className="px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Assigning…</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Confirm Assignment</span>
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

export default AssignJudgeModal;
