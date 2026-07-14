export function EtherealHeavenVortex() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Ethereal heaven vortex</title>
      <style>{`
        @keyframes cloud-spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes cloud-spin-rev { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes star-twinkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 3px rgba(255,255,255,0.8)); } }
        .heaven-origin { transform-box: view-box; transform-origin: 64px 64px; }
        .spin-clouds { animation: cloud-spin-slow 25s linear infinite; }
        .spin-clouds-rev { animation: cloud-spin-rev 15s linear infinite; }
        .twinkle { animation: star-twinkle 2.5s ease-in-out infinite; }
      `}</style>
      <g opacity='0.98'>
        <defs>
          <path
            id='holy-cloud'
            d='M0,0 C-3,-6 -9,-6 -12,-3 C-16,-6 -22,-3 -22,2 C-26,4 -24,10 -20,12 C-20,16 -14,18 -10,16 C-6,18 0,16 0,12 C4,10 4,4 0,0 Z'
            fill='#FFFFFF'
            stroke='#E9D5FF'
            strokeWidth='0.6'
          />
        </defs>

        <g className='heaven-origin spin-clouds'>
          <use href='#holy-cloud' transform='translate(64, 8)' />
          <use href='#holy-cloud' transform='translate(108, 36) rotate(60)' opacity='0.8' />
          <use href='#holy-cloud' transform='translate(120, 84) rotate(120)' />
          <use href='#holy-cloud' transform='translate(64, 120) rotate(180)' opacity='0.8' />
          <use href='#holy-cloud' transform='translate(10, 84) rotate(240)' />
          <use href='#holy-cloud' transform='translate(20, 36) rotate(300)' opacity='0.8' />
        </g>

        <g className='heaven-origin spin-clouds-rev' opacity='0.7'>
          <use href='#holy-cloud' transform='translate(88, 16) scale(0.8)' />
          <use href='#holy-cloud' transform='translate(118, 64) scale(0.8) rotate(90)' />
          <use href='#holy-cloud' transform='translate(40, 114) scale(0.8) rotate(180)' />
          <use href='#holy-cloud' transform='translate(10, 64) scale(0.8) rotate(270)' />
        </g>

        <g fill='#FFFFFF'>
          <path
            d='M30,16 Q30,20 26,20 Q30,20 30,24 Q30,20 34,20 Q30,20 30,16 Z'
            className='twinkle'
            style={{ animationDelay: '0.5s' }}
          />
          <path
            d='M100,16 Q100,20 96,20 Q100,20 100,24 Q100,20 104,20 Q100,20 100,16 Z'
            className='twinkle'
            style={{ animationDelay: '1s' }}
          />
          <path
            d='M16,96 Q16,100 12,100 Q16,100 16,104 Q16,100 20,100 Q16,100 16,96 Z'
            className='twinkle'
            style={{ animationDelay: '1.5s' }}
          />
          <path
            d='M114,96 Q114,100 110,100 Q114,100 114,104 Q114,100 118,100 Q114,100 114,96 Z'
            className='twinkle'
            style={{ animationDelay: '2s' }}
          />

          <circle cx='64' cy='12' r='1.5' fill='var(--svg-color, #A78BFA)' className='twinkle' />
          <circle cx='124' cy='64' r='1' />
          <circle cx='4' cy='64' r='1' />
          <circle cx='64' cy='116' r='1.2' fill='var(--svg-color, #A78BFA)' />
          <circle cx='40' cy='122' r='0.8' opacity='0.7' />
          <circle cx='88' cy='122' r='0.8' opacity='0.7' />
        </g>
      </g>
    </svg>
  );
}
