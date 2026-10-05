import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft, Search, Users, CheckCircle, Clock, XCircle,
  Coins, Eye, Download, ChevronDown, Filter,
} from 'lucide-react';

const STATUS_STYLE = {
  pending:    'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  confirmed:  'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  cancelled:  'bg-red-500/10 text-red-500 border border-red-500/20',
  waitlisted: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};

const PAYMENT_STYLE = {
  not_required: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800',
  pending:      'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  paid:         'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  failed:       'bg-red-500/10 text-red-500 border border-red-500/20',
  refunded:     'bg-purple-500/10 text-purple-500 border border-purple-500/20',
};

const Badge = ({ status, config }) => {
  const cfg = config[status] || { label: status, color: 'bg-zinc-100 text-zinc-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest ${config[status] || 'bg-zinc-100 text-zinc-500'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const EventRegistrationsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCore = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading]           = useState(true);
  const [event, setEvent]               = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evRes, regRes] = await Promise.all([
        axios.get(`/events/${id}`),
        axios.get(`/events/${id}/registrations`),
      ]);
      setEvent(evRes.data);
      setRegistrations(Array.isArray(regRes.data) ? regRes.data : []);
    } catch (err) {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStatusUpdate = async (regId, field, value) => {
    try {
      await axios.patch(`/event-registrations/${regId}/status`, { [field]: value });
      toast.success('Status updated!');
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filtered = registrations.filter(r => {
    const matchSearch = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search);
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchPayment = !paymentFilter || r.payment_status === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const stats = {
    total:     registrations.length,
    confirmed: registrations.filter(r => r.status === 'confirmed').length,
    paid:      registrations.filter(r => r.payment_status === 'paid').length,
    pending:   registrations.filter(r => r.payment_status === 'pending').length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  if (loading) return <MajorLoader fullPage />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/dashboard/events/${id}`)} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Registrations</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Event: <span className="font-bold text-zinc-700 dark:text-zinc-200">{event?.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-zinc-200/40 dark:border-zinc-800/40 relative z-10">
          {[
            { label: 'Total', value: stats.total,     color: 'text-blue-500' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-emerald-500' },
            { label: 'Paid',  value: stats.paid,      color: 'text-green-500' },
            { label: 'Pending Payment', value: stats.pending, color: 'text-amber-500' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="text-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl p-3 border border-zinc-200/40 dark:border-zinc-800/40">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 h-10 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
        <select
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="h-10 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
        >
          <option value="">All Payments</option>
          <option value="not_required">Not Required</option>
          <option value="pending">Payment Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-white/20 dark:bg-zinc-900/10">
          <Users size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-zinc-800 dark:text-white text-sm font-black uppercase tracking-wider">
            {search || statusFilter || paymentFilter ? 'No registrations match your filters' : 'No registrations yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
                  {['Name', 'Email', 'Phone', 'Reg ID', 'Status', 'Payment', 'Registered At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[8px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, i) => (
                  <tr
                    key={reg.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition ${i % 2 === 0 ? 'bg-white/20 dark:bg-zinc-950/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{reg.full_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{reg.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{reg.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">#{reg.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isCore ? (
                        <select
                          value={reg.status}
                          onChange={e => handleStatusUpdate(reg.id, 'status', e.target.value)}
                          className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-xl border cursor-pointer focus:outline-none ${STATUS_STYLE[reg.status] || 'bg-zinc-100 text-zinc-500'}`}
                        >
                          {['pending','confirmed','cancelled','waitlisted'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest ${STATUS_STYLE[reg.status] || 'bg-zinc-100 text-zinc-500'}`}>
                          {reg.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isCore && event?.payment_required ? (
                        <select
                          value={reg.payment_status}
                          onChange={e => handleStatusUpdate(reg.id, 'payment_status', e.target.value)}
                          className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-xl border cursor-pointer focus:outline-none ${PAYMENT_STYLE[reg.payment_status] || 'bg-zinc-100 text-zinc-500'}`}
                        >
                          {['not_required','pending','paid','failed','refunded'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest ${PAYMENT_STYLE[reg.payment_status] || 'bg-zinc-100 text-zinc-500'}`}>
                          {reg.payment_status?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{formatDate(reg.registered_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/events/${id}/registrations/${reg.id}`}
                        className="flex items-center gap-1 h-8 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                      >
                        <Eye size={11} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-zinc-200/40 dark:border-zinc-800/40 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
            Showing {filtered.length} of {registrations.length} registrations
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRegistrationsPage;
