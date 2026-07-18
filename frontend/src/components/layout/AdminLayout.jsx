import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  Compass,
  FolderGit2,
  Terminal,
  ClipboardCheck,
  Video,
  Bookmark,
  ListTodo,
  Briefcase,
  Coins,
  BarChart2,
  FileText,
  HelpCircle
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/approvals',
      label: 'Approvals',
      icon: ClipboardCheck,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/meetings',
      label: 'Meetings',
      icon: Video,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/events',
      label: 'Events',
      icon: Bookmark,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/tasks',
      label: 'Tasks',
      icon: ListTodo,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/members',
      label: 'Members',
      icon: Users,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/recruitment/form',
      label: 'Recruitment',
      icon: Briefcase,
      roles: ['coordinator', 'core_member', 'member']
    },
    {
      path: '/dashboard/finance',
      label: 'Finance',
      icon: Coins,
      roles: ['coordinator', 'core_member', 'member']
    },
  ];

  const recruitmentSubItems = [
    {
      path: '/dashboard/recruitment/form',
      label: 'Forms',
      icon: FileText
    },
    {
      path: '/dashboard/recruitment/applications',
      label: 'Applications',
      icon: Users
    },
    {
      path: '/dashboard/recruitment/analytics',
      label: 'Analytics',
      icon: BarChart2
    },
    {
      path: '/dashboard/recruitment/faqs',
      label: 'FAQs',
      icon: HelpCircle
    },
    {
      path: '/dashboard/recruitment/communicate',
      label: 'Communicate',
      icon: Mail
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));
  const isRecruitmentSection = window.location.pathname.startsWith('/dashboard/recruitment');

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex transition-colors duration-300">

      {/* --- Desktop Sidebars (Conditionally Double or Single) --- */}
      {isRecruitmentSection ? (
        <>
          {/* Desktop Primary Slim Sidebar */}
          <aside className="hidden md:flex flex-col w-20 h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/50 backdrop-blur-md shrink-0">
            {/* Brand Logo only */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-center shrink-0">
              <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
            </div>

            {/* Navigation links (Large Icons, Text Underneath) */}
            <nav className="flex-1 px-1 py-6 space-y-4 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isItemActive = item.path.startsWith('/dashboard/recruitment')
                  ? window.location.pathname.startsWith('/dashboard/recruitment')
                  : window.location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all duration-200 border border-transparent
                      ${isItemActive
                        ? 'bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 border-primary-blue/20 shadow-sm shadow-primary-blue/5 font-extrabold'
                        : 'text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50'
                      }
                    `}
                  >
                    <item.icon size={20} />
                    <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase leading-none scale-90">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Profile slim */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </aside>

          {/* Desktop Secondary Sub-Sidebar */}
          <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-md shrink-0">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h2 className="font-extrabold text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Recruitment</h2>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {recruitmentSubItems.map((subItem) => {
                const isSubActive = subItem.path === '/dashboard/recruitment/applications'
                  ? window.location.pathname.startsWith('/dashboard/recruitment/applications')
                  : window.location.pathname === subItem.path;

                return (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition border border-transparent
                      ${isSubActive
                        ? 'bg-primary-blue text-white shadow-md shadow-primary-blue/15 font-extrabold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
                      }
                    `}
                  >
                    <subItem.icon size={15} />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </>
      ) : (
        /* Regular Desktop Sidebar (Dashboard, etc.) */
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md shrink-0">
          {/* Brand */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
            <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
            <div>
              <h1 className="font-logo text-[11px] leading-none">Team Mavericks</h1>            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider px-3 mb-2">Main Menu</div>
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent
                  ${isActive
                    ? 'bg-primary-blue/10 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 border-primary-blue/20 shadow-sm shadow-primary-blue/5 font-extrabold'
                    : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-50'
                  }
                `}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Actions & Profile */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all duration-200 text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-primary-blue/10 dark:bg-primary-blue/20 border border-primary-blue/30 text-primary-blue dark:text-blue-400 flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                  {user?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-none mb-1">{user?.name}</p>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase tracking-wider font-bold">
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
                      className="absolute bottom-12 left-0 right-0 z-20 mt-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl shadow-zinc-950/10"
                    >
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-accent-red text-zinc-600 dark:text-zinc-400 text-xs font-medium cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            {user?.role === 'coordinator' && (
              <NavLink
                to="/dashboard/settings/portal"
                className={({ isActive }) => `
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition
                  ${isActive
                    ? 'text-primary-blue bg-primary-blue/5'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }
                `}
              >
                <Settings size={14} />
                <span>Portal Settings</span>
              </NavLink>
            )}
          </div>
        </aside>
      )}

      {/* --- Mobile Sidebar Overlay --- */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-0 bottom-0 left-0 w-64 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-3">
                  <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
                  <h1 className="font-logo text-[11px] leading-none">Team Mavericks</h1>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                  const isRecruitmentLink = item.path.startsWith('/dashboard/recruitment');

                  return (
                    <div key={item.path} className="space-y-1">
                      <NavLink
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={() => {
                          if (!isRecruitmentLink) {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                          ${(isActive || (isRecruitmentLink && isRecruitmentSection))
                            ? 'bg-primary-blue/15 text-primary-blue dark:bg-primary-blue/20 dark:text-blue-400 border border-primary-blue/20 font-extrabold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900'
                          }
                        `}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>

                      {/* Expanded sub-navigation inline on mobile if in recruitment section */}
                      {isRecruitmentLink && isRecruitmentSection && (
                        <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-zinc-200 dark:border-zinc-800 ml-5">
                          {recruitmentSubItems.map((sub) => {
                            const isSubActive = sub.path === '/dashboard/recruitment/applications'
                              ? window.location.pathname.startsWith('/dashboard/recruitment/applications')
                              : window.location.pathname === sub.path;

                            return (
                              <NavLink
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition
                                  ${isSubActive
                                    ? 'text-primary-blue bg-primary-blue/5 font-extrabold'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                                  }
                                `}
                              >
                                <sub.icon size={13} />
                                <span>{sub.label}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4 shrink-0">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-accent-red/20 text-accent-red hover:bg-accent-red/5 font-medium text-xs shadow-sm hover:shadow"
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <Compass size={14} />
              <span>Dashboard</span>
              {window.location.pathname
                .split('/')
                .filter(p => p && p.toLowerCase() !== 'dashboard')
                .map((part, idx) => (
                  <React.Fragment key={idx}>
                    <span>/</span>
                    <span className="text-zinc-600 dark:text-zinc-400 capitalize">{part}</span>
                  </React.Fragment>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Stats banner removed */}
          </div>
        </header>

        {/* Content Outlet with smooth transition */}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
