import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Key,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

const QrScannerModal = ({ isOpen, onClose, onSuccess, onScanSuccess, isDark: propIsDark }) => {
  const { theme } = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : theme === 'dark';

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, cameraFacing]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        await videoRef.current.play();
        startScanningLoop();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable. Please enter code manually.');
      setMode('manual');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanningLoop = () => {
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const detect = async () => {
          if (!videoRef.current || !streamRef.current || verifying) return;
          try {
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                handleDetectedCode(rawVal);
                return;
              }
            }
          } catch (e) {
            // ignore frame read error
          }
          animFrameRef.current = requestAnimationFrame(detect);
        };
        animFrameRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.warn('BarcodeDetector error:', err);
      }
    }
  };

  const handleDetectedCode = async (rawText) => {
    if (verifying) return;
    submitToken(rawText);
  };

  const submitToken = async (tokenString) => {
    const code = tokenString || manualToken;
    if (!code || !code.trim()) {
      toast.error('Please enter a valid attendance code.');
      return;
    }

    try {
      setVerifying(true);
      const loader = toast.loading('Verifying code...');
      const res = await axios.post('/events/attendance/scan', {
        qr_code: code.trim()
      });
      toast.dismiss(loader);

      setResult({
        success: true,
        alreadyMarked: res.data.already_marked,
        message: res.data.message,
        eventName: res.data.event_name,
        subEventName: res.data.sub_event_name,
        participantName: res.data.participant_name,
        timestamp: res.data.timestamp || res.data.marked_at
      });

      if (res.data.already_marked) {
        toast('Already marked present', { icon: 'ℹ️' });
      } else {
        toast.success(res.data.message || 'Attendance verified!');
      }

      if (onSuccess) onSuccess(res.data);
      if (onScanSuccess) onScanSuccess(res.data);
    } catch (err) {
      toast.dismiss();
      const errMessage = err.response?.data?.error || 'Verification failed. Please try again.';
      toast.error(errMessage);
      setResult({
        success: false,
        error: errMessage
      });
    } finally {
      setVerifying(false);
    }
  };

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 overflow-hidden transition-colors duration-200 ${
            isDark
              ? 'bg-[#0F172A] border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Close button */}
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className={`absolute top-5 right-5 p-2 rounded-xl transition cursor-pointer z-20 ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Clean Header */}
          <div className="mb-4 pr-8">
            <h3 className="text-lg font-bold tracking-tight">
              Scan Attendance QR
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Align the attendance QR code within the frame to verify.
            </p>
          </div>

          {/* Mode Switcher */}
          <div
            className={`flex p-1 rounded-xl mb-4 border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setMode('camera');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === 'camera'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera size={14} />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setMode('manual');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === 'manual'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key size={14} />
              <span>Enter Code</span>
            </button>
          </div>

          {/* Result State View */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-5 rounded-2xl border text-center space-y-3 ${
                result.success
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isDark
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-100'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex justify-center">
                {result.success ? (
                  <div
                    className={`p-2.5 rounded-2xl border ${
                      isDark
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-emerald-100 text-emerald-600 border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                ) : (
                  <div
                    className={`p-2.5 rounded-2xl border ${
                      isDark
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-rose-100 text-rose-600 border-rose-300'
                    }`}
                  >
                    <AlertCircle size={32} />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold">
                  {result.success
                    ? result.alreadyMarked
                      ? 'Already Marked Present'
                      : 'Attendance Verified'
                    : 'Verification Failed'}
                </h4>
                <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {result.message || result.error}
                </p>
              </div>

              {result.success && (result.eventName || result.subEventName) && (
                <div
                  className={`rounded-xl p-3 text-xs space-y-1 text-left font-mono border ${
                    isDark ? 'bg-black/30 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  {result.eventName && (
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Event:</span>
                      <span className="font-bold truncate ml-2">{result.eventName}</span>
                    </div>
                  )}
                  {result.subEventName && (
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Track:</span>
                      <span className="font-bold text-primary-blue truncate ml-2">{result.subEventName}</span>
                    </div>
                  )}
                  {result.participantName && (
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Participant:</span>
                      <span className="font-bold truncate ml-2">{result.participantName}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    if (mode === 'camera') startCamera();
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <RefreshCw size={13} />
                  <span>Scan Another</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary-blue hover:bg-blue-600 text-white transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}

          {/* Standard Camera Viewfinder */}
          {!result && mode === 'camera' && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-black/20 shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {/* Standard Viewfinder Focus Markers */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-48 h-48 sm:w-52 sm:h-52">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg shadow-sm" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg shadow-sm" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg shadow-sm" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg shadow-sm" />
                </div>
              </div>

              {/* Camera Flip Button */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="absolute bottom-3 right-3 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white transition cursor-pointer"
                title="Flip Camera"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          )}

          {/* Standard Manual Entry View */}
          {!result && mode === 'manual' && (
            <div
              className={`space-y-3.5 p-4 rounded-2xl border ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Attendance Token
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. ATT-D9F4392842..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => submitToken(manualToken)}
                disabled={verifying || !manualToken.trim()}
                className="w-full py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>{verifying ? 'Verifying...' : 'Submit Code'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QrScannerModal;
