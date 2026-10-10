import React, { useEffect, useRef } from 'react';
import './InteractiveBackground.css';

/**
 * InteractiveBackground
 * Recreates the moving map background, cursor core, particle trail,
 * radial glow, floating particles, and pulsating pins from preview (1).html.
 */
const InteractiveBackground = () => {
  const mapBgRef = useRef(null);
  const glowRef = useRef(null);
  const cursorCoreRef = useRef(null);
  const trailContainerRef = useRef(null);

  useEffect(() => {
    // Check device capabilities
    const checkIsTouch = () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0);

    const checkIsMobile = () =>
      typeof window !== 'undefined' && window.innerWidth <= 700;

    let isTouch = checkIsTouch();
    let isMobile = checkIsMobile();

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let mapStrength = isMobile ? 15 : 35;
    let glowStrength = isMobile ? 100 : 250;
    const particleCount = isMobile ? 12 : 20;

    if (prefersReducedMotion) {
      mapStrength = 0;
      glowStrength = 0;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let isCursorVisible = false;

    // Enable custom cursor on desktop body when component is active
    if (!isTouch) {
      document.body.classList.add('interactive-cursor-active');
    }

    // Build particle trail DOM nodes
    const particles = [];
    const container = trailContainerRef.current;
    if (container) {
      container.innerHTML = '';
      for (let i = 0; i < particleCount; i++) {
        const pEl = document.createElement('div');
        pEl.className = 'interactive-cursor-particle';
        pEl.style.opacity = '0';
        container.appendChild(pEl);
        particles.push({
          el: pEl,
          x: targetX,
          y: targetY
        });
      }
    }

    // Event Handlers
    const onMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!isCursorVisible) {
        isCursorVisible = true;
        if (cursorCoreRef.current) cursorCoreRef.current.style.opacity = '1';
      }
    };

    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (touch) {
        targetX = touch.clientX;
        targetY = touch.clientY;
        isCursorVisible = true;
      }
    };

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch) {
        targetX = touch.clientX;
        targetY = touch.clientY;
        currentX = targetX;
        currentY = targetY;
        isCursorVisible = true;
      }
    };

    const onMouseLeave = () => {
      isCursorVisible = false;
      if (cursorCoreRef.current) cursorCoreRef.current.style.opacity = '0';
      particles.forEach((p) => {
        p.el.style.opacity = '0';
      });
    };

    const onMouseEnter = () => {
      isCursorVisible = true;
      if (cursorCoreRef.current && !isTouch) cursorCoreRef.current.style.opacity = '1';
    };

    const onResize = () => {
      isTouch = checkIsTouch();
      isMobile = checkIsMobile();
      mapStrength = prefersReducedMotion ? 0 : isMobile ? 15 : 35;
      glowStrength = prefersReducedMotion ? 0 : isMobile ? 100 : 250;
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 2;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('resize', onResize);

    // Initial opacity hidden until user interacts
    if (cursorCoreRef.current) {
      cursorCoreRef.current.style.opacity = '0';
    }

    // Animation loop via requestAnimationFrame
    let rafId;
    const animate = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      // Update Desktop Cursor Core
      if (cursorCoreRef.current && !isTouch) {
        cursorCoreRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      }

      // Normalized coordinates from -0.5 to 0.5
      const normalizedX = currentX / window.innerWidth - 0.5;
      const normalizedY = currentY / window.innerHeight - 0.5;

      // Map Parallax
      if (mapBgRef.current) {
        const mapX = normalizedX * mapStrength;
        const mapY = normalizedY * mapStrength;
        mapBgRef.current.style.transform = `translate3d(${mapX}px, ${mapY}px, 0)`;
      }

      // Background Glow Movement
      if (glowRef.current) {
        const glowX = normalizedX * glowStrength;
        const glowY = normalizedY * glowStrength;
        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
      }

      // Cursor Particle Trail Update
      let prevX = currentX;
      let prevY = currentY;

      particles.forEach((particle, idx) => {
        const speed = idx === 0 ? 0.3 : 0.2;
        particle.x += (prevX - particle.x) * speed;
        particle.y += (prevY - particle.y) * speed;

        const scale = 1 - (idx / particleCount) * 0.7;
        const baseOpacity = isCursorVisible ? 1 - (idx / particleCount) * 0.75 : 0;

        particle.el.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        particle.el.style.opacity = `${baseOpacity}`;

        prevX = particle.x;
        prevY = particle.y;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    // Cleanup when component unmounts (e.g. Navigating to Dashboard, Admin, etc.)
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('interactive-cursor-active');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <>
      {/* Background Layer */}
      <div className="interactive-bg-container" aria-hidden="true">
        {/* Moving map pattern */}
        <div ref={mapBgRef} className="interactive-map-background" />

        {/* Cursor/touch glow */}
        <div ref={glowRef} className="interactive-background-glow" />

        {/* Dark radial overlay */}
        <div className="interactive-bg-overlay" />

        {/* 8 Floating particles */}
        <div className="interactive-floating-particle p1" />
        <div className="interactive-floating-particle p2" />
        <div className="interactive-floating-particle p3" />
        <div className="interactive-floating-particle p4" />
        <div className="interactive-floating-particle p5" />
        <div className="interactive-floating-particle p6" />
        <div className="interactive-floating-particle p7" />
        <div className="interactive-floating-particle p8" />

        {/* 4 Location pins */}
        <div className="interactive-pin pin1" />
        <div className="interactive-pin pin2" />
        <div className="interactive-pin pin3" />
        <div className="interactive-pin pin4" />
      </div>

      {/* Desktop Cursor Core */}
      <div ref={cursorCoreRef} className="interactive-cursor-core" aria-hidden="true" />

      {/* Cursor Trail Particles Layer */}
      <div ref={trailContainerRef} className="interactive-cursor-trail-layer" aria-hidden="true" />
    </>
  );
};

export default InteractiveBackground;
