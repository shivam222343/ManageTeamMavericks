import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Coins,
  Globe,
  Tag,
  Share2,
  ExternalLink
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';
import DitherVeil from '../../components/ui/DitherVeil';

const PublicEventsPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/events/public');
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load public events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = selectedMode === 'all' || ev.mode === selectedMode;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300 relative selection:bg-primary-blue selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-blue/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center p-2 shadow-md group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/Logos/Mavericks_Logo.png"
                  alt="Team Mavericks"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-logo font-black text-sm tracking-tight leading-none text-zinc-900 dark:text-zinc-50">
                  Team Mavericks
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-blue font-bold mt-0.5">
                  Events & Portals
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                to="/teammavericks/recruitment-2026"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                Recruitments
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm transition"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-12 px-6 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 text-primary-blue dark:text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-6 border border-primary-blue/20 shadow-sm"
          >
            <Sparkles size={14} className="animate-pulse" />
            Discover & Participate
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900 dark:text-white max-w-3xl mx-auto leading-tight"
          >
            Explore Team Mavericks <br />
            <span className="bg-gradient-to-r from-primary-blue via-indigo-500 to-cyan-400 bg-clip-text text-transparent">
              Flagship Events
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Register for national symposiums, hackathons, workshops, and exhibitions hosted by Team Mavericks at KIT's College of Engineering.
          </motion.p>

          {/* Search & Mode Filters */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 items-center"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by name, location..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue backdrop-blur-md transition shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl shrink-0">
              {['all', 'offline', 'online', 'hybrid'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider capitalize transition cursor-pointer ${
                    selectedMode === mode
                      ? 'bg-white dark:bg-zinc-800 text-primary-blue dark:text-blue-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Events Grid */}
        <section className="px-6 max-w-7xl mx-auto pb-24">
          {loading ? (
            <div className="py-24 flex justify-center">
              <MajorLoader />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-24 text-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 max-w-md mx-auto p-8">
              <Calendar size={48} className="mx-auto text-zinc-400 mb-4 opacity-50" />
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">No active events found</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {searchQuery ? 'Try changing your search keywords or filter.' : 'Check back later for upcoming events and symposiums!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((ev, idx) => {
                const isPaid = ev.payment_required && parseFloat(ev.registration_fee || 0) > 0;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex flex-col bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden hover:border-primary-blue/30 dark:hover:border-primary-blue/30 hover:shadow-2xl hover:shadow-primary-blue/5 transition-all duration-300 relative"
                  >
                    {/* Cover / Banner */}
                    <div className="relative h-48 w-full bg-gradient-to-br from-zinc-800 to-zinc-950 overflow-hidden shrink-0">
                      {ev.banner_url || ev.cover_image_url ? (
                        <img
                          src={ev.cover_image_url || ev.banner_url}
                          alt={ev.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-tr from-blue-900/40 via-indigo-950/40 to-zinc-900/60">
                          <span className="font-black text-2xl tracking-tighter text-white/30 text-center uppercase">
                            {ev.name}
                          </span>
                        </div>
                      )}

                      {/* Mode Badge */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10">
                          {ev.mode}
                        </span>
                        {isPaid ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-400/20">
                            ₹{parseFloat(ev.registration_fee).toFixed(0)}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/80 backdrop-blur-md text-white border border-blue-400/20">
                            Free
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Reg Open
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight group-hover:text-primary-blue transition-colors">
                          {ev.name}
                        </h2>
                        {ev.description && (
                          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="mt-5 space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                          {ev.start_date && (
                            <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                              <Calendar size={14} className="text-primary-blue shrink-0" />
                              <span>{formatDate(ev.start_date)} {formatTime(ev.start_date) ? `• ${formatTime(ev.start_date)}` : ''}</span>
                            </div>
                          )}
                          {ev.location && (
                            <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                              <MapPin size={14} className="text-rose-500 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}
                          {ev.organizer_name && (
                            <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                              <Users size={14} className="text-indigo-400 shrink-0" />
                              <span className="truncate">Organized by {ev.organizer_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-6 pt-4">
                        <Link
                          to={`/events/${ev.slug}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-md hover:shadow-lg transition duration-200 group/btn cursor-pointer"
                        >
                          <span>Register Now</span>
                          <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default PublicEventsPage;
