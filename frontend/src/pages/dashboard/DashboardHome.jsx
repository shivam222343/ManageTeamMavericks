import React from 'react';

const DashboardHome = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 text-sm">Welcome to your Team Mavericks control panel.</p>
      </div>

      {/* Clean canvas placeholder */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[40vh] text-center">
        <p className="text-zinc-400 text-xs font-semibold">
          Dashboard content is cleared. Awaiting module initialization.
        </p>
      </div>
    </div>
  );
};

export default DashboardHome;
