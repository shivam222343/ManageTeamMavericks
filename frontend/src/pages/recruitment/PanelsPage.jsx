import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  Layers,
  Plus,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  Trash2,
  Edit,
  X,
  Search,
  CheckSquare,
  Square,
  Lock,
  ExternalLink,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PanelsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCoordinator = user?.role === 'coordinator' || user?.role === 'core_member';
  const canPanels = user?.role === 'coordinator' || user?.permissions?.panels !== false;

  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState([]);
  const [members, setMembers] = useState([]);
  const [applicants, setApplicants] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editPanelId, setEditPanelId] = useState(null);
  const [panelName, setPanelName] = useState('');
  const [panelCode, setPanelCode] = useState('');
  const [location, setLocation] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Search filters inside modal
  const [memberSearch, setMemberSearch] = useState('');
  const [applicantSearch, setApplicantSearch] = useState('');

  const fetchData = async (isSilent = false) => {
    try {
      const resPanels = await axios.get('/panels');
      setPanels(resPanels.data.panels || []);

      const [resMembers, resApps] = await Promise.all([
        axios.get('/members'),
        axios.get('/applicants')
      ]);
      const mList = Array.isArray(resMembers.data) ? resMembers.data : (resMembers.data.members || []);
      const aList = Array.isArray(resApps.data) ? resApps.data : (resApps.data.applicants || []);
      setMembers(mList);
      setApplicants(aList);
    } catch (err) {
      if (!isSilent) {
        console.error('Fetch panels data error:', err);
        toast.error('Failed to load interview panels data');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!canPanels) {
      setLoading(false);
      return;
    }

    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [canPanels]);

  const openCreateModal = async () => {
    setEditPanelId(null);
    setPanelName('');
    setPanelCode('PANEL-' + Math.floor(10 + Math.random() * 90));
    setLocation('');
    setSelectedMemberIds([]);
    setSelectedApplicantIds([]);
    setShowModal(true);

    if (members.length === 0 || applicants.length === 0) {
      try {
        const [resMembers, resApps] = await Promise.all([
          axios.get('/members'),
          axios.get('/applicants')
        ]);
        const mList = Array.isArray(resMembers.data) ? resMembers.data : (resMembers.data.members || []);
        const aList = Array.isArray(resApps.data) ? resApps.data : (resApps.data.applicants || []);
        setMembers(mList);
        setApplicants(aList);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openEditModal = (p) => {
    setEditPanelId(p.id);
    setPanelName(p.name);
    setPanelCode(p.panel_code);
    setLocation(p.location || '');
    setSelectedMemberIds(p.members ? p.members.map(m => m.id) : []);
    // Pre-fill existing assigned applicant IDs
    setSelectedApplicantIds(p.applicants ? p.applicants.map(a => a.id) : []);
    setMemberSearch('');
    setApplicantSearch('');
    setShowModal(true);
  };

  const handleSavePanel = async (e) => {
    e.preventDefault();
    if (!panelName.trim()) {
      toast.error('Please enter a panel name');
      return;
    }

    setSaving(true);
    const loader = toast.loading(editPanelId ? 'Updating panel…' : 'Creating panel…');

    try {
      const payload = {
        name: panelName,
        panel_code: panelCode,
        location: location,
        member_ids: selectedMemberIds,
        applicant_ids: selectedApplicantIds
      };

      if (editPanelId) {
        await axios.put(`/panels/${editPanelId}`, payload);
        toast.success('Panel updated successfully! 🎉');
      } else {
        await axios.post('/panels', payload);
        toast.success('Panel created successfully! 🎉');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save panel');
    } finally {
      toast.dismiss(loader);
      setSaving(false);
    }
  };

  const handleDeletePanel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete panel "${name}"?`)) return;
    const loader = toast.loading('Deleting panel…');
    try {
      await axios.delete(`/panels/${id}`);
      toast.success('Panel deleted!');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete panel');
    } finally {
      toast.dismiss(loader);
    }
  };

  const toggleMemberSelection = (id) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const toggleApplicantSelection = (id) => {
    setSelectedApplicantIds(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  if (loading) return <MajorLoader fullPage />;

  if (!canPanels) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Lock className="text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-zinc-500 mt-2 max-w-sm">You do not have the necessary permissions to access recruitment interview panels.</p>
      </div>
    );
  }

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredApplicants = applicants.filter(a => 
    a.full_name.toLowerCase().includes(applicantSearch.toLowerCase()) || 
    a.prn.toLowerCase().includes(applicantSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Interview Panels</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
              {panels.length} Active Panels
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Assign team members and candidates to evaluation panels for structured interview scoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/dashboard/recruitment/panels/attendance"
            className="flex items-center gap-2 h-10 px-4 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer active:scale-95"
          >
            <ClipboardList size={15} /> Attendance
          </Link>
          {isCoordinator && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 shadow-md shadow-blue-500/20 cursor-pointer shrink-0 active:scale-95"
            >
              <Plus size={15} /> Create Panel
            </button>
          )}
        </div>
      </div>

      {/* Panels Cards Grid */}
      {panels.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/40 dark:bg-zinc-900/40">
          <Layers size={40} className="mx-auto text-zinc-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">No Interview Panels Configured</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
            {isCoordinator ? 'Click "Create Panel" above to setup interview panels with assigned panel members and candidates.' : 'You have not been assigned to any active interview panels yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((p) => {
            const presentApplicants = p.applicants?.filter(a => a.attendance === 1 || a.attendance === true) || [];
            const hasInterviewing = presentApplicants.some(a => a.interview_status === 'interviewing');
            const hasNextUp = presentApplicants.some(a => a.interview_status === 'waiting' || !a.interview_status);
            const needsAttention = !hasInterviewing && hasNextUp;

            return (
            <div
              key={p.id}
              className={`bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group ${
                needsAttention
                  ? 'panel-needs-attention'
                  : 'border border-zinc-200/80 dark:border-zinc-800/80'
              }`}
            >
              <div>
                {/* Panel Top Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {p.panel_code}
                    </span>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight mt-1.5 group-hover:text-blue-500 transition">
                      {p.name}
                    </h3>
                  </div>
                  {isCoordinator && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Edit panel"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePanel(p.id, p.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition"
                        title="Delete panel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Location venue */}
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-4">
                  <MapPin size={13} className="text-zinc-400 shrink-0" />
                  <span className="truncate">{p.location || 'Location Not Specified'}</span>
                </div>

                {/* Assigned Panel Members */}
                <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 font-mono block">
                    Panel Evaluators ({p.members?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.members && p.members.length > 0 ? (
                      p.members.map((m) => (
                        <span
                          key={m.id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-1"
                        >
                          <UserCheck size={11} className="text-blue-500" />
                          {m.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic">No members assigned</span>
                    )}
                  </div>
                </div>

                {/* Live Candidate Status Banner */}
                {(() => {
                  const currentCandidate = presentApplicants.find(a => a.interview_status === 'interviewing');
                  const nextCandidate = presentApplicants.find(a => a.interview_status === 'waiting' || !a.interview_status);

                  return (
                    <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                      {currentCandidate ? (
                        <div className="flex items-center justify-between text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                              {currentCandidate.full_name}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500 font-mono shrink-0 ml-1">Interviewing</span>
                        </div>
                      ) : null}

                      {nextCandidate ? (
                        <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">
                              {nextCandidate.full_name}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-amber-500 font-mono shrink-0 ml-1">Next Up</span>
                        </div>
                      ) : !currentCandidate && presentApplicants.length > 0 ? (
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono italic px-1">
                          All present candidates completed
                        </div>
                      ) : presentApplicants.length === 0 && p.applicant_count > 0 ? (
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono italic px-1">
                          No attendance marked yet
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              {/* Panel Bottom Bar */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Users size={14} className="text-zinc-400" />
                  <strong>{p.applicant_count}</strong> Candidates
                </span>
                <Link
                  to={`/dashboard/recruitment/panels/${p.id}`}
                  className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-mono transition"
                >
                  View Panel <ChevronRight size={14} />
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Panel Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-xl shadow-xl space-y-5 my-8 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase font-mono">
                    {editPanelId ? 'Edit Interview Panel' : 'Create Interview Panel'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Assign evaluators and candidate applicants to this panel.</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSavePanel} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Panel Name</label>
                    <input
                      type="text"
                      value={panelName}
                      onChange={e => setPanelName(e.target.value)}
                      placeholder="e.g. Technical Panel 01"
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Location / Venue</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Lab 204, CSE Dept"
                      className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Team Members Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                      Assign Evaluator Members ({selectedMemberIds.length} Selected)
                    </label>
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="px-2.5 py-1 text-[10px] border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 bg-zinc-50/50 dark:bg-zinc-950/50">
                    {filteredMembers.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic text-center py-3">No members found</p>
                    ) : filteredMembers.map(m => {
                      const selected = selectedMemberIds.includes(m.id);
                      // Find panels this member is already assigned to (excluding current editing panel)
                      const assignedPanels = panels.filter(p =>
                        p.id !== editPanelId &&
                        p.members?.some(pm => pm.id === m.id)
                      );
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-bold transition select-none ${
                            selected ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {selected ? <CheckSquare size={15} className="text-blue-500 shrink-0" /> : <Square size={15} className="text-zinc-400 shrink-0" />}
                            <span className="truncate">{m.name}</span>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase shrink-0">({m.role})</span>
                          </div>
                          {assignedPanels.length > 0 && (
                            <div className="flex gap-1 flex-wrap justify-end ml-1">
                              {assignedPanels.slice(0, 2).map(ap => (
                                <span key={ap.id} className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-violet-500/10 text-violet-500 border border-violet-500/20 font-mono uppercase shrink-0">
                                {ap.name}
                                </span>
                              ))}
                              {assignedPanels.length > 2 && (
                                <span className="text-[8px] text-zinc-400 font-mono">+{assignedPanels.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Candidates Selector (create AND edit) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                      Assign Applicants ({selectedApplicantIds.length} Selected)
                    </label>
                    <input
                      type="text"
                      placeholder="Search candidate..."
                      value={applicantSearch}
                      onChange={e => setApplicantSearch(e.target.value)}
                      className="px-2.5 py-1 text-[10px] border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-h-44 overflow-y-auto space-y-1 bg-zinc-50/50 dark:bg-zinc-950/50">
                    {filteredApplicants.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic text-center py-3">No applicants found</p>
                    ) : (
                      filteredApplicants.map(a => {
                        const selected = selectedApplicantIds.includes(a.id);
                        // Find panels this candidate is already assigned to (excluding current)
                        const assignedPanels = panels.filter(p =>
                          p.id !== editPanelId &&
                          p.applicants?.some(pa => pa.id === a.id)
                        );
                        return (
                          <div
                            key={a.id}
                            onClick={() => toggleApplicantSelection(a.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-bold transition select-none ${
                              selected ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {selected ? <CheckSquare size={15} className="text-blue-500 shrink-0" /> : <Square size={15} className="text-zinc-400 shrink-0" />}
                              <span className="truncate">{a.full_name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono shrink-0">PRN: {a.prn}</span>
                            </div>
                            {assignedPanels.length > 0 && (
                              <div className="flex gap-1 flex-wrap justify-end ml-1">
                                {assignedPanels.slice(0, 2).map(ap => (
                                  <span key={ap.id} className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono uppercase shrink-0">
                                  {ap.name}
                                  </span>
                                ))}
                                {assignedPanels.length > 2 && (
                                  <span className="text-[8px] text-zinc-400 font-mono">+{assignedPanels.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : editPanelId ? 'Update Panel' : 'Create Panel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PanelsPage;
