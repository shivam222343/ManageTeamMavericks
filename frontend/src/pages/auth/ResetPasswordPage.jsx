import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token || !email) {
      toast.error('Invalid or missing password reset parameters.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post('/auth/reset-password', {
        email,
        token,
        newPassword
      });
      toast.success(res.data.message || 'Password reset successfully!');
      setResetDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            Reset Account Password
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Enter a new password for <strong className="text-zinc-800 dark:text-zinc-200">{email || 'your account'}</strong>
          </p>
        </div>

        {resetDone ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold">
              Your password has been successfully updated.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-2xl bg-primary-blue hover:bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                New Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition cursor-pointer"
            >
              {submitting ? 'Resetting Password...' : 'Save New Password & Login'}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
