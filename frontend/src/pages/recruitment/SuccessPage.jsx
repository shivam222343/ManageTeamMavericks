import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Printer, Sparkles, Clipboard } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import Confetti from './components/Confetti';

const SuccessPage = () => {
  const location = useLocation();
  const state = location.state;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const { application_id, name, campaign_name, thank_you_message } = state;

  const handleCopyId = () => {
    navigator.clipboard.writeText(application_id);
    toast.success('Application ID copied to clipboard!', {
      icon: '📋',
      style: {
        borderRadius: '12px',
        background: isDark ? '#18181B' : '#FFFFFF',
        color: isDark ? '#FFFFFF' : '#18181B',
        border: isDark ? '1px solid #27272A' : '1px solid #E4E4E7',
        fontSize: '11px',
        fontWeight: 'bold',
      }
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between relative overflow-hidden transition-all duration-500 selection:bg-blue-600/30 selection:text-white ${isDark ? 'bg-[#04040C] text-white' : 'bg-[#FFFFFF] text-zinc-900'}`}
      style={{
        background: isDark
          ? 'radial-gradient(circle at top, #11183A 0%, #090A18 35%, #04040C 100%)'
          : 'radial-gradient(circle at top, #F3F6FF 0%, #F8FAFC 50%, #FFFFFF 100%)'
      }}
    >
      {/* Falling particle confetti */}
      <Confetti />

      {/* Ambient background glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] pointer-events-none z-0 transition-colors duration-500 ${isDark ? 'bg-[#8B5CF6]/5' : 'bg-[#8B5CF6]/3'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px] pointer-events-none z-0 transition-colors duration-500 ${isDark ? 'bg-[#3B82FF]/5' : 'bg-[#3B82FF]/3'}`} />

      {/* Header */}
      <header className={`sticky top-0 z-40 h-[76px] border-b bg-transparent backdrop-blur-[18px] flex items-center px-6 md:px-12 transition-all duration-300 ${isDark ? 'border-white/4' : 'border-zinc-200/50'}`}>
        <div className="flex items-center gap-6">
          <img
            src="/Logos/Mavericks_Logo.png"
            alt="Team Mavericks Logo"
            className="w-8 h-8 object-contain shrink-0"
            style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
          />
          <h1 className={`font-satoshi font-bold text-[18px] tracking-[3px] uppercase transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Team Mavericks
          </h1>
        </div>
      </header>

      {/* Main card */}
      <main className="p-6 flex items-center justify-center flex-1 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`max-w-md w-full border p-8 text-center space-y-6 rounded-[28px] backdrop-blur-xl relative overflow-hidden transition-all duration-300
            ${isDark 
              ? 'bg-zinc-950/45 border-zinc-900 shadow-[0_0_60px_rgba(59,130,246,0.12),0_30px_70px_rgba(0,0,0,0.55)]' 
              : 'bg-white/45 border-zinc-200/80 shadow-[0_0_50px_rgba(59,130,246,0.08),0_25px_60px_-15px_rgba(0,0,0,0.12)]'
            }
          `}
        >
          {/* Subtle neon glowing light at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          {/* Premium Checkmark Icon Animation */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            {/* Outer rotating/pulsing ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30 dark:border-emerald-500/20"
            />
            {/* Center glow */}
            <div className="absolute w-14 h-14 rounded-full bg-emerald-500/10 blur-md pointer-events-none" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 250, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20"
            >
              <CheckCircle size={28} />
            </motion.div>
          </div>

          <div className="space-y-1.5">
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Application Submitted!
            </h2>
            <p className="text-blue-550 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">
              {campaign_name}
            </p>
          </div>

          {/* Application Id Card */}
          <div
            onClick={handleCopyId}
            className={`p-5 border rounded-2xl space-y-2 cursor-pointer transition-all duration-305 group hover:-translate-y-0.5 relative overflow-hidden
              ${isDark ? 'bg-zinc-900/10 border-zinc-850 hover:border-zinc-750' : 'bg-zinc-50 border-zinc-150 hover:border-zinc-250 hover:shadow-sm'}
            `}
          >
            {/* Hover overlay glow */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/[0.02] rounded-full blur-xl pointer-events-none" />

            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] text-zinc-405 dark:text-zinc-550 uppercase tracking-widest font-extrabold block">
                Application Reference ID
              </span>
              <Clipboard size={12} className="text-zinc-405 group-hover:text-blue-500 transition-colors" />
            </div>

            <p className="text-2xl font-mono font-black tracking-widest text-blue-600 dark:text-blue-400 select-all py-1">
              {application_id}
            </p>

            <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-medium block">
              Hello <span className="font-extrabold text-zinc-700 dark:text-zinc-300">{name}</span>, click to copy and save this ID for your interview reference.
            </span>
          </div>

          {/* Thank You message */}
          {thank_you_message && (
            <p className={`text-xs leading-relaxed font-medium max-w-sm mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {thank_you_message}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 text-[10px] font-extrabold uppercase tracking-widest">
            <button
              onClick={() => {
                window.print();
                toast.success('Preparing print layout...', { icon: '🖨️' });
              }}
              className={`flex-1 h-11 border rounded-xl flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer select-none active:scale-95 shadow-sm
                ${isDark
                  ? 'bg-zinc-900/30 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }
              `}
            >
              <Printer size={13} />
              <span>Print Page</span>
            </button>
            <Link
              to="/"
              className="flex-1 h-11 bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white rounded-xl flex items-center justify-center gap-1.5 shadow transition duration-200 select-none active:scale-95 cursor-pointer"
            >
              <span>Back to Home</span>
              <ArrowRight size={13} />
            </Link>
          </div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className={`py-8 border-t text-center px-6 transition-colors duration-300 bg-transparent ${isDark ? 'border-zinc-900/60' : 'border-zinc-200/50'}`}>
        <div className="text-[9px] text-zinc-450 dark:text-zinc-600 font-extrabold uppercase tracking-widest font-mono">
          &copy; {new Date().getFullYear()} Team Mavericks KIT CoEK. Stay Updated!! Stay Ahead!!
        </div>
      </footer>
    </div>
  );
};

export default SuccessPage;
