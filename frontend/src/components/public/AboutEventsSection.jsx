import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Sparkles, Code, Palette, Megaphone, CheckCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EVENTS_DATA = [
  {
    id: 'bodhantra',
    number: '01',
    title: 'BODHANTRA',
    tagline: 'LEARN WITH FUN',
    description: 'A 5-day induction and engagement event introducing first-year students to college life through activities, creativity, learning, and fun.',
    detailedDescription: 'Bodhantra is the official flagship induction program of Team Mavericks. Designed exclusively for first-year students, it bridges the gap between high school and college life. Spanning over five immersive days, it features a series of interactive icebreakers, creative workshops, team challenges, and talent showcases that help freshmen integrate into the campus ecosystem.',
    objectives: ['Introduce first-year students to college culture', 'Promote cross-department collaboration', 'Identify and nurture raw talent early'],
    activities: ['Creative ice-breaking sessions', 'Campus scavenger hunts', 'Interactive peer discussions', 'Closing cultural night'],
    highlights: ['120+ freshers welcomed annually', 'Inter-departmental trophy', 'Mentorship from seniors'],
    duration: '5 Days',
    audience: 'First-Year Students (Freshmen)',
    benefits: ['Accelerated transition to college', 'Direct networking with seniors', 'Enhancement of soft skills'],
    accentColor: 'from-purple-500 via-pink-500 to-red-500',
    borderColor: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    textColor: 'text-purple-400',
    bgGradient: 'from-purple-950/80 to-zinc-950/90',
    image: '/events/bodhantra.jpeg',
    icon: Sparkles,
    gallery: [
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&q=80',
      'https://images.unsplash.com/photo-1523580494863-6f30312245d5?w=400&q=80',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80'
    ]
  },
  {
    id: 'invicta',
    number: '02',
    title: 'INVICTA',
    tagline: 'Where Technology Meets Innovation',
    description: 'Technical workshops, competitions, and innovation challenges designed to enhance practical skills and problem-solving.',
    detailedDescription: 'Invicta is our flagship technical symposium designed to challenge and elevate students\' engineering capabilities. By combining cutting-edge tech workshops with high-stakes competitions (such as hackathons and design challenges), Invicta pushes participants to apply classroom theory to real-world problems.',
    objectives: ['Foster a culture of practical engineering and design', 'Bridge industry-academia skill gaps', 'Promote open-source contribution and innovation'],
    activities: ['24-hour rapid prototyping hackathon', 'Expert-led AI/ML workshops', 'UI/UX design challenge', 'Project exhibitions'],
    highlights: ['Hands-on training by industry experts', 'Cash prizes for top innovators', 'Direct recruitment opportunities'],
    duration: '3 Days',
    audience: 'All Engineering & Tech Students',
    benefits: ['Portfolio-ready projects', 'Interaction with tech leaders', 'Official participation certificates'],
    accentColor: 'from-blue-500 via-cyan-500 to-teal-500',
    borderColor: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    textColor: 'text-blue-400',
    bgGradient: 'from-blue-950/80 to-zinc-950/90',
    image: '/events/invicta.png',
    icon: Code,
    gallery: [
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=80',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80'
    ]
  },
  {
    id: 'verbafest',
    number: '03',
    title: 'VERBAFEST',
    tagline: 'Speak. Debate. Elevate.',
    description: 'Communication-focused event featuring debates, public speaking, discussions, and personality development.',
    detailedDescription: 'Verbafest is a dynamic platform for oral expression, argumentative debate, and leadership training. Aimed at cultivating persuasive communication skills, it challenges students through mock press conferences, structured debates, and public speaking modules, preparing them for corporate leadership.',
    objectives: ['Build stage confidence and reduce public speaking anxiety', 'Cultivate critical thinking and logical reasoning', 'Enhance overall professional communication standard'],
    activities: ['British Parliamentary style debate', 'Impromptu public speaking showdown', 'Corporate interview simulations', 'Panel discussions on current affairs'],
    highlights: ['Eminent guest speakers & judges', 'Mock UN debate format', 'Interactive feedback loops'],
    duration: '2 Days',
    audience: 'Aspiring Leaders & Communicators',
    benefits: ['Immensely improved confidence', 'Better preparation for placements', 'Networking with debate enthusiasts'],
    accentColor: 'from-orange-500 via-red-500 to-pink-500',
    borderColor: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]',
    textColor: 'text-orange-400',
    bgGradient: 'from-orange-950/80 to-zinc-950/90',
    image: '/events/verbafest.JPG',
    icon: Megaphone,
    gallery: [
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=80',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80'
    ]
  },
  {
    id: 'school-visit',
    number: '04',
    title: 'SCHOOL VISIT',
    tagline: 'Inspiring the Next Generation',
    description: 'Educational outreach initiative inspiring school students through interactive sessions, demonstrations, and career guidance.',
    detailedDescription: 'Our School Visit program is a social responsibility initiative where Team Mavericks visits local schools to inspire younger students towards STEM fields and creative arts. Through live science demonstrations, coding sessions, and interactive career mentorship, we plant the seeds of curiosity and innovation.',
    objectives: ['Deliver access to hands-on science and tech experiments', 'Offer career guidance and personal mentorship', 'Give back to the local community'],
    activities: ['Live robotics and physics demonstrations', 'Introductory coding workshops', 'Interactive games and quizzes', 'Mentorship and Q&A sessions'],
    highlights: ['10+ rural and municipal schools reached', 'Over 1500 school children inspired', 'Highly rewarding volunteer experience'],
    duration: 'Ongoing / Single Day Visits',
    audience: 'High School & Middle School Students',
    benefits: ['Practical teaching experience for members', 'Direct social impact in community', 'Team collaboration outside college campus'],
    accentColor: 'from-emerald-500 via-teal-500 to-blue-500',
    borderColor: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    textColor: 'text-emerald-400',
    bgGradient: 'from-emerald-950/80 to-zinc-950/90',
    image: '/events/school_visit.jpg',
    icon: Palette,
    gallery: [
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&q=80',
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&q=80'
    ]
  }
];

const AboutEventsSection = ({ isDark }) => {
  const containerRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedEvent]);

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // GSAP ScrollTrigger Entrance Animation
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Left side text animation
      gsap.from(".left-intro-content > *", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none none"
        }
      });

      // Right panels slide up
      gsap.from(".event-panel", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 1.0,
        ease: "power4.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none none"
        },
        clearProps: "all"
      });
    }, containerRef);

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => {
      ctx.revert();
      clearTimeout(timer);
    };
  }, []);

  // GSAP Hover Timeline Logic (Desktop)
  useEffect(() => {
    if (!containerRef.current) return;
    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return; // Skip width animations on mobile/tablet view sizes

    const panels = containerRef.current.querySelectorAll('.event-panel');
    panels.forEach((panel, index) => {
      const isHovered = hoveredIndex === index;
      const isAnyHovered = hoveredIndex !== null;

      // FlexGrow values for column spacing
      let targetFlex = 1.5;
      if (isAnyHovered) {
        targetFlex = isHovered ? 4.5 : 1;
      }

      gsap.to(panel, {
        flexGrow: targetFlex,
        duration: 0.8,
        ease: "power4.out",
        overwrite: "auto"
      });

      // Image transformation
      const img = panel.querySelector('.panel-bg-img');
      const overlay = panel.querySelector('.panel-overlay');
      if (img) {
        gsap.to(img, {
          scale: isHovered ? 1.08 : 1.0,
          x: isHovered ? 5 : 0,
          filter: isHovered ? "brightness(0.9)" : "brightness(0.55)",
          duration: 0.8,
          ease: "power4.out",
          overwrite: "auto"
        });
      }
      if (overlay) {
        gsap.to(overlay, {
          opacity: isHovered ? 0.25 : 0.6,
          duration: 0.8,
          ease: "power4.out",
          overwrite: "auto"
        });
      }

      // Details panel visibility
      const details = panel.querySelector('.panel-details');
      if (details) {
        gsap.to(details, {
          height: isHovered ? 'auto' : 0,
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : 20,
          duration: 0.5,
          ease: "power3.out",
          overwrite: "auto"
        });
      }

      // Outlined number floating
      const num = panel.querySelector('.panel-number');
      if (num) {
        gsap.to(num, {
          y: isHovered ? -12 : 0,
          scale: isHovered ? 1.08 : 1.0,
          opacity: isHovered ? 0.60 : 0.35,
          duration: 0.8,
          ease: "power4.out",
          overwrite: "auto"
        });
      }

      // Arrow rotations
      const arrow = panel.querySelector('.panel-arrow');
      if (arrow) {
        gsap.to(arrow, {
          x: isHovered ? 6 : 0,
          rotation: isHovered ? 45 : 0,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    });
  }, [hoveredIndex]);

  return (
    <section
      ref={containerRef}
      className={`about-events-section py-24 relative overflow-hidden transition-colors duration-500 z-10 select-none ${isDark ? 'bg-zinc-950/60 border-y border-zinc-900/60' : 'bg-zinc-50 border-y border-zinc-200'}`}
    >
      {/* Decorative ambient gradients */}
      {isDark && (
        <>
          <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full bg-[#3B82FF]/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />
        </>
      )}

      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 xl:gap-24 items-stretch min-h-[640px]">

          {/* Left Intro column */}
          <div className="left-intro-content flex flex-col justify-between w-full lg:w-[28%] relative z-10 shrink-0 py-2">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="h-[1px] w-8 bg-gradient-to-r from-blue-500 to-purple-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-zinc-400">
                  About Our Events
                </span>
              </div>

              <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
                We.<br />
                Create.<br />
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Impact.
                </span>
              </h2>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium max-w-sm pt-2">
                Through our diverse events, we inspire minds, build skills, and create unforgettable experiences. Discover our flagship events.
              </p>


            </div>

            {/* Subtle decorative rotating text element for desktop */}
            <div className="absolute bottom-4 left-0 w-24 h-24 animate-[spin_20s_linear_infinite] opacity-60 select-none pointer-events-none hidden lg:block">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
                <text className="fill-zinc-800 dark:fill-zinc-400 text-[8.5px] uppercase tracking-[3px] font-black font-satoshi">
                  <textPath href="#circlePath" startOffset="0%">
                    • Team  •  Mavericks •  KIT
                  </textPath>
                </text>
              </svg>
            </div>
          </div>

          {/* Right Panels container */}
          <div className="flex-grow flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-row gap-4 relative z-10 w-full">
            {EVENTS_DATA.map((evt, idx) => {
              return (
                <div
                  key={evt.id}
                  className={`event-panel group relative flex flex-col justify-between overflow-hidden rounded-[24px] cursor-pointer border border-zinc-200/85 dark:border-zinc-800/85 min-h-[460px] lg:min-h-0 lg:h-full lg:flex-[1.5] ${evt.borderColor}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setSelectedEvent(evt)}
                >
                  {/* Cinematic Background image */}
                  <img
                    src={evt.image}
                    alt={evt.title}
                    className="panel-bg-img absolute inset-0 w-full h-full object-cover scale-100 origin-center z-0 filter brightness-[0.55]"
                  />

                  {/* Dark/Translucent gradient overlay */}
                  <div className="panel-overlay absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/85 z-[1] opacity-60" />

                  {/* Top-level Header: large number and accent index */}
                  <div className="p-6 relative z-10 flex justify-between items-start select-none">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                        #{evt.number}
                      </span>
                      <h3 className="text-xl font-bold tracking-wider text-white">
                        {evt.title}
                      </h3>
                    </div>
                    {/* Outlined big numbers */}
                    <div
                      className="panel-number text-transparent font-black text-6xl select-none leading-none opacity-15"
                      style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.3)' }}
                    >
                      {evt.number}
                    </div>
                  </div>

                  {/* Details, index & interactive buttons at bottom */}
                  <div className="p-6 relative z-10 space-y-4">

                    {/* Mini category accent bar */}
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${evt.accentColor}`} />
                      <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold">
                        Flagship Event
                      </span>
                    </div>

                    {/* Animated Details block (controlled by GSAP) */}
                    <div className="panel-details opacity-0 h-0 overflow-hidden lg:block">
                      <p className="text-xs text-zinc-300 font-medium leading-relaxed max-w-sm mb-4">
                        {evt.description}
                      </p>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-white hover:underline py-1"
                      >
                        More Info
                        <ArrowRight size={12} className="panel-arrow" />
                      </button>
                    </div>

                    {/* Non-desktop layout fallback details */}
                    <div className="block lg:hidden space-y-3">
                      <p className="text-xs text-zinc-350 leading-relaxed max-w-sm">
                        {evt.description}
                      </p>
                      <button className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-white py-1">
                        More Info
                        <ArrowRight size={12} />
                      </button>
                    </div>

                  </div>

                  {/* Gradient bottom borders */}
                  <div className={`absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r ${evt.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10`} />
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Cinematic Modal Window */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
              onClick={() => setSelectedEvent(null)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl backdrop-blur-xl z-10 scrollbar-none flex flex-col md:flex-row ${selectedEvent.bgGradient} ${isDark ? 'border-zinc-800' : 'border-zinc-200 bg-white/95'}`}
            >

              {/* Left Column: Image banner */}
              <div className="relative w-full md:w-5/12 h-[220px] md:h-auto min-h-[220px] select-none">
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover filter brightness-[0.7] md:absolute md:inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-transparent to-transparent" />

                {/* Floating tags */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    #{selectedEvent.number} Flagship
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-bold block mb-1">
                    Event Duration
                  </span>
                  <p className="text-sm font-black">{selectedEvent.duration}</p>
                </div>
              </div>

              {/* Right Column: Detailed info */}
              <div className="flex-grow p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh] md:max-h-[90vh]">

                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className={`text-[10px] uppercase font-black tracking-widest bg-gradient-to-r ${selectedEvent.accentColor} bg-clip-text text-transparent`}>
                      {selectedEvent.tagline}
                    </span>
                    <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedEvent.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className={`p-2 rounded-full border transition duration-200 hover:scale-105 ${isDark ? 'bg-white/5 border-zinc-800 text-zinc-400 hover:bg-white/10 hover:text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950'}`}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Main description */}
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-650'}`}>
                  {selectedEvent.detailedDescription}
                </p>

                {/* Sub objectives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h4 className={`text-xs uppercase tracking-widest font-black ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Core Objectives
                    </h4>
                    <ul className="space-y-2">
                      {selectedEvent.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className={isDark ? 'text-zinc-300' : 'text-zinc-650'}>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className={`text-xs uppercase tracking-widest font-black ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Main Activities
                    </h4>
                    <ul className="space-y-2">
                      {selectedEvent.activities.map((act, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-gradient-to-r ${selectedEvent.accentColor}`} />
                          <span className={isDark ? 'text-zinc-300' : 'text-zinc-650'}>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className={`p-4 rounded-2xl border flex flex-wrap gap-6 items-center justify-between ${isDark ? 'bg-white/[0.02] border-zinc-900' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Target Audience</span>
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{selectedEvent.audience}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Duration</span>
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{selectedEvent.duration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">Key Benefit</span>
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{selectedEvent.benefits[0]}</span>
                  </div>
                </div>

                {/* Buttons block */}
                <div className="flex gap-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <a
                    href="#apply-form"
                    onClick={() => setSelectedEvent(null)}
                    className="flex-grow flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition duration-200"
                  >
                    Register for Mavericks
                    <ArrowRight size={14} />
                  </a>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className={`px-5 h-11 border rounded-xl text-xs font-bold transition duration-200 ${isDark ? 'bg-white/5 border-zinc-800 text-white hover:bg-white/10' : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'}`}
                  >
                    Close
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AboutEventsSection;
