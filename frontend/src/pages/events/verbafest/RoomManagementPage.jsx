import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import {
  DoorOpen,
  Plus,
  Search,
  Users,
  Calendar,
  Edit,
  RefreshCw,
  LayoutGrid,
  List,
  AlertCircle,
  Building,
  CheckCircle2,
  MapPin,
  Layers
} from 'lucide-react';
import {
  VerbafestHeader,
  StatCard,
  RoomTypeBadge,
  EmptyState,
  VerbafestLoader,
  AddEditRoomModal,
  OccupancyModal,
  RoomScheduleModal
} from './components';

const ROOM_TYPE_OPTIONS = [
  { value: 'all', label: 'All Room Types' },
  { value: 'gd_panel', label: 'GD Panels' },
  { value: 'debate_panel', label: 'Debate Panels' },
  { value: 'mindsaga_lab', label: 'Mind Saga Labs' },
  { value: 'waiting_room', label: 'Waiting Rooms' },
  { value: 'control_room', label: 'Control Rooms' },
];

/**
 * RoomManagementPage
 * VERBAFEST 2026 Phase 3B-1: Room Management Screen.
 * Manages venue rooms, capacities, live occupancy, and slot schedules.
 */
const RoomManagementPage = () => {
  const { user } = useAuth();

  // Role authorization
  const canManage = user?.role === 'coordinator' ||
    user?.role === 'core_member' ||
    Boolean(user?.permissions?.verbafest) ||
    Boolean(user?.permissions?.events_coordinator);

  // Data states
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & display
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'full'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [isOccupancyOpen, setIsOccupancyOpen] = useState(false);
  const [occupancyRoom, setOccupancyRoom] = useState(null);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleRoom, setScheduleRoom] = useState(null);

  // Fetch rooms from Phase 2 API
  const fetchRooms = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await axios.get('/events/verbafest/rooms');
      const data = res.data?.data || [];
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch VERBAFEST rooms:', err);
      toast.error('Failed to load rooms list. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    const totalRooms = rooms.length;
    let totalCapacity = 0;
    let currentOccupancy = 0;
    let fullRoomsCount = 0;

    rooms.forEach((r) => {
      const cap = Number(r.capacity) || 0;
      const occ = Number(r.current_occupancy) || 0;
      totalCapacity += cap;
      currentOccupancy += occ;
      if (occ >= cap && cap > 0) {
        fullRoomsCount += 1;
      }
    });

    const availableCapacity = Math.max(0, totalCapacity - currentOccupancy);

    return {
      totalRooms,
      totalCapacity,
      availableCapacity,
      currentOccupancy,
      fullRoomsCount,
    };
  }, [rooms]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Search by code, name, location
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (r.room_code || '').toLowerCase().includes(q);
        const nameMatch = (r.name || '').toLowerCase().includes(q);
        const locMatch = (r.location_details || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !locMatch) return false;
      }

      // Room type filter
      if (selectedType !== 'all' && r.room_type !== selectedType) {
        return false;
      }

      // Availability filter
      const cap = Number(r.capacity) || 0;
      const occ = Number(r.current_occupancy) || 0;
      if (availabilityFilter === 'available' && occ >= cap) return false;
      if (availabilityFilter === 'full' && occ < cap) return false;

      return true;
    });
  }, [rooms, searchQuery, selectedType, availabilityFilter]);

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingRoom(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setIsAddEditOpen(true);
  };

  const handleOpenOccupancy = (room) => {
    setOccupancyRoom(room);
    setIsOccupancyOpen(true);
  };

  const handleOpenSchedule = (room) => {
    setScheduleRoom(room);
    setIsScheduleOpen(true);
  };

  // Callback on successful room create/update
  const handleRoomSuccess = (savedRoom) => {
    // If updated existing, replace in array; else prepend
    setRooms((prev) => {
      const index = prev.findIndex((r) => r.id === savedRoom.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...savedRoom };
        return updated;
      }
      return [savedRoom, ...prev];
    });
    fetchRooms(true); // Silent refresh to re-sync server-calculated attributes
  };

  // Helper for occupancy progress and status
  const getOccupancyInfo = (occupancy, capacity) => {
    const occ = Number(occupancy) || 0;
    const cap = Number(capacity) || 1;
    const percent = Math.min(100, Math.round((occ / cap) * 100));

    if (percent >= 100) {
      return {
        percent,
        colorClass: 'bg-rose-500',
        textClass: 'text-rose-600 dark:text-rose-400',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        label: 'Full',
      };
    }
    if (percent >= 70) {
      return {
        percent,
        colorClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        label: 'Warning',
      };
    }
    return {
      percent,
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      label: 'Normal',
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <VerbafestHeader
        title="Rooms"
        description="Manage VERBAFEST venues, capacities, live occupancy, and panel venues."
        eventStatus="VERBAFEST 2026"
      >
        <button
          type="button"
          onClick={() => fetchRooms(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
          title="Refresh rooms list"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-primary-blue' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-blue hover:bg-primary-blue-dark text-white text-xs font-bold shadow-md shadow-primary-blue/20 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Room</span>
          </button>
        )}
      </VerbafestHeader>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          icon={Building}
          title="Total Rooms"
          value={summaryMetrics.totalRooms}
          subtitle="All active venues"
          loading={loading}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          title="Available Capacity"
          value={summaryMetrics.availableCapacity}
          subtitle={`Out of ${summaryMetrics.totalCapacity} total seats`}
          loading={loading}
          color="emerald"
        />
        <StatCard
          icon={Users}
          title="Current Occupancy"
          value={summaryMetrics.currentOccupancy}
          subtitle="Active attendees on-site"
          loading={loading}
          color="amber"
        />
        <StatCard
          icon={AlertCircle}
          title="Full Rooms"
          value={summaryMetrics.fullRoomsCount}
          subtitle={summaryMetrics.fullRoomsCount === 0 ? 'No rooms at 100%' : 'At max capacity'}
          loading={loading}
          color={summaryMetrics.fullRoomsCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by code, room name, or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Room Type Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-blue/30 focus:border-primary-blue cursor-pointer"
            >
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Availability Tabs */}
          <div className="inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60">
            {[
              { id: 'all', label: 'All' },
              { id: 'available', label: 'Available' },
              { id: 'full', label: 'Full' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAvailabilityFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  availabilityFilter === tab.id
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View mode toggle (Grid vs Table) */}
          <div className="hidden sm:inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-primary-blue shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-primary-blue shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Room Content Display */}
      {loading ? (
        <VerbafestLoader type={viewMode === 'table' ? 'table' : 'cards'} count={6} />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={searchQuery || selectedType !== 'all' || availabilityFilter !== 'all' ? 'No matching rooms found' : 'No rooms created yet'}
          description={
            searchQuery || selectedType !== 'all' || availabilityFilter !== 'all'
              ? 'Try adjusting your search terms or clearing the selected filters.'
              : canManage
              ? 'Get started by creating the first VERBAFEST 2026 venue room.'
              : 'Rooms have not been created yet by event coordinators.'
          }
          action={
            (searchQuery || selectedType !== 'all' || availabilityFilter !== 'all') ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                  setAvailabilityFilter('all');
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Reset Filters
              </button>
            ) : canManage ? (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-blue text-white text-xs font-bold hover:bg-primary-blue-dark transition cursor-pointer shadow-md shadow-primary-blue/20"
              >
                <Plus size={15} />
                <span>Add First Room</span>
              </button>
            ) : null
          }
        />
      ) : viewMode === 'grid' ? (
        /* --- Grid Cards Layout --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const occInfo = getOccupancyInfo(room.current_occupancy, room.capacity);
            const availableSeats = Math.max(0, Number(room.capacity) - Number(room.current_occupancy));

            return (
              <div
                key={room.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                {/* Card Top: Code, Type Badge & Title */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/80">
                      {room.room_code}
                    </span>
                    <RoomTypeBadge type={room.room_type} size="sm" />
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 font-display mt-2 group-hover:text-primary-blue transition-colors">
                    {room.name}
                  </h3>

                  {room.location_details ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="shrink-0 text-zinc-400" />
                      <span className="truncate">{room.location_details}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 italic">
                      No location specified
                    </p>
                  )}

                  {room.assigned_panel_count > 0 && (
                    <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100/60 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">
                      <Layers size={11} className="text-zinc-500" />
                      <span>{room.assigned_panel_count} Panel{room.assigned_panel_count > 1 ? 's' : ''} assigned</span>
                    </div>
                  )}
                </div>

                {/* Card Middle: Occupancy Bar & Numbers */}
                <div className="my-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Occupancy:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${occInfo.badgeClass}`}>
                        {occInfo.label}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {room.current_occupancy} / {room.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${occInfo.colorClass}`}
                      style={{ width: `${occInfo.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{occInfo.percent}% Load</span>
                    <span className={availableSeats === 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                      {availableSeats} seats available
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Action buttons */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSchedule(room)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
                  >
                    <Calendar size={13} />
                    <span>Schedule</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenOccupancy(room)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 transition cursor-pointer"
                          title="Update live room occupancy"
                        >
                          <Users size={13} />
                          <span>Occupancy</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(room)}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer"
                          title="Edit room configuration"
                          aria-label={`Edit ${room.room_code}`}
                        >
                          <Edit size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- Table View Layout --- */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 dark:bg-zinc-950/70 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-mono font-black tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3.5 px-4">Room Code</th>
                  <th className="py-3.5 px-4">Name & Location</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Live Occupancy</th>
                  <th className="py-3.5 px-4">Load Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                {filteredRooms.map((room) => {
                  const occInfo = getOccupancyInfo(room.current_occupancy, room.capacity);
                  const availableSeats = Math.max(0, Number(room.capacity) - Number(room.current_occupancy));

                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Room Code */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80">
                          {room.room_code}
                        </span>
                      </td>

                      {/* Name & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-50">
                          {room.name}
                        </div>
                        {room.location_details && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate max-w-[200px]">{room.location_details}</span>
                          </div>
                        )}
                      </td>

                      {/* Room Type */}
                      <td className="py-3.5 px-4">
                        <RoomTypeBadge type={room.room_type} size="sm" />
                      </td>

                      {/* Capacity */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {room.capacity}
                      </td>

                      {/* Live Occupancy & Progress */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span>{room.current_occupancy} / {room.capacity}</span>
                          <span className={availableSeats === 0 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                            {availableSeats} left
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${occInfo.colorClass}`}
                            style={{ width: `${occInfo.percent}%` }}
                          />
                        </div>
                      </td>

                      {/* Load Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${occInfo.badgeClass}`}>
                          {occInfo.label} ({occInfo.percent}%)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenSchedule(room)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                            title="View Room Schedule"
                          >
                            <Calendar size={14} />
                          </button>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenOccupancy(room)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition cursor-pointer"
                                title="Update Occupancy"
                              >
                                <Users size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(room)}
                                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                                title="Edit Room"
                              >
                                <Edit size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modals */}
      <AddEditRoomModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        room={editingRoom}
        onSuccess={handleRoomSuccess}
      />

      <OccupancyModal
        isOpen={isOccupancyOpen}
        onClose={() => setIsOccupancyOpen(false)}
        room={occupancyRoom}
        onSuccess={handleRoomSuccess}
      />

      <RoomScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        room={scheduleRoom}
      />
    </div>
  );
};

export default RoomManagementPage;
