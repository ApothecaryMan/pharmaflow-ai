import type React from 'react';

export interface BannerStyle {
  id: 'pharma' | 'synthwave' | 'abstract' | 'cyberhex' | 'lightning' | 'anime' | 'floral' | 'pattern';
  nameEN: string;
  nameAR: string;
  render: () => React.ReactNode;
}

export const BANNER_STYLES: BannerStyle[] = [
  {
    id: 'pharma',
    nameEN: 'Pharma',
    nameAR: 'صيدلي',
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 40%, #1e3a8a 100%)' }}>
        <svg className='absolute end-4 bottom-2 opacity-20 w-32 h-32 text-teal-300' viewBox='0 0 100 100' fill='currentColor'>
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
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(180deg, #1f1035 0%, #0b0518 100%)' }}>
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
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #8b5cf6 50%, #3b82f6 100%)' }}>
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
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)' }}>
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
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(135deg, #090514 0%, #160a2c 100%)' }}>
        <svg className='absolute inset-0 w-full h-full opacity-50 text-purple-400 filter drop-shadow-[0_0_8px_#c084fc]' viewBox='0 0 400 144' fill='none' preserveAspectRatio='none'>
          <path d='M 150 0 L 130 50 L 170 45 L 140 100 L 190 90 L 160 144' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          <path d='M 280 0 L 265 40 L 290 35 L 270 90 L 300 80 L 285 144' stroke='#38bdf8' strokeWidth='1.5' className='opacity-70 filter drop-shadow-[0_0_6px_#38bdf8]' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 to-transparent' />
      </div>
    ),
  },
  {
    id: 'anime',
    nameEN: 'Anime Sky',
    nameAR: 'سماء أنمي',
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(180deg, #fdba74 0%, #f472b6 45%, #c084fc 80%, #6366f1 100%)' }}>
        <div className='absolute top-3 end-8 w-16 h-16 rounded-full bg-amber-100/40 filter blur-[1px] shadow-[0_0_20px_#fef3c7]' />
        <svg className='absolute bottom-0 w-full h-12 text-white/10' viewBox='0 0 400 50' fill='currentColor' preserveAspectRatio='none'>
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
    render: () => (
      <div className='absolute inset-0 w-full h-full' style={{ background: 'linear-gradient(135deg, #fecdd3 0%, #ffe4e6 50%, #d1fae5 100%)' }}>
        <svg className='absolute inset-0 w-full h-full opacity-25 text-rose-500/80' viewBox='0 0 400 144' fill='currentColor' preserveAspectRatio='none'>
          <path d='M 50 40 C 45 30, 35 30, 40 40 C 30 35, 30 45, 40 50 C 35 60, 45 60, 50 50 C 55 60, 65 60, 60 50 C 70 45, 70 35, 60 40 C 65 30, 55 30, 50 40 Z' />
          <circle cx='50' cy='45' r='3' fill='#fbbf24' />
          <path d='M 320 70 C 315 60, 305 60, 310 70 C 300 65, 300 75, 310 80 C 305 90, 315 90, 320 80 C 325 90, 335 90, 330 80 C 340 75, 340 65, 330 70 C 335 60, 325 60, 320 70 Z' />
          <circle cx='320' cy='75' r='3' fill='#fbbf24' />
          <path d='M 200 30 C 195 20, 185 20, 190 30 C 180 25, 180 35, 190 40 C 185 50, 195 50, 200 40 C 205 50, 215 50, 210 40 C 220 35, 220 25, 210 30 C 215 20, 205 20, 200 30 Z' opacity='0.7' />
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
];

export const renderBanner = (id: string): React.ReactNode => {
  const banner = BANNER_STYLES.find((b) => b.id === id);
  if (banner) {
    return banner.render();
  }
  // Fallback to pharma
  return BANNER_STYLES[0].render();
};
