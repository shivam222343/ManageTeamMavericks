import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  X,
  Key,
  Unlock,
  BrainCircuit,
  Play,
  RotateCw,
  Eye,
  History,
  Info,
  Camera,
  Upload,
  Loader2,
  Trash2
} from 'lucide-react';
import { BASE_URL } from '../../config/api';
import MajorLoader from '../../components/ui/MajorLoader';
import Footer from '../../components/layout/Footer';
import TearTicket from '../../components/ui/TearTicket';
import CursorPreferenceToggle from '../../components/ui/CursorPreferenceToggle';
import QrScannerModal from '../../components/ui/QrScannerModal';
import Lanyard from '../../components/ui/Lanyard';
import { useLanyardTextures, getISTGreeting } from '../../components/ui/useLanyardTextures';
import MindSagaKeyModal from '../../components/ui/MindSagaKeyModal';
import MobileScrollSlider from '../../components/ui/MobileScrollSlider';
import NotificationBell from '../../components/ui/NotificationBell';
import RegisteredEventProgressSection from '../../components/participant/RegisteredEventProgressSection';
import SpecularButton from '../../components/ui/SpecularButton';

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
  const [idModalOpen, setIdModalOpen] = useState(false);

  // Mind Saga Key Challenge Modal State (Always ask for key before entry)
  const [mindSagaModal, setMindSagaModal] = useState({
    isOpen: false,
    eventId: null,
    subEventId: null,
    subEventName: '',
    defaultKey: ''
  });
  const [keyInput, setKeyInput] = useState('');
  const [verifyingKey, setVerifyingKey] = useState(false);

  // Profile Edit State
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // IST Live Time
  const [istGreeting, setIstGreeting] = useState(() => getISTGreeting());

  // ID Card Custom Avatar Photo (stored in server and cached in localStorage)
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [customAvatar, setCustomAvatar] = useState(() => {
    try {
      return localStorage.getItem(`mavericks_id_photo_${user?.id || 'guest'}`) || '';
    } catch {
      return '';
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    const toastId = toast.loading('Uploading photo...');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await axios.post('/participant/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.avatar_url) {
        const fullUrl = res.data.avatar_url.startsWith('http')
          ? res.data.avatar_url
          : `${BASE_URL}${res.data.avatar_url}`;
        setCustomAvatar(fullUrl);
        try {
          localStorage.setItem(`mavericks_id_photo_${user?.id || 'guest'}`, fullUrl);
        } catch { }
        toast.success('ID Card photo updated!', { id: toastId });
      } else {
        throw new Error(res.data?.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      // Fallback: preview locally in case of network glitch
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result;
        if (dataUrl) {
          setCustomAvatar(dataUrl);
          try {
            localStorage.setItem(`mavericks_id_photo_${user?.id || 'guest'}`, dataUrl);
          } catch { }
        }
      };
      reader.readAsDataURL(file);
      toast.error(err.response?.data?.error || 'Server upload failed, saved locally', { id: toastId });
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setCustomAvatar('');
    try {
      localStorage.removeItem(`mavericks_id_photo_${user?.id || 'guest'}`);
    } catch { }
    try {
      await axios.delete('/participant/photo');
    } catch { }
    toast.success('Reset to default person icon');
  };

  // Dynamic Anchor calculation: aligns 3D card horizontally with left slot across any screen width
  const [anchorRatio, setAnchorRatio] = useState(0.24);
  const lanyardWrapperRef = useRef(null);
  const cardSlotRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'passes') return;

    const updateAnchor = () => {
      if (!cardSlotRef.current || !lanyardWrapperRef.current) return;
      const slotRect = cardSlotRef.current.getBoundingClientRect();
      const canvasRect = lanyardWrapperRef.current.getBoundingClientRect();
      if (canvasRect.width > 0) {
        const centerX = slotRect.left + slotRect.width / 2;
        const ratio = (centerX - canvasRect.left) / canvasRect.width;
        setAnchorRatio(Math.round(Math.max(0.06, Math.min(0.94, ratio)) * 1000) / 1000);
      }
    };

    updateAnchor();
    const timer = setTimeout(updateAnchor, 120);
    window.addEventListener('resize', updateAnchor);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [activeTab]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(() => {
      setIstGreeting(getISTGreeting());
    }, 60000); // refresh every minute

    const handleRealtimeRefresh = () => {
      fetchDashboard(true);
    };
    window.addEventListener('mavericks:refresh_data', handleRealtimeRefresh);
    window.addEventListener('mavericks:notification', handleRealtimeRefresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mavericks:refresh_data', handleRealtimeRefresh);
      window.removeEventListener('mavericks:notification', handleRealtimeRefresh);
    };
  }, []);

  const fetchDashboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get('/participant/dashboard');
      setData(res.data);
      if (res.data.user?.name) {
        setName(res.data.user.name);
      }
      if (res.data.user?.avatar_url) {
        const serverAvatar = res.data.user.avatar_url;
        const fullUrl = serverAvatar.startsWith('http') ? serverAvatar : `${BASE_URL}${serverAvatar}`;
        setCustomAvatar(fullUrl);
        try {
          localStorage.setItem(`mavericks_id_photo_${res.data.user.id || user?.id || 'guest'}`, fullUrl);
        } catch { }
      }
    } catch (err) {
      console.error('Failed to load participant dashboard:', err);
      if (!silent) toast.error('Failed to load dashboard data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const registrations = data.registrations || [];
  const participant = data.user || user || {};

  // Extract comprehensive participant info for 3D Lanyard & Badge
  const participantInfo = useMemo(() => {
    const reg = registrations?.[0] || {};
    const answers = reg.answers || [];

    const findAnswer = (keywords) => {
      for (const ans of answers) {
        const label = (ans.label || '').toLowerCase();
        if (keywords.some((k) => label.includes(k))) {
          return ans.answer_text;
        }
      }
      return '';
    };

    const pName = participant?.name || reg.full_name || 'Participant';
    const pEmail = participant?.email || reg.email || 'participant@teammavericks.org';
    const pPhone = reg.phone || findAnswer(['phone', 'contact', 'mobile', 'whatsapp']) || '+91 ••••• •••••';
    const pBranch = findAnswer(['department', 'branch', 'dept', 'stream', 'course']) || 'Computer Science & Business Systems';
    const pYear = findAnswer(['year', 'class', 'sem']) || 'Student';
    const pCollege = findAnswer(['college', 'institute', 'campus', 'university']) || "KIT's College of Engineering, Kolhapur";
    const pPrn = findAnswer(['prn', 'roll', 'uid', 'id number']) || reg.registration_token?.substring(0, 10) || 'MAV-2026';
    const pToken = reg.registration_token || `MAV-PASS-${participant?.id || '2026'}`;

    return {
      name: pName,
      email: pEmail,
      phone: pPhone,
      branch: pBranch,
      year: pYear,
      college: pCollege,
      prn: pPrn,
      token: pToken,
      avatar: customAvatar
    };
  }, [participant, registrations, customAvatar]);

  // Generate 3D textures dynamically for Front, Back and Strap
  const textures = useLanyardTextures(participantInfo, isDark);

  // Split registrations into Available/Upcoming vs Past
  const { availablePasses, pastPasses } = useMemo(() => {
    const now = new Date();
    const available = [];
    const past = [];

    registrations.forEach((reg) => {
      const isPastDate = reg.end_date ? new Date(reg.end_date) < now : false;
      const isArchived = reg.event_status === 'completed' || reg.event_status === 'archived';

      if (isPastDate && isArchived && reg.attended) {
        past.push(reg);
      } else {
        available.push(reg);
      }
    });

    // If all are marked past, keep at least ongoing in available
    if (available.length === 0 && past.length > 0) {
      return { availablePasses: [past[0]], pastPasses: past.slice(1) };
    }

    return { availablePasses: available, pastPasses: past };
  }, [registrations]);

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

  const openMindSagaKeyPrompt = (eventId, subEventId, subEventName, defaultKey) => {
    setMindSagaModal({
      isOpen: true,
      eventId,
      subEventId,
      subEventName: subEventName || 'Mind Saga',
      defaultKey: defaultKey || ''
    });
    setKeyInput('');
  };

  const handleVerifyMindSagaKey = async (keyArg, emailArg) => {
    const keyToTest = (typeof keyArg === 'string' ? keyArg : keyInput).trim().toUpperCase();
    if (!keyToTest) {
      toast.error('Please enter your unique Mind Saga Access Key.');
      return;
    }

    try {
      setVerifyingKey(true);
      const res = await axios.post('/mindsaga/auth/login-with-key', {
        access_key: keyToTest,
        email: emailArg || data.user?.email || user?.email
      });

      if (res.data.token) {
        sessionStorage.setItem('mind_saga_auth_token', res.data.token);
        sessionStorage.setItem('mind_saga_key', keyToTest);
        sessionStorage.setItem('mind_saga_sub_id', String(mindSagaModal.subEventId));
        localStorage.setItem('mind_saga_access_key', keyToTest);
      }

      toast.success('Access Key verified! Entering Mind Saga Arena...', { icon: '🚀' });
      const targetEventId = mindSagaModal.eventId;
      const targetSubId = mindSagaModal.subEventId;
      setMindSagaModal({ isOpen: false, eventId: null, subEventId: null, subEventName: '', defaultKey: '' });
      setSelectedPass(null);
      navigate(`/events/${targetEventId}/sub-events/${targetSubId}/mind-saga`);
    } catch (err) {
      console.error('Key verification failed:', err);
      const errMsg = err.response?.data?.error || 'Invalid Access Key. Please enter the key shown on your pass.';
      toast.error(errMsg);
    } finally {
      setVerifyingKey(false);
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

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between overflow-x-clip transition-colors duration-300 ${isDark ? 'bg-[#070C18] text-slate-100' : 'bg-[#FAFAF9] text-slate-900'}`}>

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
            {/* Scan QR Action Button */}
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

            {/* Realtime Notification Bell */}
            <NotificationBell />

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

      {/* --- DASHBOARD MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-2 sm:px-6 py-6 sm:py-10 w-full space-y-8 sm:space-y-10">

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

        {/* --- TAB 1: PASSES & 3D ID CARD PORTAL --- */}
        {activeTab === 'passes' && (
          <div className="relative w-full">

            {/* ============================================================ */}
            {/* FULL SCREEN WIDTH 3D LANYARD LAYER (EXTENDS TO SCREEN EDGES) */}
            {/* ============================================================ */}
            <div
              ref={lanyardWrapperRef}
              className="absolute -top-7 sm:-top-11 pointer-events-auto z-0 overflow-visible select-none"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100vw',
                height: '860px',
              }}
            >
              {textures.ready ? (
                <Lanyard
                  key={isDark ? 'dark' : 'light'}
                  className="w-full h-full pointer-events-auto"
                  frontImage={textures.frontImage}
                  backImage={textures.backImage}
                  strapImage={textures.strapImage}
                  imageFit="cover"
                  cardColor={isDark ? "#0A0F1D" : "#ffffff"}
                  orientation="portrait"
                  finish="glossy"
                  cornerRadius={0.32}
                  size={0.56}
                  anchor={anchorRatio}
                  strapLength={0.46}
                  strapColor={isDark ? "#0A0A0A" : "#111111"}
                  strapWidth={0.62}
                  metal={isDark ? "graphite" : "silver"}
                  gravity={1}
                  damping={0.46}
                  elasticity={0.72}
                  breeze={0.35}
                  interactive
                  intro
                />
              ) : null}
            </div>

            {/* ============================================================ */}
            {/* FOREGROUND CONTENT: LEFT OPEN SPACE + RIGHT PASS CARDS (Z-10)*/}
            {/* ============================================================ */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pointer-events-none">

              {/* LEFT COLUMN: Open Hanging Area for ID card + Side Upload Action */}
              <div
                ref={cardSlotRef}
                className="relative lg:col-span-5 w-full min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] pb-6 pointer-events-none flex flex-col items-center justify-between"
              >
                {/* Side Action Buttons in empty space: Upload & Delete side by side at identical size */}
                <div className="absolute top-3 sm:top-5 right-3 sm:right-6 z-30 pointer-events-auto flex flex-row items-center gap-2 sm:gap-2.5">
                  <label
                    htmlFor="id-card-photo-input"
                    title={customAvatar ? "Change ID photo" : "Upload ID photo"}
                    aria-label="Upload photo to ID card"
                    className={`group relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl backdrop-blur-xl border transition-all duration-300 shadow-md cursor-pointer ${uploadingPhoto
                      ? 'bg-primary-blue text-white shadow-blue-500/40 ring-4 ring-blue-500/25 pointer-events-none scale-105'
                      : isDark
                        ? 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80 hover:border-blue-500/60 shadow-black/40 hover:scale-105 active:scale-95'
                        : 'bg-white/95 hover:bg-white text-slate-700 hover:text-primary-blue border-slate-200/90 hover:border-blue-400 shadow-slate-200/80 hover:scale-105 active:scale-95'
                      }`}
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                      <Upload size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:text-primary-blue" />
                    )}
                    <input
                      id="id-card-photo-input"
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>

                  {customAvatar && !uploadingPhoto && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      title="Delete custom photo (Reset to default)"
                      aria-label="Delete ID photo"
                      className={`group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl backdrop-blur-xl border transition-all duration-200 shadow-md cursor-pointer ${isDark
                        ? 'bg-slate-900/85 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border-slate-700/80 hover:border-rose-800/60 shadow-black/40 hover:scale-105 active:scale-95'
                        : 'bg-white/95 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200/90 hover:border-rose-300 shadow-slate-200/80 hover:scale-105 active:scale-95'
                        }`}
                    >
                      <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                    </button>
                  )}
                </div>

                <div className="w-full flex-1 flex flex-col items-center justify-center">
                  {!textures.ready && (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <MajorLoader />
                      <span className="text-xs font-mono text-slate-400">Rendering 3D ID Card...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: PASSES LIST DIRECTLY (NO GREETING CONTAINER)  */}
              <div className="lg:col-span-7 w-full space-y-8 pointer-events-auto">

                {/* --- SECTION 1: AVAILABLE & ACTIVE EVENT PASSES --- */}
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                    <div>

                      <h2 className="font-display-heavy text-2xl uppercase tracking-tight text-zinc-900 dark:text-white">
                        Active Passes ({availablePasses.length})
                      </h2>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => setScannerOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <ScanLine size={15} />
                        <span>Scan Attendance</span>
                      </button>
                      <Link
                        to="/events"
                        className="px-3.5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <span>Explore</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {availablePasses.length === 0 ? (
                    <div className={`p-12 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'}`}>
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-primary-blue flex items-center justify-center mx-auto">
                        <Ticket size={28} />
                      </div>
                      <h3 className="font-display-heavy text-lg uppercase tracking-tight">No Active Registrations Found</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        You haven't registered for any active Team Mavericks events yet. Explore upcoming hackathons, induction symposiums, and bootcamps!
                      </p>
                      <Link
                        to="/events"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition shadow-lg shadow-primary-blue/25"
                      >
                        <span>Browse Upcoming Events</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {availablePasses.map((reg) => {
                        const subList = reg.sub_events || [];
                        const isMainAttended = reg.attended === 1 || reg.attended === true || reg.attended === '1';

                        return (
                          <TearTicket
                            key={reg.id}
                            image={reg.banner_url || (reg.event_slug === 'bodhantra' ? '/event-assets/bodhantra.jpeg' : null)}
                            imageAlt={reg.event_name}
                            stub={
                              <div className="flex flex-col items-center justify-between h-full w-full py-3 px-2 sm:px-3 space-y-3">
                                {/* Admit One & Token */}
                                <div className="text-center w-full">
                                  <div className={`font-mono text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'
                                    }`}>
                                    <span>★</span>
                                    <span>ADMIT ONE</span>
                                    <span>★</span>
                                  </div>
                                  <span className="font-mono text-[11px] font-bold text-primary-blue mt-0.5 block truncate max-w-[170px] mx-auto tracking-wider select-all">
                                    {reg.registration_token}
                                  </span>
                                </div>

                                {/* Apple Wallet QR Code Tile */}
                                <div
                                  onClick={() => setSelectedPass(reg)}
                                  className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${isDark
                                    ? 'bg-white border-white/20 shadow-black/40 hover:shadow-blue-500/20'
                                    : 'bg-white border-slate-200 shadow-slate-200/80 hover:shadow-blue-500/20'
                                    }`}
                                  title="Click to view official QR pass"
                                >
                                  {/* Corner scan target frames */}
                                  <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-primary-blue pointer-events-none" />
                                  <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-primary-blue pointer-events-none" />
                                  <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-primary-blue pointer-events-none" />
                                  <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-primary-blue pointer-events-none" />

                                  <QrCode size={52} className="text-slate-950" />
                                  <span className="block text-[8px] font-mono text-center font-bold text-slate-500 mt-1 uppercase tracking-wider group-hover:text-primary-blue">
                                    Tap to View
                                  </span>
                                </div>

                                {/* Verification Status & Attendance Badges */}
                                <div className="w-full flex flex-col items-center gap-1.5">
                                  <span
                                    className={`w-full text-center py-1 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition ${reg.status === 'confirmed'
                                      ? isDark
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                      : isDark
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        : 'bg-amber-50 text-amber-700 border-amber-300'
                                      }`}
                                  >
                                    ● {reg.status}
                                  </span>
                                  <span
                                    className={`w-full text-center py-0.5 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${isMainAttended
                                      ? isDark
                                        ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                                        : 'bg-teal-50 text-teal-800 border-teal-300'
                                      : isDark
                                        ? 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                  >
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
                            height="auto"
                            stubSize={200}
                            radius={24}
                            holes={8}
                            holeSize={5}
                            notch={13}
                            roughness={0}
                            tearAngle={25}
                            stretch={40}
                            resistance={0.45}
                            rotate={0}
                            tilt
                            tiltMax={6}
                            tiltReach={240}
                            parallax={5}
                            perspective={1000}
                            background={isDark ? '#0C1222' : '#FFFFFF'}
                            color={isDark ? '#F8FAFC' : '#0F172A'}
                            border
                            recenter
                            electric={false}
                            isDark={isDark}
                          >
                            <div className="space-y-3.5">
                              {/* Format and Date Row */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${isDark
                                    ? 'bg-blue-500/10 text-primary-blue border-blue-500/25'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-blue animate-pulse" />
                                  <span>{reg.mode || 'OFFLINE'} FORMAT</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <Calendar size={12} className="opacity-70" />
                                  <span>{new Date(reg.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </span>
                              </div>

                              {/* Event Title & Location */}
                              <div>
                                <h3 className="font-display-heavy text-xl sm:text-2xl uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
                                  {reg.event_name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  <MapPin size={13} className="text-primary-blue shrink-0" />
                                  <span className="truncate">{reg.location || "KIT's College of Engineering, Kolhapur"}</span>
                                  <span>·</span>
                                  <span className="shrink-0">{formatDate(reg.start_date)}</span>
                                </div>
                              </div>

                              {/* Registered Tracks & Sub-Events */}
                              {subList.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <div className={`font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                    <span>Registered Tracks &amp; Sub-Events ({subList.length})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {subList.map((sub, sIdx) => {
                                      const subAttended =
                                        sub.attended === 1 ||
                                        sub.attended === true ||
                                        sub.attended === '1' ||
                                        sub.attendance === 1 ||
                                        sub.attendance === '1';

                                      return (
                                        <span
                                          key={sIdx}
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${subAttended
                                            ? isDark
                                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                            : isDark
                                              ? 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                                              : 'bg-slate-100 border-slate-200 text-slate-700'
                                            }`}
                                        >
                                          <span>{sub.sub_event_name || `Track ${sIdx + 1}`}</span>
                                          {sub.team_name && <span className="opacity-70 text-[10px]">({sub.team_name})</span>}
                                          {subAttended ? (
                                            <span className={`inline-flex items-center gap-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                              <Check size={11} />
                                              <span className="text-[10px] font-bold">Present</span>
                                            </span>
                                          ) : (
                                            <span className={`text-[10px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>(Absent)</span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Mind Saga Candidate Access Card & Arena Launcher */}
                              {subList.some(s => s.is_mind_saga || s.mind_saga_key || s.sub_event_name?.toLowerCase().includes('mind') || s.sub_event_slug?.toLowerCase().includes('mind')) && (
                                <div className="pt-1.5 space-y-2">
                                  {subList
                                    .filter(s => s.is_mind_saga || s.mind_saga_key || s.sub_event_name?.toLowerCase().includes('mind') || s.sub_event_slug?.toLowerCase().includes('mind'))
                                    .map((msSub, msIdx) => {
                                      const isLive = msSub.mind_saga_platform_status === 'live';
                                      const accessKey = msSub.mind_saga_key || 'MS-PENDING';

                                      const isAttended =
                                        msSub.attendance === 1 ||
                                        msSub.attendance === true ||
                                        msSub.attendance === '1' ||
                                        msSub.attended === 1 ||
                                        msSub.attended === true ||
                                        msSub.attended === '1';

                                      return (
                                        <div
                                          key={msIdx}
                                          className={`p-3.5 rounded-2xl border transition-all ${isDark
                                            ? 'bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-900 border-indigo-500/30'
                                            : 'bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border-indigo-200/90 shadow-sm'
                                            }`}
                                        >
                                          <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <div className="flex items-center gap-2">
                                              <div className={`p-1.5 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                                <BrainCircuit size={15} />
                                              </div>
                                              <div>
                                                <span className={`font-display-heavy text-xs uppercase tracking-tight font-bold block leading-none ${isDark ? 'text-indigo-300' : 'text-indigo-900'
                                                  }`}>
                                                  {msSub.sub_event_name || 'Mind Saga'}
                                                </span>
                                                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                  3 Championship Rounds
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${isAttended
                                                  ? isDark
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                    : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                                  : isDark
                                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                    : 'bg-rose-100 border-rose-300 text-rose-800'
                                                  }`}
                                              >
                                                <span className={`w-1.5 h-1.5 rounded-full ${isAttended ? (isDark ? 'bg-emerald-400' : 'bg-emerald-600') : (isDark ? 'bg-rose-400' : 'bg-rose-600')}`} />
                                                <span>{isAttended ? 'Attended ✓' : 'Absent'}</span>
                                              </span>

                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${isLive
                                                  ? isDark
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse'
                                                    : 'bg-emerald-100 border-emerald-300 text-emerald-800 animate-pulse'
                                                  : isDark
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    : 'bg-amber-100 border-amber-300 text-amber-800'
                                                  }`}
                                              >
                                                <span>{isLive ? 'LIVE' : 'STANDBY'}</span>
                                              </span>
                                            </div>
                                          </div>

                                          {/* Candidate Key Card */}
                                          <div
                                            className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border mb-2.5 ${isDark ? 'bg-black/40 border-indigo-500/25' : 'bg-white/95 border-indigo-200/90 shadow-sm'
                                              }`}
                                          >
                                            <div className="flex items-center gap-2 truncate">
                                              <Key size={14} className={isDark ? 'text-indigo-400 shrink-0' : 'text-indigo-600 shrink-0'} />
                                              <div className="truncate">
                                                <span className={`text-[8px] font-mono uppercase block leading-none ${isDark ? 'text-slate-400' : 'text-slate-500 font-semibold'}`}>
                                                  Candidate Key
                                                </span>
                                                <span className={`font-mono text-xs font-black tracking-wider select-all ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                                  {accessKey}
                                                </span>
                                              </div>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => handleCopy(accessKey, 'Mind Saga Access Key')}
                                              className={`p-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${isDark
                                                ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30'
                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                }`}
                                            >
                                              <Copy size={11} />
                                              <span>Copy</span>
                                            </button>
                                          </div>

                                          {!isAttended ? (
                                            <div
                                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200 text-amber-900'
                                                }`}
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <Lock size={12} className={isDark ? 'text-amber-400 shrink-0' : 'text-amber-600 shrink-0'} />
                                                <span className={`text-[10px] font-semibold leading-tight ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                                                  Scan venue QR code to unlock test link.
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setScannerOpen(true)}
                                                className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition shadow-sm"
                                              >
                                                <ScanLine size={11} />
                                                <span>Scan</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <SpecularButton
                                              size="md"
                                              radius={16}
                                              textColor={isDark ? '#f5f5f5' : '#09090b'}
                                              lineColor={isDark ? '#ffffff' : '#09090b'}
                                              baseColor={isDark ? '#3f3f46' : '#d4d4d8'}
                                              tint={isDark ? '#000000' : '#ffffff'}
                                              tintOpacity={isDark ? 0.4 : 0.8}
                                              className="w-full"
                                              onClick={() => openMindSagaKeyPrompt(reg.event_id, msSub.sub_event_id, msSub.sub_event_name, accessKey)}
                                            >
                                              <Play size={12} fill={isDark ? '#f5f5f5' : '#09090b'} />
                                              <span>Enter Mind Saga Arena</span>
                                              <ArrowUpRight size={13} />
                                            </SpecularButton>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}

                              {/* Bottom Action Row */}
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/60">
                                <button
                                  onClick={() => setSelectedPass(reg)}
                                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md shadow-primary-blue/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                  <Ticket size={14} />
                                  <span>View Full Pass</span>
                                </button>
                                <button
                                  onClick={() => handleCopy(reg.registration_token, 'Registration Token')}
                                  className={`p-2.5 rounded-xl border transition cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                    }`}
                                  title="Copy Token"
                                >
                                  <Copy size={14} />
                                </button>
                                <Link
                                  to={`/events/${reg.event_slug}`}
                                  className={`p-2.5 rounded-xl border transition cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                    }`}
                                  title="View Event Details"
                                >
                                  <ExternalLink size={14} />
                                </Link>
                              </div>
                            </div>
                          </TearTicket>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* --- SECTION 2: PAST REGISTERED EVENT PASSES --- */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                      <History size={18} />
                    </div>
                    <div>
                      <h2 className="font-display-heavy text-lg uppercase tracking-tight text-zinc-900 dark:text-white">
                        Pass History
                      </h2>
                      <p className="text-xs text-slate-400">Previous competitions, symposium history, and event records.</p>
                    </div>
                  </div>

                  {pastPasses.length === 0 ? (
                    <div className={`p-6 rounded-2xl border text-center ${isDark ? 'bg-[#0E172A]/60 border-[#1E293B]' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                        <Info size={15} />
                        <span>No completed past events yet. Completed event passes and participation certificates will appear here.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastPasses.map((pReg) => (
                        <div
                          key={pReg.id}
                          className={`p-4 rounded-2xl border transition ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              COMPLETED EVENT
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(pReg.registered_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="font-display-heavy text-base uppercase tracking-tight text-zinc-900 dark:text-white">
                            {pReg.event_name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mb-3">
                            {pReg.location || "KIT's CoEK"} · Token: {pReg.registration_token}
                          </p>
                          <button
                            onClick={() => setSelectedPass(pReg)}
                            className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer flex items-center justify-center gap-1.5 ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                          >
                            <Ticket size={12} />
                            <span>View Past Pass</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* ========================================================================= */}
            {/* SECTION 3: REGISTERED EVENT PROGRESS, SUB-EVENTS ATTENDANCE & MILESTONES  */}
            {/* ========================================================================= */}
            <div className="relative z-10 pointer-events-auto">
              <RegisteredEventProgressSection
                registrations={registrations}
                isDark={isDark}
                onOpenScanner={() => setScannerOpen(true)}
                onOpenMindSagaModal={openMindSagaKeyPrompt}
                onSelectPass={(p) => setSelectedPass(p)}
              />
            </div>
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
                <h3 className="font-mono text-xs font-black uppercase tracking-widest text-primary-blue">
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

                {/* ID Card Avatar Photo */}
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-700 dark:text-slate-300">
                    3D ID Card Badge Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-blue/40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                      {customAvatar ? (
                        <img src={customAvatar} alt="ID Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="profile-tab-photo-input"
                          className="px-3.5 py-1.5 rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-blue-600 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Camera size={13} />
                          <span>{customAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                          <input
                            id="profile-tab-photo-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                        {customAvatar && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">Shown in the circular portrait frame on your 3D participant lanyard.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cursor Experience Preference */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <CursorPreferenceToggle />
              </div>

              {/* Password update */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-mono text-xs font-black uppercase tracking-widest text-primary-blue">
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

      {/* --- PARTICIPANT DIGITAL ID CARD MODAL --- */}
      <AnimatePresence>
        {idModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden ${isDark ? 'bg-[#0E172A] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks" className="h-8 w-auto object-contain" />
                  <div>
                    <h3 className="font-display-heavy text-base uppercase tracking-tight">
                      Official Participant ID
                    </h3>
                    <span className="text-[10px] font-mono text-primary-blue font-bold">
                      teammavericks.kit
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIdModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">PARTICIPANT NAME</span>
                  <span className="font-black text-sm text-zinc-900 dark:text-white">{participantInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">EMAIL</span>
                  <span className="font-bold text-xs text-primary-blue">{participantInfo.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">CONTACT</span>
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">{participantInfo.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">BRANCH / DEPT</span>
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">{participantInfo.branch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">INSTITUTE</span>
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">{participantInfo.college}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">PASS TOKEN</span>
                  <span className="font-mono font-black text-xs text-emerald-400 select-all">{participantInfo.token}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => handleCopy(participantInfo.token, 'Pass Token')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Copy size={13} />
                  <span>Copy Token</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ENTRY PASS POPUP MODAL --- */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-lg w-full rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0E172A] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="text-center mb-6">
                <img
                  src="/Logos/Mavericks_Logo.png"
                  alt="Team Mavericks"
                  className="h-10 w-auto mx-auto mb-3 object-contain"
                />
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
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
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">TOKEN</span>
                    <p className="font-mono text-base font-black text-primary-blue select-all">{selectedPass.registration_token}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">REGISTRATION</span>
                    <p className="text-xs font-black text-emerald-400 uppercase">{selectedPass.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">ATTENDEE</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedPass.full_name}</p>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">EMAIL</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{selectedPass.email}</p>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">EVENT ATTENDANCE</span>
                    <p className={`font-bold ${selectedPass.attended ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedPass.attended ? '✓ Marked Present' : 'Absent (Scan QR at venue)'}
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-[8px] font-bold text-slate-400 uppercase">VENUE</span>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{selectedPass.location || "KIT's CoEK"}</p>
                  </div>
                </div>

                {/* Sub-events Breakdown in Pass Modal */}
                {selectedPass.sub_events?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-mono text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                      REGISTERED SUB-EVENTS &amp; TRACKS ({selectedPass.sub_events.length})
                    </span>
                    <div className="space-y-2.5">
                      {selectedPass.sub_events.map((sub, sIdx) => {
                        const isSubAtt = sub.attendance === 1 || sub.attendance === true || sub.attendance === '1' ||
                          sub.attended === 1 || sub.attended === true || sub.attended === '1';

                        const isMindSaga = sub.is_mind_saga || sub.mind_saga_key || sub.sub_event_name?.toLowerCase().includes('mind') || sub.sub_event_slug?.toLowerCase().includes('mind');
                        const accessKey = sub.mind_saga_key || 'MS-PENDING';
                        const publicLink = `${window.location.origin}/mindsaga`;

                        return (
                          <div
                            key={sIdx}
                            className={`p-3.5 rounded-xl border flex flex-col gap-2.5 text-xs ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                  {sub.sub_event_name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="capitalize">{sub.sub_event_type || 'Track'}</span>
                                  {sub.team_name && (
                                    <span>• Team: <strong className="text-primary-blue">{sub.team_name}</strong></span>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${isSubAtt
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                  }`}>
                                {isSubAtt ? '✓ Attended' : 'Absent'}
                              </span>
                            </div>

                            {/* Mind Saga Key & Arena Launcher inside Modal */}
                            {isMindSaga && (
                              <div className="space-y-2 pt-2 border-t border-indigo-500/20">
                                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50/80 border-indigo-200'
                                  }`}>
                                  <div className="flex items-center gap-2 truncate">
                                    <Key size={13} className={isDark ? 'text-indigo-400 shrink-0' : 'text-indigo-600 shrink-0'} />
                                    <div>
                                      <span className={`text-[8px] font-mono uppercase block leading-none ${isDark ? 'text-slate-400' : 'text-slate-500 font-semibold'}`}>
                                        Unique Candidate Key
                                      </span>
                                      <span className={`font-mono font-bold text-xs select-all ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                        {accessKey}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(accessKey, 'Mind Saga Access Key')}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${isDark ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                        }`}
                                    >
                                      Copy Key
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(publicLink, 'Mind Saga Platform Link')}
                                      className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                        }`}
                                    >
                                      Copy Link
                                    </button>
                                  </div>
                                </div>

                                {isSubAtt ? (
                                  <SpecularButton
                                    size="md"
                                    radius={16}
                                    textColor={isDark ? '#f5f5f5' : '#09090b'}
                                    lineColor={isDark ? '#ffffff' : '#09090b'}
                                    baseColor={isDark ? '#3f3f46' : '#d4d4d8'}
                                    tint={isDark ? '#000000' : '#ffffff'}
                                    tintOpacity={isDark ? 0.4 : 0.8}
                                    className="w-full"
                                    onClick={() => openMindSagaKeyPrompt(selectedPass.event_id, sub.sub_event_id, sub.sub_event_name, accessKey)}
                                  >
                                    <Play size={13} fill={isDark ? '#f5f5f5' : '#09090b'} />
                                    <span>Launch Mind Saga Arena</span>
                                    <ArrowUpRight size={13} />
                                  </SpecularButton>
                                ) : (
                                  <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}>
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Lock size={13} className={isDark ? 'shrink-0 text-amber-400' : 'shrink-0 text-amber-600'} />
                                      <span className={`text-[10px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                                        Attendance required to unlock test link
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPass(null);
                                        setScannerOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition shadow-sm"
                                    >
                                      <ScanLine size={12} />
                                      <span>Scan QR</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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

      {/* --- RETRO SPACE MIND SAGA KEY CHALLENGE MODAL (Uiverse Pinparker) --- */}
      <MindSagaKeyModal
        isOpen={mindSagaModal.isOpen}
        onClose={() => setMindSagaModal({ isOpen: false, eventId: null, subEventId: null, subEventName: '', defaultKey: '' })}
        onSubmit={(key, email) => handleVerifyMindSagaKey(key, email)}
        initialEmail={data.user?.email || user?.email || ''}
        defaultKey={mindSagaModal.defaultKey}
        subEventName={mindSagaModal.subEventName || 'MIND SAGA'}
        loading={verifyingKey}
      />

      {/* --- QR SCANNER MODAL --- */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanAttendance}
        title="Scan Attendance QR Code"
        description="Point your device camera at the Event or Sub-Event Attendance QR code to mark your attendance."
      />

      {/* --- MOBILE SCROLL SLIDER HELPER --- */}
      <MobileScrollSlider isDark={isDark} />

      <Footer />
    </div>
  );
};

export default ParticipantDashboard;
