import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MajorLoader from '../../components/ui/MajorLoader';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  Users, 
  Sparkles, 
  Calendar, 
  TrendingUp,
  Download,
  RefreshCw,
  BarChart2,
  PieChart as PieIcon,
  Layers,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COLORS = [
  '#2563eb', '#f97316', '#10b981', '#a855f7', '#ec4899', 
  '#06b6d4', '#eab308', '#6366f1', '#14b8a6', '#f43f5e'
];

const RecruitmentAnalytics = () => {
  const { user } = useAuth();
  const canAnalytics = user?.role === 'coordinator' || user?.permissions?.analytics !== false;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [stats, setStats] = useState(null);

  const fetchDashboardData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const res = await axios.get('/analytics?campaign_id=1');
      setStats(res.data);
      setLastUpdated(new Date());
      if (showToast) toast.success('Analytics refreshed with latest real-time info!');
    } catch (err) {
      toast.error('Failed to load recruitment analytics metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (canAnalytics) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [canAnalytics]);

  if (loading) {
    return <MajorLoader fullPage={true} />;
  }

  if (!canAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <Lock className="text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-zinc-500 mt-2 max-w-sm">You do not have the necessary permissions to view recruitment analytics.</p>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const statusDistribution = stats?.statusDistribution || {};
  const domains = Array.isArray(stats?.domains) ? stats.domains : [];
  const genderRatio = Array.isArray(stats?.genderRatio) ? stats.genderRatio : [];
  const applicationTrend = Array.isArray(stats?.applicationTrend) ? stats.applicationTrend : [];
  const fieldAnalytics = Array.isArray(stats?.fieldAnalytics) ? stats.fieldAnalytics : [];

  // Format trend data
  const trendData = applicationTrend.map(t => ({
    date: t?.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    count: parseInt(t?.count || 0)
  }));

  // Format domains data
  const domainsData = domains.map(d => ({
    name: d?.domain_name || 'General',
    count: parseInt(d?.count || 0)
  }));

  // Format gender data
  const formattedGender = genderRatio.map(g => ({
    name: g?.gender ? (g.gender.charAt(0).toUpperCase() + g.gender.slice(1)) : 'Unknown',
    value: parseInt(g?.count || 0)
  }));

  const getDaysRemaining = (deadlineStr) => {
    if (!deadlineStr) return 0;
    const diff = new Date(deadlineStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining(summary.deadline);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto p-4 select-none"
    >
      
      {/* Title Header with Live Refresh Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Recruitment Analytics</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
              Live Real-Time
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">
            Updated at {lastUpdated.toLocaleTimeString()} • Monitoring dynamic metrics across all candidate submissions.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary-blue' : ''} />
            <span>Refresh Stats</span>
          </button>
          <a
            href={`${axios.defaults.baseURL}/applicants/export?token=${localStorage.getItem('token') || ''}`}
            download
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold hover:shadow transition cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
        </div>
      </div>

      {/* --- Metric Overview Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Applications</span>
            <Users size={18} className="text-primary-blue" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold tracking-tight">{summary.total_applications || 0}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Total registered candidates</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Today's Signups</span>
            <Sparkles size={18} className="text-secondary-orange" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold tracking-tight">{summary.today_applications || 0}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Registered in the last 24 hours</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Acceptance Rate</span>
            <TrendingUp size={18} className="text-accent-green" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold tracking-tight">{summary.selection_rate || 0}%</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Percentage of selected applicants</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Time Remaining</span>
            <Calendar size={18} className="text-purple-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold tracking-tight">{daysRemaining} Days</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Until campaign deadline date</p>
          </div>
        </motion.div>
      </div>

      {/* --- High-level Overview Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                <BarChart2 size={16} className="text-primary-blue" />
                <span>Application Submission Trend</span>
              </h3>
              <p className="text-zinc-500 text-[10px] font-semibold mt-0.5">Daily candidate signups monitored over the last 15 days.</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip 
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.95)', 
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }} 
                />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pipeline Radial / Donut */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
              <PieIcon size={16} className="text-purple-500" />
              <span>Status Breakdown</span>
            </h3>
            <p className="text-zinc-500 text-[10px] font-semibold mt-0.5">Recruitment pipeline distribution.</p>
          </div>

          <div className="space-y-2.5">
            {Object.entries(statusDistribution).map(([st, cnt], i) => {
              const total = summary.total_applications || 1;
              const pct = Math.round((cnt / total) * 100);
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold capitalize">
                    <span className="text-zinc-700 dark:text-zinc-300">{st.replace('_', ' ')}</span>
                    <span className="text-zinc-500">{cnt} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* --- Realtime Dynamic Analytics for All Form Fields --- */}
      <div className="space-y-6 pt-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers size={20} className="text-primary-blue" />
            <span>Dynamic Form Field Analytical Breakdowns</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Real-time analytical graphs generated automatically for every dynamic questionnaire field.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fieldAnalytics.map((fieldItem, fIdx) => {
            const { label, field_type, breakdown } = fieldItem;
            if (!breakdown || breakdown.length === 0) return null;

            const totalFieldAnswers = breakdown.reduce((acc, curr) => acc + curr.count, 0);
            const isPieChart = breakdown.length <= 4 || field_type === 'radio' || field_type === 'select';

            return (
              <motion.div
                key={fieldItem.field_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: fIdx * 0.08 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">{label}</h3>
                    <span className="text-[10px] text-zinc-400 font-semibold capitalize">Field Type: {field_type}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80">
                    {(field_type === 'checkbox' || field_type === 'multiselect') 
                      ? `${fieldItem.total_respondents || stats?.summary?.total_applications || 0} Candidates` 
                      : `${totalFieldAnswers} Responses`}
                  </span>
                </div>

                {isPieChart ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0 overflow-hidden">
                    <div className="h-44 w-44 shrink-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="option"
                          >
                            {breakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-2 min-w-0 w-full overflow-hidden">
                      {breakdown.map((item, idx) => {
                        const baseTotal = (field_type === 'checkbox' || field_type === 'multiselect')
                          ? (fieldItem.total_respondents || stats?.summary?.total_applications || 1)
                          : totalFieldAnswers;
                        const pct = baseTotal > 0 ? Math.round((item.count / baseTotal) * 100) : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs font-semibold gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                              <span className="truncate text-zinc-700 dark:text-zinc-300 block min-w-0" title={item.option}>{item.option}</span>
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 shrink-0 text-right">{item.count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                        <XAxis 
                          dataKey="option" 
                          stroke="#888888" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          tickFormatter={(val) => (typeof val === 'string' && val.length > 12 ? `${val.substring(0, 12)}…` : val)}
                        />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                        <ChartTooltip 
                          contentStyle={{ 
                            background: 'rgba(255,255,255,0.95)', 
                            border: '1px solid #e4e4e7',
                            borderRadius: '8px',
                            fontSize: '11px' 
                          }} 
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
};

export default RecruitmentAnalytics;
