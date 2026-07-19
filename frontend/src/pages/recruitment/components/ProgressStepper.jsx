import React from 'react';
import { User, Layers, UploadCloud, Eye, Check } from 'lucide-react';

const ProgressStepper = ({ steps, activeStep }) => {
  const getStepIcon = (index) => {
    switch (index) {
      case 0:
        return <User size={16} />;
      case 1:
        return <Layers size={16} />;
      case 2:
        return <UploadCloud size={16} />;
      case 3:
      default:
        return <Eye size={16} />;
    }
  };

  return (
    <div className="w-full flex items-center justify-between relative select-none">
      {/* Background connecting line */}
      <div className="absolute top-[18px] left-[5%] right-[5%] h-[3px] bg-zinc-200 dark:bg-zinc-850 z-0 rounded-full overflow-hidden">
        {/* Animated fill line */}
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 transition-all duration-500 ease-out"
          style={{ width: `${(activeStep / (steps.length - 1 || 1)) * 100}%` }}
        />
      </div>

      {/* Steps */}
      {steps.map((step, idx) => {
        const isCompleted = idx < activeStep;
        const isActive = idx === activeStep;

        return (
          <div key={step.id || idx} className="flex flex-col items-center relative z-10 flex-1">
            {/* Step Icon Container */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500
                ${isCompleted
                  ? 'bg-gradient-to-tr from-blue-600 to-blue-400 border-transparent text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                  : isActive
                  ? 'bg-white border-blue-500 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.45)] dark:bg-zinc-950 dark:border-blue-400 dark:text-blue-400 animate-pulse'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-650'
                }
              `}
            >
              {isCompleted ? <Check size={14} strokeWidth={3} /> : getStepIcon(idx)}
            </div>

            {/* Label */}
            <span
              className={`text-[9px] font-extrabold uppercase tracking-widest mt-2 transition-colors duration-300 hidden sm:block text-center max-w-[90px] md:max-w-[110px] whitespace-normal leading-normal
                ${isActive
                  ? 'text-blue-600 dark:text-blue-450 font-black'
                  : isCompleted
                  ? 'text-zinc-800 dark:text-zinc-200'
                  : 'text-zinc-450 dark:text-zinc-600'
                }
              `}
            >
              {step.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressStepper;
