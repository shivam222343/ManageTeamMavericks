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
  ChevronLeft
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
        // If not found, redirect to default
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
        <MajorLoader size="h-16 w-16" logoSize="w-9 h-9" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow">
          <AlertCircle className="mx-auto text-accent-red" size={32} />
          <h2 className="text-xl font-bold">Campaign Inactive</h2>
          <p className="text-xs text-zinc-500">This recruitment drive is either closed or does not exist.</p>
        </div>
      </div>
    );
  }

  // Handle Form Submission
  const onSubmitForm = async (data) => {
    const loader = toast.loading('Submitting your registration form...');
    
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

    const formDataObj = new FormData();
    formDataObj.append('campaign_id', campaign.id);
    formDataObj.append('full_name', fullNameVal || '');
    formDataObj.append('prn', prnVal || '');
    formDataObj.append('email', emailVal || '');
    formDataObj.append('phone', phoneVal || '');

    // Dynamic fields
    formStructure.forEach((sec) => {
      sec.fields.forEach((field) => {
        const key = `field_${field.id}`;
        
        // Handle files
        if (['file', 'image', 'resume', 'pdf', 'id_card'].includes(field.field_type)) {
          if (data[key] && data[key][0]) {
            formDataObj.append(key, data[key][0]);
          }
        } else {
          // Normal fields
          formDataObj.append(key, data[key] || '');
        }
      });
    });

    // Handle Preferred Domains (Checkbox array or select list)
    const selectedDomains = data.preferred_domains || [];
    formDataObj.append('domains', JSON.stringify(selectedDomains));

    try {
      const res = await axios.post('/applicants/apply', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.dismiss(loader);
      toast.success('Registration successful!', { icon: '🎉' });
      
      // Clear draft
      localStorage.removeItem(`draft_form_${campaign.id}`);
      
      // Navigate to success page
      navigate('/teammavericks/apply-success', { 
        state: { 
          application_id: res.data.application_id, 
          name: data.full_name,
          campaign_name: campaign.name,
          thank_you_message: campaign.thank_you_message
        } 
      });
    } catch (err) {
      toast.dismiss(loader);
      const errMsg = err.response?.data?.error || 'Failed to submit application. Ensure all fields are filled.';
      
      // Map error to respective field
      let mapped = false;
      const lowerErr = errMsg.toLowerCase();
      
      // Find field type match
      let targetFieldType = null;
      if (lowerErr.includes('prn')) {
        targetFieldType = 'prn';
      } else if (lowerErr.includes('email')) {
        targetFieldType = 'email';
      } else if (lowerErr.includes('phone') || lowerErr.includes('contact number')) {
        targetFieldType = 'phone';
      } else if (lowerErr.includes('name')) {
        targetFieldType = 'text'; // Name is usually 'text' type field
      }

      if (targetFieldType) {
        // Find matching field in form structure
        for (const sec of formStructure) {
          for (const field of sec.fields) {
            if (field.field_type === targetFieldType || (targetFieldType === 'text' && field.label.toLowerCase().includes('name'))) {
              setError(`field_${field.id}`, { type: 'server', message: errMsg });
              mapped = true;
              break;
            }
          }
          if (mapped) break;
        }
      }

      // If it's a file upload error, e.g., "File upload 'Resume' is required"
      if (!mapped) {
        for (const sec of formStructure) {
          for (const field of sec.fields) {
            if (lowerErr.includes(field.label.toLowerCase())) {
              setError(`field_${field.id}`, { type: 'server', message: errMsg });
              mapped = true;
              break;
            }
          }
          if (mapped) break;
        }
      }

      if (!mapped) {
        toast.error(errMsg);
      } else {
        toast.error("Please correct the highlighted errors in the form.");
      }
    }
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-300">
      
      {/* --- Public Header Navigation --- */}
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-200/60 dark:border-zinc-900/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
          <div>
            <h1 className="font-bold text-xs uppercase tracking-widest leading-none">Team Mavericks</h1>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Learning with Fun</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#apply-form"
            className="px-4 py-1.5 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/15 hover:shadow-primary-blue/25 transition cursor-pointer"
          >
            Apply Now
          </a>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section ref={heroRef} className="py-20 md:py-28 px-6 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          <Sparkles size={12} className="text-secondary-orange animate-pulse" />
          <span>KIT CoEK recruitment drive 2026</span>
        </div>

        <h1 
          ref={titleRef} 
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight select-none"
        >
          Build. Lead. Innovation.<br/>
          Join <span className="text-primary-blue dark:text-blue-400">Team Mavericks</span>
        </h1>

        <p 
          ref={descRef} 
          className="text-zinc-500 max-w-xl mx-auto text-sm md:text-base font-semibold leading-relaxed"
        >
          {campaign.description}
        </p>

        {/* Countdown Timer */}
        <div ref={timerRef} className="pt-6">
          <div className="inline-flex flex-col p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-lg shadow-zinc-900/5 max-w-md mx-auto w-full">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-4">Registration Deadline Countdown</span>
            
            {campaignClosed ? (
              <span className="text-sm font-bold text-accent-red uppercase tracking-wider">Recruitment is Closed</span>
            ) : (
              <div className="grid grid-cols-4 gap-4 text-center font-display font-bold">
                <div className="space-y-1">
                  <span className="text-2xl sm:text-3xl text-zinc-800 dark:text-zinc-50">{timeLeft.days}</span>
                  <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">Days</p>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl sm:text-3xl text-zinc-800 dark:text-zinc-50">{timeLeft.hours}</span>
                  <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">Hours</p>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl sm:text-3xl text-zinc-800 dark:text-zinc-50">{timeLeft.minutes}</span>
                  <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">Min</p>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl sm:text-3xl text-zinc-800 dark:text-zinc-50">{timeLeft.seconds}</span>
                  <p className="text-[9px] uppercase tracking-wide text-zinc-400 font-bold">Sec</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- About / Motto Section --- */}
      <section className="py-16 bg-zinc-100/50 dark:bg-zinc-900/30 border-y border-zinc-200/50 dark:border-zinc-900 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Who We Are</span>
            <h2 className="text-3xl font-extrabold tracking-tight">Learning with Fun</h2>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              Team Mavericks is a student-driven organization at KIT's College of Engineering, Kolhapur that conducts technical, personality development, leadership, innovation, and social impact activities. The organization hosts flagship events like BODHANTRA, INVICTA, ARCANE, CARNIVAL, and outreach initiatives for schools.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['BODHANTRA', 'INVICTA', 'ARCANE', 'CARNIVAL'].map((evt) => (
              <div key={evt} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold text-primary-blue uppercase tracking-wider block mb-1">Flagship Event</span>
                <span className="font-extrabold text-sm">{evt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Available Domains --- */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Choose your path</span>
          <h2 className="text-3xl font-extrabold tracking-tight">Active Recruitment Domains</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((dom) => (
            <div 
              key={dom.id}
              className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-sm hover:shadow transition flex flex-col justify-between"
              style={{ borderLeft: `4px solid ${dom.color}` }}
            >
              <div className="space-y-4">
                <div 
                  className="p-2.5 rounded-lg text-white w-fit shadow-md shadow-zinc-950/5"
                  style={{ backgroundColor: dom.color }}
                >
                  {getDomainIcon(dom.icon)}
                </div>
                <h3 className="font-bold text-sm">{dom.name}</h3>
                <p className="text-[11px] text-zinc-500 leading-normal font-semibold">
                  {dom.description}
                </p>
              </div>
              <span className="text-[10px] font-mono mt-4 text-zinc-400 font-bold block">
                MAX INTAKE: {dom.max_intake || 'Flexible'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* --- Dynamic Registration Form (Stepped wizard form) --- */}
      <section id="apply-form" className="py-20 px-6 bg-zinc-100/50 dark:bg-zinc-900/30 border-t border-zinc-200/50 dark:border-zinc-900">
        <div className="max-w-2xl mx-auto space-y-8">
          {campaign.status === 'closed' || campaignClosed ? (
            <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-accent-red rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle size={28} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Recruitment is Closed</h2>
              <p className="text-zinc-500 text-xs font-semibold leading-relaxed max-w-md mx-auto">
                {campaign.closed_message || 'Recruitment is currently closed. Thank you for your interest in Team Mavericks!'}
                <br />
                <span className="mt-2 block text-primary-blue dark:text-blue-400 font-bold">Please contact the club admin or members for further inquiries.</span>
              </p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Start your application</span>
                <h2 className="text-3xl font-extrabold tracking-tight">Candidate Registration</h2>
                <p className="text-xs text-zinc-500">Fill out this dynamic form. Your progress will auto-save as you type.</p>
              </div>

          {/* Stepper Progress Bar */}
          <div className="flex justify-between items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {formStructure.map((sec, idx) => (
              <div key={sec.id} className="flex-1 flex flex-col gap-1 items-center">
                <div className={`h-1.5 w-full rounded-full transition-colors duration-200
                  ${idx <= activeStep ? 'bg-primary-blue' : 'bg-zinc-200 dark:bg-zinc-800'}
                `}></div>
                <span className={`hidden sm:inline truncate max-w-[80px] mt-1
                  ${idx === activeStep ? 'text-primary-blue' : 'text-zinc-400'}
                `}>
                  {sec.name}
                </span>
              </div>
            ))}
          </div>

          {/* Form Structure container */}
          <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl p-6 md:p-8 shadow-md">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-xs font-semibold"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    {formStructure[activeStep]?.name}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold">{formStructure[activeStep]?.description}</p>
                </div>

                {/* Render current step fields */}
                {formStructure[activeStep]?.fields.map((field) => {
                  const key = `field_${field.id}`;
                  
                  // Skip system custom domains in dynamic loops and handle domains selection separately in "Domain preference" section
                  if (field.field_type === 'checkbox' && field.label === 'Preferred Domains') {
                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase text-zinc-500 tracking-wide">
                          {field.label} {field.is_required && <span className="text-accent-red">*</span>}
                        </label>
                        <p className="text-[10px] text-zinc-400 leading-normal font-semibold">{field.description}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {domains.map((dom) => (
                            <label 
                              key={dom.id}
                              className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition
                                ${watch('preferred_domains')?.includes(String(dom.id))
                                  ? 'border-primary-blue bg-primary-blue/5' 
                                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                value={String(dom.id)}
                                {...register('preferred_domains', { required: field.is_required ? 'Please select at least one preferred domain.' : false })}
                                className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                              />
                              <div>
                                <p className="font-bold text-xs">{dom.name}</p>
                                <span className="text-[9px] text-zinc-400 leading-none">{dom.description}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                        {errors.preferred_domains && (
                          <p className="mt-1 text-[10px] text-accent-red flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{errors.preferred_domains.message}</span>
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Default input type renderings
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase text-zinc-500 tracking-wide">
                        {field.label} {field.is_required && <span className="text-accent-red">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-[10px] text-zinc-400 font-semibold mb-1.5 leading-normal">{field.description}</p>
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
                          className={`w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none transition
                            ${errors[key] ? 'border-accent-red/50 focus:ring-accent-red' : 'border-zinc-200 dark:border-zinc-800'}
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
                          className={`w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none transition resize-none
                            ${errors[key] ? 'border-accent-red/50 focus:ring-accent-red' : 'border-zinc-200 dark:border-zinc-800'}
                          `}
                        />
                      )}

                      {/* 3. Dropdown Select */}
                      {field.field_type === 'dropdown' && (
                        <select
                          {...register(key, { required: field.is_required ? `${field.label} is required` : false })}
                          className={`w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none
                            ${errors[key] ? 'border-accent-red/50' : 'border-zinc-200 dark:border-zinc-800'}
                          `}
                        >
                          <option value="">{field.placeholder || 'Select value...'}</option>
                          {field.options?.map((opt) => (
                            <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                          ))}
                        </select>
                      )}

                      {/* 3.1 Radio Buttons (Single Choice) */}
                      {field.field_type === 'radio' && (
                        <div className="space-y-2 pt-1">
                          {field.options?.map((opt) => (
                            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                              <input
                                type="radio"
                                value={opt.option_value}
                                {...register(key, { required: field.is_required ? 'This selection is required.' : false })}
                                className="w-4 h-4 text-primary-blue focus:ring-primary-blue border-zinc-300"
                              />
                              <span>{opt.option_label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* 3.2 Checkboxes (Multiple Choice) */}
                      {field.field_type === 'checkbox' && (
                        <div className="space-y-2 pt-1">
                          {field.options?.map((opt) => (
                            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                              <input
                                type="checkbox"
                                value={opt.option_value}
                                {...register(key, { required: field.is_required ? 'Please select at least one option.' : false })}
                                className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue border-zinc-300"
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
                            <div className="flex gap-1.5 text-amber-500 text-base">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => onChange(star)}
                                  className="hover:scale-110 transition cursor-pointer text-lg"
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
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept={field.validation_rules?.types?.join(', ') || (field.field_type === 'image' ? 'image/*' : '*/*')}
                            {...register(key, { required: field.is_required ? `${field.label} file is required` : false })}
                            className={`w-full p-2 border bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none transition
                              ${errors[key] ? 'border-accent-red/50 focus:ring-accent-red' : 'border-zinc-200 dark:border-zinc-800'}
                            `}
                          />
                          {/* Image Live Preview */}
                          {formValues[key] && formValues[key][0] && formValues[key][0].type?.startsWith('image/') && (
                            <div className="relative mt-2 border border-zinc-200 dark:border-zinc-850 rounded-lg overflow-hidden max-w-[160px] max-h-[160px] bg-zinc-100 dark:bg-zinc-950 shadow-inner flex items-center justify-center">
                              <img 
                                src={URL.createObjectURL(formValues[key][0])} 
                                alt="Upload Preview" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 6. Consent Checkbox */}
                      {field.field_type === 'consent' && (
                        <label className="flex gap-2 items-start cursor-pointer select-none">
                          <input
                            type="checkbox"
                            {...register(key, { required: field.is_required ? 'You must accept the declaration.' : false })}
                            className="w-4 h-4 rounded border-zinc-300 text-primary-blue focus:ring-primary-blue mt-0.5"
                          />
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                            {field.description || 'I confirm the information above.'}
                          </span>
                        </label>
                      )}

                      {field.help_text && (
                        <p className="text-[9px] text-zinc-400 font-medium font-sans flex items-center gap-1">
                          <HelpCircle size={10} />
                          <span>{field.help_text}</span>
                        </p>
                      )}

                      {errors[key] && (
                        <p className="mt-1 text-[10px] text-accent-red flex items-center gap-1">
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
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-5 mt-8 gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStep === 0}
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-bold shadow-sm disabled:opacity-40 transition cursor-pointer select-none"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {activeStep < formStructure.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-850 text-white dark:bg-zinc-850 hover:bg-zinc-800 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold shadow transition cursor-pointer select-none"
                >
                  <span>Next Step</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/15 hover:shadow transition cursor-pointer select-none"
                >
                  <CheckCircle size={14} />
                  <span>Submit Application</span>
                </button>
              )}
            </div>

          </form>
          </>
          )}
        </div>
      </section>

      {/* --- FAQs Accordion --- */}
      <section className="py-20 max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Have Questions?</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-4 text-left font-bold flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/50"
              >
                <span>{faq.question || faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-zinc-400 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100 dark:border-zinc-850"
                  >
                    <p className="p-4 text-zinc-500 font-medium leading-relaxed font-sans text-xs">
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
      <footer className="py-12 border-t border-zinc-200 dark:border-zinc-900 text-center px-6 bg-zinc-100/50 dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
            <div className="text-left">
              <span className="font-bold text-xs uppercase tracking-widest text-zinc-900 dark:text-zinc-50 block leading-none mb-1">Team Mavericks</span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Learning with Fun</p>
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-normal">
            © {new Date().getFullYear()} Team Mavericks KIT CoEK Kolhapur.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicLanding;
