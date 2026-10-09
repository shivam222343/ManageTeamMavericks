import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import ElectricBorder from './ElectricBorder';
import './TearTicket.css';

const TearTicket = ({
  children,
  stub,
  image,
  imageAlt = 'Event Ticket Banner',
  orientation = 'horizontal',
  scrim = true,
  imageRadius = 12,
  onTear,
  width = '100%',
  height = 250,
  stubSize = 140,
  radius = 20,
  holes = 10,
  holeSize = 5,
  notch = 12,
  roughness = 0,
  tearAngle = 30,
  stretch = 40,
  resistance = 0.45,
  rotate = 0,
  tilt = true,
  tiltMax = 8,
  tiltReach = 260,
  parallax = 6,
  perspective = 1000,
  background,
  color,
  border = true,
  borderWidth = 1,
  recenter = true,
  electric = true,
  electricColor,
  isDark = true,
  className = '',
  style = {}
}) => {
  const [isTorn, setIsTorn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // 3D Tilt calculations using Framer Motion springs
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-tiltReach, tiltReach], [tiltMax, -tiltMax]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-tiltReach, tiltReach], [-tiltMax, tiltMax]), springConfig);

  const handleMouseMove = useCallback(
    (e) => {
      if (!tilt || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    },
    [tilt, mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    if (recenter) {
      mouseX.set(0);
      mouseY.set(0);
    }
  }, [recenter, mouseX, mouseY]);

  // Dragging / Tearing stub state
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const stubRotate = useTransform(dragY, [0, 150], [0, tearAngle]);
  const stubOpacity = useTransform(dragY, [0, 120], [1, 0]);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const offset = Math.hypot(info.offset.x, info.offset.y);
    if (offset > stretch || info.velocity.y > 200) {
      setIsTorn(true);
      if (onTear) onTear();
    } else {
      dragX.set(0);
      dragY.set(0);
    }
  };

  const bgStyle = background || (isDark ? '#0C1222' : '#FFFFFF');
  const textColor = color || (isDark ? '#F8FAFC' : '#0F172A');
  const pageBg = isDark ? '#070C18' : '#FAFAF9';
  const effectiveElectricColor = electricColor || (isDark ? '#38bdf8' : '#1e40af');

  const ticketContent = (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
        transformStyle: 'preserve-3d',
        perspective: `${perspective}px`,
        borderRadius: `${radius}px`,
        backgroundColor: bgStyle,
        color: textColor,
        width: typeof width === 'number' ? `${width}px` : width,
        minHeight: height === 'auto' ? 'auto' : (typeof height === 'number' ? `${height}px` : height),
        border: border ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(226, 232, 240, 0.95)') : 'none',
        boxShadow: isDark
          ? '0 20px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 15px 40px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
        '--ticket-page-bg': pageBg,
        '--stub-width': typeof stubSize === 'number' ? `${stubSize}px` : stubSize
      }}
      className={`tear-ticket-container select-none ${className}`}
    >
      {/* Main Ticket Section (Left / Top) */}
      <div className="tear-ticket-main p-4 sm:p-6">
        {image && (
          <div
            className="w-full h-28 sm:h-32 mb-4 rounded-xl overflow-hidden relative bg-zinc-900 shadow-inner shrink-0"
            style={{ borderRadius: `${imageRadius}px` }}
          >
            <img
              src={image.startsWith('http') || image.startsWith('/') ? image : `http://localhost:8000${image}`}
              alt={imageAlt}
              className="w-full h-full object-cover"
            />
            {scrim && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            )}
          </div>
        )}

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          {children}
        </div>

        {/* Perforation Divider Line */}
        <div className="tear-ticket-perforation">
          <div className="tear-ticket-notch-top" />
          <div className="tear-ticket-dash-line" />
          {Array.from({ length: holes }).map((_, i) => (
            <div
              key={i}
              className="tear-ticket-hole shadow-inner"
              style={{ width: `${holeSize}px`, height: `${holeSize}px` }}
            />
          ))}
          <div className="tear-ticket-notch-bottom" />
        </div>
      </div>

      {/* Ticket Stub Section (Right on desktop / Bottom on mobile) */}
      <motion.div
        drag={!isTorn}
        dragConstraints={{ top: 0, left: -20, right: 40, bottom: 120 }}
        dragElastic={resistance}
        style={{
          x: dragX,
          y: dragY,
          rotate: stubRotate,
          opacity: isTorn ? 0 : stubOpacity,
          backgroundColor: isDark ? '#080D19' : '#F8FAFC'
        }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className={`tear-ticket-stub p-4 ${isDark ? 'border-blue-500/20' : 'border-slate-200'} ${
          isDragging ? 'is-dragging' : ''
        } ${isTorn ? 'is-torn' : ''}`}
      >
        <div className="w-full text-center flex flex-col items-center justify-between h-full relative">
          {stub}
          {!isTorn && (
            <div className="pt-2 text-center w-full">
              <span className="text-[8px] font-mono tracking-widest uppercase py-0.5 px-2 rounded-md bg-black/20 dark:bg-white/5 text-slate-400 dark:text-slate-500 inline-block">
                ↕ PULL TO TEAR
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  if (electric) {
    return (
      <div className="tear-ticket-wrapper">
        <ElectricBorder
          color={effectiveElectricColor}
          speed={0.8}
          chaos={0.10}
          borderRadius={radius}
          className="w-full"
        >
          {ticketContent}
        </ElectricBorder>
      </div>
    );
  }

  return <div className="tear-ticket-wrapper">{ticketContent}</div>;
};

export default TearTicket;
