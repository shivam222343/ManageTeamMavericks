import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  Award,
  ExternalLink,
  Send,
  LayoutGrid,
  List,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import MajorLoader from '../../components/ui/MajorLoader';
import { useAuth } from '../../context/AuthContext';

const MavericksListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';
  const showRoleColumn = user?.role === 'coordinator' || user?.role === 'core_member';
  const canCommunicate = isCoordinator || (user?.permissions?.communicate === true && user?.role !== 'member');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [updatingId, setUpdatingId] = useState(null);

  // Delete modal state
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/members');
      if (Array.isArray(res.data)) {
        setMembers(res.data);
      }
    } catch (err) {
      toast.error('Failed to load members list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRoleChange = async (memberId, newRole) => {
    if (!isCoordinator) return;
    setUpdatingId(memberId);
    try {
      await axios.put(`/members/${memberId}/role`, { role: newRole });
      toast.success('Member role updated successfully!');
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      toast.error('Failed to update member role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete || !isCoordinator) return;
    setDeleting(true);
    try {
      await axios.delete(`/members/${memberToDelete.id}`);
      toast.success(`Member ${memberToDelete.name} deleted successfully.`);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete member.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      m.name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'all' || m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Mavericks</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 border border-primary-blue/20">
              {filteredMembers.length} Active Members
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-1">
            View all official team members, coordinators, and core committee.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-primary-blue shadow-xs' : 'text-zinc-500'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'grid' ? 'bg-white dark:bg-zinc-900 text-primary-blue shadow-xs' : 'text-zinc-500'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={fetchMembers}
            className="flex items-center gap-2 px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary-blue' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member by name or email..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/40 font-medium"
          />
        </div>

        {/* Role Tabs (Coordinators Only) */}
        {isCoordinator && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'coordinator', label: 'Coordinators' },
              { id: 'core_member', label: 'Core Members' },
              { id: 'member', label: 'Members' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  roleFilter === tab.id
                    ? 'bg-primary-blue text-white shadow-md shadow-primary-blue/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <MajorLoader />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <h3 className="font-bold text-lg">No Members Found</h3>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto">
            No member accounts matched your current filter criteria or search query.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* --- TABULAR LIST VIEW (Dark Theme Hover Fixed) --- */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                  <th className="py-3.5 px-4">Member Name & Email</th>
                  {showRoleColumn && <th className="py-3.5 px-4">Role</th>}
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-bold text-sm shadow-inner uppercase shrink-0">
                          {member.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4
                            onClick={() => navigate(`/dashboard/members/mavericks/${member.id}`)}
                            className="font-bold text-xs text-zinc-900 dark:text-zinc-50 group-hover:text-primary-blue transition cursor-pointer truncate"
                          >
                            {member.name}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                            <Mail size={11} className="shrink-0" />
                            <span>{member.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {showRoleColumn && (
                      <td className="py-3.5 px-4">
                        {isCoordinator ? (
                          <select
                            value={member.role}
                            disabled={updatingId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="px-2.5 py-1 text-[11px] font-extrabold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-primary-blue focus:outline-none focus:ring-2 focus:ring-primary-blue/30 cursor-pointer"
                          >
                            <option value="member">Member</option>
                            <option value="core_member">Core Member</option>
                            <option value="coordinator">Coordinator</option>
                          </select>
                        ) : (
                          getRoleBadge(member.role)
                        )}
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {member.invitation_status || 'Active'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canCommunicate && (
                          <button
                            onClick={() => navigate(`/dashboard/members/communicate?email=${encodeURIComponent(member.email)}`)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-primary-blue hover:bg-primary-blue/10 transition cursor-pointer"
                            title="Send Email"
                          >
                            <Send size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/dashboard/members/mavericks/${member.id}`)}
                          className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-primary-blue hover:text-white dark:hover:bg-primary-blue text-zinc-700 dark:text-zinc-300 font-bold transition flex items-center gap-1 cursor-pointer text-xs"
                        >
                          <span>Show Profile</span>
                          <ExternalLink size={12} />
                        </button>

                        {isCoordinator && member.id !== user?.id && (
                          <button
                            onClick={() => setMemberToDelete(member)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="Delete Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- GRID VIEW --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-primary-blue/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-extrabold text-base shadow-inner uppercase shrink-0">
                    {member.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3
                      onClick={() => navigate(`/dashboard/members/mavericks/${member.id}`)}
                      className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-50 group-hover:text-primary-blue transition cursor-pointer"
                    >
                      {member.name}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail size={12} className="shrink-0" />
                      <span>{member.email}</span>
                    </p>
                  </div>
                </div>

                {isCoordinator && member.id !== user?.id && (
                  <button
                    onClick={() => setMemberToDelete(member)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                    title="Delete Member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                {showRoleColumn ? (
                  isCoordinator ? (
                    <select
                      value={member.role}
                      disabled={updatingId === member.id}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="px-2 py-0.5 text-[10px] font-extrabold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-primary-blue focus:outline-none cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="core_member">Core Member</option>
                      <option value="coordinator">Coordinator</option>
                    </select>
                  ) : (
                    getRoleBadge(member.role)
                  )
                ) : <div />}

                <button
                  onClick={() => navigate(`/dashboard/members/mavericks/${member.id}`)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-primary-blue hover:text-white dark:hover:bg-primary-blue text-zinc-700 dark:text-zinc-300 font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <span>Show Profile</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Member Deletion */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToDelete(null)}
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
                      Confirm Delete Member
                    </h3>
                    <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                  </div>
                </div>
                <button
                  onClick={() => setMemberToDelete(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete member{' '}
                <strong className="text-zinc-950 dark:text-zinc-50">{memberToDelete.name}</strong> ({memberToDelete.email})? All associated portal credentials and records will be deleted.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
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
    </div>
  );
};

export default MavericksListPage;
