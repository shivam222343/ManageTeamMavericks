import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft, Calendar, Users, Coins, MapPin, Edit3, FileText,
  ExternalLink, BarChart2, Zap, Radio, Clock, CheckCircle, AlertCircle,
  Globe, Save, Trash2, ChevronDown, QrCode, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import EventSubEventsManager from './components/EventSubEventsManager';

const EVENT_STATUS = ['draft', 'published', 'ongoing', 'completed', 'archived'];
const REG_STATUS   = ['open', 'closed', 'scheduled'];

const EVENT_STATUS_STYLE = {
  draft:     'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  published: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  ongoing:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  completed: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
  archived:  'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
};

const REG_STATUS_STYLE = {
  open:      'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
  closed:    'bg-red-500 text-white shadow-md shadow-red-500/20',
  scheduled: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20',
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 space-y-2">
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} />
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">{label}</span>
    </div>
    <p className="text-3xl font-black text-zinc-900 dark:text-white">{value}</p>
  </div>
);

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCore = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading]           = useState(true);
  const [event, setEvent]               = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      toast.error('Failed to load event');
      navigate('/dashboard/events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvent(); }, [id]);

  const patchStatus = async (field, value) => {
    if (!isCore) return;
    setStatusChanging(true);
    const loader = toast.loading('Updating status…');
    try {
      const res = await axios.patch(`/events/${id}/status`, { [field]: value });
      setEvent(res.data.event);
      toast.dismiss(loader);
      toast.success('Status updated!');
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const formatCurrency = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  if (loading) return <MajorLoader fullPage />;
  if (!event)  return null;

  const revenue = (parseInt(event.paid_registrations) || 0) * parseFloat(event.registration_fee || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 px-0 sm:px-4">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/events')} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{event.name}</h1>
                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest ${EVENT_STATUS_STYLE[event.event_status] || 'bg-zinc-100 text-zinc-500'}`}>
                  {event.event_status}
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">/{event.slug}</p>
              {event.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-lg leading-relaxed">{event.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to={`/dashboard/events/${id}/attendance`}
              className="flex items-center gap-1.5 h-9 px-4 bg-primary-blue text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-600 transition cursor-pointer shadow-md shadow-primary-blue/20"
            >
              <QrCode size={13} /> Attendance &amp; QR
            </Link>
            <Link
              to={`/dashboard/events/${id}/edit`}
              className="flex items-center gap-1.5 h-9 px-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Edit3 size={12} /> Edit
            </Link>
            <Link
              to={`/dashboard/events/${id}/registration-form`}
              className="flex items-center gap-1.5 h-9 px-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-500/20 transition cursor-pointer"
            >
              <FileText size={12} /> Registration Form
            </Link>
            <Link
              to={`/dashboard/events/${id}/registrations`}
              className="flex items-center gap-1.5 h-9 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <Users size={12} /> Registrations
            </Link>
            <a
              href={`/events/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-9 px-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-50 transition cursor-pointer"
            >
              <ExternalLink size={12} /> Public
            </a>
          </div>
        </div>

        {/* Status Controls */}
        {isCore && (
          <div className="mt-6 pt-6 border-t border-zinc-200/40 dark:border-zinc-800/40 relative z-10 space-y-4">
            {/* Event Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 font-mono w-36 shrink-0">Event Status:</span>
              <div className="flex border border-zinc-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950 w-fit rounded-2xl p-1 gap-1 select-none flex-wrap">
                {EVENT_STATUS.map(s => (
                  <button
                    key={s}
                    onClick={() => patchStatus('event_status', s)}
                    disabled={statusChanging}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-200 cursor-pointer disabled:opacity-60
                      ${event.event_status === s
                        ? (EVENT_STATUS_STYLE[s] || '') + ' font-extrabold'
                        : 'text-zinc-405 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60'
                      }
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Registration Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 font-mono w-36 shrink-0">Registration:</span>
              <div className="flex border border-zinc-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950 w-fit rounded-2xl p-1 gap-1 select-none">
                {REG_STATUS.map(s => (
                  <button
                    key={s}
                    onClick={() => patchStatus('registration_status', s)}
                    disabled={statusChanging}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-200 cursor-pointer disabled:opacity-60
                      ${event.registration_status === s
                        ? REG_STATUS_STYLE[s] + ' font-extrabold'
                        : 'text-zinc-405 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60'
                      }
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Registrations" value={event.total_registrations || 0}  icon={Users}  color="text-blue-500" />
        <StatCard label="Paid"                 value={event.paid_registrations || 0}   icon={Coins}  color="text-emerald-500" />
        <StatCard label="Pending Payment"      value={event.pending_payments || 0}     icon={Clock}  color="text-amber-500" />
        <StatCard label="Cancelled"            value={event.cancelled_registrations || 0} icon={AlertCircle} color="text-red-500" />
      </div>

      {/* Revenue card (if paid event) */}
      {Boolean(event.payment_required) ? (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">Estimated Revenue</p>
              <p className="text-4xl font-black text-zinc-900 dark:text-white mt-1">{formatCurrency(revenue)}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-bold">
                {event.paid_registrations || 0} paid × {formatCurrency(event.registration_fee)} registration fee
              </p>
            </div>
            <Coins size={40} className="text-emerald-500/30" />
          </div>
        </div>
      ) : null}

      {/* Event Details card */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono mb-5">Event Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Start Date',          value: formatDate(event.start_date),             icon: Calendar },
            { label: 'End Date',            value: formatDate(event.end_date),               icon: Calendar },
            { label: 'Registration Opens',  value: formatDate(event.registration_start_date), icon: Clock },
            { label: 'Registration Closes', value: formatDate(event.registration_end_date),   icon: Clock },
            { label: 'Location',            value: event.location || '—',                    icon: MapPin },
            { label: 'Mode',                value: event.mode || '—',                        icon: Globe },
            { label: 'Max Participants',    value: event.max_participants || 'Unlimited',    icon: Users },
            { label: 'Registration Fee',    value: event.payment_required ? formatCurrency(event.registration_fee) : 'Free', icon: Coins },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon size={14} className="text-zinc-400 dark:text-zinc-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">{item.label}</p>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-0.5 capitalize">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Events Management Section */}
      <EventSubEventsManager eventId={id} event={event} onUpdate={fetchEvent} />

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attendance & QR',          to: `/dashboard/events/${id}/attendance`,      icon: QrCode,   desc: 'Live QR & attendance verification', color: 'from-blue-600 to-indigo-600' },
          { label: 'Registration Form',        to: `/dashboard/events/${id}/registration-form`, icon: FileText, desc: 'Customize form fields & sections', color: 'from-blue-500 to-cyan-500' },
          { label: 'View Registrations',       to: `/dashboard/events/${id}/registrations`,    icon: Users,   desc: 'See all registered participants', color: 'from-emerald-500 to-teal-500' },
          { label: 'Edit Event Details',        to: `/dashboard/events/${id}/edit`,            icon: Edit3,   desc: 'Update event info, dates, payment', color: 'from-amber-500 to-orange-500' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="group bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 hover:shadow-lg hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all duration-200 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-md`}>
              <item.icon size={18} className="text-white" />
            </div>
            <p className="text-xs font-black text-zinc-900 dark:text-white">{item.label}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default EventDetailPage;
