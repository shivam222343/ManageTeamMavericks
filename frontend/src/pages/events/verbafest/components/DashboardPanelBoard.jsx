import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Layers,
  ArrowRight,
  DoorOpen,
  Award,
  Users
} from 'lucide-react';
import EventBadge from './EventBadge';
import PanelStatusBadge from './PanelStatusBadge';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Panels' },
  { value: 'free', label: 'Free' },
  { value: 'ready', label: 'Ready' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'break', label: 'Break' },
  { value: 'judges_absent', label: 'Judges Absent' },
];

/**
 * DashboardPanelBoard
 * Real-time panel operational board showing live status, rooms, and judge staffing.
 *
 * @param {Object} props
 * @param {Array} props.panels - List of all panels
 * @param {boolean} [props.canManage] - If true, permits inline status toggling
 * @param {Function} [props.onStatusChanged] - Callback after status mutation
 */
const DashboardPanelBoard = ({ panels = [], canManage = false, onStatusChanged }) => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const filteredPanels = panels.filter((p) => {
    if (selectedStatus === 'all') return true;
    return p.status === selectedStatus;
  });

  // Inline status toggle for coordinators
  const handleQuickStatusChange = async (panelId, newStatus) => {
    if (!canManage) return;
    setUpdatingId(panelId);
    try {
      await axios.patch(`/events/verbafest/panels/${panelId}/status`, { status: newStatus });
      toast.success(`Panel status updated to ${newStatus}.`);
      onStatusChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update panel status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Status breakdown counters
  const statusCounts = {
    free: panels.filter((p) => p.status === 'free').length,
    ready: panels.filter((p) => p.status === 'ready').length,
    occupied: panels.filter((p) => p.status === 'occupied').length,
    break: panels.filter((p) => p.status === 'break').length,
    judges_absent: panels.filter((p) => p.status === 'judges_absent').length,
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-primary-blue dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Evaluation Panels Board ({panels.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live status, room assignments, and evaluator readiness
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/panels"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Manage Panels</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all' ? panels.length : statusCounts[f.value] || 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedStatus(f.value)}
              className={`px-2.5 py-1 rounded-lg font-mono font-medium whitespace-nowrap transition-colors ${
                selectedStatus === f.value
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Panels Grid */}
      {filteredPanels.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
          No panels match the selected status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredPanels.map((panel) => {
            const judgeCount = Number(panel.judge_count) || 0;
            const hasNoJudges = judgeCount === 0;

            return (
              <div
                key={panel.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  panel.status === 'judges_absent'
                    ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                    : panel.status === 'occupied'
                    ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {panel.panel_code}
                    </span>
                    <EventBadge eventType={panel.event_type} />
                  </div>

                  <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate mb-2">
                    {panel.name}
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <DoorOpen size={12} className="text-zinc-400 shrink-0" />
                      <span>{panel.room_code ? `${panel.room_code} (${panel.room_name || 'Room'})` : 'No room allocated'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award size={12} className={hasNoJudges ? 'text-rose-500' : 'text-zinc-400'} />
                        <span className={hasNoJudges ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                          {judgeCount} {judgeCount === 1 ? 'judge' : 'judges'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-zinc-400" />
                        <span>Cap: {panel.capacity || 10}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                  <PanelStatusBadge status={panel.status} />

                  {/* Inline Status Dropdown for Managers */}
                  {canManage && (
                    <select
                      value={panel.status}
                      disabled={updatingId === panel.id}
                      onChange={(e) => handleQuickStatusChange(panel.id, e.target.value)}
                      className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="ready">Ready</option>
                      <option value="occupied">Occupied</option>
                      <option value="break">Break</option>
                      <option value="judges_absent">Absent</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardPanelBoard;
