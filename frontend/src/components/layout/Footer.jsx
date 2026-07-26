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
      url: 'mailto:official@teammavericks.org',
      hoverColor: 'hover:border-amber-500/60 hover:text-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
    }
  ];

  return (
    <footer className="w-full bg-[#040408] text-white relative z-10 overflow-hidden select-none font-sans border-t border-zinc-900/80 pt-4">
      
      {/* ─── 1. Uncropped Full Team Photograph Showcase ─────────────────────── */}
      <div className="relative w-full max-w-6xl mx-auto px-4 flex items-center justify-center">
        {/* Full-width uncropped team photograph */}
        <img
          src="/Footer/IMG_5344.PNG"
          alt="Team Mavericks Group Photo"
          className="w-full h-auto max-h-[580px] object-contain opacity-90 contrast-105 brightness-95 rounded-2xl filter transition-transform duration-700 hover:scale-[1.01]"
        />

        {/* Soft top gradient fade into dark page */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#040408] via-[#040408]/60 to-transparent pointer-events-none z-10" />

        {/* Soft edge vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,#040408_98%)] pointer-events-none z-10" />
      </div>

      {/* ─── 2. "CONNECT WITH US" Header with Divider Lines ──────────────────── */}
      <div className="relative z-20 max-w-3xl mx-auto px-6 mt-6 sm:mt-8 mb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/80" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.3em] text-amber-500/90 whitespace-nowrap">
            • CONNECT WITH US •
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/80" />
        </div>
      </div>

      {/* ─── 3. Social Icons Bar (Instagram, LinkedIn, YouTube, Mail) ────────── */}
      <div className="relative z-20 flex justify-center items-center gap-4 sm:gap-6 mb-6 px-6">
        {socialLinks.map((social) => {
          const Icon = social.icon;
          return (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-zinc-800/90 bg-zinc-950/80 text-zinc-400 flex items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:scale-110 active:scale-95 ${social.hoverColor}`}
            >
              <Icon size={19} />
            </a>
          );
        })}
      </div>

      {/* ─── 4. Motto Line ─────────────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-center mb-8 px-6 text-center">
        <p className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-400 uppercase font-mono">
          Stay Updated!! Stay Ahead!!
        </p>
      </div>

      {/* ─── 5. Bold "MAVERICKS" Text Sticking to Bottom ───────────────────── */}
      <div className="relative z-20 w-full overflow-hidden flex justify-center items-end px-2 select-none mb-0 leading-none">
        <h2 className="text-[15vw] sm:text-[16vw] md:text-[16.5vw] font-black tracking-[-0.04em] uppercase leading-none text-center bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent opacity-95">
          MAVERICKS
        </h2>
      </div>

      {/* ─── 6. Centered Bottom Rights Bar ──────────────────────────────────── */}
      <div className="relative z-20 w-full px-6 py-4 border-t border-zinc-900/80 flex items-center justify-center text-center text-xs text-zinc-500 font-medium">
        <p className="tracking-wide">
          &copy; {currentYear} <span className="text-amber-500 font-bold">Mavericks</span>. All rights reserved.
        </p>
      </div>

    </footer>
  );
};

export default Footer;
