import React from 'react';

const MajorLoader = ({ size = 'h-16 w-16', logoSize = 'w-9 h-9', fullPage = false }) => {
  const loader = (
    <div className={`relative flex items-center justify-center ${size}`}>
      {/* Animated outer circle with changing colors */}
      <div className="absolute inset-0 rounded-full animate-mavericks-loader"></div>
      {/* Inner Mavericks logo */}
      <img 
        src="/Logos/Mavericks_Logo.png" 
        alt="Team Mavericks Logo" 
        className={`${logoSize} object-contain`} 
      />
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
