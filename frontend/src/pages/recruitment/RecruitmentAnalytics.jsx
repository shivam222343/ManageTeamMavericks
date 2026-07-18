import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MajorLoader from '../../components/ui/MajorLoader';
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
  AlertCircle
} from 'lucide-react';

const RecruitmentAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axios.get('/analytics?campaign_id=1');
        setStats(res.data);
      } catch (err) {
        toast.error('Failed to load recruitment analytics metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <MajorLoader fullPage={true} />;
  }

  const summary = stats?.summary || {};
  const statusDistribution = stats?.statusDistribution || {};
  const departments = Array.isArray(stats?.departments) ? stats.departments : [];
  const domains = Array.isArray(stats?.domains) ? stats.domains : [];
  const genderRatio = Array.isArray(stats?.genderRatio) ? stats.genderRatio : [];
  const applicationTrend = Array.isArray(stats?.applicationTrend) ? stats.applicationTrend : [];

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
  const genderColors = ['#2563eb', '#ec4899', '#71717a'];
  const formattedGender = genderRatio.map(g => ({
    name: g?.gender ? (g.gender.charAt(0).toUpperCase() + g.gender.slice(1)) : 'Unknown',
    value: parseInt(g?.count || 0)
  }));

  // Calculate days remaining
  const getDaysRemaining = (deadlineStr) => {
    if (!deadlineStr) return 0;
    const diff = new Date(deadlineStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = getDaysRemaining(summary.deadline);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 select-none">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Recruitment Analytics</h1>
          <p className="text-zinc-500 text-sm">Dashboard metrics for the active recruitment drive.</p>
        </div>
        <div className="flex gap-3">
          <a
            href={`http://localhost:8000/applicants/export?token=${localStorage.getItem('token') || ''}`}
            download
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold hover:shadow transition cursor-pointer shadow-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* --- Metrics Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Applications</span>
            <Users size={18} className="text-primary-blue" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">{summary.total_applications || 0}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Total registered candidates</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Today's Signups</span>
            <Sparkles size={18} className="text-secondary-orange" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">{summary.today_applications || 0}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Registered in the last 24 hours</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Acceptance Rate</span>
            <TrendingUp size={18} className="text-accent-green" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">{summary.selection_rate || 0}%</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Percentage of selected applicants</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Time Remaining</span>
            <Calendar size={18} className="text-purple-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight">{daysRemaining} Days</h3>
            <p className="text-[10px] text-zinc-400 font-semibold">Until campaign deadline date</p>
          </div>
        </div>

      </div>

      {/* --- Charts Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Application Submission Trend</h3>
            <p className="text-zinc-500 text-[10px] font-semibold mt-0.5">Daily candidate signups monitored over the last 15 days.</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip 
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.9)', 
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px' 
                  }} 
                />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution Pie Chart (1/3 width) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Diversity Ratios</h3>
            <p className="text-zinc-500 text-[10px] font-semibold mt-0.5">Gender distribution representation of candidates.</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            {formattedGender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedGender}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {formattedGender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={genderColors[index % genderColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-400 text-xs font-semibold">No gender data collected yet</div>
            )}
          </div>

          {/* Legends */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
            {formattedGender.map((g, idx) => (
              <div key={idx} className="space-y-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: genderColors[idx % genderColors.length] }}></span>
                <p className="text-zinc-500">{g.name}</p>
                <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{g.value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* --- Domains Distribution Bar Chart --- */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wide">Preference Ratios by Technical Domains</h3>
          <p className="text-zinc-500 text-[10px] font-semibold mt-0.5">How many applicants applied to each recruitment domain.</p>
        </div>

        <div className="h-64">
          {domainsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip 
                  contentStyle={{ 
                    background: 'rgba(255,255,255,0.9)', 
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    fontSize: '11px' 
                  }} 
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]}>
                  {domainsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index % 2 === 0 ? '#2563eb' : '#f97316'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-semibold">
              No domains data loaded yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default RecruitmentAnalytics;
