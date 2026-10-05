import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  ChevronRight,
  Globe,
  Lock,
  Clock,
  Coins,
  BarChart2,
  Archive,
  CheckCircle,
  AlertCircle,
  Radio,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Status badge helpers
const EVENT_STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
  published: { label: 'Published', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' },
  ongoing:   { label: 'Ongoing',   color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  completed: { label: 'Completed', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20' },
  archived:  { label: 'Archived',  color: 'bg-zinc-400/10 text-zinc-500 dark:text-zinc-500 border border-zinc-400/20' },
};

const REG_STATUS_CONFIG = {
  open:      { label: 'Reg Open',      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
  closed:    { label: 'Reg Closed',    color: 'bg-red-500/10 text-red-500 border border-red-500/20' },
  scheduled: { label: 'Reg Scheduled', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' },
};

const StatusBadge = ({ status, config }) => {
  const cfg = config[status] || { label: status, color: 'bg-zinc-100 text-zinc-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const EventCard = ({ event }) => {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-900/5 dark:hover:shadow-zinc-900/30 transition-all duration-300 hover:border-blue-500/20 dark:hover:border-blue-500/20 relative overflow-hidden"
    >
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.02] rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight truncate">{event.name}</h3>
          <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">/{event.slug}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={event.event_status} config={EVENT_STATUS_CONFIG} />
          <StatusBadge status={event.registration_status} config={REG_STATUS_CONFIG} />
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-4">{event.description}</p>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
          <Calendar size={12} className="text-blue-400 shrink-0" />
          <span className="truncate">{formatDate(event.start_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
          <Users size={12} className="text-emerald-400 shrink-0" />
          <span>{event.total_registrations || 0} registered</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold col-span-2">
            <MapPin size={12} className="text-rose-400 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {Boolean(event.payment_required) ? (
          <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <Coins size={12} className="shrink-0" />
            <span>₹{parseFloat(event.registration_fee || 0).toFixed(0)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold">
            <Coins size={12} className="shrink-0" />
            <span>Free</span>
          </div>
        )}
        {event.max_participants && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
            <Users size={12} className="shrink-0" />
            <span>Max {event.max_participants}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-4">
        <Link
          to={`/dashboard/events/${event.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:opacity-90 transition cursor-pointer active:scale-95 shadow-md"
        >
          <BarChart2 size={12} /> Dashboard
        </Link>
        <Link
          to={`/dashboard/events/${event.id}/registration-form`}
          className="flex items-center justify-center gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer active:scale-95"
          title="Edit Registration Form"
        >
          Form
        </Link>
        <Link
          to={`/dashboard/events/${event.id}/registrations`}
          className="flex items-center justify-center gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer active:scale-95"
          title="View Registrations"
        >
          <Users size={12} />
        </Link>
      </div>
    </motion.div>
  );
};

// ─── Events List Page ─────────────────────────────────────────────────────────
const EventsListPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isCore    = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading] = useState(true);
  const [events, setEvents]   = useState([]);
  const [search, setSearch]   = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/events');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const filtered = events.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.slug.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:     events.length,
    published: events.filter(e => e.event_status === 'published' || e.event_status === 'ongoing').length,
    open:      events.filter(e => e.registration_status === 'open').length,
    regs:      events.reduce((acc, e) => acc + (parseInt(e.total_registrations) || 0), 0),
  };

  if (loading) return <MajorLoader fullPage />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Page header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Events</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Manage events, registration forms, and participant data</p>
          </div>
          {isCore && (
            <Link
              to="/dashboard/events/create"
              className="flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition cursor-pointer active:scale-95"
            >
              <Plus size={14} /> Create Event
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-200/40 dark:border-zinc-800/40 relative z-10">
          {[
            { label: 'Total Events',   value: stats.total,     icon: Calendar,  color: 'text-blue-500' },
            { label: 'Live Events',    value: stats.published, icon: Zap,       color: 'text-emerald-500' },
            { label: 'Reg Open',       value: stats.open,      icon: Radio,     color: 'text-amber-500' },
            { label: 'Registrations',  value: stats.regs,      icon: Users,     color: 'text-indigo-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl p-4 border border-zinc-200/40 dark:border-zinc-800/40">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">{stat.label}</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events by name or slug…"
          className="flex-1 h-10 px-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-white/20 dark:bg-zinc-900/10">
          <Calendar size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-zinc-800 dark:text-white text-sm font-black uppercase tracking-wider">
            {search ? 'No events match your search' : 'No events created yet'}
          </p>
          {isCore && !search && (
            <Link
              to="/dashboard/events/create"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition cursor-pointer"
            >
              <Plus size={13} /> Create First Event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsListPage;
