import React from 'react';
import { motion } from 'framer-motion';
import { Code, Palette, Calendar, Megaphone, Share2, Terminal, Check } from 'lucide-react';

const SelectionCard = ({ domain, isSelected, register }) => {
  const getDomainIcon = (iconName) => {
    const classStr = isSelected ? "text-blue-500" : "text-zinc-400 dark:text-zinc-650";
    const icons = {
      Terminal: <Code size={18} className={classStr} />,
      Palette: <Palette size={18} className={classStr} />,
      Calendar: <Calendar size={18} className={classStr} />,
      Megaphone: <Megaphone size={18} className={classStr} />,
      Share2: <Share2 size={18} className={classStr} />
    };
    return icons[iconName] || <Terminal size={18} className={classStr} />;
  };

  return (
    <motion.label
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative p-5 border rounded-2xl flex items-start gap-4 cursor-pointer transition-all duration-300 select-none group overflow-hidden
        ${isSelected
          ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-500/5 shadow-[0_4px_20px_rgba(59,130,246,0.06)] font-bold'
          : 'border-zinc-200 bg-white/40 dark:border-zinc-800/80 dark:bg-zinc-900/10 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
        }
      `}
    >
      {/* Background glow when selected */}
      {isSelected && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Hidden native input */}
      <input
        type="checkbox"
        value={String(domain.id)}
        {...register}
        className="sr-only"
      />

      {/* Domain Icon */}
      <div className={`p-2.5 rounded-xl border transition-all duration-300
        ${isSelected
          ? 'bg-blue-500/10 border-blue-500/20'
          : 'bg-zinc-50 border-zinc-150 dark:bg-zinc-900/50 dark:border-zinc-800'
        }
      `}>
        {getDomainIcon(domain.icon_name || domain.icon)}
      </div>

      {/* Content */}
      <div className="flex-grow space-y-0.5 pr-6">
        <p className={`text-[11px] font-extrabold uppercase tracking-widest transition-colors duration-200
          ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}
        `}>
          {domain.name}
        </p>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-405 leading-relaxed font-medium block">
          {domain.description}
        </span>
      </div>

      {/* Selection Checkmark Indicator */}
      <div className={`absolute top-5 right-5 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0
        ${isSelected
          ? 'bg-blue-500 border-transparent text-white'
          : 'border-zinc-300 dark:border-zinc-700'
        }
      `}>
        {isSelected && <Check size={11} strokeWidth={3} />}
      </div>
    </motion.label>
  );
};

export default SelectionCard;
