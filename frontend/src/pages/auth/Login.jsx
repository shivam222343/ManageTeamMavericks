import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Force body class to dark theme on mount
    const body = window.document.body;
    body.classList.add('dark');
    body.classList.remove('light');

    // Revert to user's saved theme on unmount
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

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 transition-all duration-500 relative overflow-hidden"
      style={{ backgroundImage: `url("${isMobile ? '/backgrounds/mobile_view.png' : '/backgrounds/dekstop_view.png'}")` }}
    >
      {/* Background overlay for better readability */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/55  pointer-events-none" />

      {/* Top Left Logo & Title */}
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
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-xl shadow-zinc-950/5 dark:shadow-zinc-950/20"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
            className="mb-4"
          >
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Management Portal</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Enter your credentials to manage the recruitment drive.</p>
        </div>

        {authError && (
          <div className="mb-5 p-3 rounded-lg border border-accent-red/20 bg-accent-red/10 backdrop-blur-sm text-accent-red text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-semibold text-red-200">{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              placeholder="coordinator@teammavericks.org"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
              })}
              className={`w-full px-3.5 py-2 rounded-lg border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue transition-all duration-200
                ${errors.email ? 'border-accent-red/50 focus:ring-accent-red' : 'border-zinc-200 dark:border-zinc-800'}
              `}
            />
            {errors.email && (
              <p className="mt-1.5 text-[11px] text-accent-red flex items-center gap-1 font-medium">
                <AlertCircle size={10} />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide font-sans">Password</label>
              <button
                type="button"
                onClick={() => toast('Please contact the Coordinator to reset your password.', { icon: '🔑' })}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                {...register('password', { required: 'Password is required' })}
                className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/50 focus:border-primary-blue transition-all duration-200
                    ${errors.password ? 'border-accent-red/50 bg-accent-red/5 focus:ring-accent-red/50' : 'border-white/10 bg-white/5 dark:bg-zinc-950/20'}
                  `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1 font-medium font-sans">
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
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-blue focus:ring-primary-blue/50 focus:ring-offset-zinc-900"
            />
            <label htmlFor="rememberMe" className="text-xs text-zinc-300 font-medium select-none cursor-pointer font-sans">
              Remember me on this device
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-lg bg-primary-blue hover:bg-primary-blue-dark text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-primary-blue/20 hover:shadow-primary-blue/35 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </motion.div>

    </div>
  );
};

export default Login;
