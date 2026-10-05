import React from 'react';
import { Link } from 'react-router-dom';
import {
  DoorOpen,
  ArrowRight,
  Layers
} from 'lucide-react';
import RoomTypeBadge from './RoomTypeBadge';

/**
 * DashboardRoomOverview
 * Live venue room occupancy, capacity stress monitoring, and panel allocation.
 *
 * @param {Object} props
 * @param {Array} props.rooms - List of rooms
 */
const DashboardRoomOverview = ({ rooms = [] }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <DoorOpen size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Venue Room Occupancy ({rooms.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Real-time room utilization and seating capacity
            </p>
          </div>
        </div>

        <Link
          to="/dashboard/events/verbafest/rooms"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue dark:text-blue-400 hover:underline shrink-0"
        >
          <span>Manage Rooms</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
          No venue rooms configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {rooms.map((room) => {
            const cap = Number(room.capacity) || 0;
            const occ = Number(room.current_occupancy) || 0;
            const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
            const isOverCapacity = occ > cap && cap > 0;
            const isFull = occ >= cap && cap > 0;

            const barColor = isOverCapacity
              ? 'bg-rose-500'
              : isFull
              ? 'bg-amber-500'
              : occ > 0
              ? 'bg-primary-blue dark:bg-blue-500'
              : 'bg-emerald-500';

            const statusText = isOverCapacity
              ? 'Over Capacity'
              : isFull
              ? 'Full'
              : occ > 0
              ? 'Partially Occupied'
              : 'Available';

            const statusBadgeColor = isOverCapacity
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              : isFull
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              : occ > 0
              ? 'bg-blue-500/10 text-primary-blue dark:text-blue-400 border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

            return (
              <div
                key={room.id}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {room.room_code}
                    </span>
                    <RoomTypeBadge roomType={room.room_type} />
                  </div>

                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {room.name}
                  </div>

                  {/* Occupancy bar */}
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                      <span>Occupancy</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {occ} / {cap} ({pct}%)
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono font-semibold border ${statusBadgeColor}`}
                  >
                    {statusText}
                  </span>

                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono text-[10px]">
                    <Layers size={11} />
                    <span>{room.assigned_panel_count || 0} panels</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardRoomOverview;
