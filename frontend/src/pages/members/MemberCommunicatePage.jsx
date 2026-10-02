import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Mail,
  Search,
  Send,
  Sparkles,
  Save,
  Trash2,
  Check,
  Users,
  Eye,
  Edit3,
  CheckSquare,
  Square,
  FileText,
  Bold,
  Italic,
  Underline,
  Heading,
  RefreshCw,
  Lock
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';

const MemberCommunicatePage = () => {
  const { user } = useAuth();
  const canCommunicate = user?.role === 'coordinator' || user?.permissions?.communicate === true;
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get('email');

  const isCanSaveTemplates = user?.role === 'coordinator' || user?.role === 'core_member';

  const [members, setMembers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Composer fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Saved Template modal / fields
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, tmplRes] = await Promise.all([
        axios.get('/members'),
        axios.get('/members/templates')
      ]);

      if (Array.isArray(membersRes.data)) {
        setMembers(membersRes.data);
        if (prefilledEmail) {
          const matched = membersRes.data.find(m => m.email.toLowerCase() === prefilledEmail.toLowerCase());
          if (matched) {
            setSelectedEmails([matched.email]);
          }
        }
      }

      if (Array.isArray(tmplRes.data)) {
        setTemplates(tmplRes.data);
      }
    } catch (err) {
      toast.error('Failed to load member communication data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      m.name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const handleSelectAll = () => {
    if (selectedEmails.length === filteredMembers.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredMembers.map((m) => m.email));
    }
  };

  const handleToggleEmail = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectTemplate = (tmpl) => {
    setSubject(tmpl.subject || '');
    setBody(tmpl.body_html || '');
    toast.success(`Loaded template: "${tmpl.name}"`);
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;
    try {
      await axios.delete(`/members/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete template.');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body content cannot be empty.');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await axios.post('/members/templates', {
        name: templateName,
        subject,
        body_html: body
      });
      toast.success('Template saved successfully!');
      setShowSaveModal(false);
      setTemplateName('');
      // Refresh templates
      const tmplRes = await axios.get('/members/templates');
      if (Array.isArray(tmplRes.data)) {
        setTemplates(tmplRes.data);
      }
    } catch (err) {
      toast.error('Error saving email template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const insertPlaceholder = (tag) => {
    setBody((prev) => prev + ' ' + tag);
  };

  const insertFormatting = (openTag, closeTag) => {
    const textarea = document.getElementById('member-msg-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = openTag + selected + closeTag;
    const newVal = text.substring(0, start) + replacement + text.substring(end);
    setBody(newVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }, 50);
  };

  const handleSendEmails = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one recipient member.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject line is required.');
      return;
    }
    if (!body.trim()) {
      toast.error('Email message body is required.');
      return;
    }

    setSending(true);
    try {
      const res = await axios.post('/members/communicate', {
        recipient_emails: selectedEmails,
        subject,
        body_html: body
      });
      toast.success(res.data.message || 'Emails sent successfully!');
      // Reset after sending
      setSelectedEmails([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch emails.');
    } finally {
      setSending(false);
    }
  };

  if (!canCommunicate) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center py-24 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Communication Access Restricted</h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
          Email dispatch and member communication features are reserved for Coordinators or members with explicit communication permissions. Please contact your Coordinator to enable this feature in Settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <MajorLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Member Communication</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Broadcast emails, send custom messages, and manage reusable email templates.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary-blue' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Saved Custom Templates Section */}
      <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary-blue" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Saved Email Templates ({templates.length})
            </h3>
          </div>
          {isCanSaveTemplates && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 hover:bg-primary-blue hover:text-white dark:hover:bg-primary-blue transition text-xs font-bold cursor-pointer"
            >
              <Save size={14} />
              <span>Save Current as Template</span>
            </button>
          )}
        </div>

        {templates.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">No saved email templates yet. Create your first template below!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-primary-blue/50 rounded-xl transition cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary-blue">
                      {tmpl.name}
                    </span>
                    {isCanSaveTemplates && (
                      <button
                        onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                        className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{tmpl.subject}</p>
                </div>
                <span className="text-[10px] text-primary-blue font-bold tracking-wider uppercase">Load Template →</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Recipient Selector + Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recipient Selection (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary-blue" />
              <h3 className="font-bold text-sm">Select Recipients</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-blue text-white">
              {selectedEmails.length} Selected
            </span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'coordinator', label: 'Coordinators' },
                { id: 'core_member', label: 'Core' },
                { id: 'member', label: 'Members' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRoleFilter(t.id)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                    roleFilter === t.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSelectAll}
              className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {selectedEmails.length === filteredMembers.length ? (
                <>
                  <CheckSquare size={14} className="text-primary-blue" />
                  <span>Deselect All ({filteredMembers.length})</span>
                </>
              ) : (
                <>
                  <Square size={14} />
                  <span>Select All ({filteredMembers.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Members List Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredMembers.map((m) => {
              const isSelected = selectedEmails.includes(m.email);
              return (
                <div
                  key={m.id}
                  onClick={() => handleToggleEmail(m.email)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary-blue/10 dark:bg-primary-blue/20 border-primary-blue/40 text-primary-blue font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{m.email}</p>
                  </div>
                  {isSelected ? <CheckSquare size={16} className="shrink-0" /> : <Square size={16} className="text-zinc-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Composer (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col min-h-[650px]">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-primary-blue" />
              <h3 className="font-bold text-sm">Email Composer</h3>
            </div>
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Eye size={14} />
              <span>{isPreviewMode ? 'Edit Mode' : 'Preview Email'}</span>
            </button>
          </div>

          {isPreviewMode ? (
            /* Email Preview */
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 overflow-y-auto">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span className="text-[10px] uppercase font-extrabold text-zinc-400">Subject Preview</span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                  {subject || '(No subject provided)'}
                </h2>
              </div>
              <div
                className="prose dark:prose-invert text-xs max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: body || '<p class="text-zinc-400 italic">No email content written yet...</p>'
                }}
              />
            </div>
          ) : (
            /* Composer Form */
            <div className="flex-1 space-y-4 flex flex-col">
              {/* Subject Input */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-zinc-400 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Announcement: Upcoming Core Committee Meeting"
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-semibold"
                />
              </div>

              {/* Formatting & Placeholder Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded font-bold"
                    title="Bold"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded italic"
                    title="Italic"
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<u>', '</u>')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded underline"
                    title="Underline"
                  >
                    <Underline size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h3 style="color:#2563eb;">', '</h3>')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
                    title="Heading"
                  >
                    <Heading size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400">Placeholders:</span>
                  {['{name}', '{email}', '{role}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertPlaceholder(tag)}
                      className="px-2 py-0.5 bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 font-mono text-[10px] font-bold rounded hover:bg-primary-blue hover:text-white transition cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Textarea */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <textarea
                  id="member-msg-textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your HTML or plain message content here... Use placeholders like {name} to personalize each email."
                  className="flex-1 w-full p-4 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-mono leading-relaxed resize-none"
                />
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">
                  Sending to <strong className="text-primary-blue">{selectedEmails.length}</strong> recipient(s)
                </span>

                <button
                  onClick={handleSendEmails}
                  disabled={sending || selectedEmails.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} className={sending ? 'animate-bounce' : ''} />
                  <span>{sending ? 'Dispatching Mails...' : 'Send Mails Now'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowSaveModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold">Save Email Template</h3>
            <p className="text-xs text-zinc-500">
              Save current subject line and body text as a reusable template for team communication.
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Monthly All-Hands Announcement"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="px-4 py-2 rounded-xl bg-primary-blue hover:bg-blue-600 text-white font-bold text-xs"
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCommunicatePage;
