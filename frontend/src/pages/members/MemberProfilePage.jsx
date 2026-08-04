import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  Clock,
  Sparkles,
  UserCheck,
  Award,
  Send,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  KeyRound
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../../components/ui/ChangePasswordModal';

const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';
  const canCommunicate = isCoordinator || user?.permissions?.communicate === true;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  const fetchMember = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/members/${id}`);
      setMember(res.data);
    } catch (err) {
      toast.error('Failed to load member profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  const handleRoleChange = async (newRole) => {
    if (!isCoordinator) return;
    setUpdatingRole(true);
    try {
      await axios.put(`/members/${id}/role`, { role: newRole });
      toast.success('Member role updated successfully!');
      setMember((prev) => (prev ? { ...prev, role: newRole } : prev));
    } catch (err) {
      toast.error('Failed to update member role.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!isCoordinator || !member) return;
    setDeleting(true);
    try {
      await axios.delete(`/members/${member.id}`);
      toast.success(`Member ${member.name} deleted successfully.`);
      navigate('/dashboard/members/mavericks');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete member.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'coordinator':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 w-fit">
            <Shield size={12} />
            Coordinator
          </span>
        );
      case 'core_member':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 w-fit">
            <Award size={12} />
            Core Member
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 w-fit">
            <UserCheck size={12} />
            Member
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <MajorLoader />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
        <h2 className="text-xl font-bold">Member Not Found</h2>
        <button
          onClick={() => navigate('/dashboard/members/mavericks')}
          className="px-4 py-2 rounded-xl bg-primary-blue text-white font-bold text-xs"
        >
          Return to Mavericks List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-2 sm:p-4">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          onClick={() => navigate('/dashboard/members/mavericks')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Back to Mavericks List</span>
        </button>

        <span className="text-xs font-mono font-bold text-zinc-400">
          Member ID: #MAV-{member.id}
        </span>
      </div>

      {/* Hero Banner Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-black text-3xl shadow-inner uppercase shrink-0">
              {member.name?.charAt(0)}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                <Mail size={14} className="text-primary-blue" />
                <span>{member.email}</span>
              </p>
              {(isCoordinator || String(member.id) === String(user?.id)) && (
                <div className="pt-1">{getRoleBadge(member.role)}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {String(member.id) === String(user?.id) && (
              <button
                onClick={() => setShowChangePassModal(true)}
                className="px-5 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound size={14} className="text-primary-blue" />
                <span>Change Password</span>
              </button>
            )}

            {canCommunicate && (
              <button
                onClick={() =>
                  navigate(`/dashboard/members/communicate?email=${encodeURIComponent(member.email)}`)
                }
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-primary-blue hover:bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-primary-blue/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                <span>Send Direct Email</span>
              </button>
            )}

            {isCoordinator && member.id !== user?.id && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 transition cursor-pointer"
                title="Delete Member Account"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Info Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Account Joined</span>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-primary-blue" />
              {new Date(member.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Invitation Status</span>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <Sparkles size={14} />
              {member.invitation_status ? member.invitation_status.toUpperCase() : 'ACTIVE MEMBER'}
            </p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-850">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Designated Role</span>
            {isCoordinator ? (
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={member.role}
                  disabled={updatingRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="px-2.5 py-1 text-xs font-extrabold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue/30 cursor-pointer"
                >
                  <option value="member">Member</option>
                  <option value="core_member">Core Member</option>
                  <option value="coordinator">Coordinator</option>
                </select>
                {updatingRole && <ShieldCheck size={14} className="animate-spin text-primary-blue" />}
              </div>
            ) : String(member.id) === String(user?.id) ? (
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 capitalize">
                {member.role.replace('_', ' ')}
              </p>
            ) : (
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                Team Member
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Coordinator-Only Section: Sent Communication History */}
      {isCoordinator && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-primary-blue" />
              <h2 className="text-base font-extrabold">Sent Communication Logs</h2>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Coordinator Access
            </span>
          </div>

          {member.email_logs && member.email_logs.length > 0 ? (
            <div className="space-y-3">
              {member.email_logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-850 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-850 pb-2">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      {log.subject}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(log.sent_at).toLocaleString()}
                      </span>
                      {log.status === 'sent' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-1">
                          <XCircle size={10} />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="prose dark:prose-invert text-xs max-w-none text-zinc-600 dark:text-zinc-400 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: log.body_html }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400 text-xs italic">
              No previous email communications found for this member.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Member Deletion */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="fixed inset-0 bg-black backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
                      Delete Member Account
                    </h3>
                    <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete member{' '}
                <strong className="text-zinc-950 dark:text-zinc-50">{member.name}</strong> ({member.email})?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMember}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-red-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{deleting ? 'Deleting...' : 'Delete Member'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChangePasswordModal
        isOpen={showChangePassModal}
        onClose={() => setShowChangePassModal(false)}
      />
    </div>
  );
};

export default MemberProfilePage;
