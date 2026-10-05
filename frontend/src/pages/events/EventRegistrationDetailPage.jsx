import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import MajorLoader from '../../components/ui/MajorLoader';
import {
  ArrowLeft, User, Mail, Phone, Calendar, CheckCircle, Clock,
  Coins, FileText, AlertCircle, ExternalLink,
} from 'lucide-react';

const STATUS_STYLE = {
  pending:    'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  confirmed:  'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  cancelled:  'bg-red-500/10 text-red-500 border border-red-500/20',
  waitlisted: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
};

const PAYMENT_STYLE = {
  not_required: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500',
  pending:      'bg-amber-500/10 text-amber-600',
  paid:         'bg-emerald-500/10 text-emerald-600',
  failed:       'bg-red-500/10 text-red-500',
  refunded:     'bg-purple-500/10 text-purple-500',
};

const EventRegistrationDetailPage = () => {
  const { id: eventId, regId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [reg, setReg] = useState(null);

  useEffect(() => {
    const fetchReg = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/event-registrations/${regId}`);
        setReg(res.data);
      } catch (err) {
        toast.error('Failed to load registration');
        navigate(`/dashboard/events/${eventId}/registrations`);
      } finally {
        setLoading(false);
      }
    };
    fetchReg();
  }, [regId]);

  if (loading) return <MajorLoader fullPage />;
  if (!reg) return null;

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/dashboard/events/${eventId}/registrations`)} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase font-mono">Registration Details</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">
              Event: <span className="font-bold text-zinc-700 dark:text-zinc-200">{reg.event_name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Registrant Info */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-5">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">Registrant Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[
            { label: 'Full Name',   value: reg.full_name,   icon: User },
            { label: 'Email',       value: reg.email,        icon: Mail },
            { label: 'Phone',       value: reg.phone || '—', icon: Phone },
            { label: 'Registered',  value: formatDate(reg.registered_at), icon: Calendar },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
              <item.icon size={14} className="text-zinc-400 dark:text-zinc-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">{item.label}</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-3 pt-2">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono mb-1.5">Registration Status</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border ${STATUS_STYLE[reg.status] || 'bg-zinc-100 text-zinc-500'}`}>
              {reg.status}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono mb-1.5">Payment Status</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border ${PAYMENT_STYLE[reg.payment_status] || 'bg-zinc-100 text-zinc-500'}`}>
              {reg.payment_status?.replace(/_/g, ' ')}
            </span>
          </div>
          {reg.payment_amount > 0 && (
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono mb-1.5">Amount</p>
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                ₹{parseFloat(reg.payment_amount).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {reg.transaction_id && (
          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 font-mono">Transaction ID</p>
            <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-1">{reg.transaction_id}</p>
          </div>
        )}
      </div>

      {/* Dynamic Form Answers */}
      {(reg.answers || []).length > 0 && (
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">Registration Form Responses</h2>
          <div className="space-y-3">
            {reg.answers.map((answer, i) => (
              <div key={i} className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono mb-1.5">{answer.label}</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {answer.answer_text || <span className="text-zinc-400 italic font-normal">No answer</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {(reg.files || []).length > 0 && (
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-md space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">Uploaded Files</h2>
          <div className="space-y-3">
            {reg.files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-zinc-400" />
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 font-mono">{file.label}</p>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{file.file_name}</p>
                  </div>
                </div>
                <a
                  href={file.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-8 px-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-extrabold uppercase tracking-widest hover:bg-blue-100 transition cursor-pointer"
                >
                  <ExternalLink size={11} /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {(reg.answers || []).length === 0 && (reg.files || []).length === 0 && (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200/80 dark:border-zinc-800/60 rounded-3xl">
          <FileText size={28} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-xs font-bold text-zinc-500">No form responses recorded for this registration.</p>
        </div>
      )}
    </div>
  );
};

export default EventRegistrationDetailPage;
