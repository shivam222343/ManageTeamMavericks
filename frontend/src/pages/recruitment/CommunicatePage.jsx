import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Mail, Search, RefreshCw, Send, AlertCircle, Play, Sparkles, Check, CheckSquare, Square, FileText, Bold, Italic, Underline, Link as LinkIcon, Heading, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';

const CommunicatePage = () => {
  const { user } = useAuth();
  const isCanEdit = user?.role === 'coordinator' || user?.role === 'core_member';

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicantIds, setSelectedApplicantIds] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Composer fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [hasButton, setHasButton] = useState(false);
  const [buttonText, setButtonText] = useState('Go to your application dashboard');
  const [buttonUrl, setButtonUrl] = useState('http://localhost:8000/teammavericks/apply-success');
  const [saveTargetEvent, setSaveTargetEvent] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Loaders & dispatchers
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/campaigns');
      if (Array.isArray(res.data)) {
        setCampaigns(res.data);
        if (res.data.length > 0) {
          setSelectedCampaignId(res.data[0].id);
        }
      }
    } catch (err) {
      toast.error('Failed to load recruitment campaigns.');
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch applicants and templates when campaign changes
  useEffect(() => {
    if (!selectedCampaignId) return;

    const loadCampaignData = async () => {
      setLoading(true);
      try {
        // Fetch applicants
        const appRes = await axios.get(`/applicants?campaign_id=${selectedCampaignId}`);
        setApplicants(Array.isArray(appRes.data) ? appRes.data : []);
        setSelectedApplicantIds([]);

        // Fetch templates
        const tmplRes = await axios.get(`/campaigns/${selectedCampaignId}/email-templates`);
        setTemplates(Array.isArray(tmplRes.data) ? tmplRes.data : []);
      } catch (err) {
        toast.error('Error fetching campaign communications data.');
      } finally {
        setLoading(false);
      }
    };

    loadCampaignData();
  }, [selectedCampaignId]);

  // Load template contents when clicked
  const handleSelectTemplate = (tmpl) => {
    setSubject(tmpl.subject || '');
    setBody(tmpl.body_html || '');
    setSaveTargetEvent(tmpl.trigger_event || '');
    if (tmpl.trigger_event === 'applied') {
      setHasButton(true);
    } else {
      setHasButton(false);
    }
    toast.success(`Loaded template: ${tmpl.trigger_event}`);
  };

  // Helper placeholder insert
  const insertPlaceholder = (tag) => {
    setBody(prev => prev + tag);
  };

  // Search & Filter
  const filteredApplicants = applicants.filter(app => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      app.full_name?.toLowerCase().includes(query) ||
      app.prn?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query);

    const matchesStatus = !statusFilter || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedApplicantIds.length === filteredApplicants.length) {
      setSelectedApplicantIds([]);
    } else {
      setSelectedApplicantIds(filteredApplicants.map(app => app.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedApplicantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Selection formatting helper
  const insertFormatting = (tagOpen, tagClose) => {
    const textarea = document.getElementById('communicate-msg-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;
    const newVal = text.substring(0, start) + replacement + text.substring(end);
    setBody(newVal);

    // Reset focus and select inserted range
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 50);
  };

  // Save current subject/body template updates
  const handleSaveTemplate = async () => {
    if (!selectedCampaignId) return;
    if (!saveTargetEvent) {
      toast.error('Please select a target template type.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message body cannot be empty.');
      return;
    }

    setSavingTemplate(true);
    const loader = toast.loading('Saving template...');

    try {
      const payload = {
        templates: [
          {
            trigger_event: saveTargetEvent,
            subject: subject.trim(),
            body_html: body.trim()
          }
        ]
      };

      await axios.put(`/campaigns/${selectedCampaignId}/email-templates`, payload);
      toast.dismiss(loader);
      toast.success('Template saved successfully!');

      // Reload templates list
      const tmplRes = await axios.get(`/campaigns/${selectedCampaignId}/email-templates`);
      setTemplates(Array.isArray(tmplRes.data) ? tmplRes.data : []);
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to save email template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Bulk dispatch trigger
  const handleSendEmails = async () => {
    if (selectedApplicantIds.length === 0) {
      toast.error('Please select at least one recipient candidate.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message content are required.');
      return;
    }

    setSending(true);
    const loader = toast.loading(`Dispatching emails to ${selectedApplicantIds.length} candidate(s)…`);

    try {
      const payload = {
        applicant_ids: selectedApplicantIds,
        subject,
        body_html: body,
        button_text: hasButton ? buttonText : '',
        button_url: hasButton ? buttonUrl : ''
      };

      const res = await axios.post('/applicants/communicate', payload);
      toast.dismiss(loader);
      toast.success(`Emails sent successfully! Sent: ${res.data.success_count}, Failed: ${res.data.failed_count}`);
      setSelectedApplicantIds([]);
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to dispatch emails.');
    } finally {
      setSending(false);
    }
  };

  // Generate live iframe template markup preview
  const getPreviewMarkup = () => {
    // Basic dynamic placeholder replacement mockup for preview (using placeholder values)
    const previewReplace = {
      '{full_name}': 'Shivam Dombe',
      '{prn}': '2324000123',
      '{app_id}': 'TM-26-ABCD',
      '{domains}': 'Technical, Design & Editing',
      '{status}': 'Applied'
    };

    let pSubject = subject || '[No Subject Specified]';
    let pBody = body || 'Start typing your message content to see the live template preview here...';

    Object.keys(previewReplace).forEach(k => {
      pSubject = pSubject.replaceAll(k, previewReplace[k]);
      pBody = pBody.replaceAll(k, previewReplace[k]);
    });

    // Convert newlines to HTML line breaks to ensure preview aligns with output
    const formattedPreviewBody = pBody.replace(/\n/g, '<br />');

    const btnMarkup = hasButton ? `
    <div style='text-align: center; margin-top: 32px; margin-bottom: 8px;'>
        <a href='${buttonUrl || '#'}' target='_blank' style='display: inline-block; background-color: #f97316; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.15); transition: background-color 0.2s;'>
            ${buttonText}
        </a>
    </div>` : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <link href='https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Outfit:wght@400;750;900&display=swap' rel='stylesheet'>
</head>
<body style='margin: 0; padding: 10px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'>
    <table border='0' cellpadding='0' cellspacing='0' width='100%' style='background-color: #f8fafc;'>
        <tr>
            <td align='center'>
                <table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 550px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0;'>
                    <!-- Header -->
                    <tr>
                        <td style='background: #0d2399 url("https://res.cloudinary.com/dnmzkntqd/image/upload/v1784363984/MailHeader_uvqc31.png") no-repeat center center; background-size: cover; padding: 20px 24px; text-align: left;'>
                            <span style='color: #ffffff; font-family: "Cinzel", Georgia, serif; font-size: 20px; font-weight: 900; letter-spacing: 1.5px; display: block;'>Team Mavericks</span>
                        </td>
                    </tr>
                    <!-- Accent Divider -->
                    <tr><td height='3' style='background-color: #f97316;'></td></tr>
                    <!-- Body Content -->
                    <tr>
                        <td style='padding: 28px 24px; text-align: left; color: #334155; font-size: 12px; line-height: 1.6;'>
                            <div style='font-size: 12px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'>
                                ${formattedPreviewBody}
                            </div>
                            ${btnMarkup}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style='background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0;'>
                            <p style='margin: 0; font-family: "Outfit", sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;'>Stay Updated!! Stay Ahead!!</p>
                            <p style='margin: 4px 0 0 0;'>© 2026 Team Mavericks. KIT CoEK Kolhapur. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  };

  if (loading && campaigns.length === 0) return <MajorLoader fullPage />;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary-blue/10 text-primary-blue rounded-xl">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-800 dark:text-zinc-100">Portal Communicate</h1>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Send dynamic emails to selected candidates</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500">Recruitment drive:</span>
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold rounded-lg focus:outline-none"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Composer & Templates (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Templates list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Quick Campaign Templates</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-primary-blue hover:bg-primary-blue/5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  {tmpl.trigger_event}
                </button>
              ))}
              {templates.length === 0 && (
                <p className="text-[10px] text-zinc-400 font-semibold">No email templates created for this campaign.</p>
              )}
            </div>
          </div>

          {/* Mail Editor */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Draft Message
              </h3>

              {selectedCampaignId && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <select
                    value={saveTargetEvent}
                    onChange={e => setSaveTargetEvent(e.target.value)}
                    className="px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-[10px] font-bold text-zinc-650 dark:text-zinc-350 focus:outline-none"
                    title="Select trigger event target to save as template"
                  >
                    <option value="">Select target trigger...</option>
                    <option value="applied">Applied (Receipt)</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate || !saveTargetEvent || !subject.trim() || !body.trim()}
                    className="px-2.5 py-1 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-150 disabled:opacity-50 text-[10px] font-bold rounded cursor-pointer transition flex items-center gap-1 shadow-sm shrink-0"
                    title="Save current drafted content as selected email template"
                  >
                    {savingTemplate ? <RefreshCw size={10} className="animate-spin" /> : <Save size={10} />}
                    Save Template
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-400">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Interview scheduled for {full_name}"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-blue font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                <label className="text-[10px] uppercase font-bold text-zinc-400">Message (HTML Supported)</label>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-3">
                    <button
                      type="button"
                      onClick={() => insertFormatting('<strong>', '</strong>')}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-450 cursor-pointer"
                      title="Bold (Selection)"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<em>', '</em>')}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-450 cursor-pointer"
                      title="Italic (Selection)"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<u>', '</u>')}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-450 cursor-pointer"
                      title="Underline (Selection)"
                    >
                      <Underline size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<a href="https://example.com" target="_blank" style="color: #f97316; font-weight: bold; text-decoration: underline;">', '</a>')}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-450 cursor-pointer"
                      title="Link (Selection)"
                    >
                      <LinkIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<h3>', '</h3>')}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-450 cursor-pointer"
                      title="Heading (Selection)"
                    >
                      <Heading size={13} />
                    </button>
                  </div>

                  {/* Placeholder Chips */}
                  <div className="flex gap-1">
                    {['{full_name}', '{prn}', '{app_id}', '{domains}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertPlaceholder(tag)}
                        className="px-2 py-0.5 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[9px] font-mono rounded cursor-pointer transition text-zinc-550 dark:text-zinc-400"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea
                id="communicate-msg-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows="8"
                placeholder="Write your email body text here. Placeholders like {full_name} and {prn} will automatically render candidate-specific values."
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-blue resize-none font-medium leading-relaxed"
              />
            </div>

            {/* CTA action button toggle */}
            <div className="border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3 bg-zinc-50/40 dark:bg-zinc-950/20 space-y-3 shadow-inner">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasButton}
                  onChange={e => setHasButton(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-blue focus:ring-primary-blue"
                />
                <span className="text-xs font-bold text-zinc-650 dark:text-zinc-350">Include Button (CTA)</span>
              </label>

              {hasButton && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Button Label</label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={e => setButtonText(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-900 text-xs rounded-md focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Redirect Link (URL)</label>
                    <input
                      type="text"
                      value={buttonUrl}
                      onChange={e => setButtonUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-900 text-xs rounded-md focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* live HTML Email preview */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <FileText size={13} className="text-primary-blue" />
              <span>Real-time Envelope Preview</span>
            </h3>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-2 shadow-inner">
              <iframe
                title="Email Template Live Preview"
                srcDoc={getPreviewMarkup()}
                className="w-full h-96 border-none bg-white rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Candidates Table Checklist (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col h-[760px]">
          <div className="space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                Select Candidates
              </h3>
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-550 dark:text-zinc-400 font-bold font-mono">
                {selectedApplicantIds.length} Selected
              </span>
            </div>

            {/* Searching Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-zinc-400" size={13} />
                <input
                  type="text"
                  placeholder="Search name, PRN or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs rounded-lg focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="applied">Applied</option>
                  <option value="under_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="selected">Selected</option>
                  <option value="rejected">Rejected</option>
                </select>

                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer text-zinc-700 dark:text-zinc-300"
                >
                  {selectedApplicantIds.length === filteredApplicants.length && filteredApplicants.length > 0 ? (
                    <>Deselect All</>
                  ) : (
                    <>Select All</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Candidates scroll list */}
          <div className="flex-1 overflow-y-auto min-h-0 mt-4 border border-zinc-100 dark:border-zinc-800/80 rounded-xl divide-y divide-zinc-150 dark:divide-zinc-800">
            {filteredApplicants.map(app => {
              const isChecked = selectedApplicantIds.includes(app.id);
              return (
                <div
                  key={app.id}
                  onClick={() => handleToggleSelect(app.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition select-none
                    ${isChecked ? 'bg-primary-blue/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button type="button" className="text-primary-blue shrink-0">
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-zinc-400" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">{app.full_name}</p>
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-400 font-medium tracking-wide block truncate">
                        {app.prn} • {app.email}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0
                    ${app.status === 'selected' ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400' : ''}
                    ${app.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' : ''}
                    ${['applied', 'under_review'].includes(app.status) ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' : ''}
                    ${['shortlisted', 'interview'].includes(app.status) ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' : ''}
                  `}>
                    {app.status}
                  </span>
                </div>
              );
            })}

            {filteredApplicants.length === 0 && (
              <div className="p-8 text-center text-zinc-400 space-y-1.5">
                <AlertCircle className="mx-auto" size={20} />
                <p className="text-xs font-bold">No candidates found</p>
                <span className="text-[10px]">Try adjusting your search criteria</span>
              </div>
            )}
          </div>

          {/* dispatcher trigger */}
          <div className="pt-4 mt-auto border-t border-zinc-100 dark:border-zinc-850 shrink-0">
            <button
              onClick={handleSendEmails}
              disabled={sending || selectedApplicantIds.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary-blue/15 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Dispatching Emails...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Emails ({selectedApplicantIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicatePage;
