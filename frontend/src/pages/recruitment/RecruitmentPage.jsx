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
  ToggleRight,
  Settings,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Field type registry ─────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: AlignLeft },
  { value: 'email', label: 'Email Address', icon: Mail },
  { value: 'phone', label: 'Phone / Contact', icon: Phone },
  { value: 'number', label: 'Number / Count', icon: Hash },
  { value: 'prn', label: 'PRN / Roll No.', icon: Hash },
  { value: 'paragraph', label: 'Long Text Area', icon: FileText },
  { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { value: 'radio', label: 'Radio (Single)', icon: Circle },
  { value: 'file', label: 'File Upload', icon: Upload },
  { value: 'rating', label: 'Star Rating', icon: Star },
  { value: 'consent', label: 'Consent Declaration', icon: ToggleLeft },
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
    'w-full px-3.5 py-2.5 border rounded-xl bg-zinc-50/50 border-zinc-200/80 text-zinc-450 dark:bg-zinc-950/20 dark:border-zinc-800 text-[11px] font-semibold text-zinc-405 pointer-events-none transition duration-200';

  return (
    <div className="space-y-1.5 animate-fadeIn">
      {field.description && (
        <p className="text-[10px] text-zinc-450 dark:text-zinc-550 font-medium leading-relaxed">{field.description}</p>
      )}
      {['text', 'email', 'phone', 'prn', 'number'].includes(field.field_type) && (
        <input readOnly placeholder={field.placeholder || `Enter ${field.label || 'value'}…`} className={base} />
      )}
      {field.field_type === 'paragraph' && (
        <textarea readOnly rows={3} placeholder={field.placeholder || 'Type your answer here…'} className={`${base} resize-none`} />
      )}
      {field.field_type === 'file' && (
        <div className={`${base} flex items-center justify-center border-dashed border-2 p-5 flex-col gap-2`}>
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-905 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-405">
            <Upload size={14} />
          </div>
          <span className="text-[10px] font-bold">Upload file (Max 5MB)</span>
        </div>
      )}
      {['checkbox', 'radio'].includes(field.field_type) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {(field.options || []).length === 0 && (
            <p className="text-[10px] italic text-zinc-400 dark:text-zinc-500 pl-1 col-span-2">No options — edit to add.</p>
          )}
          {(field.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 border rounded-xl border-zinc-200 bg-white/40 dark:border-zinc-800 dark:bg-zinc-900/10 text-xs text-zinc-555 pointer-events-none select-none">
              <input type={field.field_type} readOnly className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 dark:border-zinc-800 bg-zinc-900" />
              <span className="truncate">{opt.option_label || opt.option_value || `Option ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )}
      {field.field_type === 'rating' && (
        <div className="flex gap-1.5 text-amber-550 text-lg py-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="pointer-events-none">★</span>
          ))}
        </div>
      )}
      {field.field_type === 'consent' && (
        <div className="flex gap-2.5 items-start p-2.5 border rounded-xl border-zinc-200/80 bg-white/40 dark:border-zinc-800 dark:bg-zinc-900/10">
          <input type="checkbox" readOnly className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 dark:border-zinc-800 bg-zinc-900 mt-0.5" />
          <span className="text-[10px] text-zinc-500 leading-relaxed font-medium">
            {field.description || 'I confirm the accuracy of information.'}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Field Card ───────────────────────────────────────────────────────────────
const FieldCard = ({
  field,
  sectionIdx,
  fieldIdx,
  isCoordinator,
  onUpdate,
  onDelete,
  activeDragField,
  setActiveDragField,
  draggingField,
  dragOverField,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}) => {
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

  const isDragging = draggingField && draggingField.sectionIdx === sectionIdx && draggingField.fieldIdx === fieldIdx;
  const isDragOver = dragOverField && dragOverField.sectionIdx === sectionIdx && dragOverField.fieldIdx === fieldIdx;
  const isDraggable = isCoordinator && activeDragField && activeDragField.sectionIdx === sectionIdx && activeDragField.fieldIdx === fieldIdx;

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, sectionIdx, fieldIdx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, sectionIdx, fieldIdx)}
      onDrop={(e) => onDrop(e, sectionIdx, fieldIdx)}
      className={`border rounded-2xl transition-all duration-250 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm overflow-hidden 
        ${expanded ? 'border-blue-500/40 shadow-lg shadow-blue-500/[0.02]' : 'border-zinc-200/80 dark:border-zinc-800/80'}
        ${isDragging ? 'opacity-30 border-dashed border-zinc-400 dark:border-zinc-600' : ''}
        ${isDragOver ? 'border-blue-500 bg-blue-50/5 dark:bg-blue-950/10 scale-[1.01] shadow-md shadow-blue-500/5' : ''}
      `}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3.5 select-none">
        {isCoordinator && (
          <GripVertical
            size={14}
            className="text-zinc-405 dark:text-zinc-600 shrink-0 cursor-grab active:cursor-grabbing hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors"
            onMouseEnter={() => setActiveDragField({ sectionIdx, fieldIdx })}
            onMouseLeave={() => { if (!draggingField) setActiveDragField(null); }}
          />
        )}
        <div className="w-8 h-8 rounded-xl bg-zinc-100/85 dark:bg-zinc-950/50 flex items-center justify-center shrink-0 border border-zinc-200/40 dark:border-zinc-800/40 text-zinc-550 dark:text-zinc-400 shadow-sm">
          <TypeIcon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          {expanded && isCoordinator ? (
            <input
              type="text"
              value={field.label}
              onChange={e => update('label', e.target.value)}
              placeholder="Field Label (e.g. GitHub URL)"
              className="w-full text-xs font-black bg-transparent border-0 border-b border-dashed border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white pb-0.5 placeholder:text-zinc-400"
            />
          ) : (
            <p className="text-xs font-black truncate text-zinc-900 dark:text-white uppercase tracking-wide">
              {field.label || <span className="text-zinc-400 dark:text-zinc-600 italic font-normal normal-case">Untitled field</span>}
              {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
            </p>
          )}
          <span className="text-[8px] uppercase tracking-widest font-extrabold text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 block">
            {FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}
          </span>
        </div>
        {isCoordinator && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-2 rounded-xl text-zinc-405 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60 transition cursor-pointer shadow-sm border border-zinc-200/20 bg-white/40 dark:bg-zinc-950/20"
              title={expanded ? 'Collapse' : 'Edit field'}
            >
              {expanded ? <ChevronDown size={13} /> : <Edit3 size={13} />}
            </button>
            <button
              onClick={() => onDelete(sectionIdx, fieldIdx)}
              className="p-2 rounded-xl text-zinc-405 hover:text-red-550 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition cursor-pointer shadow-sm border border-zinc-200/20 bg-white/40 dark:bg-zinc-950/20"
              title="Remove field"
            >
              <Trash2 size={13} />
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
        <div className="px-5 pb-5 border-t border-zinc-200/60 dark:border-zinc-800/40 pt-4 space-y-4 bg-zinc-50/25 dark:bg-zinc-955/5 text-xs font-semibold">
          {/* Row: type + required toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 mb-1.5 font-mono">Field Type</label>
              <select
                value={field.field_type}
                onChange={e => update('field_type', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-550 transition duration-200"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none pb-2 hover:opacity-90 transition">
              <button
                type="button"
                onClick={() => update('is_required', !field.is_required)}
                className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-200 ${field.is_required ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-800'}`}
              >
                <span className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ml-0.5 ${field.is_required ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </button>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-455 dark:text-zinc-500 font-mono">Required Field</span>
            </label>
          </div>

          {/* Placeholder + description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 mb-1.5 font-mono">Placeholder Text</label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={e => update('placeholder', e.target.value)}
                placeholder="e.g. Enter your portfolio link…"
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-550 transition duration-200 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 mb-1.5 font-mono">Field Description</label>
              <input
                type="text"
                value={field.description || ''}
                onChange={e => update('description', e.target.value)}
                placeholder="e.g. Include full URL starting with https://"
                className="w-full px-3.5 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-550 focus:border-blue-550 transition duration-200 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Options manager */}
          {hasOptions && (
            <div className="border border-zinc-250/60 dark:border-zinc-800/40 rounded-2xl p-4 bg-zinc-50/40 dark:bg-zinc-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-455 dark:text-zinc-500 font-mono">Options Configuration</span>
                <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-blue-550 dark:text-blue-400 hover:underline cursor-pointer">
                  <PlusCircle size={12} /> Add option
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(field.options || []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2.5 items-center">
                    <input
                      type="text"
                      value={opt.option_label}
                      onChange={e => updateOption(oi, e.target.value)}
                      placeholder={`Option Label (e.g. Option ${oi + 1})`}
                      className="flex-1 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-550 transition duration-200"
                    />
                    <button type="button" onClick={() => removeOption(oi)} className="p-2 text-zinc-400 hover:text-red-550 hover:bg-red-550/10 rounded-xl transition cursor-pointer">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {(field.options || []).length === 0 && (
                  <p className="text-[10px] italic text-zinc-450 dark:text-zinc-500 pl-1 font-medium">Click "Add option" to build values choice list.</p>
                )}
              </div>
            </div>
          )}

          {/* Live preview wrapper */}
          <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
            <p className="text-[8px] uppercase tracking-widest font-extrabold text-zinc-400 dark:text-zinc-500 font-mono mb-2.5">Live Preview Layout</p>
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
        className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest text-zinc-455 hover:text-blue-555 hover:border-blue-555 dark:hover:border-blue-500/40 dark:hover:text-blue-400 hover:bg-blue-50/20 dark:hover:bg-zinc-900 transition duration-300 cursor-pointer shadow-sm active:scale-[0.99]"
      >
        <Plus size={14} /> Add Field to Section
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-3 left-0 right-0 z-20 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 backdrop-blur-xl animate-fadeIn">
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-2 pb-2.5 font-mono">Choose a field type to append</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {FIELD_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => { onAdd(sectionIdx, t.value); setOpen(false); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-zinc-655 hover:text-blue-600 bg-zinc-50/50 border border-zinc-200/40 hover:border-blue-500/20 hover:bg-blue-50/20 dark:bg-zinc-950/20 dark:border-zinc-850/40 dark:text-zinc-450 dark:hover:text-blue-400 dark:hover:bg-blue-950/20 transition duration-150 text-left cursor-pointer"
                  >
                    <Icon size={13} className="shrink-0 text-zinc-400 group-hover:text-blue-500" />
                    <span className="truncate">{t.label}</span>
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

  const [activeDragField, setActiveDragField] = useState(null);
  const [draggingField, setDraggingField] = useState(null);
  const [dragOverField, setDragOverField] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campRes, formRes] = await Promise.all([
        axios.get('/campaigns/1'),
        axios.get('/campaigns/1/form'),
      ]);
      setCampaign(campRes.data);

      const fetchedSections = Array.isArray(formRes.data) ? formRes.data : [];
      const sectionsWithDragId = fetchedSections.map(s => ({
        ...s,
        fields: (s.fields || []).map(f => ({
          ...f,
          dragId: f.id || Math.random().toString(36).substring(2, 9)
        }))
      }));
      setSections(sectionsWithDragId);
    } catch (err) {
      toast.error('Failed to load recruitment form configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────
  const handleDragStart = useCallback((e, sectionIdx, fieldIdx) => {
    setDraggingField({ sectionIdx, fieldIdx });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${sectionIdx},${fieldIdx}`);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingField(null);
    setDragOverField(null);
    setActiveDragField(null);
  }, []);

  const handleDragOver = useCallback((e, sectionIdx, fieldIdx) => {
    e.preventDefault();
    if (draggingField && (draggingField.sectionIdx !== sectionIdx || draggingField.fieldIdx !== fieldIdx)) {
      setDragOverField({ sectionIdx, fieldIdx });
    }
  }, [draggingField]);

  const handleDrop = useCallback((e, targetSectionIdx, targetFieldIdx) => {
    e.preventDefault();
    setDragOverField(null);

    let sourceSectionIdx, sourceFieldIdx;
    if (draggingField) {
      sourceSectionIdx = draggingField.sectionIdx;
      sourceFieldIdx = draggingField.fieldIdx;
    } else {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      [sourceSectionIdx, sourceFieldIdx] = data.split(',').map(Number);
    }

    if (sourceSectionIdx === undefined || sourceFieldIdx === undefined) return;
    if (sourceSectionIdx === targetSectionIdx && sourceFieldIdx === targetFieldIdx) return;

    setSections(prev => {
      const next = prev.map(s => ({ ...s, fields: [...s.fields] }));
      const fieldToMove = next[sourceSectionIdx].fields[sourceFieldIdx];

      // Remove from source
      next[sourceSectionIdx].fields.splice(sourceFieldIdx, 1);

      // Insert into target
      next[targetSectionIdx].fields.splice(targetFieldIdx, 0, fieldToMove);

      return next;
    });

    setDraggingField(null);
    setActiveDragField(null);
  }, [draggingField]);

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
      next[secIdx].fields.push(blankField({
        field_type: fieldType,
        dragId: Math.random().toString(36).substring(2, 9)
      }));
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
    draft: { 
      pill: 'bg-amber-500/10 text-amber-500 border border-amber-500/20', 
      active: 'bg-gradient-to-r from-amber-550 to-orange-500 text-white shadow-lg shadow-amber-500/20 font-bold border border-amber-400/20' 
    },
    open: { 
      pill: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20', 
      active: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 font-bold border border-emerald-400/20' 
    },
    closed: { 
      pill: 'bg-red-500/10 text-red-500 border border-red-500/20', 
      active: 'bg-gradient-to-r from-rose-500 to-red-655 text-white shadow-lg shadow-rose-500/20 font-bold border border-red-400/20' 
    },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* ── Top controls ────────────────────────────────────────────────────── */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Glow overlay */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/[0.015] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Recruitment Form Builder</h1>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-widest animate-fadeIn ${statusStyle[campaign?.status || 'draft']?.pill}`}>
                {campaign?.status || 'draft'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-455 mt-1.5 font-medium leading-relaxed max-w-xl">
              Construct candidate registration fields using sections. Updates auto-save on change in your local state. Click <strong className="text-zinc-800 dark:text-zinc-200">Save Form to Database</strong> to deploy live to candidates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 text-[10px] font-extrabold uppercase tracking-widest">
            <button onClick={copyPublicUrl} className="flex items-center gap-1.5 h-10 px-4 border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70 text-zinc-650 dark:text-zinc-350 rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-95">
              <Copy size={13} /> Copy URL
            </button>
            <a href="/teammavericks/recruitment-2026" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 h-10 px-4 border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70 text-zinc-650 dark:text-zinc-350 rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-95">
              <Eye size={13} /> View Live
            </a>
            {isCoordinator && (
              <Link to="/dashboard/settings/portal" className="flex items-center gap-1.5 h-10 px-4 border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70 text-zinc-500 hover:text-blue-550 dark:text-zinc-400 dark:hover:text-blue-400 rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-95" title="Portal Settings">
                <Settings size={13} /> Settings
              </Link>
            )}
            {isCanEdit && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-650 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition duration-150 cursor-pointer disabled:opacity-50 active:scale-95">
                <Save size={13} /> <span>{saving ? 'Saving…' : 'Save Form'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status toggling & deadline config row */}
        {isCanEdit && (
          <div className="border-t border-zinc-200/60 dark:border-zinc-800/40 mt-5 pt-5 space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 font-mono">Recruitment Status:</span>
              <div className="flex border border-zinc-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950 w-fit rounded-2xl p-1 gap-1 select-none">
                {['draft', 'open', 'closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusChanging}
                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition duration-200 cursor-pointer disabled:opacity-60
                      ${campaign?.status === s
                        ? statusStyle[s]?.active
                        : 'text-zinc-405 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60'
                      }
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1.5">
                {campaign?.status === 'open' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> <span>Form is active and open to candidates</span></>}
                {campaign?.status === 'closed' && <><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> <span>Form is closed — candidate form shows notice</span></>}
                {campaign?.status === 'draft' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> <span>Form is in draft — invisible to public candidates</span></>}
              </span>
            </div>

            {/* Deadline Timer Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-zinc-200/40 dark:border-zinc-800/20 pt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500 font-mono">Application Deadline:</span>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center">
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
                    className="pl-9 pr-3.5 h-10 border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition duration-200"
                  />
                  <Clock size={13} className="absolute left-3 text-zinc-400 pointer-events-none" />
                </div>
                {campaign?.deadline && (
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-extrabold font-mono bg-zinc-100/50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 px-3 h-10 flex items-center rounded-xl shadow-sm">
                    Ends: {new Date(campaign.deadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Read-only banner for regular members only */}
      {!isCanEdit && (
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs font-bold text-amber-600 dark:text-amber-500/80 shadow-inner">
          <AlertCircle size={14} className="shrink-0" />
          <span>Read-only Mode: Only coordinators and core committee members can modify recruitment form settings.</span>
        </div>
      )}

      {/* ── Sections list ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {sections.map((section, secIdx) => (
          <div key={section.id || secIdx} className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-md transition duration-300">
            {/* Section header */}
            <div
              className="flex items-center justify-between gap-3 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-200/40 dark:border-zinc-850/40 cursor-pointer select-none group"
              onClick={() => toggleCollapse(secIdx)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-zinc-200/40 dark:bg-zinc-800/40 flex items-center justify-center text-zinc-450 dark:text-zinc-500 shrink-0">
                  {collapsed[secIdx] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </div>
                {isCanEdit ? (
                  <input
                    type="text"
                    value={section.name}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateSectionName(secIdx, e.target.value)}
                    className="flex-1 text-xs font-black uppercase tracking-widest bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:outline-none focus:border-blue-500 text-zinc-700 dark:text-white placeholder:text-zinc-400 py-0.5 transition duration-150"
                  />
                ) : (
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-white">
                    {section.name}
                  </span>
                )}
                <span className="text-[8px] px-2.5 py-0.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider font-mono shrink-0">
                  {section.fields?.length || 0} fields
                </span>
              </div>
              {isCanEdit && (
                <button
                  onClick={e => { e.stopPropagation(); deleteSection(secIdx); }}
                  className="p-2 rounded-xl text-zinc-400 dark:text-zinc-650 hover:text-red-550 hover:bg-red-500/10 transition cursor-pointer shrink-0 border border-transparent hover:border-red-500/10"
                  title="Delete section"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Fields list container */}
            {!collapsed[secIdx] && (
              <div className="p-5 space-y-4">
                {(section.fields || []).length === 0 && (
                  <div className="py-8 text-center text-zinc-400 dark:text-zinc-650 text-xs font-bold border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-50/10">
                    No fields configured in this section yet.
                    {isCanEdit && <span className="block text-[9px] mt-1 font-extrabold uppercase tracking-widest text-zinc-450 dark:text-zinc-500 font-mono">Use the action card below to append field elements.</span>}
                  </div>
                )}

                {(section.fields || []).map((field, fldIdx) => (
                  <FieldCard
                    key={field.dragId || field.id || fldIdx}
                    field={field}
                    sectionIdx={secIdx}
                    fieldIdx={fldIdx}
                    isCoordinator={isCanEdit}
                    onUpdate={updateField}
                    onDelete={deleteField}
                    activeDragField={activeDragField}
                    setActiveDragField={setActiveDragField}
                    draggingField={draggingField}
                    dragOverField={dragOverField}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}

                {isCanEdit && (
                  <AddFieldButton sectionIdx={secIdx} onAdd={addField} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty sections state */}
      {sections.length === 0 && !loading && (
        <div className="py-20 text-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl bg-white/20 dark:bg-zinc-900/10">
          <FileText size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-zinc-800 dark:text-white text-sm font-black uppercase tracking-wider">No form sections configured</p>
          <p className="text-[10px] text-zinc-455 dark:text-zinc-500 font-mono mt-1.5 uppercase tracking-widest">Click below to initialize your first section.</p>
        </div>
      )}

      {/* Add Section input block */}
      {isCanEdit && (
        <div className="animate-fadeIn">
          {showAddSection ? (
            <div className="flex gap-3 items-center bg-white/60 dark:bg-zinc-900/60 border border-blue-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-xl">
              <FolderPlus size={18} className="text-blue-555 shrink-0" />
              <input
                autoFocus
                type="text"
                value={addSectionName}
                onChange={e => setAddSectionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setShowAddSection(false); }}
                placeholder="Section Name (e.g. Personal Details, Project Links)…"
                className="flex-1 bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400"
              />
              <button onClick={addSection} className="px-4 py-2 bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 active:scale-95 transition">Add Section</button>
              <button onClick={() => { setShowAddSection(false); setAddSectionName(''); }} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-[10px] font-extrabold uppercase tracking-widest text-zinc-455 hover:text-blue-550 hover:border-blue-550/50 dark:hover:border-blue-500/40 dark:hover:text-blue-400 hover:bg-blue-50/10 dark:hover:bg-zinc-900/10 transition duration-300 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <FolderPlus size={15} className="text-zinc-400" />
              <span>Add New Section</span>
            </button>
          )}
        </div>
      )}

      {/* Sticky save controls footer bar */}
      {isCanEdit && sections.length > 0 && (
        <div className="sticky bottom-6 z-50">
          <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl px-6 py-4.5 shadow-2xl flex items-center justify-between gap-4 animate-slideUp">
            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-widest font-mono">
              {sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0)} fields &bull; {sections.length} sections active
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-650 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition duration-150 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Save size={14} />
              <span>{saving ? 'Saving to database…' : 'Save Form to Database'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
