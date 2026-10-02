import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, AlertCircle, KeyRound, Mail, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';

const Login = () => {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

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

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    setAuthError('');

    const loadingToast = toast.loading('Authenticating...');
    const result = await login(data.email, data.password, data.rememberMe);
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setAuthError(result.error);
      toast.error(result.error);
    }
    setSubmitting(false);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your registered email address.');
      return;
    }

    setSendingReset(true);
    try {
      const res = await axios.post('/auth/forgot-password', { email: forgotEmail });
      toast.success(res.data.message || 'Password reset link sent.');
      setForgotDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset link.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 transition-all duration-500 relative overflow-hidden"
      style={{ backgroundImage: `url("${isMobile ? '/backgrounds/mobile_view.png' : '/backgrounds/dekstop_view.png'}")` }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/55 pointer-events-none" />

      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-3 z-10">
        <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain animate-pulse-subtle" />
        <div className="flex flex-col">
          <span className="font-logo text-xs md:text-sm text-white font-bold tracking-widest drop-shadow-md">Team Mavericks</span>
          <span className="text-[9px] md:text-[10px] text-zinc-300 font-medium tracking-wider">Recruitment Management</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card-shine rounded-3xl p-8 sm:p-10 shadow-2xl z-10 border border-white/20 dark:border-white/15"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 drop-shadow-sm">Management Portal</h2>
          <p className="text-xs text-zinc-300 font-medium">Enter your credentials to manage the recruitment drive.</p>
        </div>

        {authError && (
          <div className="mb-5 p-3 rounded-xl border border-accent-red/30 bg-accent-red/20 backdrop-blur-md text-red-200 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-semibold text-red-100">{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
              })}
              className={`w-full px-4 py-3 rounded-xl border bg-white/10 dark:bg-black/40 text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-white/40 backdrop-blur-md transition-all duration-200 shadow-inner
                ${errors.email ? 'border-accent-red/60 focus:ring-accent-red' : 'border-white/20 dark:border-white/15'}
              `}
            />
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
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-sans">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotDone(false);
                  setShowForgotModal(true);
                }}
                className="text-[11px] font-bold text-blue-300 hover:text-white hover:underline cursor-pointer transition"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
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
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberMe"
              {...register('rememberMe')}
              className="w-4 h-4 rounded border-white/30 bg-white/10 text-primary-blue focus:ring-primary-blue/50 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-zinc-200 font-medium select-none cursor-pointer font-sans">
              Remember me on this device
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md glass-card-shine rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 flex items-center justify-center">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
                      Forgot Password
                    </h3>
                    <p className="text-xs text-zinc-500">Request a password reset link to your email.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              {forgotDone ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold leading-relaxed">
                    If <strong className="text-zinc-900 dark:text-zinc-100">{forgotEmail}</strong> is registered, we have dispatched a password reset link to your email address.
                  </p>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReset}
                      className="px-5 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{sendingReset ? 'Sending Link...' : 'Send Reset Link'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
