import type React from 'react';

const LogoAsterisk = ({
  color = 'currentColor',
  scale = 1.4,
}: {
  color?: string;
  scale?: number;
}) => (
  <svg
    viewBox='0 0 140 140'
    className='w-12 h-12 text-zinc-900 dark:text-white animate-spin'
    style={{ animationDuration: '2s' }}
  >
    <title>Loading</title>
    <g transform={`translate(70 70) scale(${scale})`} fill={color}>
      <rect x='-4' y='-35' width='8' height='70' rx='.5' transform='rotate(45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(-45)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(90)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(135)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(180)' />
      <rect x='-4' y='-35' width='8' height='20' rx='.5' transform='rotate(270)' />
    </g>
  </svg>
);

export const AppLoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className='h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-black'>
    <div className='flex flex-col items-center gap-4'>
      <LogoAsterisk />
      <p
        className='py-2 text-2xl sm:text-3xl !font-["GraphicSansFont"] tracking-tight leading-normal text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-400 to-zinc-900 dark:from-zinc-100 dark:via-zinc-500 dark:to-zinc-100 animate-wave-text text-center'
        style={{
          fontFeatureSettings:
            '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
        }}
      >
        {message}
      </p>
    </div>
  </div>
);
