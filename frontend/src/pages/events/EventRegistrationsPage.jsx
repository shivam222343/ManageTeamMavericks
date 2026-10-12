import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import EventNotificationModal from '../../components/events/EventNotificationModal';
import { BASE_URL } from '../../config/api';
import {
  ArrowLeft, Search, Users, CheckCircle, Clock, XCircle,
  Coins, Eye, Download, ChevronDown, Filter, Trash2, AlertCircle, Zap, Bell,
  Image, ExternalLink, X, Copy, Check
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [previewProof, setPreviewProof] = useState(null);
  const [copiedUtr, setCopiedUtr]       = useState(false);

  const resolveMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    const cleanBase = (BASE_URL || window.location.origin).replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

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

  const handleDeleteParticipant = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/event-registrations/${deleteTarget.id}`);
      toast.success(`Participant registration for "${deleteTarget.full_name}" deleted successfully!`);
      setSelectedIds(prev => prev.filter(x => x !== deleteTarget.id));
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err.response?.data?.error || 'Failed to delete participant registration');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (regId) => {
    setSelectedIds(prev => prev.includes(regId) ? prev.filter(id => id !== regId) : [...prev, regId]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setDeleting(true);
      const res = await axios.post('/event-registrations/bulk-delete', {
        registration_ids: selectedIds
      });
      toast.success(res.data.message || `Deleted ${selectedIds.length} registration(s)!`);
      setSelectedIds([]);
      setBulkDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error(err.response?.data?.error || 'Failed to delete selected registrations');
    } finally {
      setDeleting(false);
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
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-0 sm:px-4">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
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

          <button
            onClick={() => setNotifModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-amber-500/20 transition cursor-pointer shadow-sm shrink-0"
          >
            <Zap size={14} className="text-amber-500" />
            <span>Notify Participants</span>
          </button>
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

      {/* Bulk Action Strip */}
      {selectedIds.length > 0 && isCore && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
              {selectedIds.length} registration{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-[10px] text-rose-500/80 font-mono">
              (out of {filtered.length} visible)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-xs font-bold transition cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

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
                  {isCore && (
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={handleSelectAll}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                        title="Select all registrations"
                      />
                    </th>
                  )}
                  {['Name', 'Email', 'Phone', 'Reg ID', 'Status', 'Payment', 'Proof', 'Registered At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[8px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, i) => (
                  <tr
                    key={reg.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition ${
                      selectedIds.includes(reg.id) ? 'bg-rose-500/10 dark:bg-rose-950/20' : (i % 2 === 0 ? 'bg-white/20 dark:bg-zinc-950/10' : '')
                    }`}
                  >
                    {isCore && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(reg.id)}
                          onChange={() => handleToggleSelect(reg.id)}
                          className="rounded border-zinc-300 dark:border-zinc-700 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                        />
                      </td>
                    )}
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
                      {reg.payment_screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCopiedUtr(false);
                            setPreviewProof({
                              url: resolveMediaUrl(reg.payment_screenshot_url),
                              name: reg.full_name,
                              email: reg.email,
                              regId: reg.id,
                              transactionId: reg.transaction_id,
                              amount: reg.payment_amount,
                              status: reg.payment_status
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/25 text-[10px] font-bold transition cursor-pointer"
                          title="View Uploaded Payment Proof"
                        >
                          <Image size={12} />
                          <span>View Proof</span>
                        </button>
                      ) : reg.transaction_id ? (
                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400" title={`UTR: ${reg.transaction_id}`}>
                          UTR: {reg.transaction_id.length > 10 ? `${reg.transaction_id.slice(0, 8)}…` : reg.transaction_id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{formatDate(reg.registered_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/dashboard/events/${id}/registrations/${reg.id}`}
                          className="flex items-center gap-1 h-8 px-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                        >
                          <Eye size={11} /> View
                        </Link>
                        {isCore && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(reg)}
                            className="flex items-center gap-1 h-8 px-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer border border-rose-500/20"
                            title="Delete Participant Registration"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
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

      {/* --- PAYMENT PROOF / SCREENSHOT MODAL --- */}
      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-xl w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E172A] p-6 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-500 block">
                  Payment Verification
                </span>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  {previewProof.name} <span className="font-mono text-xs text-zinc-400">#{previewProof.regId}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Proof Image Box */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 overflow-hidden flex items-center justify-center max-h-[380px] p-2">
              <img
                src={previewProof.url}
                alt="Payment Proof"
                className="max-h-[360px] w-auto object-contain rounded-xl mx-auto shadow-md"
                onError={(e) => {
                  if (!e.target.dataset.triedFallback && previewProof.url) {
                    e.target.dataset.triedFallback = '1';
                    const filename = previewProof.url.split('/').pop();
                    e.target.src = `http://localhost:8000/uploads/events/${id}/${previewProof.regId}/${filename}`;
                  }
                }}
              />
            </div>

            {/* Transaction / UTR Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">Transaction / UTR ID</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {previewProof.transactionId || 'Not provided'}
                  </span>
                  {previewProof.transactionId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(previewProof.transactionId);
                        setCopiedUtr(true);
                        toast.success('UTR copied to clipboard');
                        setTimeout(() => setCopiedUtr(false), 2000);
                      }}
                      className="ml-2 text-zinc-400 hover:text-blue-500 cursor-pointer"
                    >
                      {copiedUtr ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">Current Payment Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${PAYMENT_STYLE[previewProof.status] || 'bg-zinc-100'}`}>
                    {previewProof.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <a
                  href={previewProof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:underline"
                >
                  <ExternalLink size={12} /> Full Image
                </a>
              </div>
            </div>

            {/* Quick Status Action Buttons */}
            {isCore && (
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await handleStatusUpdate(previewProof.regId, 'payment_status', 'paid');
                    setPreviewProof((prev) => ({ ...prev, status: 'paid' }));
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Approve &amp; Mark Paid</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleStatusUpdate(previewProof.regId, 'payment_status', 'pending');
                    setPreviewProof((prev) => ({ ...prev, status: 'pending' }));
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock size={14} />
                  <span>Mark Pending</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL TO DELETE PARTICIPANT --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-white dark:bg-[#0E172A] p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 size={28} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-rose-500 block">
                CONFIRM DELETION
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Delete Participant?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to delete the registration for{' '}
                <strong className="text-zinc-900 dark:text-white font-bold">{deleteTarget.full_name}</strong> ({deleteTarget.email})?
              </p>
              <p className="text-[11px] text-rose-500/80 font-medium">
                This will permanently delete their entry pass, responses, and uploaded documents.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteParticipant}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL TO DELETE MULTIPLE REGISTRATIONS --- */}
      {bulkDeleteModalOpen && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-white dark:bg-[#0E172A] p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <Trash2 size={26} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Delete {selectedIds.length} Registration{selectedIds.length > 1 ? 's' : ''}?
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to permanently delete all{' '}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedIds.length}</strong> selected participant registration entries?
              </p>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300 text-left space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-rose-500" /> Irreversible Permanent Deletion
                </p>
                <p className="text-rose-600/90 dark:text-rose-400/80 leading-relaxed text-[10px]">
                  All associated entry credentials, dynamic form responses, uploaded receipts, attendance records, and tournament scores for these candidates will be permanently removed.
                </p>
              </div>

              {/* Sample list of participants being deleted */}
              <div className="max-h-28 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 text-left bg-zinc-50 dark:bg-zinc-900/50 space-y-1 text-[11px]">
                {registrations
                  .filter(r => selectedIds.includes(r.id))
                  .slice(0, 6)
                  .map(r => (
                    <div key={r.id} className="flex items-center justify-between font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 truncate max-w-[220px]">{r.full_name}</span>
                      <span className="text-zinc-400">#{r.id}</span>
                    </div>
                  ))}
                {selectedIds.length > 6 && (
                  <p className="text-[10px] text-zinc-400 italic text-center pt-1">
                    ...and {selectedIds.length - 6} more participant(s)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setBulkDeleteModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleBulkDelete}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : `Yes, Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast & Target Notification Modal */}
      <EventNotificationModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        eventId={id}
        eventName={event?.name}
      />
    </div>
  );
};

export default EventRegistrationsPage;
