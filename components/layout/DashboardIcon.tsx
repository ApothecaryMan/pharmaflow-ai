import React from 'react';

interface DashboardIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const DashboardIcon: React.FC<DashboardIconProps> = ({ className, style }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      width="24"
      height="24"
    >
      {/* Top Left: Circle */}
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="2" />
      
      {/* Top Right: Square */}
      <rect x="13" y="2.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      
      {/* Bottom Left: Square */}
      <rect x="2.5" y="13" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      
      {/* Bottom Right: Square with Plus */}
      <g>
        <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" fillOpacity="0.5" />
        {/* Plus Sign */}
        <path d="M17.5 15.5V19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15.5 17.5H19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};
