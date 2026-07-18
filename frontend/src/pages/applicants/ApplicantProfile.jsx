import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MajorLoader from '../../components/ui/MajorLoader';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckSquare, 
  Send, 
  PlusCircle, 
  ChevronRight, 
  Download, 
  ShieldCheck, 
  Bookmark, 
  MessageSquareCode, 
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const ApplicantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applicant, setApplicant] = useState(null);
  
  // Transition Form state
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewVenue, setInterviewVenue] = useState('');
  
  // Add Note state
  const [noteText, setNoteText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch candidate details
  const fetchApplicantDetails = async () => {
    try {
      const res = await axios.get(`/applicants/${id}`);
      setApplicant(res.data);
      setNewStatus(res.data.status);
    } catch (err) {
      toast.error('Failed to load applicant profile');
      navigate('/dashboard/applicants');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    setDeleting(true);
    const loader = toast.loading('Deleting student entry…');
    try {
      await axios.delete(`/applicants/${id}`);
      toast.dismiss(loader);
      toast.success('Applicant record deleted successfully');
      navigate('/dashboard/applicants');
    } catch (err) {
      toast.dismiss(loader);
      toast.error('Failed to delete applicant record');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    fetchApplicantDetails();
  }, [id]);

  // Handle pipeline status update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating applicant status...');
    try {
      await axios.put(`/applicants/${id}/status`, {
        status: newStatus,
        notes: statusNotes || `Status updated to ${newStatus.replace('_', ' ')}`,
        interview_datetime: newStatus === 'interview' ? interviewDate : null,
        interview_venue: newStatus === 'interview' ? interviewVenue : null
      });
      toast.dismiss(loadingToast);
      toast.success(`Application status transitioned to ${newStatus.replace('_', ' ')}`);
      setStatusNotes('');
      fetchApplicantDetails(); // Reload profile timeline
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  // Handle adding internal note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await axios.post(`/applicants/${id}/notes`, { note_text: noteText });
      toast.success('Internal note added');
      setNoteText('');
      fetchApplicantDetails(); // Reload notes
    } catch (err) {
      toast.error('Failed to append note');
    }
  };

  // Handle deleting internal note
  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`/applicants/${id}/notes/${noteId}`);
      toast.success('Note removed');
      fetchApplicantDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete note');
    }
  };

  if (loading) {
    return (
      <MajorLoader fullPage={true} />
    );
  }

  // Get color for current status pipeline step
  const getStatusColor = (status) => {
    const colors = {
      applied: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
      under_review: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
      shortlisted: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      interview: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
      selected: 'text-green-500 bg-green-50 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-900/30',
      rejected: 'text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900/30'
    };
    return colors[status] || 'text-zinc-500 bg-zinc-100';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/dashboard/applicants" 
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{applicant.full_name}</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-mono">
              <span>ID: {applicant.registration_id || `TM-${String(applicant.id).padStart(4, '0')}`}</span>
              <span>•</span>
              <span>PRN: {applicant.prn}</span>
              <span>•</span>
              <span>Applied on {new Date(applicant.applied_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-400 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/20 transition rounded-lg text-xs font-bold cursor-pointer"
            title="Delete student record"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete Entry</span>
          </button>
          <span className={`px-3 py-1 border rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusColor(applicant.status)}`}>
            {applicant.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- LEFT / CENTER COLUMN (2/3 width) --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Personal Details */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <User size={16} className="text-primary-blue" />
              <span>Personal Details</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Full Name</span>
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-50">{applicant.full_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Permanent Registration Number (PRN)</span>
                <p className="text-sm font-mono font-bold">{applicant.prn}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Email Address</span>
                <p className="text-sm flex items-center gap-1.5 hover:underline text-primary-blue dark:text-blue-400">
                  <Mail size={12} />
                  <a href={`mailto:${applicant.email}`}>{applicant.email}</a>
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wide">WhatsApp / Phone Number</span>
                <p className="text-sm flex items-center gap-1.5 hover:underline text-primary-blue dark:text-blue-400">
                  <Phone size={12} />
                  <a href={`tel:${applicant.phone}`}>{applicant.phone}</a>
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Custom Questionnaire answers */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <MessageSquareCode size={16} className="text-primary-blue" />
              <span>Form Questionnaire Responses</span>
            </h3>

            <div className="space-y-5">
              {applicant.answers.map((ans, idx) => {
                // Skip displaying system primary values to avoid clutter
                if (['Full Name', 'Permanent Registration Number (PRN)', 'Email Address', 'Phone Number', 'Preferred Domains'].includes(ans.label)) {
                  return null;
                }
                return (
                  <div key={idx} className="space-y-1.5 border-b border-zinc-50 dark:border-zinc-850 pb-4 last:border-0 last:pb-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{ans.label}</span>
                    {ans.field_type === 'rating' ? (
                      <div className="flex gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="text-sm">
                            {i < parseInt(ans.answer_text) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium whitespace-pre-wrap">
                        {ans.answer_text || 'No response provided.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Uploaded Documents */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <FileText size={16} className="text-primary-blue" />
              <span>Attached Verification Documents</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {applicant.files.map((file) => {
                const isImage = file.file_type.startsWith('image/');
                const isPdf = file.file_type === 'application/pdf';
                const fileUrl = `http://localhost:8000/${file.file_path}`;

                return (
                  <div key={file.file_id} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg flex flex-col justify-between gap-3 shadow-sm hover:shadow transition">
                    <div className="flex gap-3">
                      <div className="p-2 rounded-lg bg-primary-blue/10 text-primary-blue flex shrink-0 h-10 w-10 items-center justify-center">
                        {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{file.label}</p>
                        <span className="text-[10px] text-zinc-400 font-medium font-mono">
                          {file.file_name} ({(file.file_size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    </div>
                    {isImage && (
                      <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-lg overflow-hidden max-h-48 flex items-center justify-center bg-white dark:bg-zinc-900/40">
                        <img 
                          src={fileUrl} 
                          alt={file.label} 
                          className="max-h-44 object-contain p-1"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <a 
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 text-center rounded-md text-[10px] font-bold shadow-sm transition"
                      >
                        Preview File
                      </a>
                      <a 
                        href={fileUrl}
                        download
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 rounded-md shadow-sm transition flex items-center justify-center cursor-pointer"
                      >
                        <Download size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
              {applicant.files.length === 0 && (
                <p className="text-xs text-zinc-400 font-medium col-span-2 py-2">
                  No files were uploaded with this application.
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Action Timeline / Log history */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <Clock size={16} className="text-primary-blue" />
              <span>Status History Log</span>
            </h3>

            <div className="relative pl-6 border-l border-zinc-200 dark:border-zinc-800 space-y-6">
              {applicant.timeline.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-primary-blue border-4 border-zinc-50 dark:border-zinc-950 scale-125"></span>
                  <div className="text-xs font-semibold">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-zinc-950 dark:text-zinc-50 uppercase tracking-wide">
                        {log.new_status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-normal font-mono">
                        by {log.changer_name} on {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-500 font-medium text-xs leading-relaxed">{log.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN (1/3 width) --- */}
        <div className="space-y-6">
          
          {/* Section A: Pipeline Status Changer */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary-blue" />
              <span>Pipeline Transition</span>
            </h3>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              {/* Select Status */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue"
                >
                  <option value="applied">Applied (Initial)</option>
                  <option value="under_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Scheduled for Interview</option>
                  <option value="selected">Selected (Accept)</option>
                  <option value="rejected">Rejected (Decline)</option>
                </select>
              </div>

              {/* Conditional inputs for Interview Scheduling */}
              {newStatus === 'interview' && (
                <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Interview Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      required
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-semibold focus:ring-1 focus:ring-primary-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Interview Location / Venue</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Core Lab 3 or Google Meet Link"
                      value={interviewVenue}
                      onChange={(e) => setInterviewVenue(e.target.value)}
                      required
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-semibold focus:ring-1 focus:ring-primary-blue"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Transition Log Note</label>
                <textarea
                  placeholder="Reason for change (e.g. Cleared round 1 / weak communication)..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue resize-none"
                />
              </div>

              {/* Action Button */}
              <button 
                type="submit"
                className="w-full py-2 bg-primary-blue hover:bg-primary-blue-dark text-white rounded-lg text-xs font-bold shadow-md shadow-primary-blue/10 hover:shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send size={12} />
                <span>Save Status & Notify</span>
              </button>
            </form>
          </div>

          {/* Section B: Internal Private Notes (Coordinators and Core Members ONLY) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
              <Bookmark size={16} className="text-primary-blue" />
              <span>Internal Panel Comments</span>
            </h3>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                placeholder="Write private notes/evaluation scores here. Applicants cannot see these comments..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-blue resize-none"
              />
              <button 
                type="submit"
                disabled={!noteText.trim()}
                className="w-full py-1.5 bg-zinc-850 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-[10px] font-bold disabled:opacity-40 transition cursor-pointer"
              >
                Add Private Comment
              </button>
            </form>

            <div className="space-y-3 mt-4 max-h-60 overflow-y-auto pr-1">
              {applicant.notes.map((note) => (
                <div key={note.id} className="p-3 border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/10 rounded-lg text-xs font-semibold space-y-1.5 relative group">
                  <div className="flex items-center justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                    <span>{note.author_name}</span>
                    <span className="font-normal font-mono">{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                    {note.note_text}
                  </p>
                  
                  {/* Delete Comment Button */}
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="absolute right-2 bottom-2 text-zinc-400 hover:text-accent-red opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Delete Comment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {applicant.notes.length === 0 && (
                <p className="text-[11px] text-zinc-400 font-medium text-center py-4">
                  No internal comments posted yet.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex items-center gap-3 text-accent-red">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">Delete Student Entry</h3>
            </div>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              Are you sure you want to delete <span className="font-bold text-zinc-800 dark:text-zinc-200">{applicant.full_name}</span>'s registration profile? This action is permanent and deletes all associated details, comments, and uploaded files.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
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

export default ApplicantProfile;
