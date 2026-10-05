import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  User,
  Shield,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  QrCode,
  Lock,
  ArrowUpRight,
  Save,
  Globe,
  Award
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import Footer from '../../components/layout/Footer';
import TearTicket from '../../components/ui/TearTicket';
import ElectricBorder from '../../components/ui/ElectricBorder';

const ParticipantDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ user: null, registrations: [], stats: {} });
  const [activeTab, setActiveTab] = useState('passes'); // 'passes' | 'profile'
  const [selectedPass, setSelectedPass] = useState(null);

  // Profile Edit State
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/participant/dashboard');
      setData(res.data);
      if (res.data.user?.name) {
        setName(res.data.user.name);
      }
    } catch (err) {
      console.error('Failed to load participant dashboard:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    try {
      setSavingProfile(true);
      const payload = { name };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await axios.put('/participant/profile', payload);
      toast.success('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'To Be Announced';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#070C18]' : 'bg-[#FAFAF9]'}`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  const registrations = data.registrations || [];
  const participant = data.user || user || {};

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${isDark ? 'bg-[#070C18] text-slate-100' : 'bg-[#FAFAF9] text-slate-900'}`}>
      
      {/* --- PARTICIPANT NAVBAR --- */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#070C18]/80 border-[#1E293B]' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/events" className="flex items-center gap-3 group">
            <img
              src="/Logos/Mavericks_Logo.png"
              alt="Team Mavericks"
              className="h-9 w-auto object-contain select-none group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-display-heavy text-base sm:text-lg tracking-tight uppercase leading-none text-zinc-900 dark:text-white">
                Team Mavericks
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary-blue font-bold mt-1">
                Participant Portal
              </span>
            </div>
          </Link>

          {/* Navigation Items & Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab('passes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'passes'
                  ? 'bg-blue-500/10 text-primary-blue border border-blue-500/20'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                My Passes ({registrations.length})
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'profile'
                  ? 'bg-blue-500/10 text-primary-blue border border-blue-500/20'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Account Profile
              </button>
            </nav>

            <Link
              to="/events"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'}`}
            >
              <span>Explore Events</span>
              <ArrowUpRight size={13} />
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition cursor-pointer ${isDark
                ? 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                navigate('/user-login');
                toast.success('Signed out successfully.');
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- DASHBOARD HERO --- */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full space-y-10">
        
        {/* Welcome Banner */}
        <div className={`p-8 sm:p-10 rounded-3xl border shadow-xl relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-[#0E172A] via-[#0E172A] to-[#122854] border-[#1E293B]' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50 border-slate-200'}`}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-primary-blue border border-blue-500/20">
                <Sparkles size={12} className="animate-pulse" />
                <span>OFFICIAL PARTICIPANT PORTAL</span>
              </div>
              <h1 className="font-display-heavy text-3xl sm:text-5xl uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
                Welcome, {participant.name || 'Participant'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Manage your registered events, access live digital QR passes, and review participation status.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className={`p-4 sm:p-5 rounded-2xl border text-center min-w-[110px] ${isDark ? 'bg-[#070C18]/60 border-[#1E293B]' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider text-slate-400 block">TOTAL EVENTS</span>
                <span className="text-2xl sm:text-3xl font-black text-primary-blue">{registrations.length}</span>
              </div>
              <div className={`p-4 sm:p-5 rounded-2xl border text-center min-w-[110px] ${isDark ? 'bg-[#070C18]/60 border-[#1E293B]' : 'bg-white border-slate-200 shadow-sm'}`}>
                <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider text-slate-400 block">CONFIRMED</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {registrations.filter(r => r.status === 'confirmed').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('passes')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'passes' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-slate-400'}`}
          >
            My Passes ({registrations.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === 'profile' ? 'border-primary-blue text-primary-blue' : 'border-transparent text-slate-400'}`}
          >
            Account Settings
          </button>
        </div>

        {/* --- TAB 1: PASSES & REGISTRATIONS --- */}
        {activeTab === 'passes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display-heavy text-2xl uppercase tracking-tight text-zinc-900 dark:text-white">
                  My Registered Events &amp; Passes
                </h2>
                <p className="text-xs text-slate-400">Digital passes and entry credentials for Team Mavericks events.</p>
              </div>
              <Link
                to="/events"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-primary-blue/20"
              >
                <span>Register for More</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {registrations.length === 0 ? (
              <div className={`p-16 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'}`}>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-primary-blue flex items-center justify-center mx-auto">
                  <Ticket size={32} />
                </div>
                <h3 className="font-display-heavy text-xl uppercase tracking-tight">No Event Registrations Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You haven't registered for any Team Mavericks events yet. Explore our upcoming hackathons, induction symposiums, and bootcamps!
                </p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition shadow-lg shadow-primary-blue/25"
                >
                  <span>Browse Upcoming Events</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {registrations.map((reg) => (
                  <TearTicket
                    key={reg.id}
                    image={reg.banner_url || (reg.event_slug === 'bodhantra' ? '/events/bodhantra.jpeg' : null)}
                    imageAlt={reg.event_name}
                    stub={
                      <div className="flex flex-col items-center justify-between h-full w-full py-1 space-y-2">
                        <div className="text-center">
                          <span className="font-mono-tag text-[8px] font-black uppercase tracking-widest text-emerald-400 block">
                            ★ ADMIT ONE ★
                          </span>
                          <span className="text-[10px] font-bold font-mono text-primary-blue mt-0.5 block truncate max-w-[110px]">
                            {reg.registration_token}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-black/40 border border-blue-500/20 flex items-center justify-center">
                          <QrCode size={28} className="text-primary-blue" />
                        </div>

                        <div className="text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border block ${
                            reg.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                      </div>
                    }
                    orientation="horizontal"
                    scrim
                    imageRadius={12}
                    onTear={() => {
                      toast.success(`Torn ticket for ${reg.event_name}! Ready for admission validation.`, { icon: '🎟️' });
                    }}
                    height={260}
                    stubSize={130}
                    radius={20}
                    holes={10}
                    holeSize={5}
                    notch={12}
                    roughness={0}
                    tearAngle={30}
                    stretch={40}
                    resistance={0.45}
                    rotate={0}
                    tilt
                    tiltMax={8}
                    tiltReach={260}
                    parallax={6}
                    perspective={1000}
                    background={isDark ? '#0E172A' : '#FFFFFF'}
                    color={isDark ? '#F8FAFC' : '#0F172A'}
                    border
                    borderWidth={1}
                    recenter
                    electric={false}
                    isDark={isDark}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tag text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue border border-blue-500/20">
                          {reg.mode || 'OFFLINE'} FORMAT
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(reg.registered_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display-heavy text-xl uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
                          {reg.event_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {reg.location || "KIT's CoEK, Kolhapur"} · {formatDate(reg.start_date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setSelectedPass(reg)}
                          className="flex-1 py-2 px-3 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider transition shadow-md shadow-primary-blue/20 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Ticket size={13} />
                          <span>View Full Pass</span>
                        </button>
                        <button
                          onClick={() => handleCopy(reg.registration_token, 'Registration Token')}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                          title="Copy Token"
                        >
                          <Copy size={13} />
                        </button>
                        <Link
                          to={`/events/${reg.event_slug}`}
                          className={`p-2 rounded-xl border transition cursor-pointer ${
                            isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                          title="View Event Details"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </div>
                  </TearTicket>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: PROFILE & SECURITY SETTINGS --- */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <h2 className="font-display-heavy text-2xl uppercase tracking-tight text-zinc-900 dark:text-white">
                Account &amp; Security Settings
              </h2>
              <p className="text-xs text-slate-400">Manage your profile details and portal password.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className={`p-8 sm:p-10 rounded-3xl border shadow-xl space-y-6 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'}`}>
              
              {/* Profile info */}
              <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-mono-tag text-xs font-black uppercase tracking-widest text-primary-blue">
                  PERSONAL INFORMATION
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                    Registered Email (Read-Only)
                  </label>
                  <input
                    type="email"
                    value={participant.email || ''}
                    disabled
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold opacity-60 cursor-not-allowed ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* Password update */}
              <div className="space-y-4">
                <h3 className="font-mono-tag text-xs font-black uppercase tracking-widest text-primary-blue">
                  SECURITY &amp; PASSWORD
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                    Current Password (Required only if updating password)
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-8 py-3.5 rounded-2xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-primary-blue/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* --- ENTRY PASS POPUP MODAL --- */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full rounded-3xl border p-8 shadow-2xl relative overflow-hidden ${
                isDark ? 'bg-[#0E172A] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="text-center mb-6">
                <img
                  src="/Logos/Mavericks_Logo.png"
                  alt="Team Mavericks"
                  className="h-10 w-auto mx-auto mb-3 object-contain"
                />
                <span className="font-mono-tag text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                  OFFICIAL EVENT ENTRY PASS
                </span>
                <h2 className="font-display-heavy text-3xl uppercase tracking-tight mt-1">
                  {selectedPass.event_name}
                </h2>
              </div>

              {/* Pass Card Details */}
              <div className={`p-6 rounded-2xl border space-y-4 mb-6 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">TOKEN</span>
                    <p className="font-mono text-base font-black text-primary-blue select-all">{selectedPass.registration_token}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">STATUS</span>
                    <p className="text-xs font-black text-emerald-400 uppercase">{selectedPass.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">ATTENDEE</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedPass.full_name}</p>
                  </div>
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">EMAIL</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{selectedPass.email}</p>
                  </div>
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">DATE &amp; TIME</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{formatDate(selectedPass.start_date)}</p>
                  </div>
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">VENUE</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{selectedPass.location || "KIT's CoEK"}</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                >
                  <Printer size={14} />
                  <span>Print Pass</span>
                </button>
                <button
                  onClick={() => setSelectedPass(null)}
                  className="flex-1 py-3 rounded-xl bg-primary-blue text-white hover:bg-blue-600 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default ParticipantDashboard;
