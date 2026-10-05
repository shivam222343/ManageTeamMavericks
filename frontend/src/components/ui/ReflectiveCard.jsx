'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import './ReflectiveCard.css';
import { Fingerprint, Activity, Lock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ReflectiveCard = ({
  blurStrength = 0,
  color,
  metalness = 0.5,
  roughness = 0.1,
  overlayColor,
  displacementStrength = 0,
  noiseScale = 1,
  specularConstant = 1.2,
  grayscale = 0,
  glassDistortion = 0,
  className = '',
  style = {},
  // Optional direct photo/avatar URL
  image,
  avatarUrl,
  // User profile information props with fallbacks
  name = 'ALEXANDER DOE',
  role = 'SENIOR DEVELOPER',
  idNumber = '8901-2345-6789',
  badgeText = 'SECURE ACCESS',
  theme: themeProp = 'auto',
  children
}) => {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const rawId = useId();
  const filterId = `metallic-displacement-${rawId.replace(/[^a-zA-Z0-9-_]/g, '')}`;

  // Theme resolution (detects from context/DOM or takes explicit prop)
  let contextTheme = 'dark';
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      contextTheme = themeContext.theme;
    }
  } catch {
    if (typeof document !== 'undefined') {
      contextTheme =
        document.body.classList.contains('dark') ||
        document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light';
    }
  }

  const isDark = themeProp === 'auto' ? contextTheme === 'dark' : themeProp === 'dark';
  const effectiveTheme = isDark ? 'dark' : 'light';

  // Suitable defaults for Dark vs Light theme if not explicitly overridden
  const resolvedColor =
    color !== undefined ? color : isDark ? '#ffffff' : '#0f172a';

  const defaultOverlay = isDark
    ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.06) 25%, rgba(0, 0, 0, 0.06) 65%, rgba(0, 0, 0, 0.7) 100%)'
    : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.12) 25%, rgba(255, 255, 255, 0.12) 65%, rgba(255, 255, 255, 0.8) 100%)';

  const resolvedOverlayColor =
    overlayColor !== undefined ? overlayColor : defaultOverlay;

  const displayImage = image || avatarUrl;

  useEffect(() => {
    if (displayImage) return;

    let stream = null;
    let isMounted = true;

    const startWebcam = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user'
          }
        });

        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setHasCamera(true);
        }
      } catch (err) {
        if (isMounted) {
          setHasCamera(false);
        }
      }
    };

    startWebcam();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [displayImage]);

  const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
  const saturation = 1 - Math.max(0, Math.min(1, grayscale));

  const cssVariables = {
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--overlay-color': resolvedOverlayColor,
    '--text-color': resolvedColor,
    '--saturation': saturation,
    '--brightness': isDark ? '102%' : '100%',
    '--contrast': isDark ? '106%' : '102%',
    ...style
  };

  const hasFilterEffects = displacementStrength > 0 || glassDistortion > 0;
  const videoFilter = [
    `saturate(var(--saturation, ${saturation}))`,
    `contrast(var(--contrast, 105%))`,
    `brightness(var(--brightness, 100%))`,
    blurStrength > 0 ? `blur(var(--blur-strength, ${blurStrength}px))` : null,
    hasFilterEffects ? `url(#${filterId})` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`reflective-card-container ${effectiveTheme} ${className}`}
      style={cssVariables}
    >
      {/* SVG filter only rendered if displacement effects are requested */}
      {hasFilterEffects && (
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
      )}

      {/* Subtle ambient metallic gradient base */}
      <div className="reflective-ambient-bg" />

      {/* Clear Image or Live Mirrored Webcam Video */}
      {displayImage ? (
        <img
          src={displayImage}
          alt={name}
          className="reflective-video has-stream"
          style={{ filter: videoFilter }}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`reflective-video ${hasCamera ? 'has-stream' : 'no-stream'}`}
          style={{ filter: videoFilter }}
        />
      )}

      {/* Clear fallback portrait if camera is inactive and no image provided */}
      {!displayImage && !hasCamera && (
        <div className="reflective-clear-avatar">
          <div className="avatar-circle">
            <span className="avatar-letter">{name?.charAt(0) || 'M'}</span>
          </div>
          <span className="avatar-label">TEAM MAVERICKS VERIFIED</span>
        </div>
      )}

      <div className="reflective-noise" />
      <div className="reflective-sheen" />
      <div className="reflective-border" />

      {children ? (
        <div className="reflective-content">{children}</div>
      ) : (
        <div className="reflective-content">
          <div className="card-header">
            <div className="security-badge">
              <Lock size={14} className="security-icon" />
              <span>{badgeText}</span>
            </div>
            <Activity className="status-icon" size={20} />
          </div>

          <div className="card-body">
            <div className="user-info">
              <h2 className="user-name">{name}</h2>
              <p className="user-role">{role}</p>
            </div>
          </div>

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
      )}
    </div>
  );
};

export default ReflectiveCard;
