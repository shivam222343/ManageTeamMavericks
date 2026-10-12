import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Compass } from 'lucide-react';

// Animated SVG orbit illustration
const OrbitIllustration = () => (
  <svg
    viewBox="0 0 400 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full max-w-sm mx-auto select-none"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="planetGlow404" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="planetBody404" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </radialGradient>
      <radialGradient id="moonGlow404" cx="40%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
      <filter id="glow404">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Background stars - static twinkling via CSS animation */}
    {[
      [20, 30, 1.8], [350, 40, 1.2], [80, 280, 1.5], [320, 270, 1.0], [370, 140, 2.0], [30, 180, 1.2],
      [190, 20, 1.5], [290, 300, 1.0], [100, 60, 1.8], [260, 50, 1.2], [40, 240, 1.0], [340, 200, 1.5],
      [150, 290, 1.2], [380, 100, 1.0], [60, 100, 1.8],
    ].map(([x, y, r], i) => (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={r}
        fill="white"
        opacity={0.5}
        style={{
          animation: `twinkle404 ${2 + (i % 3)}s ease-in-out infinite`,
          animationDelay: `${i * 0.25}s`,
        }}
      />
    ))}

    {/* Glow ring behind planet */}
    <ellipse
      cx="200"
      cy="160"
      rx="92"
      ry="92"
      fill="url(#planetGlow404)"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    />

    {/* Orbit dashed ring */}
    <ellipse
      cx="200"
      cy="160"
      rx="140"
      ry="45"
      stroke="#3B82F6"
      strokeWidth="1.5"
      strokeDasharray="6 4"
      fill="none"
      opacity="0.45"
    />

    {/* Planet body */}
    <circle
      cx="200"
      cy="160"
      r="68"
      fill="url(#planetBody404)"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    />

    {/* Planet surface highlight */}
    <ellipse
      cx="185"
      cy="140"
      rx="22"
      ry="14"
      fill="white"
      opacity="0.12"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    />

    {/* Planet ring 1 */}
    <ellipse
      cx="200"
      cy="160"
      rx="100"
      ry="20"
      stroke="#60A5FA"
      strokeWidth="5"
      fill="none"
      opacity="0.5"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    />

    {/* Planet ring 2 */}
    <ellipse
      cx="200"
      cy="160"
      rx="115"
      ry="23"
      stroke="#93C5FD"
      strokeWidth="2"
      fill="none"
      opacity="0.22"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    />

    {/* Orbiting moon group */}
    <g style={{ transformOrigin: '200px 160px', animation: 'orbitMoon404 10s linear infinite' }}>
      <circle cx="340" cy="160" r="14" fill="url(#moonGlow404)" filter="url(#glow404)" />
      <circle cx="336" cy="155" r="4" fill="white" opacity="0.18" />
    </g>

    {/* Small orbiting dot */}
    <g style={{ transformOrigin: '200px 160px', animation: 'orbitDot404 7s linear infinite reverse' }}>
      <circle cx="75" cy="130" r="5" fill="#60A5FA" opacity="0.85" filter="url(#glow404)" />
    </g>

    {/* 404 text */}
    <text
      x="200"
      y="170"
      textAnchor="middle"
      fontFamily="monospace"
      fontSize="26"
      fontWeight="bold"
      fill="white"
      opacity="0.88"
      style={{ animation: 'floatPlanet404 4s ease-in-out infinite' }}
    >
      404
    </text>
  </svg>
);

// Inline CSS for the SVG animations (injected once)
const SvgStyles = () => (
  <style>{`
    @keyframes twinkle404 {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.85; }
    }
    @keyframes floatPlanet404 {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes orbitMoon404 {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes orbitDot404 {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}</style>
);

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden font-sans">
      <SvgStyles />

      {/* Ambient background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top-left Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute top-6 left-6 flex items-center gap-3"
      >
        <Link to="/events" className="flex items-center gap-3 group">
          <img
            src="/Logos/Mavericks_Logo.png"
            alt="Team Mavericks"
            className="w-9 h-9 object-contain select-none group-hover:scale-105 transition-transform duration-200"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-widest" style={{ fontFamily: 'var(--font-logo, sans-serif)' }}>
              Team Mavericks
            </span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">
              Management System
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto space-y-8"
      >
        {/* SVG Orbit Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          className="w-full"
        >
          <OrbitIllustration />
        </motion.div>

        {/* Text Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Compass size={12} />
            <span>Lost in Space</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Looks like you've drifted into uncharted territory. This page doesn't exist in the Mavericks universe.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <Link
            to="/events"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            <Home size={14} />
            <span>View Events</span>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-[11px] text-zinc-600 font-mono"
        >
          Error 404 · Team Mavericks Management System
        </motion.p>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
