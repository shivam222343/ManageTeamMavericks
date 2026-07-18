import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Terminal,
  Sparkles,
  Calendar,
  HelpCircle,
  MapPin,
  Clock,
  FileText,
  Code,
  Palette,
  Share2,
  Megaphone,
  Briefcase,
  ChevronDown,
  Info,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Upload,
  Mail
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const PublicLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [domains, setDomains] = useState([]);
  const [formStructure, setFormStructure] = useState([]);
  const [activeStep, setActiveStep] = useState(0); // For multi-step sections
  const [submitting, setSubmitting] = useState(false);

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

  // Stepper triggers
  const nextStep = () => {
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

  const getDomainIcon = (iconName) => {
    const icons = {
      Terminal: <Code size={20} />,
      Palette: <Palette size={20} />,
      Calendar: <Calendar size={20} />,
      Megaphone: <Megaphone size={20} />,
      Share2: <Share2 size={20} />
    };
    return icons[iconName] || <Terminal size={20} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/40 to-blue-100/60 dark:from-[#02000A] dark:via-[#050B24] dark:to-[#0A183C] dark:bg-[#06040F] text-zinc-800 dark:text-zinc-200 flex flex-col relative overflow-hidden transition-all duration-500 selection:bg-blue-600/30 selection:text-white">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        
        .font-handwritten {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* Mesh glowing ambient background layers */}
      <div className="absolute top-[-10%] left-[-15%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] bg-indigo-950/40 rounded-full blur-[140px] pointer-events-none z-0 opacity-40 dark:opacity-100" />
      <div className="absolute top-[30%] right-[-10%] w-[70vw] h-[70vw] md:w-[45vw] md:h-[45vw] bg-blue-950/20 rounded-full blur-[150px] pointer-events-none z-0 opacity-40 dark:opacity-100" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-violet-950/30 rounded-full blur-[130px] pointer-events-none z-0 opacity-40 dark:opacity-100" />
      
      {/* Decorative top grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.05),rgba(255,255,255,0))] pointer-events-none z-0" />

      {/* --- Public Header Navigation --- */}
      <header className="sticky top-0 z-40 h-16 border-b border-blue-50/40 dark:border-zinc-900/40 bg-white/70 dark:bg-[#06040F]/70 backdrop-blur-xl flex items-center justify-between px-6 md:px-12 transition-all">
        <div className="flex items-center gap-3">
          <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
          <div>
            <h1 className="font-extrabold text-[11px] uppercase tracking-widest font-mono text-zinc-900 dark:text-zinc-100">Team Mavericks</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#apply-form"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Apply Now
          </a>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section ref={heroRef} className="py-20 md:py-24 px-6 text-center w-full relative z-10 flex flex-col items-center">
        
        {/* Floating comments absolute block positioned relative to the Hero Section height */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden md:block w-full">
          {/* Comment 1: Top Left */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
            className="absolute top-[18%] left-[3vw] lg:left-[6vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 -rotate-6"
          >
            "Only a couple of days left until the big reveal! 🚀"
          </motion.div>
          
          {/* Comment 2: Mid Left (Surrounding Countdown Left) */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-[52%] left-[1.5vw] lg:left-[3vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 rotate-3"
          >
            "Just a few more days! The excitement is real!"
          </motion.div>
          
          {/* Comment 3: Bottom Left */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute top-[80%] left-[3vw] lg:left-[5vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 -rotate-3"
          >
            "The countdown is on! Who else can't wait? ⏳"
          </motion.div>

          {/* Comment 4: Top Right */}
          <motion.div
            animate={{ y: [0, -11, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[22%] right-[3vw] lg:right-[6vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 rotate-6"
          >
            "Only a few days to go. I'm so ready for this! 💪"
          </motion.div>
          
          {/* Comment 5: Mid Right (Surrounding Countdown Right) */}
          <motion.div
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
            className="absolute top-[56%] right-[1.5vw] lg:right-[3vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 -rotate-2"
          >
            "Just a couple of days to go! 📱✨"
          </motion.div>
          
          {/* Comment 6: Bottom Right */}
          <motion.div
            animate={{ y: [0, -13, 0] }}
            transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            className="absolute top-[82%] right-[3vw] lg:right-[5vw] max-w-[220px] text-left text-lg md:text-xl lg:text-2xl font-bold font-handwritten text-[#3B4CA8] dark:text-blue-300 rotate-6"
          >
            "So excited for the announcement! 🚀"
          </motion.div>
        </div>

        {/* Central Content */}
        <div className="max-w-4xl mx-auto space-y-8 relative z-10 w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm text-zinc-650 dark:text-zinc-400">
            <Sparkles size={11} className="text-amber-500 animate-pulse" />
            <span>KIT CoEK recruitment drive 2026</span>
          </div>

          <h1
            ref={titleRef}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] select-none text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-zinc-400"
          >
            Build. Lead. Innovation.<br />
            Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-650 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 font-extrabold">Team Mavericks</span>
          </h1>

          <p
            ref={descRef}
            className="text-zinc-650 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base font-medium leading-relaxed"
          >
            {campaign.description}
          </p>

          {/* Centerpiece Countdown block: Enormous format */}
          <div ref={timerRef} className="pt-8 relative z-10 w-full max-w-4xl mx-auto px-4">
            {campaignClosed ? (
              <span className="text-xl font-black text-red-500 uppercase tracking-widest animate-pulse">Recruitment is Closed</span>
            ) : (
              <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 font-black select-none">
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter text-blue-950 dark:text-white">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-900/60 dark:text-zinc-450 mt-1.5 uppercase font-mono">
                    Days
                  </span>
                </div>
                
                <span className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl text-blue-300 dark:text-zinc-700 self-start mt-2 sm:mt-4 animate-pulse">:</span>
                
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter text-blue-950 dark:text-white">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-900/60 dark:text-zinc-450 mt-1.5 uppercase font-mono">
                    Hours
                  </span>
                </div>
                
                <span className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl text-blue-300 dark:text-zinc-700 self-start mt-2 sm:mt-4 animate-pulse">:</span>
                
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter text-blue-950 dark:text-white">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-900/60 dark:text-zinc-450 mt-1.5 uppercase font-mono">
                    Minutes
                  </span>
                </div>
                
                <span className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl text-blue-300 dark:text-zinc-700 self-start mt-2 sm:mt-4 animate-pulse">:</span>
                
                <div className="flex flex-col items-center">
                  <span className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tighter text-blue-950 dark:text-white">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-900/60 dark:text-zinc-450 mt-1.5 uppercase font-mono">
                    Seconds
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- About / Motto Section --- */}
      <section className="py-24 bg-white/30 border-y border-blue-50/50 dark:bg-zinc-950/20 dark:border-zinc-900/60 px-6 relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-4">
            <span className="text-[10px] text-blue-800/80 dark:text-zinc-500 uppercase tracking-widest font-black">Who We Are</span>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Unorthodox Views &amp; Innovative Ideas</h2>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-medium">
              We, Team Mavericks symbolize a team having unorthodox views
              and innovative ideas. "Maverick" means an independent person or
              a team who is similar to a bird that loves to live a free and prosperous life.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['BODHANTRA', 'INVICTA', 'ARCANE', 'CARNIVAL'].map((evt) => (
              <div key={evt} className="p-5 border rounded-2xl shadow-sm hover:border-blue-200/60 dark:hover:border-zinc-700 transition duration-200 bg-white/70 border-white/60 dark:bg-zinc-900/30 dark:border-zinc-800/80 shadow-md shadow-blue-900/5 dark:shadow-none">
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest block mb-1">Flagship Event</span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-white">{evt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Dynamic Registration Form (Stepped wizard form) --- */}
      <section id="apply-form" className="py-24 px-6 bg-blue-50/10 dark:bg-zinc-950/10 border-t border-blue-50/40 dark:border-zinc-900/40 relative z-10">
        <div className="max-w-2xl mx-auto space-y-10">
          {campaign.status === 'closed' || campaignClosed ? (
            <div className="p-8 border rounded-3xl shadow-2xl space-y-5 text-center bg-white/70 border-white/80 dark:bg-zinc-950/60 dark:border-zinc-900">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-500/20">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Recruitment is Closed</h2>
              <p className="text-zinc-650 dark:text-zinc-400 text-xs font-medium leading-relaxed max-w-md mx-auto">
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
              <div className="flex justify-between items-center gap-1.5 text-[9px] font-black text-zinc-500 dark:text-zinc-500 tracking-widest font-mono uppercase">
                {formStructure.map((sec, idx) => (
                  <div key={sec.id} className="flex-1 flex flex-col gap-2 items-center">
                    <div className={`h-1.5 w-full rounded-full transition-colors duration-300 bg-zinc-200 dark:bg-zinc-800
                      ${idx <= activeStep ? 'bg-gradient-to-r from-blue-600 to-indigo-650 dark:from-blue-500 dark:to-indigo-500' : ''}
                    `}></div>
                    <span className={`hidden sm:inline truncate max-w-[80px] mt-0.5
                      ${idx === activeStep ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}
                    `}>
                      {sec.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Form Structure container */}
              <form onSubmit={handleSubmit(onSubmitForm)} className="border rounded-3xl p-6 md:p-8 shadow-2xl relative bg-white/70 border-white/80 dark:bg-zinc-950/60 dark:border-zinc-900 shadow-blue-900/5 dark:shadow-none">
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 text-xs font-semibold"
                  >
                    <div className="border-b border-zinc-200 dark:border-zinc-800/40 pb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-white">
                          {formStructure[activeStep]?.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{formStructure[activeStep]?.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="text-[10px] font-black cursor-pointer flex items-center gap-1 transition duration-150 px-3 py-1.5 border rounded-xl border-zinc-300 hover:bg-zinc-100/50 text-zinc-600 dark:border-zinc-800 dark:hover:bg-zinc-900/60 dark:text-zinc-400"
                      >
                        Clear Form
                      </button>
                    </div>

                    {/* Render current step fields */}
                    {formStructure[activeStep]?.fields.map((field) => {
                      const key = `field_${field.id}`;

                      // Preferred Domains Cards Selection
                      if (field.field_type === 'checkbox' && field.label === 'Preferred Domains') {
                        return (
                          <div key={field.id} className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-650 dark:text-zinc-400">
                              {field.label} {field.is_required && <span className="text-red-500">*</span>}
                            </label>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-normal font-medium">{field.description}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {domains.map((dom) => (
                                <label
                                  key={dom.id}
                                  className={`p-4 border rounded-2xl flex items-start gap-3.5 cursor-pointer transition-all duration-200 select-none
                                    ${watch('preferred_domains')?.includes(String(dom.id))
                                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 dark:border-blue-500/50 dark:bg-blue-500/5 dark:text-white font-bold'
                                      : 'border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300'
                                    }
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    value={String(dom.id)}
                                    {...register('preferred_domains', { required: field.is_required ? 'Please select at least one preferred domain.' : false })}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50 border-zinc-300 dark:border-zinc-800 mt-0.5 bg-zinc-950"
                                  />
                                  <div>
                                    <p className="font-bold text-xs">{dom.name}</p>
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-550 leading-normal font-medium mt-0.5 block">{dom.description}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                            {errors.preferred_domains && (
                              <p className="mt-2 text-[10px] text-red-500 flex items-center gap-1.5">
                                <AlertCircle size={12} />
                                <span>{errors.preferred_domains.message}</span>
                              </p>
                            )}
                          </div>
                        );
                      }

                      // Default input type renderings
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-650 dark:text-zinc-405">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                          </label>
                          {field.description && (
                            <p className="text-[10px] text-zinc-555 font-medium leading-normal">{field.description}</p>
                          )}

                          {/* 1. Single Line Input */}
                          {['text', 'email', 'phone', 'prn', 'url', 'number'].includes(field.field_type) && (
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : 'text'}
                              placeholder={field.placeholder || ''}
                              {...register(key, {
                                required: field.is_required ? `${field.label} is required` : false,
                                minLength: field.validation_rules?.min ? { value: field.validation_rules.min, message: `Minimum ${field.validation_rules.min} characters` } : undefined,
                                maxLength: field.validation_rules?.max ? { value: field.validation_rules.max, message: `Maximum ${field.validation_rules.max} characters` } : undefined,
                                pattern: field.validation_rules?.regex ? { value: new RegExp(field.validation_rules.regex), message: 'Invalid formatting value' } : undefined
                              })}
                              className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 bg-white border-zinc-300 text-zinc-900 placeholder-zinc-450 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-white dark:placeholder-zinc-650
                                ${errors[key] ? 'border-red-500/50 focus:ring-red-500/50' : ''}
                              `}
                            />
                          )}

                          {/* 2. Paragraph Field */}
                          {field.field_type === 'paragraph' && (
                            <textarea
                              placeholder={field.placeholder || ''}
                              rows="4"
                              {...register(key, {
                                required: field.is_required ? `${field.label} is required` : false,
                                minLength: field.validation_rules?.min ? { value: field.validation_rules.min, message: `Answer must be at least ${field.validation_rules.min} characters` } : undefined
                              })}
                              className={`w-full px-4 py-3 border rounded-xl text-xs focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 resize-none bg-white border-zinc-300 text-zinc-900 placeholder-zinc-455 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-white dark:placeholder-zinc-650
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

                          {/* 3.1 Radio Buttons */}
                          {field.field_type === 'radio' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {field.options?.map((opt) => (
                                <label key={opt.id} className="flex items-center gap-3 cursor-pointer text-xs border rounded-xl p-3.5 transition-all select-none border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300">
                                  <input
                                    type="radio"
                                    value={opt.option_value}
                                    {...register(key, { required: field.is_required ? 'This selection is required.' : false })}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-650/50 border-zinc-300 dark:border-zinc-800 bg-zinc-950"
                                  />
                                  <span>{opt.option_label}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* 3.2 Checkboxes */}
                          {field.field_type === 'checkbox' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {field.options?.map((opt) => (
                                <label key={opt.id} className="flex items-center gap-3 cursor-pointer text-xs border rounded-xl p-3.5 transition-all select-none border-zinc-200 hover:border-zinc-300 bg-white/30 text-zinc-700 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300">
                                  <input
                                    type="checkbox"
                                    value={opt.option_value}
                                    {...register(key, { required: field.is_required ? 'Please select at least one option.' : false })}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-650/50 border-zinc-300 dark:border-zinc-800 bg-zinc-950"
                                  />
                                  <span>{opt.option_label}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* 4. Rating Star select */}
                          {field.field_type === 'rating' && (
                            <Controller
                              name={key}
                              control={control}
                              rules={{ required: field.is_required ? 'Rating is required' : false }}
                              defaultValue={field.default_value || 4}
                              render={({ field: { value, onChange } }) => (
                                <div className="flex gap-2 text-amber-500 text-lg py-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      type="button"
                                      key={star}
                                      onClick={() => onChange(star)}
                                      className="hover:scale-125 active:scale-95 transition-all cursor-pointer text-2xl"
                                    >
                                      {star <= value ? '★' : '☆'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            />
                          )}

                          {/* 5. Document Resume / ID Upload */}
                          {['resume', 'id_card', 'file', 'image', 'pdf'].includes(field.field_type) && (
                            <div className="space-y-3">
                              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200 select-none group bg-white/40 border-zinc-300 text-zinc-800 dark:bg-zinc-900/20 dark:border-zinc-800 dark:text-zinc-200 hover:border-blue-500/50 dark:hover:border-blue-500/50
                                ${errors[key] ? 'border-red-500/40 bg-red-950/5' : ''}
                              `}>
                                <input
                                  type="file"
                                  accept={field.validation_rules?.types?.join(', ') || (field.field_type === 'image' ? 'image/*' : '*/*')}
                                  {...register(key, { required: field.is_required ? `${field.label} file is required` : false })}
                                  className="sr-only"
                                />
                                <div className="p-3.5 bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 rounded-xl shadow-sm mb-3.5 transition-colors">
                                  <Upload size={18} />
                                </div>
                                <span className="text-xs font-bold">
                                  {formValues[key] && formValues[key][0] ? formValues[key][0].name : `Choose file to upload`}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium mt-1">
                                  {formValues[key] && formValues[key][0] ? `Click to swap file` : `PDF, Doc, Images (Max 5MB)`}
                                </span>
                              </label>

                              {/* Image Live Preview */}
                              {formValues[key] && formValues[key][0] && formValues[key][0].type?.startsWith('image/') && (
                                <div className="relative mt-3 p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-32 h-32 bg-white dark:bg-zinc-900 shadow-md flex items-center justify-center group overflow-hidden">
                                  <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                                    <img
                                      src={URL.createObjectURL(formValues[key][0])}
                                      alt="Upload Preview"
                                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 6. Consent Checkbox */}
                          {field.field_type === 'consent' && (
                            <label className="flex gap-3 items-start cursor-pointer select-none py-1">
                              <input
                                type="checkbox"
                                {...register(key, { required: field.is_required ? 'You must accept the declaration.' : false })}
                                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/50 mt-0.5 bg-zinc-950"
                              />
                              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                {field.description || 'I confirm the information above.'}
                              </span>
                            </label>
                          )}

                          {field.help_text && (
                            <p className="text-[10px] text-zinc-500 font-medium flex items-center gap-1.5 mt-1 font-mono">
                              <HelpCircle size={10} className="text-zinc-450" />
                              <span>{field.help_text}</span>
                            </p>
                          )}

                          {errors[key] && (
                            <p className="mt-2 text-[10px] text-red-505 flex items-center gap-1.5 font-semibold">
                              <AlertCircle size={12} />
                              <span>{errors[key].message}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Stepper Buttons */}
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-8 gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={activeStep === 0}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 border rounded-xl text-xs font-bold shadow-sm disabled:opacity-40 transition cursor-pointer select-none active:scale-95 border-zinc-350 hover:bg-zinc-100/50 text-zinc-650 dark:border-zinc-800 dark:hover:bg-zinc-900/60 dark:text-zinc-400"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  {activeStep < formStructure.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer select-none active:scale-95"
                    >
                      <span>Next Step</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-5.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </form>
            </>
          )}

        </div>
      </section>

      {/* ===== OTP VERIFICATION MODAL ===== */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06040f]/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
            {/* Ambient neon line */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-blue-650" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white">Verify Your Email</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">We will send a 6-digit code to confirm your email before submitting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setOtpModalOpen(false); setOtpSent(false); setOtpCode(''); }}
                  className="text-zinc-400 hover:text-zinc-650 dark:text-zinc-550 dark:hover:text-zinc-300 transition-colors p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  ✕
                </button>
              </div>

              {/* Email Row */}
              <div className="space-y-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500">Email Address</label>
                <div className="flex gap-2.5">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)}
                    disabled={otpSent && otpCountdown > 0}
                    className="flex-1 h-11 px-4 text-xs font-semibold rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-white dark:placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={otpSent && otpCountdown > 0 ? undefined : handleSendOtp}
                    disabled={otpSending || (otpSent && otpCountdown > 0)}
                    className="h-11 px-4.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md whitespace-nowrap active:scale-95"
                  >
                    {otpSending ? 'Sending…' : otpSent && otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {/* OTP Code Input */}
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
                      className="w-full h-12 px-4 text-2xl font-black tracking-[0.5em] rounded-xl border border-zinc-305 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-white transition-all text-center"
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
            {/* Glowing highlights */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

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
                  className="text-zinc-550 transition-transform duration-200"
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
                    <p className="p-4 text-zinc-650 dark:text-zinc-400 font-medium leading-relaxed font-sans text-xs">
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
