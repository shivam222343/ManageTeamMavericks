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
  Award,
  ScanLine,
  Layers,
  Check,
  X
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import Footer from '../../components/layout/Footer';
import TearTicket from '../../components/ui/TearTicket';
import ElectricBorder from '../../components/ui/ElectricBorder';
import CursorPreferenceToggle from '../../components/ui/CursorPreferenceToggle';
import QrScannerModal from '../../components/ui/QrScannerModal';

const ParticipantDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ user: null, registrations: [], stats: {} });
  const [activeTab, setActiveTab] = useState('passes'); // 'passes' | 'profile'
  const [selectedPass, setSelectedPass] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

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

  const handleScanAttendance = async (scannedToken) => {
    try {
      setScanning(true);
      const res = await axios.post('/attendance/scan', {
        token: scannedToken,
        email: data.user?.email || user?.email
      });

      toast.success(res.data.message || 'Attendance marked successfully!', {
        icon: '🎉',
        duration: 5000
      });
      setScannerOpen(false);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to verify attendance QR token.';
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setScanning(false);
    }
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
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-20 flex items-center justify-between">
          
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
            {/* Scan QR Action Button (Icon Only) */}
            <button
              onClick={() => setScannerOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center"
              title="Scan Attendance QR"
              aria-label="Scan Attendance QR"
            >
              <ScanLine size={18} />
            </button>

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
      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-6 sm:py-10 w-full space-y-8 sm:space-y-10">
        
        {/* Welcome Banner */}
        <div className={`p-4 sm:p-10 rounded-3xl border shadow-xl relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-[#0E172A] via-[#0E172A] to-[#122854] border-[#1E293B]' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50 border-slate-200'}`}>
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
                Manage your registered events, access live digital QR passes, and scan attendance QR codes at the venue.
              </p>
            </div>

            {/* Quick Metrics & Scanner Trigger */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => setScannerOpen(true)}
                className="p-4 sm:p-5 rounded-2xl bg-primary-blue hover:bg-blue-600 text-white flex flex-col items-center justify-center min-w-[120px] shadow-lg shadow-primary-blue/25 transition cursor-pointer"
              >
                <ScanLine size={24} className="mb-1" />
                <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider">SCAN QR</span>
                <span className="text-xs font-bold mt-0.5">Mark Attendance</span>
              </button>

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
                <p className="text-xs text-slate-400">Digital passes, attendance status, and competition tracks.</p>
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
                {registrations.map((reg) => {
                  const subList = reg.sub_events || [];
                  const isMainAttended = reg.attended === 1 || reg.attended === true || reg.attended === '1';

                  return (
                    <TearTicket
                      key={reg.id}
                      image={reg.banner_url || (reg.event_slug === 'bodhantra' ? '/event-assets/bodhantra.jpeg' : null)}
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

                          <div className="text-center space-y-1">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border block ${
                              reg.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {reg.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border block ${
                              isMainAttended
                                ? 'bg-teal-500/15 text-teal-400 border-teal-500/30'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {isMainAttended ? '✓ Present' : 'Absent'}
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
                      height={290}
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tag text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-primary-blue border border-blue-500/20">
                            {reg.mode || 'OFFLINE'} FORMAT
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(reg.registered_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-display-heavy text-lg sm:text-xl uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
                            {reg.event_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {reg.location || "KIT's CoEK, Kolhapur"} · {formatDate(reg.start_date)}
                          </p>
                        </div>

                        {/* Registered Sub-events Chips */}
                        {subList.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                              Registered Tracks ({subList.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                              {subList.map((sub, sIdx) => {
                                const subAttended = sub.attended === 1 || sub.attended === true || sub.attended === '1';
                                return (
                                  <span
                                    key={sIdx}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                                      subAttended
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'bg-slate-800/40 border-slate-700 text-slate-300'
                                    }`}
                                  >
                                    <span>{sub.sub_event_name || `Track ${sIdx + 1}`}</span>
                                    {subAttended ? (
                                      <Check size={10} className="text-emerald-400" />
                                    ) : (
                                      <span className="text-[8px] opacity-60">(Absent)</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
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
                  );
                })}
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

            <form onSubmit={handleUpdateProfile} className={`p-4 sm:p-10 rounded-3xl border shadow-xl space-y-6 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'}`}>
              
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

              {/* Cursor Experience Preference */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <CursorPreferenceToggle />
              </div>

              {/* Password update */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
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
              className={`max-w-lg w-full rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto ${
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
                <h2 className="font-display-heavy text-2xl sm:text-3xl uppercase tracking-tight mt-1">
                  {selectedPass.event_name}
                </h2>
              </div>

              {/* Pass Card Details */}
              <div className={`p-5 rounded-2xl border space-y-4 mb-6 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">TOKEN</span>
                    <p className="font-mono text-base font-black text-primary-blue select-all">{selectedPass.registration_token}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">REGISTRATION</span>
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
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">EVENT ATTENDANCE</span>
                    <p className={`font-bold ${selectedPass.attended ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedPass.attended ? '✓ Marked Present' : 'Absent (Scan QR at venue)'}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono-tag text-[8px] font-bold text-slate-400 uppercase">VENUE</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{selectedPass.location || "KIT's CoEK"}</p>
                  </div>
                </div>

                {/* Sub-events Breakdown in Pass Modal */}
                {selectedPass.sub_events?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      SUB-EVENTS &amp; COMPETITION TRACKS
                    </span>
                    <div className="space-y-2">
                      {selectedPass.sub_events.map((sub, sIdx) => {
                        const subAtt = sub.attended === 1 || sub.attended === true || sub.attended === '1';
                        return (
                          <div
                            key={sIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                {sub.sub_event_name} {sub.team_name && `(${sub.team_name})`}
                              </p>
                              <span className="text-[10px] text-slate-400 capitalize">{sub.sub_event_type || 'Track'}</span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                subAtt
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}
                            >
                              {subAtt ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

      {/* --- QR SCANNER MODAL --- */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanAttendance}
        title="Scan Attendance QR Code"
        description="Point your device camera at the Event or Sub-Event Attendance QR code to mark your attendance."
      />

      <Footer />
    </div>
  );
};

export default ParticipantDashboard;

