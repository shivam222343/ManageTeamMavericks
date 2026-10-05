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
  ArrowUpRight,
  Sparkles,
  Code2,
  Palette,
  Calendar,
  Megaphone,
  Share2,
  MapPin,
  Clock,
  Building2,
  Users,
  Trophy,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';
import DitherVeil from '../../components/ui/DitherVeil';
import ParticleText from '../../components/ui/ParticleText';

gsap.registerPlugin(ScrollTrigger);

const DOMAIN_ICONS = {
  'Technical': Code2,
  'Design & Editing': Palette,
  'Event Management': Calendar,
  'Public Relations & Marketing': Megaphone,
  'Social Media & Content': Share2
};

const DEFAULT_FAQS = [
  {
    q: "Who is eligible to apply for Team Mavericks Recruitment 2026?",
    a: "All engineering students currently studying in First Year (FY), Second Year (SY), and Third Year (TY) at KIT's College of Engineering, Kolhapur across any department are eligible to apply."
  },
  {
    q: "Can I apply for more than one domain?",
    a: "Yes! You can select multiple preferred domains in the application form (e.g., Technical + Design & Editing). You will be evaluated based on your primary domain interest and skillsets."
  },
  {
    q: "Do I need prior experience or technical projects to apply?",
    a: "Not necessarily! We look for enthusiasm, problem-solving mindset, and eagerness to learn. Having personal projects or portfolio is a great bonus, especially for Technical and Design roles."
  },
  {
    q: "What is the selection process after submitting the application?",
    a: "The selection consists of: (1) Online Application Screening, (2) Domain Task / Screening Assignment, and (3) Personal Interview with Domain Leads and Core Panelists."
  },
  {
    q: "What are the key benefits of joining Team Mavericks?",
    a: "Hands-on project experience, mentorship from seniors, opportunity to lead flagship events (Bodhantra, Invicta), networking with alumni, and representation at national hackathons."
  }
];

const PublicLanding = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [domains, setDomains] = useState([]);
  const [formStructure, setFormStructure] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checkingNextStep, setCheckingNextStep] = useState(false);

  // OTP verification state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // FAQ state
  const [faqs, setFaqs] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);

  // Event popup state
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [campaignClosed, setCampaignClosed] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);

  // Form initialization
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    trigger,
    reset,
    formState: { errors }
  } = useForm();

  const formValues = watch();

  // Fetch campaign structure
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await axios.get(`/campaigns/public/${slug}`);
        setCampaign(res.data.campaign);
        setDomains(res.data.domains || []);
        setFormStructure(res.data.formStructure || []);
        setOtpRequired(res.data.otp_required === 'true' || res.data.otp_required === true);

        // Fetch FAQs
        try {
          const faqRes = await axios.get(`/campaigns/${res.data.campaign.id}/faqs`);
          if (Array.isArray(faqRes.data) && faqRes.data.length > 0) {
            setFaqs(faqRes.data);
          } else {
            setFaqs(DEFAULT_FAQS);
          }
        } catch (faqErr) {
          setFaqs(DEFAULT_FAQS);
        }

        // Load auto-saved draft
        const draft = localStorage.getItem(`draft_form_${res.data.campaign.id}`);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            Object.keys(parsed).forEach(k => setValue(k, parsed[k]));
          } catch (e) {
            // invalid json
          }
        }
      } catch (err) {
        console.error('Failed to load campaign structure:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug, setValue]);

  // Auto-save form draft on change
  useEffect(() => {
    if (!campaign || Object.keys(formValues).length === 0) return;
    const timeout = setTimeout(() => {
      const serializable = {};
      Object.keys(formValues).forEach(k => {
        const val = formValues[k];
        if (!(val instanceof FileList) && !(val instanceof File)) {
          serializable[k] = val;
        }
      });
      localStorage.setItem(`draft_form_${campaign.id}`, JSON.stringify(serializable));
    }, 800);
    return () => clearTimeout(timeout);
  }, [formValues, campaign]);

  // Countdown timer calculation
  useEffect(() => {
    if (!campaign?.deadline) return;

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

  // OTP Countdown timer
  useEffect(() => {
    let t;
    if (otpCountdown > 0) {
      t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(t);
  }, [otpCountdown]);

  // Mobile scroll-reveal for event cards (touch devices only)
  useEffect(() => {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouchDevice) return;

    const cards = document.querySelectorAll('.event-card');
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      {
        threshold: 0.45,          // fires when 45% of the card is visible
        rootMargin: '-5% 0px -5% 0px'  // slightly tighter than full viewport
      }
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [loading]); // re-run once campaign/cards are rendered

  const handleSendOtp = async () => {
    if (!otpEmail || !/\S+@\S+\.\S+/.test(otpEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }
    setOtpSending(true);
    try {
      await axios.post('/applicants/send-otp', {
        email: otpEmail,
        campaign_id: campaign.id
      });
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success(`OTP sent to ${otpEmail}! Check your inbox/spam.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setOtpVerifying(true);
    try {
      await axios.post('/applicants/verify-otp', {
        email: otpEmail,
        campaign_id: campaign.id,
        otp: otpCode
      });
      setOtpVerified(true);
      setOtpModalOpen(false);
      toast.success('Email verified successfully! Submitting application...');
      if (pendingFormData) {
        await doSubmit(pendingFormData, otpEmail);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleClearDraft = () => {
    setShowClearConfirmModal(true);
  };

  const confirmClearDraft = () => {
    if (campaign) {
      localStorage.removeItem(`draft_form_${campaign.id}`);
    }
    reset();
    setShowClearConfirmModal(false);
    toast.success('Form data cleared successfully.');
  };

  const handleSelectDomainFromCard = (domainId) => {
    const current = watch('preferred_domains') || [];
    const strId = String(domainId);
    let updated;
    if (Array.isArray(current)) {
      updated = current.includes(strId) ? current : [...current, strId];
    } else {
      updated = [strId];
    }
    setValue('preferred_domains', updated);

    // Find section with domain field or go to form
    const applyElement = document.getElementById('apply-form');
    if (applyElement) {
      applyElement.scrollIntoView({ behavior: 'smooth' });
    }
    toast.success('Domain selected! Continue your registration below.', { icon: '🎯' });
  };

  // Build FormData from form values
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

  // Actual submit
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
      if (!mapped) toast.error(errMsg);
      else toast.error('Please correct the highlighted errors in the form.');
    }
  };

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
      toast.error('Please fill in all required fields before proceeding.');
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
      const applyFormEl = document.getElementById('apply-form');
      if (applyFormEl) {
        window.scrollTo({ top: applyFormEl.offsetTop - 80, behavior: 'smooth' });
      }
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      const applyFormEl = document.getElementById('apply-form');
      if (applyFormEl) {
        window.scrollTo({ top: applyFormEl.offsetTop - 80, behavior: 'smooth' });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#070C18] text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 bg-[#0C152B] border border-blue-900/50 rounded-none shadow-2xl space-y-4">
          <AlertCircle className="mx-auto text-blue-400" size={36} />
          <h2 className="text-2xl font-black uppercase font-['Syne',sans-serif]">Campaign Inactive</h2>
          <p className="text-xs text-slate-400">This recruitment drive is either closed or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 font-sans selection:bg-blue-600 selection:text-white ${isDark ? 'bg-[#070C18] text-[#F8FAFC]' : 'bg-[#F8FAFC] text-[#0A1128]'
      }`}>

      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

        .font-display-heavy {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          letter-spacing: 0em;
          line-height: 0.95;
          text-transform: uppercase;
        }

        .font-display-condensed {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 0.97;
        }

        .font-mono-tag {
          font-family: 'DM Mono', 'Inter', monospace;
          font-weight: 500;
        }

        .flat-card {
          border-radius: 0px;
          transition: all 0.2s ease-in-out;
        }

        /* Particle hero row: desktop uses larger negative offset */
        .particle-hero-row {
          margin-left: -6em;
        }
        @media (max-width: 639px) {
          .particle-hero-row {
            margin-left: -2em;
          }
        }

        /* Domain strip: scrollable but no visible scrollbar */
        .domain-strip-scroll {
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;       /* Firefox */
          -ms-overflow-style: none;    /* IE/Edge */
        }
        .domain-strip-scroll::-webkit-scrollbar {
          display: none;               /* Chrome/Safari */
        }

        /* ── Infinite marquee ticker ── */
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll 28s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding-right: 2rem;
          white-space: nowrap;
          font-family: 'DM Mono', 'Inter', monospace;
          font-weight: 700;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #e2e8f0;
        }
        .ticker-sep {
          color: #60A5FA;
          opacity: 0.7;
          font-size: 0.55rem;
        }
      `}</style>

      {/* --- TOP FLAT NAVIGATION --- */}
      <header className={`sticky top-0 z-40 h-[72px] border-b flex items-center justify-between px-5 sm:px-8 md:px-14 backdrop-blur-md transition-colors duration-200 ${isDark ? 'bg-[#070C18]/95 border-[#1E293B]' : 'bg-[#F8FAFC]/95 border-[#E2E8F0]'
        }`}>
        {/* Brand - Mavericks Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/Logos/Mavericks_Logo.png"
            alt="Team Mavericks Logo"
            className="h-9 w-auto object-contain select-none"
          />
          <span className="font-display-heavy text-base sm:text-lg tracking-tight uppercase">
            Team Mavericks
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono-tag uppercase font-bold tracking-wider">
          <a href="#events" className={`transition-colors hover:text-blue-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Events
          </a>
          <a href="#domains" className={`transition-colors hover:text-blue-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Domains
          </a>
          <a href="#about" className={`transition-colors hover:text-blue-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            About
          </a>
          <a href="#venue" className={`transition-colors hover:text-blue-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Venue &amp; Dates
          </a>
          <a href="#faqs" className={`transition-colors hover:text-blue-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            FAQs
          </a>
        </nav>

        {/* Action button & Theme toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-9 h-9 flex items-center justify-center border transition-colors ${isDark ? 'border-[#1E293B] hover:bg-slate-800 text-slate-300' : 'border-[#CBD5E1] hover:bg-slate-200 text-slate-700'
              }`}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <a
            href="#apply-form"
            className={`h-10 px-5 sm:px-6 font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${isDark
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]'
              : 'bg-[#0A1128] hover:bg-blue-900 text-white'
              }`}
          >
            Apply Now <ChevronRight size={14} />
          </a>
        </div>
      </header>

      {/* --- HERO SECTION (EDITORIAL BRUTALIST STYLE) --- */}
      <section ref={heroRef} className="relative z-10 px-5 sm:px-8 md:px-10 pt-10 md:pt-20 pb-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">

          {/* Left Column - Large Editorial Headline */}
          <div className="lg:col-span-6 space-y-6">
            {/* Row 1 */}
            <h1 className="font-display-heavy text-5xl sm:text-6xl md:text-7xl lg:text-[84px] text-left uppercase leading-[0.9]" style={{ marginBottom: 0 }}>
              ARE YOU A TRUE
            </h1>
            {/* Row 2: Maverick (particle canvas) + ? on the same flex row */}
            <div className="particle-hero-row" style={{ display: 'flex', alignItems: 'center', marginTop: '-4em', marginBottom: '5em', gap: 0 }}>
              <div style={{ flex: '1 1 auto', height: 'clamp(100px, 20vw, 160px)', minWidth: 0 }}>
                <ParticleText
                  text="MAVERICK?"
                  particleSize={2.2}
                  density={4}
                  color={isDark ? '#f8fafc' : '#0B132B'}
                  highlightColor="#3b82f6"
                  scatter={190}
                  gatherDuration={1600}
                  stagger={420}
                  pointerRepel={42}
                  repelRadius={120}
                  idleDrift={0.8}
                  trigger="mount"
                  fontSize="clamp(4rem, 18vw, 7.5rem)"
                  fontWeight={800}
                  fontFamily="'Barlow Condensed', sans-serif"
                  glow
                />
              </div>
            </div>


            <div className="space-y-3 pt-2 max-w-xl">
              <p className="font-mono-tag text-xs font-black tracking-widest uppercase text-blue-500">
                Team Mavericks • Student Organization
              </p>
              <p className={`text-sm md:text-base leading-relaxed font-normal ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                {campaign.description || 'Join Team Mavericks, the premier student organization of KIT College of Engineering, Kolhapur! Multiple domains open across Technical, Design, Event Management, PR & Marketing, and Content.'}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="#apply-form"
                className={`h-12 px-7 font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${isDark
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg'
                  : 'bg-[#0A1128] hover:bg-blue-950 text-white'
                  }`}
              >
                Register Now<ChevronRight size={15} />
              </a>

              <a
                href="#domains"
                className={`h-12 px-7 font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 border transition-all ${isDark
                  ? 'border-[#1E293B] hover:border-blue-500 bg-[#0C152B] text-slate-200'
                  : 'border-slate-300 hover:border-slate-800 bg-white text-slate-900'
                  }`}
              >
                Explore Domains <ArrowUpRight size={15} />
              </a>
            </div>

            {/* Countdown Micro-Bar — hidden once deadline passes */}
            {!campaignClosed && (
              <div className={`mt-8 pt-6 border-t grid grid-cols-4 gap-3 max-w-md ${isDark ? 'border-[#1E293B]' : 'border-slate-200'
                }`}>
                {[
                  { val: timeLeft.days, label: 'DAYS' },
                  { val: timeLeft.hours, label: 'HOURS' },
                  { val: timeLeft.minutes, label: 'MINS' },
                  { val: timeLeft.seconds, label: 'SECS' }
                ].map((item, i) => (
                  <div key={i} className="text-left">
                    <div className="font-display-heavy text-2xl sm:text-3xl text-blue-500">
                      {String(item.val).padStart(2, '0')}
                    </div>
                    <div className="font-mono-tag text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - DitherVeil Seamlessly Blended Graphic */}
          <div className="lg:col-span-6 flex justify-center items-center relative w-full select-none">
            {/* Ambient Background Glow matching theme */}
            <div className={`absolute -inset-4 rounded-full blur-3xl opacity-20 pointer-events-none ${isDark ? 'bg-blue-600/40' : 'bg-blue-100/30'
              }`} />

            <div
              className="w-full h-[460px] sm:h-[520px] md:h-[580px] relative overflow-hidden"
              style={{
                // Smoothly feather-blend all edges and corners into the page background
                WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 40%, rgba(0,0,0,0.7) 65%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 40%, rgba(0,0,0,0.7) 65%, transparent 100%)',
              }}
            >
              <DitherVeil
                src="/backgrounds/dekstop_view.png"
                pattern="floyd"
                pixelSize={1.5}
                inkColor={isDark ? "#070C18" : "#FFFFFF"}
                paperColor={isDark ? "#3B82F6" : "#000000"}
                revealRadius={280}
                softness={0.7}
                linger={1.5}
                fit="cover"
                rimColor={isDark ? "#60A5FA" : "#3B82F6"}
                palette="duotone"
                levels={2}
                contrast={1.05}
                brightness={0.20}
                rim={0.2}
                reverse={false}
                wander={true}
                clickBurst
              />

              {/* Edge Gradient Overlays for extra smooth fade into background */}
              <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${isDark
                ? 'bg-gradient-to-t from-[#070C18] via-transparent to-[#070C18]/60'
                : 'bg-gradient-to-t from-[#F8FAFC] via-transparent to-transparent'
                }`} />
              <div className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${isDark
                ? 'bg-gradient-to-r from-[#070C18]/80 via-transparent to-[#070C18]/80'
                : 'bg-gradient-to-r from-[#F8FAFC]/40 via-transparent to-[#F8FAFC]/40'
                }`} />
            </div>
          </div>

        </div>
      </section>

      {/* --- DOMAIN HIGHLIGHT STRIP — INFINITE TICKER --- */}
      <section
        aria-label="Domains"
        className="w-full overflow-hidden select-none py-3"
        style={{
          background: '#0A1128',
          borderTop: '1.5px solid #60A5FA',
          borderBottom: '1.5px solid #60A5FA'
        }}
      >
        {/* ticker-track is duplicated for seamless loop */}
        <div className="ticker-track">
          {[0, 1].map(copy => (
            <div key={copy} className="ticker-item" aria-hidden={copy === 1 ? 'true' : undefined}>
              <span>TECH</span>
              <span className="ticker-sep">✦</span>
              <span>CREATIVITY &amp; DESIGN</span>
              <span className="ticker-sep">✦</span>
              <span>EVENT OPERATIONS</span>
              <span className="ticker-sep">✦</span>
              <span>PR &amp; MARKETING</span>
              <span className="ticker-sep">✦</span>
              <span>SOCIAL MEDIA &amp; CONTENT</span>
              <span className="ticker-sep">✦</span>
              <span>LEADERSHIP</span>
              <span className="ticker-sep">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- QUICK METADATA ROW --- */}
      <section className={`border-b py-6 px-5 sm:px-8 md:px-14 ${isDark ? 'border-[#1E293B] bg-[#0A1128]/40' : 'border-slate-200 bg-slate-50'
        }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-slate-500">VENUE</p>
            <p className="font-display-heavy text-sm uppercase">KIT College of Engineering, Kolhapur</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-slate-500">DATE &amp; MODE</p>
            <p className="font-display-heavy text-sm uppercase">Academic Year 2026 • In-Person Drive</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-slate-500">ELIGIBILITY</p>
            <p className="font-display-heavy text-sm uppercase">Open for FY, SY, and TY Students (All Branches)</p>
          </div>
        </div>
      </section>

      {/* --- OUR FLAGSHIP EVENTS (4 Cards with hover image effect) --- */}
      <section id="events" className={`py-20 px-5 sm:px-8 md:px-14 border-b ${isDark ? 'border-[#1E293B]' : 'border-slate-200'
        }`}>
        <style>{`
          .event-card {
            position: relative;
            overflow: hidden;
            cursor: pointer;
          }
          .event-card .event-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 1;
            transform: scale(1);
            transition: transform 0.55s cubic-bezier(0.4,0,0.2,1), filter 0.45s ease;
            z-index: 0;
            filter: brightness(1) saturate(1.05);
          }
          .event-card:hover .event-img {
            transform: scale(1.06);
            filter: brightness(0.7) saturate(1.1);
          }
          .event-card .event-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to top,
              rgba(4,10,30,0.85) 0%,
              rgba(4,10,30,0.30) 40%,
              transparent 70%
            );
            opacity: 0.35;
            transition: opacity 0.45s ease, background 0.45s ease;
            z-index: 1;
          }
          .event-card:hover .event-overlay {
            opacity: 1;
            background: linear-gradient(
              to top,
              rgba(4,10,30,0.95) 0%,
              rgba(10,20,60,0.78) 50%,
              rgba(5,15,45,0.60) 100%
            );
          }
          .event-card .event-content {
            position: relative;
            z-index: 2;
            transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
          }
          .event-card:hover .event-content {
            transform: translateY(-6px);
          }
          .event-card .event-tag {
            transition: background 0.3s ease, color 0.3s ease;
          }
          .event-card:hover .event-tag {
            background: #2563EB;
            color: #fff;
          }
          .event-card .event-arrow {
            opacity: 0;
            transform: translateX(-8px);
            transition: opacity 0.3s ease, transform 0.3s ease;
          }
          .event-card:hover .event-arrow {
            opacity: 1;
            transform: translateX(0);
          }

          /* Mobile scroll-reveal: mirrors hover when card is centred in viewport */
          @media (pointer: coarse) {
            .event-card.is-visible .event-img {
              transform: scale(1.06);
              filter: brightness(0.7) saturate(1.1);
            }
            .event-card.is-visible .event-overlay {
              opacity: 1;
            }
            .event-card.is-visible .event-content {
              transform: translateY(-6px);
            }
            .event-card.is-visible .event-tag {
              background: #2563EB;
              color: #fff;
            }
            .event-card.is-visible .event-arrow {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>

        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
                WHAT WE BUILD
              </p>
              <h2 className="font-display-heavy text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight">
                FLAGSHIP <br />
                EVENTS.
              </h2>
            </div>
            <p className={`max-w-sm text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
              From national-level hackathons to inter-college sports fests — Team Mavericks runs it all.
            </p>
          </div>

          {/* 4 Event Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                number: '01',
                name: 'BODHANTRA',
                subtitle: 'Five-Day College Event',
                desc: 'A five-day college event for first-year students featuring technical and non-technical sessions, interactive discussions, team-building challenges, and creative competitions.',
                tag: 'LEARNING',
                bg: 'from-blue-950 to-[#070C18]',
                img: '/events/bodhantra.jpeg'
              },
              {
                number: '02',
                name: 'INVICTA',
                subtitle: 'Workshop Series',
                desc: 'A workshop series covering technical and non-technical topics including web development, ethical hacking, soft skills, mental health, and more.',
                tag: 'WORKSHOPS',
                bg: 'from-indigo-950 to-[#070C18]',
                img: '/events/invicta.png'
              },
              {
                number: '03',
                name: 'VERBAFEST',
                subtitle: 'Placement Preparation Event',
                desc: 'A one-day placement preparation event featuring Group Discussions, debates, and mock interviews to build communication skills, confidence, and recruitment readiness.',
                tag: 'PLACEMENT',
                bg: 'from-slate-800 to-[#070C18]',
                img: '/events/verbafest.JPG'
              },
              {
                number: '04',
                name: 'SCHOOL VISIT',
                subtitle: 'Community Outreach',
                desc: 'A school outreach initiative in rural areas of Kolhapur featuring technology demonstrations, workshops, career guidance, and sessions on emerging technologies.',
                tag: 'COMMUNITY',
                bg: 'from-blue-900 to-[#070C18]',
                img: '/events/school_visit.jpg'
              }
            ].map((ev) => (
              <div
                key={ev.number}
                className={`event-card min-h-[340px] sm:min-h-[380px] p-6 sm:p-7 border flex flex-col justify-between bg-gradient-to-b ${ev.bg
                  } ${isDark ? 'border-[#1E293B]' : 'border-slate-700'
                  } text-white`}
              >
                {/* Background image (shown on hover) */}
                {ev.img && <img src={ev.img} alt={ev.name} className="event-img" />}
                {!ev.img && (
                  <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(ellipse at 30% 60%, rgba(37,99,235,0.18) 0%, transparent 70%)`
                    }}
                  />
                )}
                {/* Hover overlay */}
                <div className="event-overlay" />

                {/* Content */}
                <div className="event-content flex flex-col justify-between h-full gap-6">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <span className={`event-tag font-mono-tag text-[10px] font-black tracking-widest uppercase px-2.5 py-1 border ${isDark ? 'border-blue-500/50 text-blue-300 bg-blue-500/10' : 'border-blue-400 text-blue-300 bg-blue-800/30'
                      }`}>
                      {ev.tag}
                    </span>
                    <span className="font-mono-tag text-xs font-bold text-slate-400">{ev.number}</span>
                  </div>

                  {/* Bottom text block */}
                  <div className="space-y-2">
                    <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-blue-400">
                      {ev.subtitle}
                    </p>
                    <h3 className="font-display-heavy text-3xl sm:text-4xl uppercase leading-[0.9] tracking-tight">
                      {ev.name}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-slate-300 pt-1">
                      {ev.desc}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(ev)}
                      className="flex items-center gap-1.5 pt-2 font-mono-tag text-[10px] font-black uppercase tracking-wider text-blue-400 event-arrow cursor-pointer hover:text-blue-300 transition-colors"
                    >
                      <ArrowUpRight size={12} />
                      <span>Learn More</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- "PICK YOUR PLAYFIELD." (DOMAINS BENTO GRID) --- */}
      <section id="domains" className="py-20 px-5 sm:px-8 md:px-14 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
              VERTICALS &amp; DEPARTMENTS
            </p>
            <h2 className="font-display-heavy text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight">
              PICK YOUR <br />
              PLAYFIELD.
            </h2>
          </div>
          <p className={`max-w-md text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
            Explore our open verticals and apply for roles where you can innovate, design, organize, and create real impact with Team Mavericks.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map((dom, idx) => {
            const IconComponent = DOMAIN_ICONS[dom.name] || Code2;
            const isFeatured = idx === 0 || idx === 3;

            return (
              <div
                key={dom.id}
                className={`p-6 sm:p-7 border flex flex-col justify-between gap-6 relative group transition-all duration-200 ${isFeatured
                  ? isDark
                    ? 'bg-[#122854] text-white border-blue-500/40 shadow-lg shadow-blue-950/40'
                    : 'bg-[#1E40AF] text-white border-blue-900'
                  : isDark
                    ? 'bg-[#0E172A] border-[#1E293B] text-slate-100 hover:border-blue-500/60'
                    : 'bg-[#F3EFE6] border-slate-300 text-slate-900 hover:border-slate-800'
                  }`}
              >
                {/* Header with 01 number and Icon */}
                <div className="flex items-center justify-between border-b pb-4 border-current/20">
                  <span className="font-mono-tag text-xs font-bold tracking-wider opacity-80">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tag text-[10px] font-bold uppercase tracking-wider opacity-80">
                      INTAKE: {dom.max_intake || 'Open'}
                    </span>
                    <IconComponent size={16} className="opacity-90" />
                  </div>
                </div>

                {/* Domain Title & Details */}
                <div className="space-y-3 my-2">
                  <h3 className="font-display-heavy text-2xl uppercase tracking-tight">
                    {dom.name}
                  </h3>
                  <p className="text-xs leading-relaxed opacity-85 font-medium">
                    {dom.description}
                  </p>
                </div>

                {/* Card Action Link */}
                <button
                  type="button"
                  onClick={() => handleSelectDomainFromCard(dom.id)}
                  className="pt-4 border-t border-current/20 flex items-center justify-between font-mono-tag text-xs font-black uppercase tracking-wider cursor-pointer group-hover:underline text-left"
                >
                  <span>Select &amp; Apply</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- "BIG IDEAS. REAL ENERGY." (ABOUT MAVERICKS) --- */}
      <section id="about" className={`border-y py-20 px-5 sm:px-8 md:px-14 ${isDark ? 'border-[#1E293B] bg-[#0A1128]/50' : 'border-slate-200 bg-slate-100/60'
        }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500">
              WHO WE ARE
            </p>
            <h2 className="font-display-heavy text-5xl sm:text-6xl md:text-7xl uppercase leading-[0.92]">
              BIG IDEAS. <br />
              REAL ENERGY.
            </h2>
          </div>

          <div className="lg:col-span-6">
            <div className={`p-8 border space-y-6 ${isDark ? 'border-[#1E293B] bg-[#070C18]' : 'border-slate-300 bg-white'
              }`}>
              <div className="flex items-center gap-3">
                <img
                  src="/Logos/Mavericks_Logo.png"
                  alt="Team Mavericks"
                  className="h-10 w-auto object-contain select-none"
                />
                <div>
                  <h4 className="font-display-heavy text-sm uppercase tracking-tight">STUDENT DEVELOPMENT &amp; INNOVATION</h4>
                  <p className="font-mono-tag text-[10px] text-slate-500 uppercase">LEARNING WITH FUN</p>
                </div>
              </div>

              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                Team Mavericks is a student-run organization at KIT's College of Engineering, Kolhapur, dedicated to student development through technical and non-technical sessions, workshops, events, and creative activities. We create opportunities for students to learn new skills, explore their interests, build confidence, and grow through hands-on experiences.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-current/10">
                <div>
                  <p className="font-display-heavy text-2xl text-blue-500">2016</p>
                  <p className="font-mono-tag text-[10px] uppercase font-bold text-slate-500">Established</p>
                </div>
                <div>
                  <p className="font-display-heavy text-2xl text-blue-500">TECH + NON-TECH</p>
                  <p className="font-mono-tag text-[10px] uppercase font-bold text-slate-500">Learning &amp; Development</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- "SEE YOU AT KIT COEK." / "GET READY TO JOIN." --- */}
      <section id="venue" className="py-20 px-5 sm:px-8 md:px-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left Info Card */}
          <div className={`md:col-span-7 p-8 sm:p-10 border flex flex-col justify-between gap-8 ${isDark ? 'border-[#1E293B] bg-[#0E172A]' : 'border-slate-300 bg-[#F3EFE6]'
            }`}>
            <div className="space-y-4">
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500">
                RECRUITMENT VENUE
              </p>
              <h3 className="font-display-heavy text-4xl sm:text-5xl uppercase tracking-tight">
                SEE YOU <br />
                AT KIT COEK.
              </h3>
              <p className="text-xs sm:text-sm opacity-80 leading-relaxed max-w-md font-medium">
                KIT’s College of Engineering (Autonomous), Gokul Shirgaon, Kolhapur, Maharashtra 416234.
                Offline interviews and orientation sessions will take place in the Central Auditorium.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-mono-tag text-xs uppercase font-bold pt-4 border-t border-current/20">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-blue-500" />
                <span>KIT CAMPUS</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-blue-500" />
                <span>ALL DEPARTMENTS</span>
              </div>
            </div>
          </div>

          {/* Right Action Card */}
          <div className={`md:col-span-5 p-8 sm:p-10 border flex flex-col justify-between gap-8 ${isDark ? 'border-blue-900 bg-[#070C18] text-white' : 'bg-[#0A1128] border-slate-900 text-white'
            }`}>
            <div className="space-y-4">
              <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-400">
                JOIN THE DRIVE
              </p>
              <h3 className="font-display-heavy text-3xl sm:text-4xl uppercase tracking-tight leading-tight text-white">
                FIND YOUR DOMAIN. <br />
                GET READY TO JOIN.
              </h3>
              <p className="text-xs opacity-75 leading-relaxed">
                Complete your online application form below to receive interview schedules and domain assignment updates.
              </p>
            </div>

            <a
              href="#apply-form"
              className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all"
            >
              <span>Begin Registration</span>
              <ChevronRight size={16} />
            </a>
          </div>

        </div>
      </section>

      {/* --- "A FEW USEFUL ANSWERS." (FLAT ACCORDION FAQS) --- */}
      <section id="faqs" className={`border-t py-20 px-5 sm:px-8 md:px-14 ${isDark ? 'border-[#1E293B] bg-[#0A1128]/30' : 'border-slate-200 bg-slate-50'
        }`}>
        <div className="max-w-4xl mx-auto space-y-10">
          <div>
            <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
              FREQUENTLY ASKED
            </p>
            <h2 className="font-display-heavy text-4xl sm:text-5xl uppercase tracking-tight">
              A FEW USEFUL ANSWERS.
            </h2>
          </div>

          <div className="border-t border-current/20 divide-y divide-current/20">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              const question = faq.question || faq.q;
              const answer = faq.answer || faq.a;

              return (
                <div key={index} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left font-display-heavy text-base sm:text-lg uppercase tracking-tight cursor-pointer group"
                  >
                    <span className="group-hover:text-blue-500 transition-colors">
                      {question}
                    </span>
                    <span className="font-mono-tag text-base font-bold text-blue-500 shrink-0">
                      {isOpen ? '—' : '+'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className={`pt-3 text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                          {answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- DYNAMIC CANDIDATE REGISTRATION FORM (FLAT UI) --- */}
      <section id="apply-form" className="py-20 px-5 sm:px-8 md:px-14 border-t border-[#1E293B]">
        <div className="max-w-3xl mx-auto space-y-8">

          {campaign.status === 'closed' || campaignClosed ? (
            <div className={`p-10 border text-center space-y-4 ${isDark ? 'border-red-900/50 bg-[#0C152B]' : 'border-red-300 bg-red-50'
              }`}>
              <AlertCircle size={36} className="text-red-500 mx-auto" />
              <h3 className="font-display-heavy text-2xl uppercase">Recruitment Drive Closed</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {campaign.closed_message || 'The application window for this recruitment drive has concluded. Thank you for your interest!'}
              </p>
            </div>
          ) : (
            <>
              {/* Form Title Header */}
              <div className="text-center space-y-2">
                <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-blue-500">
                  APPLICATION PORTAL
                </p>
                <h2 className="font-display-heavy text-4xl sm:text-5xl uppercase tracking-tight">
                  CANDIDATE REGISTRATION
                </h2>
                <p className="text-xs text-slate-500 font-mono-tag uppercase tracking-wider">
                  Fill in your details accurately. Your progress auto-saves as you type.
                </p>
              </div>

              {/* Flat Step Indicator Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px] font-mono-tag font-bold uppercase select-none">
                {formStructure.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className={`p-2.5 border text-center transition-all ${idx === activeStep
                      ? 'border-blue-500 bg-blue-600 text-white font-black'
                      : idx < activeStep
                        ? isDark
                          ? 'border-blue-900 bg-blue-950/40 text-blue-300'
                          : 'border-blue-200 bg-blue-50 text-blue-800'
                        : isDark
                          ? 'border-[#1E293B] bg-[#0E172A] text-slate-500'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                  >
                    <div>{String(idx + 1).padStart(2, '0')}</div>
                    <div className="truncate">{sec.name}</div>
                  </div>
                ))}
              </div>

              {/* Flat Form Box */}
              <form
                onSubmit={handleSubmit(onSubmitForm)}
                className={`border p-6 sm:p-10 space-y-8 ${isDark ? 'border-[#1E293B] bg-[#0E172A]' : 'border-slate-300 bg-white shadow-sm'
                  }`}
              >
                {/* Current Section Title */}
                <div className="flex items-center justify-between border-b pb-4 border-current/15">
                  <div>
                    <h3 className="font-display-heavy text-xl uppercase tracking-tight">
                      {formStructure[activeStep]?.name || `SECTION ${activeStep + 1}`}
                    </h3>
                    <p className="text-[11px] font-mono-tag uppercase text-slate-500 tracking-wider">
                      {formStructure[activeStep]?.description || 'Complete the required fields below'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="font-mono-tag text-[10px] uppercase font-black text-slate-500 hover:text-red-500 cursor-pointer"
                  >
                    CLEAR FORM
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {formStructure[activeStep]?.fields.map((field) => {
                      const key = `field_${field.id}`;

                      // Preferred Domains Multi-select
                      if (field.field_type === 'checkbox' && field.label === 'Preferred Domains') {
                        return (
                          <div key={field.id} className="space-y-3">
                            <label className="block font-mono-tag text-xs font-bold uppercase tracking-wider">
                              {field.label} {(field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? <span className="text-red-500">*</span> : null}
                            </label>
                            {field.description && (
                              <p className="text-xs text-slate-500">{field.description}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {domains.map((dom, domIdx) => {
                                const val = watch('preferred_domains');
                                const isSelected = Array.isArray(val) && val.includes(String(dom.id));
                                return (
                                  <label
                                    key={dom.id}
                                    className={`flex items-start gap-3 p-4 border cursor-pointer select-none transition-all ${isSelected
                                      ? 'border-blue-500 bg-blue-600 text-white font-bold'
                                      : isDark
                                        ? 'border-[#1E293B] bg-[#070C18] text-slate-300 hover:border-slate-700'
                                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400'
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      value={String(dom.id)}
                                      {...register('preferred_domains', {
                                        required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true)
                                          ? 'Please select at least one domain.'
                                          : false
                                      })}
                                      className="w-4 h-4 mt-0.5 accent-blue-600 rounded-none cursor-pointer"
                                    />
                                    <div>
                                      <div className="font-mono-tag text-[10px] opacity-70 uppercase">
                                        DOMAIN {String(domIdx + 1).padStart(2, '0')}
                                      </div>
                                      <p className="font-display-heavy text-sm uppercase tracking-tight">
                                        {dom.name}
                                      </p>
                                      <p className="text-[11px] opacity-80 mt-0.5 font-normal">
                                        {dom.description}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>

                            {errors.preferred_domains && (
                              <p className="font-mono-tag text-[10px] text-red-500 font-bold flex items-center gap-1.5 pt-1">
                                <AlertCircle size={12} />
                                <span>{errors.preferred_domains.message}</span>
                              </p>
                            )}
                          </div>
                        );
                      }

                      // Default Inputs
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="block font-mono-tag text-xs font-bold uppercase tracking-wider">
                            {field.label} {(field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? <span className="text-red-500">*</span> : null}
                          </label>

                          {field.description && (
                            <p className="text-xs text-slate-500">{field.description}</p>
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
                                  pattern: isPhone
                                    ? { value: /^\d{10}$/, message: 'Mobile number must be exactly 10 digits.' }
                                    : field.validation_rules?.regex ? { value: new RegExp(field.validation_rules.regex), message: 'Invalid formatting value' } : undefined
                                })}
                                className={`w-full px-4 py-3.5 border rounded-none text-xs font-medium transition-all ${isDark
                                  ? 'bg-[#070C18] border-[#1E293B] text-white focus:border-blue-500 focus:outline-none'
                                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:outline-none'
                                  } ${errors[key] ? 'border-red-500' : ''}`}
                              />
                            );
                          })()}

                          {/* 2. Paragraph Textarea */}
                          {field.field_type === 'paragraph' && (
                            <textarea
                              placeholder={field.placeholder || ''}
                              rows="4"
                              {...register(key, {
                                required: field.is_required ? `${field.label} is required` : false,
                                minLength: field.validation_rules?.min ? { value: field.validation_rules.min, message: `Answer must be at least ${field.validation_rules.min} characters` } : undefined
                              })}
                              className={`w-full px-4 py-3.5 border rounded-none text-xs font-medium resize-none transition-all ${isDark
                                ? 'bg-[#070C18] border-[#1E293B] text-white focus:border-blue-500 focus:outline-none'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:outline-none'
                                } ${errors[key] ? 'border-red-500' : ''}`}
                            />
                          )}

                          {/* 3. Dropdown */}
                          {field.field_type === 'dropdown' && (
                            <select
                              {...register(key, { required: field.is_required ? `${field.label} is required` : false })}
                              className={`w-full px-4 py-3.5 border rounded-none text-xs font-medium transition-all ${isDark
                                ? 'bg-[#070C18] border-[#1E293B] text-white focus:border-blue-500 focus:outline-none'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:outline-none'
                                } ${errors[key] ? 'border-red-500' : ''}`}
                            >
                              <option value="">{field.placeholder || 'Select value...'}</option>
                              {field.options?.map((opt) => (
                                <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
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
                                        className={`flex items-center gap-3 p-3.5 border rounded-none cursor-pointer text-xs font-semibold select-none transition-all ${isSelected
                                          ? 'border-blue-500 bg-blue-600 text-white font-bold'
                                          : isDark
                                            ? 'border-[#1E293B] bg-[#070C18] text-slate-300 hover:border-slate-700'
                                            : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400'
                                          }`}
                                      >
                                        <input
                                          type="checkbox"
                                          value={opt.option_value}
                                          {...register(key, { required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? 'Please select at least one option.' : false })}
                                          className="w-4 h-4 rounded-none accent-blue-600"
                                        />
                                        <span>{opt.option_label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {isOtherChecked && (
                                  <div className="mt-2.5">
                                    <input
                                      type="text"
                                      placeholder="Please specify details for 'Other'..."
                                      {...register(`${key}_other_text`, {
                                        required: isOtherChecked ? "Please specify details for 'Other'" : false
                                      })}
                                      className={`w-full px-4 py-3 border rounded-none text-xs font-medium ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                    {errors[`${key}_other_text`] && (
                                      <p className="mt-1 text-[10px] text-red-500 font-bold flex items-center gap-1.5">
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
                                    className={`flex items-center gap-3 p-3.5 border rounded-none cursor-pointer text-xs font-semibold select-none transition-all ${isSelected
                                      ? 'border-blue-500 bg-blue-600 text-white font-bold'
                                      : isDark
                                        ? 'border-[#1E293B] bg-[#070C18] text-slate-300 hover:border-slate-700'
                                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400'
                                      }`}
                                  >
                                    <input
                                      type="radio"
                                      value={opt.option_value}
                                      {...register(key, { required: (field.is_required === 1 || field.is_required === '1' || field.is_required === true) ? 'Please select an option.' : false })}
                                      className="w-4 h-4 rounded-none accent-blue-600"
                                    />
                                    <span>{opt.option_label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* 6. File Upload */}
                          {['file', 'image', 'resume', 'pdf', 'id_card'].includes(field.field_type) && (
                            <div className={`border border-dashed p-5 text-center space-y-2 ${isDark ? 'border-[#1E293B] bg-[#070C18]' : 'border-slate-300 bg-slate-50'
                              }`}>
                              <input
                                type="file"
                                accept={field.field_type === 'pdf' || field.field_type === 'resume' ? '.pdf' : 'image/*,.pdf'}
                                {...register(key, { required: field.is_required ? `${field.label} is required` : false })}
                                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-mono-tag file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                              />
                            </div>
                          )}

                          {/* Field Error */}
                          {errors[key] && (
                            <p className="font-mono-tag text-[10px] text-red-500 font-bold flex items-center gap-1.5 mt-1">
                              <AlertCircle size={12} />
                              <span>{errors[key].message}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Stepper Controls */}
                <div className="flex justify-between items-center pt-6 border-t border-current/15 gap-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={activeStep === 0}
                    className={`h-11 px-6 font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isDark
                      ? 'border-[#1E293B] bg-[#070C18] text-slate-300 hover:bg-[#0A1128]'
                      : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                  >
                    <ChevronLeft size={14} /> Back
                  </button>

                  {activeStep < formStructure.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={checkingNextStep}
                      className="h-11 px-7 bg-blue-600 hover:bg-blue-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {checkingNextStep ? (
                        <><RefreshCw size={14} className="animate-spin" /> Checking...</>
                      ) : (
                        <>Next Section <ChevronRight size={14} /></>
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-11 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {submitting ? (
                        <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
                      ) : (
                        <><CheckCircle size={14} /> Complete Registration</>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* --- EVENT DETAIL POPUP MODAL --- */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070C18]/88 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className={`relative max-w-lg w-full border overflow-hidden ${isDark ? 'bg-[#0A1128] border-[#1E293B] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Hero image */}
              {selectedEvent.img && (
                <div className="relative h-52 w-full overflow-hidden">
                  <img
                    src={selectedEvent.img}
                    alt={selectedEvent.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-transparent to-transparent" />
                  {/* Tag on image */}
                  <span className="absolute top-4 left-4 font-mono-tag text-[10px] font-black tracking-widest uppercase px-2.5 py-1 bg-blue-600 text-white">
                    {selectedEvent.tag}
                  </span>
                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-[#070C18]/70 border border-white/20 text-white hover:bg-blue-600 transition-colors font-mono-tag font-black text-sm"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-7 space-y-4">
                {!selectedEvent.img && (
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-current/20 hover:bg-blue-600 hover:text-white transition-colors font-mono-tag font-black text-sm"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                )}

                <div className="space-y-1">
                  <p className="font-mono-tag text-[10px] font-bold uppercase tracking-widest text-blue-500">
                    {selectedEvent.subtitle}
                  </p>
                  <h2 className="font-display-heavy text-4xl sm:text-5xl uppercase tracking-tight leading-[0.95]">
                    {selectedEvent.name}
                  </h2>
                </div>

                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                  {selectedEvent.desc}
                </p>

                <div className={`pt-4 border-t flex items-center justify-between ${isDark ? 'border-[#1E293B]' : 'border-slate-200'
                  }`}>
                  <a
                    href="#apply-form"
                    onClick={() => setSelectedEvent(null)}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors"
                  >
                    Join Team Mavericks <ChevronRight size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className={`h-10 px-4 border font-mono-tag text-xs font-bold uppercase tracking-wider transition-colors ${isDark ? 'border-[#1E293B] text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- OTP MODAL (FLAT DESIGN) --- */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070C18]/85 backdrop-blur-sm">
          <div className={`border p-7 max-w-md w-full space-y-6 ${isDark ? 'bg-[#0C152B] border-blue-900 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b pb-4 border-current/20">
              <div>
                <h3 className="font-display-heavy text-lg uppercase tracking-tight">Email Verification</h3>
                <p className="font-mono-tag text-[10px] text-slate-500 uppercase">One-time password confirmation</p>
              </div>
              <button
                onClick={() => setOtpModalOpen(false)}
                className="font-mono-tag text-xs font-bold p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-mono-tag text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)}
                    disabled={otpSent}
                    placeholder="student@example.com"
                    className={`flex-1 h-11 px-3.5 border rounded-none text-xs font-medium ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || (otpSent && otpCountdown > 0)}
                    className="h-11 px-4 bg-blue-600 hover:bg-blue-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {otpSending ? 'Sending…' : otpSent && otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-4 pt-2">
                  <p className="font-mono-tag text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle size={12} />
                    OTP code sent to {otpEmail}
                  </p>
                  <div className="space-y-2">
                    <label className="block font-mono-tag text-[10px] font-bold uppercase tracking-wider text-slate-400">6-Digit OTP</label>
                    <input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className={`w-full h-12 px-4 text-xl font-mono-tag font-black tracking-[0.4em] text-center border rounded-none ${isDark ? 'bg-[#070C18] border-[#1E293B] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpCode.length !== 6}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {otpVerifying ? <><RefreshCw size={13} className="animate-spin" /> Verifying…</> : <><CheckCircle size={13} /> Verify &amp; Submit</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CLEAR CONFIRM MODAL --- */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070C18]/85 backdrop-blur-sm">
          <div className={`border p-7 max-w-md w-full space-y-6 ${isDark ? 'bg-[#0C152B] border-blue-900 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}>
            <div className="space-y-2">
              <h3 className="font-display-heavy text-lg uppercase tracking-tight">Clear Form Data?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will reset your drafted answers in this browser session.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className={`flex-1 h-11 border font-mono-tag text-xs font-bold uppercase ${isDark ? 'border-[#1E293B] bg-[#070C18] text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-800'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearDraft}
                className="flex-1 h-11 bg-red-600 hover:bg-red-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BIG BOTTOM DISPLAY BRANDING --- */}
      <section className={`border-t py-16 px-5 sm:px-8 md:px-14 select-none overflow-hidden ${isDark ? 'border-[#1E293B] bg-[#070C18]' : 'border-slate-200 bg-[#F8FAFC]'
        }`}>
      </section>

      {/* --- FOOTER (KEPT AS IS) --- */}
      <Footer />

    </div>
  );
};

export default PublicLanding;
