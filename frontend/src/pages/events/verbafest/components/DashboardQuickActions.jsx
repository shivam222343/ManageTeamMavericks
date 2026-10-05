import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  Calendar,
  DoorOpen,
  Award,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const ACTIONS = [
  {
    title: 'Participant Check-In',
    desc: 'Verify attendee arrivals & codes',
    path: '/dashboard/events/verbafest/participants',
    icon: CheckCircle2,
    color: 'emerald',
    badge: 'Check-in',
  },
  {
    title: 'Group Allocations',
    desc: 'Organize GD & Debate rosters',
    path: '/dashboard/events/verbafest/allocations',
    icon: Users,
    color: 'blue',
    badge: 'Allocations',
  },
  {
    title: 'Live Schedule',
    desc: 'Coordinate time slots & delays',
    path: '/dashboard/events/verbafest/schedule',
    icon: Calendar,
    color: 'violet',
    badge: 'Timeline',
  },
  {
    title: 'Evaluation Panels',
    desc: 'Monitor panel status & rooms',
    path: '/dashboard/events/verbafest/panels',
    icon: Layers,
    color: 'blue',
    badge: 'Panels',
  },
  {
    title: 'Venue Rooms',
    desc: 'Track capacity & room occupancy',
    path: '/dashboard/events/verbafest/rooms',
    icon: DoorOpen,
    color: 'amber',
    badge: 'Venues',
  },
  {
    title: 'Judges & Scoring',
    desc: 'Roster & panel assignments',
    path: '/dashboard/events/verbafest/judges',
    icon: Award,
    color: 'rose',
    badge: 'Evaluators',
  },
];

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    hover: 'hover:border-emerald-500/40',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/15 text-primary-blue dark:text-blue-400 border-blue-500/20',
    hover: 'hover:border-blue-500/40',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
    hover: 'hover:border-violet-500/40',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hover: 'hover:border-amber-500/40',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    hover: 'hover:border-rose-500/40',
  },
};

/**
 * DashboardQuickActions
 * High-utility organizer navigation bar for event-day rapid access.
 */
const DashboardQuickActions = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
            Event Control Center
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Direct access to dedicated VERBAFEST operational management modules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          const style = colorStyles[item.color] || colorStyles.blue;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200 flex flex-col justify-between ${style.hover}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${style.bg} transition-transform group-hover:scale-105 duration-200`}
                >
                  <Icon size={16} />
                </div>
                <ArrowRight
                  size={14}
                  className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate mt-0.5">
                  {item.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
