import type React from 'react';

export interface BannerStyle {
  id:
    | 'pharma'
    | 'synthwave'
    | 'abstract'
    | 'cyberhex'
    | 'lightning'
    | 'anime'
    | 'floral'
    | 'pattern'
    | 'burst'
    | 'chaos';
  nameEN: string;
  nameAR: string;
  accentColor: string;
  render: () => React.ReactNode;
}

export const BANNER_STYLES: BannerStyle[] = [
  {
    id: 'pharma',
    nameEN: 'Pharma',
    nameAR: 'صيدلي',
    accentColor: '#0d9488',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 40%, #1e3a8a 100%)' }}
      >
        <svg
          className='absolute end-4 bottom-2 opacity-20 w-32 h-32 text-teal-300'
          viewBox='0 0 100 100'
          fill='currentColor'
        >
          <title>Molecular network pattern</title>
          <circle cx='20' cy='30' r='4' />
          <circle cx='50' cy='20' r='5' />
          <circle cx='80' cy='40' r='4' />
          <circle cx='50' cy='60' r='6' />
          <circle cx='20' cy='80' r='5' />
          <line x1='20' y1='30' x2='50' y2='20' stroke='currentColor' strokeWidth='1' />
          <line x1='50' y1='20' x2='80' y2='40' stroke='currentColor' strokeWidth='1' />
          <line x1='80' y1='40' x2='50' y2='60' stroke='currentColor' strokeWidth='1' />
          <line x1='50' y1='60' x2='20' y2='80' stroke='currentColor' strokeWidth='1' />
          <line x1='20' y1='80' x2='20' y2='30' stroke='currentColor' strokeWidth='1' />
          <line x1='50' y1='20' x2='50' y2='60' stroke='currentColor' strokeWidth='1' />
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-black/40 to-transparent' />
      </div>
    ),
  },
  {
    id: 'synthwave',
    nameEN: 'Synthwave',
    nameAR: 'مستقبلي نيون',
    accentColor: '#ec4899',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(180deg, #1f1035 0%, #0b0518 100%)' }}
      >
        <div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-gradient-to-t from-pink-500 to-amber-400 opacity-50 filter blur-[2px]' />
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#e11d4812_1px,transparent_1px),linear-gradient(to_bottom,#e11d4812_1px,transparent_1px)] bg-[size:14px_14px] opacity-40' />
        <div className='absolute inset-0 bg-gradient-to-t from-pink-500/10 to-transparent' />
      </div>
    ),
  },
  {
    id: 'abstract',
    nameEN: 'Abstract',
    nameAR: 'تجريدي',
    accentColor: '#8b5cf6',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 50%, #3b82f6 100%)' }}
      >
        <div className='absolute -top-8 -left-8 w-28 h-28 rounded-full bg-amber-400/30 filter blur-xl animate-pulse' />
        <div className='absolute -bottom-8 right-8 w-32 h-32 rounded-full bg-cyan-400/30 filter blur-xl animate-pulse' />
        <div className='absolute inset-0 bg-black/10' />
      </div>
    ),
  },
  {
    id: 'cyberhex',
    nameEN: 'Cyberhex',
    nameAR: 'سيبر شبكي',
    accentColor: '#10b981',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)' }}
      >
        <div className='absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] bg-[size:10px_10px]' />
        <div className='absolute top-3 end-3 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-ping' />
        <div className='absolute top-3 end-3 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]' />
        <div className='absolute bottom-3 start-3 w-20 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent opacity-60' />
      </div>
    ),
  },
  {
    id: 'lightning',
    nameEN: 'Lightning',
    nameAR: 'رعد وبرق',
    accentColor: '#a855f7',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #090514 0%, #160a2c 100%)' }}
      >
        <svg
          className='absolute inset-0 w-full h-full opacity-50 text-purple-400 filter drop-shadow-[0_0_8px_#c084fc]'
          viewBox='0 0 400 144'
          fill='none'
          preserveAspectRatio='none'
        >
          <title>Synthwave grid pattern</title>
          <path
            d='M 150 0 L 130 50 L 170 45 L 140 100 L 190 90 L 160 144'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M 280 0 L 265 40 L 290 35 L 270 90 L 300 80 L 285 144'
            stroke='#38bdf8'
            strokeWidth='1.5'
            className='opacity-70 filter drop-shadow-[0_0_6px_#38bdf8]'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent' />
      </div>
    ),
  },
  {
    id: 'anime',
    nameEN: 'Anime Sky',
    nameAR: 'سماء أنمي',
    accentColor: '#f472b6',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{
          background: 'linear-gradient(180deg, #fdba74 0%, #f472b6 45%, #c084fc 80%, #6366f1 100%)',
        }}
      >
        <div className='absolute top-3 end-8 w-16 h-16 rounded-full bg-amber-100/40 filter blur-[1px] shadow-[0_0_20px_#fef3c7]' />
        <svg
          className='absolute bottom-0 w-full h-12 text-white/10'
          viewBox='0 0 400 50'
          fill='currentColor'
          preserveAspectRatio='none'
        >
          <title>Wave divider pattern</title>
          <path d='M-20 50 C 40 20, 80 20, 120 50 C 160 30, 200 30, 240 50 C 280 25, 320 25, 360 50 C 400 35, 420 35, 440 50 Z' />
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent' />
      </div>
    ),
  },
  {
    id: 'floral',
    nameEN: 'Floral',
    nameAR: 'ورود رقيقة',
    accentColor: '#f43f5e',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #fecdd3 0%, #ffe4e6 50%, #d1fae5 100%)' }}
      >
        <svg
          className='absolute inset-0 w-full h-full opacity-25 text-rose-500/80'
          viewBox='0 0 400 144'
          fill='currentColor'
          preserveAspectRatio='none'
        >
          <title>Floral petal pattern</title>
          <path d='M 50 40 C 45 30, 35 30, 40 40 C 30 35, 30 45, 40 50 C 35 60, 45 60, 50 50 C 55 60, 65 60, 60 50 C 70 45, 70 35, 60 40 C 65 30, 55 30, 50 40 Z' />
          <circle cx='50' cy='45' r='3' fill='#fbbf24' />
          <path d='M 320 70 C 315 60, 305 60, 310 70 C 300 65, 300 75, 310 80 C 305 90, 315 90, 320 80 C 325 90, 335 90, 330 80 C 340 75, 340 65, 330 70 C 335 60, 325 60, 320 70 Z' />
          <circle cx='320' cy='75' r='3' fill='#fbbf24' />
          <path
            d='M 200 30 C 195 20, 185 20, 190 30 C 180 25, 180 35, 190 40 C 185 50, 195 50, 200 40 C 205 50, 215 50, 210 40 C 220 35, 220 25, 210 30 C 215 20, 205 20, 200 30 Z'
            opacity='0.7'
          />
          <circle cx='200' cy='35' r='3' fill='#fbbf24' opacity='0.7' />
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-white/10 to-transparent' />
      </div>
    ),
  },
  {
    id: 'pattern',
    nameEN: 'Geometric Pattern',
    nameAR: 'نقش هندسي',
    accentColor: '#818cf8',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
          backgroundImage: `
            radial-gradient(circle at 20% 35%, rgba(129, 140, 248, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 75% 65%, rgba(244, 63, 94, 0.15) 0%, transparent 45%),
            radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 16px 16px',
        }}
      />
    ),
  },
  {
    id: 'burst',
    nameEN: 'Neon Burst',
    nameAR: 'انفجار نيون',
    accentColor: '#ec4899',
    render: () => (
      <div
        className='absolute inset-0 w-full h-full'
        style={{ background: 'linear-gradient(135deg, #0f051d 0%, #05010a 100%)' }}
      >
        <svg
          className='absolute inset-0 w-full h-full opacity-90'
          viewBox='0 0 800 800'
          preserveAspectRatio='xMidYMid slice'
        >
          <title>Cyber hexagonal grid pattern</title>
          <g fill='none' strokeWidth='3' stroke='hsl(335, 77%, 50%)' strokeLinecap='round'>
            <line
              x1='380.5'
              y1='400'
              x2='419.5'
              y2='400'
              transform='rotate(0, 400, 400)'
              opacity='0.69'
            />
            <line
              x1='430'
              y1='400'
              x2='370'
              y2='400'
              transform='rotate(4, 400, 400)'
              opacity='0.09'
            />
            <line
              x1='375'
              y1='400'
              x2='425'
              y2='400'
              transform='rotate(8, 400, 400)'
              opacity='0.77'
            />
            <line
              x1='79.5'
              y1='400'
              x2='720.5'
              y2='400'
              transform='rotate(12, 400, 400)'
              opacity='0.33'
            />
            <line
              x1='466.5'
              y1='400'
              x2='333.5'
              y2='400'
              transform='rotate(16, 400, 400)'
              opacity='0.86'
            />
            <line
              x1='579.5'
              y1='400'
              x2='220.5'
              y2='400'
              transform='rotate(20, 400, 400)'
              opacity='0.14'
            />
            <line
              x1='316'
              y1='400'
              x2='484'
              y2='400'
              transform='rotate(24, 400, 400)'
              opacity='0.34'
            />
            <line
              x1='172'
              y1='400'
              x2='628'
              y2='400'
              transform='rotate(28, 400, 400)'
              opacity='0.54'
            />
            <line
              x1='660.5'
              y1='400'
              x2='139.5'
              y2='400'
              transform='rotate(32, 400, 400)'
              opacity='0.35'
            />
            <line
              x1='111'
              y1='400'
              x2='689'
              y2='400'
              transform='rotate(36, 400, 400)'
              opacity='0.92'
            />
            <line
              x1='83'
              y1='400'
              x2='717'
              y2='400'
              transform='rotate(40, 400, 400)'
              opacity='0.19'
            />
            <line
              x1='535.5'
              y1='400'
              x2='264.5'
              y2='400'
              transform='rotate(44, 400, 400)'
              opacity='0.19'
            />
            <line
              x1='292'
              y1='400'
              x2='508'
              y2='400'
              transform='rotate(48, 400, 400)'
              opacity='0.44'
            />
            <line
              x1='112.5'
              y1='400'
              x2='687.5'
              y2='400'
              transform='rotate(52, 400, 400)'
              opacity='0.84'
            />
            <line
              x1='333'
              y1='400'
              x2='467'
              y2='400'
              transform='rotate(56, 400, 400)'
              opacity='0.41'
            />
            <line
              x1='23'
              y1='400'
              x2='777'
              y2='400'
              transform='rotate(60, 400, 400)'
              opacity='0.18'
            />
            <line
              x1='376.5'
              y1='400'
              x2='423.5'
              y2='400'
              transform='rotate(64, 400, 400)'
              opacity='0.22'
            />
            <line
              x1='621.5'
              y1='400'
              x2='178.5'
              y2='400'
              transform='rotate(68, 400, 400)'
              opacity='0.33'
            />
            <line
              x1='44'
              y1='400'
              x2='756'
              y2='400'
              transform='rotate(72, 400, 400)'
              opacity='0.98'
            />
            <line
              x1='606'
              y1='400'
              x2='194'
              y2='400'
              transform='rotate(76, 400, 400)'
              opacity='0.70'
            />
            <line
              x1='342.5'
              y1='400'
              x2='457.5'
              y2='400'
              transform='rotate(80, 400, 400)'
              opacity='0.54'
            />
            <line
              x1='712.5'
              y1='400'
              x2='87.5'
              y2='400'
              transform='rotate(84, 400, 400)'
              opacity='0.44'
            />
            <line
              x1='273.5'
              y1='400'
              x2='526.5'
              y2='400'
              transform='rotate(88, 400, 400)'
              opacity='0.18'
            />
            <line
              x1='54'
              y1='400'
              x2='746'
              y2='400'
              transform='rotate(92, 400, 400)'
              opacity='0.31'
            />
            <line
              x1='476.5'
              y1='400'
              x2='323.5'
              y2='400'
              transform='rotate(96, 400, 400)'
              opacity='0.22'
            />
            <line
              x1='140.5'
              y1='400'
              x2='659.5'
              y2='400'
              transform='rotate(100, 400, 400)'
              opacity='0.85'
            />
            <line
              x1='412.5'
              y1='400'
              x2='387.5'
              y2='400'
              transform='rotate(104, 400, 400)'
              opacity='0.11'
            />
            <line
              x1='426.5'
              y1='400'
              x2='373.5'
              y2='400'
              transform='rotate(108, 400, 400)'
              opacity='0.96'
            />
            <line
              x1='635.5'
              y1='400'
              x2='164.5'
              y2='400'
              transform='rotate(112, 400, 400)'
              opacity='0.92'
            />
            <line
              x1='89'
              y1='400'
              x2='711'
              y2='400'
              transform='rotate(116, 400, 400)'
              opacity='0.71'
            />
            <line
              x1='590'
              y1='400'
              x2='210'
              y2='400'
              transform='rotate(120, 400, 400)'
              opacity='0.09'
            />
            <line
              x1='662.5'
              y1='400'
              x2='137.5'
              y2='400'
              transform='rotate(124, 400, 400)'
              opacity='0.35'
            />
            <line
              x1='199'
              y1='400'
              x2='601'
              y2='400'
              transform='rotate(128, 400, 400)'
              opacity='0.10'
            />
            <line
              x1='566.5'
              y1='400'
              x2='233.5'
              y2='400'
              transform='rotate(132, 400, 400)'
              opacity='0.08'
            />
            <line
              x1='360.5'
              y1='400'
              x2='439.5'
              y2='400'
              transform='rotate(136, 400, 400)'
              opacity='0.74'
            />
            <line
              x1='359'
              y1='400'
              x2='441'
              y2='400'
              transform='rotate(140, 400, 400)'
              opacity='0.72'
            />
            <line
              x1='256'
              y1='400'
              x2='544'
              y2='400'
              transform='rotate(144, 400, 400)'
              opacity='0.94'
            />
            <line
              x1='325.5'
              y1='400'
              x2='474.5'
              y2='400'
              transform='rotate(148, 400, 400)'
              opacity='0.14'
            />
            <line
              x1='75.5'
              y1='400'
              x2='724.5'
              y2='400'
              transform='rotate(152, 400, 400)'
              opacity='0.17'
            />
            <line
              x1='165.5'
              y1='400'
              x2='634.5'
              y2='400'
              transform='rotate(156, 400, 400)'
              opacity='0.11'
            />
            <line
              x1='217'
              y1='400'
              x2='583'
              y2='400'
              transform='rotate(160, 400, 400)'
              opacity='0.79'
            />
            <line
              x1='376'
              y1='400'
              x2='424'
              y2='400'
              transform='rotate(164, 400, 400)'
              opacity='0.42'
            />
            <line
              x1='471'
              y1='400'
              x2='329'
              y2='400'
              transform='rotate(168, 400, 400)'
              opacity='0.19'
            />
            <line
              x1='344.5'
              y1='400'
              x2='455.5'
              y2='400'
              transform='rotate(172, 400, 400)'
              opacity='0.67'
            />
            <line
              x1='39.5'
              y1='400'
              x2='760.5'
              y2='400'
              transform='rotate(176, 400, 400)'
              opacity='0.61'
            />
            <line
              x1='27.5'
              y1='400'
              x2='772.5'
              y2='400'
              transform='rotate(180, 400, 400)'
              opacity='0.47'
            />
            <line
              x1='216'
              y1='400'
              x2='584'
              y2='400'
              transform='rotate(184, 400, 400)'
              opacity='0.19'
            />
            <line
              x1='735'
              y1='400'
              x2='65'
              y2='400'
              transform='rotate(188, 400, 400)'
              opacity='0.73'
            />
            <line
              x1='721'
              y1='400'
              x2='79'
              y2='400'
              transform='rotate(192, 400, 400)'
              opacity='0.48'
            />
            <line
              x1='283'
              y1='400'
              x2='517'
              y2='400'
              transform='rotate(196, 400, 400)'
              opacity='0.12'
            />
            <line
              x1='217.5'
              y1='400'
              x2='582.5'
              y2='400'
              transform='rotate(200, 400, 400)'
              opacity='0.88'
            />
            <line
              x1='606.5'
              y1='400'
              x2='193.5'
              y2='400'
              transform='rotate(204, 400, 400)'
              opacity='0.19'
            />
            <line
              x1='430'
              y1='400'
              x2='370'
              y2='400'
              transform='rotate(208, 400, 400)'
              opacity='0.95'
            />
            <line
              x1='558.5'
              y1='400'
              x2='241.5'
              y2='400'
              transform='rotate(212, 400, 400)'
              opacity='0.12'
            />
            <line
              x1='717'
              y1='400'
              x2='83'
              y2='400'
              transform='rotate(216, 400, 400)'
              opacity='0.56'
            />
            <line
              x1='494'
              y1='400'
              x2='306'
              y2='400'
              transform='rotate(220, 400, 400)'
              opacity='0.57'
            />
            <line
              x1='530.5'
              y1='400'
              x2='269.5'
              y2='400'
              transform='rotate(224, 400, 400)'
              opacity='0.82'
            />
            <line
              x1='660'
              y1='400'
              x2='140'
              y2='400'
              transform='rotate(228, 400, 400)'
              opacity='0.08'
            />
            <line
              x1='302'
              y1='400'
              x2='498'
              y2='400'
              transform='rotate(232, 400, 400)'
              opacity='0.39'
            />
            <line
              x1='622.5'
              y1='400'
              x2='177.5'
              y2='400'
              transform='rotate(236, 400, 400)'
              opacity='0.42'
            />
            <line
              x1='274.5'
              y1='400'
              x2='525.5'
              y2='400'
              transform='rotate(240, 400, 400)'
              opacity='0.98'
            />
            <line
              x1='598.5'
              y1='400'
              x2='201.5'
              y2='400'
              transform='rotate(244, 400, 400)'
              opacity='0.20'
            />
            <line
              x1='433'
              y1='400'
              x2='367'
              y2='400'
              transform='rotate(248, 400, 400)'
              opacity='0.67'
            />
            <line
              x1='233'
              y1='400'
              x2='567'
              y2='400'
              transform='rotate(252, 400, 400)'
              opacity='0.45'
            />
            <line
              x1='440.5'
              y1='400'
              x2='359.5'
              y2='400'
              transform='rotate(256, 400, 400)'
              opacity='0.10'
            />
            <line
              x1='324.5'
              y1='400'
              x2='475.5'
              y2='400'
              transform='rotate(260, 400, 400)'
              opacity='0.99'
            />
            <line
              x1='491'
              y1='400'
              x2='309'
              y2='400'
              transform='rotate(264, 400, 400)'
              opacity='0.93'
            />
            <line
              x1='148.5'
              y1='400'
              x2='651.5'
              y2='400'
              transform='rotate(268, 400, 400)'
              opacity='0.69'
            />
            <line
              x1='525.5'
              y1='400'
              x2='274.5'
              y2='400'
              transform='rotate(272, 400, 400)'
              opacity='0.90'
            />
            <line
              x1='270'
              y1='400'
              x2='530'
              y2='400'
              transform='rotate(276, 400, 400)'
              opacity='0.81'
            />
            <line
              x1='98'
              y1='400'
              x2='702'
              y2='400'
              transform='rotate(280, 400, 400)'
              opacity='0.41'
            />
            <line
              x1='580'
              y1='400'
              x2='220'
              y2='400'
              transform='rotate(284, 400, 400)'
              opacity='0.34'
            />
            <line
              x1='558'
              y1='400'
              x2='242'
              y2='400'
              transform='rotate(288, 400, 400)'
              opacity='0.69'
            />
            <line
              x1='327.5'
              y1='400'
              x2='472.5'
              y2='400'
              transform='rotate(292, 400, 400)'
              opacity='0.87'
            />
            <line
              x1='729'
              y1='400'
              x2='71'
              y2='400'
              transform='rotate(296, 400, 400)'
              opacity='0.43'
            />
            <line
              x1='708.5'
              y1='400'
              x2='91.5'
              y2='400'
              transform='rotate(300, 400, 400)'
              opacity='0.87'
            />
            <line
              x1='31'
              y1='400'
              x2='769'
              y2='400'
              transform='rotate(304, 400, 400)'
              opacity='0.79'
            />
            <line
              x1='299.5'
              y1='400'
              x2='500.5'
              y2='400'
              transform='rotate(308, 400, 400)'
              opacity='0.83'
            />
            <line
              x1='127'
              y1='400'
              x2='673'
              y2='400'
              transform='rotate(312, 400, 400)'
              opacity='0.32'
            />
            <line
              x1='535.5'
              y1='400'
              x2='264.5'
              y2='400'
              transform='rotate(316, 400, 400)'
              opacity='0.58'
            />
            <line
              x1='644'
              y1='400'
              x2='156'
              y2='400'
              transform='rotate(320, 400, 400)'
              opacity='0.65'
            />
            <line
              x1='209'
              y1='400'
              x2='591'
              y2='400'
              transform='rotate(324, 400, 400)'
              opacity='0.21'
            />
            <line
              x1='650.5'
              y1='400'
              x2='149.5'
              y2='400'
              transform='rotate(328, 400, 400)'
              opacity='0.90'
            />
            <line
              x1='176.5'
              y1='400'
              x2='623.5'
              y2='400'
              transform='rotate(332, 400, 400)'
              opacity='0.54'
            />
            <line
              x1='55'
              y1='400'
              x2='745'
              y2='400'
              transform='rotate(336, 400, 400)'
              opacity='0.08'
            />
            <line
              x1='520'
              y1='400'
              x2='280'
              y2='400'
              transform='rotate(340, 400, 400)'
              opacity='0.40'
            />
            <line
              x1='141'
              y1='400'
              x2='659'
              y2='400'
              transform='rotate(344, 400, 400)'
              opacity='0.82'
            />
            <line
              x1='389'
              y1='400'
              x2='411'
              y2='400'
              transform='rotate(348, 400, 400)'
              opacity='0.72'
            />
          </g>
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent' />
      </div>
    ),
  },

];

export const renderBanner = (
  id: string,
  offset?: { x: number; y: number },
  zoom: number = 1.2
): React.ReactNode => {
  const banner = BANNER_STYLES.find((b) => b.id === id);
  const content = banner ? banner.render() : BANNER_STYLES[0].render();

  return (
    <div className='absolute inset-0 w-full h-full overflow-hidden select-none'>
      <div
        className='w-full h-full origin-center'
        style={{
          transform: `scale(${zoom}) translate(${offset?.x ?? 0}px, ${offset?.y ?? 0}px)`,
        }}
      >
        {content}
      </div>
    </div>
  );
};
