import type React from 'react';

interface EidNavbarGradientProps {
  customGradient:
    | {
        colors: string[];
      }
    | undefined;
}

export const EidNavbarGradient: React.FC<EidNavbarGradientProps> = ({ customGradient }) => {
  if (!customGradient) return null;

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden='true'>
      <linearGradient id='navbar-event-gradient'>
        {customGradient.colors.map((c: string, i: number) => (
          <stop
            key={c}
            offset={`${i * (100 / (customGradient.colors.length - 1))}%`}
            stopColor={c}
          />
        ))}
      </linearGradient>
    </svg>
  );
};
