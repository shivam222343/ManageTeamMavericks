import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

/**
 * MobileScrollSlider
 * A sleek, tactile mobile scrollbar slider widget that allows users on touch devices
 * to easily and smoothly scroll long pages via a draggable handle, track tapping,
 * or quick jump chevrons without interfering with 3D canvas objects.
 */
const MobileScrollSlider = ({ isDark = true, className = '' }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const trackRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Update scroll percentage from window scroll
  const updateScrollProgress = useCallback(() => {
    if (isDragging) return;
    const docElem = document.documentElement;
    const totalHeight = docElem.scrollHeight - window.innerHeight;
    if (totalHeight > 30) {
      setIsScrollable(true);
      const currentProgress = Math.min(1, Math.max(0, window.scrollY / totalHeight));
      setScrollProgress(currentProgress);
    } else {
      setIsScrollable(false);
    }

    // Keep visible on scroll and fade slightly after idle
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isDragging) {
        setIsVisible(false);
      }
    }, 2800);
  }, [isDragging]);

  useEffect(() => {
    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [updateScrollProgress]);

  // Handle touch/pointer drag along the slider track
  const handleScrollToRatio = useCallback((ratio) => {
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    setScrollProgress(clampedRatio);
    const docElem = document.documentElement;
    const totalHeight = docElem.scrollHeight - window.innerHeight;
    if (totalHeight > 0) {
      window.scrollTo({
        top: clampedRatio * totalHeight,
        behavior: 'auto'
      });
    }
  }, []);

  const calculateRatioFromClientY = useCallback((clientY) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const trackHeight = rect.height;
    if (trackHeight <= 0) return 0;
    const relativeY = clientY - rect.top;
    return relativeY / trackHeight;
  }, []);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    const ratio = calculateRatioFromClientY(e.clientY || (e.touches && e.touches[0]?.clientY));
    handleScrollToRatio(ratio);

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const currentClientY = moveEvent.touches ? moveEvent.touches[0]?.clientY : moveEvent.clientY;
      if (typeof currentClientY === 'number') {
        const moveRatio = calculateRatioFromClientY(currentClientY);
        handleScrollToRatio(moveRatio);
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);

      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    };

    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  };

  const scrollToTop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const docElem = document.documentElement;
    window.scrollTo({ top: docElem.scrollHeight, behavior: 'smooth' });
  };

  if (!isScrollable) return null;

  return (
    <div
      className={`fixed right-1.5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center select-none touch-none md:hidden transition-all duration-300 ${
        isVisible || isDragging ? 'opacity-90 scale-100' : 'opacity-40 hover:opacity-100 scale-95'
      } ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Percentage Pill Tag (visible when dragging or active) */}
      {isDragging && (
        <div
          className={`absolute right-9 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold shadow-lg backdrop-blur-md border animate-in fade-in zoom-in-95 pointer-events-none whitespace-nowrap ${
            isDark
              ? 'bg-slate-900/95 text-blue-400 border-blue-500/40 shadow-blue-500/20'
              : 'bg-white/95 text-blue-600 border-blue-400 shadow-slate-300'
          }`}
        >
          {Math.round(scrollProgress * 100)}%
        </div>
      )}

      {/* Main Track Container */}
      <div
        className={`relative flex flex-col items-center py-1.5 px-1 rounded-full backdrop-blur-xl border shadow-xl transition-all ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/90 shadow-black/60 ring-1 ring-white/5'
            : 'bg-white/85 border-slate-200 shadow-slate-400/30'
        } ${isDragging ? 'ring-2 ring-primary-blue shadow-blue-500/30' : ''}`}
      >
        {/* Jump to Top Button */}
        <button
          type="button"
          onClick={scrollToTop}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Scroll to top"
        >
          <ChevronUp size={14} />
        </button>

        {/* Draggable Vertical Slider Track */}
        <div
          ref={trackRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="relative w-3.5 h-36 my-1 flex items-center justify-center cursor-pointer touch-none"
        >
          {/* Track Line Background */}
          <div
            className={`w-1 h-full rounded-full transition-colors ${
              isDark ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          />

          {/* Active Fill Level */}
          <div
            className="absolute top-0 w-1 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 transition-all duration-75"
            style={{ height: `${Math.max(4, scrollProgress * 100)}%` }}
          />

          {/* Draggable Thumb Handle */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-6 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform duration-75 ${
              isDragging ? 'scale-110 shadow-blue-500/50 ring-2 ring-blue-400' : 'hover:scale-105'
            } ${
              isDark
                ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-black/40'
                : 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-blue-500/30'
            }`}
            style={{
              top: `calc(${scrollProgress * 100}% - 16px)`,
            }}
          >
            <GripVertical size={12} className="opacity-90" />
          </div>
        </div>

        {/* Jump to Bottom Button */}
        <button
          type="button"
          onClick={scrollToBottom}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-90 ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          }`}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};

export default MobileScrollSlider;
