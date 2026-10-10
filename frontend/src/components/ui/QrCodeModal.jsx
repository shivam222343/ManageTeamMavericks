import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Download, Printer, QrCode, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const QrCodeModal = ({ isOpen, onClose, title, subtitle, token, qrPayload, eventName, subEventName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dataString = qrPayload || token || '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=15&format=png&data=${encodeURIComponent(dataString)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(token || dataString);
    setCopied(true);
    toast.success('Token copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `Attendance_QR_${(subEventName || eventName || 'event').replace(/\s+/g, '_')}.png`;
    link.target = '_blank';
    link.click();
    toast.success('Downloading QR Code image...');
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Attendance QR Code'} - Team Mavericks</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px 20px; color: #0f172a; background: #fff; }
            .badge { display: inline-block; padding: 6px 16px; background: #eff6ff; color: #2563eb; font-weight: 800; border-radius: 9999px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #bfdbfe; }
            h1 { font-size: 28px; margin: 16px 0 6px; font-weight: 900; text-transform: uppercase; }
            h2 { font-size: 18px; color: #475569; margin: 0 0 24px; font-weight: 600; }
            .qr-card { max-width: 420px; margin: 0 auto; padding: 24px; border: 2px dashed #94a3b8; border-radius: 20px; background: #fafafa; }
            img { width: 280px; height: 280px; border-radius: 12px; margin: 12px 0; }
            .token-box { background: #0f172a; color: #fff; padding: 10px 16px; font-family: monospace; font-size: 16px; font-weight: 800; border-radius: 8px; margin: 16px 0; letter-spacing: 2px; }
            .instructions { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 16px; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; }
          </style>
        </head>
        <body>
          <div class="badge">Team Mavericks Official Event Attendance</div>
          <h1>${eventName || 'Event Attendance'}</h1>
          ${subEventName ? `<h2>Sub-Event: ${subEventName}</h2>` : `<h2>Official Verification Desk</h2>`}
          <div class="qr-card">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #475569;">Scan with Participant Portal</p>
            <img src="${qrUrl}" alt="Attendance QR Code" />
            <div class="token-box">${token}</div>
            <div class="instructions">
              Open your <strong>Participant Dashboard</strong> on mobile and tap <strong>Scan Attendance QR</strong> to register your presence.
            </div>
          </div>
          <div class="footer">KIT's College of Engineering, Kolhapur • Powered by Team Mavericks</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-[#0E172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-blue/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center space-y-1.5 mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-black tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-1">
              <QrCode size={12} />
              <span>Live Attendance QR</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">{title || 'Attendance QR Code'}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{subtitle}</p>
            )}
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#070C18] border border-slate-200 dark:border-slate-800/80 rounded-2xl relative shadow-inner">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
              <img
                src={qrUrl}
                alt="Attendance QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl select-none"
              />
            </div>

            {/* Token Badge with Copy */}
            <div className="mt-4 flex items-center gap-2 px-3.5 py-2 bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Token:</span>
              <span className="font-mono font-black text-xs text-primary-blue tracking-wider">{token}</span>
              <button
                onClick={handleCopy}
                className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                title="Copy Token"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
            Participants can scan this code from their <strong>Participant Portal</strong> to automatically record their attendance.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-blue-600 transition cursor-pointer shadow-md shadow-primary-blue/20"
            >
              <Printer size={14} />
              <span>Print Poster</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QrCodeModal;
