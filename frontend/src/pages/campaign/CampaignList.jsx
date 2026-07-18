import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { 
  Plus, 
  Settings, 
  Calendar, 
  Users, 
  ExternalLink, 
  AlertCircle, 
  Eye, 
  FolderGit2, 
  Trash2,
  FileCheck,
  Globe,
  Sliders,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const CampaignList = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  
  // Create Modal / Form state
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    opening_date: '',
    deadline: '',
    status: 'draft',
    visibility: 'public',
    max_applications: ''
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/campaigns');
      if (Array.isArray(res.data)) {
        setCampaigns(res.data);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      toast.error('Failed to load campaigns list');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from name if editing name
      slug: name === 'name' ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : prev.slug
    }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/campaigns', {
        ...formData,
        max_applications: formData.max_applications === '' ? null : parseInt(formData.max_applications)
      });
      toast.success('Recruitment campaign initialized!');
      setCreateOpen(false);
      setFormData({
        name: '',
        slug: '',
        description: '',
        opening_date: '',
        deadline: '',
        status: 'draft',
        visibility: 'public',
        max_applications: ''
      });
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create campaign');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this recruitment campaign? All associated form fields, domains, email templates, and candidate submissions will be permanently deleted.')) {
      return;
    }
    try {
      await axios.delete(`/campaigns/${id}`);
      toast.success('Campaign removed');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/30',
      closed: 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30',
      draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Campaign Manager</h1>
          <p className="text-zinc-500 text-sm">Create and configure recruitment campaigns for Team Mavericks.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold hover:shadow transition cursor-pointer"
        >
          <Plus size={14} />
          <span>Launch Drive</span>
        </button>
      </div>

      {loading ? (
        <MajorLoader fullPage={true} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(campaigns) && campaigns.map((c) => (
            <div key={c.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow transition">
              
              {/* Top Banner (Unsplash mockup) */}
              <div className="h-32 bg-zinc-100 dark:bg-zinc-850 relative">
                <img 
                  src={c.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'} 
                  alt="Campaign banner" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(c.status)}
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-base leading-tight mb-2">{c.name}</h3>
                  <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-semibold">
                    {c.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 text-[11px] font-semibold text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      <span>Submissions:</span>
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                      {c.total_applications} total ({c.today_applications} today)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Deadline:</span>
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-mono">
                      {new Date(c.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      <span>Slug:</span>
                    </span>
                    <a 
                      href={`http://localhost:5173/teammavericks/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-blue dark:text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>/{c.slug}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Configuration Action Options */}
                <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                  <Link 
                    to={`/dashboard/campaigns/${c.id}/form`}
                    className="py-2 sm:py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-[10px] font-bold shadow-sm transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="Form Builder"
                  >
                    <Sliders size={14} className="text-primary-blue" />
                    <span className="hidden sm:inline">Form Fields</span>
                  </Link>

                  <Link 
                    to={`/dashboard/campaigns/${c.id}/domains`}
                    className="py-2 sm:py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-[10px] font-bold shadow-sm transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="Domains Setup"
                  >
                    <Sparkles size={14} className="text-secondary-orange" />
                    <span className="hidden sm:inline">Domains</span>
                  </Link>

                  <button 
                    onClick={() => handleDeleteCampaign(c.id)}
                    className="py-2 sm:py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-[10px] font-bold shadow-sm text-accent-red hover:border-red-200 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                    title="Delete Campaign"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>

            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="col-span-3 py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center text-zinc-400 font-medium bg-white dark:bg-zinc-900">
              No recruitment drives scheduled. Start by creating one.
            </div>
          )}
        </div>
      )}

      {/* --- CREATE CAMPAIGN DIALOG DIALOGUE --- */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative z-10 space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="font-bold text-sm uppercase tracking-wide">Initialize Recruitment Campaign</h2>
              <button onClick={() => setCreateOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Campaign Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Team Mavericks Recruitment 2026"
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">URL Slug (Unique path)</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    placeholder="recruitment-2026"
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded font-mono focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Opening Date</label>
                  <input
                    type="datetime-local"
                    name="opening_date"
                    value={formData.opening_date}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Deadline Date</label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Details shown to applicants on the recruitment page..."
                  className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1 focus:ring-primary-blue focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Draft / Open State</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1"
                  >
                    <option value="draft">Draft (Private Config)</option>
                    <option value="open">Open (Publicly Active)</option>
                    <option value="closed">Closed (Archive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Max Registrations Limit (Optional)</label>
                  <input
                    type="number"
                    name="max_applications"
                    value={formData.max_applications}
                    onChange={handleInputChange}
                    placeholder="e.g. 500 (Leave empty for unlimited)"
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded focus:ring-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 hover:shadow cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue-dark hover:shadow cursor-pointer"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Placeholder X close button
const X = ({ size }) => <span className="font-bold text-xs" style={{ fontSize: size }}>✕</span>;

export default CampaignList;
