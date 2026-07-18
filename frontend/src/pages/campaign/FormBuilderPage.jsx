import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Sliders, 
  Save, 
  Copy, 
  ChevronRight, 
  PlusCircle, 
  AlertCircle, 
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const FormBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [activeField, setActiveField] = useState(null); // Currently selected field for config pane

  // Fetch form configuration
  const fetchFormStructure = async () => {
    try {
      const res = await axios.get(`/campaigns/${id}/form`);
      if (Array.isArray(res.data)) {
        setSections(res.data);
      } else {
        setSections([]);
        toast.error('Invalid form layout format received');
      }
    } catch (err) {
      toast.error('Failed to load form config');
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormStructure();
  }, [id]);

  // Save full form structure
  const handleSaveForm = async () => {
    const toastId = toast.loading('Synchronizing form metadata...');
    try {
      await axios.put(`/campaigns/${id}/form`, { sections });
      toast.dismiss(toastId);
      toast.success('Form layout synchronized successfully!');
      fetchFormStructure();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Failed to save form structure');
    }
  };

  // Section Actions
  const handleAddSection = () => {
    const newSec = {
      name: 'New Section Name',
      description: 'Describe the purpose of this section',
      is_hidden: false,
      fields: []
    };
    setSections(prev => [...prev, newSec]);
    toast.success('Section created. Scroll down to edit.');
  };

  const handleDeleteSection = (index) => {
    if (!window.confirm('Delete this entire section including all its fields?')) return;
    setSections(prev => prev.filter((_, idx) => idx !== index));
    setActiveField(null);
    toast.success('Section removed');
  };

  const handleUpdateSectionName = (index, value) => {
    setSections(prev => prev.map((s, idx) => idx === index ? { ...s, name: value } : s));
  };

  const handleUpdateSectionDesc = (index, value) => {
    setSections(prev => prev.map((s, idx) => idx === index ? { ...s, description: value } : s));
  };

  const handleMoveSection = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    
    setSections(prev => {
      const arr = [...prev];
      const temp = arr[index];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      arr[index] = arr[swapIdx];
      arr[swapIdx] = temp;
      return arr;
    });
  };

  // Field Actions
  const handleAddField = (secIndex) => {
    const newField = {
      label: 'Untitled Field',
      placeholder: 'Enter response...',
      field_type: 'text',
      is_required: false,
      description: '',
      validation_rules: { min: null, max: null, regex: '', max_size: 5242880, types: [] },
      default_value: '',
      help_text: '',
      is_hidden: false,
      options: []
    };

    setSections(prev => prev.map((s, idx) => {
      if (idx !== secIndex) return s;
      return { ...s, fields: [...s.fields, newField] };
    }));
    toast.success('Field added');
  };

  const handleDeleteField = (secIndex, fieldIndex) => {
    setSections(prev => prev.map((s, idx) => {
      if (idx !== secIndex) return s;
      return { ...s, fields: s.fields.filter((_, fIdx) => fIdx !== fieldIndex) };
    }));
    setActiveField(null);
    toast.success('Field removed');
  };

  const handleMoveField = (secIndex, fieldIndex, direction) => {
    const fields = sections[secIndex].fields;
    if (direction === 'up' && fieldIndex === 0) return;
    if (direction === 'down' && fieldIndex === fields.length - 1) return;

    setSections(prev => prev.map((s, idx) => {
      if (idx !== secIndex) return s;
      const arr = [...s.fields];
      const temp = arr[fieldIndex];
      const swapIdx = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
      arr[fieldIndex] = arr[swapIdx];
      arr[swapIdx] = temp;
      return { ...s, fields: arr };
    }));
  };

  // Select Field for configuration pane
  const handleSelectField = (secIndex, fieldIndex) => {
    setActiveField({ secIndex, fieldIndex });
  };

  // Config Pane updates
  const handleUpdateActiveField = (key, value) => {
    if (!activeField) return;
    const { secIndex, fieldIndex } = activeField;
    setSections(prev => prev.map((s, sIdx) => {
      if (sIdx !== secIndex) return s;
      return {
        ...s,
        fields: s.fields.map((f, fIdx) => {
          if (fIdx !== fieldIndex) return f;
          return { ...f, [key]: value };
        })
      };
    }));
  };

  const handleUpdateActiveFieldValidation = (key, value) => {
    if (!activeField) return;
    const { secIndex, fieldIndex } = activeField;
    setSections(prev => prev.map((s, sIdx) => {
      if (sIdx !== secIndex) return s;
      return {
        ...s,
        fields: s.fields.map((f, fIdx) => {
          if (fIdx !== fieldIndex) return f;
          return {
            ...f,
            validation_rules: {
              ...f.validation_rules,
              [key]: value
            }
          };
        })
      };
    }));
  };

  // Manage field option selections
  const handleAddOption = () => {
    if (!activeField) return;
    const { secIndex, fieldIndex } = activeField;
    const field = sections[secIndex].fields[fieldIndex];
    const newOpt = { option_value: 'opt_val', option_label: 'New Option' };

    handleUpdateActiveField('options', [...(field.options || []), newOpt]);
  };

  const handleRemoveOption = (optIndex) => {
    if (!activeField) return;
    const { secIndex, fieldIndex } = activeField;
    const field = sections[secIndex].fields[fieldIndex];
    handleUpdateActiveField('options', field.options.filter((_, idx) => idx !== optIndex));
  };

  const handleUpdateOption = (optIndex, key, value) => {
    if (!activeField) return;
    const { secIndex, fieldIndex } = activeField;
    const field = sections[secIndex].fields[fieldIndex];
    const updatedOpts = field.options.map((opt, idx) => {
      if (idx !== optIndex) return opt;
      return { 
        ...opt, 
        [key]: value,
        // Sync option_value to lowercase alphanumeric string if label changes
        option_value: key === 'option_label' ? value.toLowerCase().replace(/[^a-z0-9]+/g, '_') : opt.option_value
      };
    });
    handleUpdateActiveField('options', updatedOpts);
  };

  // Retrieve details of field currently being edited
  const getSelectedFieldDetails = () => {
    if (!activeField) return null;
    const { secIndex, fieldIndex } = activeField;
    return sections[secIndex]?.fields[fieldIndex] || null;
  };

  const activeFieldDetails = getSelectedFieldDetails();

  const fieldTypes = [
    { value: 'text', label: 'Single Line Text' },
    { value: 'paragraph', label: 'Paragraph (Multi-line)' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'prn', label: 'PRN Number (College ID)' },
    { value: 'dropdown', label: 'Dropdown Select' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkboxes (Multi)' },
    { value: 'date', label: 'Date Input' },
    { value: 'number', label: 'Number' },
    { value: 'url', label: 'Website URL' },
    { value: 'resume', label: 'Resume Upload (PDF)' },
    { value: 'id_card', label: 'ID Card Upload' },
    { value: 'rating', label: 'Rating Star Widget' },
    { value: 'consent', label: 'Consent Checkbox' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard/campaigns" 
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-150 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Form Designer</h1>
            <p className="text-xs text-zinc-500 mt-1">Configure layout, sections, and fields for this registration drive.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddSection}
            className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold shadow-sm transition hover:bg-zinc-50 cursor-pointer"
          >
            Add Section
          </button>
          <button
            onClick={handleSaveForm}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/15 transition cursor-pointer"
          >
            <Save size={14} />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {loading ? (
        <MajorLoader fullPage={true} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-start">
          
          {/* --- LEFT FORM OUTLINE CONTAINER (2/3 width) --- */}
          <div className="lg:col-span-2 space-y-6">
            {Array.isArray(sections) && sections.map((sec, sIdx) => (
              <div 
                key={sIdx} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm"
              >
                
                {/* Section Header */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <input 
                      type="text" 
                      value={sec.name}
                      onChange={(e) => handleUpdateSectionName(sIdx, e.target.value)}
                      className="bg-transparent font-bold text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-b border-zinc-300 dark:border-zinc-700 w-full"
                    />
                    <input 
                      type="text" 
                      value={sec.description || ''}
                      onChange={(e) => handleUpdateSectionDesc(sIdx, e.target.value)}
                      placeholder="Add subsection descriptions here..."
                      className="bg-transparent text-[11px] text-zinc-400 focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleMoveSection(sIdx, 'up')}
                      disabled={sIdx === 0}
                      className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleMoveSection(sIdx, 'down')}
                      disabled={sIdx === sections.length - 1}
                      className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSection(sIdx)}
                      className="p-1 text-zinc-400 hover:text-accent-red cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Section Field List */}
                <div className="p-5 space-y-3 bg-white dark:bg-zinc-900">
                  {sec.fields.map((field, fIdx) => {
                    const isSelected = activeField && activeField.secIndex === sIdx && activeField.fieldIndex === fIdx;
                    
                    return (
                      <div 
                        key={fIdx}
                        onClick={() => handleSelectField(sIdx, fIdx)}
                        className={`p-3 border rounded-lg flex items-center justify-between gap-4 cursor-pointer transition
                          ${isSelected 
                            ? 'border-primary-blue bg-primary-blue/5 dark:bg-primary-blue/10 shadow-sm shadow-primary-blue/5' 
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }
                        `}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-bold truncate flex items-center gap-1.5">
                            <span>{field.label || 'Untitled Field'}</span>
                            {field.is_required && <span className="text-accent-red">*</span>}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            Type: {field.field_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleMoveField(sIdx, fIdx, 'up')}
                            disabled={fIdx === 0}
                            className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button 
                            onClick={() => handleMoveField(sIdx, fIdx, 'down')}
                            disabled={fIdx === sec.fields.length - 1}
                            className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteField(sIdx, fIdx)}
                            className="p-1 text-zinc-400 hover:text-accent-red cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => handleAddField(sIdx)}
                    className="w-full py-2 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <PlusCircle size={14} />
                    <span>Append Field</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

          {/* --- RIGHT CONFIGURATION COLUMN (1/3 width) --- */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-1.5">
              <Sliders size={16} className="text-primary-blue" />
              <span>Field Configurator</span>
            </h3>

            {activeFieldDetails ? (
              <div className="space-y-4 text-xs font-semibold">
                
                {/* Field Label */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Field Label</label>
                  <input
                    type="text"
                    value={activeFieldDetails.label}
                    onChange={(e) => handleUpdateActiveField('label', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-semibold focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                {/* Field Placeholder */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    value={activeFieldDetails.placeholder || ''}
                    onChange={(e) => handleUpdateActiveField('placeholder', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                {/* Field Type Select */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Input Type</label>
                  <select
                    value={activeFieldDetails.field_type}
                    onChange={(e) => handleUpdateActiveField('field_type', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1"
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Help text */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Help / Support Text</label>
                  <input
                    type="text"
                    value={activeFieldDetails.help_text || ''}
                    onChange={(e) => handleUpdateActiveField('help_text', e.target.value)}
                    placeholder="Brief instruction displayed below field"
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded"
                  />
                </div>

                {/* Required switch */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Mandatory Response</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={activeFieldDetails.is_required}
                      onChange={(e) => handleUpdateActiveField('is_required', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-primary-blue"></div>
                  </label>
                </div>

                {/* Options configurator for drop/radio/checkbox */}
                {['dropdown', 'radio', 'checkbox'].includes(activeFieldDetails.field_type) && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wide font-bold">Select Options</span>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-[10px] font-bold text-primary-blue flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={10} />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeFieldDetails.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={opt.option_label}
                            onChange={(e) => handleUpdateOption(oIdx, 'option_label', e.target.value)}
                            placeholder="Option Label"
                            className="flex-1 p-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(oIdx)}
                            className="text-zinc-400 hover:text-accent-red cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {(activeFieldDetails.options || []).length === 0 && (
                        <p className="text-[10px] text-zinc-400 italic text-center py-2">
                          No options defined. Add option above.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Length bounds validation rules */}
                {['text', 'paragraph'].includes(activeFieldDetails.field_type) && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase tracking-wide mb-1">Min Length</label>
                      <input
                        type="number"
                        value={activeFieldDetails.validation_rules?.min || ''}
                        onChange={(e) => handleUpdateActiveFieldValidation('min', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase tracking-wide mb-1">Max Length</label>
                      <input
                        type="number"
                        value={activeFieldDetails.validation_rules?.max || ''}
                        onChange={(e) => handleUpdateActiveFieldValidation('max', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded"
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400 font-medium">
                <AlertCircle size={20} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-[11px]">Select a form field from the left panel to configure its options and rules.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default FormBuilderPage;
