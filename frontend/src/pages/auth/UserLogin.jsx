import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, AlertCircle, Sparkles, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, Ticket, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const UserLogin = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Check if credentials were passed via redirect state or search params
  const searchParams = new URLSearchParams(location.search);
  const passedEmail = location.state?.email || searchParams.get('email') || '';
  const passedPassword = location.state?.password || searchParams.get('password') || '';
  const isAutoFilled = Boolean(passedEmail && passedPassword);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const body = window.document.body;
    body.classList.add('dark');
    body.classList.remove('light');

    return () => {
      if (theme === 'light') {
        body.classList.add('light');
        body.classList.remove('dark');
      } else {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    };
  }, [theme]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      email: passedEmail,
      password: passedPassword,
      rememberMe: true
    }
  });

  useEffect(() => {
    if (passedEmail) setValue('email', passedEmail);
    if (passedPassword) setValue('password', passedPassword);
  }, [passedEmail, passedPassword, setValue]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setAuthError('');

    const loadingToast = toast.loading('Signing in to Participant Portal...');
    const result = await login(data.email, data.password, data.rememberMe);
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success('Welcome back to Team Mavericks!');
      navigate('/user/dashboard');
    } else {
      setAuthError(result.error);
      toast.error(result.error);
    }
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 transition-all duration-500 relative overflow-hidden font-sans"
      style={{ backgroundImage: `url("${isMobile ? '/backgrounds/mobile_view.png' : '/backgrounds/dekstop_view.png'}")` }}
    >
      <div className="absolute inset-0 bg-black/50 dark:bg-black/65 pointer-events-none" />

      {/* Top Left Logo Navigation */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-3 z-10">
        <Link to="/events" className="flex items-center gap-3 group">
          <img
            src="/Logos/Mavericks_Logo.png"
            alt="Team Mavericks Logo"
            className="w-9 h-9 md:w-11 md:h-11 object-contain select-none group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-logo text-xs md:text-sm text-white font-bold tracking-widest drop-shadow-md">
              Team Mavericks
            </span>
            <span className="text-[9px] md:text-[10px] text-blue-300 font-bold uppercase tracking-wider">
              Participant Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Top Right Back Link */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition"
        >
          <ArrowLeft size={13} />
          <span>All Events</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card-shine rounded-3xl p-8 sm:p-10 shadow-2xl z-10 border border-white/20 dark:border-white/15 relative overflow-hidden"
      >
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-3 border border-blue-400/30">
            <Ticket size={22} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-display-heavy">
            Participant Portal
          </h2>
          <p className="text-xs text-zinc-300 mt-1">
            Access your event passes, tickets, and registration history.
          </p>
        </div>

        {/* Auto-filled Badge Notice (if redirected from registration) */}
        {isAutoFilled && (
          <div className="mb-5 p-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 backdrop-blur-md text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1 text-[11px]">
              <span className="font-bold block text-emerald-300">Credentials Auto-Filled!</span>
              <span>Generated from your recent event registration.</span>
            </div>
          </div>
        )}

        {authError && (
          <div className="mb-5 p-3 rounded-xl border border-accent-red/30 bg-accent-red/20 backdrop-blur-md text-red-200 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-semibold text-red-100">{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 uppercase tracking-wide font-mono-tag">
              Registered Email
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="e.g. shivam@gmail.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                className={`w-full pl-4 pr-4 py-3 rounded-xl border bg-white/10 dark:bg-black/40 text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-white/40 backdrop-blur-md transition-all duration-200 shadow-inner
                  ${errors.email ? 'border-accent-red/60 focus:ring-accent-red' : 'border-white/20 dark:border-white/15'}
                `}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-[11px] text-red-300 flex items-center gap-1 font-medium">
                <AlertCircle size={10} />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-mono-tag">
                Password
              </label>
              <span className="text-[10px] text-zinc-400">Sent via confirmation mail</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter portal password"
                {...register('password', { required: 'Password is required' })}
                className={`w-full pl-4 pr-11 py-3 rounded-xl border bg-white/10 dark:bg-black/40 text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-white/40 backdrop-blur-md transition-all duration-200 shadow-inner
                  ${errors.password ? 'border-accent-red/60 focus:ring-accent-red' : 'border-white/20 dark:border-white/15'}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-white cursor-pointer transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-[11px] text-red-300 flex items-center gap-1 font-medium font-sans">
                <AlertCircle size={10} />
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-primary-blue focus:ring-primary-blue/50 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <Link to="/login" className="text-blue-300 hover:text-white hover:underline transition text-[11px] font-bold">
              Team Member / Admin?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-primary-blue to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono-tag text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Signing in...</span>
              </span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/15 text-center">
          <p className="text-xs text-zinc-300">
            Don't have an account yet?{' '}
            <Link to="/events" className="text-primary-blue hover:text-blue-300 font-bold hover:underline">
              Register for an event
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default UserLogin;
