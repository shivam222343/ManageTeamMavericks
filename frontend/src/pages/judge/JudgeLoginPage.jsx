import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowLeft, ArrowRight, Loader2, AlertCircle, MousePointer, Crosshair } from 'lucide-react';
import TargetCursor from '../../components/ui/TargetCursor';

const JudgeLoginPage = () => {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const isSubmittingRef = useRef(false);
  const navigate = useNavigate();

  // Cursor Mode: 'simple' (default standard OS cursor) or 'styled'
  const [cursorStyle, setCursorStyle] = useState(() => {
    return localStorage.getItem('judge_cursor_style') || 'simple';
  });

  useEffect(() => {
    if (cursorStyle === 'simple') {
      document.body.style.cursor = 'auto';
    }
    localStorage.setItem('judge_cursor_style', cursorStyle);
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [cursorStyle]);

  const toggleCursorStyle = () => {
    const next = cursorStyle === 'simple' ? 'styled' : 'simple';
    setCursorStyle(next);
    if (next === 'simple') {
      document.body.style.cursor = 'auto';
      toast.success('Switched to standard cursor', { icon: '🖱️' });
    } else {
      toast.success('Switched to styled target cursor', { icon: '🎯' });
    }
  };

  const performLogin = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || code.length < 8 || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setAuthError('');

    try {
      const res = await axios.post('/judge/auth/login', { access_code: code });
      if (res.data?.success && res.data?.token) {
        localStorage.setItem('judge_token', res.data.token);
        localStorage.setItem('judge_info', JSON.stringify(res.data.judge));
        localStorage.setItem('judge_panel', JSON.stringify(res.data.panel));
        localStorage.setItem('judge_round', JSON.stringify(res.data.round));
        localStorage.setItem('judge_sub_event', JSON.stringify(res.data.sub_event));
        localStorage.setItem('judge_event', JSON.stringify(res.data.event));

        toast.success(`Welcome ${res.data.judge?.name || 'Judge'}! Access verified.`);
        navigate('/judge/portal');
      } else {
        setAuthError('Access code verification failed.');
        toast.error('Access code verification failed.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid or inactive access code.';
      setAuthError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleInputChange = (e) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    setAccessCode(cleaned);
    setAuthError('');

    // Auto-submit when exactly 8 characters are entered
    if (cleaned.length === 8) {
      performLogin(cleaned);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (accessCode.length < 8) {
      setAuthError('Access code must be exactly 8 characters.');
      toast.error('Access code must be exactly 8 characters.');
      return;
    }
    performLogin(accessCode);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
      {/* Optional Styled Target Cursor if enabled by Judge setting */}
      {cursorStyle === 'styled' && (
        <TargetCursor
          spinDuration={2}
          hideDefaultCursor={true}
          parallaxOn={true}
          hoverDuration={0.2}
          cursorColor="#818cf8"
          cursorColorOnTarget="#a855f7"
        />
      )}

      {/* Top Navigation */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link to="/events" className="flex items-center gap-2.5 text-zinc-300 hover:text-zinc-100 transition">
          <img
            src="/Logos/Mavericks_Logo.png"
            alt="Team Mavericks"
            className="w-7 h-7 object-contain"
          />
          <span className="text-xs font-semibold tracking-tight">Team Mavericks</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Cursor Toggle Setting */}
          <button
            onClick={toggleCursorStyle}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition cursor-pointer"
            title="Toggle cursor style"
          >
            {cursorStyle === 'simple' ? (
              <>
                <MousePointer size={12} />
                <span className="text-[11px]">Cursor: Standard</span>
              </>
            ) : (
              <>
                <Crosshair size={12} className="text-indigo-400" />
                <span className="text-[11px] text-indigo-300">Cursor: Styled</span>
              </>
            )}
          </button>

          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition"
          >
            <ArrowLeft size={13} />
            <span>Events</span>
          </Link>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-xl relative">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 text-zinc-200 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={20} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">
            Judge Evaluation Portal
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enter your 8-character panel access code.
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg border border-red-900/40 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-400" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Access Code
              </label>
              <span className="text-[10px] font-mono text-zinc-500">
                {accessCode.length} / 8
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={8}
                placeholder="e.g. ZQGBEOH8"
                value={accessCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-center text-base font-mono font-semibold tracking-widest uppercase rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || accessCode.length < 8}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs tracking-wide transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Enter Evaluation Room</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500">
            Assigned by event coordinator. Automatically signs in once 8 characters are entered.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JudgeLoginPage;
