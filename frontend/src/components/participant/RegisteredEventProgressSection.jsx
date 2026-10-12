import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Sparkles,
  Key,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ScanLine,
  Users,
  Layers,
  BrainCircuit,
  Ticket,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import SpecularButton from '../ui/SpecularButton';

const getCategoryBadge = (type = '', isDark) => {
  const t = type.toLowerCase();
  if (t.includes('hack') || t.includes('code') || t.includes('tech')) {
    return isDark
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      : 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
  }
  if (t.includes('mind') || t.includes('quiz') || t.includes('aptitude')) {
    return isDark
      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
      : 'bg-purple-50 text-purple-800 border-purple-200 font-semibold';
  }
  if (t.includes('game') || t.includes('gaming') || t.includes('esport')) {
    return isDark
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  }
  return isDark
    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
    : 'bg-zinc-100 text-zinc-800 border-zinc-200 font-semibold';
};

const getMindSagaStatus = (status, isDark) => {
  switch (status) {
    case 'in_round_2':
      return {
        label: 'Qualified for Round 2',
        badge: isDark
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : 'bg-emerald-100 text-emerald-900 border-emerald-300',
        step: 3
      };
    case 'qualified':
      return {
        label: 'Grand Finalist',
        badge: isDark
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          : 'bg-amber-100 text-amber-900 border-amber-300',
        step: 4
      };
    case 'eliminated':
      return {
        label: 'Round 1 Completed',
        badge: isDark
          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
          : 'bg-zinc-100 text-zinc-700 border-zinc-300',
        step: 2
      };
    case 'in_round_1':
    default:
      return {
        label: 'Round 1 Active',
        badge: isDark
          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
          : 'bg-sky-100 text-sky-900 border-sky-300',
        step: 2
      };
  }
};

const RegisteredEventProgressSection = ({
  registrations = [],
  isDark = true,
  onOpenScanner,
  onOpenMindSagaModal,
  onSelectPass
}) => {
  const [expandedEvents, setExpandedEvents] = useState(() => {
    const initial = {};
    if (registrations.length > 0) {
      initial[registrations[0].id] = true;
    }
    return initial;
  });

  const [copiedKey, setCopiedKey] = useState(null);

  const toggleExpand = (eventId) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    toast.success('Access key copied to clipboard', { icon: '🔑' });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!registrations || registrations.length === 0) {
    return null;
  }

  // Calculate overall sub-event statistics
  const totalSubEvents = registrations.reduce((acc, r) => acc + (r.sub_events?.length || 0), 0);
  const attendedSubEvents = registrations.reduce(
    (acc, r) =>
      acc +
      (r.sub_events?.filter(
        (s) => Number(s.attendance) === 1 || s.attended === true || s.attended === 1 || s.attended === '1'
      )?.length || 0),
    0
  );
  const overallRate = totalSubEvents > 0 ? Math.round((attendedSubEvents / totalSubEvents) * 100) : 0;

  return (
    <section className="w-full space-y-6 pt-6 pb-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 block mb-1">
            Participation &amp; Schedule
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 font-display-heavy">
            Event Progression
          </h2>
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-400 mt-1 max-w-xl font-medium">
            Monitor verified desk attendance, round stages, and credentials for all registered sub-events.
          </p>
        </div>

        {/* Aggregate Stats Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 shadow-xs ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100'
                : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-sm'
            }`}
          >
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Verified Tracks
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-sm text-zinc-950 dark:text-zinc-50">
                  {attendedSubEvents} of {totalSubEvents} Present
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    overallRate === 100
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-900'
                      : isDark
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {overallRate}%
                </span>
              </div>
            </div>

            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 transition shadow-sm cursor-pointer"
                title="Scan Attendance QR Code"
              >
                <ScanLine size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Progression List */}
      <div className="space-y-5">
        {registrations.map((reg, regIndex) => {
          const isExpanded = !!expandedEvents[reg.id];
          const subList = reg.sub_events || [];
          const mainAttended =
            Number(reg.attendance) === 1 || reg.attended === true || reg.attended === 1 || reg.attended === '1';

          // Strictly calculate sub-event attendance
          const subAttendedCount = subList.filter(
            (s) => Number(s.attendance) === 1 || s.attended === true || s.attended === 1 || s.attended === '1'
          ).length;

          const regDate = reg.registered_at
            ? new Date(reg.registered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          return (
            <motion.div
              key={reg.id || regIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: regIndex * 0.05 }}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                isDark
                  ? 'bg-zinc-900/70 border-zinc-800/90 shadow-lg'
                  : 'bg-white border-zinc-200/90 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Event Header Banner */}
              <div
                onClick={() => toggleExpand(reg.id)}
                className={`p-5 sm:p-6 cursor-pointer select-none transition-colors ${
                  isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-zinc-50/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Event Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-950 flex items-center justify-center font-bold text-lg uppercase shadow-xs shrink-0">
                      {reg.event_name?.charAt(0) || 'E'}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                          Token: {reg.registration_token}
                        </span>

                        {mainAttended ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                            <span>Event Pass Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                            <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                            <span>Desk Check-in Pending</span>
                          </span>
                        )}

                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          {regDate}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 truncate">
                        {reg.event_name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-zinc-500 dark:text-zinc-400" />
                          {reg.location || "KIT's College of Engineering"}
                        </span>
                        {reg.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-zinc-500 dark:text-zinc-400" />
                            {new Date(reg.start_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {subList.length} Sub-Event{subList.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Sub-event verification counter & expand button */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-200 dark:border-zinc-800">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Tracks Verified
                      </p>
                      <p className="font-bold text-sm text-zinc-950 dark:text-zinc-50">
                        {subAttendedCount} of {subList.length} Checked In
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectPass) onSelectPass(reg);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                          isDark
                            ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                        }`}
                      >
                        <Ticket size={13} />
                        <span>Pass</span>
                      </button>

                      <div className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Completion Milestone Progress Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5 text-zinc-700 dark:text-zinc-300">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Progression Milestone
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {subList.length > 0
                        ? Math.round(((mainAttended ? 0.25 : 0) + (subAttendedCount / subList.length) * 0.75) * 100)
                        : mainAttended ? 100 : 25}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          subList.length > 0
                            ? Math.min(100, Math.round(((mainAttended ? 0.25 : 0) + (subAttendedCount / subList.length) * 0.75) * 100))
                            : mainAttended ? 100 : 25
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Events Breakdown Grid */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <Layers size={14} className="text-zinc-900 dark:text-zinc-100" />
                        <span>Registered Sub-Events ({subList.length})</span>
                      </h4>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                        Attendance is verified individually per sub-event
                      </span>
                    </div>

                    {subList.length === 0 ? (
                      <div className="p-6 rounded-2xl border text-center text-zinc-500 dark:text-zinc-400 text-xs border-zinc-200 dark:border-zinc-800">
                        No sub-events attached to this registration.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subList.map((sub, sIdx) => {
                          // Check attendance STRICTLY for this specific sub-event
                          const subAttended =
                            Number(sub.attendance) === 1 ||
                            sub.attended === true ||
                            sub.attended === 1 ||
                            sub.attended === '1';

                          const isMindSaga =
                            sub.is_mind_saga ||
                            (sub.sub_event_name && sub.sub_event_name.toLowerCase().includes('mind'));
                          const mindSagaStatus = getMindSagaStatus(sub.mind_saga_status, isDark);
                          const catBadgeClass = getCategoryBadge(sub.sub_event_type || sub.sub_event_name, isDark);

                          return (
                            <div
                              key={sub.id || sIdx}
                              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 ${
                                isDark
                                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                                  : 'bg-white border-zinc-200 shadow-xs hover:border-zinc-300'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Top Header Bar */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${catBadgeClass}`}
                                    >
                                      {sub.sub_event_type || 'Competition'}
                                    </span>
                                    {isMindSaga && (
                                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40 flex items-center gap-1">
                                        <Sparkles size={11} /> Mind Saga
                                      </span>
                                    )}
                                  </div>

                                  {/* Sub-Event Attendance Badge */}
                                  {subAttended ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
                                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      <span>Present</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
                                      <Clock size={12} className="text-zinc-500 dark:text-zinc-400" />
                                      <span>Check-in Pending</span>
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <div>
                                  <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                                    {sub.sub_event_name}
                                  </h4>
                                  {sub.team_name && (
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                                      <Users size={12} className="text-zinc-500" />
                                      <span>Team: <strong className="text-zinc-950 dark:text-zinc-100">{sub.team_name}</strong></span>
                                    </div>
                                  )}
                                </div>

                                {/* Milestone Stepper */}
                                <div className="space-y-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
                                  <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                      Status Stage
                                    </span>
                                    {isMindSaga ? (
                                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${mindSagaStatus.badge}`}>
                                        {mindSagaStatus.label}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                        {subAttended ? 'Verified Attendance' : 'Registered · Desk Verification Pending'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Apple Health style 4-step progress segments */}
                                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                                    {/* Step 1: Registered */}
                                    <div className="flex flex-col gap-1">
                                      <div className="h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                                      <span className="text-[9px] font-mono text-zinc-600 dark:text-zinc-400 text-center uppercase truncate font-bold">
                                        Registered
                                      </span>
                                    </div>

                                    {/* Step 2: Check-In */}
                                    <div className="flex flex-col gap-1">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${
                                          subAttended
                                            ? 'bg-zinc-900 dark:bg-zinc-100'
                                            : 'bg-zinc-200 dark:bg-zinc-800'
                                        }`}
                                      />
                                      <span
                                        className={`text-[9px] font-mono text-center uppercase truncate font-bold ${
                                          subAttended ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                                        }`}
                                      >
                                        Check-In
                                      </span>
                                    </div>

                                    {/* Step 3: Round 1 / Prelims */}
                                    <div className="flex flex-col gap-1">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${
                                          isMindSaga && mindSagaStatus.step >= 2
                                            ? 'bg-zinc-900 dark:bg-zinc-100'
                                            : subAttended
                                            ? 'bg-zinc-400 dark:bg-zinc-600'
                                            : 'bg-zinc-200 dark:bg-zinc-800'
                                        }`}
                                      />
                                      <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 text-center uppercase truncate font-bold">
                                        Prelims
                                      </span>
                                    </div>

                                    {/* Step 4: Finals */}
                                    <div className="flex flex-col gap-1">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${
                                          isMindSaga && mindSagaStatus.step >= 3
                                            ? 'bg-zinc-900 dark:bg-zinc-100'
                                            : 'bg-zinc-200 dark:bg-zinc-800'
                                        }`}
                                      />
                                      <span className="text-[9px] font-mono text-zinc-400 text-center uppercase truncate font-bold">
                                        Finals
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Mind Saga Access Key Chip */}
                                {isMindSaga && sub.mind_saga_key && (
                                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0">
                                        <Key size={14} />
                                      </div>
                                      <div className="truncate">
                                        <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
                                          Candidate Access Key
                                        </p>
                                        <p className="font-mono text-xs font-bold tracking-widest text-zinc-950 dark:text-zinc-50 truncate select-all">
                                          {sub.mind_saga_key}
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(sub.mind_saga_key, sub.id || sIdx)}
                                      className="p-1.5 px-2 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 transition cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0"
                                      title="Copy Key"
                                    >
                                      {copiedKey === (sub.id || sIdx) ? (
                                        <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Card Action Footer */}
                              <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
                                {isMindSaga ? (
                                  subAttended ? (
                                    <SpecularButton
                                      size="md"
                                      radius={14}
                                      textColor={isDark ? '#f5f5f5' : '#09090b'}
                                      lineColor={isDark ? '#ffffff' : '#09090b'}
                                      baseColor={isDark ? '#3f3f46' : '#d4d4d8'}
                                      tint={isDark ? '#000000' : '#ffffff'}
                                      tintOpacity={isDark ? 0.4 : 0.8}
                                      className="flex-1 w-full"
                                      onClick={() => {
                                        if (onOpenMindSagaModal) {
                                          onOpenMindSagaModal(reg.event_id, sub.sub_event_id, sub.sub_event_name, sub.mind_saga_key);
                                        }
                                      }}
                                    >
                                      <BrainCircuit size={14} />
                                      <span>Enter Mind Saga Arena</span>
                                      <ArrowUpRight size={13} />
                                    </SpecularButton>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
                                      <div className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                                        <Lock size={13} className="text-amber-500 shrink-0" />
                                        <span className="text-[11px] font-semibold leading-tight">
                                          Desk check-in required to enter arena
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={onOpenScanner}
                                        className="px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition shadow-xs"
                                      >
                                        <ScanLine size={11} />
                                        <span>Scan</span>
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={onOpenScanner}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      subAttended
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                                        : 'bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs'
                                    }`}
                                  >
                                    <ScanLine size={13} />
                                    <span>{subAttended ? 'Verified Attendance' : 'Scan Attendance QR'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSelectPass) onSelectPass(reg);
                                  }}
                                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  title="View Ticket Pass"
                                >
                                  <Ticket size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default RegisteredEventProgressSection;
