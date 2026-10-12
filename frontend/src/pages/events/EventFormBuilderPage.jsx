/**
 * EventFormBuilderPage.jsx
 * 
 * Admin form builder for event registration forms.
 * Reuses the shared DynamicFormBuilder component — same UI, same field types,
 * same drag-and-drop, same section management as the recruitment form builder.
 *
 * The only difference: this page saves to /events/:id/registration-form/sections
 * instead of /campaigns/1/form.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import DynamicFormBuilder from '../../components/ui/DynamicFormBuilder';
import {
  ArrowLeft,
  Plus,
  Eye,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileText,
  Zap,
  Save,
  Settings,
} from 'lucide-react';

const inputClass = "w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600";

const EventFormBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const [event, setEvent]             = useState(null);
  const [form, setForm]               = useState(null);
  const [sections, setSections]       = useState([]);

  // Form metadata edit state
  const [formName, setFormName]               = useState('');
  const [formDesc, setFormDesc]               = useState('');
  const [successMsg, setSuccessMsg]           = useState('');
  const [closedMsg, setClosedMsg]             = useState('');
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [savingMeta, setSavingMeta]           = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Load event details + form structure in parallel
      const [evRes, formRes] = await Promise.all([
        axios.get(`/events/${id}`),
        axios.get(`/events/${id}/registration-form`),
      ]);
      setEvent(evRes.data);

      const { form: formMeta, sections: fetchedSections } = formRes.data;
      setForm(formMeta);
      if (formMeta) {
        setFormName(formMeta.form_name || '');
        setFormDesc(formMeta.description || '');
        setSuccessMsg(formMeta.success_message || '');
        setClosedMsg(formMeta.closed_message || '');
      }

      // Add drag IDs to fields
      const sectionsWithDragIds = (fetchedSections || []).map(s => ({
        ...s,
        fields: (s.fields || []).map(f => ({
          ...f,
          dragId: f.id || Math.random().toString(36).substring(2, 9)
        }))
      }));
      setSections(sectionsWithDragIds);
    } catch (err) {
      toast.error('Failed to load event or form data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateForm = async () => {
    if (!canEdit) return;
    setCreatingForm(true);
    const loader = toast.loading('Creating registration form…');
    try {
      const res = await axios.post(`/events/${id}/registration-form`, {
        form_name:       `${event?.name} Registration`,
        success_message: 'Thank you for registering! We will be in touch soon.',
        closed_message:  'Registration is currently closed for this event.',
      });
      setForm(res.data);
      setFormName(res.data.form_name || '');
      setSuccessMsg(res.data.success_message || '');
      setClosedMsg(res.data.closed_message || '');
      toast.dismiss(loader);
      toast.success('Registration form created!');
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to create form');
    } finally {
      setCreatingForm(false);
    }
  };

  const handleSaveFormMeta = async () => {
    if (!canEdit || !form) return;
    setSavingMeta(true);
    const loader = toast.loading('Saving form settings…');
    try {
      const res = await axios.post(`/events/${id}/registration-form`, {
        form_name:       formName,
        description:     formDesc,
        success_message: successMsg,
        closed_message:  closedMsg,
      });
      setForm(res.data);
      toast.dismiss(loader);
      toast.success('Form settings saved!');
      setShowFormSettings(false);
    } catch (err) {
      toast.dismiss(loader);
      toast.error('Failed to save form settings');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveSections = async () => {
    if (!canEdit || !form) {
      toast.error('Create the registration form first.');
      return;
    }
    setSaving(true);
    const loader = toast.loading('Saving form structure…');
    try {
      await axios.put(`/events/${id}/registration-form/sections`, { sections });
      toast.dismiss(loader);
      toast.success('Form structure saved! 🎉');
      await fetchData();
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${event?.slug}`);
    toast.success('Public registration URL copied!', { icon: '📋' });
  };

  if (loading) return <MajorLoader fullPage />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-0 sm:px-4">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.015] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/dashboard/events/${id}`)} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Registration Form Builder</h1>
                {form ? (
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Form Configured
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    No Form Yet
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                Event: <span className="font-bold text-zinc-700 dark:text-zinc-200">{event?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {form && (
              <>
                <button onClick={copyPublicUrl} className="flex items-center gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-50 transition cursor-pointer">
                  <Copy size={12} /> Copy URL
                </button>
                <a
                  href={`/register/${event?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-50 transition cursor-pointer"
                >
                  <Eye size={12} /> Preview
                </a>
                <button
                  onClick={() => setShowFormSettings(s => !s)}
                  className="flex items-center gap-1.5 h-9 px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-50 transition cursor-pointer"
                >
                  <Settings size={12} /> Settings
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Settings Panel */}
      {showFormSettings && form && (
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 shadow-md space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">Form Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Form Name</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Form Description</label>
              <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} className={inputClass} placeholder="Optional description…" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Success Message</label>
              <textarea value={successMsg} onChange={e => setSuccessMsg(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">Closed Message</label>
              <textarea value={closedMsg} onChange={e => setClosedMsg(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowFormSettings(false)} className="h-9 px-4 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Cancel</button>
            <button onClick={handleSaveFormMeta} disabled={savingMeta} className="flex items-center gap-1.5 h-9 px-5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer transition disabled:opacity-50">
              <Save size={12} /> {savingMeta ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* No form yet state */}
      {!form && canEdit && (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-white/20 dark:bg-zinc-900/10">
          <FileText size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-zinc-800 dark:text-white text-sm font-black uppercase tracking-wider">No Registration Form Yet</p>
          <p className="text-[10px] text-zinc-455 dark:text-zinc-500 font-mono mt-1.5 uppercase tracking-widest">
            Create a registration form to start adding fields.
          </p>
          <button
            onClick={handleCreateForm}
            disabled={creatingForm}
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} />
            {creatingForm ? 'Creating…' : 'Create Registration Form'}
          </button>
        </div>
      )}

      {/* Read-only notice for non-editors */}
      {!canEdit && (
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs font-bold text-amber-600 dark:text-amber-500/80 shadow-inner">
          <AlertCircle size={14} className="shrink-0" />
          <span>Read-only Mode: Only coordinators and core committee members can modify the registration form.</span>
        </div>
      )}

      {/* Form Builder — shown once form exists */}
      {form && (
        <DynamicFormBuilder
          sections={sections}
          setSections={setSections}
          canEdit={canEdit}
          onSave={handleSaveSections}
          saving={saving}
        />
      )}
    </div>
  );
};

export default EventFormBuilderPage;
