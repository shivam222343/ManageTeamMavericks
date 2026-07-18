import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Palette, 
  Sparkles, 
  Terminal, 
  BookOpen, 
  Briefcase 
} from 'lucide-react';
import toast from 'react-hot-toast';

const DomainConfigPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);

  const fetchDomains = async () => {
    try {
      const res = await axios.get(`/campaigns/${id}/domains`);
      setDomains(res.data);
    } catch (err) {
      toast.error('Failed to load domains configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [id]);

  const handleAddDomain = () => {
    const newDom = {
      name: 'New Domain',
      description: 'Describe the roles and requirements...',
      color: '#3B82F6',
      icon: 'Terminal',
      max_intake: 10,
      status: 'open'
    };
    setDomains(prev => [...prev, newDom]);
  };

  const handleUpdateDomain = (index, key, value) => {
    setDomains(prev => prev.map((d, idx) => idx === index ? { ...d, [key]: value } : d));
  };

  const handleDeleteDomain = (index) => {
    setDomains(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Domain removed from listing');
  };

  const handleSaveDomains = async () => {
    const loadToast = toast.loading('Saving domains setup...');
    try {
      await axios.post(`/campaigns/${id}/domains`, { domains });
      toast.dismiss(loadToast);
      toast.success('Domains updated successfully!');
      fetchDomains();
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error('Failed to save domains');
    }
  };

  const colorPresets = ['#3B82F6', '#F97316', '#10B981', '#EC4899', '#8B5CF6', '#EF4444', '#6B7280'];
  
  const iconPresets = [
    { value: 'Terminal', label: 'Code Terminal' },
    { value: 'Palette', label: 'Art Palette' },
    { value: 'Calendar', label: 'Calendar Event' },
    { value: 'Megaphone', label: 'PR Megaphone' },
    { value: 'Share2', label: 'Social Media' },
    { value: 'PenTool', label: 'Content Writing' },
    { value: 'Users', label: 'Logistics/PR' },
    { value: 'Anchor', label: 'Anchoring' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard/campaigns" 
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-150 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Domain Configuration</h1>
            <p className="text-xs text-zinc-500 mt-1">Configure active branches and intake properties for candidate selection.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddDomain}
            className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold shadow-sm transition hover:bg-zinc-50 cursor-pointer"
          >
            Add Domain
          </button>
          <button
            onClick={handleSaveDomains}
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
        <div className="space-y-4">
          {domains.map((dom, index) => (
            <div 
              key={index}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between shadow-sm hover:shadow transition"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                
                {/* Domain Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Domain Name</label>
                  <input
                    type="text"
                    value={dom.name}
                    onChange={(e) => handleUpdateDomain(index, 'name', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
                  />
                </div>

                {/* Maximum Intake */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Max Intake Limit</label>
                  <input
                    type="number"
                    value={dom.max_intake || ''}
                    onChange={(e) => handleUpdateDomain(index, 'max_intake', e.target.value === '' ? null : parseInt(e.target.value))}
                    placeholder="Unlimited"
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-semibold focus:outline-none"
                  />
                </div>

                {/* Domain State */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Recruitment Status</label>
                  <select
                    value={dom.status}
                    onChange={(e) => handleUpdateDomain(index, 'status', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-semibold focus:outline-none"
                  >
                    <option value="open">Open (Accepting)</option>
                    <option value="closed">Closed (Locked)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Roles Description</label>
                  <input
                    type="text"
                    value={dom.description || ''}
                    onChange={(e) => handleUpdateDomain(index, 'description', e.target.value)}
                    placeholder="Short description displayed on applicant board..."
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:outline-none"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Lucide Symbol Icon</label>
                  <select
                    value={dom.icon}
                    onChange={(e) => handleUpdateDomain(index, 'icon', e.target.value)}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-semibold focus:outline-none"
                  >
                    {iconPresets.map((icon) => (
                      <option key={icon.value} value={icon.value}>{icon.label}</option>
                    ))}
                  </select>
                </div>

                {/* Color Hex Preset */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Visual Branding Color</label>
                  <div className="flex gap-1.5 items-center mt-1">
                    <input
                      type="color"
                      value={dom.color}
                      onChange={(e) => handleUpdateDomain(index, 'color', e.target.value)}
                      className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer overflow-hidden p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={dom.color}
                      onChange={(e) => handleUpdateDomain(index, 'color', e.target.value)}
                      className="w-20 p-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-mono text-center text-[10px]"
                    />
                  </div>
                </div>

              </div>

              {/* Action Pruning */}
              <button
                type="button"
                onClick={() => handleDeleteDomain(index)}
                className="mt-4 md:mt-0 p-2 border border-zinc-200 dark:border-zinc-800 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-accent-red rounded-lg shadow-sm transition shrink-0 cursor-pointer"
              >
                <Trash2 size={16} />
              </button>

            </div>
          ))}

          {domains.length === 0 && (
            <div className="py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center text-zinc-400 font-medium bg-white dark:bg-zinc-900">
              No domains declared. Create a recruitment domain.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DomainConfigPage;
