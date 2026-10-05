import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

/**
 * DashboardAlerts
 * Live operational attention board showing real-time system alerts, missing assignments,
 * capacity bottlenecks, and attendance or scheduling discrepancies.
 *
 * @param {Object} props
 * @param {Array} props.alerts - Array of computed alert objects:
 *   { id, severity: 'critical'|'warning'|'info', title, description, entity, link, linkText }
 */
const DashboardAlerts = ({ alerts = [] }) => {
  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-mono">
              All Operational Systems Nominal
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              All panels staffed, venues within capacity, and schedule synchronized.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
          Status: Normal
        </span>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Operational Attention Required ({alerts.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live checks flagging staffing, capacity, or synchronization gaps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {warningCount} Warnings
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((alert) => {
          const isCritical = alert.severity === 'critical';
          const isWarning = alert.severity === 'warning';

          const cardStyles = isCritical
            ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
            : isWarning
            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
            : 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300';

          const badgeStyles = isCritical
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
            : isWarning
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
            : 'bg-blue-500/15 text-primary-blue dark:text-blue-400 border-blue-500/25';

          const IconComponent = isCritical ? AlertCircle : isWarning ? AlertTriangle : Info;

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${cardStyles}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${badgeStyles}`}
                  >
                    {alert.severity}
                  </span>
                  {alert.entity && (
                    <span className="text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">
                      {alert.entity}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 mt-2">
                  <IconComponent size={14} className="mt-0.5 shrink-0 opacity-80" />
                  <p className="text-xs font-semibold leading-snug">{alert.title}</p>
                </div>
                {alert.description && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 pl-5 leading-normal">
                    {alert.description}
                  </p>
                )}
              </div>

              {alert.link && (
                <div className="pt-2.5 mt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 flex justify-end">
                  <Link
                    to={alert.link}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 hover:text-primary-blue dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{alert.linkText || 'Resolve'}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAlerts;
