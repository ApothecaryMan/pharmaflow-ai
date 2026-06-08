export function GoldenHorusWings() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <circle cx='64' cy='64' r='54' stroke='#F59E0B' strokeWidth='3' />
        <circle cx='64' cy='64' r='51' stroke='#1E3A8A' strokeWidth='2' strokeDasharray='4 2' />
        <circle cx='64' cy='64' r='48' stroke='#0891B2' strokeWidth='1.5' strokeDasharray='2 4' />
        <g transform='translate(64, 10)'>
          <circle cx='0' cy='0' r='8' fill='#EF4444' stroke='#FBBF24' strokeWidth='1.5' />
          <path d='M-9,2 C-12,-4 -16,-2 -16,4 C-16,8 -12,8 -8,4' fill='none' stroke='#FBBF24' strokeWidth='1.5' />
          <path d='M9,2 C12,-4 16,-2 16,4 C16,8 12,8 8,4' fill='none' stroke='#FBBF24' strokeWidth='1.5' />
          <path d='M-10,0 C-20,-8 -35,-5 -45,5 C-30,0 -15,5 -10,8 Z' fill='#FBBF24' />
          <path d='M-12,2 C-22,-4 -33,-2 -40,5 C-30,2 -18,6 -10,8 Z' fill='#1E3A8A' />
          <path d='M10,0 C20,-8 35,-5 45,5 C30,0 15,5 10,8 Z' fill='#FBBF24' />
          <path d='M12,2 C22,-4 33,-2 40,5 C30,2 18,6 10,8 Z' fill='#1E3A8A' />
        </g>
        <g transform='translate(16, 80) rotate(15)'>
          <path d='M48,36 C30,36 10,20 0,-10 C5,5 20,20 48,25 Z' fill='#F59E0B' />
          <path d='M45,33 C28,33 12,18 4,-8 C8,6 20,18 45,22 Z' fill='#1E3A8A' />
          <path d='M42,30 C26,30 14,16 8,-6 C11,6 20,16 42,19 Z' fill='#0891B2' />
          <path d='M30,35 L28,24 M20,29 L18,18 M10,18 L10,8' stroke='#FBBF24' strokeWidth='1.2' strokeLinecap='round' />
        </g>
        <g transform='translate(112, 80) rotate(-15) scale(-1, 1)'>
          <path d='M48,36 C30,36 10,20 0,-10 C5,5 20,20 48,25 Z' fill='#F59E0B' />
          <path d='M45,33 C28,33 12,18 4,-8 C8,6 20,18 45,22 Z' fill='#1E3A8A' />
          <path d='M42,30 C26,30 14,16 8,-6 C11,6 20,16 42,19 Z' fill='#0891B2' />
          <path d='M30,35 L28,24 M20,29 L18,18 M10,18 L10,8' stroke='#FBBF24' strokeWidth='1.2' strokeLinecap='round' />
        </g>
        <polygon points='64,112 68,120 64,128 60,120' fill='#1E3A8A' stroke='#FBBF24' strokeWidth='1.5' />
        <circle cx='64' cy='120' r='1.5' fill='#EF4444' />
        <path d='M16,40 L18,46 L24,46 L19,50 L21,56 L16,52 L11,56 L13,50 L8,46 L14,46 Z' fill='#FBBF24' transform='scale(0.5) translate(16, 40)' />
        <path d='M16,40 L18,46 L24,46 L19,50 L21,56 L16,52 L11,56 L13,50 L8,46 L14,46 Z' fill='#FBBF24' transform='scale(0.5) translate(220, 40)' />
      </g>
    </svg>
  );
}
