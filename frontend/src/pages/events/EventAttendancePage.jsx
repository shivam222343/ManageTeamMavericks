import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  QrCode,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldCheck,
  Check,
  Download,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import QrCodeModal from '../../components/ui/QrCodeModal';
import EventNotificationModal from '../../components/events/EventNotificationModal';
import { Bell, Zap } from 'lucide-react';

const EventAttendancePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('main'); // 'main' | subEventId string
  const [data, setData] = useState(null);
  const [subData, setSubData] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent'
  const [selectedIds, setSelectedIds] = useState([]);

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Notification Modal
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifUserIds, setNotifUserIds] = useState([]);

  useEffect(() => {
    fetchMainAttendance();
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'main') {
      fetchSubEventAttendance(activeTab);
    }
  }, [activeTab]);

  const fetchMainAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/events/${id}/attendance`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load attendance');
      navigate(`/dashboard/events/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubEventAttendance = async (subId) => {
    try {
      setSubLoading(true);
      const res = await axios.get(`/events/${id}/sub-events/${subId}/attendance`);
      setSubData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load sub-event attendance');
    } finally {
      setSubLoading(false);
    }
  };

  const handleToggleMainAttendance = async (regId, currentAttendance) => {
    const newStatus = currentAttendance === 1 ? 0 : 1;
    try {
      await axios.post(`/events/${id}/attendance/mark`, {
        registration_id: regId,
        attendance: newStatus
      });
      toast.success(newStatus === 1 ? 'Marked Present' : 'Marked Absent');
      fetchMainAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update attendance');
    }
  };

  const handleToggleSubAttendance = async (regId, currentSubAttendance) => {
    const newStatus = currentSubAttendance === 1 ? 0 : 1;

    try {
      await axios.post(`/events/${id}/sub-events/${activeTab}/attendance/mark`, {
        registration_id: regId,
        attendance: newStatus
      });
      toast.success(newStatus === 1 ? 'Marked Present in Sub-event' : 'Marked Absent in Sub-event');
      fetchSubEventAttendance(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update sub-event attendance');
    }
  };

  const handleBulkMark = async (attendanceVal) => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    try {
      await axios.post(`/events/${id}/attendance/bulk-mark`, {
        registration_ids: selectedIds,
        attendance: attendanceVal
      });
      toast.success(`Updated ${selectedIds.length} participants`);
      setSelectedIds([]);
      fetchMainAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk update failed');
    }
  };

  const handleOpenQrModal = async (subEventId = null) => {
    try {
      setQrLoading(true);
      const url = subEventId
        ? `/events/${id}/attendance/qr-code?sub_event_id=${subEventId}`
        : `/events/${id}/attendance/qr-code`;
      const res = await axios.get(url);
      setQrData(res.data);
      setQrModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate Attendance QR code');
    } finally {
      setQrLoading(false);
    }
  };

  if (loading) return <MajorLoader fullPage />;
  if (!data || !data.event) return null;

  const event = data.event;
  const subEvents = data.sub_events || [];

  const currentParticipants =
    activeTab === 'main'
      ? data.participants || []
      : subData?.participants || [];

  const currentStats =
    activeTab === 'main'
      ? data.stats || {}
      : subData?.stats || {};

  const filteredParticipants = currentParticipants.filter((p) => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.toLowerCase().includes(search.toLowerCase()) ||
      p.registration_token?.toLowerCase().includes(search.toLowerCase()) ||
      p.team_name?.toLowerCase().includes(search.toLowerCase());

    const isPresent = activeTab === 'main' ? p.attendance === 1 : p.sub_attendance === 1;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'present' && isPresent) ||
      (statusFilter === 'absent' && !isPresent);

    return matchesSearch && matchesStatus;
  });

  const activeSubEventObj = subEvents.find((s) => String(s.id) === String(activeTab));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 px-0 sm:px-4 text-zinc-900 dark:text-zinc-100">
      {/* Header card */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(`/dashboard/events/${id}`)}
              className="p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 mt-1"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-black tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
                <ShieldCheck size={12} />
                <span>Attendance Verification System</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                {event.name} • Attendance
              </h1>
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar size={13} />
                  {event.start_date ? new Date(event.start_date).toLocaleDateString('en-IN') : 'TBA'}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <MapPin size={13} />
                  {event.location || 'KIT Campus'}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="font-mono text-primary-blue font-bold">
                  /{event.slug}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setNotifUserIds([]);
                setNotifModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-amber-500/20 transition cursor-pointer shadow-sm"
            >
              <Zap size={14} className="text-amber-500" />
              <span>Broadcast Notification</span>
            </button>

            <button
              onClick={() => handleOpenQrModal(activeTab === 'main' ? null : activeTab)}
              disabled={qrLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-blue text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition cursor-pointer shadow-lg shadow-primary-blue/20"
            >
              <QrCode size={16} />
              <span>
                {activeTab === 'main' ? 'Generate Event QR' : `Generate ${activeSubEventObj?.name || 'Sub-Event'} QR`}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: Main Event vs Sub-Events */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <button
            onClick={() => {
              setActiveTab('main');
              setSelectedIds([]);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'main'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Main Event ({data.participants?.length || 0})</span>
          </button>

          {subEvents.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setActiveTab(String(sub.id));
                setSelectedIds([]);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === String(sub.id)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>{sub.name}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono ${
                activeTab === String(sub.id) ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}>
                {sub.type}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Event Notice Banner */}
      {activeTab !== 'main' && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 text-blue-600 dark:text-blue-400 text-xs">
          <Layers size={18} className="shrink-0" />
          <p className="leading-relaxed">
            <strong>Independent Attendance:</strong> Attendance for <strong>{activeSubEventObj?.name}</strong> is tracked separately from the main event and from other sub-events. Marking here only affects this sub-event.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-zinc-400">Total Registered</span>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">{currentStats.total || 0}</p>
        </div>

        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Present</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{currentStats.present || 0}</p>
        </div>

        <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Absent</span>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{currentStats.absent || 0}</p>
        </div>

        <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Attendance Rate</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{currentStats.rate || 0}%</p>
        </div>
      </div>

      {/* Table & Controls Section */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-5">
        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participant, token, team..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-sans text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Status pills */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
              {['all', 'present', 'absent'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Bulk Actions for Main Event */}
            {activeTab === 'main' && selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const uids = selectedIds.map(regId => {
                      const p = data.participants?.find(x => x.id === regId);
                      return p?.user_id || p?.id;
                    }).filter(Boolean);
                    setNotifUserIds(uids);
                    setNotifModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Bell size={12} />
                  <span>Notify Selected ({selectedIds.length})</span>
                </button>
                <button
                  onClick={() => handleBulkMark(1)}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => handleBulkMark(0)}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shadow-sm"
                >
                  Mark Absent
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                {activeTab === 'main' && (
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredParticipants.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredParticipants.map((p) => p.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded accent-blue-600"
                    />
                  </th>
                )}
                <th className="p-3.5">Participant</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Token</th>
                {activeTab === 'main' ? (
                  <th className="p-3.5">Sub-Events</th>
                ) : (
                  <th className="p-3.5">Main Event Status</th>
                )}
                <th className="p-3.5">Attendance</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-sans">
              {subLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    <RefreshCw className="animate-spin inline mr-2" size={16} />
                    Loading sub-event attendance...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No participants found.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isMainTab = activeTab === 'main';
                  const isPresent = isMainTab ? p.attendance === 1 : p.sub_attendance === 1;

                  return (
                    <tr
                      key={p.id || p.sub_reg_id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition"
                    >
                      {isMainTab && (
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, p.id]);
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded accent-blue-600"
                          />
                        </td>
                      )}

                      {/* Name & Avatar */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 select-none">
                            {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              {p.full_name}
                            </span>
                            {p.team_name && (
                              <span className="text-[10px] font-mono text-primary-blue font-semibold block">
                                Team: {p.team_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                        <div>{p.email}</div>
                        <div className="font-mono text-[11px] text-zinc-400">{p.phone || '—'}</div>
                      </td>

                      {/* Token */}
                      <td className="p-3.5 font-mono text-[11px] text-primary-blue font-bold">
                        {p.registration_token}
                      </td>

                      {/* Sub-Events (if Main tab) vs Main Attendance (if Sub tab) */}
                      {isMainTab ? (
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {p.sub_events && p.sub_events.length > 0 ? (
                              p.sub_events.map((se, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                                    se.sub_attendance === 1
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                  }`}
                                  title={se.sub_attendance === 1 ? 'Present in sub-event' : 'Absent in sub-event'}
                                >
                                  {se.sub_event_name}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-400 text-[10px]">None</span>
                            )}
                          </div>
                        </td>
                      ) : (
                        <td className="p-3.5">
                          {p.main_attendance === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Check size={11} />
                              <span>Present in Main</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" title="Must be marked present in main event first">
                              <Lock size={11} />
                              <span>Absent in Main (Gated)</span>
                            </span>
                          )}
                        </td>
                      )}

                      {/* Attendance Status */}
                      <td className="p-3.5">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={13} />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700">
                            <XCircle size={13} />
                            <span>Absent</span>
                          </span>
                        )}
                      </td>

                      {/* Action Toggle Button */}
                      <td className="p-3.5 text-right">
                        {isMainTab ? (
                          <button
                            onClick={() => handleToggleMainAttendance(p.id, p.attendance)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                              isPresent
                                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleToggleSubAttendance(
                                p.registration_id,
                                p.sub_attendance
                              )
                            }
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                              isPresent
                                ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Generation Modal */}
      {qrModalOpen && qrData && (
        <QrCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          title={qrData.title}
          subtitle={`Scan with Participant Portal on mobile to record attendance`}
          token={qrData.token}
          qrPayload={qrData.qr_payload}
          eventName={qrData.event?.name}
          subEventName={qrData.sub_event?.name}
        />
      )}

      {/* Broadcast & User Targeted Notification Modal */}
      <EventNotificationModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        eventId={id}
        eventName={event?.name}
        initialSelectedUserIds={notifUserIds}
      />
    </div>
  );
};

export default EventAttendancePage;
