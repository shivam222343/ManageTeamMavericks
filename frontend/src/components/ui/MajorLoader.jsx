import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const MajorLoader = ({ size, logoSize, fullPage = false, message }) => {
  const { theme } = useTheme ? useTheme() : { theme: 'dark' };
  const isDark = theme === 'dark';

  const finalSize = size || (fullPage ? 'h-40 w-40' : 'h-28 w-28');
  const finalLogoSize = logoSize || (fullPage ? 'w-32 h-32' : 'w-28 h-28');

  const loader = (
    <div className={`relative flex items-center justify-center flex-col gap-2 ${finalSize}`}>
      {/* Dynamic ambient backdrop glow */}
      <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
        isDark ? 'bg-indigo-500/20' : 'bg-blue-400/25'
      }`} />

      {/* Shiny light sweep effect container */}
      <div className="relative overflow-hidden rounded-full p-2 flex items-center justify-center">
        <img
          src="/Logos/Mavericks_Logo.png"
          alt="Team Mavericks Logo"
          className={`${finalLogoSize} object-contain animate-pulse-subtle filter drop-shadow-md`}
        />
        {/* Sweeping light shine overlay */}
        <div className="absolute inset-0 rounded-full animate-shine-sweep pointer-events-none" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[40vh] w-full transition-colors duration-300 ${
        isDark ? 'text-slate-100' : 'text-slate-800'
      }`}>
        {loader}
        {message && (
          <p className={`text-xs font-mono tracking-wider uppercase font-semibold mt-3 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {loader}
      {message && (
        <p className={`text-xs font-mono tracking-wider uppercase font-semibold mt-2 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default MajorLoader;
