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
  Building2,
  LogIn
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';
import ElectricBorder from '../../components/ui/ElectricBorder';
import InteractiveBackground from '../../components/ui/InteractiveBackground';
import TechText from '../../components/ui/TechText';
import StrokeText from '../../components/ui/StrokeText';

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

  const searchAndFilterControls = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-3 pt-2 w-full"
    >
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events by name, location..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue transition shadow-sm bg-[#0E172A]/90 border-[#1E293B] text-white placeholder:text-slate-400 backdrop-blur-md"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Mode:</span>
        <div className="flex items-center gap-1.5 p-1 border rounded-2xl bg-[#0E172A]/90 border-[#1E293B] backdrop-blur-md">
          {['all', 'offline', 'online', 'hybrid'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider capitalize transition cursor-pointer ${selectedMode === mode
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative selection:bg-primary-blue selection:text-white flex flex-col justify-between overflow-x-hidden ${isDark ? 'bg-[#07111f] text-slate-100' : 'bg-[#FAFAF9] text-slate-900'
      }`}>
      {/* Interactive Background & Cursor Effects (preview (1).html) */}
      <InteractiveBackground />

      <div className="relative z-10">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors bg-[#070C18]/85 border-[#1E293B]">
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/Logos/Mavericks_Logo.png"
                alt="Team Mavericks Logo"
                className="h-9 w-auto object-contain select-none group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-display-heavy text-base sm:text-lg tracking-tight uppercase leading-none text-white">
                  Team Mavericks
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-blue font-bold mt-1">
                  Events &amp; Symposiums
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className="hidden sm:flex p-2 rounded-xl border transition cursor-pointer border-slate-700/80 bg-slate-900/60 text-yellow-400 hover:bg-slate-800"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <Link
                to="/user-login"
                title="Participant Login"
                className="inline-flex items-center justify-center gap-1.5 p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white backdrop-blur-sm"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Participant Login</span>
              </Link>

              <button
                onClick={() => {
                  const el = document.getElementById('events-grid');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                title="Register Now"
                className="inline-flex items-center justify-center gap-1.5 p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold bg-primary-blue text-white hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition cursor-pointer"
              >
                <Calendar size={15} className="sm:hidden" />
                <span className="hidden sm:inline">Register Now</span>
                <ArrowRight size={13} className="hidden sm:inline" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section (Side text + DitherVeil on right) */}
        <section className="px-2.5 sm:px-8 md:px-10 pt-10 md:pt-16 pb-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">

            {/* Left Column - Large Editorial Headline & Search */}
            <div className="lg:col-span-6 space-y-6">

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display-heavy uppercase tracking-tight text-zinc-900 dark:text-white"
              >
                <div className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] uppercase leading-[0.9] tracking-tight">
                  EXPLORE OUR
                </div>
                <div className="w-full h-[64px] sm:h-[80px] md:h-[96px] lg:h-[110px] relative -ml-1 sm:-ml-1.5 -mt-1 sm:-mt-2">
                  <TechText
                    text="FLAGSHIP"
                    fontWeight={700}
                    fontSize={92}
                    reveal="letter"
                    dashLength={4}
                    dashGap={2}
                    specks={15}
                    fontFamily=""
                    color={isDark ? '#ffffff' : '#09090b'}
                    accentColor={isDark ? '#ffffff' : '#09090b'}
                    letterSpacing={-0.03}
                    reach={200}
                    softness={0.7}
                    strokeWidth={1.5}
                    speed={1}
                    lineStyle="dashed"
                    selection
                    labels
                    draggable
                    sweep
                    align="left"
                    paddingLeft={6}
                  />
                </div>
                <div className="w-full h-[64px] sm:h-[80px] md:h-[96px] lg:h-[110px] relative -ml-1 sm:-ml-1.5 -mt-2 sm:-mt-3.5">
                  <TechText
                    text="EVENTS"
                    fontWeight={700}
                    fontSize={92}
                    reveal="letter"
                    dashLength={4}
                    dashGap={2}
                    specks={15}
                    fontFamily=""
                    color={isDark ? '#ffffff' : '#09090b'}
                    accentColor={isDark ? '#ffffff' : '#09090b'}
                    letterSpacing={-0.03}
                    reach={200}
                    softness={0.7}
                    strokeWidth={1.5}
                    speed={1}
                    lineStyle="dashed"
                    selection
                    labels
                    draggable
                    sweep
                    align="left"
                    paddingLeft={6}
                  />
                </div>
              </motion.h1>

              <div className="space-y-3 pt-1 max-w-xl">
                <StrokeText
                  text="Team Mavericks • Student Organization"
                  strokeColor={isDark ? '#60A5FA' : '#2563EB'}
                  fillColor={isDark ? '#93C5FD' : '#1D4ED8'}
                  strokeWidth={1}
                  drawDuration={1.6}
                  fillDelay={0.2}
                  stagger={0.03}
                  ease="power2.out"
                  trigger="mount"
                  fillMode="wipe"
                  fontSize={16}
                  fontWeight={800}
                  letterSpacing={1.5}
                  uppercase={true}
                  align="left"
                  fontFamily="'DM Mono', 'Space Grotesk', monospace"
                  className="font-mono-tag"
                />
                <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Register for national symposiums, hackathons, workshops, and exhibitions hosted by Team Mavericks at KIT's College of Engineering, Kolhapur.
                </p>
              </div>

              {/* Desktop Search & Mode Filters */}
              <div className="hidden lg:block">
                {searchAndFilterControls}
              </div>
            </div>

            {/* Right Column - Official Team Mavericks Logo (Static) */}
            <div className="lg:col-span-6 flex flex-col justify-center items-center relative w-full select-none py-2 sm:py-4">
              <div className={`absolute -inset-4 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-indigo-600/25' : 'bg-blue-100/30'
                }`} />

              <div className="relative z-10 flex items-center justify-center p-2 sm:p-4">
                <img
                  src="/Logos/Mavericks_Logo.png"
                  alt="Team Mavericks Official Logo"
                  className="w-full max-w-[320px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[460px] h-auto object-contain transition-transform duration-500 hover:scale-[1.02]"
                  style={{
                    filter: 'drop-shadow(0 0 35px rgba(37, 99, 235, 0.45)) drop-shadow(0 0 12px rgba(56, 189, 248, 0.3))'
                  }}
                  draggable="false"
                />
              </div>

              {/* Mobile Search & Mode Filters (below idol) */}
              <div className="block lg:hidden w-full pt-4">
                {searchAndFilterControls}
              </div>
            </div>

          </div>
        </section>

        {/* Live Active Events Grid */}
        <section id="events-grid" className="px-2.5 sm:px-6 max-w-7xl mx-auto pb-16">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
            <div>
              <p className="font-mono-tag text-xs font-black uppercase tracking-widest text-blue-400 mb-1">
                REGISTRATIONS OPEN
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display-heavy uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
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
                        className="group flex flex-col h-full rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-2xl bg-[#0E172A]/90 border-[#1E293B]"
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
                            <h3 className="text-xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                              {ev.name}
                            </h3>
                            {ev.description && (
                              <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                {ev.description}
                              </p>
                            )}

                            <div className="mt-5 space-y-2 pt-4 border-t border-slate-800">
                              {ev.start_date && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                                  <Calendar size={14} className="text-blue-400 shrink-0" />
                                  <span>{formatDate(ev.start_date)}</span>
                                </div>
                              )}
                              {ev.location && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                                  <MapPin size={14} className="text-rose-400 shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </div>
                              )}
                              {ev.organizer_name && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                                  <Users size={14} className="text-indigo-400 shrink-0" />
                                  <span className="truncate">By {ev.organizer_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-6 pt-4">
                            <Link
                              to={`/events/${ev.slug}`}
                              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition group/btn cursor-pointer"
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
        <section id="flagship-events" className="py-24 px-5 sm:px-8 md:px-14 border-t bg-[#070C18]/60 border-[#1E293B]">
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
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">
                WHAT WE BUILD &amp; RUN
              </p>
              <h2 className="font-display-heavy text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] mb-3">
                FLAGSHIP EVENTS.
              </h2>
              <p className="max-w-lg mx-auto text-xs sm:text-sm leading-relaxed text-[#D1DCEB]">
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
        <section className="py-16 sm:py-20 px-2.5 sm:px-6 border-t bg-[#070C18]/40 border-[#1E293B]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">
                FREQUENTLY ASKED QUESTIONS
              </p>
              <h2 className="font-display-heavy text-3xl sm:text-4xl uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                Everything you need to know.
              </h2>
            </div>

            <div className="space-y-3">
              {EVENT_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="border rounded-2xl overflow-hidden transition-all duration-200 bg-[#0E172A]/80 border-[#1E293B]"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-white cursor-pointer hover:text-blue-300 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-blue-400' : ''}`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#D1DCEB] leading-relaxed border-t border-slate-800">
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
              className="relative z-10 w-full max-w-xl rounded-3xl overflow-hidden border shadow-2xl p-6 sm:p-8 bg-[#0E172A] border-[#1E293B] text-white"
            >
              <button
                onClick={() => setSelectedEventModal(null)}
                className="absolute top-5 right-5 p-2 rounded-full transition cursor-pointer z-20 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              {selectedEventModal.img && (
                <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden mb-5 border border-slate-800 bg-slate-900">
                  <img src={selectedEventModal.img} alt={selectedEventModal.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono-tag text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {selectedEventModal.tag}
                </span>
                <span className="font-mono-tag text-xs font-bold text-slate-400">{selectedEventModal.number}</span>
              </div>

              <h3 className="font-display-heavy text-3xl uppercase tracking-tight mb-1 text-white">
                {selectedEventModal.name}
              </h3>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">
                {selectedEventModal.subtitle}
              </p>

              <p className="text-xs sm:text-sm leading-relaxed mb-6 text-[#D1DCEB]">
                {selectedEventModal.fullDesc || selectedEventModal.desc}
              </p>

              {selectedEventModal.highlights && (
                <div className="mb-6 space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Key Highlights</h4>
                  <ul className="space-y-1.5 text-xs text-[#D1DCEB]">
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
