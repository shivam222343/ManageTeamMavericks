import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Shield, Mail, ToggleLeft, ToggleRight, Save, RefreshCw, Users, Search, CheckSquare, Square, Lock, Key, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const PortalSettings = () => {
  const { user } = useAuth();
  const isCoordinator = user?.role === "coordinator";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otpRequired, setOtpRequired] = useState(true);
  const [prnOtpRequired, setPrnOtpRequired] = useState(true);

  // Member permissions state
  const [membersPermissions, setMembersPermissions] = useState([]);
  const [permsLoading, setPermsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchSettings = async () => {
    if (!isCoordinator) {
      setLoading(false);
      setPermsLoading(false);
      return;
    }

    try {
      const [settingsRes, permsRes] = await Promise.all([
        axios.get("/settings"),
        axios.get("/members/permissions")
      ]);

      setOtpRequired(settingsRes.data.otp_required === "true" || settingsRes.data.otp_required === true);
      setPrnOtpRequired(settingsRes.data.prn_otp_required === "true" || settingsRes.data.prn_otp_required === true || settingsRes.data.prn_otp_required === undefined);

      if (Array.isArray(permsRes.data)) {
        setMembersPermissions(permsRes.data);
      }
    } catch (err) {
      toast.error("Failed to load portal settings");
    } finally {
      setLoading(false);
      setPermsLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, [isCoordinator]);

  const handleSave = async () => {
    if (!isCoordinator) return;
    setSaving(true);
    try {
      await axios.put("/settings", {
        otp_required: otpRequired ? "true" : "false",
        prn_otp_required: prnOtpRequired ? "true" : "false"
      });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = async (memberId, permKey) => {
    if (!isCoordinator) return;
    const targetMember = membersPermissions.find(m => m.id === memberId);
    if (!targetMember) return;

    const currentPerms = targetMember.permissions || {
      campaigns: true,
      forms: true,
      applicants: true,
      communicate: targetMember.role === 'coordinator',
      analytics: true
    };

    const updatedPerms = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    // Optimistic UI update
    setMembersPermissions(prev =>
      prev.map(m => m.id === memberId ? { ...m, permissions: updatedPerms } : m)
    );

    try {
      await axios.put(`/members/${memberId}/permissions`, { permissions: updatedPerms });
      toast.success(`Permission updated for ${targetMember.name.split(' ')[0]}`);
    } catch (err) {
      toast.error("Failed to update member permission");
      fetchSettings();
    }
  };

  const filteredMembers = membersPermissions.filter(m => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query);
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary-blue" size={28} />
      </div>
    );
  }

  // Non-coordinator view
  if (!isCoordinator) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center mx-auto shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
          Portal Settings Reserved for Coordinators
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
          Portal settings and feature access permissions are managed exclusively by Coordinators. If you need configuration changes, please contact a Coordinator.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-1 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-blue/10 border border-primary-blue/20 flex items-center justify-center">
            <Shield size={20} className="text-primary-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Portal Settings & Access Control</h1>
            <p className="text-xs text-zinc-500">Configure global recruitment settings and member feature access permissions.</p>
          </div>
        </div>
      </div>

      {/* Global OTP Settings Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-5 p-6">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <Mail size={16} className="text-primary-blue" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Email & OTP Verification Settings</span>
        </div>

        {/* Public Form OTP Option */}
        <div className="flex items-center justify-between gap-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Public Recruitment Form OTP Verification</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              When enabled, applicants filling out the main recruitment form must verify their email address with a one-time password (OTP) before submitting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOtpRequired(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              otpRequired
                ? "bg-primary-blue/10 border-primary-blue/30 text-primary-blue"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            {otpRequired
              ? <><ToggleRight size={20} className="text-primary-blue" /> Enabled</>
              : <><ToggleLeft size={20} /> Disabled</>
            }
          </button>
        </div>

        {/* PRN Portal OTP Option */}
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">PRN / Email Portal OTP Verification</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              When enabled, registered candidates using the PRN or Email verification portal must complete OTP verification before submitting extra form details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrnOtpRequired(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              prnOtpRequired
                ? "bg-primary-blue/10 border-primary-blue/30 text-primary-blue"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            {prnOtpRequired
              ? <><ToggleRight size={20} className="text-primary-blue" /> Enabled</>
              : <><ToggleLeft size={20} /> Disabled</>
            }
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-blue/20 transition cursor-pointer"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Member Permissions Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Key size={18} className="text-primary-blue" />
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Member Feature Permissions</h2>
              <p className="text-xs text-zinc-500">Enable or disable feature access per member using tickmarks.</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 w-fit">
            Coordinator Access Only
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member by name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'coordinator', label: 'Coordinators' },
              { id: 'core_member', label: 'Core' },
              { id: 'member', label: 'Members' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                  roleFilter === tab.id
                    ? 'bg-primary-blue text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Table (Fixed Dark Theme Hover) */}
        {permsLoading ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="animate-spin text-primary-blue" size={20} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs italic">
            No member accounts matched search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                  <th className="pb-3 px-3">Member</th>
                  <th className="pb-3 px-3 text-center">Campaigns</th>
                  <th className="pb-3 px-3 text-center">Forms</th>
                  <th className="pb-3 px-3 text-center">Applicants</th>
                  <th className="pb-3 px-3 text-center">Communicate</th>
                  <th className="pb-3 px-3 text-center">Analytics</th>
                  <th className="pb-3 px-3 text-center">Panels</th>
                  <th className="pb-3 px-3 text-center" title="Allow member to view ALL panels, not just assigned ones">Panels: View All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredMembers.map((m) => {
                  const perms = m.permissions || {
                    campaigns: true,
                    forms: true,
                    applicants: true,
                    communicate: m.role === 'coordinator',
                    analytics: true,
                    panels: true,
                    panels_view_all: m.role === 'coordinator'
                  };

                  return (
                    <tr key={m.id} className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{m.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{m.email}</p>
                        </div>
                      </td>

                      {['campaigns', 'forms', 'applicants', 'communicate', 'analytics', 'panels', 'panels_view_all'].map((key) => {
                        const isEnabled = perms[key] !== false && (key !== 'panels_view_all' ? true : !!perms[key]);
                        return (
                          <td key={key} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(m.id, key)}
                              className={`p-1.5 rounded-lg transition cursor-pointer inline-flex items-center justify-center ${
                                isEnabled
                                  ? 'text-primary-blue bg-primary-blue/10 dark:bg-primary-blue/20 hover:bg-primary-blue/20'
                                  : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                              title={`Toggle ${key} permission`}
                            >
                              {isEnabled ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                        );
                      })}
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

export default PortalSettings;
