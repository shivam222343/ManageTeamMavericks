import React from 'react';
import { User, Mail, Phone, Hash, Link as LinkIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const FloatingInput = ({
  label,
  type = 'text',
  placeholder = '',
  isRequired = false,
  error,
  helpText,
  register,
  value,
}) => {
  const getFieldIcon = (lbl) => {
    const l = lbl.toLowerCase();
    const classStr = "text-zinc-400 dark:text-zinc-650 group-hover:text-blue-500 transition-colors duration-200";
    if (l.includes('name')) return <User size={15} className={classStr} />;
    if (l.includes('email')) return <Mail size={15} className={classStr} />;
    if (l.includes('phone') || l.includes('contact')) return <Phone size={15} className={classStr} />;
    if (l.includes('prn')) return <Hash size={15} className={classStr} />;
    if (l.includes('github') || l.includes('url') || l.includes('portfolio') || l.includes('linkedin')) {
      return <LinkIcon size={15} className={classStr} />;
    }
    return <FileText size={15} className={classStr} />;
  };

  const hasValue = value !== undefined && value !== null && String(value).trim() !== '';

  return (
    <div className="space-y-1 w-full relative">
      <div className="relative group flex items-center">
        {/* Prefix Icon */}
        <div className="absolute left-4 pointer-events-none select-none z-10">
          {getFieldIcon(label)}
        </div>

        {/* Input */}
        <input
          type={type}
          placeholder={placeholder || " "}
          {...register}
          className={`w-full pl-11 pr-11 pt-6 pb-2 border rounded-2xl text-xs font-semibold focus:outline-none transition-all duration-300 bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-900/10 dark:border-zinc-800 dark:text-white placeholder:text-transparent focus:placeholder:text-zinc-400 dark:focus:placeholder:text-zinc-600
            ${error
              ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/10 focus:border-red-500'
              : 'focus:ring-2 focus:ring-blue-500/10 focus:border-blue-550 hover:border-zinc-300 dark:hover:border-zinc-700'
            }
          `}
        />

        {/* Floating Label */}
        <label
          className={`absolute pointer-events-none select-none transition-all duration-200 font-extrabold uppercase tracking-widest text-[9px]
            ${hasValue
              ? 'left-4 top-2 text-blue-500 dark:text-blue-400 scale-90'
              : 'left-11 text-zinc-450 dark:text-zinc-650 group-focus-within:left-4 group-focus-within:top-2 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 group-focus-within:scale-90'
            }
            ${!hasValue ? 'top-1/2 -translate-y-1/2 group-focus-within:translate-y-0 group-focus-within:top-2' : ''}
          `}
        >
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>

        {/* Validation Status Indicator */}
        <div className="absolute right-4 pointer-events-none select-none z-10 flex items-center gap-1.5">
          {error ? (
            <AlertCircle size={14} className="text-red-500 animate-bounce" />
          ) : hasValue ? (
            <CheckCircle size={14} className="text-emerald-500" />
          ) : null}
        </div>
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p className="text-[9px] text-zinc-400 dark:text-zinc-550 font-medium px-2 leading-relaxed">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[9px] text-red-500 font-bold px-2 flex items-center gap-1.5 animate-pulse">
          <AlertCircle size={11} />
          {error.message}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;
