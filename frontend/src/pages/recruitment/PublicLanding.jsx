import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChevronDown,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import AboutEventsSection from './components/AboutEventsSection';

gsap.registerPlugin(ScrollTrigger);

const PublicLanding = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [domains, setDomains] = useState([]);
  const [formStructure, setFormStructure] = useState([]);
  const [activeStep, setActiveStep] = useState(0); // For multi-step sections
  const [submitting, setSubmitting] = useState(false);
  const [checkingNextStep, setCheckingNextStep] = useState(false);

  // OTP verification state — modal shown at submit time
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pendingFormData, setPendingFormData] = useState(null); // held until OTP verified
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // FAQ state and toggles
  const [faqs, setFaqs] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [campaignClosed, setCampaignClosed] = useState(false);

  // GSAP Refs
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const timerRef = useRef(null);

  // Form initialization
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    setError,
    trigger,
    reset,
    formState: { errors }
  } = useForm();

  // Watch fields for local auto-save and duplicate checks
  const formValues = watch();

  // Fetch campaign structure
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await axios.get(`/campaigns/public/${slug}`);
        setCampaign(res.data.campaign);
        setDomains(res.data.domains);
        setFormStructure(res.data.formStructure);
        setOtpRequired(res.data.otp_required === 'true' || res.data.otp_required === true);

        // Fetch FAQs
        try {
          const faqRes = await axios.get(`/campaigns/${res.data.campaign.id}/faqs`);
          if (Array.isArray(faqRes.data)) {
            setFaqs(faqRes.data);
          }
        } catch (faqErr) {
          console.error("Failed to load campaign FAQs:", faqErr);
        }

        // Load auto-saved draft
        const draftKey = `draft_form_${res.data.campaign.id}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          Object.keys(parsed).forEach(key => {
            if (key !== 'resume' && key !== 'id_card') { // Don't auto-fill files
              setValue(key, parsed[key]);
            }
          });
          toast.success('Restored your draft registration data!', { icon: '📝' });
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Recruitment campaign is currently inactive.');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug, setValue]);

  // Autosave progress draft
  useEffect(() => {
    if (campaign && Object.keys(formValues).length > 0) {
      const draftKey = `draft_form_${campaign.id}`;
      // Clean file references from draft
      const sanitised = { ...formValues };
      Object.keys(sanitised).forEach(k => {
        if (sanitised[k] instanceof FileList || sanitised[k] instanceof File) {
          delete sanitised[k];
        }
      });
      localStorage.setItem(draftKey, JSON.stringify(sanitised));
    }
  }, [formValues, campaign]);

  const handleClearDraft = () => {
    if (!campaign) return;
    setShowClearConfirmModal(true);
  };

  const confirmClearDraft = () => {
    const draftKey = `draft_form_${campaign.id}`;
    localStorage.removeItem(draftKey);
    reset();
    setShowClearConfirmModal(false);
    toast.success('Form fields cleared!');
  };

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!otpEmail || !/\S+@\S+\.\S+/.test(otpEmail)) {
      toast.error('Please enter a valid email address'); return;
    }
    setOtpSending(true);
    try {
      await axios.post('/applicants/send-otp', { email: otpEmail, campaign_id: campaign.id });
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success('OTP sent! Check your email inbox.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit OTP'); return;
    }
    setOtpVerifying(true);
    try {
      await axios.post('/applicants/verify-otp', { email: otpEmail, campaign_id: campaign.id, otp: otpCode });
      setOtpModalOpen(false);
      setOtpVerified(true);
      toast.success('Email verified! Submitting your application…', { icon: '✅' });
      // Pre-fill email field in form if found
      formStructure.forEach(sec => sec.fields.forEach(f => {
        if (f.field_type === 'email') setValue(`field_${f.id}`, otpEmail);
      }));
      // Auto-submit with the held form data
      if (pendingFormData) {
        doSubmit(pendingFormData, otpEmail);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  // Countdown timer routine
  useEffect(() => {
    if (!campaign) return;

    const timer = setInterval(() => {
      const difference = +new Date(campaign.deadline) - +new Date();

      if (difference <= 0) {
        clearInterval(timer);
        setCampaignClosed(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign]);

  // GSAP Intro animation
  useEffect(() => {
    if (!loading && campaign) {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.2 }
      );
      gsap.fromTo(descRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.4 }
      );
      gsap.fromTo(timerRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.6 }
      );

      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, campaign]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow">
          <AlertCircle className="mx-auto text-red-500" size={32} />
          <h2 className="text-xl font-bold">Campaign Inactive</h2>
          <p className="text-xs text-zinc-500">This recruitment drive is either closed or does not exist.</p>
        </div>
      </div>
    );
  }

  // ── Build FormData from react-hook-form data ───────────────────────────────
  const buildFormData = (data) => {
    let fullNameVal = data.full_name;
    let prnVal = data.prn;
    let emailVal = data.email;
    let phoneVal = data.phone;

    formStructure.forEach((sec) => {
      sec.fields.forEach((field) => {
        const val = data[`field_${field.id}`];
        if (field.field_type === 'text' && field.label.toLowerCase().includes('name')) {
          fullNameVal = val;
        } else if (field.field_type === 'prn') {
          prnVal = val;
        } else if (field.field_type === 'email') {
          emailVal = val;
        } else if (field.field_type === 'phone') {
          phoneVal = val;
        }
      });
    });

    const fd = new FormData();
    fd.append('campaign_id', campaign.id);
    fd.append('full_name', fullNameVal || '');
    fd.append('prn', prnVal || '');
    fd.append('email', emailVal || '');
    fd.append('phone', phoneVal || '');

    formStructure.forEach((sec) => {
      sec.fields.forEach((field) => {
        const key = `field_${field.id}`;
        if (['file', 'image', 'resume', 'pdf', 'id_card'].includes(field.field_type)) {
          if (data[key] && data[key][0]) fd.append(key, data[key][0]);
        } else if (field.field_type === 'checkbox') {
          const checkedVal = data[key];
          let finalVal = Array.isArray(checkedVal) ? checkedVal.join(', ') : (checkedVal || '');
          const otherText = data[`${key}_other_text`];
          if (otherText) {
            finalVal += ` (Other: ${otherText})`;
          }
          fd.append(key, finalVal);
        } else {
          fd.append(key, data[key] || '');
        }
      });
    });

    const selectedDomains = data.preferred_domains || [];
    fd.append('domains', JSON.stringify(selectedDomains));
    return { fd, emailVal };
  };

  // ── Actual submit (called after OTP verified or directly if OTP not required) ─
  const doSubmit = async (formDataObj, resolvedEmail) => {
    setSubmitting(true);
    const loader = toast.loading('Submitting your registration form...');
    try {
      const res = await axios.post('/applicants/apply', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.dismiss(loader);
      toast.success('Registration successful!', { icon: '🎉' });
      localStorage.removeItem(`draft_form_${campaign.id}`);
      navigate('/teammavericks/apply-success', {
        state: {
          application_id: res.data.application_id,
          name: resolvedEmail,
          campaign_name: campaign.name,
          thank_you_message: campaign.thank_you_message
        }
      });
    } catch (err) {
      toast.dismiss(loader);
      setSubmitting(false);
      const errMsg = err.response?.data?.error || 'Failed to submit application. Ensure all fields are filled.';
      let mapped = false;
      const lowerErr = errMsg.toLowerCase();
      let targetFieldType = null;
      if (lowerErr.includes('prn')) targetFieldType = 'prn';
      else if (lowerErr.includes('email')) targetFieldType = 'email';
      else if (lowerErr.includes('phone') || lowerErr.includes('contact number')) targetFieldType = 'phone';
      else if (lowerErr.includes('name')) targetFieldType = 'text';

      if (targetFieldType) {
        for (const sec of formStructure) {
          for (const field of sec.fields) {
            if (field.field_type === targetFieldType || (targetFieldType === 'text' && field.label.toLowerCase().includes('name'))) {
              setError(`field_${field.id}`, { type: 'server', message: errMsg });
              mapped = true; break;
            }
          }
          if (mapped) break;
        }
      }
      if (!mapped) {
        for (const sec of formStructure) {
          for (const field of sec.fields) {
            if (lowerErr.includes(field.label.toLowerCase())) {
              setError(`field_${field.id}`, { type: 'server', message: errMsg });
              mapped = true; break;
            }
          }
          if (mapped) break;
        }
      }
      if (!mapped) toast.error(errMsg);
      else toast.error('Please correct the highlighted errors in the form.');
    }
  };

  // ── Form submission gate: OTP intercept ───────────────────────────────────
  const onSubmitForm = async (data) => {
    const { fd, emailVal } = buildFormData(data);

    if (otpRequired && !otpVerified) {
      if (emailVal) setOtpEmail(emailVal);
      setPendingFormData(fd);
      setOtpModalOpen(true);
      return;
    }
    await doSubmit(fd, emailVal);
  };

  // Stepper triggers with section field validation & DB duplicate credential checks
  const nextStep = async () => {
    const currentSection = formStructure[activeStep];
    const sectionFields = currentSection ? currentSection.fields : [];
    
    const fieldKeysToValidate = [];
    sectionFields.forEach(f => {
      if (f.field_type === 'checkbox' && f.label === 'Preferred Domains') {
        fieldKeysToValidate.push('preferred_domains');
      } else {
        fieldKeysToValidate.push(`field_${f.id}`);
      }
    });

    const isValid = await trigger(fieldKeysToValidate);
    if (!isValid) {
      toast.error('Please fix the highlighted errors before proceeding.');
      return;
    }

    let prnVal = '';
    let emailVal = '';
    let phoneVal = '';
    
    formStructure.forEach(sec => {
      sec.fields.forEach(f => {
        const val = formValues[`field_${f.id}`];
        if (f.field_type === 'prn' && val) prnVal = val;
        if (f.field_type === 'email' && val) emailVal = val;
        if (f.field_type === 'phone' && val) phoneVal = val;
      });
    });

    setCheckingNextStep(true);
    try {
      await axios.post('/applicants/check-credentials', {
        campaign_id: campaign.id,
        prn: prnVal,
        email: emailVal,
        phone: phoneVal
      });
    } catch (err) {
      setCheckingNextStep(false);
      const errMsg = err.response?.data?.error || 'Validation error.';
      const fieldErr = err.response?.data?.field;
      if (fieldErr) {
        formStructure.forEach(sec => {
          sec.fields.forEach(f => {
            if (f.field_type === fieldErr) {
              setError(`field_${f.id}`, { type: 'server', message: errMsg });
            }
          });
        });
      }
      toast.error(errMsg);
      return;
    }
    setCheckingNextStep(false);

    if (activeStep < formStructure.length - 1) {
      setActiveStep(prev => prev + 1);
      window.scrollTo({ top: document.getElementById('apply-form').offsetTop - 100, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      window.scrollTo({ top: document.getElementById('apply-form').offsetTop - 100, behavior: 'smooth' });
    }
  };

  const renderDigit = (value, label) => (
    <div className="flex flex-col items-center min-w-[70px] sm:min-w-[105px] md:min-w-[125px]">
      <span className={`font-bebas font-bold text-[54px] sm:text-[80px] md:text-[96px] leading-none tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#0B0F2B]'}`}>
        <motion.span
          key={value}
          initial={{ opacity: 0.7, scale: 0.98, filter: isDark ? 'drop-shadow(0 0 10px rgba(91,125,255,0))' : 'none' }}
          animate={{
            opacity: [0.7, 1, 1],
            scale: [0.98, 1, 1],
            filter: isDark ? [
              'drop-shadow(0 0 12px rgba(91,125,255,0.7))',
              'drop-shadow(0 0 4px rgba(91,125,255,0.2))',
              'drop-shadow(0 0 1px rgba(255,255,255,0.05))'
            ] : [
              'drop-shadow(0 0 0px transparent)',
              'drop-shadow(0 0 0px transparent)',
              'drop-shadow(0 0 0px transparent)'
            ]
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="inline-block"
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </span>
      <span className={`font-sans text-[9px] sm:text-[11px] md:text-[14px] font-semibold tracking-[4px] uppercase mt-2 transition-colors duration-300 ${isDark ? 'text-white/45' : 'text-[#0B0F2B]/60'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden transition-all duration-500 selection:bg-blue-600/30 selection:text-white ${isDark ? 'bg-[#04040C] text-white' : 'bg-[#FFFFFF] text-zinc-900'}`}
      style={{
        background: isDark
          ? 'radial-gradient(circle at top, #11183A 0%, #090A18 35%, #04040C 100%)'
          : 'radial-gradient(circle at top, #F3F6FF 0%, #F8FAFC 50%, #FFFFFF 100%)'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        .font-handwritten {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* Grain overlay */}
      <div className={`absolute inset-0 bg-noise pointer-events-none z-0 transition-opacity duration-500 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.012]'}`} />

      {/* Ambient background glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] pointer-events-none z-0 animate-breathe transition-colors duration-500 ${isDark ? 'bg-[#8B5CF6]/5' : 'bg-[#8B5CF6]/3'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[140px] pointer-events-none z-0 animate-breathe transition-colors duration-500 ${isDark ? 'bg-[#3B82FF]/5' : 'bg-[#3B82FF]/3'}`} style={{ animationDelay: '4s' }} />

      {/* --- Public Header Navigation --- */}
      <header className={`sticky top-0 z-40 h-[76px] border-b bg-transparent backdrop-blur-[18px] flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${isDark ? 'border-white/4' : 'border-zinc-200/50'}`}>
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

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-full border transition-all duration-300 cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'}`}
            title="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            href="#apply-form"
            className="h-[48px] px-[28px] bg-gradient-to-r from-[#2B5CFF] to-[#8C3AFF] text-white rounded-[14px] text-sm font-satoshi font-semibold flex items-center justify-center transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(85,105,255,0.4)]"
          >
            Apply Now ↗
          </a>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section ref={heroRef} className="py-16 md:py-24 px-6 text-center w-full relative z-10 flex flex-col items-center max-w-[1400px] mx-auto min-h-[calc(100vh-76px)] justify-center">

        {/* Background Eagle Logo */}
        <img
          src="/Logos/Mavericks_Logo.png"
          alt="Mavericks Eagle Logo"
          className="absolute right-[-12%] top-[5%] w-[65%] max-w-[850px] h-auto pointer-events-none select-none blur-[2px] z-0 transition-all duration-500"
          style={{
            opacity: isDark ? 0.08 : 0.07,
            filter: isDark ? 'brightness(0) invert(1)' : 'none'
          }}
        />

        {/* Cinematic lighting radial glow */}
        <div className={`absolute top-[20%] left-1/2 -translate-x-1/2 w-[70vw] h-[35vw] max-w-[800px] rounded-full blur-[180px] pointer-events-none z-0 transition-colors duration-500 ${isDark ? 'bg-[#3B74FF]/14' : 'bg-[#3B74FF]/8'}`} />

        {/* Floating comments absolute block */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden md:block w-full">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
            className={`absolute top-[18%] left-[3vw] lg:left-[6vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten -rotate-3 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            Only a couple of days left until the big reveal! 🚀
          </motion.div>

          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className={`absolute top-[52%] left-[1.5vw] lg:left-[3vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten rotate-2 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            Just a few more days! The excitement is real! ✨
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className={`absolute top-[80%] left-[3vw] lg:left-[5vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten -rotate-2 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            The countdown is on! Who else can't wait? ⏳
          </motion.div>

          <motion.div
            animate={{ y: [0, -11, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className={`absolute top-[22%] right-[3vw] lg:right-[6vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten rotate-4 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            Only a few days to go. I'm so ready for this! 💪
          </motion.div>

          <motion.div
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
            className={`absolute top-[56%] right-[1.5vw] lg:right-[3vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten -rotate-3 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            Just a couple of days to go! 📓✨
          </motion.div>

          <motion.div
            animate={{ y: [0, -13, 0] }}
            transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className={`absolute top-[82%] right-[3vw] lg:right-[5vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten rotate-3 underline decoration-2 underline-offset-4 transition-colors duration-300 ${isDark ? 'text-white opacity-90 decoration-[#3B82FF]/60' : 'text-[#0B0F2B] decoration-[#3B82FF]/40'}`}
          >
            So excited for the announcement! 🚀
          </motion.div>
        </div>

        {/* Central Content */}
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10 w-full">
          <h1
            ref={titleRef}
            className={`font-clash font-[900] text-[48px] sm:text-[96px] md:text-[128px] tracking-[-3px] sm:tracking-[-5px] leading-[0.82] uppercase mb-[32px] select-none transition-colors duration-300 ${isDark ? 'text-white' : 'text-[#0B0F2B]'}`}
          >
            WE ARE <br />
            <span
              className={`text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-[#4E8DFF] via-[#7D5BFF] to-[#C15DFF]' : 'from-[#1D4ED8] via-[#3B82F6] to-[#60A5FA]'}`}
              style={{ textShadow: isDark ? '0 0 40px rgba(125,91,255,0.25)' : 'none' }}
            >
              HIRING!
            </span>
          </h1>

          <p
            ref={descRef}
            className={`font-satoshi text-base sm:text-xl md:text-2xl max-w-2xl leading-relaxed mb-12 font-medium transition-colors duration-300 ${isDark ? 'text-white/70' : 'text-zinc-600'}`}
          >
            {campaign.description || 'Join Team Mavericks, the premier student organization of KIT College of Engineering, Kolhapur!'}
          </p>

          {/* Countdown Clock Display */}
          <div ref={timerRef} className="flex items-center justify-center gap-2 sm:gap-6 md:gap-8 mb-16 select-none">
            {renderDigit(timeLeft.days, 'Days')}
            <span className={`font-bebas text-[36px] sm:text-[60px] md:text-[72px] font-bold leading-none -mt-4 transition-colors duration-300 ${isDark ? 'text-white/30' : 'text-zinc-300'}`}>:</span>
            {renderDigit(timeLeft.hours, 'Hours')}
            <span className={`font-bebas text-[36px] sm:text-[60px] md:text-[72px] font-bold leading-none -mt-4 transition-colors duration-300 ${isDark ? 'text-white/30' : 'text-zinc-300'}`}>:</span>
            {renderDigit(timeLeft.minutes, 'Mins')}
            <span className={`font-bebas text-[36px] sm:text-[60px] md:text-[72px] font-bold leading-none -mt-4 transition-colors duration-300 ${isDark ? 'text-white/30' : 'text-zinc-300'}`}>:</span>
            {renderDigit(timeLeft.seconds, 'Secs')}
          </div>

          <motion.a
            href="#apply-form"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer transition-all duration-300 ${isDark ? 'bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(0,224,255,0.25)] hover:bg-white/10' : 'bg-white border border-zinc-200 shadow-md hover:bg-zinc-50'}`}
          >
            <ChevronDown size={24} className={isDark ? 'text-[#00E0FF]' : 'text-blue-600'} />
          </motion.a>
        </div>
      </section>

      {/* --- About / Motto Section --- */}
      <AboutEventsSection isDark={isDark} />

      {/* --- Dynamic Registration Form (Shivam's Original Form UI Structure) --- */}
      <section id="apply-form" className="py-24 px-6 bg-blue-50/10 dark:bg-zinc-950/10 border-t border-blue-50/40 dark:border-zinc-900/40 relative z-10">
        <div className="max-w-2xl mx-auto space-y-10">
          {campaign.status === 'closed' || campaignClosed ? (
            <div className="p-8 border rounded-3xl shadow-2xl space-y-5 text-center bg-white/70 border-white/80 dark:bg-zinc-950/60 dark:border-zinc-900">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-500/20">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Recruitment is Closed</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs font-medium leading-relaxed max-w-md mx-auto">
                {campaign.closed_message || 'Recruitment is currently closed. Thank you for your interest in Team Mavericks!'}
                <br />
                <span className="mt-3 block text-blue-600 dark:text-blue-500 font-bold">Please contact the club admin or members for further inquiries.</span>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <span className="text-[10px] text-blue-800/80 dark:text-zinc-500 uppercase tracking-widest font-black">Start your application</span>
                <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Candidate Registration</h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Fill out this dynamic form. Your progress will auto-save as you type.</p>
              </div>

              {/* Stepper Progress Bar */}
              <div className="flex justify-between items-center gap-1.5 text-[9px] font-black text-zinc-500 dark:text-zinc-500 tracking-widest font-mono uppercase select-none">
                {formStructure.map((sec, idx) => (
                  <div key={sec.id} className="flex-1 flex flex-col gap-2 items-center">
                    <div className={`h-1.5 w-full rounded-full transition-colors duration-300 bg-zinc-200 dark:bg-zinc-800
                      ${idx <= activeStep ? 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500' : ''}
                    `}></div>
                    <span className={`hidden sm:inline truncate max-w-[80px] mt-0.5
                      ${idx === activeStep ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}
                    `}>{sec.name}</span>
                  </div>
                ))}
              </div>

              {/* Form Container */}
              <form onSubmit={handleSubmit(onSubmitForm)} className="border rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative bg-white/70 border-white/80 dark:bg-zinc-950/60 dark:border-zinc-900 shadow-blue-900/5 dark:shadow-none">
                
                {/* Section Title Header */}
                <div className="border-b border-zinc-100 dark:border-zinc-900 pb-4 flex justify-between items-center gap-4">
                  <div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase font-mono">
                      {formStructure[activeStep]?.name || `Step ${activeStep + 1}`}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-medium">{formStructure[activeStep]?.description || 'Please fill out all fields below accurately.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 hover:text-red-500 cursor-pointer flex items-center gap-1 transition"
                  >
                    Clear Section
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {formStructure[activeStep]?.fields.map((field) => {
                      const key = `field_${field.id}`;

                      // Preferred Domains Cards
                      if (field.field_type === 'checkbox' && field.label === 'Preferred Domains') {
                        return (
                          <div key={field.id} className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                              {field.label} {(field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? <span className="text-red-500">*</span> : null}
                            </label>
                            {field.description && (
                              <p className="text-[10px] text-zinc-500 font-medium leading-normal">{field.description}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {domains.map((dom) => {
                                const val = watch('preferred_domains');
                                const isSelected = Array.isArray(val) && val.includes(String(dom.id));
                                return (
                                  <label
                                    key={dom.id}
                                    className={`flex items-start gap-3 cursor-pointer text-xs border rounded-xl p-4 transition-all duration-200 select-none
                                      ${isSelected
                                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 dark:border-blue-500/5 dark:bg-blue-500/5 dark:text-white font-bold'
                                        : 'border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300'
                                      }
                                    `}
                                  >
                                    <input
                                      type="checkbox"
                                      value={String(dom.id)}
                                      {...register('preferred_domains', { required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? 'Please select at least one preferred domain.' : false })}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50 border-zinc-300 dark:border-zinc-800 mt-0.5 bg-zinc-950"
                                    />
                                    <div>
                                      <p className="font-bold text-xs">{dom.name}</p>
                                      <span className="text-[10px] text-zinc-500 dark:text-zinc-550 leading-normal font-medium mt-0.5 block">{dom.description}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            {errors.preferred_domains && (
                              <p className="mt-2 text-[10px] text-red-500 flex items-center gap-1.5 font-bold">
                                <AlertCircle size={12} />
                                <span>{errors.preferred_domains.message}</span>
                              </p>
                            )}
                          </div>
                        );
                      }

                      // Default Input Types
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                            {field.label} {(field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? <span className="text-red-500">*</span> : null}
                          </label>

                          {field.description && (
                            <p className="text-[10px] text-zinc-500 font-medium leading-normal">{field.description}</p>
                          )}

                          {/* 1. Single Line Inputs */}
                          {['text', 'email', 'phone', 'prn', 'url', 'number'].includes(field.field_type) && (() => {
                            const isPhone = field.field_type === 'phone' || (field.label || '').toLowerCase().includes('contact') || (field.label || '').toLowerCase().includes('mobile');
                            return (
                              <input
                                type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : isPhone ? 'tel' : 'text'}
                                placeholder={field.placeholder || (isPhone ? 'e.g. 9876543210' : '')}
                                maxLength={isPhone ? 10 : (field.validation_rules?.max || undefined)}
                                onInput={isPhone ? (e) => {
                                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  e.target.value = cleaned;
                                  setValue(key, cleaned);
                                } : undefined}
                                {...register(key, {
                                  required: field.is_required ? `${field.label} is required` : false,
                                  minLength: isPhone
                                    ? { value: 10, message: 'Mobile number must be exactly 10 digits.' }
                                    : field.validation_rules?.min ? { value: field.validation_rules.min, message: `Minimum ${field.validation_rules.min} characters` } : undefined,
                                  maxLength: isPhone
                                    ? { value: 10, message: 'Mobile number must be exactly 10 digits.' }
                                    : field.validation_rules?.max ? { value: field.validation_rules.max, message: `Maximum ${field.validation_rules.max} characters` } : undefined,
                                  pattern: isPhone
                                    ? { value: /^\d{10}$/, message: 'Mobile number must be exactly 10 digits.' }
                                    : field.validation_rules?.regex ? { value: new RegExp(field.validation_rules.regex), message: 'Invalid formatting value' } : undefined
                                })}
                                className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-white dark:placeholder-zinc-600
                                  ${errors[key] ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                                `}
                              />
                            );
                          })()}

                          {/* 2. Paragraph Field */}
                          {field.field_type === 'paragraph' && (
                            <textarea
                              placeholder={field.placeholder || ''}
                              rows="4"
                              {...register(key, {
                                required: field.is_required ? `${field.label} is required` : false,
                                minLength: field.validation_rules?.min ? { value: field.validation_rules.min, message: `Answer must be at least ${field.validation_rules.min} characters` } : undefined
                              })}
                              className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 resize-none bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-white dark:placeholder-zinc-600
                                ${errors[key] ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                              `}
                            />
                          )}

                          {/* 3. Dropdown Select */}
                          {field.field_type === 'dropdown' && (
                            <select
                              {...register(key, { required: field.is_required ? `${field.label} is required` : false })}
                              className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 bg-white border-zinc-300 text-zinc-900 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-white
                                ${errors[key] ? 'border-red-500/50' : ''}
                              `}
                            >
                              <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{field.placeholder || 'Select value...'}</option>
                              {field.options?.map((opt) => (
                                <option key={opt.id} value={opt.option_value} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">{opt.option_label}</option>
                              ))}
                            </select>
                          )}

                          {/* 4. Checkboxes with conditional "Other" text input */}
                          {field.field_type === 'checkbox' && (() => {
                            const otherOpt = field.options?.find(o => (o.option_label || '').toLowerCase() === 'other' || (o.option_value || '').toLowerCase() === 'other');
                            const checkedVals = watch(key);
                            const isOtherChecked = otherOpt && (Array.isArray(checkedVals) ? checkedVals.includes(otherOpt.option_value) : checkedVals === otherOpt.option_value);

                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {field.options?.map((opt) => {
                                    const val = watch(key);
                                    const isSelected = Array.isArray(val) && val.includes(opt.option_value);
                                    return (
                                      <label
                                        key={opt.id}
                                        className={`flex items-center gap-3 cursor-pointer text-xs border rounded-xl p-3.5 transition-all duration-200 select-none
                                          ${isSelected
                                            ? 'border-blue-600 bg-blue-50/50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-white font-bold'
                                            : 'border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300'
                                          }
                                        `}
                                      >
                                        <input
                                          type="checkbox"
                                          value={opt.option_value}
                                          {...register(key, { required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? 'Please select at least one option.' : false })}
                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50 border-zinc-300 dark:border-zinc-800 bg-zinc-950"
                                        />
                                        <span>{opt.option_label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {isOtherChecked && (
                                  <div className="mt-2.5 animate-fadeIn">
                                    <input
                                      type="text"
                                      placeholder="Please specify details for 'Other'..."
                                      {...register(`${key}_other_text`, {
                                        required: isOtherChecked ? "Please specify details for 'Other'" : false
                                      })}
                                      className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs font-medium bg-white dark:bg-zinc-900/40 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    />
                                    {errors[`${key}_other_text`] && (
                                      <p className="mt-1 text-[9px] text-red-500 font-bold px-2 flex items-center gap-1.5 animate-pulse">
                                        <AlertCircle size={11} />
                                        <span>{errors[`${key}_other_text`].message}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* 5. Radio Buttons */}
                          {field.field_type === 'radio' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {field.options?.map((opt) => {
                                const isSelected = watch(key) === opt.option_value;
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex items-center gap-3 cursor-pointer text-xs border rounded-xl p-3.5 transition-all duration-200 select-none
                                      ${isSelected
                                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-white font-bold'
                                        : 'border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300'
                                      }
                                    `}
                                  >
                                    <input
                                      type="radio"
                                      value={opt.option_value}
                                      {...register(key, { required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? 'Please select an option.' : false })}
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-500/50 border-zinc-300 dark:border-zinc-800 bg-zinc-950"
                                    />
                                    <span>{opt.option_label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* 6. File Upload Input */}
                          {['file', 'image', 'resume', 'pdf', 'id_card'].includes(field.field_type) && (
                            <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-4 bg-white/40 dark:bg-zinc-900/20 text-center space-y-2">
                              <input
                                type="file"
                                accept={field.field_type === 'pdf' || field.field_type === 'resume' ? '.pdf' : 'image/*,.pdf'}
                                {...register(key, { required: field.is_required ? `${field.label} is required` : false })}
                                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-zinc-800 dark:file:text-zinc-200 hover:file:bg-blue-100 dark:hover:file:bg-zinc-700 transition cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Inline Field Error Message */}
                          {errors[key] && (
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1.5 mt-1">
                              <AlertCircle size={12} />
                              <span>{errors[key].message}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Form Controls */}
                <div className="flex justify-between items-center pt-6 border-t border-zinc-100 dark:border-zinc-900 gap-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={activeStep === 0}
                    className="px-5 h-11 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/60 dark:text-zinc-300 rounded-xl text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <ChevronLeft size={14} /> Back
                  </button>

                  {activeStep < formStructure.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={checkingNextStep}
                      className="px-6 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {checkingNextStep ? (
                        <><RefreshCw size={14} className="animate-spin" /> Validating...</>
                      ) : (
                        <>Next Step <ChevronRight size={14} /></>
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
                      ) : (
                        <><CheckCircle size={14} /> Submit Application</>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ===== OTP MODAL INTERCEPT ===== */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06040f]/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">Email Verification Required</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Verify your email address before submitting.</p>
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
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)}
                    disabled={otpSent}
                    placeholder="your.email@example.com"
                    className="flex-1 h-11 px-3.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-white disabled:opacity-60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && otpCountdown > 0)}
                    className="h-11 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95 whitespace-nowrap shrink-0"
                  >
                    {otpSending ? 'Sending…' : otpSent && otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-500" />
                    OTP sent to <span className="font-bold text-zinc-800 dark:text-white">{otpEmail}</span>
                  </p>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 font-mono">6-Digit OTP Code</label>
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 px-4 text-2xl font-black tracking-[0.5em] rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-white transition-all text-center"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpCode.length !== 6}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {otpVerifying
                      ? <><RefreshCw size={13} className="animate-spin" /> Verifying…</>
                      : <><CheckCircle size={13} /> Verify &amp; Submit Application</>
                    }
                  </button>
                </div>
              )}

              <p className="text-[9px] text-zinc-500 text-center font-medium">Your data is auto-saved. Email verification is required once per session.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== CLEAR FORM CONFIRMATION MODAL ===== */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06040f]/80 backdrop-blur-sm">
          <div className="relative bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="text-center space-y-4 relative z-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mx-auto shadow-inner border border-blue-200/40">
                <AlertCircle size={22} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">Clear Form Data?</h3>
                <p className="text-xs font-medium text-zinc-550 max-w-xs mx-auto leading-relaxed">
                  Are you sure you want to clear your current progress and start fresh? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 h-11 border rounded-xl border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/60 dark:text-zinc-300 text-xs font-bold transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearDraft}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95"
              >
                Yes, Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FAQs Accordion --- */}
      <section className="py-24 max-w-3xl mx-auto px-6 space-y-10 relative z-10">
        <div className="text-center space-y-2">
          <span className="text-[10px] text-blue-800/80 dark:text-zinc-500 uppercase tracking-widest font-black">Have Questions?</span>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border rounded-2xl overflow-hidden shadow-sm hover:border-blue-100 dark:hover:border-zinc-800 transition duration-200 bg-white/70 border-white/60 dark:bg-zinc-950/60 dark:border-zinc-900 faq-item"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-4 text-left font-bold flex items-center justify-between gap-4 cursor-pointer hover:bg-blue-50/20 dark:hover:bg-zinc-900/40 text-zinc-900 dark:text-white transition duration-150"
              >
                <span>{faq.question || faq.q}</span>
                <ChevronDown
                  size={16}
                  className="text-zinc-500 transition-transform duration-200"
                />
              </button>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-200 dark:border-zinc-900"
                  >
                    <p className="p-4 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed font-sans text-xs">
                      {faq.answer || faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-16 border-t text-center px-6 backdrop-blur-xl relative z-10 bg-white/60 border-blue-100/40 dark:bg-[#06040f]/60 dark:border-zinc-900/60 footer-main">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3.5">
            <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]" />
            <div className="text-left">
              <span className="font-extrabold text-sm tracking-tight uppercase block text-zinc-900 dark:text-white">Team Mavericks</span>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono mt-0.5">Stay Updated!! Stay Ahead!!</p>
            </div>
          </div>
          <div className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest leading-normal font-mono">
            &copy; {new Date().getFullYear()} Team Mavericks KIT CoEK Kolhapur.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicLanding;
