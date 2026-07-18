import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  MoreHorizontal, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const ApplicantList = () => {
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // stores applicant object to delete
  const [deleting, setDeleting] = useState(false);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'
  const [domainFilter, setDomainFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  
  const [domains, setDomains] = useState([]);
  const [sortField, setSortField] = useState('applied_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Delete applicant
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const loader = toast.loading('Deleting applicant entry…');
    try {
      await axios.delete(`/applicants/${deleteTarget.id}`);
      toast.dismiss(loader);
      toast.success('Applicant record deleted successfully');
      setApplicants(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.dismiss(loader);
      toast.error('Failed to delete applicant record');
    } finally {
      setDeleting(false);
    }
  };

  // Fetch applicants
  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const url = `/applicants?campaign_id=1&search=${encodeURIComponent(search)}&status=${statusFilter === 'all' ? '' : statusFilter}&domain_id=${domainFilter}&sort_by=${sortField}&sort_order=${sortOrder}`;
      const res = await axios.get(url);
      if (Array.isArray(res.data)) {
        setApplicants(res.data);
      } else {
        setApplicants([]);
      }
    } catch (err) {
      toast.error('Failed to load applicant records');
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch campaign domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await axios.get('/campaigns/1/domains');
        if (Array.isArray(res.data)) {
          setDomains(res.data);
        } else {
          setDomains([]);
        }
      } catch (err) {
        console.error('Failed to load campaign domains');
        setDomains([]);
      }
    };
    fetchDomains();
  }, []);

  // Trigger search on filter changes
  useEffect(() => {
    fetchApplicants();
  }, [statusFilter, domainFilter, sortField, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplicants();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDomainFilter('');
    setDeptFilter('');
    setSortField('applied_at');
    setSortOrder('desc');
    toast.success('Filters cleared');
  };

  // Bulk actions or toggle updates (like the auto-extend toggle in the screenshot)
  const handleToggleActiveState = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'rejected' ? 'applied' : 'rejected';
    try {
      await axios.put(`/applicants/${id}/status`, { 
        status: nextStatus,
        notes: `Toggled candidate status from listing panel.`
      });
      toast.success(`Applicant updated to ${nextStatus.replace('_', ' ')}`);
      // Update local state instead of full re-fetch
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
    } catch (err) {
      toast.error('Failed to update candidate state');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      applied: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700',
      under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30',
      shortlisted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30',
      interview: 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30',
      selected: 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200/50 dark:border-green-900/30',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50 dark:border-red-900/30'
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Table Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Student Management</h1>
          <p className="text-zinc-500 text-sm">Review, screen, and select candidates applying to Team Mavericks.</p>
        </div>
        <div className="flex gap-2.5">
          <a
            href="http://localhost:8000/applicants/export"
            download
            className="flex items-center gap-2 px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* --- Filter Navigation Segment (Matches Screenshot segment controls) --- */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        {['all', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-200 border cursor-pointer
              ${statusFilter === st 
                ? 'bg-primary-blue text-white border-primary-blue shadow-sm shadow-primary-blue/15' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
              }
            `}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* --- Search and Filters Bar (Matches Screenshot) --- */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter by value (Name, PRN, Email, Phone)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-blue focus:border-primary-blue transition"
          />
        </div>

        <div className="flex gap-2">
          {/* Domain Dropdown */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
          >
            <option value="">All Domains</option>
            {Array.isArray(domains) && domains.map((dom) => (
              <option key={dom.id} value={dom.id}>{dom.name}</option>
            ))}
          </select>

          {/* Sort Field */}
          <button
            type="button"
            onClick={() => {
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              toast.success(`Sorting order changed to ${sortOrder === 'asc' ? 'descending' : 'ascending'}`);
            }}
            className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowUpDown size={12} />
            <span>Order</span>
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      </form>

      {/* --- Applicants Data Table --- */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={24} className="animate-spin text-primary-blue" />
            <span className="text-xs text-zinc-500 font-semibold">Updating candidate roster...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20">
                  <th className="py-3 px-6">Student Id</th>
                  <th className="py-3 px-6">Student Name</th>
                  <th className="py-3 px-6">Contact info</th>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6 text-center">Selected domains</th>
                  <th className="py-3 px-6 text-center">Account Status</th>
                  <th className="py-3 px-6 text-center">Auto-Reject</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {Array.isArray(applicants) && applicants.length > 0 ? (
                  applicants.map((app) => {
                    const isRejected = app.status === 'rejected';
                    
                    return (
                      <tr key={app.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 align-middle">
                        {/* Student ID */}
                        <td className="py-4 px-6 text-zinc-500 font-mono">
                          {app.registration_id || `TM-${String(app.id).padStart(4, '0')}`}
                        </td>
                        
                        {/* Name */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {app.full_name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-medium font-mono">{app.prn}</div>
                        </td>
                        
                        {/* Contact */}
                        <td className="py-4 px-6 text-zinc-500 font-medium">
                          <div>{app.email}</div>
                          <div>{app.phone}</div>
                        </td>
                        
                        {/* Department */}
                        <td className="py-4 px-6 uppercase text-zinc-500 font-bold">
                          {app.department || 'TBD'}
                        </td>
                        
                        {/* Selected Domains */}
                        <td className="py-4 px-6 text-center text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                          {app.domains || 'General'}
                        </td>
                        
                        {/* Account Status */}
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(app.status)}
                        </td>
                        
                        {/* Auto-Reject Switch (Matches Screenshot Auto-Extend Toggle) */}
                        <td className="py-4 px-6 text-center">
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isRejected}
                              onChange={() => handleToggleActiveState(app.id, app.status)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-accent-red"></div>
                          </label>
                        </td>
                                               {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link
                              to={`/dashboard/applicants/${app.id}`}
                              className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition text-[11px]"
                            >
                              <span>Details</span>
                              <ChevronRight size={12} />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(app)}
                              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                              title="Delete applicant entry"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-zinc-400 font-medium">
                      No matching student applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Delete Confirmation Modal --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-accent-red">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">Delete Student Entry</h3>
            </div>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              Are you sure you want to delete <span className="font-bold text-zinc-800 dark:text-zinc-200">{deleteTarget.full_name}</span>'s application? This action is permanent and deletes all answers, uploaded documents, and files.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-accent-red hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer disabled:opacity-55"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApplicantList;
