import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Globe,
  Users,
  Coins,
  FileText,
  Save,
  Zap,
  Clock,
  Mail,
  User,
  QrCode,
  Upload,
  Image as ImageIcon,
  CreditCard,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

const InputField = ({ label, id, required, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1.5 font-mono">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-[10px] text-red-500 mt-1 font-bold">{error}</p>}
  </div>
);

const inputClass = "w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600";

const CreateEventPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const isCore   = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    banner_url: '',
    start_date: '',
    end_date: '',
    location: '',
    mode: 'offline',
    event_status: 'draft',
    registration_status: 'closed',
    registration_start_date: '',
    registration_end_date: '',
    max_participants: '',
    payment_required: false,
    registration_fee: '',
    qr_code_url: '',
    payment_instructions: '',
    require_payment_screenshot: false,
    payment_method: 'manual_upi',
    send_confirmation_email: true,
    organizer_name: '',
    contact_email: '',
    tags: '',
  });

  useEffect(() => {
    if (isEdit) {
      const fetchEvent = async () => {
        try {
          setLoading(true);
          const res = await axios.get(`/events/${id}`);
          const ev = res.data;
          setForm({
            name: ev.name || '',
            slug: ev.slug || '',
            description: ev.description || '',
            banner_url: ev.banner_url || '',
            start_date: ev.start_date ? ev.start_date.substring(0, 16) : '',
            end_date: ev.end_date ? ev.end_date.substring(0, 16) : '',
            location: ev.location || '',
            mode: ev.mode || 'offline',
            event_status: ev.event_status || 'draft',
            registration_status: ev.registration_status || 'closed',
            registration_start_date: ev.registration_start_date ? ev.registration_start_date.substring(0, 16) : '',
            registration_end_date: ev.registration_end_date ? ev.registration_end_date.substring(0, 16) : '',
            max_participants: ev.max_participants || '',
            payment_required: Boolean(ev.payment_required),
            registration_fee: ev.registration_fee || '',
            qr_code_url: ev.qr_code_url || '',
            payment_instructions: ev.payment_instructions || '',
            require_payment_screenshot: Boolean(ev.require_payment_screenshot),
            payment_method: ev.payment_method || 'manual_upi',
            send_confirmation_email: ev.send_confirmation_email !== undefined && ev.send_confirmation_email !== null ? Boolean(parseInt(ev.send_confirmation_email)) : true,
            organizer_name: ev.organizer_name || '',
            contact_email: ev.contact_email || '',
            tags: ev.tags || '',
          });
        } catch (err) {
          toast.error('Failed to load event details');
          navigate('/dashboard/events');
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, isEdit]);

  const set = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-generate slug from name only in create mode
      if (!isEdit && key === 'name' && !prev.slug) {
        next.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('qr_image', file);

    setUploadingQr(true);
    const toastId = toast.loading('Uploading QR code image…');
    try {
      const res = await axios.post('/events/upload-qr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set('qr_code_url', res.data.qr_code_url);
      toast.dismiss(toastId);
      toast.success('QR code uploaded successfully!');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Failed to upload QR code');
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Event name is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Slug must only contain lowercase letters, numbers, and hyphens';
    if (form.payment_required && (!form.registration_fee || isNaN(parseFloat(form.registration_fee)))) {
      errs.registration_fee = 'Enter a valid registration fee';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!isCore) { toast.error('Only coordinators and core members can manage events'); return; }

    setSaving(true);
    const loader = toast.loading(isEdit ? 'Updating event…' : 'Creating event…');
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        registration_fee: form.registration_fee ? parseFloat(form.registration_fee) : 0,
        payment_required: form.payment_required ? 1 : 0,
        require_payment_screenshot: form.require_payment_screenshot ? 1 : 0,
        send_confirmation_email: form.send_confirmation_email ? 1 : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        registration_start_date: form.registration_start_date || null,
        registration_end_date: form.registration_end_date || null,
      };

      if (isEdit) {
        await axios.put(`/events/${id}`, payload);
        toast.dismiss(loader);
        toast.success(`Event "${form.name}" updated successfully! ✨`);
        navigate(`/dashboard/events/${id}`);
      } else {
        const res = await axios.post('/events', payload);
        toast.dismiss(loader);
        toast.success(`Event "${res.data.name}" created! 🎉`);
        navigate(`/dashboard/events/${res.data.id}`);
      }
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} event`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MajorLoader fullPage />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(isEdit ? `/dashboard/events/${id}` : '/dashboard/events')}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">
              {isEdit ? 'Edit Event Details' : 'Create Event'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isEdit ? 'Modify event schedule, pricing, registration windows and metadata' : 'Set up a new event with all details'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
            <FileText size={13} /> Basic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Event Name" id="name" required error={errors.name}>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Varba Fest 2027"
                className={inputClass}
              />
            </InputField>

            <InputField label="Event Slug (URL)" id="slug" required error={errors.slug}>
              <input
                id="slug"
                type="text"
                value={form.slug}
                onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. varba-fest-2027"
                className={inputClass}
              />
            </InputField>
          </div>

          <InputField label="Description" id="description">
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the event, what participants can expect…"
              className={`${inputClass} resize-none`}
            />
          </InputField>

          <InputField label="Banner / Cover Image URL" id="banner_url">
            <input
              id="banner_url"
              type="url"
              value={form.banner_url}
              onChange={e => set('banner_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </InputField>
        </div>

        {/* Date & Location */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
            <Calendar size={13} /> Schedule & Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Start Date & Time" id="start_date">
              <input id="start_date" type="datetime-local" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputClass} />
            </InputField>
            <InputField label="End Date & Time" id="end_date">
              <input id="end_date" type="datetime-local" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputClass} />
            </InputField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Location / Venue" id="location">
              <input id="location" type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. KIT College Main Hall" className={inputClass} />
            </InputField>
            <InputField label="Event Mode" id="mode">
              <select id="mode" value={form.mode} onChange={e => set('mode', e.target.value)} className={inputClass}>
                <option value="offline">Offline (In-Person)</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </InputField>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
            <Zap size={13} /> Status Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Event Status" id="event_status">
              <select id="event_status" value={form.event_status} onChange={e => set('event_status', e.target.value)} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </InputField>

            <InputField label="Registration Status" id="registration_status">
              <select id="registration_status" value={form.registration_status} onChange={e => set('registration_status', e.target.value)} className={inputClass}>
                <option value="closed">Closed</option>
                <option value="open">Open</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </InputField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Registration Opens At" id="registration_start_date">
              <input id="registration_start_date" type="datetime-local" value={form.registration_start_date} onChange={e => set('registration_start_date', e.target.value)} className={inputClass} />
            </InputField>
            <InputField label="Registration Closes At" id="registration_end_date">
              <input id="registration_end_date" type="datetime-local" value={form.registration_end_date} onChange={e => set('registration_end_date', e.target.value)} className={inputClass} />
            </InputField>
          </div>

          <InputField label="Maximum Participants" id="max_participants">
            <input id="max_participants" type="number" min="1" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} placeholder="Leave blank for unlimited" className={inputClass} />
          </InputField>

          {/* Send Confirmation Email Toggle */}
          <div className="pt-2 flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-blue-500" />
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Send Registration Confirmation Email</p>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Automatically send confirmation email with VIP entry pass token and participant login credentials upon registration.
                If disabled, details will be shown directly on the registration success page.
              </p>
            </div>
            <div
              onClick={() => set('send_confirmation_email', !form.send_confirmation_email)}
              className={`w-10 h-5 rounded-full transition-all duration-300 relative cursor-pointer border shrink-0 ${form.send_confirmation_email ? 'bg-blue-600 border-blue-600' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${form.send_confirmation_email ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
              <Coins size={13} /> Payment Configuration
            </h2>
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                onClick={() => set('payment_required', !form.payment_required)}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative cursor-pointer border ${form.payment_required ? 'bg-emerald-500 border-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${form.payment_required ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Paid Event</span>
            </label>
          </div>

          {form.payment_required && (
            <div className="space-y-5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField label="Registration Fee (₹)" id="registration_fee" required error={errors.registration_fee}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                    <input
                      id="registration_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.registration_fee}
                      onChange={e => set('registration_fee', e.target.value)}
                      placeholder="0.00"
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                </InputField>

                <InputField label="Payment Method" id="payment_method">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => set('payment_method', 'manual_upi')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center gap-2 cursor-pointer ${
                        form.payment_method === 'manual_upi'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      <QrCode size={14} className="shrink-0" />
                      <div className="truncate">
                        <p className="font-extrabold text-[11px] leading-tight">Manual UPI / QR</p>
                        <p className="text-[9px] opacity-75">Direct transfer</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => set('payment_method', 'razorpay')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center gap-2 cursor-pointer relative ${
                        form.payment_method === 'razorpay'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      <CreditCard size={14} className="shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <p className="font-extrabold text-[11px] leading-tight">Razorpay</p>
                          <span className="text-[8px] bg-blue-500/20 text-blue-500 px-1 py-0.2 rounded font-mono">Gateway</span>
                        </div>
                        <p className="text-[9px] opacity-75">Auto verification</p>
                      </div>
                    </button>
                  </div>
                </InputField>
              </div>

              {/* QR Code Upload / Link */}
              <div className="space-y-3">
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">
                  Payment QR Code Image
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={qrInputRef}
                      onChange={handleQrUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => qrInputRef.current?.click()}
                        disabled={uploadingQr}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-700 dark:text-zinc-300 hover:text-blue-500 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={14} />
                        {uploadingQr ? 'Uploading QR…' : 'Upload QR Image'}
                      </button>
                      {form.qr_code_url && (
                        <button
                          type="button"
                          onClick={() => set('qr_code_url', '')}
                          className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                          title="Remove QR code"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={form.qr_code_url}
                      onChange={e => set('qr_code_url', e.target.value)}
                      placeholder="Or enter direct QR image URL (e.g. /uploads/qr_codes/...)"
                      className={inputClass}
                    />
                  </div>

                  {/* QR Preview */}
                  <div className="flex items-center justify-center p-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 min-h-[100px]">
                    {form.qr_code_url ? (
                      <div className="text-center space-y-1">
                        <img
                          src={form.qr_code_url.startsWith('http') ? form.qr_code_url : `http://localhost:8000${form.qr_code_url}`}
                          alt="QR Code Preview"
                          className="w-24 h-24 object-contain rounded-lg border border-zinc-200 dark:border-zinc-800 mx-auto shadow-sm bg-white p-1"
                        />
                        <p className="text-[10px] text-zinc-400 font-mono">QR Code Preview</p>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-400 py-3">
                        <QrCode size={24} className="mx-auto mb-1 opacity-40" />
                        <p className="text-[10px] font-mono">No QR code uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <InputField label="Payment Instructions / Note for Participants" id="payment_instructions">
                <textarea
                  id="payment_instructions"
                  rows={2}
                  value={form.payment_instructions}
                  onChange={e => set('payment_instructions', e.target.value)}
                  placeholder="e.g. Scan QR using PhonePe / GPay / Paytm. Enter UTR/Reference ID and upload receipt below."
                  className={`${inputClass} resize-none`}
                />
              </InputField>

              {/* Screenshot Requirement Toggle */}
              <div className="pt-2 flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Require / Allow Payment Screenshot</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allow participants to upload transaction receipt/screenshot during registration
                  </p>
                </div>
                <div
                  onClick={() => set('require_payment_screenshot', !form.require_payment_screenshot)}
                  className={`w-10 h-5 rounded-full transition-all duration-300 relative cursor-pointer border shrink-0 ${form.require_payment_screenshot ? 'bg-blue-600 border-blue-600' : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${form.require_payment_screenshot ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Organizer */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
            <User size={13} /> Organizer Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InputField label="Organizer Name" id="organizer_name">
              <input id="organizer_name" type="text" value={form.organizer_name} onChange={e => set('organizer_name', e.target.value)} placeholder="e.g. Team Mavericks" className={inputClass} />
            </InputField>
            <InputField label="Contact Email" id="contact_email">
              <input id="contact_email" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@example.com" className={inputClass} />
            </InputField>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/dashboard/events/${id}` : '/dashboard/events')}
            className="h-10 px-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 h-10 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-md transition cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save size={13} />
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
