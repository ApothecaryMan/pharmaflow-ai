import React from 'react';

export interface DecorationDef {
  id: string;
  name: string;
  nameAr: string;
  svg: React.ReactNode;
}

export const AVATAR_DECORATIONS: DecorationDef[] = [
  {
    id: 'none',
    name: 'None',
    nameAr: 'بدون',
    svg: null,
  },
  {
    id: 'cat_ears',
    name: 'Cat Ears',
    nameAr: 'آذان القط',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -30)'>
          <g transform='rotate(-24, 34, 48)'>
            <path d='M20,48 Q34,4 48,48 Q34,46 20,48Z' fill='#D4A574' stroke='#B8864E' strokeWidth='1.5' />
            <path d='M26,46 Q34,18 42,46 Q34,44 26,46Z' fill='#FFB6C1' />
          </g>
          <g transform='rotate(24, 94, 48)'>
            <path d='M80,48 Q94,4 108,48 Q94,46 80,48Z' fill='#D4A574' stroke='#B8864E' strokeWidth='1.5' />
            <path d='M86,46 Q94,18 102,46 Q94,44 86,46Z' fill='#FFB6C1' />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 'crown',
    name: 'Crown',
    nameAr: 'تاج',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -26)'>
          <path
            d='M12,52 L20,20 L34,36 L48,12 L62,36 L76,20 L90,36 L104,12 L116,52 Z'
            fill='#F5D742'
            stroke='#D4A017'
            strokeWidth='1.5'
          />
          <rect x='12' y='44' width='104' height='10' rx='2' fill='#F5D742' stroke='#D4A017' strokeWidth='1' />
          <circle cx='34' cy='16' r='3' fill='#E85D5D' />
          <circle cx='64' cy='12' r='4' fill='#5DA8E8' />
          <circle cx='94' cy='16' r='3' fill='#5DE87A' />
          <circle cx='20' cy='48' r='2.5' fill='#E85D5D' />
          <circle cx='48' cy='48' r='2.5' fill='#5DA8E8' />
          <circle cx='64' cy='48' r='3' fill='#E85D5D' />
          <circle cx='80' cy='48' r='2.5' fill='#5DE87A' />
          <circle cx='108' cy='48' r='2.5' fill='#E85D5D' />
        </g>
      </svg>
    ),
  },
  {
    id: 'angel_wings',
    name: 'Angel Wings',
    nameAr: 'أجنحة الملاك',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g opacity='0.9'>
          <path
            d='M2,70 Q-8,44 6,30 Q18,18 30,26 Q26,34 22,42 Q18,50 14,58 Q12,62 10,66Z'
            fill='#F0F8FF'
            stroke='#C8DCE8'
            strokeWidth='1'
          />
          <path
            d='M6,58 Q0,46 10,34 Q16,26 24,32 Q20,40 16,48Z'
            fill='#FFFFFF'
            stroke='#D8E8F0'
            strokeWidth='0.5'
          />
          <path
            d='M126,70 Q136,44 122,30 Q110,18 98,26 Q102,34 106,42 Q110,50 114,58 Q116,62 118,66Z'
            fill='#F0F8FF'
            stroke='#C8DCE8'
            strokeWidth='1'
          />
          <path
            d='M122,58 Q128,46 118,34 Q112,26 104,32 Q108,40 112,48Z'
            fill='#FFFFFF'
            stroke='#D8E8F0'
            strokeWidth='0.5'
          />
        </g>
      </svg>
    ),
  },
  {
    id: 'flower_crown',
    name: 'Flower Crown',
    nameAr: 'إكليل الزهور',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -14)'>
          <circle cx='32' cy='36' r='8' fill='#FF6B9D' />
          <circle cx='32' cy='36' r='4' fill='#FFD700' />
          <circle cx='48' cy='26' r='7' fill='#FF9F43' />
          <circle cx='48' cy='26' r='3.5' fill='#FFD700' />
          <circle cx='64' cy='20' r='9' fill='#FF6B9D' />
          <circle cx='64' cy='20' r='4.5' fill='#FFD700' />
          <circle cx='80' cy='26' r='7' fill='#C084FC' />
          <circle cx='80' cy='26' r='3.5' fill='#FFD700' />
          <circle cx='96' cy='36' r='8' fill='#FF9F43' />
          <circle cx='96' cy='36' r='4' fill='#FFD700' />
        </g>
      </svg>
    ),
  },
  {
    id: 'star_halo',
    name: 'Star Halo',
    nameAr: 'هالة النجوم',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -5)'>
          {[
            { x: 20, y: 32, s: 8 },
            { x: 42, y: 14, s: 6 },
            { x: 64, y: 6, s: 10 },
            { x: 86, y: 14, s: 6 },
            { x: 108, y: 32, s: 8 },
          ].map(({ x, y, s }, i) => {
            const points = [];
            for (let j = 0; j < 10; j++) {
              const angle = (j * Math.PI) / 5 - Math.PI / 2;
              const r = j % 2 === 0 ? s : s * 0.4;
              points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
            }
            return (
              <polygon
                key={i}
                points={points.join(' ')}
                fill='#FFD700'
                stroke='#DAA520'
                strokeWidth='0.8'
                opacity={0.85}
              />
            );
          })}
        </g>
      </svg>
    ),
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    nameAr: 'فراشة',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(90, 16)'>
          <path
            d='M0,16 C-14,-4 -10,-20 0,-28 C10,-20 14,-4 0,16Z'
            fill='#C084FC'
            stroke='#9333EA'
            strokeWidth='1'
            opacity='0.85'
          />
          <path
            d='M0,16 C-12,8 -8,24 0,28 C8,24 12,8 0,16Z'
            fill='#E9D5FF'
            stroke='#9333EA'
            strokeWidth='0.8'
            opacity='0.85'
          />
          <path
            d='M0,16 C-6,0 -4,-8 0,-12 C4,-8 6,0 0,16Z'
            fill='#F3E8FF'
            opacity='0.6'
          />
          <line x1='0' y1='28' x2='0' y2='-28' stroke='#7C3AED' strokeWidth='0.5' opacity='0.4' />
        </g>
      </svg>
    ),
  },
  {
    id: 'devil_horns',
    name: 'Devil Horns',
    nameAr: 'قرون الشيطان',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g transform='translate(0, -14)'>
          <path
            d='M22,48 Q14,24 26,8 Q30,2 36,6 Q38,10 36,18 Q34,26 30,36 Q28,42 26,48Z'
            fill='#DC2626'
            stroke='#991B1B'
            strokeWidth='1.5'
          />
          <path
            d='M106,48 Q114,24 102,8 Q98,2 92,6 Q90,10 92,18 Q94,26 98,36 Q100,42 102,48Z'
            fill='#DC2626'
            stroke='#991B1B'
            strokeWidth='1.5'
          />
        </g>
      </svg>
    ),
  },
  {
    id: 'heart',
    name: 'Heart',
    nameAr: 'قلب',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g>
          {[
            { x: 98, y: 36, s: 10 },
            { x: 30, y: 30, s: 8 },
            { x: 110, y: 60, s: 6 },
            { x: 14, y: 58, s: 7 },
            { x: 64, y: 8, s: 9 },
          ].map(({ x, y, s }, i) => (
            <path
              key={i}
              d={`M${x},${y + s * 0.3}
                 C${x - s * 0.6},${y - s * 0.2}
                 ${x - s * 0.8},${y - s * 0.7}
                 ${x},${y - s * 0.2}
                 C${x + s * 0.8},${y - s * 0.7}
                 ${x + s * 0.6},${y - s * 0.2}
                 ${x},${y + s * 0.3}Z`}
              fill='#FF4D6D'
              stroke='#E82555'
              strokeWidth='0.8'
              opacity={0.8}
            />
          ))}
        </g>
      </svg>
    ),
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    nameAr: 'ندفة الثلج',
    svg: (
      <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
        <g stroke='#60A5FA' strokeWidth='1.5' strokeLinecap='round' opacity='0.8'>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const r1 = 42;
            const r2 = 56;
            return (
              <line
                key={i}
                x1={64 + r1 * cos}
                y1={64 + r1 * sin}
                x2={64 + r2 * cos}
                y2={64 + r2 * sin}
              />
            );
          })}
          {[30, 90, 150, 210, 270, 330].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const r1 = 46;
            const r2 = 52;
            return (
              <line
                key={i + 6}
                x1={64 + r1 * cos}
                y1={64 + r1 * sin}
                x2={64 + r2 * cos}
                y2={64 + r2 * sin}
              />
            );
          })}
        </g>
        <circle cx='64' cy='64' r='3' fill='#93C5FD' stroke='none' />
        <circle cx='64' cy='8' r='3.5' fill='#93C5FD' stroke='none' opacity='0.7' />
        <circle cx='64' cy='120' r='3.5' fill='#93C5FD' stroke='none' opacity='0.7' />
        <circle cx='8' cy='64' r='3.5' fill='#93C5FD' stroke='none' opacity='0.7' />
        <circle cx='120' cy='64' r='3.5' fill='#93C5FD' stroke='none' opacity='0.7' />
      </svg>
    ),
  },
];

export const DECORATION_MAP = new Map(AVATAR_DECORATIONS.map((d) => [d.id, d]));

export const getDecoration = (id: string | null | undefined): React.ReactNode => {
  if (!id) return null;
  return DECORATION_MAP.get(id)?.svg ?? null;
};
