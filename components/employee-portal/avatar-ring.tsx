import React from 'react';

export type RingStyle = 'solid' | 'dashes' | 'dots' | 'double' | 'rainbow' | 'animated';

export const RING_STYLES: { id: RingStyle; name: string; nameAr: string }[] = [
  { id: 'solid', name: 'Solid', nameAr: 'صلب' },
  { id: 'dashes', name: 'Dashes', nameAr: 'شرط' },
  { id: 'dots', name: 'Dots', nameAr: 'نقاط' },
  { id: 'double', name: 'Double', nameAr: 'مزدوج' },
  { id: 'rainbow', name: 'Rainbow', nameAr: 'قوس قزح' },
  { id: 'animated', name: 'Animated', nameAr: 'متحرك' },
];

interface AvatarRingProps {
  color: string;
  style: RingStyle;
  thickness: number;
  animated: boolean;
  className?: string;
}

interface AnimationToggleProps {
  animating: boolean;
  onToggle: () => void;
  isRTL?: boolean;
}

export const AnimationToggle: React.FC<AnimationToggleProps> = ({ animating, onToggle, isRTL }) => (
  <button
    type='button'
    onClick={onToggle}
    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all duration-150 border flex items-center gap-1.5 ${
      animating
        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
        : 'bg-(--bg-secondary) text-(--text-secondary) border-(--border-secondary) hover:border-primary-300 dark:hover:border-primary-600'
    }`}
  >
    <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'>
      {animating ? (
        <>
          <rect x='6' y='4' width='4' height='16' rx='1' />
          <rect x='14' y='4' width='4' height='16' rx='1' />
        </>
      ) : (
        <polygon points='5,3 19,12 5,21' />
      )}
    </svg>
    {animating
      ? (isRTL ? 'متحرك' : 'Animate')
      : (isRTL ? 'تشغيل' : 'Play')}
  </button>
);

const AvatarRing: React.FC<AvatarRingProps> = ({ color, style, thickness, animated, className }) => {
  const cx = 64;
  const cy = 64;
  const r = 56 - thickness / 2;
  const circ = 2 * Math.PI * r;

  let dashArray: string | undefined;
  if (style === 'dashes') {
    const dl = circ / 20;
    dashArray = `${dl * 0.65} ${dl * 0.35}`;
  } else if (style === 'dots') {
    const dl = circ / 28;
    dashArray = `1 ${dl}`;
  }

  const strokeWidth = style === 'dots' ? thickness * 1.4 : thickness;

  const useAnimGrad = animated && style !== 'rainbow';

  return (
    <svg viewBox='0 0 128 128' fill='none' className={`w-full h-full ${className || ''}`}>
      <defs>
        {style === 'rainbow' && (
          <linearGradient id='ring-rainbow-grad' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor={color} />
            <stop offset='25%' stopColor='#eb459e' />
            <stop offset='50%' stopColor='#fee75c' />
            <stop offset='75%' stopColor='#57F287' />
            <stop offset='100%' stopColor={color} />
            {animated && (
              <animateTransform
                attributeName='gradientTransform'
                type='rotate'
                from='0'
                to='360'
                dur='3s'
                repeatCount='indefinite'
              />
            )}
          </linearGradient>
        )}
        {useAnimGrad && (
          <linearGradient id='ring-anim-grad' gradientTransform='rotate(0)'>
            <stop offset='0%' stopColor={color} stopOpacity='1' />
            <stop offset='35%' stopColor={color} stopOpacity='0.15' />
            <stop offset='100%' stopColor={color} stopOpacity='1' />
            <animateTransform
              attributeName='gradientTransform'
              type='rotate'
              from='0'
              to='360'
              dur='3s'
              repeatCount='indefinite'
            />
          </linearGradient>
        )}
      </defs>

      {style === 'double' ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={Math.max(4, r - thickness * 1.2)}
            fill='none'
            stroke={useAnimGrad ? 'url(#ring-anim-grad)' : color}
            strokeWidth={thickness * 0.55}
            strokeLinecap='round'
          />
          <circle
            cx={cx}
            cy={cy}
            r={Math.max(4, r + thickness * 1.2)}
            fill='none'
            stroke={useAnimGrad ? 'url(#ring-anim-grad)' : color}
            strokeWidth={thickness * 0.55}
            strokeLinecap='round'
          />
        </>
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={
            useAnimGrad
              ? 'url(#ring-anim-grad)'
              : style === 'rainbow'
                ? 'url(#ring-rainbow-grad)'
                : color
          }
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={dashArray}
        />
      )}
    </svg>
  );
};

export default AvatarRing;
