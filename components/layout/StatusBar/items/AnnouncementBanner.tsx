import React, { useState, useMemo } from 'react';
import { useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';

interface AnnouncementBannerProps {
  scrollSpeed?: number; // Duration in seconds
  animated?: boolean;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  scrollSpeed = 20,
  animated = true,
}) => {
  const { state, setAnnouncement } = useStatusBar();
  const [isHovered, setIsHovered] = useState(false);

  const isVisible = !!state.announcement;

  const content = useMemo(() => (
    <div
      className={`flex items-center gap-2 text-[11px] whitespace-nowrap ${animated && !isHovered ? 'animate-marquee' : ''}`}
      style={{ 
        color: 'var(--text-secondary)',
        animationDuration: `${scrollSpeed}s`
      } as React.CSSProperties}
    >
      <span className="material-symbols-rounded text-amber-500" style={{ fontSize: '14px' }}>campaign</span>
      <span className="font-medium">{state.announcement}</span>
    </div>
  ), [state.announcement, animated, isHovered, scrollSpeed]);

  if (!isVisible) return null;

  return (
    <StatusBarItem className="flex-1 overflow-hidden mx-4 relative group p-0 hover:bg-transparent">
      <div
        className="flex items-center justify-center w-full h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}

        <button
          onClick={() => setAnnouncement(null)}
          className="absolute right-0 p-1 text-(--text-tertiary) hover:text-(--text-primary) transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>close</span>
        </button>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(50%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </StatusBarItem>
  );
};

export default AnnouncementBanner;
