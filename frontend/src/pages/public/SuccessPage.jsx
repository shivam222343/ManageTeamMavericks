import React from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Terminal, HelpCircle, ArrowRight, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SuccessPage = () => {
  const location = useLocation();
  const state = location.state;

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const { application_id, name, campaign_name, thank_you_message } = state;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between transition-colors duration-300">
      
      {/* Header */}
      <header className="h-16 border-b border-zinc-200/60 dark:border-zinc-900/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center px-6 md:px-12">
        <div className="flex items-center gap-3">
          <img src="/Logos/Mavericks_Logo.png" alt="Team Mavericks Logo" className="w-8 h-8 object-contain shrink-0" />
          <div>
            <h1 className="font-bold text-xs uppercase tracking-widest leading-none">Team Mavericks</h1>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Learning with Fun</span>
          </div>
        </div>
      </header>

      {/* Main card */}
      <main className="p-6 flex items-center justify-center flex-1">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center space-y-6 shadow-xl"
        >
          {/* Check icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 text-accent-green flex items-center justify-center border border-green-200 dark:border-green-900/50 shadow-inner">
            <CheckCircle size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Registration Submitted!</h2>
            <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
              {campaign_name}
            </p>
          </div>

          {/* Application Id Card */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 font-semibold">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Your Application ID</span>
            <p className="text-xl font-mono font-bold tracking-wider text-primary-blue dark:text-blue-400 select-all">
              {application_id}
            </p>
            <p className="text-[10px] text-zinc-500 font-sans mt-1">Hello {name}, keep this ID safe for interview reference.</p>
          </div>

          {/* Thank You message */}
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
            {thank_you_message}
          </p>

          <div className="flex gap-2 pt-2 text-xs font-bold">
            <button
              onClick={() => {
                window.print();
                toast.success('Preparing print layout...', { icon: '🖨️' });
              }}
              className="flex-1 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Page</span>
            </button>
            <Link
              to="/"
              className="flex-1 py-2 bg-zinc-850 text-white dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-700 rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Back to Home</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-900 text-center px-6 bg-zinc-100/50 dark:bg-zinc-950">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Team Mavericks KIT CoEK. Learning with Fun.
        </div>
      </footer>

    </div>
  );
};

export default SuccessPage;
