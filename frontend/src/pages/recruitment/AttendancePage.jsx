import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Search, RefreshCw, UserCheck2, UserX, Users, CheckCircle2, ExternalLink } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import MajorLoader from "../../components/ui/MajorLoader";

const AttendancePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState([]);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get("/panels");
      setPanels(res.data.panels || []);
    } catch (err) {
      toast.error("Failed to load panels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleAttendance = async (panelId, appId, currentAttendance) => {
    const key = panelId + "-" + appId;
    setTogglingId(key);
    const newVal = !currentAttendance;
    setPanels(prev => prev.map(p => {
      if (p.id !== panelId) return p;
      return { ...p, applicants: p.applicants.map(a => a.id === appId ? { ...a, attendance: newVal ? 1 : 0, ...(!newVal ? { interview_status: "waiting" } : {}) } : a) };
    }));
    try {
      await axios.post("/panels/" + panelId + "/attendance", { application_id: appId, attendance: newVal });
    } catch (err) {
      toast.error("Failed to update attendance");
      fetchData();
    } finally { setTogglingId(null); }
  };

  if (loading) return <MajorLoader fullPage />;

  const lowerSearch = search.toLowerCase();
  const candidateMap = new Map();
  panels.forEach(panel => {
    (panel.applicants || []).forEach(app => {
      if (!candidateMap.has(app.id)) candidateMap.set(app.id, { id: app.id, full_name: app.full_name, prn: app.prn, email: app.email, panels: [] });
      candidateMap.get(app.id).panels.push({ panelId: panel.id, panelName: panel.name, panelCode: panel.panel_code, attendance: app.attendance, interview_status: app.interview_status });
    });
  });

  const allCandidates = Array.from(candidateMap.values()).filter(c =>
    c.full_name?.toLowerCase().includes(lowerSearch) || c.prn?.toLowerCase().includes(lowerSearch) || c.email?.toLowerCase().includes(lowerSearch)
  );

  const presentCount = panels.reduce((acc, p) => acc + (p.applicants || []).filter(a => a.attendance === 1 || a.attendance === true).length, 0);
  const totalCount = panels.reduce((acc, p) => acc + (p.applicants || []).length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/recruitment/panels" className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Attendance</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">{presentCount} / {totalCount} Present</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Mark attendance for candidates assigned to interview panels.</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 transition cursor-pointer"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Total Assigned", value: totalCount, cls: "text-blue-600 dark:text-blue-400" }, { label: "Present", value: presentCount, cls: "text-emerald-600 dark:text-emerald-400" }, { label: "Absent", value: totalCount - presentCount, cls: "text-red-500 dark:text-red-400" }].map(s => (
          <div key={s.label} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 text-center">
            <div className={"text-2xl font-black font-mono " + s.cls}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono font-bold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input type="text" placeholder="Search by name, PRN or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
      </div>

      {allCandidates.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <Users size={36} className="mx-auto text-zinc-400 mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">No Candidates Found</h3>
          <p className="text-xs text-zinc-400 mt-1">{search ? "No candidates matched your search." : "No candidates are assigned to any panel yet."}</p>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">{allCandidates.length} Candidate{allCandidates.length !== 1 ? "s" : ""}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">Panel Attendance</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {allCandidates.map((candidate, idx) => {
              const allPresent = candidate.panels.every(p => p.attendance === 1 || p.attendance === true);
              const anyPresent = candidate.panels.some(p => p.attendance === 1 || p.attendance === true);
              return (
                <div key={candidate.id} className="px-5 py-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-black text-zinc-400 font-mono shrink-0 w-6 text-right">{idx + 1}.</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">{candidate.full_name}</span>
                          <Link to="/dashboard/recruitment/applications" className="text-blue-400 hover:text-blue-500 shrink-0" title="View profile"><ExternalLink size={12} /></Link>
                          {allPresent && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono uppercase"><CheckCircle2 size={9} /> All Present</span>}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">PRN: {candidate.prn}{candidate.email ? " • " + candidate.email : ""}</div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {allPresent ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase font-mono"><UserCheck2 size={11} /> Present</span>
                        : anyPresent ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase font-mono">Partial</span>
                        : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase font-mono"><UserX size={11} /> Absent</span>}
                    </div>
                  </div>
                  <div className="ml-9 flex flex-wrap gap-2">
                    {candidate.panels.map(pa => {
                      const isPresent = pa.attendance === 1 || pa.attendance === true;
                      const key = pa.panelId + "-" + candidate.id;
                      const isToggling = togglingId === key;
                      return (
                        <button key={pa.panelId} type="button" disabled={isToggling} onClick={() => handleToggleAttendance(pa.panelId, candidate.id, isPresent)}
                          className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition cursor-pointer select-none disabled:opacity-50 " + (isPresent ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
                          {isToggling ? <RefreshCw size={10} className="animate-spin" /> : isPresent ? <UserCheck2 size={10} /> : <UserX size={10} />}
                          <span className="font-black text-[9px] font-mono bg-zinc-200/50 dark:bg-zinc-700/50 px-1 py-0.5 rounded uppercase">{pa.panelCode}</span>
                          <span>{pa.panelName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
