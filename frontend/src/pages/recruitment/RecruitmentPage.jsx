import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  Plus,
  Trash2,
  Save,
  X,
  PlusCircle,
  Copy,
  Eye,
  GripVertical,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  CheckSquare,
  Circle,
  FileText,
  Upload,
  Edit3,
  FolderPlus,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// ─── Field type registry ─────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text',      label: 'Short Text',       icon: AlignLeft   },
  { value: 'email',     label: 'Email',             icon: Mail        },
  { value: 'phone',     label: 'Phone / Contact',   icon: Phone       },
  { value: 'number',    label: 'Number',            icon: Hash        },
  { value: 'prn',       label: 'PRN / Roll No.',   icon: Hash        },
  { value: 'paragraph', label: 'Long Text Area',    icon: FileText    },
  { value: 'checkbox',  label: 'Checkboxes',        icon: CheckSquare },
  { value: 'radio',     label: 'Radio (Single)',    icon: Circle      },
  { value: 'file',      label: 'File Upload',       icon: Upload      },
];

const blankField = (overrides = {}) => ({
  id: null,
  label: '',
  placeholder: '',
  field_type: 'text',
  is_required: false,
  description: '',
  help_text: '',
  options: [],
  ...overrides,
});

const blankSection = () => ({
  id: null,
  name: 'New Section',
  description: '',
  is_hidden: false,
  fields: [],
});

// ─── Field Preview (read-only visual) ────────────────────────────────────────
const FieldPreview = ({ field }) => {
  const base =
    'w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none';

  return (
    <div className="space-y-1.5">
      {field.description && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{field.description}</p>
      )}
      {['text', 'email', 'phone', 'prn', 'number'].includes(field.field_type) && (
        <input readOnly placeholder={field.placeholder || `Enter ${field.label || 'value'}…`} className={base} />
      )}
      {field.field_type === 'paragraph' && (
        <textarea readOnly rows={3} placeholder={field.placeholder || 'Type your answer here…'} className={`${base} resize-none`} />
      )}
      {field.field_type === 'file' && (
        <div className={`${base} flex items-center gap-2`}>
          <Upload size={13} className="shrink-0" />
          <span>Choose file…</span>
        </div>
      )}
      {['checkbox', 'radio'].includes(field.field_type) && (
        <div className="space-y-1.5 pl-0.5">
          {(field.options || []).length === 0 && (
            <p className="text-[10px] italic text-zinc-400 dark:text-zinc-500">No options — edit to add.</p>
          )}
          {(field.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none">
              <input type={field.field_type} readOnly className="w-3.5 h-3.5 accent-blue-600" />
              {opt.option_label || opt.option_value || `Option ${i + 1}`}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Field Card ───────────────────────────────────────────────────────────────
const FieldCard = ({ field, sectionIdx, fieldIdx, isCoordinator, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon = FIELD_TYPES.find(t => t.value === field.field_type)?.icon || AlignLeft;
  const hasOptions = ['checkbox', 'radio'].includes(field.field_type);

  const update = (key, val) => onUpdate(sectionIdx, fieldIdx, key, val);

  const addOption = () => {
    update('options', [...(field.options || []), { option_value: '', option_label: '' }]);
  };
  const removeOption = (i) => {
    const opts = [...(field.options || [])];
    opts.splice(i, 1);
    update('options', opts);
  };
  const updateOption = (i, val) => {
    const opts = [...(field.options || [])];
    opts[i] = { option_value: val.toLowerCase().replace(/\s+/g, '_'), option_label: val };
    update('options', opts);
  };

  return (
    <div className={`border rounded-xl transition-all duration-200 bg-white dark:bg-zinc-900 overflow-hidden ${expanded ? 'border-primary-blue/40 shadow-md shadow-primary-blue/5' : 'border-zinc-200 dark:border-zinc-800'}`}>
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {isCoordinator && <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0 cursor-grab" />}
        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <TypeIcon size={13} className="text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          {expanded && isCoordinator ? (
            <input
              type="text"
              value={field.label}
              onChange={e => update('label', e.target.value)}
              placeholder="Field label…"
              className="w-full text-sm font-bold bg-transparent border-0 border-b border-dashed border-zinc-300 dark:border-zinc-600 focus:outline-none focus:border-primary-blue text-zinc-900 dark:text-zinc-100 pb-0.5 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          ) : (
            <p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100">
              {field.label || <span className="text-zinc-400 italic font-normal">Untitled field</span>}
              {field.is_required && <span className="text-accent-red ml-0.5">*</span>}
            </p>
          )}
          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500">
            {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
          </span>
        </div>
        {isCoordinator && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title={expanded ? 'Collapse' : 'Edit field'}
            >
              {expanded ? <ChevronDown size={14} /> : <Edit3 size={14} />}
            </button>
            <button
              onClick={() => onDelete(sectionIdx, fieldIdx)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
              title="Remove field"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Preview (collapsed) */}
      {!expanded && (
        <div className="px-4 pb-4 pt-0">
          <FieldPreview field={field} />
        </div>
      )}

      {/* Editor panel (expanded) */}
      {expanded && isCoordinator && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
          {/* Row: type + required toggle */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Field Type</label>
              <select
                value={field.field_type}
                onChange={e => update('field_type', e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none pb-0.5">
              <button
                type="button"
                onClick={() => update('is_required', !field.is_required)}
                className={`relative w-9 h-5 rounded-full flex items-center transition-colors duration-200 ${field.is_required ? 'bg-primary-blue' : 'bg-zinc-300 dark:bg-zinc-700'}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ml-0.5 ${field.is_required ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Required</span>
            </label>
          </div>

          {/* Placeholder + description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Placeholder Text</label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={e => update('placeholder', e.target.value)}
                placeholder="e.g. Enter your full name…"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Field Description</label>
              <input
                type="text"
                value={field.description || ''}
                onChange={e => update('description', e.target.value)}
                placeholder="e.g. Use your personal email"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Options manager */}
          {hasOptions && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-950/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Options</span>
                <button type="button" onClick={addOption} className="flex items-center gap-1 text-[10px] font-bold text-primary-blue hover:underline cursor-pointer">
                  <PlusCircle size={11} /> Add option
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {(field.options || []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={opt.option_label}
                      onChange={e => updateOption(oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue placeholder:text-zinc-400"
                    />
                    <button type="button" onClick={() => removeOption(oi)} className="p-1.5 text-zinc-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(field.options || []).length === 0 && (
                  <p className="text-[10px] italic text-zinc-400 dark:text-zinc-500 pl-1">Click "Add option" to create choices.</p>
                )}
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-950/30">
            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 mb-2">Live Preview</p>
            <FieldPreview field={field} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Add Field Popover ────────────────────────────────────────────────────────
const AddFieldButton = ({ sectionIdx, onAdd }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-400 dark:text-zinc-500 hover:border-primary-blue hover:text-primary-blue dark:hover:border-primary-blue dark:hover:text-primary-blue hover:bg-primary-blue/3 dark:hover:bg-primary-blue/10 transition cursor-pointer"
      >
        <Plus size={14} /> Add Field to Section
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 right-0 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl shadow-zinc-950/10 dark:shadow-zinc-950/60 p-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 pb-2">Choose field type</p>
            <div className="grid grid-cols-3 gap-0.5">
              {FIELD_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => { onAdd(sectionIdx, t.value); setOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-primary-blue dark:hover:text-primary-blue transition cursor-pointer text-left"
                  >
                    <Icon size={12} className="shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const RecruitmentPage = () => {
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [sections, setSections] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [addSectionName, setAddSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campRes, formRes] = await Promise.all([
        axios.get('/campaigns/1'),
        axios.get('/campaigns/1/form'),
      ]);
      setCampaign(campRes.data);
      setSections(Array.isArray(formRes.data) ? formRes.data : []);
    } catch (err) {
      toast.error('Failed to load recruitment form configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Mutators ────────────────────────────────────────────────────────────────
  const updateField = useCallback((secIdx, fldIdx, key, val) => {
    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      next[secIdx].fields[fldIdx] = { ...next[secIdx].fields[fldIdx], [key]: val };
      return next;
    });
  }, []);

  const addField = useCallback((secIdx, fieldType) => {
    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      next[secIdx].fields.push(blankField({ field_type: fieldType }));
      return next;
    });
  }, []);

  const deleteField = useCallback((secIdx, fldIdx) => {
    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      next[secIdx].fields.splice(fldIdx, 1);
      return next;
    });
    toast('Field removed — save to persist.', { icon: '🗑️' });
  }, []);

  const addSection = () => {
    const name = addSectionName.trim() || 'New Section';
    setSections(prev => [...prev, { ...blankSection(), name }]);
    setAddSectionName('');
    setShowAddSection(false);
    toast.success(`Section "${name}" added!`);
  };

  const deleteSection = (secIdx) => {
    setSections(prev => prev.filter((_, i) => i !== secIdx));
    toast('Section removed — save to persist.', { icon: '🗑️' });
  };

  const updateSectionName = (secIdx, val) => {
    setSections(prev => {
      const next = [...prev];
      next[secIdx] = { ...next[secIdx], name: val };
      return next;
    });
  };

  const toggleCollapse = (i) => setCollapsed(prev => ({ ...prev, [i]: !prev[i] }));

  // ── Status change ────────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (!isCoordinator) { toast.error('Only coordinators can change status'); return; }
    if (campaign?.status === newStatus) return;
    setStatusChanging(true);
    const loader = toast.loading(`Setting drive to ${newStatus}…`);
    try {
      // Use dedicated lightweight PATCH endpoint — no need to send all campaign fields
      const res = await axios.patch('/campaigns/1/status', { status: newStatus });
      setCampaign(res.data.campaign || { ...campaign, status: newStatus });
      toast.dismiss(loader);
      toast.success(`Recruitment drive is now ${newStatus.toUpperCase()}! ✅`);
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  // ── Save form structure ───────────────────────────────────────────────────────
  const isCanEdit = user?.role === 'coordinator' || user?.role === 'core_member';

  const handleSave = async () => {
    if (!isCanEdit) { toast.error('No permission to save'); return; }
    setSaving(true);
    const loader = toast.loading('Saving form configuration…');
    try {
      await axios.put('/campaigns/1/form', { sections });
      toast.dismiss(loader);
      toast.success('Form saved! Reloading fresh data… 🎉');
      // Reload from DB to get real IDs for newly inserted fields
      await fetchData();
    } catch (err) {
      toast.dismiss(loader);
      const msg = err.response?.data?.error || err.message || 'Save failed';
      toast.error(`Save failed: ${msg}`);
      console.error('Save error:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/teammavericks/recruitment-2026`);
    toast.success('Public form URL copied!', { icon: '📋' });
  };

  if (loading) return <MajorLoader fullPage />;

  const statusStyle = {
    draft:  { pill: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', active: 'bg-amber-500 text-white shadow-sm' },
    open:   { pill: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', active: 'bg-green-500 text-white shadow-sm' },
    closed: { pill: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',         active: 'bg-red-500 text-white shadow-sm' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* ── Top controls ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Recruitment Form Builder</h1>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle[campaign?.status || 'draft']?.pill}`}>
                {campaign?.status || 'draft'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Edits are local until you click <strong className="text-zinc-700 dark:text-zinc-300">Save Form</strong>. Status changes take effect immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={copyPublicUrl} className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-sm">
              <Copy size={12} /> Copy Link
            </button>
            <a href="/teammavericks/recruitment-2026" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-sm">
              <Eye size={12} /> Preview
            </a>
            {isCanEdit && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/20 transition cursor-pointer disabled:opacity-50">
                <Save size={12} /> {saving ? 'Saving…' : 'Save Form'}
              </button>
            )}
          </div>
        </div>

        {/* Status toggle */}
        {isCanEdit && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Drive Status:</span>
              <div className="flex border border-zinc-200 dark:border-zinc-700 rounded-xl p-1 bg-zinc-50 dark:bg-zinc-950 gap-1">
                {['draft', 'open', 'closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusChanging}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-60
                      ${campaign?.status === s
                        ? statusStyle[s]?.active
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                {campaign?.status === 'open' && '🟢 Form is accepting applications'}
                {campaign?.status === 'closed' && '🔴 Form is closed — candidates see closed notice'}
                {campaign?.status === 'draft' && '🟡 Form is hidden from public'}
              </span>
            </div>

            {/* Deadline Timer Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Application Deadline:</span>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={campaign?.deadline ? campaign.deadline.substring(0, 16) : ''}
                  onChange={async (e) => {
                    const newDeadline = e.target.value;
                    const loader = toast.loading('Updating deadline timer…');
                    try {
                      await axios.put('/campaigns/1', {
                        ...campaign,
                        deadline: newDeadline
                      });
                      setCampaign(prev => ({ ...prev, deadline: newDeadline }));
                      toast.dismiss(loader);
                      toast.success('Deadline timer updated successfully! ⏰');
                    } catch (err) {
                      toast.dismiss(loader);
                      toast.error('Failed to update deadline');
                    }
                  }}
                  className="px-3 py-1.5 border border-zinc-250 dark:border-zinc-750 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary-blue"
                />
                {campaign?.deadline && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                    (Ends: {new Date(campaign.deadline).toLocaleString()})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Read-only banner for regular members only */}
      {!isCanEdit && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400">
          <span className="shrink-0">👁️</span>
          Read-only view — only coordinators and core members can edit form fields.
        </div>
      )}

      {/* ── Sections ──────────────────────────────────────────────────────────── */}
      {sections.map((section, secIdx) => (
        <div key={section.id || secIdx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {/* Section header */}
          <div
            className="flex items-center gap-3 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer group"
            onClick={() => toggleCollapse(secIdx)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {collapsed[secIdx] ? <ChevronRight size={14} className="text-zinc-400 shrink-0" /> : <ChevronDown size={14} className="text-zinc-400 shrink-0" />}
              {isCanEdit ? (
                <input
                  type="text"
                  value={section.name}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateSectionName(secIdx, e.target.value)}
                  className="flex-1 text-xs font-extrabold uppercase tracking-wider bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:border-primary-blue text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400"
                />
              ) : (
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  {section.name}
                </span>
              )}
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold shrink-0">
                {section.fields?.length || 0} fields
              </span>
            </div>
            {isCanEdit && (
              <button
                onClick={e => { e.stopPropagation(); deleteSection(secIdx); }}
                className="p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer shrink-0"
                title="Delete section"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Fields */}
          {!collapsed[secIdx] && (
            <div className="p-4 space-y-3">
              {(section.fields || []).length === 0 && (
                <div className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs font-semibold border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  No fields in this section yet.
                  {isCoordinator && <span className="block text-[10px] mt-1 text-zinc-400">Click "Add Field" below to start.</span>}
                </div>
              )}

              {(section.fields || []).map((field, fldIdx) => (
                <FieldCard
                  key={field.id || fldIdx}
                  field={field}
                  sectionIdx={secIdx}
                  fieldIdx={fldIdx}
                  isCoordinator={isCanEdit}
                  onUpdate={updateField}
                  onDelete={deleteField}
                />
              ))}

              {isCanEdit && (
                <AddFieldButton sectionIdx={secIdx} onAdd={addField} />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {sections.length === 0 && !loading && (
        <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <FileText size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">No sections found.</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">Add a section below to start building the form.</p>
        </div>
      )}

      {/* Add Section button */}
      {isCanEdit && (
        <div>
          {showAddSection ? (
            <div className="flex gap-2 items-center bg-white dark:bg-zinc-900 border border-primary-blue/30 rounded-xl p-3 shadow-sm">
              <FolderPlus size={16} className="text-primary-blue shrink-0" />
              <input
                autoFocus
                type="text"
                value={addSectionName}
                onChange={e => setAddSectionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                placeholder="Section name (e.g. Portfolio Links)…"
                className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
              <button onClick={addSection} className="px-3 py-1.5 bg-primary-blue text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-primary-blue-dark transition">Add</button>
              <button onClick={() => { setShowAddSection(false); setAddSectionName(''); }} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-400 dark:text-zinc-500 hover:border-primary-blue hover:text-primary-blue dark:hover:border-primary-blue dark:hover:text-primary-blue hover:bg-primary-blue/3 dark:hover:bg-primary-blue/10 transition cursor-pointer"
            >
              <FolderPlus size={15} /> Add New Section
            </button>
          )}
        </div>
      )}

      {/* Sticky save bar */}
      {isCanEdit && sections.length > 0 && (
        <div className="sticky bottom-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3 shadow-xl shadow-zinc-950/10 dark:shadow-zinc-950/60 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0)} fields across {sections.length} sections
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-sm font-bold shadow-lg shadow-primary-blue/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving to database…' : 'Save Form to Database'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
