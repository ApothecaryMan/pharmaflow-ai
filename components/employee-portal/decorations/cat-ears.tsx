export function CatEars() {
  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <title>Cat ears</title>
      <style>{`
        @keyframes cat-twitch-left { 0%, 90%, 94%, 98%, 100% { transform: rotate(0deg); } 92%, 96% { transform: rotate(-5deg) scaleY(0.96); } }
        @keyframes cat-twitch-right { 0%, 86%, 90%, 94%, 100% { transform: rotate(0deg); } 88%, 92% { transform: rotate(5deg) scaleY(0.96); } }
        .cat-ear-left { transform-origin: 35px 35px; animation: cat-twitch-left 4.5s ease-in-out infinite; }
        .cat-ear-right { transform-origin: 93px 35px; animation: cat-twitch-right 4.5s ease-in-out infinite; }
      `}</style>
      <g opacity='0.95'>
        <g transform='translate(10, -24)'>
          <g className='cat-ear-left'>
            <path
              d='M20,38 C14,24 10,6 18,-6 C23,-12 29,-10 33,-2 C41,12 47,24 50,32 C38,32 28,35 20,38 Z'
              fill='var(--svg-color, #D4A574)'
              stroke='var(--svg-color, #B8864E)'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            <path d='M25,34 C21,22 20,12 23,4 C24,12 26,22 28,29 Z' fill='#F43F5E' opacity='0.35' />
            <path
              d='M25,34 C21,22 18,10 22,2 C25,-2 28,-2 31,3 C37,14 42,22 44,27 C36,28 30,31 25,34 Z'
              fill='#FFB6C1'
            />
            <path
              d='M44,27 C41,22 38,20 39,25 C36,21 34,20 35,26 C32,22 30,22 32,28 C36,28 40,27 44,27 Z'
              fill='#FFFFFF'
            />
          </g>
        </g>
        <g transform='translate(-10, -24)'>
          <g className='cat-ear-right'>
            <path
              d='M108,38 C114,24 118,6 110,-6 C105,-12 99,-10 95,-2 C87,12 81,24 78,32 C90,32 100,35 108,38 Z'
              fill='var(--svg-color, #D4A574)'
              stroke='var(--svg-color, #B8864E)'
              strokeWidth='1.5'
              strokeLinejoin='round'
            />
            <path
              d='M103,34 C107,22 108,12 105,4 C104,12 102,22 100,29 Z'
              fill='#F43F5E'
              opacity='0.35'
            />
            <path
              d='M103,34 C107,22 110,10 106,2 C103,-2 100,-2 97,3 C91,14 86,22 84,27 C92,28 98,31 103,34 Z'
              fill='#FFB6C1'
            />
            <path
              d='M84,27 C87,22 90,20 89,25 C92,21 94,20 93,26 C96,22 98,22 96,28 C92,28 88,27 84,27 Z'
              fill='#FFFFFF'
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
