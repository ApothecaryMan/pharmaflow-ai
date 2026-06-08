export function PerfectCelestialSeraphim() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <g opacity='0.98'>
        <circle cx='64' cy='64' r='54' stroke='#FBBF24' strokeWidth='1' opacity='0.2' />

        <g>
          <animateTransform attributeName='transform' type='rotate' from='0 64 64' to='360 64 64' dur='25s' repeatCount='indefinite' />
          <circle cx='64' cy='64' r='58' stroke='#FBBF24' strokeWidth='0.6' fill='none' strokeDasharray='4 8' opacity='0.6' />
          <g stroke='#FDE047' strokeWidth='0.8' fill='none' opacity='0.4'>
            <rect x='34' y='34' width='60' height='60' transform='rotate(0, 64, 64)' />
            <rect x='34' y='34' width='60' height='60' transform='rotate(45, 64, 64)' />
          </g>
        </g>

        <g transform='translate(64, 0)' className='pulse-aura' style={{ transformOrigin: '0px 0px' }}>
          <ellipse cx='0' cy='0' rx='22' ry='6' fill='#FBBF24' opacity='0.2' filter='blur(2px)' />
          <ellipse cx='0' cy='0' rx='20' ry='5' stroke='#FBBF24' strokeWidth='2' fill='none' opacity='0.9' />
          <ellipse cx='0' cy='-2' rx='20' ry='5' stroke='#FFFFFF' strokeWidth='1.2' fill='none' />

          <polygon points='0,-12 2,-8 0,-4 -2,-8' fill='#FFFFFF' className='star-twinkle' />
          <polygon points='-18,-6 -16,-4 -18,-2 -20,-4' fill='#FDE047' className='star-twinkle' style={{animationDelay: '1s'}} />
          <polygon points='18,-6 20,-4 18,-2 16,-4' fill='#FDE047' className='star-twinkle' style={{animationDelay: '1.5s'}} />
        </g>

        <g transform='translate(8, 64)'>
          <g className='flap-l' style={{ transformOrigin: '0px 0px' }}>
            <path d='M0,0 C-8,-22 -22,-38 -38,-30 C-30,-18 -22,-8 -15,0 C-26,4 -34,15 -22,26 C-15,18 -8,8 0,0 Z' fill='#FBBF24' opacity='0.2' filter='blur(2px)' />
            <path d='M0,0 C-15,-18 -30,-30 -45,-22 C-38,-11 -26,0 -8,8 Z' fill='#FDE047' />
            <path d='M-4,4 C-22,-8 -38,-8 -48,4 C-38,8 -26,11 -8,15 Z' fill='#FDE047' />
            <path d='M-4,11 C-18,4 -30,8 -38,22 C-26,18 -15,15 0,15 Z' fill='#FDE047' />
            <path d='M0,0 C-11,-11 -22,-22 -34,-15 C-26,-8 -18,4 -4,8 Z' fill='#FFFFFF' />
            <path d='M-2,6 C-15,-4 -26,-4 -38,4 C-30,8 -18,10 -4,13 Z' fill='#FFFFFF' />
            <path d='M-2,11 C-15,6 -22,10 -30,18 C-22,16 -11,14 2,14 Z' fill='#FFFFFF' />
            <path d='M0,0 C-8,-8 -15,-15 -22,-11 C-15,-5 -11,1 0,4 Z' fill='#FEF08A' />
            <path d='M0,5 C-11,-2 -18,-2 -26,3 C-18,5 -11,8 0,9 Z' fill='#FEF08A' />
            <circle cx='0' cy='6' r='2.5' fill='#F59E0B' stroke='#FFFFFF' strokeWidth='0.8' />
          </g>
        </g>

        <g transform='translate(120, 64)'>
          <g className='flap-r' style={{ transformOrigin: '0px 0px' }}>
            <path d='M0,0 C8,-22 22,-38 38,-30 C30,-18 22,-8 15,0 C26,4 34,15 22,26 C15,18 8,8 0,0 Z' fill='#FBBF24' opacity='0.2' filter='blur(2px)' />
            <path d='M0,0 C15,-18 30,-30 45,-22 C38,-11 26,0 8,8 Z' fill='#FDE047' />
            <path d='M4,4 C22,-8 38,-8 48,4 C38,8 26,11 8,15 Z' fill='#FDE047' />
            <path d='M4,11 C18,4 30,8 38,22 C26,18 15,15 0,15 Z' fill='#FDE047' />
            <path d='M0,0 C11,-11 22,-22 34,-15 C26,-8 18,4 4,8 Z' fill='#FFFFFF' />
            <path d='M2,6 C15,-4 26,-4 38,4 C30,8 18,10 4,13 Z' fill='#FFFFFF' />
            <path d='M2,11 C15,6 22,10 30,18 C22,16 11,14 -2,14 Z' fill='#FFFFFF' />
            <path d='M0,0 C8,-8 15,-15 22,-11 C15,-5 11,1 0,4 Z' fill='#FEF08A' />
            <path d='M0,5 C11,-2 18,-2 26,3 C18,5 11,8 0,9 Z' fill='#FEF08A' />
            <circle cx='0' cy='6' r='2.5' fill='#F59E0B' stroke='#FFFFFF' strokeWidth='0.8' />
          </g>
        </g>

        <g transform='translate(64, 124)'>
          <polygon points='0,-8 6,0 0,8 -6,0' fill='#FBBF24' />
          <polygon points='0,-8 3,0 0,8 -3,0' fill='#FFFFFF' />
          <circle cx='0' cy='0' r='1.5' fill='#F59E0B' />
        </g>

        <g transform='translate(16, 120)'>
          <g className='feather-1' style={{ transformOrigin: '0px 0px' }}>
            <path d='M0,0 C-3,-5 -3,-10 0,-12 C3,-10 3,-5 0,0 Z' fill='#FFFFFF' opacity='0.9' />
            <path d='M0,0 L0,-11' stroke='#FDE047' strokeWidth='0.5' />
          </g>
        </g>
        <g transform='translate(112, 115)'>
          <g className='feather-2' style={{ transformOrigin: '0px 0px' }}>
            <path d='M0,0 C-3,-5 -3,-10 0,-12 C3,-10 3,-5 0,0 Z' fill='#FFFFFF' opacity='0.9' />
            <path d='M0,0 L0,-11' stroke='#FDE047' strokeWidth='0.5' />
          </g>
        </g>

        <circle cx='14' cy='28' r='1' fill='#FFFFFF' className='star-twinkle' style={{animationDelay: '0.2s'}} />
        <circle cx='114' cy='28' r='1.2' fill='#FEF08A' className='star-twinkle' style={{animationDelay: '0.8s'}} />
        <circle cx='6' cy='85' r='0.8' fill='#FFFFFF' className='star-twinkle' style={{animationDelay: '1.2s'}} />
        <circle cx='122' cy='85' r='1' fill='#FFFFFF' className='star-twinkle' style={{animationDelay: '0.5s'}} />
      </g>
    </svg>
  );
}
