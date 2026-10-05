import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  Coins,
  ShieldCheck,
  Building2,
  Users,
  Sparkles,
  Info,
  CreditCard,
  QrCode
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';

const PublicEventRegisterPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [fileInputs, setFileInputs] = useState({});
  const [successData, setSuccessData] = useState(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    mode: 'onTouched',
  });

  useEffect(() => {
    fetchEventAndForm();
  }, [slug]);

  const fetchEventAndForm = async () => {
    try {
      setLoading(true);
      // Fetch event by slug
      const eventRes = await axios.get(`/events/slug/${slug}`);
      setEvent(eventRes.data);

      // Fetch dynamic form structure for this event
      try {
        const formRes = await axios.get(`/events/slug/${slug}/form`);
        setFormConfig(formRes.data.form || null);
        setSections(formRes.data.sections || []);
      } catch (err) {
        // No custom form created yet, will show standard registration fields
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
      toast.error('Event not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (fieldId, file) => {
    setFileInputs((prev) => ({
      ...prev,
      [fieldId]: file,
    }));
  };

  const validateCurrentStep = async () => {
    if (sections.length === 0) return true;
    const currentSection = sections[activeStep];
    if (!currentSection) return true;

    const currentFieldNames = (currentSection.fields || []).map((f) => `field_${f.id}`);
    const standardFields = activeStep === 0 ? ['full_name', 'email', 'phone'] : [];
    const fieldsToValidate = [...standardFields, ...currentFieldNames];

    const isValid = await trigger(fieldsToValidate);

    // Also check required file fields
    for (const f of currentSection.fields || []) {
      if (f.field_type === 'file' && f.is_required && !fileInputs[f.id]) {
        toast.error(`Please upload required file: ${f.label}`);
        return false;
      }
    }

    return isValid;
  };

  const handleNextStep = async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid) {
      setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data) => {
    if (!event) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('full_name', data.full_name || '');
      formData.append('email', data.email || '');
      formData.append('phone', data.phone || '');
      formData.append('transaction_id', data.transaction_id || '');
      formData.append('payment_gateway', data.payment_gateway || 'Manual/UPI');

      // Answers payload
      const dynamicAnswers = {};
      sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
          const val = data[`field_${field.id}`];
          if (val !== undefined && val !== null) {
            dynamicAnswers[field.id] = val;
          }
        });
      });
      formData.append('answers', JSON.stringify(dynamicAnswers));

      // Append files
      Object.keys(fileInputs).forEach((fieldId) => {
        if (fileInputs[fieldId]) {
          formData.append(`file_${fieldId}`, fileInputs[fieldId]);
        }
      });

      const res = await axios.post(`/events/${event.id}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessData({
        ...res.data,
        eventName: event.name,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
      });

      toast.success('Registration submitted successfully!');
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit registration';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <MajorLoader fullPage />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Event Not Found</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-md">The event you are trying to register for could not be found or has ended.</p>
        <Link to="/events" className="mt-6 px-6 py-3 rounded-xl bg-primary-blue text-white text-xs font-bold uppercase tracking-wider">
          Browse All Events
        </Link>
      </div>
    );
  }

  const isRegistrationClosed = event.registration_status === 'closed' || event.event_status === 'completed' || event.event_status === 'archived';
  const isPaid = event.payment_required && parseFloat(event.registration_fee || 0) > 0;

  // Number of steps: If dynamic sections exist, step count = sections.length. Otherwise 1 step.
  const totalSteps = sections.length > 0 ? sections.length : 1;

  // If already submitted successfully, show registration confirmation badge & pass
  if (successData) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col justify-between py-12 px-6">
        <div className="max-w-xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Header decor */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-400 via-primary-blue to-indigo-500" />

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Registration Confirmed!</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {formConfig?.success_message || `You have registered for ${event.name}`}
              </p>
            </div>

            {/* Pass / Token Card */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Registration ID / Token</span>
                  <p className="text-sm font-mono font-black text-primary-blue mt-0.5 select-all">
                    {successData.registration_token || successData.token || `REG-${successData.registration_id || event.id}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</span>
                  <p className="text-xs font-black text-emerald-500 uppercase mt-0.5">
                    {successData.status || 'Confirmed'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Participant</span>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{successData.fullName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email</span>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">{successData.email}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Event</span>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{event.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date</span>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{formatDate(event.start_date) || 'TBA'}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition text-center cursor-pointer"
              >
                Print / Save Pass
              </button>
              <Link
                to="/events"
                className="flex-1 py-3 px-4 rounded-xl bg-primary-blue text-white hover:bg-blue-600 text-xs font-bold transition text-center shadow-md cursor-pointer"
              >
                Explore More Events
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300 flex flex-col justify-between selection:bg-primary-blue selection:text-white">
      {/* Top Banner Header */}
      <div className="relative border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
          >
            <ArrowLeft size={16} />
            <span>Back to Events</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase font-bold text-primary-blue">
              {event.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Registration Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
        {/* Event Hero Info */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 mb-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 border border-primary-blue/20">
                  {event.mode} Event
                </span>
                {isPaid ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Registration Fee: ₹{parseFloat(event.registration_fee).toFixed(0)}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Free Entry
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{event.name}</h1>
              {event.description && (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{event.description}</p>
              )}
            </div>

            {/* Quick Meta Card */}
            <div className="p-4 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 space-y-2.5 text-xs shrink-0 w-full sm:w-64">
              {event.start_date && (
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                  <Calendar size={14} className="text-primary-blue shrink-0" />
                  <span>{formatDate(event.start_date)}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                  <MapPin size={14} className="text-rose-500 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              {event.organizer_name && (
                <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                  <Users size={14} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{event.organizer_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closed notice */}
        {isRegistrationClosed ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 text-center">
            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
            <h3 className="text-lg font-black text-amber-600 dark:text-amber-400">Registrations are currently closed</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              {formConfig?.closed_message || 'This event is not accepting new registrations at this time. Please check back later.'}
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold uppercase tracking-wider"
            >
              Browse other events
            </Link>
          </div>
        ) : (
          /* Multi-step Registration Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Step indicators (if multi-section) */}
            {totalSteps > 1 && (
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id || idx}
                    className={`flex-1 min-w-[120px] flex flex-col gap-1.5 p-3 rounded-2xl border transition-all ${
                      idx === activeStep
                        ? 'bg-primary-blue/10 border-primary-blue/30 text-primary-blue dark:text-blue-400'
                        : idx < activeStep
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-white/40 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">Step {idx + 1}</span>
                    <span className="text-xs font-bold truncate">{sec.name || `Section ${idx + 1}`}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Current Section / Standard Info */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 shadow-sm space-y-6">
              {/* If step 0, render primary participant contact fields */}
              {activeStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">Primary Contact Details</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Please provide your details for registration pass & ticket issuance.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('full_name', { required: 'Full name is required' })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                      />
                      {errors.full_name && (
                        <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                        placeholder="e.g. rahul@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                      />
                      {errors.email && (
                        <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                        WhatsApp / Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        {...register('phone', {
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message: 'Please enter a valid 10-digit phone number',
                          },
                        })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                      />
                      {errors.phone && (
                        <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Section Fields */}
              {sections.length > 0 && sections[activeStep] && (
                <div className="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">{sections[activeStep].name}</h3>
                    {sections[activeStep].description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{sections[activeStep].description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {(sections[activeStep].fields || []).map((field) => {
                      const fieldName = `field_${field.id}`;
                      const isFullWidth = ['textarea', 'file'].includes(field.field_type);

                      return (
                        <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                            {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                          </label>

                          {/* Field types rendering */}
                          {field.field_type === 'textarea' ? (
                            <textarea
                              rows={4}
                              placeholder={field.placeholder || ''}
                              {...register(fieldName, {
                                required: field.is_required ? `${field.label} is required` : false,
                              })}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                            />
                          ) : field.field_type === 'select' ? (
                            <select
                              {...register(fieldName, {
                                required: field.is_required ? `${field.label} is required` : false,
                              })}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                            >
                              <option value="">Select an option</option>
                              {(field.options || []).map((opt) => (
                                <option key={opt.id || opt.option_value} value={opt.option_value}>
                                  {opt.option_label || opt.option_value}
                                </option>
                              ))}
                            </select>
                          ) : field.field_type === 'radio' ? (
                            <div className="space-y-2">
                              {(field.options || []).map((opt) => (
                                <label key={opt.id || opt.option_value} className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    value={opt.option_value}
                                    {...register(fieldName, {
                                      required: field.is_required ? `${field.label} is required` : false,
                                    })}
                                    className="text-primary-blue focus:ring-primary-blue"
                                  />
                                  <span>{opt.option_label || opt.option_value}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.field_type === 'file' ? (
                            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-primary-blue transition bg-zinc-50/50 dark:bg-zinc-950/50">
                              <Upload size={24} className="mx-auto text-zinc-400 mb-2" />
                              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                {fileInputs[field.id] ? fileInputs[field.id].name : 'Click to select or drag & drop file'}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                              <input
                                type="file"
                                onChange={(e) => handleFileChange(field.id, e.target.files[0])}
                                className="hidden"
                                id={`file-input-${field.id}`}
                              />
                              <label
                                htmlFor={`file-input-${field.id}`}
                                className="mt-3 inline-block px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
                              >
                                {fileInputs[field.id] ? 'Change File' : 'Browse File'}
                              </label>
                            </div>
                          ) : (
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                              placeholder={field.placeholder || ''}
                              {...register(fieldName, {
                                required: field.is_required ? `${field.label} is required` : false,
                              })}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
                            />
                          )}

                          {field.help_text && (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{field.help_text}</p>
                          )}
                          {errors[fieldName] && (
                            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {errors[fieldName].message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Details (on final step if paid) */}
              {isPaid && activeStep === totalSteps - 1 && (
                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white">Payment Information</h3>
                      <p className="text-xs text-zinc-500">Registration fee: ₹{parseFloat(event.registration_fee).toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                        UPI Transaction / UTR ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('transaction_id', { required: 'Transaction ID is required for paid events' })}
                        placeholder="e.g. 423456789012"
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                      {errors.transaction_id && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.transaction_id.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              {activeStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-6 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Previous Step
                </button>
              ) : (
                <div />
              )}

              {activeStep < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <CheckCircle2 size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PublicEventRegisterPage;
