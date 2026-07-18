import React from 'react';

const MajorLoader = ({ size, logoSize, fullPage = false }) => {
  const finalSize = size || (fullPage ? 'h-40 w-40' : 'h-28 w-28');
  const finalLogoSize = logoSize || (fullPage ? 'w-32 h-32' : 'w-28 h-28');

  const loader = (
    <div className={`relative flex items-center justify-center flex-col gap-2 ${finalSize}`}>
      {/* Shiny light sweep effect container */}
      <div className="relative overflow-hidden rounded-full">
        <img
          src="/Logos/Mavericks_Logo.png"
          alt="Team Mavericks Logo"
          className={`${finalLogoSize} object-contain animate-pulse-subtle`}
        />
        {/* Sweeping light shine overlay */}
        <div className="absolute inset-0 rounded-full animate-shine-sweep pointer-events-none" />
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full">
        {loader}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {loader}
    </div>
  );
};

export default MajorLoader;
