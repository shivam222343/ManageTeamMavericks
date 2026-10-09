import React, { useEffect, useRef } from 'react';
import './MapCursorBackground.css';

/**
 * MapCursorBackground Component
 * Implements:
 * 1. Animated moving road & dot grid map background
 * 2. Mouse/touch parallax on map & background glow
 * 3. 8 floating glowing particles
 * 4. 4 pulsing blue location pins
 * 5. White glowing desktop cursor core
 * 6. Smooth blue glowing cursor / touch particle trail (20 on desktop, 12 on mobile)
 */
const MapCursorBackground = () => {
  const containerRef = useRef(null);
  const cursorCoreRef = useRef(null);
  const trailContainerRef = useRef(null);

  useEffect(() => {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const isMobile = window.matchMedia('(max-width: 700px)').matches;

    const mapStrength = isMobile ? 15 : 35;
    const glowStrength = isMobile ? 100 : 250;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let isVisible = false;

    // Movement listeners
    const handleMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      isVisible = true;
      if (cursorCoreRef.current) {
        cursorCoreRef.current.style.opacity = '1';
      }
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      targetX = touch.clientX;
      targetY = touch.clientY;
      isVisible = true;
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      targetX = touch.clientX;
      targetY = touch.clientY;
      isVisible = true;
    };

    const handleMouseLeave = () => {
      if (cursorCoreRef.current) {
        cursorCoreRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Particle Trail Setup
    const particleCount = isMobile ? 12 : 20;
    const particles = [];
    const trailContainer = trailContainerRef.current;

    if (trailContainer) {
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'map-cursor-particle';
        particle.style.left = `${targetX}px`;
        particle.style.top = `${targetY}px`;
        trailContainer.appendChild(particle);

        particles.push({
          element: particle,
          x: targetX,
          y: targetY,
        });
      }
    }

    let animationFrameId;

    const animate = () => {
      // Smooth interpolation
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      // Update Desktop Cursor Core
      if (!isTouchDevice && cursorCoreRef.current) {
        cursorCoreRef.current.style.left = `${currentX}px`;
        cursorCoreRef.current.style.top = `${currentY}px`;
      }

      // Normalized coordinates
      const normalizedX = currentX / window.innerWidth - 0.5;
      const normalizedY = currentY / window.innerHeight - 0.5;

      // Parallax values
      const mapX = normalizedX * mapStrength;
      const mapY = normalizedY * mapStrength;
      const glowX = normalizedX * glowStrength;
      const glowY = normalizedY * glowStrength;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--map-x', `${mapX}px`);
        containerRef.current.style.setProperty('--map-y', `${mapY}px`);
        containerRef.current.style.setProperty('--glow-x', `${glowX}px`);
        containerRef.current.style.setProperty('--glow-y', `${glowY}px`);
      }

      // Update particle trail
      let previousX = currentX;
      let previousY = currentY;

      particles.forEach((particle, index) => {
        const speed = index === 0 ? 0.3 : 0.2;
        particle.x += (previousX - particle.x) * speed;
        particle.y += (previousY - particle.y) * speed;

        particle.element.style.left = `${particle.x}px`;
        particle.element.style.top = `${particle.y}px`;

        const scale = 1 - (index / particleCount) * 0.7;
        particle.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
        particle.element.style.opacity = `${(1 - (index / particleCount) * 0.75) * (isVisible ? 1 : 0)}`;

        previousX = particle.x;
        previousY = particle.y;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 2;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      particles.forEach((p) => {
        if (p.element && p.element.parentNode) {
          p.element.parentNode.removeChild(p.element);
        }
      });
    };
  }, []);

  return (
    <>
      {/* Fixed Background Effect (Behind all page elements) */}
      <div ref={containerRef} className="map-effect-background" aria-hidden="true">
        {/* Continuous Animated Map */}
        <div className="map-effect-layer" />

        {/* Cursor & Touch Following Radial Glow */}
        <div className="map-effect-glow" />

        {/* Dark Vignette Overlay */}
        <div className="map-effect-overlay" />

        {/* 8 Floating Particles */}
        <div className="map-floating-particle p1" />
        <div className="map-floating-particle p2" />
        <div className="map-floating-particle p3" />
        <div className="map-floating-particle p4" />
        <div className="map-floating-particle p5" />
        <div className="map-floating-particle p6" />
        <div className="map-floating-particle p7" />
        <div className="map-floating-particle p8" />

        {/* 4 Pulsing Blue Location Pins */}
        <div className="map-location-pin pin1" />
        <div className="map-location-pin pin2" />
        <div className="map-location-pin pin3" />
        <div className="map-location-pin pin4" />
      </div>

      {/* Cursor Elements (Floating above page without blocking clicks) */}
      <div ref={cursorCoreRef} className="map-cursor-core" aria-hidden="true" />
      <div ref={trailContainerRef} aria-hidden="true" />
    </>
  );
};

export default MapCursorBackground;
