import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Mail,
  Shield,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Send,
  Upload,
  Sparkles,
  Award,
  UserCheck
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';

const AddMembersPage = () => {
  const [emailsInput, setEmailsInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Masked passwords visibility state: { [id]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/members/invitations');
      if (Array.isArray(res.data)) {
        setInvitations(res.data);
      }
    } catch (err) {
      toast.error('Failed to load sent invitations list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleSendInvitations = async (e) => {
    e.preventDefault();
    if (!emailsInput.trim()) {
      toast.error('Please enter at least one email address.');
      return;
    }

    setInviting(true);
    try {
      const res = await axios.post('/members/invite', {
        emails: emailsInput,
        role: selectedRole
      });

      toast.success(res.data.message || `Sent ${res.data.count} invitation(s)!`);
      setEmailsInput('');
      fetchInvitations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invitations.');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (id) => {
    try {
      await axios.post(`/members/invitations/${id}/resend`);
      toast.success('Invitation email resent successfully!');
      fetchInvitations();
    } catch (err) {
      toast.error('Failed to resend invitation email.');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyCredentials = (id, email, password) => {
    const text = `Email: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'coordinator':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 w-fit">
            <Shield size={10} />
            Coordinator
          </span>
        );
      case 'core_member':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-fit">
            <Award size={10} />
            Core Member
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 w-fit">
            <UserCheck size={10} />
            Member
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Add & Invite Members</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Coordinator Portal
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-1">
            Invite new members by email address. Auto-generates secure login credentials and dispatches welcome emails.
          </p>
        </div>

        <button
          onClick={fetchInvitations}
          className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary-blue' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Invite Form Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <UserPlus size={20} className="text-primary-blue" />
          <h2 className="font-extrabold text-base">Bulk Invite & Credential Generator</h2>
        </div>

        <form onSubmit={handleSendInvitations} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold uppercase text-zinc-400 mb-2">
              Email Addresses (Paste one or multiple, separated by commas or newlines) *
            </label>
            <textarea
              rows={4}
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
              placeholder="e.g. member1@teammavericks.org, member2@teammavericks.org, john@gmail.com"
              className="w-full p-4 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30 font-mono leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-extrabold uppercase text-zinc-400 mb-2">
                Assign Initial Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
              >
                <option value="member">Member</option>
                <option value="core_member">Core Member</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>

            <div className="pt-2 sm:pt-6 flex justify-end">
              <button
                type="submit"
                disabled={inviting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={16} className={inviting ? 'animate-bounce' : ''} />
                <span>{inviting ? 'Generating & Dispatching...' : 'Dispatch Invitations'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Invitations Table Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary-blue" />
            <h3 className="font-extrabold text-base">Sent Invitations History ({invitations.length})</h3>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <MajorLoader />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs italic">
            No member invitation records found. Use the form above to send member invitations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                  <th className="pb-3 px-3">Recipient Email</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Auto-Generated Password</th>
                  <th className="pb-3 px-3">Sent Date</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                {invitations.map((inv) => {
                  const isVisible = visiblePasswords[inv.id];
                  const isCopied = copiedId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition">
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {inv.email}
                      </td>
                      <td className="py-3 px-3">
                        {getRoleBadge(inv.role)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 font-bold text-zinc-800 dark:text-zinc-200">
                            {isVisible ? inv.temp_password : '••••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(inv.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                            title={isVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => copyCredentials(inv.id, inv.email, inv.temp_password)}
                            className="p-1 text-zinc-400 hover:text-primary-blue transition cursor-pointer"
                            title="Copy Credentials"
                          >
                            {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                        {inv.created_at ? new Date(inv.created_at.includes('T') ? inv.created_at : inv.created_at.replace(' ', 'T')).toLocaleString(undefined, { hour12: true }) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {inv.status || 'Sent'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleResend(inv.id)}
                          className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-primary-blue hover:text-white dark:hover:bg-primary-blue text-zinc-700 dark:text-zinc-300 font-bold transition text-[11px] cursor-pointer"
                        >
                          Resend Email
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddMembersPage;
