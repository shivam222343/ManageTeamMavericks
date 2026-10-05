import React, { isValidElement, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import './BranchedMenu.css';

const PAD = 4;
const MARK = 18;

const renderIcon = (icon) => {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function') {
    const IconComp = icon;
    return <IconComp size={15} />;
  }
  return null;
};

const toSet = (open) => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : []);

export default function BranchedMenu({
  items = [],
  active: controlledActive,
  defaultOpen = [0],
  defaultActive = '',
  onSelect,
  onToggle,
  color = 'var(--bm-ink-color, currentColor)',
  accentColor = '#3b82f6',
  lineColor = 'var(--bm-line-color, rgba(161, 161, 170, 0.3))',
  width = 240,
  rowHeight = 34,
  indent = 36,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 13,
  drawDuration = 400,
  foldDuration = 300,
  className = ''
}) {
  const [open, setOpen] = useState(() => toSet(defaultOpen));
  const [internalActive, setInternalActive] = useState(() => {
    if (controlledActive !== undefined) return controlledActive;
    if (defaultActive) return defaultActive;
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? items[0]?.value ?? '';
  });

  const active = controlledActive !== undefined ? controlledActive : internalActive;

  // Automatically keep parent section open if a child inside is active
  useEffect(() => {
    if (active) {
      const parentIdx = items.findIndex(it => 
        it.value === active || it.children?.some(kid => kid.value === active || kid.path === active)
      );
      if (parentIdx >= 0 && items[parentIdx].children) {
        setOpen(prev => {
          if (!prev.has(parentIdx)) {
            const next = new Set(prev);
            next.add(parentIdx);
            return next;
          }
          return prev;
        });
      }
    }
  }, [active, items]);

  const navRef = useRef(null);
  const heads = useRef([]);
  const markerRef = useRef(null);
  const latest = useRef({});
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex(it => 
    it.value === active || it.children?.some(kid => kid.value === active || kid.path === active)
  );
  const markerShown = activeSection >= 0 && (items[activeSection]?.children ? open.has(activeSection) : true);

  useLayoutEffect(() => {
    const place = (glide) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on) m.style.top = `${el.offsetTop + (el.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  const select = (value, item) => {
    if (controlledActive === undefined) {
      setInternalActive(value);
    }
    latest.current.onSelect?.(value, item);
  };

  const toggle = (i) => {
    setOpen(prev => {
      const next = new Set(prev);
      const isOpen = !next.has(i);
      if (isOpen) next.add(i);
      else next.delete(i);
      latest.current.onToggle?.(i, isOpen);
      return next;
    });
  };

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 6;
  const rowY = (k) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  return (
    <nav
      ref={navRef}
      className={`branched-menu${className ? ` ${className}` : ''}`}
      style={{
        '--bm-w': `${width}px`,
        '--bm-ink': color,
        '--bm-accent': accentColor,
        '--bm-line': lineColor,
        '--bm-font': `${fontSize}px`,
        '--bm-row': `${rowHeight}px`,
        '--bm-indent': `${indent}px`,
        '--bm-line-w': lineWidth,
        '--bm-draw': `${drawDuration}ms`,
        '--bm-fold': `${foldDuration}ms`
      }}
    >
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.path ?? item.label;
        const leafActive = !kids && (leafValue === active || item.path === active);
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;

        return (
          <div key={leafValue || i} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            <button
              ref={el => {
                heads.current[i] = el;
              }}
              type="button"
              className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined}
              aria-current={leafActive ? 'true' : undefined}
              data-active={leafActive ? '' : undefined}
              onClick={() => (kids ? toggle(i) : select(leafValue, item))}
            >
              <div className="branched-menu__head-content">
                {item.icon && (
                  <span className="branched-menu__icon" aria-hidden="true">
                    {renderIcon(item.icon)}
                  </span>
                )}
                <span className="branched-menu__label">{item.label}</span>
              </div>
              {kids && (
                <span className="branched-menu__head-arrow" aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              )}
            </button>

            {kids ? (
              <div className="branched-menu__body">
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => (
                        <path key={kid.value ?? kid.path ?? k} className="branched-menu__base" d={branch(k)} />
                      ))}
                      {kids.map((kid, k) => {
                        const kidVal = kid.value ?? kid.path ?? kid.label;
                        const isKidActive = kidVal === active || kid.path === active;
                        return (
                          <path
                            key={kidVal}
                            className="branched-menu__reach"
                            d={reach(k)}
                            style={{
                              strokeDasharray: length(k),
                              strokeDashoffset: isKidActive ? 0 : length(k)
                            }}
                          />
                        );
                      })}
                    </svg>
                    {kids.map(kid => {
                      const kidVal = kid.value ?? kid.path ?? kid.label;
                      const isKidActive = kidVal === active || kid.path === active;
                      return (
                        <button
                          key={kidVal}
                          type="button"
                          className="branched-menu__item"
                          aria-current={isKidActive ? 'true' : undefined}
                          data-active={isKidActive ? '' : undefined}
                          tabIndex={isOpen ? 0 : -1}
                          onClick={() => select(kidVal, kid)}
                        >
                          {kid.icon ? (
                            <span className="branched-menu__icon" aria-hidden="true">
                              {renderIcon(kid.icon)}
                            </span>
                          ) : null}
                          <span className="branched-menu__label">{kid.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
