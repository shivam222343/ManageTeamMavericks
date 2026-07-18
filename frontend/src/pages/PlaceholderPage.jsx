import React from 'react';
import { Compass } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-inner text-primary-blue dark:text-blue-400">
        <Compass size={32} className="animate-pulse" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-zinc-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
          This section is currently under development. Team Mavericks developers are preparing the metadata modules for this screen.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
