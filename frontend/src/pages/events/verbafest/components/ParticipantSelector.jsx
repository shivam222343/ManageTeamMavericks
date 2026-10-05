import React, { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import AttendanceBadge from './AttendanceBadge';

/**
 * ParticipantSelector
 * Searchable, eligibility-aware participant selector for group allocations.
 * Automatically flags already-allocated participants and registration eligibility.
 *
 * @param {Object} props
 * @param {'gd'|'debate'} props.eventType
 * @param {Array} props.participants - All participants list
 * @param {Array} props.existingAllocations - All current allocation records
 * @param {Array<number>} props.selectedIds - Array of selected participant IDs
 * @param {Function} props.onChange - Callback with updated selected IDs
 * @param {boolean} [props.disabled]
 * @param {number} [props.maxAllowed] - Remaining slots before capacity limit
 */
const ParticipantSelector = ({
  eventType = 'gd',
  participants = [],
  existingAllocations = [],
  selectedIds = [],
  onChange,
  disabled = false,
  maxAllowed = 100,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('eligible'); // 'eligible' | 'all'

  // Map of participantId -> existing allocation for this event_type
  const allocatedMap = useMemo(() => {
    const map = new Map();
    existingAllocations.forEach((alloc) => {
      if (alloc.event_type === eventType) {
        map.set(Number(alloc.participant_id), alloc);
      }
    });
    return map;
  }, [existingAllocations, eventType]);

  // Evaluated participants with eligibility status
  const evaluatedParticipants = useMemo(() => {
    return participants.map((p) => {
      const pId = Number(p.id);
      const isRegistered = eventType === 'gd' ? Boolean(p.reg_gd) : Boolean(p.reg_debate);
      const existingAlloc = allocatedMap.get(pId);
      const isAlreadyAllocated = Boolean(existingAlloc);
      const isEligible = isRegistered && !isAlreadyAllocated;

      return {
        ...p,
        isRegistered,
        isAlreadyAllocated,
        existingGroupCode: existingAlloc?.group_code,
        isEligible,
      };
    });
  }, [participants, eventType, allocatedMap]);

  // Filtered list based on search and tab
  const displayedList = useMemo(() => {
    return evaluatedParticipants.filter((p) => {
      if (filterMode === 'eligible' && !p.isEligible) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (p.participant_code || '').toLowerCase().includes(q);
        const nameMatch = (p.full_name || '').toLowerCase().includes(q);
        const collegeMatch = (p.college || '').toLowerCase().includes(q);
        const prnMatch = (p.prn || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !collegeMatch && !prnMatch) return false;
      }

      return true;
    });
  }, [evaluatedParticipants, filterMode, searchQuery]);

  const eligibleCount = useMemo(() => {
    return evaluatedParticipants.filter((p) => p.isEligible).length;
  }, [evaluatedParticipants]);

  // Toggle selection
  const handleToggle = (participantId) => {
    if (disabled) return;
    const isSelected = selectedIds.includes(participantId);

    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== participantId));
    } else {
      if (selectedIds.length >= maxAllowed) {
        return; // Don't exceed capacity
      }
      onChange([...selectedIds, participantId]);
    }
  };

  // Select all eligible visible
  const handleSelectAllVisible = () => {
    if (disabled) return;
    const eligibleVisible = displayedList.filter((p) => p.isEligible).map((p) => Number(p.id));
    const combined = Array.from(new Set([...selectedIds, ...eligibleVisible])).slice(0, maxAllowed);
    onChange(combined);
  };

  const handleClearSelection = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Header bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${eventType.toUpperCase()} participants by name, code, college…`}
            disabled={disabled}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
          />
        </div>

        {/* Tab pills */}
        <div className="inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('eligible')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterMode === 'eligible'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Eligible ({eligibleCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            All Registrants ({participants.length})
          </button>
        </div>
      </div>

      {/* Selection toolbar summary */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            Selected: {selectedIds.length}
          </span>
          {maxAllowed < 100 && (
            <span className="text-zinc-400 text-[11px]">
              (max {maxAllowed} available seats)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px] font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleSelectAllVisible}
            disabled={disabled || displayedList.filter((p) => p.isEligible).length === 0}
            className="text-primary-blue hover:underline text-[11px] font-bold cursor-pointer disabled:opacity-50"
          >
            Select All Eligible
          </button>
        </div>
      </div>

      {/* Participant List Scroll Box */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-inner">
        {displayedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            {filterMode === 'eligible'
              ? `No unallocated participants found eligible for ${eventType.toUpperCase()}.`
              : 'No participants match the search query.'}
          </div>
        ) : (
          displayedList.map((p) => {
            const pId = Number(p.id);
            const isSelected = selectedIds.includes(pId);
            const canSelect = p.isEligible && (isSelected || selectedIds.length < maxAllowed);

            return (
              <div
                key={p.id}
                onClick={() => canSelect && handleToggle(pId)}
                className={`p-3 transition flex items-center justify-between gap-3 text-xs ${
                  canSelect ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900' : 'opacity-60 bg-zinc-50/50 dark:bg-zinc-900/30 cursor-not-allowed'
                } ${isSelected ? 'bg-primary-blue/5 dark:bg-primary-blue/10' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Checkbox box */}
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? 'bg-primary-blue border-primary-blue text-white'
                        : canSelect
                        ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </div>

                  {/* Participant Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {p.participant_code}
                      </span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {p.full_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {p.college || '—'} {p.prn ? `• PRN: ${p.prn}` : ''}
                    </div>
                  </div>
                </div>

                {/* Right Badges / Eligibility status */}
                <div className="flex items-center gap-2 shrink-0">
                  {p.isAlreadyAllocated ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      In {p.existingGroupCode}
                    </span>
                  ) : !p.isRegistered ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      Not Registered
                    </span>
                  ) : (
                    <AttendanceBadge status={p.checkin_status || 'not_arrived'} size="sm" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ParticipantSelector;
