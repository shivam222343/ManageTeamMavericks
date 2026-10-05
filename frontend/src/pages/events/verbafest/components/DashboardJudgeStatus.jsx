import React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

/**
 * DashboardJudgeStatus
 * Live evaluation staffing metrics, panel assignments, and judge availability.
 *
 * @param {Object} props
 * @param {Array} props.judges - All judges list
 * @param {Array} props.panels - All panels list
 */
const DashboardJudgeStatus = ({ judges = [], panels = [] }) => {
  const totalJudges = judges.length;
  const assignedJudges = judges.filter((j) => (Number(j.assigned_panel_count) || 0) > 0).length;
  const unassignedJudges = totalJudges - assignedJudges;

  const internalJudges = judges.filter((j) => j.user_id !== null && j.user_id !== undefined).length;
  const externalJudges = totalJudges - internalJudges;

  // Unstaffed panels
  const unstaffedPanels = panels.filter((p) => (Number(p.judge_count) || 0) === 0);
  const judgesAbsentPanels = panels.filter((p) => p.status === 'judges_absent');

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Award size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Judges & Evaluator Staffing ({totalJudges})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Panel assignments, attendance, and external judge onboarding
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/judges"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Manage Judges</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Assigned to Panels
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display">
            {assignedJudges}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Unassigned Judges
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-display">
            {unassignedJudges}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            Mavericks Internal
          </span>
          <span className="text-xl font-black text-primary-blue dark:text-blue-400 font-display">
            {internalJudges}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
            External Evaluators
          </span>
          <span className="text-xl font-black text-violet-600 dark:text-violet-400 font-display">
            {externalJudges}
          </span>
        </div>
      </div>

      {/* Staffing Warnings if any */}
      {(unstaffedPanels.length > 0 || judgesAbsentPanels.length > 0) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {unstaffedPanels.length > 0 && (
                <span><strong>{unstaffedPanels.length}</strong> panel(s) have no judges assigned. </span>
              )}
              {judgesAbsentPanels.length > 0 && (
                <span><strong>{judgesAbsentPanels.length}</strong> panel(s) have status marked as judges absent.</span>
              )}
            </span>
          </div>

          <Link
            to="/dashboard/events/verbafest/judges"
            className="font-bold underline shrink-0 hover:text-amber-900 dark:hover:text-amber-200"
          >
            Assign Judges
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardJudgeStatus;
