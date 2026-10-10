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
  ArrowUpRight,
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
  QrCode,
  Globe,
  Sun,
  Moon,
  ChevronDown,
  X,
  FileCheck,
  Award,
  Copy,
  Check,
  Mail,
  LogIn,
  Layers,
  Plus,
  Trash2,
  UserPlus,
  CheckSquare,
  Square,
  Lock
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useTheme } from '../../context/ThemeContext';
import Footer from '../../components/layout/Footer';
import ElectricBorder from '../../components/ui/ElectricBorder';
import InteractiveBackground from '../../components/ui/InteractiveBackground';
import { FLAGSHIP_EVENTS_DATA } from './PublicEventsPage';

const DEFAULT_EVENT_INFO = {
  'bodhantra': {
    subtitle: 'Five-Day College Event & Symposium',
    desc: 'A five-day college event for first-year students featuring technical and non-technical sessions, interactive discussions, team-building challenges, and creative competitions.',
    fullDesc: 'Bodhantra is Team Mavericks flagship induction and symposium event designed specifically for first-year engineering students. Over 5 immersive days, participants undergo intensive workshops in cutting-edge tech stacks, hands-on lab sessions, mock hackathons, and high-energy leadership challenges.',
    highlights: [
      'Hands-on technical workshops in Web Development, AI/ML, and Cloud',
      'Team-building challenges and creative brainstorm hackathons',
      'One-on-one mentorship from senior core team leads and alumni',
      'Grand finale awards ceremony and certificates for all participants'
    ],
    tag: 'LEARNING & COMPETITIONS',
    img: '/event-assets/bodhantra.jpeg'
  },
  'invicta': {
    subtitle: 'Workshop & Hackathon Series',
    desc: 'A workshop series covering technical and non-technical topics including web development, ethical hacking, soft skills, mental health, and more.',
    fullDesc: 'Invicta brings together top industry professionals and student innovators for comprehensive multi-track bootcamps. From deep-dive cybersecurity labs to UI/UX product design masterclasses, Invicta empowers students to build real-world products within 48-hour sprint cycles.',
    highlights: [
      'Masterclasses by industry experts & Google/Microsoft student leads',
      'Live CTF (Capture the Flag) and Ethical Hacking challenges',
      'UI/UX design sprints & rapid prototyping showcase',
      'Cash prizes, exclusive merchandise, and internship referral opportunities'
    ],
    tag: 'WORKSHOPS & HACKATHONS',
    img: '/event-assets/invicta.png'
  },
  'varba-fest': {
    subtitle: 'Placement Preparation & Mock Interviews',
    desc: 'A one-day placement preparation event featuring Group Discussions, debates, and mock interviews to build communication skills, confidence, and recruitment readiness.',
    fullDesc: 'VerbaFest is an intensive corporate readiness boot camp simulated like top-tier campus recruitment drives. Engineering students face rigorous Aptitude Tests, Technical Group Discussions, Case Study Analysis, and HR Mock Interviews conducted by alumni working at tier-1 MNCs.',
    highlights: [
      'Simulated GD rounds with real-time feedback from alumni panellists',
      'One-on-one technical mock interviews for TCS, Infosys, Capgemini & product firms',
      'Resume reviews, LinkedIn profile audit, and portfolio critique',
      'Stress interview mastery and public speaking masterclasses'
    ],
    tag: 'PLACEMENT & CAREER',
    img: '/event-assets/verbafest.JPG'
  },
  'verbafest': {
    subtitle: 'Placement Preparation & Mock Interviews',
    desc: 'A one-day placement preparation event featuring Group Discussions, debates, and mock interviews to build communication skills, confidence, and recruitment readiness.',
    fullDesc: 'VerbaFest is an intensive corporate readiness boot camp simulated like top-tier campus recruitment drives. Engineering students face rigorous Aptitude Tests, Technical Group Discussions, Case Study Analysis, and HR Mock Interviews conducted by alumni working at tier-1 MNCs.',
    highlights: [
      'Simulated GD rounds with real-time feedback from alumni panellists',
      'One-on-one technical mock interviews for TCS, Infosys, Capgemini & product firms',
      'Resume reviews, LinkedIn profile audit, and portfolio critique',
      'Stress interview mastery and public speaking masterclasses'
    ],
    tag: 'PLACEMENT & CAREER',
    img: '/event-assets/verbafest.JPG'
  },
  'school-visit': {
    subtitle: 'Community Outreach & Rural Tech Initiative',
    desc: 'A school outreach initiative in rural areas of Kolhapur featuring technology demonstrations, workshops, career guidance, and sessions on emerging technologies.',
    fullDesc: 'As part of Team Mavericks social responsibility mission, School Visit brings hands-on STEM education and robotics demonstrations to underprivileged rural schools in the Kolhapur district, inspiring the next generation of scientists, engineers, and creators.',
    highlights: [
      'Interactive science & robotics demonstrations for 8th-10th grade students',
      'Digital literacy workshops and computer programming basics',
      'Career guidance and engineering awareness sessions',
      'Donation of books, educational kits, and tech resources'
    ],
    tag: 'COMMUNITY OUTREACH',
    img: '/event-assets/school_visit.jpg'
  }
};

const PublicEventRegisterPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [sections, setSections] = useState([]);
  const [subEvents, setSubEvents] = useState([]);
  const [selectedSubEvents, setSelectedSubEvents] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [fileInputs, setFileInputs] = useState({});
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDuplicate: false,
    email: ''
  });

  // Always scroll to top when successful registration pass view opens
  useEffect(() => {
    if (successData) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [successData]);

  // 10-second countdown timer for auto-redirecting to /user-login with credentials
  useEffect(() => {
    let timer;
    if (successData && autoRedirect && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (successData && autoRedirect && countdown === 0) {
      navigate('/user-login', {
        state: {
          email: successData.credentials?.email || successData.email,
          password: successData.credentials?.password || '',
          autoFill: true
        }
      });
    }
    return () => clearTimeout(timer);
  }, [successData, autoRedirect, countdown, navigate]);

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`, { icon: '📋' });
  };

  const handleManualLoginRedirect = () => {
    navigate('/user-login', {
      state: {
        email: successData?.credentials?.email || successData?.email || '',
        password: successData?.credentials?.password || '',
        autoFill: true
      }
    });
  };

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

      // Fetch dynamic form structure & sub-events for this event
      try {
        const formRes = await axios.get(`/events/slug/${slug}/form`);
        setFormConfig(formRes.data.form || null);
        setSections(formRes.data.sections || []);
        const subs = formRes.data.sub_events || [];
        setSubEvents(subs);

        // Auto-select open sub-events by default if available
        if (subs.length > 0) {
          const initMap = {};
          subs.forEach((s) => {
            const isFull = Boolean(s.max_participants && s.max_participants > 0 && (s.total_registrations || 0) >= parseInt(s.max_participants));
            const isClosed = s.registration_status === 'closed' || isFull;
            const minMembers = s.type === 'group' ? (s.min_team_size || 2) : 1;
            initMap[s.id] = {
              selected: !isClosed,
              team_name: '',
              team_members: Array.from({ length: minMembers }, () => ({
                name: '',
                email: '',
                phone: '',
                prn: ''
              }))
            };
          });
          setSelectedSubEvents(initMap);
        }
      } catch (err) {
        setSections([]);
        setSubEvents([]);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
      toast.error('Event not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubEvent = (subId) => {
    const subObj = subEvents.find((s) => s.id === subId);
    const maxPart = subObj?.max_participants ? parseInt(subObj.max_participants) : null;
    const totalRegs = subObj?.total_registrations ? parseInt(subObj.total_registrations) : 0;
    const isFull = Boolean(maxPart && maxPart > 0 && totalRegs >= maxPart);
    const isClosed = subObj?.registration_status === 'closed' || isFull;

    if (isClosed) {
      toast.error(isFull ? `Registrations for ${subObj.name} are full (Capacity reached)` : `Registrations for ${subObj.name} are currently closed.`);
      return;
    }

    setSelectedSubEvents((prev) => {
      const current = prev[subId];
      const isSelected = !current?.selected;
      const minMembers = subObj?.type === 'group' ? (subObj.min_team_size || 2) : 1;

      const defaultMembers = Array.from({ length: minMembers }, () => ({
        name: '',
        email: '',
        phone: '',
        prn: ''
      }));

      return {
        ...prev,
        [subId]: {
          selected: isSelected,
          team_name: current?.team_name || '',
          team_members: current?.team_members?.length ? current.team_members : defaultMembers
        }
      };
    });
  };

  const handleSelectAllSubEvents = () => {
    const openSubs = subEvents.filter((s) => {
      const maxPart = s.max_participants ? parseInt(s.max_participants) : null;
      const totalRegs = s.total_registrations ? parseInt(s.total_registrations) : 0;
      return s.registration_status !== 'closed' && !(maxPart && maxPart > 0 && totalRegs >= maxPart);
    });

    if (openSubs.length === 0) {
      toast.error('All sub-events are currently closed or full.');
      return;
    }

    const allOpenSelected = openSubs.every((s) => selectedSubEvents[s.id]?.selected);
    const updated = { ...selectedSubEvents };

    openSubs.forEach((s) => {
      const minMembers = s.type === 'group' ? (s.min_team_size || 2) : 1;
      updated[s.id] = {
        selected: !allOpenSelected,
        team_name: selectedSubEvents[s.id]?.team_name || '',
        team_members: selectedSubEvents[s.id]?.team_members?.length
          ? selectedSubEvents[s.id].team_members
          : Array.from({ length: minMembers }, () => ({ name: '', email: '', phone: '', prn: '' }))
      };
    });
    setSelectedSubEvents(updated);
  };

  const handleUpdateTeamName = (subId, name) => {
    setSelectedSubEvents((prev) => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        team_name: name
      }
    }));
  };

  const handleUpdateTeamMember = (subId, memberIndex, field, value) => {
    setSelectedSubEvents((prev) => {
      const members = [...(prev[subId]?.team_members || [])];
      members[memberIndex] = {
        ...(members[memberIndex] || {}),
        [field]: value
      };
      return {
        ...prev,
        [subId]: {
          ...(prev[subId] || {}),
          team_members: members
        }
      };
    });
  };

  const handleAddTeamMember = (subId) => {
    const subObj = subEvents.find((s) => s.id === subId);
    const max = subObj?.max_team_size || 5;
    const currentMembers = selectedSubEvents[subId]?.team_members || [];
    if (currentMembers.length >= max) {
      toast.error(`Maximum ${max} members allowed for this competition`);
      return;
    }
    setSelectedSubEvents((prev) => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        team_members: [...(prev[subId]?.team_members || []), { name: '', email: '', phone: '', prn: '' }]
      }
    }));
  };

  const handleRemoveTeamMember = (subId, memberIndex) => {
    const subObj = subEvents.find((s) => s.id === subId);
    const min = subObj?.min_team_size || 1;
    const currentMembers = selectedSubEvents[subId]?.team_members || [];
    if (currentMembers.length <= min) {
      toast.error(`Minimum ${min} members required for this competition`);
      return;
    }
    setSelectedSubEvents((prev) => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        team_members: currentMembers.filter((_, idx) => idx !== memberIndex)
      }
    }));
  };

  const handleFileChange = (fieldId, file) => {
    setFileInputs((prev) => ({
      ...prev,
      [fieldId]: file,
    }));
  };

  const handleScreenshotChange = (file) => {
    if (!file) {
      setPaymentScreenshot(null);
      setPaymentScreenshotPreview(null);
      return;
    }
    setPaymentScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Merge default text if description or highlights are missing in DB
  const fallbackInfo = DEFAULT_EVENT_INFO[slug] || DEFAULT_EVENT_INFO[event?.slug] || null;
  const eventSubtitle = fallbackInfo?.subtitle || 'Official Event Registration';
  const eventDesc = event?.description || fallbackInfo?.fullDesc || fallbackInfo?.desc || 'Join Team Mavericks for this high-energy flagship event at KIT College of Engineering, Kolhapur.';
  const eventHighlights = fallbackInfo?.highlights || [
    'Hands-on interactive sessions and live projects',
    'Mentorship from senior core team leads & alumni',
    'Official Certificate of Participation for all attendees',
    'Networking and career development opportunities'
  ];

  // Dynamic Sub-Events & Combo Pricing Calculation
  const selectedSubList = subEvents.filter((s) => selectedSubEvents[s.id]?.selected);
  const isAllSubSelected = subEvents.length > 0 && selectedSubList.length === subEvents.length;
  const comboFeeVal = event?.combo_fee ? parseFloat(event.combo_fee) : null;
  const individualSumFee = selectedSubList.reduce((acc, s) => acc + parseFloat(s.fee || 0), 0);

  const effectiveFee =
    subEvents.length > 0
      ? isAllSubSelected && comboFeeVal !== null && comboFeeVal > 0
        ? comboFeeVal
        : individualSumFee
      : parseFloat(event?.registration_fee || 0);

  const isPaid = Boolean(event?.payment_required && effectiveFee > 0);
  const hasSubEventsStep = subEvents.length > 0;
  const totalSteps = (hasSubEventsStep ? 1 : 0) + sections.length + (isPaid ? 1 : 0);

  const validateCurrentStep = async () => {
    if (sections.length === 0 && !isPaid && !hasSubEventsStep) return true;

    // 1. Validate dedicated Sub-Events step (Step 0 when sub-events exist)
    if (hasSubEventsStep && activeStep === 0) {
      if (selectedSubList.length === 0) {
        toast.error('Please select at least one sub-event / competition track to participate in.');
        return false;
      }
      for (const sub of selectedSubList) {
        if (sub.type === 'group') {
          const subData = selectedSubEvents[sub.id];
          if (!subData?.team_name?.trim()) {
            toast.error(`Please provide a Team Name for ${sub.name}`);
            return false;
          }
          const members = subData?.team_members || [];
          const min = sub.min_team_size || 2;
          if (members.length < min) {
            toast.error(`At least ${min} team members are required for ${sub.name}`);
            return false;
          }
          for (let i = 0; i < members.length; i++) {
            if (!members[i]?.name?.trim()) {
              toast.error(`Please fill in Name for Member ${i + 1} in ${sub.name}`);
              return false;
            }
          }
        }
      }
      return true;
    }

    // 2. Validate Dynamic Form Sections
    const sectionOffset = hasSubEventsStep ? 1 : 0;
    const currentSectionIndex = activeStep - sectionOffset;

    if (currentSectionIndex >= 0 && currentSectionIndex < sections.length) {
      const currentSection = sections[currentSectionIndex];
      if (!currentSection) return true;

      const currentFieldNames = (currentSection.fields || [])
        .filter((f) => f.field_type !== 'file')
        .map((f) => `field_${f.id}`);

      let isValid = true;
      if (currentFieldNames.length > 0) {
        isValid = await trigger(currentFieldNames);
      }

      if (!isValid) return false;

      // Check required file fields
      for (const f of currentSection.fields || []) {
        if (['file', 'image', 'resume', 'pdf'].includes(f.field_type) && f.is_required && !fileInputs[f.id]) {
          toast.error(`Please upload required file: ${f.label}`);
          return false;
        }
      }

      // Check for already registered email in this section or current form values
      const currentValues = watch();
      let emailToCheck = '';
      for (const f of currentSection.fields || []) {
        const val = currentValues[`field_${f.id}`];
        if (val && (f.field_type === 'email' || (f.label || '').toLowerCase().includes('email'))) {
          emailToCheck = String(val).trim();
          break;
        }
      }

      if (!emailToCheck) {
        if (currentValues.email) emailToCheck = String(currentValues.email).trim();
        else {
          for (const [_, v] of Object.entries(currentValues)) {
            if (typeof v === 'string' && v.includes('@') && v.includes('.')) {
              emailToCheck = v.trim();
              break;
            }
          }
        }
      }

      if (emailToCheck && emailToCheck.includes('@') && event?.id) {
        try {
          const checkRes = await axios.get(`/events/${event.id}/check-email?email=${encodeURIComponent(emailToCheck)}`);
          if (checkRes.data?.is_registered) {
            setAlertModal({
              isOpen: true,
              title: 'Already Registered',
              message: `A registration with the email "${emailToCheck}" already exists for ${event.name}. You cannot register multiple times with the same email.`,
              isDuplicate: true,
              email: emailToCheck
            });
            return false;
          }
        } catch (e) {
          console.error('Email check failed:', e);
        }
      }

      return true;
    }

    // 3. Validate Payment Step
    if (isPaid && activeStep === totalSteps - 1) {
      if (event?.payment_method === 'razorpay') {
        return true;
      }
      const isTxValid = await trigger(['transaction_id']);
      if (!isTxValid) return false;
      if (event?.require_payment_screenshot && !paymentScreenshot) {
        toast.error('Please upload your payment screenshot/receipt');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid) {
      setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
      const formElement = document.getElementById('registration-form-section');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    const formElement = document.getElementById('registration-form-section');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const onSubmit = async (data) => {
    if (!event) return;

    let resolvedFullName = '';
    let resolvedEmail = '';
    let resolvedPhone = '';

    try {
      setSubmitting(true);

      const formData = new FormData();
      const dynamicAnswers = {};

      if (Array.isArray(sections)) {
        sections.forEach((section) => {
          (section.fields || []).forEach((field) => {
            const key = `field_${field.id}`;
            const val = data[key];
            if (val !== undefined && val !== null && val !== '') {
              dynamicAnswers[field.id] = val;
              const lbl = (field.label || '').toLowerCase();
              if (!resolvedFullName && (field.field_type === 'text' && (lbl.includes('name') || lbl.includes('full name')))) {
                resolvedFullName = String(val).trim();
              }
              if (!resolvedEmail && (field.field_type === 'email' || lbl.includes('email'))) {
                resolvedEmail = String(val).trim();
              }
              if (!resolvedPhone && (field.field_type === 'tel' || lbl.includes('phone') || lbl.includes('whatsapp') || lbl.includes('contact') || lbl.includes('mobile'))) {
                resolvedPhone = String(val).trim();
              }
            }
          });
        });
      }

      // Check direct fallback from data
      if (!resolvedFullName && data.full_name) resolvedFullName = String(data.full_name).trim();
      if (!resolvedEmail && data.email) resolvedEmail = String(data.email).trim();
      if (!resolvedPhone && data.phone) resolvedPhone = String(data.phone).trim();

      // Scan all submitted keys for email if still missing
      if (!resolvedEmail) {
        Object.entries(data).forEach(([_, v]) => {
          if (typeof v === 'string' && v.includes('@') && v.includes('.')) {
            resolvedEmail = v.trim();
          }
        });
      }

      formData.append('full_name', resolvedFullName || 'Participant');
      formData.append('email', resolvedEmail || '');
      formData.append('phone', resolvedPhone || '');
      formData.append('transaction_id', data.transaction_id || '');
      formData.append('payment_gateway', event?.payment_method === 'razorpay' ? 'Razorpay' : (data.payment_gateway || 'Manual/UPI'));
      formData.append('answers', JSON.stringify(dynamicAnswers));

      // Append selected sub-events
      if (subEvents.length > 0) {
        const subEventsPayload = selectedSubList.map((s) => ({
          sub_event_id: s.id,
          team_name: selectedSubEvents[s.id]?.team_name || '',
          team_members: selectedSubEvents[s.id]?.team_members || []
        }));
        formData.append('selected_sub_events', JSON.stringify(subEventsPayload));
      }

      // Append files
      Object.keys(fileInputs).forEach((fieldId) => {
        if (fileInputs[fieldId]) {
          formData.append(`file_${fieldId}`, fileInputs[fieldId]);
        }
      });

      // Append payment screenshot if uploaded
      if (paymentScreenshot) {
        formData.append('payment_screenshot', paymentScreenshot);
      }

      const res = await axios.post(`/events/${event.id}/register`, formData);

      setSuccessData({
        ...res.data,
        eventName: event.name,
        fullName: resolvedFullName || data.full_name || 'Participant',
        email: resolvedEmail || data.email || '',
        phone: resolvedPhone || data.phone || '',
        token: res.data.registration_token || res.data.token || `EVT-${event.id}`
      });

      toast.success('Registration submitted successfully!');
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to submit registration';
      const isDuplicate = msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already registered');

      setAlertModal({
        isOpen: true,
        title: isDuplicate ? 'Already Registered' : 'Registration Alert',
        message: msg,
        isDuplicate,
        email: resolvedEmail || data?.email || ''
      });
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

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue ${isDark
    ? 'bg-[#0E172A] border-[#1E293B] text-white placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
    }`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#070C18]' : 'bg-[#FAFAF9]'}`}>
        <MajorLoader fullPage />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-[#070C18] text-white' : 'bg-[#FAFAF9] text-slate-900'}`}>
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tight">Event Not Found</h1>
        <p className="text-xs text-slate-400 mt-2 max-w-md">The event you are looking for does not exist or has been archived.</p>
        <Link to="/events" className="mt-6 px-6 py-3 rounded-xl bg-primary-blue text-white text-xs font-bold uppercase tracking-wider">
          Browse All Events
        </Link>
      </div>
    );
  }

  const maxParticipants = event.max_participants ? parseInt(event.max_participants) : null;
  const totalRegistrations = event.total_registrations ? parseInt(event.total_registrations) : 0;
  const isCapacityReached = Boolean(maxParticipants && maxParticipants > 0 && totalRegistrations >= maxParticipants);
  const isRegistrationClosed = event.registration_status === 'closed' || isCapacityReached || event.event_status === 'completed' || event.event_status === 'archived';

  // --- CREATIVE VIP ENTRY PASS & CONFIRMATION VIEW ---
  if (successData) {
    const creds = successData.credentials || {};
    const emailSent = successData.email_sent !== false &&
      successData.send_confirmation_email !== false &&
      event.send_confirmation_email !== 0 &&
      event.send_confirmation_email !== false &&
      event.send_confirmation_email !== '0';

    return (
      <div className={`min-h-screen font-sans flex flex-col justify-between pt-10 pb-16 px-2.5 sm:px-6 transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-[#07111f] text-white' : 'bg-[#FAFAF9] text-slate-900'
        }`}>
        {/* Interactive Background & Cursor Effects (preview (1).html) */}
        <InteractiveBackground />

        <div className="max-w-2xl mx-auto w-full relative z-10 space-y-6 mb-16 sm:mb-24">

          {/* Top 10-Second Countdown Alert Strip */}
          {autoRedirect ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg ${isDark ? 'bg-[#0E172A]/90 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-primary-blue flex items-center justify-center font-mono font-black text-sm shrink-0 border border-blue-500/30">
                  {countdown}s
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    Redirecting to Participant Portal in <span className="text-primary-blue font-black">{countdown}s</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Your email and generated password will be auto-filled for instant access.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleManualLoginRedirect}
                  className="px-3.5 py-1.5 rounded-xl bg-primary-blue hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Go Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRedirect(false);
                    toast('Auto-redirect paused. You can inspect your pass.', { icon: '⏸️' });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  Stay
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Holographic VIP Ticket Pass with Electric Border */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <ElectricBorder
              color={isDark ? '#38bdf8' : '#1e40af'}
              speed={1}
              chaos={0.12}
              borderRadius={24}
              className="w-full"
            >
              <div
                className={`rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all ${isDark ? 'bg-gradient-to-b from-[#0E172A] via-[#0E172A] to-[#0A1128] border border-blue-500/30' : 'bg-white border border-slate-300 shadow-xl'
                  }`}
              >
                {/* Pass Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src="/Logos/Mavericks_Logo.png"
                      alt="Team Mavericks"
                      className="h-10 w-auto object-contain select-none"
                    />
                    <div>
                      <span className="font-mono-tag text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                        ★ OFFICIAL ENTRY PASS &amp; BADGE ★
                      </span>
                      <h2 className="font-display-heavy text-2xl sm:text-3xl uppercase tracking-tight text-zinc-900 dark:text-white leading-none mt-0.5">
                        {event.name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 size={13} />
                      <span>REGISTRATION {successData.status || 'CONFIRMED'}</span>
                    </span>
                  </div>
                </div>

                {/* Email notice status banner */}
                {!emailSent ? (
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <Mail size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-xs font-black text-amber-500 uppercase font-mono tracking-wide">
                        Email Confirmation Not Sent (Disabled for this Event)
                      </p>
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-0.5">
                        Registration email dispatch is disabled for this event. <strong>Please copy and save your Entry Pass Token &amp; Generated Password</strong> displayed below for your records and portal access.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5">
                    <Mail size={15} className="text-primary-blue shrink-0" />
                    <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Confirmation email &amp; credentials also dispatched to <strong className="text-primary-blue">{successData.email}</strong>.
                    </p>
                  </div>
                )}

                {/* Pass Details Grid */}
                <div className="py-6 space-y-4">
                  <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'
                    }`}>

                    {/* Token Row */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          ENTRY PASS TOKEN
                        </span>
                        <p className="text-lg font-mono font-black text-primary-blue mt-0.5 select-all tracking-wider">
                          {successData.registration_token || successData.token || `EVT-${event.id}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(successData.registration_token || successData.token, 'Pass Token')}
                        className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Copy Token"
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-mono-tag text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                          PARTICIPANT NAME
                        </span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{successData.fullName}</p>
                      </div>
                      <div>
                        <span className="font-mono-tag text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                          REGISTERED EMAIL
                        </span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{successData.email}</p>
                      </div>
                      <div>
                        <span className="font-mono-tag text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                          EVENT DATE &amp; TIME
                        </span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{formatDate(event.start_date) || 'To Be Announced'}</p>
                      </div>
                      <div>
                        <span className="font-mono-tag text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                          VENUE / LOCATION
                        </span>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{event.location || "KIT's College of Engineering"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Participant Account Credentials Box */}
                  <div className={`p-5 rounded-2xl border space-y-3 relative overflow-hidden ${isDark ? 'bg-gradient-to-r from-blue-950/40 via-[#0E172A] to-indigo-950/40 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} className="text-primary-blue animate-pulse" />
                        <span className="font-mono-tag text-[10px] font-black uppercase tracking-widest text-primary-blue">
                          YOUR PARTICIPANT PORTAL LOGIN
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${emailSent ? 'text-slate-400' : 'text-amber-500'}`}>
                        {emailSent ? '✓ Emailed to inbox' : '⚠️ Save details now'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-[#070C18]/80 border-[#1E293B]' : 'bg-white border-slate-200'
                        }`}>
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Login Email</span>
                          <span className="font-bold text-zinc-900 dark:text-white truncate block">{creds.email || successData.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(creds.email || successData.email, 'Email')}
                          className="text-slate-400 hover:text-primary-blue p-1 transition cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                      </div>

                      <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-[#070C18]/80 border-[#1E293B]' : 'bg-white border-slate-200'
                        }`}>
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Generated Password</span>
                          <span className="font-mono font-black text-emerald-400 tracking-wider block">{creds.password || '••••••••'}</span>
                        </div>
                        {creds.password ? (
                          <button
                            type="button"
                            onClick={() => handleCopyText(creds.password, 'Password')}
                            className="text-slate-400 hover:text-emerald-400 p-1 transition cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {!emailSent && (
                      <p className="text-[10px] text-amber-500/90 font-medium pt-1">
                        * Note: This password will not be emailed. Please note it down to access your participant dashboard anytime.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleManualLoginRedirect}
                    className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono-tag text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Access Participant Portal</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`py-3.5 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer flex items-center justify-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900'
                      }`}
                  >
                    <span>Print Pass</span>
                  </button>
                </div>
              </div>
            </ElectricBorder>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative selection:bg-primary-blue selection:text-white flex flex-col justify-between overflow-x-hidden ${isDark ? 'bg-[#07111f] text-slate-100' : 'bg-[#FAFAF9] text-slate-900'
      }`}>
      {/* Interactive Background & Cursor Effects (preview (1).html) */}
      <InteractiveBackground />

      <div className="relative z-10">
        {/* Navigation Bar */}
        <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${isDark ? 'bg-[#070C18]/80 border-[#1E293B]' : 'bg-white/80 border-slate-200'
          }`}>
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-20 flex items-center justify-between">
            <Link to="/events" className="flex items-center gap-3 group">
              <img
                src="/Logos/Mavericks_Logo.png"
                alt="Team Mavericks Logo"
                className="h-9 w-auto object-contain select-none group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-display-heavy text-base sm:text-lg tracking-tight uppercase leading-none text-zinc-900 dark:text-white">
                  Team Mavericks
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-blue font-bold mt-1">
                  Event Registration
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleTheme}
                className={`hidden sm:flex p-2 rounded-xl border transition cursor-pointer ${isDark
                  ? 'border-slate-800 bg-slate-900 text-yellow-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <Link
                to="/user-login"
                title="Participant Login"
                className={`inline-flex items-center justify-center gap-1.5 p-2.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Participant Login</span>
              </Link>

              <Link
                to="/events"
                title="All Events"
                className={`inline-flex items-center justify-center gap-1.5 p-2.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">All Events</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-12 px-2.5 sm:px-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
            <div className="flex-1 max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest mb-6 border shadow-sm ${isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
              >
                <Sparkles size={14} className="animate-pulse" />
                TEAM MAVERICKS // OFFICIAL REGISTRATION
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display-heavy text-4xl sm:text-6xl md:text-7xl uppercase tracking-tight leading-[0.95] text-zinc-900 dark:text-white"
              >
                {event.name}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-mono-tag text-xs sm:text-sm font-bold uppercase tracking-widest text-primary-blue mt-3"
              >
                {eventSubtitle}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`mt-5 text-sm sm:text-base leading-relaxed max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
              >
                {eventDesc}
              </motion.p>

              {/* Highlights Pill List */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-8 space-y-2.5"
              >
                {eventHighlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Event Quick Info Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`w-full lg:w-96 rounded-3xl border p-6 sm:p-8 space-y-5 shadow-xl ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
                }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-mono-tag text-[10px] font-black uppercase tracking-widest text-slate-400">
                  EVENT STATUS
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${isCapacityReached
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : isRegistrationClosed
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                  {isCapacityReached ? 'CAPACITY FULL' : isRegistrationClosed ? 'REGISTRATION CLOSED' : 'REGISTRATION OPEN'}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {event.start_date && (
                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-primary-blue shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-tag text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Date &amp; Time</span>
                      <p className="font-bold mt-0.5">{formatDate(event.start_date)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono-tag text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Venue / Location</span>
                    <p className="font-bold mt-0.5">{event.location || "KIT's College of Engineering, Kolhapur"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono-tag text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Event Mode</span>
                    <p className="font-bold uppercase mt-0.5">{event.mode} format</p>
                  </div>
                </div>

                {maxParticipants && maxParticipants > 0 ? (
                  <div className="flex items-start gap-3">
                    <Users size={18} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono-tag text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Seat Capacity</span>
                      <p className="font-bold mt-0.5">
                        {isCapacityReached
                          ? `${maxParticipants}/${maxParticipants} Seats Filled (Housefull)`
                          : `${totalRegistrations}/${maxParticipants} Registered (${Math.max(0, maxParticipants - totalRegistrations)} spots remaining)`}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <Coins size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono-tag text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Registration Fee</span>
                    <p className="font-bold mt-0.5">
                      {isPaid ? `₹${parseFloat(event.registration_fee).toFixed(0)} per participant` : 'Free Entry'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {isCapacityReached || isRegistrationClosed ? (
                  <div className="space-y-2">
                    <div className="w-full py-3.5 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider text-center border border-zinc-200 dark:border-zinc-700">
                      {isCapacityReached ? 'Registrations Full (Housefull)' : 'Registrations Closed'}
                    </div>
                    <Link
                      to="/user-login"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-500/30 text-primary-blue text-xs font-bold hover:bg-blue-500/10 transition"
                    >
                      <span>Already Registered? Sign In</span>
                    </Link>
                  </div>
                ) : (
                  <a
                    href="#registration-form-section"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition cursor-pointer"
                  >
                    <span>Proceed to Register</span>
                    <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- REGISTRATION FORM SECTION (Matching Recruitment Public Landing Style) --- */}
        <section id="registration-form-section" className="py-16 px-2 sm:px-6 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-primary-blue mb-2">
              APPLY &amp; PARTICIPATE
            </p>
            <h2 className="font-display-heavy text-3xl sm:text-5xl uppercase tracking-tight text-zinc-900 dark:text-white">
              REGISTRATION FORM.
            </h2>
          </div>

          {isCapacityReached ? (
            <div className={`p-10 sm:p-12 rounded-3xl border text-center space-y-4 shadow-xl ${isDark ? 'bg-[#0E172A] border-rose-500/30' : 'bg-white border-rose-200'}`}>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <Users size={32} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-rose-500 block">
                  MAXIMUM CAPACITY REACHED
                </span>
                <h3 className="font-display-heavy text-2xl sm:text-3xl uppercase tracking-tight text-zinc-900 dark:text-white">
                  Registrations Housefull
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed pt-1">
                  All {maxParticipants} available participant spots for <strong className="text-zinc-900 dark:text-white">{event.name}</strong> have been filled! We are no longer accepting new registrations for this event.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  to="/user-login"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-blue text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-600 transition flex items-center justify-center gap-2"
                >
                  <span>Sign In to Participant Portal</span>
                </Link>
                <Link
                  to="/events"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition text-zinc-700 dark:text-zinc-300"
                >
                  Browse Other Events
                </Link>
              </div>
            </div>
          ) : isRegistrationClosed ? (
            <div className={`p-10 rounded-3xl border text-center ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
              }`}>
              <AlertCircle size={44} className="mx-auto text-amber-500 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tight">Registrations Closed</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                {formConfig?.closed_message || 'This event is not currently accepting new registrations. Please check other events or reach out to Team Mavericks coordinators.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Link
                  to="/user-login"
                  className="px-6 py-3 rounded-xl bg-primary-blue text-white text-xs font-bold uppercase tracking-wider"
                >
                  Participant Portal Login
                </Link>
                <Link
                  to="/events"
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider"
                >
                  Browse Other Events
                </Link>
              </div>
            </div>
          ) : sections.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
              }`}>
              <AlertCircle size={44} className="mx-auto text-amber-500 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tight">No Registration Form Configured</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                No registration form fields have been published for this event yet. Please check back later or contact the event coordinators.
              </p>
              <Link
                to="/events"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-blue text-white text-xs font-bold uppercase tracking-wider"
              >
                Browse Other Events
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Stepper Header (if multi-step) */}
              {totalSteps > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {/* Step 1: Sub-Events (if present) */}
                  {hasSubEventsStep && (
                    <div
                      className={`flex-1 min-w-[140px] p-3.5 rounded-2xl border transition ${activeStep === 0
                        ? 'bg-blue-500/10 border-blue-500/40 text-primary-blue'
                        : activeStep > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">STEP 1</span>
                      <span className="text-xs font-bold truncate block">Tracks &amp; Events</span>
                    </div>
                  )}

                  {/* Form Dynamic Sections */}
                  {sections.map((sec, idx) => {
                    const stepIdx = (hasSubEventsStep ? 1 : 0) + idx;
                    const stepNum = stepIdx + 1;
                    return (
                      <div
                        key={sec.id || idx}
                        className={`flex-1 min-w-[140px] p-3.5 rounded-2xl border transition ${activeStep === stepIdx
                          ? 'bg-blue-500/10 border-blue-500/40 text-primary-blue'
                          : activeStep > stepIdx
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                          }`}
                      >
                        <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">STEP {stepNum}</span>
                        <span className="text-xs font-bold truncate block">{sec.name || `Section ${idx + 1}`}</span>
                      </div>
                    );
                  })}

                  {/* Payment Verification Step */}
                  {Boolean(isPaid) ? (
                    <div
                      className={`flex-1 min-w-[140px] p-3.5 rounded-2xl border transition ${activeStep === totalSteps - 1
                        ? 'bg-blue-500/10 border-blue-500/40 text-primary-blue'
                        : 'bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                    >
                      <span className="font-mono-tag text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">STEP {totalSteps}</span>
                      <span className="text-xs font-bold truncate block">Payment Verification</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Form Container */}
              <div className={`p-3.5 sm:p-10 rounded-3xl border shadow-xl space-y-8 ${isDark ? 'bg-[#0E172A] border-[#1E293B]' : 'bg-white border-slate-200'
                }`}>
                {/* Sub-Events / Tracks Selection (Shown ONLY on Step 0 when sub-events exist) */}
                {hasSubEventsStep && activeStep === 0 && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers size={18} className="text-primary-blue" />
                          <h4 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                            Select Sub-Events / Competition Tracks <span className="text-rose-500">*</span>
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                          Choose the tracks you wish to participate in. Individual and group entries supported.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectAllSubEvents}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          isAllSubSelected
                            ? 'bg-blue-500/15 border-blue-500/40 text-primary-blue'
                            : isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isAllSubSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                        <span>{isAllSubSelected ? 'Deselect All' : 'Select All Sub-Events'}</span>
                      </button>
                    </div>

                    {/* Combo Deal Banner if applicable */}
                    {comboFeeVal !== null && comboFeeVal > 0 && (
                      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                        isAllSubSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : isDark
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          : 'bg-blue-50 border-blue-200 text-blue-900'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Sparkles size={20} className={isAllSubSelected ? 'text-emerald-500 animate-pulse' : 'text-primary-blue'} />
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider">
                              Special Combo Offer: All {subEvents.length} Sub-Events for ₹{comboFeeVal.toFixed(0)}
                            </p>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {isAllSubSelected
                                ? '✓ Combo discount active! You are registered for all tracks.'
                                : `Select all ${subEvents.length} sub-events to unlock the flat combo fee of ₹${comboFeeVal.toFixed(0)}.`}
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-white/50 dark:bg-black/20 font-mono text-xs font-black shrink-0 border border-current">
                          ₹{comboFeeVal.toFixed(0)} Total
                        </span>
                      </div>
                    )}

                    {/* Sub-Events List */}
                    <div className="space-y-4">
                      {subEvents.map((sub) => {
                        const isSelected = Boolean(selectedSubEvents[sub.id]?.selected);
                        const subData = selectedSubEvents[sub.id] || {};
                        const isGroup = sub.type === 'group';
                        const minTeam = sub.min_team_size || (isGroup ? 2 : 1);
                        const maxTeam = sub.max_team_size || 5;
                        const maxPart = sub.max_participants ? parseInt(sub.max_participants) : null;
                        const totalRegs = sub.total_registrations ? parseInt(sub.total_registrations) : 0;
                        const isFull = Boolean(maxPart && maxPart > 0 && totalRegs >= maxPart);
                        const isClosed = sub.registration_status === 'closed' || isFull;

                        return (
                          <div
                            key={sub.id}
                            className={`rounded-2xl border transition-all ${
                              isClosed
                                ? 'border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/20 opacity-60'
                                : isSelected
                                ? 'border-primary-blue/50 bg-blue-500/5 shadow-md shadow-blue-500/5'
                                : isDark
                                ? 'border-slate-800 bg-slate-900/30 opacity-80 hover:opacity-100'
                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            {/* Card Header & Checkbox Toggle */}
                            <div
                              onClick={() => handleToggleSubEvent(sub.id)}
                              className={`p-4 sm:p-5 flex items-start justify-between gap-4 select-none ${
                                isClosed ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start gap-3.5">
                                <div className="mt-1">
                                  {isClosed ? (
                                    <Lock size={18} className="text-slate-400" />
                                  ) : isSelected ? (
                                    <CheckSquare size={20} className="text-primary-blue" />
                                  ) : (
                                    <Square size={20} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                                      {sub.name}
                                    </h5>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                        isGroup
                                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {isGroup ? `Group (${minTeam}-${maxTeam} members)` : 'Individual'}
                                    </span>

                                    {/* Status Badge */}
                                    {isClosed && (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                        {isFull ? 'Housefull (Capacity Full)' : 'Registration Closed'}
                                      </span>
                                    )}

                                    {/* Capacity indicator if open */}
                                    {!isClosed && maxPart && maxPart > 0 && (
                                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                        ({totalRegs}/{maxPart} filled)
                                      </span>
                                    )}
                                  </div>
                                  {sub.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                      {sub.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {parseFloat(sub.fee || 0) > 0 ? `₹${parseFloat(sub.fee).toFixed(0)}` : 'Free'}
                                </span>
                              </div>
                            </div>

                            {/* Group Team Information & Dynamic Member Rows (If Checked and Group) */}
                            {isSelected && isGroup && (
                              <div className="px-5 pb-5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-4">
                                <div>
                                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-800 dark:text-slate-200">
                                    Team Name for {sub.name} <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. CodeMavericks / TheDebaters"
                                    value={subData.team_name || ''}
                                    onChange={(e) => handleUpdateTeamName(sub.id, e.target.value)}
                                    className={inputClass}
                                  />
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                      Team Members ({subData.team_members?.length || 0} / max {maxTeam})
                                    </span>
                                    {(subData.team_members?.length || 0) < maxTeam && (
                                      <button
                                        type="button"
                                        onClick={() => handleAddTeamMember(sub.id)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-blue hover:underline cursor-pointer"
                                      >
                                        <Plus size={14} />
                                        <span>Add Member</span>
                                      </button>
                                    )}
                                  </div>

                                  {(subData.team_members || []).map((member, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className={`p-3.5 rounded-xl border space-y-3 ${
                                        isDark ? 'bg-[#0E172A] border-slate-800' : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-[11px] font-bold uppercase text-slate-400">
                                          {mIdx === 0 ? 'Member 1 (Team Leader / Primary)' : `Member ${mIdx + 1}`}
                                        </span>
                                        {mIdx >= minTeam && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveTeamMember(sub.id, mIdx)}
                                            className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                                            title="Remove member"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <input
                                          type="text"
                                          placeholder="Full Name *"
                                          value={member.name || ''}
                                          onChange={(e) => handleUpdateTeamMember(sub.id, mIdx, 'name', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border text-xs font-semibold bg-transparent border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-blue text-slate-900 dark:text-white"
                                        />
                                        <input
                                          type="email"
                                          placeholder="Email Address"
                                          value={member.email || ''}
                                          onChange={(e) => handleUpdateTeamMember(sub.id, mIdx, 'email', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border text-xs font-semibold bg-transparent border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-blue text-slate-900 dark:text-white"
                                        />
                                        <input
                                          type="tel"
                                          placeholder="Phone Number"
                                          value={member.phone || ''}
                                          onChange={(e) => handleUpdateTeamMember(sub.id, mIdx, 'phone', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border text-xs font-semibold bg-transparent border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-blue text-slate-900 dark:text-white"
                                        />
                                        <input
                                          type="text"
                                          placeholder="PRN / Roll No"
                                          value={member.prn || ''}
                                          onChange={(e) => handleUpdateTeamMember(sub.id, mIdx, 'prn', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border text-xs font-semibold bg-transparent border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-blue text-slate-900 dark:text-white"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isSelected && !isGroup && (
                              <div className="px-5 pb-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                ✓ Individual entry — Primary registrant information will be used for this track.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Dynamic Form Section */}
                {(() => {
                  const currentSecIdx = activeStep - (hasSubEventsStep ? 1 : 0);
                  if (currentSecIdx < 0 || currentSecIdx >= sections.length || !sections[currentSecIdx]) return null;
                  const currentSection = sections[currentSecIdx];

                  return (
                    <div className="space-y-6">
                      <div>
                        <p className="font-mono-tag text-[10px] font-black uppercase tracking-widest text-primary-blue">
                          SECTION {currentSecIdx + 1} OF {sections.length}
                        </p>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-1">
                          {currentSection.name || 'Event Registration'}
                        </h3>
                        {currentSection.description ? (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{currentSection.description}</p>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {(currentSection.fields || []).map((field) => {
                        const fieldName = `field_${field.id}`;
                        const isFull = ['textarea', 'file', 'image', 'resume', 'pdf'].includes(field.field_type);

                        return (
                          <div key={field.id} className={isFull ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-800 dark:text-slate-200">
                              {field.label} {field.is_required ? <span className="text-rose-500">*</span> : null}
                            </label>

                            {field.field_type === 'textarea' ? (
                              <textarea
                                rows={4}
                                placeholder={field.placeholder || ''}
                                {...register(fieldName, {
                                  required: field.is_required ? `${field.label} is required` : false,
                                })}
                                className={inputClass}
                              />
                            ) : field.field_type === 'select' ? (
                              <select
                                {...register(fieldName, {
                                  required: field.is_required ? `${field.label} is required` : false,
                                })}
                                className={inputClass}
                              >
                                <option value="">Select option</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt.id || opt.option_value} value={opt.option_value}>
                                    {opt.option_label || opt.option_value}
                                  </option>
                                ))}
                              </select>
                            ) : field.field_type === 'radio' ? (
                              <div className="space-y-2">
                                {(field.options || []).map((opt) => (
                                  <label key={opt.id || opt.option_value} className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-300 font-medium cursor-pointer">
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
                            ) : ['file', 'image', 'resume', 'pdf'].includes(field.field_type) ? (
                              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${isDark ? 'border-slate-800 bg-[#070C18]' : 'border-slate-300 bg-slate-50/70'
                                }`}>
                                <Upload size={24} className="mx-auto text-slate-500 dark:text-slate-400 mb-2" />
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-300">
                                  {fileInputs[field.id] ? fileInputs[field.id].name : 'Click to choose file or drag & drop'}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 font-medium">PDF, JPG, PNG up to 10MB</p>
                                <input
                                  type="file"
                                  id={`file-input-${field.id}`}
                                  className="hidden"
                                  onChange={(e) => handleFileChange(field.id, e.target.files[0])}
                                />
                                <label
                                  htmlFor={`file-input-${field.id}`}
                                  className="mt-3 inline-block px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold cursor-pointer text-white transition shadow-sm"
                                >
                                  {fileInputs[field.id] ? 'Change Selected File' : 'Browse File'}
                                </label>
                              </div>
                            ) : (
                              <input
                                type={
                                  field.field_type === 'number'
                                    ? 'number'
                                    : field.field_type === 'date'
                                      ? 'date'
                                      : field.field_type === 'email'
                                        ? 'email'
                                        : field.field_type === 'tel'
                                          ? 'tel'
                                          : 'text'
                                }
                                placeholder={field.placeholder || ''}
                                {...register(fieldName, {
                                  required: field.is_required ? `${field.label} is required` : false,
                                })}
                                className={inputClass}
                              />
                            )}

                            {field.help_text ? (
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium">{field.help_text}</p>
                            ) : null}
                            {errors[fieldName] ? (
                              <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-semibold">
                                <AlertCircle size={12} /> {errors[fieldName].message}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

                {/* Final Step Payment UI (if paid) */}
                {Boolean(isPaid) && activeStep === totalSteps - 1 ? (
                  <div className="pt-2 space-y-6">
                    {/* Payment Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          {event?.payment_method === 'razorpay' ? <CreditCard size={20} /> : <QrCode size={20} />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                            {event?.payment_method === 'razorpay' ? 'Razorpay Secure Payment' : 'Payment Verification'}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {subEvents.length > 0 ? (
                              <span>
                                {selectedSubList.length} track(s) selected •{' '}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{effectiveFee.toFixed(0)}</span>
                                {isAllSubSelected && comboFeeVal !== null && ' (Combo Package)'}
                              </span>
                            ) : (
                              <span>
                                Registration fee: <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{effectiveFee.toFixed(0)}</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-black border border-emerald-500/30">
                        ₹{effectiveFee.toFixed(0)} INR
                      </span>
                    </div>

                    {/* Razorpay Gateway Mode */}
                    {event?.payment_method === 'razorpay' ? (
                      <div className={`p-6 rounded-2xl border space-y-5 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <CreditCard className="text-blue-600 dark:text-blue-400" size={18} />
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              Razorpay Checkout Gateway
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-mono">
                            Instant Verification
                          </span>
                        </div>

                        <div className="text-center py-6 px-4 border border-dashed border-blue-500/30 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 space-y-3">
                          <CreditCard size={32} className="mx-auto text-blue-600 dark:text-blue-400 opacity-90" />
                          <div>
                            <h5 className="text-sm font-black text-zinc-900 dark:text-white">Ready for Razorpay Payment</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                              Click "Submit Registration" below to finalize your registration and proceed with the automated Razorpay payment.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 pt-2 font-mono font-semibold">
                            <span>UPI</span> • <span>Cards</span> • <span>Net Banking</span> • <span>Wallets</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Manual UPI / QR Code Mode */
                      <div className={`p-6 rounded-2xl border space-y-5 ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'}`}>
                        {/* Custom Instructions if provided */}
                        {event?.payment_instructions && (
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-400 text-xs">
                            <Info size={18} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                            <p className="whitespace-pre-line text-blue-950 dark:text-blue-200 leading-relaxed font-semibold">
                              {event.payment_instructions}
                            </p>
                          </div>
                        )}

                        {/* QR Code & Payment Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                          {/* QR Code Display */}
                          <div className="text-center space-y-2">
                            <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                              <img
                                src={
                                  event?.qr_code_url
                                    ? (event.qr_code_url.startsWith('http') ? event.qr_code_url : `http://localhost:8000${event.qr_code_url}`)
                                    : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=teammavericks@okaxis&pn=Team%20Mavericks&am=${effectiveFee.toFixed(0)}&cu=INR`
                                }
                                alt="Payment QR Code"
                                className="w-36 h-36 object-contain rounded-lg mx-auto"
                              />
                            </div>
                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-extrabold">
                              Scan with any UPI App (GPay / PhonePe / Paytm)
                            </p>
                          </div>

                          {/* Payment Summary */}
                          <div className="space-y-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-black tracking-wider block">UPI ID</span>
                              <p className="font-bold font-mono text-zinc-950 dark:text-zinc-100 text-sm">teammavericks@okaxis</p>
                            </div>
                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-black tracking-wider block">Payable Amount</span>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base font-mono">₹{effectiveFee.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Transaction ID Input */}
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider mb-2 text-slate-800 dark:text-slate-200">
                            UPI Transaction / UTR / Reference ID <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            {...register('transaction_id', { required: 'Transaction / UTR ID is required' })}
                            placeholder="e.g. 423984719283 (12-digit UTR)"
                            className={inputClass}
                          />
                          {errors.transaction_id && (
                            <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-semibold">
                              <AlertCircle size={12} /> {errors.transaction_id.message}
                            </p>
                          )}
                        </div>

                        {/* Payment Screenshot Upload Field */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              Payment Screenshot / Receipt {event?.require_payment_screenshot ? <span className="text-rose-500">*</span> : <span className="text-slate-500 dark:text-slate-400 text-[10px] font-normal">(Optional)</span>}
                            </label>
                            {paymentScreenshot && (
                              <button
                                type="button"
                                onClick={() => handleScreenshotChange(null)}
                                className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold uppercase cursor-pointer"
                              >
                                Remove Screenshot
                              </button>
                            )}
                          </div>

                          {paymentScreenshotPreview ? (
                            <div className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
                              <img
                                src={paymentScreenshotPreview}
                                alt="Screenshot Preview"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-950 dark:text-zinc-100 truncate">{paymentScreenshot?.name}</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 font-semibold">
                                  {(paymentScreenshot?.size / 1024).toFixed(1)} KB • Ready to submit
                                </p>
                              </div>
                              <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                            </div>
                          ) : (
                            <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${isDark ? 'border-slate-800 bg-[#070C18]' : 'border-slate-300 bg-white'}`}>
                              <Upload size={22} className="mx-auto text-slate-500 dark:text-slate-400 mb-1.5" />
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-300">Upload Payment Proof / Screenshot</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">JPG, PNG, WEBP up to 5MB</p>
                              <input
                                type="file"
                                id="payment-screenshot-input"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => handleScreenshotChange(e.target.files?.[0])}
                              />
                              <label
                                htmlFor="payment-screenshot-input"
                                className="mt-2.5 inline-block px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white cursor-pointer transition shadow-sm"
                              >
                                Choose Image
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Form Action Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  {activeStep > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className={`px-6 py-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition cursor-pointer ${isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
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
                      className="px-8 py-3.5 rounded-2xl bg-primary-blue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 shadow-md shadow-primary-blue/20 transition flex items-center gap-2 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <span>Submitting Entry...</span>
                      ) : (
                        <>
                          <span>Submit Registration</span>
                          <CheckCircle2 size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </section>

        {/* --- EXPLORE MORE FLAGSHIP EVENTS --- */}
        <section className={`py-20 px-2.5 sm:px-6 border-t ${isDark ? 'bg-[#070C18] border-[#1E293B]' : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono-tag text-xs font-bold uppercase tracking-widest text-primary-blue mb-2">
                  EXPLORE MORE
                </p>
                <h2 className="font-display-heavy text-3xl sm:text-4xl uppercase tracking-tight text-zinc-900 dark:text-white">
                  FLAGSHIP EVENTS.
                </h2>
              </div>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-blue hover:underline"
              >
                <span>View All Events</span>
                <ArrowRight size={14} />
              </Link>
            </div>

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
            `}</style>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FLAGSHIP_EVENTS_DATA.map((ev) => (
                <div
                  key={ev.number}
                  className={`event-card min-h-[340px] sm:min-h-[380px] p-4 sm:p-7 border flex flex-col justify-between rounded-2xl bg-gradient-to-b ${ev.bg} ${isDark ? 'border-[#1E293B]' : 'border-slate-800'
                    } text-white group shadow-lg`}
                >
                  {/* Background image (clear on hover) */}
                  {ev.img && <img src={ev.img} alt={ev.name} className="event-img" />}

                  {/* Hover overlay that fades to reveal clear photo */}
                  <div className="event-overlay" />

                  {/* Content */}
                  <div className="event-content flex flex-col justify-between h-full gap-6">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <span className={`event-tag font-mono-tag text-[10px] font-black tracking-widest uppercase px-2.5 py-1 border rounded-lg ${isDark ? 'border-blue-500/50 text-blue-300 bg-blue-500/10' : 'border-blue-400 text-blue-300 bg-blue-800/30'
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
                      <h4 className="font-display-heavy text-3xl uppercase leading-[0.9] tracking-tight text-white">
                        {ev.name}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-slate-300 pt-1 line-clamp-3">
                        {ev.desc}
                      </p>
                      <div className="pt-2">
                        <Link
                          to={`/events/${ev.slug}`}
                          className="inline-flex items-center gap-1.5 font-mono-tag text-xs font-black uppercase text-blue-400 hover:text-white transition"
                        >
                          <span>Register Now</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* --- UN-IGNORABLE POPUP MODAL FOR ALERTS & DUPLICATE REGISTRATIONS --- */}
      <AnimatePresence>
        {alertModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2 }}
              className={`max-w-md w-full rounded-3xl border p-7 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-5 ${isDark ? 'bg-[#0E172A] border-amber-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
                <AlertCircle size={32} />
              </div>

              <div className="space-y-2">
                <span className="font-mono-tag text-[10px] font-black uppercase tracking-widest text-amber-500 block">
                  {alertModal.title || 'REGISTRATION NOTICE'}
                </span>
                <h3 className="font-display-heavy text-2xl uppercase tracking-tight">
                  {alertModal.isDuplicate ? 'Already Registered' : 'Registration Alert'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {alertModal.message}
                </p>
                {alertModal.isDuplicate && (
                  <p className="text-[11px] text-blue-400 font-medium pt-1">
                    Your registration is already confirmed. You can log in to your participant portal to view or print your digital pass.
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {alertModal.isDuplicate ? (
                  <button
                    type="button"
                    onClick={() => {
                      const userEmail = alertModal.email;
                      setAlertModal({ isOpen: false, title: '', message: '', isDuplicate: false, email: '' });
                      navigate(`/user-login?email=${encodeURIComponent(userEmail)}`);
                    }}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-mono-tag text-xs font-black uppercase tracking-wider transition shadow-lg shadow-primary-blue/20 cursor-pointer"
                  >
                    Log In to Portal
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setAlertModal({ isOpen: false, title: '', message: '', isDuplicate: false, email: '' })}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition cursor-pointer ${isDark
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-white'
                      : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                >
                  Okay, Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default PublicEventRegisterPage;
