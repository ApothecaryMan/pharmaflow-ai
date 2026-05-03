import type React from 'react';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../context';
import { Z_INDEX } from '../../src/styles/z-index';

interface TooltipProps {
  children: ReactNode; content: string | ReactNode; position?: 'top' | 'bottom';
  className?: string; tooltipClassName?: string; triggerClassName?: string; delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children, content, position = 'top', className = '', tooltipClassName = '', triggerClassName = '', delay = 300,
}) => {
  const { tooltipBlur } = useSettings(), [show, setShow] = useState(false), timeout = useRef<any>(null);
  const trigRef = useRef<HTMLDivElement>(null), toolRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!show || !trigRef.current || !toolRef.current) return;
    let rafId: number;
    const upd = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!trigRef.current || !toolRef.current) return;
        const tr = trigRef.current.getBoundingClientRect(), tl = toolRef.current, gap = 8;
        const tw = tl.offsetWidth, th = tl.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
        let side = position, y = side === 'top' ? tr.top - th - gap : tr.bottom + gap;
        if (side === 'top' && tr.top < th + gap && vh - tr.bottom > th + gap) side = 'bottom';
        else if (side === 'bottom' && vh - tr.bottom < th + gap && tr.top > th + gap) side = 'top';
        y = side === 'top' ? tr.top - th - gap : tr.bottom + gap;
        let x = Math.max(10, Math.min(tr.left + tr.width/2 - tw/2, vw - tw - 10));
        tl.style.setProperty('--tx', `${x}px`); tl.style.setProperty('--ty', `${y}px`);
        tl.style.setProperty('--ax', `${Math.max(6, Math.min(tr.left + tr.width/2 - x, tw - 6))}px`);
        tl.dataset.side = side; tl.dataset.settled = 'true';
      });
    };
    const obs = new ResizeObserver(upd); obs.observe(trigRef.current); obs.observe(document.body);
    upd(); window.addEventListener('scroll', upd, true);
    return () => { 
      obs.disconnect(); 
      window.removeEventListener('scroll', upd, true); 
      cancelAnimationFrame(rafId);
    };
  }, [show, content]);

  const enter = () => { 
    if (timeout.current) clearTimeout(timeout.current); 
    timeout.current = setTimeout(() => setShow(true), delay); 
  };
  const leave = () => { 
    if (timeout.current) clearTimeout(timeout.current); 
    timeout.current = setTimeout(() => setShow(false), 150); 
  };

  return (
    <div className={`relative w-fit ${className}`} onMouseEnter={enter} onMouseLeave={leave}>
      <div ref={trigRef} className={`flex items-center min-w-0 max-w-full ${triggerClassName}`}>{children}</div>
      {show && createPortal(
        <div ref={toolRef} data-settled="false" data-side={position}
          onMouseEnter={enter} onMouseLeave={leave}
          className={`group fixed px-2 py-1 rounded-lg border pointer-events-auto whitespace-nowrap shadow-2xl transition-opacity duration-150 opacity-0 data-[settled=true]:opacity-100 ${tooltipBlur ? 'backdrop-blur-xl bg-(--bg-menu)/80 saturate-150 border-(--border-divider)' : 'bg-(--bg-menu) border-(--border-divider)'} text-gray-900 dark:text-white text-[10px] ${tooltipClassName}`}
          style={{ top: 'var(--ty)', left: 'var(--tx)', zIndex: Z_INDEX.TOOLTIP }}
        >
          <div className="relative z-10">{content}</div>
          {!tooltipBlur && (
            <div className="absolute w-2.5 h-2.5 bg-(--bg-menu) border-(--border-divider)
              group-data-[side=top]:top-full group-data-[side=top]:-mt-[5px] group-data-[side=top]:border-r group-data-[side=top]:border-b
              group-data-[side=bottom]:bottom-full group-data-[side=bottom]:-mb-[5px] group-data-[side=bottom]:border-t group-data-[side=bottom]:border-l"
              style={{ left: 'var(--ax)', transform: 'translateX(-50%) rotate(45deg)' }}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
