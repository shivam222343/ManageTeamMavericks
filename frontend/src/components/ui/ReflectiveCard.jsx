'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import './ReflectiveCard.css';
import { Fingerprint, Activity, Lock, CameraOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ReflectiveCard = ({
  // Visual customization props from original specification
  blurStrength = 0,
  color,
  metalness = 1,
  roughness = 0.4,
  overlayColor,
  displacementStrength = 20,
  noiseScale = 1,
  specularConstant = 1.2,
  grayscale = 1,
  glassDistortion = 0,
  className = '',
  style = {},

  // User profile information props
  name = 'ALEXANDER DOE',
  role = 'SENIOR DEVELOPER',
  idNumber = '8901-2345-6789',
  badgeText = 'SECURE ACCESS',
  extraInfo,
  showAvatar = false,

  // Theme & interaction options
  theme: explicitTheme,
  interactive = true,
  enableWebcam = true
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const rawId = useId();
  const filterId = `metallic-displacement-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Theme resolution (dark or light)
  let contextTheme = 'dark';
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      contextTheme = themeContext.theme;
    }
  } catch {
    if (typeof document !== 'undefined') {
      contextTheme = document.body.classList.contains('light') ? 'light' : 'dark';
    }
  }

  const activeTheme = explicitTheme || contextTheme || 'dark';
  const isDark = activeTheme === 'dark';

  // Webcam state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);
  const [userToggledOff, setUserToggledOff] = useState(!enableWebcam);
  const streamRef = useRef(null);

  // 3D tilt interaction state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Webcam stream management
  useEffect(() => {
    if (userToggledOff || !enableWebcam) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
      return;
    }

    let isMounted = true;

    const startWebcam = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          if (isMounted) setIsCameraAvailable(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
        setIsCameraAvailable(true);
      } catch (err) {
        // Camera access denied or unavailable; graceful fallback occurs
        if (isMounted) {
          setIsCameraActive(false);
          console.info('Webcam reflection inactive or permission declined:', err.message);
        }
      }
    };

    startWebcam();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [userToggledOff, enableWebcam]);

  const toggleWebcam = (e) => {
    e.stopPropagation();
    setUserToggledOff((prev) => !prev);
  };

  // 3D Tilt handlers
  const handleMouseMove = (e) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 12, y: -y * 12 });
  };

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  // Math for filters and colors
  const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
  const saturation = 1 - Math.max(0, Math.min(1, grayscale));

  // Dual Theme Adaptive Colors:
  // If caller passes #ffffff or white, adapt to dark slate in light theme for readability
  const effectiveTextColor =
    color && color !== '#ffffff' && color !== 'white'
      ? color
      : isDark
      ? color || '#ffffff'
      : '#0f172a';

  // If caller passes dark rgba overlay, adapt to frosted white overlay in light theme
  const effectiveOverlayColor = overlayColor
    ? isDark
      ? overlayColor
      : overlayColor.includes('0, 0, 0') || overlayColor.includes('0,0,0')
      ? 'rgba(255, 255, 255, 0.42)'
      : overlayColor
    : isDark
    ? 'rgba(0, 0, 0, 0.22)'
    : 'rgba(255, 255, 255, 0.42)';

  const effectiveBrightness = isDark ? '110%' : '122%';

  const cssVariables = {
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--overlay-color': effectiveOverlayColor,
    '--text-color': effectiveTextColor,
    '--saturation': saturation,
    '--brightness': effectiveBrightness,
    '--filter-url': `url(#${filterId})`
  };

  const transformStyle = interactive
    ? {
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(1.02, 1.02, 1.02)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
      }
    : {};

  return (
    <div className="reflective-card-wrapper">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`reflective-card-container ${isDark ? 'reflective-card--dark' : 'reflective-card--light'} ${className}`}
        style={{
          ...style,
          ...cssVariables,
          ...transformStyle
        }}
      >
        {/* SVG Filters for Metallic Displacement and Light Reflections */}
        <svg className="reflective-svg-filters" aria-hidden="true">
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="turbulence"
                baseFrequency={baseFrequency}
                numOctaves="2"
                result="noise"
              />
              <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={displacementStrength}
                xChannelSelector="R"
                yChannelSelector="G"
                result="rippled"
              />
              <feSpecularLighting
                in="noiseAlpha"
                surfaceScale={displacementStrength}
                specularConstant={specularConstant}
                specularExponent="20"
                lightingColor="#ffffff"
                result="light"
              >
                <fePointLight x="0" y="0" z="300" />
              </feSpecularLighting>
              <feComposite in="light" in2="rippled" operator="in" result="light-effect" />
              <feBlend in="light-effect" in2="rippled" mode="screen" result="metallic-result" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="solidAlpha"
              />
              <feMorphology in="solidAlpha" operator="erode" radius="45" result="erodedAlpha" />
              <feGaussianBlur in="erodedAlpha" stdDeviation="10" result="blurredMap" />
              <feComponentTransfer in="blurredMap" result="glassMap">
                <feFuncA type="linear" slope="0.5" intercept="0" />
              </feComponentTransfer>
              <feDisplacementMap
                in="metallic-result"
                in2="glassMap"
                scale={glassDistortion}
                xChannelSelector="A"
                yChannelSelector="A"
                result="final"
              />
            </filter>
          </defs>
        </svg>

        {/* Dynamic Fallback Shimmer Backdrop (Active beneath video or when camera is offline) */}
        <div className="reflective-fallback" />

        {/* Live Camera Video with SVG Displacement Filter */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="reflective-video"
          style={{ opacity: isCameraActive ? 0.92 : 0 }}
        />

        {/* Physical Material Overlays */}
        <div className="reflective-noise" />
        <div className="reflective-sheen" />
        <div className="reflective-border" />

        {/* Card Interactive Content */}
        <div className="reflective-content">
          {/* Header */}
          <div className="card-header">
            <div className="security-badge">
              <Lock size={12} className="security-icon" />
              <span>{badgeText}</span>
            </div>

            <div className="header-actions">
              {isCameraAvailable && (
                <button
                  type="button"
                  onClick={toggleWebcam}
                  className="camera-toggle-btn"
                  title={
                    isCameraActive
                      ? 'Camera reflection active (click to turn off)'
                      : 'Camera reflection off (click to enable)'
                  }
                  aria-label="Toggle camera reflection"
                >
                  {isCameraActive ? (
                    <span className="camera-pulse-dot" />
                  ) : (
                    <CameraOff size={13} className="text-zinc-400" />
                  )}
                </button>
              )}
              <Activity className="status-icon" size={18} />
            </div>
          </div>

          {/* Body */}
          <div className="card-body">
            <div className="user-info">
              {showAvatar && name && (
                <div className="user-avatar-chip">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="user-name">{name}</h2>
              <p className="user-role">{role}</p>
              {extraInfo && <p className="user-extra">{extraInfo}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="card-footer">
            <div className="id-section">
              <span className="label">ID NUMBER</span>
              <span className="value">{idNumber}</span>
            </div>
            <div className="fingerprint-section">
              <Fingerprint size={32} className="fingerprint-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReflectiveCard;
