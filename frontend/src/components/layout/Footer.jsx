import React from 'react';
import { Mail } from 'lucide-react';

// Custom SVG Social Icons
const InstagramIcon = ({ size = 19, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const LinkedinIcon = ({ size = 19, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const YoutubeIcon = ({ size = 19, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3v6Z" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: 'Instagram',
      icon: InstagramIcon,
      url: 'https://instagram.com/teammavericks',
      hoverColor: 'hover:border-pink-500/60 hover:text-pink-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.35)]'
    },
    {
      name: 'LinkedIn',
      icon: LinkedinIcon,
      url: 'https://linkedin.com/company/teammavericks',
      hoverColor: 'hover:border-blue-500/60 hover:text-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]'
    },
    {
      name: 'YouTube',
      icon: YoutubeIcon,
      url: 'https://youtube.com/@teammavericks',
      hoverColor: 'hover:border-red-500/60 hover:text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]'
    },
    {
      name: 'Mail',
      icon: Mail,
      url: 'mailto:mavericksbodhantra@gmail.com',
      hoverColor: 'hover:border-amber-500/60 hover:text-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
    }
  ];

  return (
    <footer className="w-full bg-[#040408] text-white relative z-10 overflow-hidden select-none font-sans border-t border-zinc-900/80 pt-8 sm:pt-12 md:pt-16">
      
      {/* ─── 1. TOP SECTION: CONNECT WITH US, Social Icons & Motto Line ─────── */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 mb-8 sm:mb-12 md:mb-14 text-center">
        {/* Header with Divider Lines */}
        <div className="flex items-center justify-center gap-4 mb-5 sm:mb-6 max-w-xl mx-auto">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/80" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-amber-500/90 whitespace-nowrap">
            • CONNECT WITH US •
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/80" />
        </div>

        {/* Social Icons Row */}
        <div className="flex justify-center items-center gap-3.5 sm:gap-6 mb-5 sm:mb-6">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-zinc-800/90 bg-zinc-950/80 text-zinc-400 flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:scale-110 active:scale-95 ${social.hoverColor}`}
              >
                <Icon size={18} />
              </a>
            );
          })}
        </div>

        {/* Motto Line */}
        <p className="text-[11px] sm:text-sm font-semibold tracking-wider text-zinc-400 uppercase font-mono">
          Stay Updated!! Stay Ahead!!
        </p>
      </div>

      {/* ─── 2. MIDDLE SECTION: Responsive Team Photo Showcase ───────────────── */}
      <div className="relative w-full h-[300px] sm:h-[440px] md:h-[560px] lg:h-[620px] overflow-hidden flex items-center justify-center my-2 sm:my-4">
        {/* Desktop Team Photo */}
        <img
          src="/Footer/footer_image3.png"
          alt="Team Mavericks Group Photo"
          className="hidden sm:block w-full h-full object-cover object-[center_28%] opacity-85 contrast-110 brightness-95 scale-105 filter transition-transform duration-700 hover:scale-105"
        />

        {/* Mobile Team Photo */}
        <img
          src="/Footer/footer_image.png"
          alt="Team Mavericks Group Photo"
          className="block sm:hidden w-full h-full object-contain opacity-90 contrast-105 brightness-95 filter transition-transform duration-700 hover:scale-105"
        />

        {/* Left Side Shadow Fade (Narrower on Mobile to avoid hiding faces, Wider on Desktop) */}
        <div className="absolute top-0 bottom-0 left-0 w-12 sm:w-48 md:w-[380px] lg:w-[460px] bg-gradient-to-r from-[#040408] via-[#040408]/90 sm:via-[#040408]/95 to-transparent pointer-events-none z-10" />

        {/* Right Side Shadow Fade (Narrower on Mobile to avoid hiding faces, Wider on Desktop) */}
        <div className="absolute top-0 bottom-0 right-0 w-12 sm:w-48 md:w-[380px] lg:w-[460px] bg-gradient-to-l from-[#040408] via-[#040408]/90 sm:via-[#040408]/95 to-transparent pointer-events-none z-10" />

        {/* Top Smooth Shadow Fade */}
        <div className="absolute top-0 left-0 right-0 h-12 sm:h-16 md:h-20 bg-gradient-to-b from-[#040408] via-[#040408]/50 to-transparent pointer-events-none z-10" />

        {/* Bottom Smooth Shadow Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-44 bg-gradient-to-t from-[#040408] via-[#040408]/90 to-transparent pointer-events-none z-10" />

        {/* All-around Radial Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,#040408_94%)] pointer-events-none z-10" />
      </div>

      {/* ─── 3. BOTTOM SECTION: Bold "MAVERICKS" Text Sticking to Bottom ───────── */}
      <div className="relative z-20 w-full overflow-hidden flex justify-center items-end px-2 select-none mb-0 leading-none -mt-12 sm:-mt-20 md:-mt-28 lg:-mt-36">
        <h2 className="text-[14.5vw] sm:text-[15.5vw] md:text-[16vw] font-black tracking-[-0.04em] uppercase leading-none text-center bg-gradient-to-b from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent opacity-95">
          MAVERICKS
        </h2>
      </div>

      {/* ─── 4. Centered Copyright Bar ──────────────────────────────────────── */}
      <div className="relative z-20 w-full px-6 py-4 border-t border-zinc-900/80 flex items-center justify-center text-center text-xs text-zinc-500 font-medium">
        <p className="tracking-wide">
          &copy; {currentYear} <span className="text-amber-500 font-bold">Mavericks</span>. All rights reserved.
        </p>
      </div>

    </footer>
  );
};

export default Footer;
