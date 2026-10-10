'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './StrokeText.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DEFAULT_TEXT = 'Team Mavericks • Student Organization';

const StrokeText = ({
  text = DEFAULT_TEXT,
  strokeColor = '#A78BFA',
  fillColor = '#F8FAFC',
  strokeWidth = 1.4,
  drawDuration = 1.6,
  fillDelay = 0.2,
  stagger = 0.05,
  ease = 'power2.out',
  trigger = 'mount',
  fillMode = 'wipe',
  fontSize = 128,
  fontWeight = 800,
  fontFamily = 'inherit',
  letterSpacing = 0,
  uppercase = false,
  align = 'left',
  reverse = false,
  className = '',
  style = {}
}) => {
  const rootRef = useRef(null);
  const strokeTextRef = useRef(null);
  const wipeRectRef = useRef(null);

  const [box, setBox] = useState(null);

  const rawId = useId();
  const wipeId = `stroke-text-wipe-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const characters = useMemo(() => {
    const raw = String(text ?? '');
    const processed = uppercase ? raw.toUpperCase() : raw;
    return Array.from(processed);
  }, [text, uppercase]);

  const numericFontSize = useMemo(() => {
    return typeof fontSize === 'number' ? fontSize : parseFloat(fontSize) || 24;
  }, [fontSize]);

  const dash = Math.max(numericFontSize * 7, 200);

  const fontStyle = useMemo(
    () => ({
      fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
      fontWeight,
      fontFamily: fontFamily || 'inherit',
      letterSpacing: typeof letterSpacing === 'number' ? `${letterSpacing}px` : letterSpacing,
      whiteSpace: 'pre'
    }),
    [fontSize, fontWeight, fontFamily, letterSpacing]
  );

  useLayoutEffect(() => {
    const node = strokeTextRef.current;
    if (!node) return undefined;

    let cancelled = false;

    const measure = () => {
      if (cancelled || !strokeTextRef.current) return;
      let bbox;
      try {
        bbox = strokeTextRef.current.getBBox();
      } catch {
        return;
      }
      if (!bbox || !bbox.width) return;

      const pad = Math.max(Number(strokeWidth) || 1, numericFontSize * 0.08);
      const next = {
        x: bbox.x - pad,
        y: bbox.y - pad,
        width: bbox.width + pad * 2,
        height: bbox.height + pad * 2
      };

      setBox(prev =>
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.y - next.y) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
          ? prev
          : next
      );
    };

    measure();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    const rafId = requestAnimationFrame(measure);

    const handleResize = () => {
      measure();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [characters, fontSize, numericFontSize, fontWeight, letterSpacing, strokeWidth, fontFamily, uppercase]);

  useEffect(() => {
    const root = rootRef.current;
    if (typeof window === 'undefined' || !root || !box) return undefined;

    const strokes = gsap.utils.toArray(root.querySelectorAll('[data-stroke-char]'));
    const fills = gsap.utils.toArray(root.querySelectorAll('[data-fill-char]'));
    const wipe = wipeRectRef.current;
    if (!strokes.length) return undefined;

    const fillEnabled = fillMode !== 'none';
    const useWipe = fillEnabled && fillMode === 'wipe';
    const fillDuration = Math.max(0.4, drawDuration * 0.5);
    const staggerConfig = reverse ? { each: stagger, from: 'end' } : stagger;
    const targets = [...strokes, ...fills, wipe].filter(Boolean);

    const setStart = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: dash });
      gsap.set(fills, { opacity: useWipe ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: 0 } });
    };

    const setEnd = () => {
      gsap.killTweensOf(targets);
      gsap.set(strokes, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(fills, { opacity: fillEnabled ? 1 : 0 });
      if (wipe) gsap.set(wipe, { attr: { width: fillEnabled ? box.width : 0 } });
    };

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setEnd();
      return () => gsap.killTweensOf(targets);
    }

    const build = () => {
      setStart();
      const tl = gsap.timeline({
        paused: true,
        repeat: trigger === 'loop' ? -1 : 0,
        repeatDelay: trigger === 'loop' ? 0.9 : 0,
        defaults: { overwrite: 'auto' }
      });

      tl.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease, stagger: staggerConfig }, 0);

      if (useWipe && wipe) {
        tl.to(
          wipe,
          { attr: { width: box.width }, duration: fillDuration, ease: 'power2.inOut' },
          drawDuration + fillDelay
        );
      } else if (fillEnabled) {
        tl.to(
          fills,
          { opacity: 1, duration: fillDuration, ease: 'power2.out', stagger: staggerConfig },
          drawDuration + fillDelay
        );
      }

      return tl;
    };

    let timeline = null;
    let scrollTrigger = null;
    let removeHover = null;

    if (trigger === 'hover') {
      setEnd();
      const play = () => {
        timeline?.kill();
        timeline = build();
        timeline.play(0);
      };
      root.addEventListener('pointerenter', play);
      removeHover = () => root.removeEventListener('pointerenter', play);
    } else {
      timeline = build();
      if (trigger === 'scroll') {
        scrollTrigger = ScrollTrigger.create({
          trigger: root,
          start: 'top 85%',
          once: true,
          onEnter: () => timeline?.play(0)
        });
      } else {
        timeline.play(0);
      }
    }

    return () => {
      removeHover?.();
      scrollTrigger?.kill();
      timeline?.kill();
      gsap.killTweensOf(targets);
    };
  }, [box, dash, drawDuration, fillDelay, stagger, ease, trigger, fillMode, reverse]);

  const estimatedWidth = useMemo(() => {
    const len = Math.max(characters.length, 1);
    const numSpacing = typeof letterSpacing === 'number' ? letterSpacing : parseFloat(letterSpacing) || 0;
    return Math.ceil(len * (numericFontSize * 0.7 + numSpacing) + 20);
  }, [characters.length, numericFontSize, letterSpacing]);

  const viewBox = box
    ? `${box.x} ${box.y} ${box.width} ${box.height}`
    : `0 ${-numericFontSize} ${estimatedWidth} ${Math.round(numericFontSize * 1.35)}`;

  const preserveAspectRatio =
    align === 'center' ? 'xMidYMid meet' : align === 'right' ? 'xMaxYMid meet' : 'xMinYMid meet';

  const containerHeight = box
    ? `${Math.ceil(box.height)}px`
    : `${Math.round(numericFontSize * 1.35)}px`;

  return (
    <span
      ref={rootRef}
      className={`stroke-text ${trigger === 'hover' ? 'stroke-text--hover' : ''} ${className}`.trim()}
      style={{
        ...style,
        '--stroke-text-height': containerHeight,
        maxWidth: box ? `${Math.ceil(box.width)}px` : '100%'
      }}
      role="img"
      aria-label={String(text ?? '')}
    >
      <svg
        className="stroke-text__svg"
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
        xmlSpace="preserve"
        aria-hidden="true"
      >
        {fillMode === 'wipe' && box && (
          <defs>
            <clipPath id={wipeId} clipPathUnits="userSpaceOnUse">
              <rect ref={wipeRectRef} x={box.x} y={box.y} width="0" height={box.height} />
            </clipPath>
          </defs>
        )}

        <text
          ref={strokeTextRef}
          className="stroke-text__stroke"
          x="0"
          y="0"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={fontStyle}
        >
          {characters.map((char, index) => {
            const isSpace = char === ' ' || char === '\u00A0';
            return (
              <tspan
                key={`s-${index}`}
                data-stroke-char={!isSpace ? true : undefined}
                style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
              >
                {isSpace ? '\u00A0' : char}
              </tspan>
            );
          })}
        </text>

        <text
          className="stroke-text__fill"
          x="0"
          y="0"
          fill={fillColor}
          stroke="none"
          style={fontStyle}
          clipPath={fillMode === 'wipe' && box ? `url(#${wipeId})` : undefined}
        >
          {characters.map((char, index) => {
            const isSpace = char === ' ' || char === '\u00A0';
            return (
              <tspan
                key={`f-${index}`}
                data-fill-char={!isSpace ? true : undefined}
                style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
              >
                {isSpace ? '\u00A0' : char}
              </tspan>
            );
          })}
        </text>
      </svg>
    </span>
  );
};

export default StrokeText;
