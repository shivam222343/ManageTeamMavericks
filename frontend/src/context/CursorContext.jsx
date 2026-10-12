import React, { createContext, useContext, useEffect, useState } from 'react';

const CursorContext = createContext();

export const CursorProvider = ({ children }) => {
  const [cursorType, setCursorTypeState] = useState(() => {
    const saved = localStorage.getItem('app_cursor_preference');
    return saved === 'default' ? 'default' : 'target';
  });

  const setCursorType = (type) => {
    const valid = type === 'default' ? 'default' : 'target';
    setCursorTypeState(valid);
    localStorage.setItem('app_cursor_preference', valid);
    if (valid === 'default') {
      document.body.style.cursor = 'auto';
    }
  };

  const toggleCursorType = () => {
    setCursorType(cursorType === 'target' ? 'default' : 'target');
  };

  useEffect(() => {
    if (cursorType === 'default') {
      document.body.style.cursor = 'auto';
    }
  }, [cursorType]);

  return (
    <CursorContext.Provider
      value={{
        cursorType,
        setCursorType,
        toggleCursorType,
        isTargetCursor: cursorType === 'target'
      }}
    >
      {children}
    </CursorContext.Provider>
  );
};

export const useCursor = () => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
};

export default CursorContext;
