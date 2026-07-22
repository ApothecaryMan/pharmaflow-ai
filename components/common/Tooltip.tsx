import type React from 'react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import { Z_INDEX } from '../../src/styles/z-index';

/*
const R = 10,
  AW = 14,
  AH = 6;

const genPath = (w: number, h: number, s: string, ax: number, ay: number) => {
  const isT = s === 'top',
    isB = s === 'bottom',
    isL = s === 'left',
    isR = s === 'right';
  let d = `M ${R},${isB ? AH : 0} `;
  if (isB)
    d += `L ${ax - AW / 2},${AH} C ${ax - AW / 4},${AH} ${ax - AW / 8},0 ${ax},0 C ${ax + AW / 8},0 ${ax + AW / 4},${AH} ${ax + AW / 2},${AH} `;
  d += `L ${w - R},${isB ? AH : 0} Q ${w},${isB ? AH : 0} ${w},${isB ? AH + R : R} `;
  if (isL)
    d += `L ${w},${ay - AW / 2} C ${w},${ay - AW / 4} ${w + AH},${ay - AW / 8} ${w + AH},${ay} C ${w + AH},${ay + AW / 8} ${w},${ay + AW / 4} ${w},${ay + AW / 2} `;
  d += `L ${w},${isT ? h - AH - R : h - R} Q ${w},${isT ? h - AH : h} ${w - R},${isT ? h - AH : h} `;
  if (isT)
    d += `L ${ax + AW / 2},${h - AH} C ${ax + AW / 4},${h - AH} ${ax + AW / 8},${h} ${ax},${h} C ${ax - AW / 8},${h} ${ax - AW / 4},${h - AH} ${ax - AW / 2},${h - AH} `;
  d += `L ${R},${isT ? h - AH : h} Q 0,${isT ? h - AH : h} 0,${isT ? h - AH - R : h - R} `;
  if (isR)
    d += `L 0,${ay + AW / 2} C 0,${ay + AW / 4} ${-AH},${ay + AW / 8} ${-AH},${ay} C ${-AH},${ay - AW / 8} 0,${ay - AW / 4} 0,${ay - AW / 2} `;
  return `${d}L 0,${isB ? AH + R : R} Q 0,${isB ? AH : 0} ${R},${isB ? AH : 0} Z`;
};
*/

const VG = 4;

export const Tooltip: React.FC<{
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
  disabled?: boolean;
  fillColor?: string;
  textColor?: string;
}> = ({
  children,
  content,
  position = 'top',
  delay = 300,
  className = '',
  triggerClassName = '',
  tooltipClassName = '',
  disabled = false,
  fillColor,
  textColor,
}) => {
  let tooltipStyle = 'default';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional fallback pattern
    const themeContext = useTheme();
    tooltipStyle = themeContext.tooltipStyle;
  } catch (_e) {
    // Fallback if rendered outside ThemeProvider
  }
  const [show, setShow] = useState(false),
    [side, setSide] = useState(position);
  const trigRef = useRef<HTMLDivElement>(null),
    toolRef = useRef<HTMLDivElement>(null),
    contentRef = useRef<HTMLDivElement>(null),
    timeout = useRef<any>(null);

  useLayoutEffect(() => {
    if (!show || !trigRef.current || !toolRef.current || !contentRef.current) return;
    const upd = () => {
      const tr = trigRef.current?.getBoundingClientRect(),
        cw = contentRef.current?.offsetWidth,
        ch = contentRef.current?.offsetHeight,
        vw = window.innerWidth,
        vh = window.innerHeight,
        gap = 6; // slightly larger gap for a clean floating look
      let s = position;

      // Box style defaults to side placement instead of top
      if (tooltipStyle === 'box' && position === 'top') {
        s = 'right';
      }

      if (s === 'top' && tr.top < ch + gap) s = 'bottom';
      else if (s === 'bottom' && vh - tr.bottom < ch + gap) s = 'top';
      else if (s === 'left' && tr.left < cw + gap) s = 'right';
      else if (s === 'right' && vw - tr.right < cw + gap) s = 'left';
      setSide(s);
      
      const x =
        s === 'top' || s === 'bottom'
          ? Math.max(VG, Math.min(tr.left + tr.width / 2 - cw / 2, vw - cw - VG))
          : s === 'left'
            ? tr.left - cw - gap
            : tr.right + gap;
      const y =
        s === 'top' || s === 'bottom'
          ? s === 'top'
            ? tr.top - ch - gap
            : tr.bottom + gap
          : Math.max(VG, Math.min(tr.top + tr.height / 2 - ch / 2, vh - ch - VG));
          
      const tl = toolRef.current!;
      tl.style.setProperty('--tx', `${x}px`);
      tl.style.setProperty('--ty', `${y}px`);
      tl.dataset.settled = 'true';
    };
    upd();
    const obs = new ResizeObserver(upd);
    obs.observe(trigRef.current);
    obs.observe(contentRef.current);

    let frameId: number | null = null;
    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(() => {
        upd();
        frameId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [show, position, tooltipStyle]);

  const appearDelay = tooltipStyle === 'box' ? 0 : delay;
  const exitDelay = tooltipStyle === 'box' ? 0 : 150;

  const hE = () => {
    if (disabled) return;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setShow(true), appearDelay);
  };
  const hL = () => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setShow(false), exitDelay);
  };

  return (
    <div role="button" tabIndex={0} className={`relative w-fit ${className}`} onMouseEnter={hE} onMouseLeave={hL}>
      <div ref={trigRef} className={`flex items-center min-w-0 max-w-full ${triggerClassName}`}>
        {children}
      </div>
      {show &&
        createPortal(
          <div
            ref={toolRef}
            role="button"
            tabIndex={0}
            data-settled='false'
            onMouseEnter={hE}
            onMouseLeave={hL}
            className={`fixed pointer-events-auto z-[${Z_INDEX.TOOLTIP}] ${tooltipClassName}`}
            style={{ top: 'var(--ty)', left: 'var(--tx)', zIndex: Z_INDEX.TOOLTIP }}
          >
            <div
              className={`relative group rounded-[10px] shadow-xl ${
                fillColor ? '' : 'bg-black/90 dark:bg-white/10 backdrop-blur-md glass-edge'
              }`}
              style={{
                backgroundColor: fillColor || undefined,
              }}
            >
              <div
                ref={contentRef}
                className={`relative z-10 font-medium tracking-tight whitespace-nowrap w-max text-[12px] px-3 py-1.5 ${
                  textColor ? '' : 'text-stone-50 dark:text-white'
                }`}
                style={{
                  color: textColor || undefined,
                }}
              >
                {content}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

