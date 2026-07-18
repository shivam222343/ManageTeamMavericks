import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Shield, Mail, ToggleLeft, ToggleRight, Save, RefreshCw } from "lucide-react";

const PortalSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otpRequired, setOtpRequired] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/settings");
      setOtpRequired(res.data.otp_required === "true" || res.data.otp_required === true);
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/settings", { otp_required: otpRequired ? "true" : "false" });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary-blue" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-blue/10 border border-primary-blue/20 flex items-center justify-center">
            <Shield size={20} className="text-primary-blue" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Portal Settings</h1>
            <p className="text-xs text-zinc-500">Configure global behaviour of the recruitment portal.</p>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">

        {/* Section Header */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-zinc-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Email & Verification</span>
          </div>
        </div>

        {/* OTP Toggle Row */}
        <div className="px-6 py-5 flex items-center justify-between gap-6">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Email OTP Verification</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              When enabled, applicants must verify their email address with a one-time password (OTP) before they can access and fill the application form.
              <br />
              <span className="text-primary-blue font-semibold">Recommended: ON</span> — helps prevent fake/duplicate applications.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOtpRequired(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
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
      </div>

      {/* Status Preview */}
      <div className={`rounded-xl px-5 py-4 border text-xs font-semibold flex items-start gap-3 ${
        otpRequired
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40 text-blue-700 dark:text-blue-400"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400"
      }`}>
        <Shield size={16} className="shrink-0 mt-0.5" />
        <div>
          {otpRequired ? (
            <>
              <span className="font-bold block">OTP is ON</span>
              Applicants will be asked to verify their email before accessing the apply form.
            </>
          ) : (
            <>
              <span className="font-bold block">OTP is OFF</span>
              Applicants can directly fill and submit the form without email verification.
            </>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-blue hover:bg-primary-blue-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-blue/20 transition"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default PortalSettings;
