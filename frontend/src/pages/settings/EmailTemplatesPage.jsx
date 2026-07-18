import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { 
  Mail, 
  Save, 
  HelpCircle, 
  FileText, 
  Code2, 
  Bookmark, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const EmailTemplatesPage = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState('applied'); // 'applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected'

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/campaigns/1/email-templates');
      if (Array.isArray(res.data)) {
        setTemplates(res.data);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      toast.error('Failed to load email templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleUpdateTemplate = (trigger, key, value) => {
    setTemplates(prev => {
      if (!Array.isArray(prev)) return [];
      return prev.map(t => t.trigger_event === trigger ? { ...t, [key]: value } : t);
    });
  };

  const handleSaveTemplates = async () => {
    const loadToast = toast.loading('Saving custom templates...');
    try {
      await axios.put('/campaigns/1/email-templates', { templates });
      toast.dismiss(loadToast);
      toast.success('Email templates updated successfully!');
      fetchTemplates();
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error('Failed to update email templates');
    }
  };

  const getActiveTemplate = () => {
    if (!Array.isArray(templates)) return null;
    return templates.find(t => t.trigger_event === activeTab) || null;
  };

  const activeTemplate = getActiveTemplate();

  const variables = [
    { name: '{full_name}', desc: "The candidate's registered full name." },
    { name: '{prn}', desc: "The candidate's PRN registration number." },
    { name: '{app_id}', desc: 'The unique application ID (e.g. 0005).' },
    { name: '{domains}', desc: 'Commas-separated list of selected domains.' },
    { name: '{interview_datetime}', desc: 'Date and time of interview (Interview template only).' },
    { name: '{interview_venue}', desc: 'Interview location or meet link (Interview template only).' }
  ];

  const triggerLabels = {
    applied: 'Application Received',
    shortlisted: 'Shortlisted Notification',
    interview_scheduled: 'Interview Scheduled',
    selected: 'Selection Letter',
    rejected: 'Rejection Notice'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Email System</h1>
          <p className="text-zinc-500 text-sm">Customize automatic messages dispatched during pipeline phase transitions.</p>
        </div>
        <button
          onClick={handleSaveTemplates}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/15 transition cursor-pointer"
        >
          <Save size={14} />
          <span>Save Templates</span>
        </button>
      </div>

      {loading ? (
        <MajorLoader fullPage={true} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* --- LEFT FORM BUILDER COLUMN (2/3 width) --- */}
          <div className="lg:col-span-2 space-y-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            
            {/* Tabs Bar */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto bg-zinc-50/50 dark:bg-zinc-950/20">
              {Object.keys(triggerLabels).map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => setActiveTab(trigger)}
                  className={`px-5 py-3 border-b-2 font-bold text-xs capitalize whitespace-nowrap cursor-pointer transition
                    ${activeTab === trigger 
                      ? 'border-primary-blue text-primary-blue' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  {triggerLabels[trigger]}
                </button>
              ))}
            </div>

            {activeTemplate ? (
              <div className="p-6 space-y-4 text-xs font-semibold">
                
                {/* Subject Line */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1.5">Email Subject Line</label>
                  <input
                    type="text"
                    value={activeTemplate.subject}
                    onChange={(e) => handleUpdateTemplate(activeTab, 'subject', e.target.value)}
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg font-bold text-sm focus:ring-1 focus:ring-primary-blue focus:outline-none"
                  />
                </div>

                {/* HTML Body Editor */}
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wide mb-1.5">Email Body (HTML Structure Supported)</label>
                  <textarea
                    value={activeTemplate.body_html}
                    onChange={(e) => handleUpdateTemplate(activeTab, 'body_html', e.target.value)}
                    rows="15"
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none resize-y"
                  />
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-zinc-400 font-medium">
                <AlertCircle size={20} className="mx-auto mb-2 text-zinc-300" />
                <p>No template configured for trigger "{activeTab}".</p>
              </div>
            )}
          </div>

          {/* --- RIGHT INFO / VARIABLES COLUMN (1/3 width) --- */}
          <div className="space-y-6">
            
            {/* Substitution Tags */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-1.5">
                <Code2 size={16} className="text-primary-blue" />
                <span>Replacement Tags</span>
              </h3>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Insert these exact tags into the email Subject or Body text. The system will dynamically substitute them with actual candidate details when sending.
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 pt-2">
                {variables.map((v) => (
                  <div key={v.name} className="p-2 border border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-md text-[10px]">
                    <span 
                      onClick={() => {
                        navigator.clipboard.writeText(v.name);
                        toast.success(`Copied "${v.name}" to clipboard`);
                      }}
                      className="font-mono font-bold text-primary-blue dark:text-blue-400 hover:underline cursor-pointer select-all"
                    >
                      {v.name}
                    </span>
                    <p className="text-zinc-500 font-medium mt-1 leading-normal">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Tips */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-1.5">
                <Bookmark size={16} className="text-primary-blue" />
                <span>System Guidelines</span>
              </h3>
              <ul className="list-disc pl-4 space-y-2 text-[10px] font-semibold text-zinc-500 leading-relaxed">
                <li>Always include the <strong className="text-zinc-700 dark:text-zinc-300">{`{full_name}`}</strong> tag in the greeting line.</li>
                <li>Make sure to specify <strong className="text-zinc-700 dark:text-zinc-300">{`{interview_datetime}`}</strong> and <strong className="text-zinc-700 dark:text-zinc-300">{`{interview_venue}`}</strong> fields inside the interview schedule template so dates are shared correctly.</li>
                <li>Write valid inline CSS styling inside HTML blocks (e.g. use inline style attributes instead of class selectors).</li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default EmailTemplatesPage;
