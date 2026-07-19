import React from 'react';
import { User, Layers, UploadCloud, Eye } from 'lucide-react';

const SectionSidebar = ({ step, index }) => {
  const getStepIcon = (idx) => {
    const classStr = "text-blue-500 dark:text-blue-400";
    switch (idx) {
      case 0:
        return <User size={22} className={classStr} />;
      case 1:
        return <Layers size={22} className={classStr} />;
      case 2:
        return <UploadCloud size={22} className={classStr} />;
      case 3:
      default:
        return <Eye size={22} className={classStr} />;
    }
  };

  const formattedNumber = String(index + 1).padStart(2, '0');

  return (
    <div className="relative group overflow-hidden rounded-3xl border p-7 flex flex-col justify-between h-full min-h-[220px] transition-all duration-300 bg-white/40 border-zinc-200/80 dark:bg-zinc-900/10 dark:border-zinc-800/80 hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)] hover:-translate-y-0.5 hover:border-blue-500/30 dark:hover:border-blue-500/20 select-none">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/3 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />

      {/* Top section: Icon and Step count */}
      <div className="flex justify-between items-start">
        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/5 rounded-2xl border border-blue-500/20 shadow-sm">
          {getStepIcon(index)}
        </div>
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 font-mono">
          Step {formattedNumber}
        </span>
      </div>

      {/* Bottom section: Number, Title, Description */}
      <div className="space-y-3 mt-8">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            {formattedNumber}
          </span>
          <span className="h-0.5 w-6 bg-gradient-to-r from-blue-600 to-blue-400 opacity-60 rounded-full" />
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-black tracking-tight text-zinc-950 dark:text-white uppercase">
            {step?.name}
          </h4>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-405 leading-relaxed font-medium max-w-[200px]">
            {step?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SectionSidebar;
