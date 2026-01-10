import React, { useEffect, useState } from 'react';
import { useStatusBar } from '../StatusBarContext';

interface AnnouncementBannerProps {
  /** Speed in pixels per second */
  scrollSpeed?: number;
  /** Whether to show scroll animation */
  animated?: boolean;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  scrollSpeed = 50,
  animated = true,
}) => {
  const { state, setAnnouncement } = useStatusBar();
  const [isHovered, setIsHovered] = useState(false);

  if (!state.announcement) {
    return null;
  }

  return (
    <div 
      className="flex-1 flex items-center justify-center overflow-hidden mx-4 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`flex items-center gap-2 text-[11px] whitespace-nowrap ${
          animated && !isHovered ? 'animate-marquee' : ''
        }`}
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="material-symbols-rounded text-[14px] text-amber-500">
          campaign
        </span>
        <span>{state.announcement}</span>
      </div>

      {/* Close button */}
      <button
        onClick={() => setAnnouncement(null)}
        className="absolute right-0 p-0.5 text-gray-400 hover:text-gray-600 transition-colors opacity-0 hover:opacity-100"
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        <span className="material-symbols-rounded text-[12px]">close</span>
      </button>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee ${20}s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBanner;
