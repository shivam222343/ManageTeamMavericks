import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import BranchedMenu from '../ui/BranchedMenu';
import {
  LayoutDashboard,
  Users,
  User,
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  Compass,
  ClipboardCheck,
  Video,
  Bookmark,
  ListTodo,
  Briefcase,
  Coins,
  BarChart2,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Layers,
  Plus
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Body scroll lock on mobile when sidebar is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCoordinator = user?.role === 'coordinator';
  const canForms = isCoordinator || user?.permissions?.forms !== false;
  const canApplicants = isCoordinator || user?.permissions?.applicants !== false;
  const canAnalytics = isCoordinator || user?.permissions?.analytics !== false;
  const canCommunicate = isCoordinator || user?.permissions?.communicate === true;
  const canPanels = isCoordinator || user?.permissions?.panels !== false;

  const recruitmentSubItems = [
    ...(canForms ? [{
      path: '/dashboard/recruitment/form',
      label: 'Forms',
      icon: FileText
    }] : []),
    ...(canApplicants ? [{
      path: '/dashboard/recruitment/applications',
      label: 'Applications',
      icon: Users
    }] : []),
    ...(canPanels ? [{
      path: '/dashboard/recruitment/panels',
      label: 'Panels',
      icon: Layers
    }] : []),
    ...(canAnalytics ? [{
      path: '/dashboard/recruitment/analytics',
      label: 'Analytics',
      icon: BarChart2
    }] : []),
    {
      path: '/dashboard/recruitment/faqs',
      label: 'FAQs',
      icon: HelpCircle
    },
    ...(canCommunicate ? [{
      path: '/dashboard/recruitment/communicate',
      label: 'Communicate',
      icon: Mail
    }] : [])
  ];

  const memberSubItems = [
    {
      path: '/dashboard/members/mavericks',
      label: 'Mavericks',
      icon: Users,
      roles: ['coordinator', 'core_member', 'member']
    },
    ...(canCommunicate ? [{
      path: '/dashboard/members/communicate',
      label: 'Communicate',
      icon: Mail,
      roles: ['coordinator', 'core_member', 'member']
    }] : []),
    {
      path: '/dashboard/members/add',
      label: 'Add Members',
      icon: UserPlus,
      roles: ['coordinator']
    }
  ];

  // Branched menu items tree
  const branchedMenuItems = useMemo(() => [
    {
      value: '/dashboard',
      path: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      value: 'recruitment',
      label: 'Recruitment',
      icon: Briefcase,
      roles: ['coordinator', 'core_member', 'member'],
      children: recruitmentSubItems.map(sub => ({
        value: sub.path,
        path: sub.path,
        label: sub.label,
        icon: sub.icon
      }))
    },
    {
      value: 'events',
      label: 'Events',
      icon: Bookmark,
      roles: ['coordinator', 'core_member', 'member'],
      children: [
        { value: '/dashboard/events', path: '/dashboard/events', label: 'All Events', icon: Bookmark },
        ...(isCoordinator || user?.role === 'core_member' ? [{ value: '/dashboard/events/create', path: '/dashboard/events/create', label: 'Create Event', icon: Plus }] : [])
      ]
    },
    {
      value: 'members',
      label: 'Members',
      icon: Users,
      roles: ['coordinator', 'core_member', 'member'],
      children: memberSubItems
        .filter(sub => sub.roles.includes(user?.role))
        .map(sub => ({
          value: sub.path,
          path: sub.path,
          label: sub.label,
          icon: sub.icon
        }))
    },
    {
      value: '/dashboard/approvals',
      path: '/dashboard/approvals',
      label: 'Approvals',
      icon: ClipboardCheck,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      value: '/dashboard/meetings',
      path: '/dashboard/meetings',
      label: 'Meetings',
      icon: Video,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      value: '/dashboard/tasks',
      path: '/dashboard/tasks',
      label: 'Tasks',
      icon: ListTodo,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      value: '/dashboard/finance',
      path: '/dashboard/finance',
      label: 'Finance',
      icon: Coins,
      roles: ['coordinator', 'core_member', 'member']
    },
    ...(user?.role === 'participant' ? [
      {
        value: '/user/dashboard',
        path: '/user/dashboard',
        label: 'My Passes & Tickets',
        icon: Bookmark,
        roles: ['participant']
      },
      {
        value: '/user/profile',
        path: '/user/profile',
        label: 'My Profile',
        icon: User,
        roles: ['participant']
      },
      {
        value: '/events',
        path: '/events',
        label: 'Browse Events',
        icon: Compass,
        roles: ['participant']
      }
    ] : [])
  ].filter(item => item.roles.includes(user?.role)), [user?.role, isCoordinator, canForms, canApplicants, canPanels, canAnalytics, canCommunicate]);

  // Determine active item value based on current pathname
  const currentActivePath = useMemo(() => {
    const current = location.pathname;
    if (current.startsWith('/dashboard/recruitment/applications')) return '/dashboard/recruitment/applications';
    if (current.startsWith('/dashboard/events') && current !== '/dashboard/events/create') return '/dashboard/events';
    if (current.startsWith('/dashboard/members/mavericks')) return '/dashboard/members/mavericks';
    return current;
  }, [location.pathname]);

  const handleMenuSelect = (value, item) => {
    const target = item?.path || value;
    if (target && target.startsWith('/')) {
      navigate(target);
      setMobileMenuOpen(false);
    }
  };

  const isDark = theme === 'dark';
  const menuInk = isDark ? '#f4f4f5' : '#18181b';
  const menuLine = isDark ? '#27272a' : '#e4e4e7';
  const menuAccent = '#3b82f6';

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <div className="h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex transition-colors duration-300">

      {/* --- Desktop Sidebar (Branched Tree Menu) --- */}
      <aside className="hidden md:flex flex-col w-64 h-full border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 backdrop-blur-xl shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
          <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="h-8 w-auto object-contain select-none shrink-0" />
          <div>
            <h1 className="font-logo text-[11px] leading-none">Team Mavericks</h1>
            <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Management</p>
          </div>
        </div>

        {/* Branched Menu Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-[9px] uppercase font-mono font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider px-3 mb-2">
            Navigation
          </div>
          <BranchedMenu
            items={branchedMenuItems}
            active={currentActivePath}
            defaultOpen={[1]}
            accordion={true}
            onSelect={handleMenuSelect}
            color={menuInk}
            accentColor={menuAccent}
            lineColor={menuLine}
            width={230}
            rowHeight={32}
            indent={32}
            trunk={12}
            radius={8}
            lineWidth={1.5}
            fontSize={12}
            drawDuration={350}
            foldDuration={250}
          />
        </nav>

        {/* Bottom Actions & Profile */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition duration-200 text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-bold text-xs shadow-inner uppercase shrink-0">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-none mb-1 text-zinc-900 dark:text-zinc-100">{user?.name}</p>
                <span className="text-[9px] text-zinc-500 flex items-center gap-1 uppercase tracking-wider font-bold">
                  <Shield size={10} className="text-primary-blue" />
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-12 left-0 right-0 z-20 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl space-y-1"
                  >
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate(`/dashboard/members/mavericks/${user?.id}`);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                    >
                      <User size={14} className="text-primary-blue" />
                      <span>Profile</span>
                    </button>

                    {user?.role === 'coordinator' && (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/dashboard/settings/portal');
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                      >
                        <Settings size={14} className="text-zinc-500" />
                        <span>Portal Settings</span>
                      </button>
                    )}

                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-rose-500 text-xs font-bold cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* --- Mobile Sidebar Overlay --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-0 bottom-0 left-0 w-72 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 p-5 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
                  <div>
                    <h1 className="font-logo text-[11px] leading-none">Team Mavericks</h1>
                    <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">Management</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-1">
                <BranchedMenu
                  items={branchedMenuItems}
                  active={currentActivePath}
                  defaultOpen={[1]}
                  accordion={true}
                  onSelect={handleMenuSelect}
                  color={menuInk}
                  accentColor={menuAccent}
                  lineColor={menuLine}
                  width={250}
                  rowHeight={34}
                  indent={32}
                  trunk={12}
                  radius={8}
                  lineWidth={1.5}
                  fontSize={13}
                  drawDuration={350}
                  foldDuration={250}
                />
              </nav>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3 shrink-0">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- Main Content Panel --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative">

        {/* Header Bar */}
        <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
              <Compass size={14} />
              <span>Dashboard</span>
              {window.location.pathname
                .split('/')
                .filter(p => p && p.toLowerCase() !== 'dashboard')
                .map((part, idx) => (
                  <React.Fragment key={idx}>
                    <span>/</span>
                    <span className="text-zinc-700 dark:text-zinc-300 capitalize">{part}</span>
                  </React.Fragment>
                ))}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
