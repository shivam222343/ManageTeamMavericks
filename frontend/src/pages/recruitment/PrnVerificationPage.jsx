import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  Mail,
  Phone,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';

const PrnVerificationPage = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [prnInput, setPrnInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [candidateData, setCandidateData] = useState(null);
  const [formSections, setFormSections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors }
  } = useForm();

  // OTP verification states
  const [prnOtpRequired, setPrnOtpRequired] = useState(true);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pendingData, setPendingData] = useState(null);

  // OTP Countdown Timer
  React.useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!candidateData || !candidateData.email) {
      toast.error('Registered email not found for this candidate'); return;
    }
    setOtpSending(true);
    try {
      await axios.post('/applicants/send-otp', { email: candidateData.email, campaign_id: candidateData.campaign_id });
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success(`OTP sent to registered email (${candidateData.email})`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit OTP code'); return;
    }
    setOtpVerifying(true);
    try {
      await axios.post('/applicants/verify-otp', { email: candidateData.email, campaign_id: candidateData.campaign_id, otp: otpCode });
      setOtpModalOpen(false);
      setOtpVerified(true);
      toast.success('Email verified successfully! Submitting form…', { icon: '✅' });
      if (pendingData) {
        doFinalUpload(pendingData);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP. Please check and try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 1: Verify PRN Number or Registered Email
  const handleVerifyPrn = async (e) => {
    e.preventDefault();
    if (!prnInput.trim()) {
      toast.error('Please enter your registered PRN number or Email');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    setIsVerified(false);

    try {
      const res = await axios.get(`/applicants/verify-prn?prn=${encodeURIComponent(prnInput.trim())}`);
      if (res.data && res.data.verified) {
        setIsVerified(true);
        setCandidateData(res.data.candidate);
        setFormSections(res.data.formStructure || []);
        if (res.data.prn_otp_required !== undefined) {
          setPrnOtpRequired(!!res.data.prn_otp_required);
        }
        toast.success(`Verification successful! Welcome ${res.data.candidate.full_name}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'PRN or Email not found in registered candidates list. Submission disabled.';
      setErrorMsg(msg);
      setIsVerified(false);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Handle Enabled Form Fields Submission — trigger OTP modal if enabled and not verified
  const onFormSubmit = async (data) => {
    if (!isVerified || !candidateData) {
      toast.error('Submission disabled. You must verify your registered PRN or Email first.');
      return;
    }

    if (prnOtpRequired && !otpVerified) {
      setPendingData(data);
      setOtpModalOpen(true);
      handleSendOtp();
      return;
    }

    doFinalUpload(data);
  };

  const doFinalUpload = async (data) => {
    setSubmitting(true);
    const fd = new FormData();
    fd.append('campaign_id', candidateData.campaign_id);
    fd.append('full_name', candidateData.full_name);
    fd.append('prn', candidateData.prn);
    fd.append('email', candidateData.email);
    fd.append('phone', candidateData.phone);
    fd.append('is_prn_portal', 'true');

    // Append fields
    formSections.forEach(sec => {
      sec.fields.forEach(f => {
        const key = `field_${f.id}`;
        if (['file', 'image', 'resume', 'pdf', 'id_card'].includes(f.field_type)) {
          if (data[key] && data[key][0]) {
            fd.append(key, data[key][0]);
          }
        } else if (f.field_type === 'checkbox') {
          const val = data[key];
          fd.append(key, Array.isArray(val) ? val.join(', ') : (val || ''));
        } else {
          fd.append(key, data[key] || '');
        }
      });
    });

    try {
      await axios.post('/applicants/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Form submitted successfully!');
      setSubmittedSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit form. Please check mandatory fields.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white transition-colors duration-200">

      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Logos/Mavericks_Logo.png"
              alt="Team Mavericks Logo"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-none">Team Mavericks</h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Candidate PRN / Email Verification Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Official Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">

        {/* Verification Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm mb-8">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-800">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Candidate Verification</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter your registered PRN or Email to verify your candidate status and access form fields enabled by your coordinator.
            </p>
          </div>

          <form onSubmit={handleVerifyPrn} className="mt-6 max-w-lg mx-auto space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  value={prnInput}
                  onChange={(e) => setPrnInput(e.target.value)}
                  placeholder="Enter PRN Number or Registered Email"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  disabled={verifying || isVerified}
                />
              </div>
              <button
                type="submit"
                disabled={verifying || isVerified}
                className="px-6 py-3 border-2 border-blue-600 hover:border-blue-500 bg-transparent hover:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs rounded-xl transition flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {verifying ? (
                  <span>Verifying...</span>
                ) : isVerified ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <span>Verify Candidate</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            {/* Error prompt */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2 font-medium"
              >
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Verified Candidate Summary Banner */}
            {isVerified && candidateData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    Candidate Registered & Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsVerified(false); setCandidateData(null); setPrnInput(''); setSubmittedSuccess(false); }}
                    className="text-[11px] underline text-emerald-800 dark:text-emerald-400 font-bold hover:text-emerald-900 cursor-pointer"
                  >
                    Change PRN / Email
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5"><User size={13} className="text-emerald-600" /> <span className="font-bold">{candidateData.full_name}</span></div>
                  <div className="flex items-center gap-1.5"><Mail size={13} className="text-emerald-600" /> <span>{candidateData.email}</span></div>
                  <div className="flex items-center gap-1.5"><Phone size={13} className="text-emerald-600" /> <span>{candidateData.phone}</span></div>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Enabled Form Fields Section */}
        {isVerified && !submittedSuccess && (
          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(onFormSubmit)}
            className="space-y-6"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <span>Coordinator Enabled Form Fields</span>
              </h3>
              <span className="text-xs text-zinc-500">Only enabled fields are displayed below</span>
            </div>

            {formSections.filter(s => s.fields && s.fields.length > 0).length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                No extra custom fields enabled by coordinator. Click Submit Form to proceed.
              </div>
            ) : (
              formSections.filter(s => s.fields && s.fields.length > 0).map((section) => (
                <div
                  key={section.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4"
                >
                  <div>
                    <h4 className="font-bold text-base text-zinc-800 dark:text-zinc-200">{section.name}</h4>
                    {section.description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{section.description}</p>}
                  </div>

                  <div className="space-y-4 pt-2">
                    {section.fields.map((field) => {
                      const fieldKey = `field_${field.id}`;
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                          </label>

                          {/* Field Types */}
                          {['text', 'email', 'phone', 'prn'].includes(field.field_type) && (
                            <input
                              type={field.field_type === 'email' ? 'email' : 'text'}
                              placeholder={field.placeholder || ''}
                              {...register(fieldKey, { required: field.is_required ? `${field.label} is required` : false })}
                              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          )}

                          {field.field_type === 'textarea' && (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder || ''}
                              {...register(fieldKey, { required: field.is_required ? `${field.label} is required` : false })}
                              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          )}

                          {field.field_type === 'dropdown' && (
                            <select
                              {...register(fieldKey, { required: field.is_required ? `${field.label} is required` : false })}
                              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="">Select option...</option>
                              {(field.options || []).map(opt => (
                                <option key={opt.id || opt.option_value} value={opt.option_value}>
                                  {opt.option_label || opt.option_value}
                                </option>
                              ))}
                            </select>
                          )}

                          {['file', 'image', 'resume', 'pdf', 'id_card'].includes(field.field_type) && (
                            <div className="p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                              <input
                                type="file"
                                {...register(fieldKey, { required: field.is_required ? `${field.label} is required` : false })}
                                className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                              />
                            </div>
                          )}

                          {field.help_text && (
                            <p className="text-[10px] text-zinc-400">{field.help_text}</p>
                          )}
                          {errors[fieldKey] && (
                            <p className="text-[11px] text-red-500 font-medium">{errors[fieldKey].message}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Submit Button Enabled Only If Verified */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 border-2 border-blue-600 hover:border-blue-500 bg-transparent hover:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-black text-sm rounded-2xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Submitting Form...</span>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Form</span>
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Lock Notice if not verified */}
        {!isVerified && (
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <Lock className="mx-auto text-zinc-400" size={32} />
            <h4 className="font-bold text-sm text-zinc-600 dark:text-zinc-400">Form Submission Locked</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Please enter and verify your registered PRN or Email above to unlock form fields enabled by coordinator and submit your form.
            </p>
          </div>
        )}

        {/* Success Modal / Banner */}
        {submittedSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-8 text-center space-y-4 shadow-xl"
          >
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300">Form Submitted Successfully!</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Your details and document attachments have been stored and backed up safely. Thank you for completing your registration form.
            </p>
          </motion.div>
        )}

        {/* ===== OTP VERIFICATION MODAL ===== */}
        {otpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">Registered Email OTP Verification</h3>
                    <p className="text-[10px] text-zinc-500 font-medium">Verification required before document upload.</p>
                  </div>
                </div>
                <button
                  onClick={() => setOtpModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold p-1 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">Registered Candidate Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={candidateData?.email || ''}
                      disabled
                      className="flex-1 h-11 px-3.5 rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-900 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950 dark:text-white disabled:opacity-80 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || (otpSent && otpCountdown > 0)}
                      className="h-11 px-4 border-2 border-blue-600 hover:border-blue-500 bg-transparent hover:bg-blue-600/10 text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {otpSending ? 'Sending…' : otpSent && otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-4">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      OTP sent to <span className="font-bold text-zinc-800 dark:text-white">{candidateData?.email}</span>
                    </p>
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">Enter 6-Digit OTP Code</label>
                      <input
                        type="text"
                        placeholder="• • • • • •"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-12 px-4 text-2xl font-black tracking-[0.5em] rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white transition-all text-center"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otpCode.length !== 6}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {otpVerifying ? 'Verifying OTP…' : 'Verify OTP & Submit Form'}
                    </button>
                  </div>
                )}

                <p className="text-[9px] text-zinc-500 text-center font-medium">OTP is sent to the email address registered with your PRN.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default PrnVerificationPage;
