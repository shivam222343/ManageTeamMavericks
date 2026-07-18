import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';

const FAQManagement = () => {
  const { user } = useAuth();
  const isCanEdit = user?.role === 'coordinator' || user?.role === 'core_member';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faqs, setFaqs] = useState([]);

  // Fetch FAQs from DB
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/campaigns/1/faqs');
      if (Array.isArray(res.data)) {
        setFaqs(res.data);
      }
    } catch (err) {
      toast.error('Failed to load FAQs configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  // Mutators
  const addFaq = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }]);
  };

  const updateFaq = (idx, key, val) => {
    setFaqs(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  };

  const deleteFaq = (idx) => {
    setFaqs(prev => prev.filter((_, i) => i !== idx));
    toast('FAQ marked for removal — save to persist.', { icon: '🗑️' });
  };

  // Sync to database
  const handleSave = async () => {
    if (!isCanEdit) { toast.error('No permission to save changes'); return; }
    setSaving(true);
    const loader = toast.loading('Syncing FAQs to database…');
    try {
      await axios.put('/campaigns/1/faqs', { faqs });
      toast.dismiss(loader);
      toast.success('FAQs updated successfully! 🎉');
      fetchFaqs(); // Refresh IDs
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.error || 'Failed to save FAQs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MajorLoader fullPage />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header Info */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-primary-blue" size={20} />
            <h1 className="text-xl font-extrabold tracking-tight">FAQ Manager</h1>
          </div>
          {isCanEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Save size={13} />
              {saving ? 'Saving…' : 'Save FAQs'}
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Add, edit, or delete questions and answers displayed dynamically at the bottom of the public recruitment page.
        </p>
      </div>

      {/* FAQs List */}
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div 
            key={faq.id || idx} 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl p-5 shadow-sm relative group space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Question #{idx + 1}
              </span>
              {isCanEdit && (
                <button
                  onClick={() => deleteFaq(idx)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                  title="Remove FAQ"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <div className="space-y-3 font-semibold text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                  Question Text
                </label>
                <input
                  type="text"
                  value={faq.question || faq.q || ''}
                  disabled={!isCanEdit}
                  onChange={e => updateFaq(idx, 'question', e.target.value)}
                  placeholder="e.g., Can I apply for multiple domains?"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                  Answer Text
                </label>
                <textarea
                  value={faq.answer || faq.a || ''}
                  disabled={!isCanEdit}
                  rows="3"
                  onChange={e => updateFaq(idx, 'answer', e.target.value)}
                  placeholder="e.g., Yes! You can select multiple preferences in the domains section..."
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs focus:ring-1 focus:ring-primary-blue focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        {faqs.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <HelpCircle size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">No FAQs found.</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1">Click "Add Question" below to create one.</p>
          </div>
        )}
      </div>

      {/* Add FAQ Button */}
      {isCanEdit && (
        <button
          onClick={addFaq}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-400 dark:text-zinc-500 hover:border-primary-blue hover:text-primary-blue dark:hover:border-primary-blue dark:hover:text-primary-blue hover:bg-primary-blue/3 dark:hover:bg-primary-blue/10 transition cursor-pointer"
        >
          <Plus size={14} /> Add FAQ Question
        </button>
      )}

      {/* Floating Save Bar */}
      {isCanEdit && faqs.length > 0 && (
        <div className="sticky bottom-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3 shadow-xl shadow-zinc-950/10 dark:shadow-zinc-950/60 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {faqs.length} FAQs ready to publish
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-lg shadow-primary-blue/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? 'Saving changes…' : 'Save FAQs to Database'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
