import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
  const isCore   = user?.role === 'coordinator' || user?.role === 'core_member';

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

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
    organizer_name: '',
    contact_email: '',
    tags: '',
  });

  const set = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-generate slug from name
      if (key === 'name' && !prev.slug) {
        next.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [key]: '' }));
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
    if (!isCore) { toast.error('Only coordinators and core members can create events'); return; }

    setSaving(true);
    const loader = toast.loading('Creating event…');
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        registration_fee: form.registration_fee ? parseFloat(form.registration_fee) : 0,
        payment_required: form.payment_required ? 1 : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        registration_start_date: form.registration_start_date || null,
        registration_end_date: form.registration_end_date || null,
      };

      const res = await axios.post('/events', payload);
      toast.dismiss(loader);
      toast.success(`Event "${res.data.name}" created! 🎉`);
      navigate(`/dashboard/events/${res.data.id}`);
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/events')}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Create Event</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Set up a new event with all details</p>
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
        </div>

        {/* Payment */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
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
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Payment Required</span>
          </label>

          {form.payment_required && (
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
            onClick={() => navigate('/dashboard/events')}
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
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
