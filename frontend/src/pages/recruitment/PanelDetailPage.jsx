import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft,
  MapPin,
  Users,
  UserCheck,
  ExternalLink,
  Save,
  Plus,
  Trash2,
  Settings,
  Lock,
  Award,
  CheckCircle2,
  X,
  UserX,
  UserCheck2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PanelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';
  const canPanels = isCoordinator || user?.permissions?.panels !== false;

  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  // Criteria Modal State for Coordinators
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState([]);
  const [savingCriteria, setSavingCriteria] = useState(false);

  // Saving state per applicant
  const [savingAppId, setSavingAppId] = useState(null);

  const fetchPanelDetail = async (isSilent = false) => {
    try {
      const res = await axios.get(`/panels/${id}`);
      setPanel(res.data.panel || null);
      setCriteria(res.data.criteria || []);
      setCurrentUserId(res.data.current_user_id);

      // Build evaluations map: { [appId]: { [criteriaId]: marks } }
      const evalMap = {};
      (res.data.evaluations || []).forEach(e => {
        if (e.evaluator_id === res.data.current_user_id) {
          if (!evalMap[e.application_id]) {
            evalMap[e.application_id] = { scores: {}, comments: '' };
          }
          evalMap[e.application_id].scores[e.criteria_id] = e.marks;
          if (e.comments) evalMap[e.application_id].comments = e.comments;
        }
      });

      setEvaluations(prev => {
        // preserve user's un-saved input changes
        const merged = { ...evalMap };
        Object.keys(prev).forEach(appKey => {
          if (prev[appKey]) {
            merged[appKey] = {
              ...merged[appKey],
              scores: { ...(merged[appKey]?.scores || {}), ...(prev[appKey].scores || {}) }
            };
          }
        });
        return merged;
      });
    } catch (err) {
      if (!isSilent) toast.error('Failed to load panel detail');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!canPanels) {
      setLoading(false);
      return;
    }

    fetchPanelDetail();
    const interval = setInterval(() => {
      fetchPanelDetail(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [id, canPanels]);

  const handleInterviewStatusChange = async (appId, newStatus) => {
    try {
      await axios.post(`/panels/${id}/interview-status`, {
        application_id: appId,
        interview_status: newStatus
      });
      toast.success(`Candidate interview status set to ${newStatus.toUpperCase()}! 🚀`);
      fetchPanelDetail(true);
    } catch (err) {
      toast.error('Failed to update candidate interview status');
    }
  };

  const handleScoreChange = (appId, criteriaId, val, maxMarks) => {
    let numericVal = val === '' ? '' : Math.max(0, Number(val));
    if (numericVal !== '' && maxMarks !== undefined && numericVal > Number(maxMarks)) {
      numericVal = Number(maxMarks);
    }
    setEvaluations(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        scores: {
          ...(prev[appId]?.scores || {}),
          [criteriaId]: numericVal
        }
      }
    }));
  };

  const handleSaveEvaluation = async (appId) => {
    setSavingAppId(appId);
    const appEval = evaluations[appId] || { scores: {} };
    try {
      await axios.post(`/panels/${id}/evaluate`, {
        application_id: appId,
        scores: appEval.scores || {},
        comments: appEval.comments || ''
      });
      toast.success('Evaluation marks saved! 🎉');
    } catch (err) {
      toast.error('Failed to save candidate evaluation');
    } finally {
      setSavingAppId(null);
    }
  };

  const handleAttendanceToggle = async (appId, currentAttendance) => {
    const newVal = !currentAttendance;
    // Optimistic update
    setPanel(prev => ({
      ...prev,
      applicants: prev.applicants.map(a =>
        a.id === appId
          ? { ...a, attendance: newVal ? 1 : 0, ...((!newVal) ? { interview_status: 'waiting' } : {}) }
          : a
      )
    }));
    try {
      await axios.post(`/panels/${id}/attendance`, {
        application_id: appId,
        attendance: newVal
      });
    } catch (err) {
      toast.error('Failed to update attendance');
      fetchPanelDetail(true);
    }
  };

  const openCriteriaModal = () => {
    setEditingCriteria(criteria.map(c => ({ ...c })));
    setShowCriteriaModal(true);
  };

  const addCriteriaRow = () => {
    setEditingCriteria(prev => [
      ...prev,
      { id: null, title: '', max_marks: 10, display_order: prev.length + 1 }
    ]);
  };

  const removeCriteriaRow = (index) => {
    setEditingCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveGlobalCriteria = async () => {
    setSavingCriteria(true);
    const loader = toast.loading('Updating evaluation criteria…');
    try {
      await axios.post('/evaluation-criteria', { criteria: editingCriteria });
      toast.success('Global evaluation criteria updated! 🎉');
      setShowCriteriaModal(false);
      fetchPanelDetail();
    } catch (err) {
      toast.error('Failed to update evaluation criteria');
    } finally {
      toast.dismiss(loader);
      setSavingCriteria(false);
    }
  };

  if (loading) return <MajorLoader fullPage />;

  if (!canPanels) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Lock className="text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-zinc-500 mt-2 max-w-sm">You do not have permission to view panel details.</p>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Panel Not Found</h2>
        <Link to="/dashboard/recruitment/panels" className="text-blue-500 underline text-xs mt-2 block">
          Return to Panels
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/recruitment/panels"
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black font-mono uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                {panel.panel_code}
              </span>
              <h1 className="text-xl font-black uppercase font-mono tracking-tight text-zinc-900 dark:text-white">
                {panel.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-zinc-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-zinc-400" /> {panel.location || 'Location Not Specified'}
              </span>
              <span>•</span>
              <span>Created by {panel.creator_name || 'Coordinator'}</span>
            </div>
          </div>
        </div>

        {isCoordinator && (
          <button
            onClick={openCriteriaModal}
            className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Settings size={14} /> Evaluation Criteria
          </button>
        )}
      </div>

      {/* Evaluators Pill Row */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 font-mono block mb-1">
            Assigned Evaluators ({panel.members?.length || 0})
          </span>
          <div className="flex flex-wrap gap-2">
            {panel.members && panel.members.length > 0 ? (
              panel.members.map(m => (
                <span
                  key={m.id}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-1.5"
                >
                  <UserCheck size={13} className="text-blue-500" />
                  {m.name}
                  {m.id === currentUserId && <span className="text-[9px] text-blue-500 font-mono uppercase ml-0.5">(You)</span>}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-400 italic">No evaluators assigned to this panel</span>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Section */}
      {panel.applicants?.length > 0 && (
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-zinc-900 dark:text-white">Candidate Attendance</h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">Mark present candidates before starting interviews.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                {panel.applicants.filter(a => a.attendance === 1 || a.attendance === true).length} / {panel.applicants.length} Present
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {panel.applicants.map(app => {
              const isPresent = app.attendance === 1 || app.attendance === true;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleAttendanceToggle(app.id, isPresent)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isPresent
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {isPresent
                    ? <UserCheck2 size={14} className="shrink-0" />
                    : <UserX size={14} className="shrink-0" />
                  }
                  <span>{app.full_name}</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md ${
                    isPresent
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                  }`}>{isPresent ? 'Present' : 'Absent'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidates Evaluation Table */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-zinc-900 dark:text-white">
              Assigned Candidate Evaluation Matrix
            </h3>
            <p className="text-xs text-zinc-400 font-medium">Enter scores for each evaluation criteria and save per candidate.</p>
          </div>
          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            {panel.applicants?.length || 0} Candidates
          </span>
        </div>

        {panel.applicants?.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs italic">
            No candidate applicants assigned to this panel yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold font-mono">
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3 text-center">Interview Status</th>
                  {criteria.map(c => (
                    <th key={c.id} className="py-3 px-3 text-center min-w-[110px]">
                      <div>{c.title}</div>
                      <div className="text-[8px] text-zinc-500 normal-case font-normal">(Max: {c.max_marks})</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">Total Score</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {panel.applicants.map(app => {
                  const appEval = evaluations[app.id]?.scores || {};
                  let totalScore = 0;
                  let maxPossible = 0;
                  criteria.forEach(c => {
                    maxPossible += Number(c.max_marks || 10);
                    const s = Number(appEval[c.id]);
                    if (!isNaN(s)) totalScore += s;
                  });

                  const currentStatus = app.interview_status || 'waiting';
                  const isPresent = app.attendance === 1 || app.attendance === true;

                  return (
                    <tr key={app.id} className={`transition ${isPresent ? 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/30' : 'opacity-50 bg-zinc-50/50 dark:bg-zinc-900/30'}`}>
                      {/* Candidate Details */}
                      <td className="py-3.5 px-3 min-w-[200px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{app.full_name}</span>
                            <Link
                              to={`/dashboard/recruitment/applications`}
                              className="text-blue-500 hover:text-blue-600"
                              title="View full candidate profile"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            {!isPresent && (
                              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-zinc-200 dark:bg-zinc-800 text-zinc-500 uppercase font-mono">Absent</span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            PRN: {app.prn} • {app.phone}
                          </div>
                        </div>
                      </td>

                      {/* Realtime Interview Status Dropdown — only if present */}
                      <td className="py-3.5 px-3 text-center min-w-[140px]">
                        {isPresent ? (
                          <select
                            value={currentStatus}
                            onChange={e => handleInterviewStatusChange(app.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono border transition cursor-pointer focus:outline-none ${
                              currentStatus === 'interviewing'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold'
                                : currentStatus === 'interviewed'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 font-bold'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-bold'
                            }`}
                          >
                            <option value="waiting" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">🟡 Remained</option>
                            <option value="interviewing" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">🟢 Interviewing</option>
                            <option value="interviewed" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">🔵 Interviewed</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic font-mono">—</span>
                        )}
                      </td>

                      {/* Criteria Score Inputs */}
                      {criteria.map(c => {
                        const scoreVal = appEval[c.id] !== undefined ? appEval[c.id] : '';
                        return (
                          <td key={c.id} className="py-3.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={c.max_marks}
                              step="0.5"
                              value={scoreVal}
                              onChange={e => handleScoreChange(app.id, c.id, e.target.value, c.max_marks)}
                              placeholder={`0-${c.max_marks}`}
                              disabled={!isPresent}
                              className="w-16 text-center px-2 py-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                        );
                      })}

                      {/* Total Score Column */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-black text-sm text-blue-600 dark:text-blue-400 font-mono">
                          {totalScore} / {maxPossible}
                        </span>
                      </td>

                      {/* Save Action */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveEvaluation(app.id)}
                          disabled={savingAppId === app.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition shadow-xs cursor-pointer ml-auto active:scale-95 disabled:opacity-60"
                        >
                          <Save size={12} /> {savingAppId === app.id ? 'Saving…' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Criteria Config Modal (Coordinators) */}
      <AnimatePresence>
        {showCriteriaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase font-mono">
                    Global Evaluation Criteria
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Configure criteria parameters used by evaluators.</p>
                </div>
                <button onClick={() => setShowCriteriaModal(false)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {editingCriteria.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={c.title}
                      onChange={e => {
                        const next = [...editingCriteria];
                        next[idx].title = e.target.value;
                        setEditingCriteria(next);
                      }}
                      placeholder="Criteria Title (e.g. Technical Logic)"
                      className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold rounded-xl"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400">Max:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={c.max_marks}
                        onChange={e => {
                          const next = [...editingCriteria];
                          next[idx].max_marks = Number(e.target.value);
                          setEditingCriteria(next);
                        }}
                        className="w-14 px-2 py-2 text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold rounded-xl"
                      />
                    </div>
                    <button
                      onClick={() => removeCriteriaRow(idx)}
                      className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addCriteriaRow}
                className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-600"
              >
                <Plus size={14} /> Add Criteria Element
              </button>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-end gap-3">
                <button onClick={() => setShowCriteriaModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-500">
                  Cancel
                </button>
                <button
                  onClick={handleSaveGlobalCriteria}
                  disabled={savingCriteria}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Save Criteria
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PanelDetailPage;
