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

const GithubIcon = ({ size = 19, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const YoutubeIcon = ({ size = 19, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3v6Z" />
  </svg>
);

const XIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
      name: 'GitHub',
      icon: GithubIcon,
      url: 'https://github.com/shivam222343/ManageTeamMavericks',
      hoverColor: 'hover:border-zinc-400 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]'
    },
    {
      name: 'YouTube',
      icon: YoutubeIcon,
      url: 'https://youtube.com/@teammavericks',
      hoverColor: 'hover:border-red-500/60 hover:text-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]'
    },
    {
      name: 'X',
      icon: XIcon,
      url: 'https://x.com/teammavericks',
      hoverColor: 'hover:border-zinc-400 hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]'
    }
  ];

  return (
    <footer className="w-full bg-[#040408] text-white relative z-10 overflow-hidden select-none font-sans border-t border-zinc-900/80">
      
      {/* ─── 1. Background Team Photograph & Gradient Overlay ───────────────── */}
      <div className="relative w-full h-[320px] sm:h-[420px] md:h-[500px] overflow-hidden flex items-center justify-center">
        {/* Full-width team photograph */}
        <img
          src="/Footer/IMG_5344.PNG"
          alt="Team Mavericks Group Photo"
          className="w-full h-full object-cover object-center opacity-80 contrast-110 brightness-90 filter transition-transform duration-700 hover:scale-105"
        />

        {/* Top gradient fade blending from page background */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#040408] via-[#040408]/75 to-transparent pointer-events-none z-10" />

        {/* Bottom smooth fade blending into dark footer */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#040408] via-[#040408]/90 to-transparent pointer-events-none z-10" />

        {/* Radial vignette mask around edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#040408_95%)] pointer-events-none z-10" />
      </div>

      {/* ─── 2. "CONNECT WITH US" Header with Divider Lines ──────────────────── */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 -mt-10 sm:-mt-14 mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/80" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.3em] text-amber-500/90 whitespace-nowrap">
            • CONNECT WITH US •
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/80" />
        </div>
      </div>

      {/* ─── 3. Social Icons Bar ────────────────────────────────────────────── */}
      <div className="relative z-20 flex justify-center items-center gap-4 sm:gap-6 mb-8 px-6">
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

      {/* ─── 4. Newsletter / Announcement Line ───────────────────────────── */}
      <div className="relative z-20 flex items-center justify-center gap-2.5 mb-12 sm:mb-16 px-6 text-center">
        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
          <Mail size={16} />
        </div>
        <p className="text-xs sm:text-sm font-medium text-zinc-400 leading-relaxed max-w-md">
          Stay updated with our latest events, projects, and announcements.
        </p>
      </div>

      {/* ─── 5. Massive Brand Typography ("MAVERICKS") ──────────────────────── */}
      <div className="relative z-20 w-full overflow-hidden flex justify-center items-center px-2 select-none mb-6">
        <h2 className="text-[14.5vw] sm:text-[15.5vw] md:text-[16vw] font-black tracking-[-0.04em] uppercase leading-none text-center bg-gradient-to-b from-white via-zinc-200/90 to-zinc-950/90 bg-clip-text text-transparent drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] opacity-95">
          MAVERICKS
        </h2>
      </div>

      {/* ─── 6. Bottom Copyright & Credits Bar ─────────────────────────────── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-medium">
        <p className="tracking-wide text-center sm:text-left">
          &copy; {currentYear} <span className="text-amber-500 font-bold">Mavericks</span>. All rights reserved.
        </p>
        <p className="flex items-center gap-1.5 tracking-wide text-center sm:text-right">
          Made with <span className="text-red-500 animate-pulse">❤️</span> by <span className="text-amber-500 font-bold">Mavericks</span>
        </p>
      </div>

    </footer>
  );
};

export default Footer;
