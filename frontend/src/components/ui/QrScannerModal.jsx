import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Key,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const QrScannerModal = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [cameras, setCameras] = useState([]);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
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
        videoRef.current.setAttribute('playsinline', true); // crucial for iOS
        await videoRef.current.play();
        setScanning(true);
        startScanningLoop();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can use manual token entry below.');
      setMode('manual');
    }
  };

  const stopCamera = () => {
    setScanning(false);
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
    // Check if BarcodeDetector is supported in browser
    if ('BarcodeDetector' in window) {
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
          // ignore detector frame errors
        }
        animFrameRef.current = requestAnimationFrame(detect);
      };
      animFrameRef.current = requestAnimationFrame(detect);
    }
  };

  const handleDetectedCode = async (rawText) => {
    if (verifying) return;
    submitToken(rawText);
  };

  const submitToken = async (tokenString) => {
    const code = tokenString || manualToken;
    if (!code || !code.trim()) {
      toast.error('Please provide a valid token or scan a QR code.');
      return;
    }

    try {
      setVerifying(true);
      const loader = toast.loading('Verifying attendance token...');
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
        toast('Already marked present!', { icon: 'ℹ️' });
      } else {
        toast.success(res.data.message || 'Attendance verified!');
      }

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      toast.dismiss();
      const errMessage = err.response?.data?.error || 'Failed to verify attendance. Please try again.';
      toast.error(errMessage, { duration: 5000 });
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#070C18] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer z-20"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center space-y-1 mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-black tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1">
              <QrCode size={12} />
              <span>Event Attendance Scanner</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              Scan Attendance QR
            </h3>
            <p className="text-xs text-slate-400">
              Point your camera at the event / sub-event attendance QR code
            </p>
          </div>

          {/* Tab switcher: Camera vs Manual */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 mb-5">
            <button
              onClick={() => {
                setResult(null);
                setMode('camera');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera size={14} />
              <span>Live Camera</span>
            </button>
            <button
              onClick={() => {
                setResult(null);
                setMode('manual');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key size={14} />
              <span>Manual Code</span>
            </button>
          </div>

          {/* Result State View */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-6 rounded-2xl border mb-5 text-center space-y-3 ${
                result.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-100'
              }`}
            >
              <div className="flex justify-center">
                {result.success ? (
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                    <CheckCircle2 size={36} />
                  </div>
                ) : (
                  <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                    <AlertCircle size={36} />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-display-heavy text-lg font-black uppercase tracking-tight">
                  {result.success ? 'Attendance Verified!' : 'Verification Failed'}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {result.message || result.error}
                </p>
              </div>

              {result.success && (
                <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1 text-left font-mono">
                  {result.eventName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Event:</span>
                      <span className="font-bold text-white">{result.eventName}</span>
                    </div>
                  )}
                  {result.subEventName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sub-Event:</span>
                      <span className="font-bold text-blue-400">{result.subEventName}</span>
                    </div>
                  )}
                  {result.participantName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Participant:</span>
                      <span className="font-bold text-white">{result.participantName}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setResult(null);
                  if (mode === 'camera') startCamera();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Scan Another</span>
              </button>
            </motion.div>
          )}

          {/* Camera View Finder */}
          {!result && mode === 'camera' && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square sm:aspect-[4/3] flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {/* Laser Radar Scan Effect */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-blue-500/60 rounded-3xl overflow-hidden">
                  {/* Glowing corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

                  {/* Animated laser line */}
                  <motion.div
                    animate={{ y: [0, 220, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]"
                  />
                </div>
              </div>

              {/* Camera Switch button */}
              <button
                onClick={toggleCameraFacing}
                className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-black/80 transition cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          {/* Manual Entry View */}
          {!result && mode === 'manual' && (
            <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Attendance Token / Code
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. ATT-D9F4392842..."
                  className="w-full px-4 py-3 bg-[#070C18] border border-slate-700 rounded-xl text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <button
                onClick={() => submitToken(manualToken)}
                disabled={verifying || !manualToken.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
              >
                <span>Verify Attendance</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Footnote */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-400" />
              <span>Team Mavericks Verified Event Verification Protocol</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QrScannerModal;
