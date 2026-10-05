import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Search,
  CheckCircle2,
  Coins,
  Globe,
  Tag,
  Share2,
  Sun,
  Moon,
  ChevronDown,
  X,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';
import DitherVeil from '../../components/ui/DitherVeil';
import ElectricBorder from '../../components/ui/ElectricBorder';

export const FLAGSHIP_EVENTS_DATA = [
  {
    id: 'bodhantra',
    number: '01',
    name: 'BODHANTRA',
    subtitle: 'Five-Day College Event',
    desc: 'A five-day college event for first-year students featuring technical and non-technical sessions, interactive discussions, team-building challenges, and creative competitions.',
    fullDesc: 'Bodhantra is Team Mavericks flagship induction and symposium event designed specifically for first-year engineering students. Over 5 immersive days, participants undergo intensive workshops in cutting-edge tech stacks, hands-on lab sessions, mock hackathons, and high-energy leadership challenges.',
    highlights: [
      'Hands-on technical workshops in Web Development, AI/ML, and Cloud',
      'Team-building challenges and creative brainstorm hackathons',
      'One-on-one mentorship from senior core team leads and alumni',
      'Grand finale awards ceremony and certificates for all participants'
    ],
    tag: 'LEARNING',
    slug: 'bodhantra',
    bg: 'from-blue-950 to-[#070C18]',
    img: '/event-assets/bodhantra.jpeg'
  },
  {
    id: 'invicta',
    number: '02',
    name: 'INVICTA',
    subtitle: 'Workshop & Hackathon Series',
    desc: 'A workshop series covering technical and non-technical topics including web development, ethical hacking, soft skills, mental health, and more.',
    fullDesc: 'Invicta brings together top industry professionals and student innovators for comprehensive multi-track bootcamps. From deep-dive cybersecurity labs to UI/UX product design masterclasses, Invicta empowers students to build real-world products within 48-hour sprint cycles.',
    highlights: [
      'Masterclasses by industry experts & Google/Microsoft student leads',
      'Live CTF (Capture the Flag) and Ethical Hacking challenges',
      'UI/UX design sprints & rapid prototyping showcase',
      'Cash prizes, exclusive merchandise, and internship referral opportunities'
    ],
    tag: 'WORKSHOPS',
    slug: 'invicta',
    bg: 'from-indigo-950 to-[#070C18]',
    img: '/event-assets/invicta.png'
  },
  {
    id: 'verbafest',
    number: '03',
    name: 'VERBAFEST',
    subtitle: 'Placement Preparation Event',
    desc: 'A one-day placement preparation event featuring Group Discussions, debates, and mock interviews to build communication skills, confidence, and recruitment readiness.',
    fullDesc: 'VerbaFest is an intensive corporate readiness boot camp simulated like top-tier campus recruitment drives. Engineering students face rigorous Aptitude Tests, Technical Group Discussions, Case Study Analysis, and HR Mock Interviews conducted by alumni working at tier-1 MNCs.',
    highlights: [
      'Simulated GD rounds with real-time feedback from alumni panellists',
      'One-on-one technical mock interviews for TCS, Infosys, Capgemini & product firms',
      'Resume reviews, LinkedIn profile audit, and portfolio critique',
      'Stress interview mastery and public speaking masterclasses'
    ],
    tag: 'PLACEMENT',
    slug: 'varba-fest',
    bg: 'from-slate-800 to-[#070C18]',
    img: '/event-assets/verbafest.JPG'
  },
  {
    id: 'school_visit',
    number: '04',
    name: 'SCHOOL VISIT',
    subtitle: 'Community Outreach',
    desc: 'A school outreach initiative in rural areas of Kolhapur featuring technology demonstrations, workshops, career guidance, and sessions on emerging technologies.',
    fullDesc: 'As part of Team Mavericks social responsibility mission, School Visit brings hands-on STEM education and robotics demonstrations to underprivileged rural schools in the Kolhapur district, inspiring the next generation of scientists, engineers, and creators.',
    highlights: [
      'Interactive science & robotics demonstrations for 8th-10th grade students',
      'Digital literacy workshops and computer programming basics',
      'Career guidance and engineering awareness sessions',
      'Donation of books, educational kits, and tech resources'
    ],
    tag: 'COMMUNITY',
    slug: 'school-visit',
    bg: 'from-blue-900 to-[#070C18]',
    img: '/event-assets/school_visit.jpg'
  }
];

const EVENT_FAQS = [
  {
    q: "Who is eligible to participate in Team Mavericks events?",
    a: "Our events are open to engineering, polytechnic, and degree students from KIT College of Engineering as well as colleges across Maharashtra and India. Specific eligibility varies by event."
  },
  {
    q: "How will I receive my event registration confirmation & entry pass?",
    a: "Upon completing the online registration form, you will receive an instant digital confirmation pass with a unique Registration Token. You can print or save this token for on-venue verification."
  },
  {
    q: "Are the events free or paid?",
    a: "Many of our flagship symposiums and community events are completely free! For specialized bootcamps or paid hackathons, a nominal registration fee is charged which covers kits, merchandise, and refreshments."
  },
  {
    q: "Will participants receive certificates?",
    a: "Yes! All verified participants receive an official Certificate of Participation from Team Mavericks & KIT College of Engineering, Kolhapur."
  }
];

const PublicEventsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

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

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = selectedMode === 'all' || ev.mode === selectedMode;
    return matchesSearch && matchesMode;
  });

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative selection:bg-primary-blue selection:text-white flex flex-col justify-between overflow-x-hidden ${isDark ? 'bg-[#070C18] text-slate-100' : 'bg-[#FAFAF9] text-slate-900'
      }`}>
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Navigation Bar */}
        <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#070C18]/80 border-[#1E293B]' : 'bg-white/80 border-slate-200'
          }`}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/Logos/Mavericks_Logo.png"
                alt="Team Mavericks Logo"
                className="h-9 w-auto object-contain select-none group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-display-heavy text-base sm:text-lg tracking-tight uppercase leading-none text-zinc-900 dark:text-white">
                  Team Mavericks
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-blue font-bold mt-1">
                  Events &amp; Symposiums
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2.5 sm:gap-3">
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

              <Link
                to="/user-login"
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>Participant Login</span>
              </Link>

              <button
                onClick={() => {
                  const el = document.getElementById('events-grid');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-primary-blue text-white hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition cursor-pointer"
              >
                <span>Register Now</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section (Side text + DitherVeil on right) */}
        <section className="px-5 sm:px-8 md:px-10 pt-10 md:pt-16 pb-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">

            {/* Left Column - Large Editorial Headline & Search */}
            <div className="lg:col-span-6 space-y-6">

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display-heavy text-5xl sm:text-6xl md:text-7xl lg:text-[76px] uppercase leading-[0.9] tracking-tight text-zinc-900 dark:text-white"
              >
                EXPLORE OUR <br />
                <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  FLAGSHIP EVENTS.
                </span>
              </motion.h1>

              <div className="space-y-3 pt-1 max-w-xl">
                <p className="font-mono-tag text-xs font-black tracking-widest uppercase text-blue-500">
                  Team Mavericks • Student Organization
                </p>
                <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Register for national symposiums, hackathons, workshops, and exhibitions hosted by Team Mavericks at KIT's College of Engineering, Kolhapur.
                </p>
              </div>

              {/* Search & Mode Filters */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 pt-2"
              >
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events by name, location..."
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue transition shadow-sm ${isDark ? 'bg-[#0E172A] border-[#1E293B] text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      }`}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Mode:</span>
                  <div className={`flex items-center gap-1.5 p-1 border rounded-2xl ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-slate-100 border-slate-200'
                    }`}>
                    {['all', 'offline', 'online', 'hybrid'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider capitalize transition cursor-pointer ${selectedMode === mode
                            ? isDark
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-blue-700 shadow-sm border border-slate-200'
                            : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - DitherVeil Visual Animation (All Events Landing) */}
            <div className="lg:col-span-6 flex justify-center items-center relative w-full select-none">
              <div className={`absolute -inset-4 rounded-full blur-3xl opacity-20 pointer-events-none ${isDark ? 'bg-indigo-600/30' : 'bg-blue-100/30'
                }`} />

              <div
                className="w-full h-[450px] sm:h-[520px] md:h-[580px] relative overflow-hidden"
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 40%, rgba(0,0,0,0.7) 65%, transparent 100%)',
                  maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 40%, rgba(0,0,0,0.7) 65%, transparent 100%)',
                }}
              >
                <DitherVeil
                  src="https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1400&auto=format&fit=crop"
                  pattern="floyd"
                  pixelSize={1.6}
                  inkColor={isDark ? "#070C18" : "#FFFFFF"}
                  paperColor={isDark ? "#93C5FD" : "#000000"}
                  revealRadius={220}
                  softness={0.65}
                  linger={1.2}
                  fit="contain"
                  rimColor={isDark ? "#a78bfa" : "#3b82f6"}
                  palette="duotone"
                  levels={2}
                  contrast={1.1}
                  brightness={0.10}
                  rim={0}
                  reverse={false}
                  wander={false}
                  clickBurst
                />

                <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${isDark
                    ? 'bg-gradient-to-t from-[#070C18] via-transparent to-[#070C18]/60'
                    : 'bg-gradient-to-t from-[#FAFAF9] via-transparent to-transparent'
                  }`} />
              </div>
            </div>

          </div>
        </section>

        {/* Live Active Events Grid */}
        <section id="events-grid" className="px-6 max-w-7xl mx-auto pb-16">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-mono-tag text-[10px] font-black uppercase tracking-widest text-primary-blue">
                REGISTRATIONS OPEN
              </p>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                Upcoming &amp; Live Events
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {filteredEvents.length} Active {filteredEvents.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <MajorLoader />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className={`py-16 text-center rounded-3xl border max-w-md mx-auto p-8 ${isDark ? 'bg-[#0E172A]/60 border-[#1E293B]' : 'bg-white border-slate-200'
              }`}>
              <Calendar size={48} className="mx-auto text-slate-400 mb-4 opacity-50" />
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">No active registrations found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? 'Try changing your search keywords or filter.' : 'Check back soon or explore our flagship events highlights below!'}
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
                    className="h-full flex flex-col"
                  >
                    <ElectricBorder
                      color={isDark ? '#38bdf8' : '#1e40af'}
                      speed={0.8}
                      chaos={0.10}
                      borderRadius={24}
                      className="w-full h-full flex flex-col"
                    >
                      <div
                        className={`group flex flex-col h-full rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-2xl ${
                          isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Banner / Cover */}
                        <div className="relative h-48 w-full bg-gradient-to-br from-zinc-800 to-zinc-950 overflow-hidden shrink-0">
                          {ev.cover_image_url || ev.banner_url ? (
                            <img
                              src={ev.cover_image_url || ev.banner_url}
                              alt={ev.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-tr from-blue-900/40 via-indigo-950/40 to-zinc-900">
                              <span className="font-black text-2xl tracking-tighter text-white/30 text-center uppercase">
                                {ev.name}
                              </span>
                            </div>
                          )}

                          {/* Badges */}
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
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight group-hover:text-primary-blue transition-colors">
                              {ev.name}
                            </h3>
                            {ev.description && (
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {ev.description}
                              </p>
                            )}

                            <div className="mt-5 space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                              {ev.start_date && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                  <Calendar size={14} className="text-primary-blue shrink-0" />
                                  <span>{formatDate(ev.start_date)}</span>
                                </div>
                              )}
                              {ev.location && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                  <MapPin size={14} className="text-rose-500 shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </div>
                              )}
                              {ev.organizer_name && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                  <Users size={14} className="text-indigo-400 shrink-0" />
                                  <span className="truncate">By {ev.organizer_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-6 pt-4">
                            <Link
                              to={`/events/${ev.slug}`}
                              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-md transition group/btn cursor-pointer"
                            >
                              <span>Register Now</span>
                              <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </ElectricBorder>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* --- FLAGSHIP EVENTS HIGHLIGHTS SECTION (Exactly matching recruitment page) --- */}
        {/* --- OUR FLAGSHIP EVENTS (Exact Recruitment Cards with Interactive Hover Reveal) --- */}
        <section id="flagship-events" className={`py-24 px-5 sm:px-8 md:px-14 border-t ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-white border-slate-200'
          }`}>
          <style>{`
            .event-card {
              position: relative;
              overflow: hidden;
              cursor: pointer;
            }
            .event-card .event-img {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 1;
              transform: scale(1);
              transition: transform 0.55s cubic-bezier(0.4,0,0.2,1), filter 0.45s ease;
              z-index: 0;
              filter: brightness(1) saturate(1.05);
            }
            .event-card:hover .event-img {
              transform: scale(1.06);
              filter: brightness(0.7) saturate(1.1);
            }
            .event-card .event-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(
                to top,
                rgba(4,10,30,0.85) 0%,
                rgba(4,10,30,0.30) 40%,
                transparent 70%
              );
              opacity: 0.35;
              transition: opacity 0.45s ease, background 0.45s ease;
              z-index: 1;
            }
            .event-card:hover .event-overlay {
              opacity: 1;
              background: linear-gradient(
                to top,
                rgba(4,10,30,0.95) 0%,
                rgba(10,20,60,0.78) 50%,
                rgba(5,15,45,0.60) 100%
              );
            }
            .event-card .event-content {
              position: relative;
              z-index: 2;
              transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
            }
            .event-card:hover .event-content {
              transform: translateY(-6px);
            }
            .event-card .event-tag {
              transition: background 0.3s ease, color 0.3s ease;
            }
            .event-card:hover .event-tag {
              background: #2563EB;
              color: #fff;
            }
            .event-card .event-arrow {
              opacity: 0;
              transform: translateX(-8px);
              transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .event-card:hover .event-arrow {
              opacity: 1;
              transform: translateX(0);
            }
          `}</style>

          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-primary-blue mb-2">
                  WHAT WE BUILD &amp; RUN
                </p>
                <h2 className="font-display-heavy text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-zinc-900 dark:text-white">
                  FLAGSHIP <br />
                  EVENTS.
                </h2>
              </div>
              <p className={`max-w-sm text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                From multi-day college symposiums to placement boot camps and rural tech outreaches — Team Mavericks runs it all.
              </p>
            </div>

            {/* 4 Interactive Event Cards matching Recruitment Page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FLAGSHIP_EVENTS_DATA.map((ev) => (
                <div
                  key={ev.number}
                  onClick={() => setSelectedEventModal(ev)}
                  className={`event-card min-h-[360px] sm:min-h-[400px] p-6 sm:p-7 border flex flex-col justify-between rounded-2xl bg-gradient-to-b ${ev.bg} ${
                    isDark ? 'border-[#1E293B]' : 'border-slate-800'
                  } text-white group shadow-lg`}
                >
                  {/* Background image (clear on hover) */}
                  {ev.img && <img src={ev.img} alt={ev.name} className="event-img" />}

                  {/* Hover overlay that fades to reveal clear photo */}
                  <div className="event-overlay" />

                  {/* Content */}
                  <div className="event-content flex flex-col justify-between h-full gap-6">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <span className={`event-tag font-mono-tag text-[10px] font-black tracking-widest uppercase px-2.5 py-1 border rounded-lg ${
                        isDark ? 'border-blue-500/50 text-blue-300 bg-blue-500/10' : 'border-blue-400 text-blue-300 bg-blue-800/30'
                      }`}>
                        {ev.tag}
                      </span>
                      <span className="font-mono-tag text-xs font-bold text-slate-400">{ev.number}</span>
                    </div>

                    {/* Bottom text block */}
                    <div className="space-y-2">
                      <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-blue-400">
                        {ev.subtitle}
                      </p>
                      <h3 className="font-display-heavy text-3xl sm:text-4xl uppercase leading-[0.9] tracking-tight text-white">
                        {ev.name}
                      </h3>
                      <p className="text-[11px] leading-relaxed text-slate-300 pt-1 line-clamp-3">
                        {ev.desc}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                          className="flex items-center gap-1.5 font-mono-tag text-[10px] font-black uppercase tracking-wider text-blue-400 event-arrow cursor-pointer hover:text-blue-300 transition-colors"
                        >
                          <ArrowUpRight size={12} />
                          <span>Learn More</span>
                        </button>
                        <Link
                          to={`/events/${ev.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl bg-white text-zinc-900 text-[10px] font-black uppercase tracking-wider hover:bg-primary-blue hover:text-white transition shadow-sm"
                        >
                          Register
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className={`py-20 px-6 border-t ${isDark ? 'bg-[#0E172A]/40 border-[#1E293B]' : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-primary-blue mb-2">
                FREQUENTLY ASKED QUESTIONS
              </p>
              <h2 className="font-display-heavy text-3xl sm:text-4xl uppercase tracking-tight text-zinc-900 dark:text-white">
                Everything you need to know.
              </h2>
            </div>

            <div className="space-y-3">
              {EVENT_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
                    }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-zinc-900 dark:text-white cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-primary-blue' : ''}`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Learn More Modal */}
      <AnimatePresence>
        {selectedEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEventModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative z-10 w-full max-w-xl rounded-3xl overflow-hidden border shadow-2xl p-6 sm:p-8 ${isDark ? 'bg-[#0E172A] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <button
                onClick={() => setSelectedEventModal(null)}
                className={`absolute top-5 right-5 p-2 rounded-full transition cursor-pointer z-20 ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={18} />
              </button>

              {selectedEventModal.img && (
                <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden mb-5 border border-slate-200 dark:border-slate-800 bg-slate-900">
                  <img src={selectedEventModal.img} alt={selectedEventModal.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className={`font-mono-tag text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                  isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {selectedEventModal.tag}
                </span>
                <span className="font-mono-tag text-xs font-bold text-slate-400">{selectedEventModal.number}</span>
              </div>

              <h3 className="font-display-heavy text-3xl uppercase tracking-tight mb-1 text-zinc-900 dark:text-white">
                {selectedEventModal.name}
              </h3>
              <p className="text-xs font-bold text-primary-blue uppercase tracking-wider mb-4">
                {selectedEventModal.subtitle}
              </p>

              <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {selectedEventModal.fullDesc || selectedEventModal.desc}
              </p>

              {selectedEventModal.highlights && (
                <div className="mb-6 space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Key Highlights</h4>
                  <ul className={`space-y-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {selectedEventModal.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Link
                  to={`/events/${selectedEventModal.slug}`}
                  onClick={() => setSelectedEventModal(null)}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition text-center shadow-md shadow-primary-blue/20"
                >
                  Register for this Event
                </Link>
                <button
                  onClick={() => setSelectedEventModal(null)}
                  className={`py-3.5 px-5 rounded-xl border text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
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

export default PublicEventsPage;
