import React, { useState, useRef, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../context';
import { Z_INDEX } from '../../src/styles/z-index';

const R = 6, AW = 14, AH = 6, VG = 4;

const genPath = (w: number, h: number, s: string, ax: number, ay: number) => {
  const isT = s === 'top', isB = s === 'bottom', isL = s === 'left', isR = s === 'right';
  let d = `M ${R},${isB ? AH : 0} `;
  if (isB) d += `L ${ax-AW/2},${AH} C ${ax-AW/4},${AH} ${ax-AW/8},0 ${ax},0 C ${ax+AW/8},0 ${ax+AW/4},${AH} ${ax+AW/2},${AH} `;
  d += `L ${w-R},${isB ? AH : 0} Q ${w},${isB ? AH : 0} ${w},${isB ? AH+R : R} `;
  if (isL) d += `L ${w},${ay-AW/2} C ${w},${ay-AW/4} ${w+AH},${ay-AW/8} ${w+AH},${ay} C ${w+AH},${ay+AW/8} ${w},${ay+AW/4} ${w},${ay+AW/2} `;
  d += `L ${w},${isT ? h-AH-R : h-R} Q ${w},${isT ? h-AH : h} ${w-R},${isT ? h-AH : h} `;
  if (isT) d += `L ${ax+AW/2},${h-AH} C ${ax+AW/4},${h-AH} ${ax+AW/8},${h} ${ax},${h} C ${ax-AW/8},${h} ${ax-AW/4},${h-AH} ${ax-AW/2},${h-AH} `;
  d += `L ${R},${isT ? h-AH : h} Q 0,${isT ? h-AH : h} 0,${isT ? h-AH-R : h-R} `;
  if (isR) d += `L 0,${ay+AW/2} C 0,${ay+AW/4} ${-AH},${ay+AW/8} ${-AH},${ay} C ${-AH},${ay-AW/8} 0,${ay-AW/4} 0,${ay-AW/2} `;
  return d + `L 0,${isB ? AH+R : R} Q 0,${isB ? AH : 0} ${R},${isB ? AH : 0} Z`;
};

export const Tooltip: React.FC<{ children: ReactNode; content: ReactNode; position?: 'top' | 'bottom' | 'left' | 'right'; delay?: number; className?: string; triggerClassName?: string; tooltipClassName?: string; }> = ({
  children, content, position = 'top', delay = 300, className = '', triggerClassName = '', tooltipClassName = ''
}) => {
  const { tooltipBlur } = useSettings(), [show, setShow] = useState(false), [side, setSide] = useState(position);
  const trigRef = useRef<HTMLDivElement>(null), toolRef = useRef<HTMLDivElement>(null), contentRef = useRef<HTMLDivElement>(null), timeout = useRef<any>(null), [path, setPath] = useState('');

  useLayoutEffect(() => {
    if (!show || !trigRef.current || !toolRef.current || !contentRef.current) return;
    const upd = () => {
      const tr = trigRef.current!.getBoundingClientRect(), cw = contentRef.current!.offsetWidth, ch = contentRef.current!.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 4;
      let s = position;
      if (s === 'top' && tr.top < ch + gap) s = 'bottom'; else if (s === 'bottom' && vh - tr.bottom < ch + gap) s = 'top';
      setSide(s);
      let x = (s === 'top' || s === 'bottom') ? Math.max(VG, Math.min(tr.left + tr.width/2 - cw/2, vw - cw - VG)) : (s === 'left' ? tr.left - cw - gap : tr.right + gap);
      let y = (s === 'top' || s === 'bottom') ? (s === 'top' ? tr.top - ch - gap : tr.bottom + gap) : Math.max(VG, Math.min(tr.top + tr.height/2 - ch/2, vh - ch - VG));
      const ax = Math.max(R + AW/2, Math.min(tr.left + tr.width/2 - x, cw - R - AW/2)), ay = Math.max(R + AW/2, Math.min(tr.top + tr.height/2 - y, ch - R - AW/2));
      const tl = toolRef.current!; tl.style.setProperty('--tx', `${x}px`); tl.style.setProperty('--ty', `${y}px`); tl.dataset.settled = 'true';
      setPath(genPath(cw, ch, s, ax, ay));
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
  }, [show, content, position]);

  const hE = () => { if (timeout.current) clearTimeout(timeout.current); timeout.current = setTimeout(() => setShow(true), delay); };
  const hL = () => { if (timeout.current) clearTimeout(timeout.current); timeout.current = setTimeout(() => setShow(false), 150); };

  return (
    <div className={`relative w-fit ${className}`} onMouseEnter={hE} onMouseLeave={hL}>
      <div ref={trigRef} className={`flex items-center min-w-0 max-w-full ${triggerClassName}`}>{children}</div>
      {show && createPortal(
        <div ref={toolRef} data-settled="false" onMouseEnter={hE} onMouseLeave={hL}
          className={`fixed pointer-events-auto z-[${Z_INDEX.TOOLTIP}] ${tooltipClassName}`}
          style={{ top: 'var(--ty)', left: 'var(--tx)', zIndex: Z_INDEX.TOOLTIP }}>
          <div className={`relative group ${tooltipBlur ? 'backdrop-blur-2xl' : ''}`} style={{ WebkitBackdropFilter: tooltipBlur ? 'blur(20px) saturate(200%)' : 'none', borderRadius: R }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>
              <path d={path || ''} className={`${tooltipBlur ? 'fill-(--bg-menu)/80' : 'fill-(--bg-menu)'} stroke-(--border-divider) stroke-[0.8]`} style={{ strokeOpacity: 0.6 }} />
            </svg>
            <div ref={contentRef} className="relative z-10 px-2.5 py-1 text-(--text-primary) text-[11px] font-semibold tracking-tight whitespace-nowrap w-max"
              style={{ paddingTop: side === 'bottom' ? AH + 4 : 4, paddingBottom: side === 'top' ? AH + 4 : 4, paddingLeft: side === 'right' ? AH + 7 : 7, paddingRight: side === 'left' ? AH + 7 : 7 }}>
              {content}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};
