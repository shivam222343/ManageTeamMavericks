import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
  MousePointer,
  Crosshair,
  Sliders,
  ChevronRight,
  Info,
  Star
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import TargetCursor from '../../components/ui/TargetCursor';

const JudgePortalPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cursor Mode: 'simple' (default standard OS cursor) or 'styled' (custom target cursor)
  const [cursorStyle, setCursorStyle] = useState(() => {
    return localStorage.getItem('judge_cursor_style') || 'simple';
  });

  const [panelData, setPanelData] = useState(null);
  const [scores, setScores] = useState({}); // { [registrationId]: { [parameterId]: number } }
  const [comments, setComments] = useState({}); // { [registrationId]: string }
  const [shortlistedIds, setShortlistedIds] = useState([]); // [registrationId, ...]
  const [hasManuallyToggledShortlist, setHasManuallyToggledShortlist] = useState(false);

  const token = localStorage.getItem('judge_token');
  const judgeInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('judge_info') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Sync cursor mode with body style
  useEffect(() => {
    if (cursorStyle === 'simple') {
      document.body.style.cursor = 'auto';
    }
    localStorage.setItem('judge_cursor_style', cursorStyle);
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [cursorStyle]);

  const toggleCursorStyle = () => {
    const next = cursorStyle === 'simple' ? 'styled' : 'simple';
    setCursorStyle(next);
    if (next === 'simple') {
      document.body.style.cursor = 'auto';
      toast.success('Switched to standard cursor', { icon: '🖱️' });
    } else {
      toast.success('Switched to styled target cursor', { icon: '🎯' });
    }
  };

  const fetchPanelData = useCallback(async (isSilent = false) => {
    if (!token) {
      navigate('/judge-login');
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await axios.get('/judge/panel-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setPanelData(data);

      // Populate existing evaluations if present for this group
      if (data.existing_evaluations && data.existing_evaluations.length > 0) {
        const initScores = {};
        const initComments = {};
        data.existing_evaluations.forEach((ev) => {
          if (!initScores[ev.registration_id]) initScores[ev.registration_id] = {};
          initScores[ev.registration_id][ev.parameter_id] = parseFloat(ev.marks);
          if (ev.comments) initComments[ev.registration_id] = ev.comments;
        });
        setScores((prev) => ({ ...initScores, ...prev }));
        setComments((prev) => ({ ...initComments, ...prev }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/judge-login');
      } else {
        console.error('Failed to load panel evaluation room', err);
      }
    } finally {
      if (!isSilent) setLoading(false);
      else setRefreshing(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchPanelData();
  }, [fetchPanelData]);

  // Real-time polling every 2.5 seconds to sync newly assigned groups and evaluations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPanelData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchPanelData]);

  // Automatically select top 5 candidates by total score by default
  useEffect(() => {
    const members = panelData?.members || [];
    if (members.length === 0) {
      setShortlistedIds([]);
      setHasManuallyToggledShortlist(false);
      return;
    }

    if (!hasManuallyToggledShortlist) {
      const scored = members.map((m) => {
        const regId = m.registration_id;
        const memScores = scores[regId] || {};
        let total = 0;
        (panelData?.parameters || []).forEach((p) => {
          const val = memScores[p.id];
          if (val !== undefined && val !== '' && !isNaN(val)) total += parseFloat(val);
        });
        return { regId, total };
      });
      scored.sort((a, b) => b.total - a.total);
      const top5 = scored.slice(0, 5).map((x) => x.regId);
      setShortlistedIds(top5);
    }
  }, [scores, panelData?.members, panelData?.parameters, hasManuallyToggledShortlist]);

  const handleScoreChange = (regId, paramId, value, maxMarks = 10) => {
    let num = value === '' ? '' : parseFloat(value);
    if (typeof num === 'number' && !isNaN(num)) {
      num = Math.max(0, Math.min(maxMarks, num));
    }
    setScores((prev) => ({
      ...prev,
      [regId]: {
        ...(prev[regId] || {}),
        [paramId]: num
      }
    }));
  };

  const handleCommentChange = (regId, val) => {
    setComments((prev) => ({
      ...prev,
      [regId]: val
    }));
  };

  const toggleCandidateShortlist = (regId) => {
    setHasManuallyToggledShortlist(true);
    setShortlistedIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  const handleAutoSelectTop5 = () => {
    const members = panelData?.members || [];
    const scored = members.map((m) => {
      const regId = m.registration_id;
      const memScores = scores[regId] || {};
      let total = 0;
      (panelData?.parameters || []).forEach((p) => {
        const val = memScores[p.id];
        if (val !== undefined && val !== '' && !isNaN(val)) total += parseFloat(val);
      });
      return { regId, total };
    });
    scored.sort((a, b) => b.total - a.total);
    const top5 = scored.slice(0, 5).map((x) => x.regId);
    setShortlistedIds(top5);
    setHasManuallyToggledShortlist(true);
    toast.success(`Selected top ${top5.length} candidates by score.`);
  };

  const handleSaveEvaluation = async () => {
    if (!panelData || !panelData.members || panelData.members.length === 0) {
      toast.error('No candidate group currently assigned to evaluate.');
      return;
    }

    const payload = [];
    panelData.members.forEach((m) => {
      const regId = m.registration_id;
      const memScores = scores[regId] || {};
      const memComment = comments[regId] || '';

      (panelData.parameters || []).forEach((p) => {
        const mark =
          memScores[p.id] !== undefined && memScores[p.id] !== '' ? parseFloat(memScores[p.id]) : 0;
        payload.push({
          registration_id: regId,
          parameter_id: p.id,
          marks: mark,
          comments: memComment
        });
      });
    });

    setSubmitting(true);
    try {
      const res = await axios.post(
        '/judge/submit-evaluation',
        {
          group_id: panelData.assigned_group?.id || null,
          round_id: panelData.panel?.round_id,
          sub_event_id: panelData.panel?.sub_event_id,
          evaluations: payload,
          shortlisted_registration_ids: shortlistedIds
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data?.message || 'Evaluation submitted successfully!');
      // Reset local inputs and fetch next group
      setScores({});
      setComments({});
      setShortlistedIds([]);
      setHasManuallyToggledShortlist(false);
      fetchPanelData(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('judge_token');
    localStorage.removeItem('judge_info');
    localStorage.removeItem('judge_panel');
    toast.success('Signed out from evaluation portal.');
    navigate('/judge-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-200">
        <MajorLoader fullPage message="Loading evaluation room..." />
      </div>
    );
  }

  const panel = panelData?.panel || {};
  const parameters = panelData?.parameters || [];
  const assignedGroup = panelData?.assigned_group;
  const members = panelData?.members || [];
  const assignedQueue = panelData?.assigned_groups_queue || [];
  const judgesCount = panelData?.judges_count || 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Optional Styled Target Cursor if enabled by Judge setting */}
      {cursorStyle === 'styled' && (
        <TargetCursor
          spinDuration={2}
          hideDefaultCursor={true}
          parallaxOn={true}
          hoverDuration={0.2}
          cursorColor="#818cf8"
          cursorColorOnTarget="#a855f7"
        />
      )}

      {/* Top Application Header - Clean Minimalist Enterprise Design */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Brand, Panel and Room Information */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
              <ShieldCheck size={18} className="text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  {panel.name || 'Panel'} <span className="text-zinc-500 font-normal">/</span> {panel.sub_event_name || 'Sub-Event'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Live Sync</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Judge: <span className="text-zinc-200 font-medium">{judgeInfo.name || 'Judge'}</span> • Venue: <span className="text-zinc-300 font-medium">{panel.venue || 'Room 1'}</span> • {judgesCount} Judge{judgesCount > 1 ? 's' : ''} on Panel
              </p>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {/* Setting: Cursor Style Switcher */}
            <button
              onClick={toggleCursorStyle}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
              title="Toggle between standard system cursor and styled cursor"
            >
              {cursorStyle === 'simple' ? (
                <>
                  <MousePointer size={13} className="text-zinc-400" />
                  <span className="text-[11px]">Cursor: Standard</span>
                </>
              ) : (
                <>
                  <Crosshair size={13} className="text-indigo-400" />
                  <span className="text-[11px] text-indigo-300 font-medium">Cursor: Styled</span>
                </>
              )}
            </button>

            {/* Sync Button */}
            <button
              onClick={() => fetchPanelData(true)}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs transition cursor-pointer"
              title="Refresh evaluations and queue"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>

            {/* Prominent Primary Submit Button (Header action) */}
            {assignedGroup && members.length > 0 && (
              <button
                onClick={handleSaveEvaluation}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Send size={13} className={submitting ? 'animate-spin' : ''} />
                <span>{submitting ? 'Submitting...' : 'Submit Evaluations'}</span>
              </button>
            )}

            {/* Logout / Exit Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-red-900/40 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 text-xs transition cursor-pointer"
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline text-[11px]">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1">
        {assignedGroup && members.length > 0 ? (
          /* ========================================================= */
          /* ACTIVE GROUP EVALUATION MATRIX TABLE                     */
          /* ========================================================= */
          <div className="space-y-5">
            {/* Group Header Info Bar */}
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                    {panel.round_name || 'Round Stage'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {members.length} Candidates Assigned
                  </span>
                </div>
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Users size={18} className="text-indigo-400" />
                  <span>{assignedGroup.name}</span>
                </h2>
                {assignedGroup.topic && (
                  <p className="text-xs text-zinc-300 mt-1">
                    <span className="text-zinc-500 font-medium">Topic / Case:</span> {assignedGroup.topic}
                  </p>
                )}
                {panel.instructions && (
                  <p className="text-xs text-zinc-400">
                    <span className="text-zinc-500 font-medium">Notes:</span> {panel.instructions}
                  </p>
                )}
              </div>

              {/* Status & Shortlist summary */}
              <div className="flex items-center gap-3">
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-right sm:text-left">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Shortlist Selected
                  </div>
                  <div className="text-sm font-semibold text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-400" />
                    <span>{shortlistedIds.length} / {members.length} Candidates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Matrix Data Grid */}
            <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-2xl overflow-hidden">
              {/* Matrix Control Header */}
              <div className="p-3.5 sm:px-5 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Score & Evaluation Matrix
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Enter scores out of 10 for each criterion. Top 5 candidates are automatically pre-selected; toggle candidates as needed before submitting.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSelectTop5}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Star size={12} className="text-amber-400" />
                    <span>Auto-Select Top 5</span>
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[11px] font-medium tracking-wide uppercase">
                      <th className="py-3 px-4 min-w-[220px]">Candidate</th>
                      {parameters.map((param) => (
                        <th key={param.id} className="py-3 px-3 min-w-[120px] text-center">
                          <div className="text-zinc-300 font-semibold">{param.name}</div>
                          <span className="text-[10px] text-zinc-500 lowercase">
                            max {param.max_marks || 10}
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-3 min-w-[90px] text-center">Total</th>
                      <th className="py-3 px-4 min-w-[140px] text-center">
                        <div>Shortlist</div>
                        <span className="text-[10px] text-zinc-500 font-normal">
                          (Top 5 default)
                        </span>
                      </th>
                      <th className="py-3 px-4 min-w-[180px]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {members.map((member, index) => {
                      const regId = member.registration_id;
                      const memScores = scores[regId] || {};

                      // Calculate candidate total marks for this judge
                      let totalCandidateMarks = 0;
                      parameters.forEach((p) => {
                        const val = memScores[p.id];
                        if (val !== undefined && val !== '' && !isNaN(val)) {
                          totalCandidateMarks += parseFloat(val);
                        }
                      });

                      const maxPossible = parameters.length * 10;
                      const isShortlisted = shortlistedIds.includes(regId);

                      // Calculate rank position among group members
                      const allScores = members
                        .map((m) => {
                          const mScores = scores[m.registration_id] || {};
                          let t = 0;
                          parameters.forEach((p) => {
                            const v = mScores[p.id];
                            if (v !== undefined && v !== '' && !isNaN(v)) t += parseFloat(v);
                          });
                          return { id: m.registration_id, score: t };
                        })
                        .sort((a, b) => b.score - a.score);

                      const rank = allScores.findIndex((x) => x.id === regId) + 1;
                      const isTop5 = rank <= 5;

                      return (
                        <tr
                          key={regId}
                          className={`transition duration-100 ${
                            isShortlisted ? 'bg-indigo-950/20 hover:bg-indigo-950/30' : 'hover:bg-zinc-900/40'
                          }`}
                        >
                          {/* Candidate Identity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-300 font-medium text-xs flex items-center justify-center shrink-0">
                                {member.participant_name?.charAt(0) || index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-100 text-xs">
                                  {member.participant_name}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                                  <span>{member.year || 'FY'}</span>
                                  <span>•</span>
                                  <span>{member.department || 'General'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-zinc-400 font-medium">Rank #{rank}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Evaluation Parameter Input Cells */}
                          {parameters.map((param) => {
                            const val = memScores[param.id] !== undefined ? memScores[param.id] : '';
                            return (
                              <td key={param.id} className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={param.max_marks || 10}
                                  step="0.5"
                                  placeholder="0-10"
                                  value={val}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      regId,
                                      param.id,
                                      e.target.value,
                                      param.max_marks || 10
                                    )
                                  }
                                  className="w-16 px-2 py-1.5 text-center rounded-lg bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-medium text-zinc-100 outline-none transition"
                                />
                              </td>
                            );
                          })}

                          {/* Total Score */}
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="font-semibold text-zinc-200">
                              {totalCandidateMarks.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              /{maxPossible}
                            </span>
                          </td>

                          {/* Shortlist Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleCandidateShortlist(regId)}
                              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
                                isShortlisted
                                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                              }`}
                            >
                              {isShortlisted ? (
                                <>
                                  <CheckCircle2 size={12} className="text-indigo-400" />
                                  <span>Shortlist</span>
                                </>
                              ) : (
                                <span>Pass</span>
                              )}
                            </button>
                            {isTop5 && isShortlisted && (
                              <span className="block text-[9px] text-zinc-500 mt-0.5">
                                Top #{rank}
                              </span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              placeholder="Feedback (optional)..."
                              value={comments[regId] || ''}
                              onChange={(e) => handleCommentChange(regId, e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-700 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 bg-zinc-900/80 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-zinc-400 space-y-0.5">
                  <div>
                    Evaluating group <strong className="text-zinc-200">{assignedGroup.name}</strong> ({members.length} candidates)
                  </div>
                  <div className="text-indigo-400">
                    {shortlistedIds.length} candidate{shortlistedIds.length !== 1 ? 's' : ''} recommended for shortlisting.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEvaluation}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Send size={13} className={submitting ? 'animate-spin' : ''} />
                    <span>{submitting ? 'Submitting...' : 'Submit Group Evaluation'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CLEAN DISTRACTION-FREE WAITING SCREEN                     */
          /* ========================================================= */
          <div className="py-20 max-w-lg mx-auto flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Clock size={28} className="text-indigo-400 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-zinc-100">
                Waiting for Group Assignment
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                Your panel <strong className="text-zinc-200">{panel.name || 'Panel'}</strong> is connected in real-time. When the control room coordinator assigns your next group, it will automatically appear here on your screen.
              </p>
            </div>

            {/* Queue overview if groups are queued */}
            {assignedQueue.length > 0 && (
              <div className="w-full p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/90 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                  <span>Assigned Groups Queue</span>
                  <span className="font-mono text-[11px]">{assignedQueue.length} Groups</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {assignedQueue.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-zinc-200">{g.name}</span>
                        {g.topic && <span className="text-[10px] text-zinc-500 block">{g.topic}</span>}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          g.status === 'evaluated'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => fetchPanelData(false)}
              className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Check for Updates</span>
            </button>
          </div>
        )}
      </main>

      {/* Understated Minimalist Footer */}
      <footer className="py-3 border-t border-zinc-800/60 text-center text-[11px] text-zinc-500">
        Team Mavericks • Evaluation Portal
      </footer>
    </div>
  );
};

export default JudgePortalPage;
