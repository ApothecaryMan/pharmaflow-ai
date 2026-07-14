import type React from 'react';

export const SVGCow: React.FC = () => {
  return (
    <svg viewBox='0 0 100 60' width='48' height='28' style={{ overflow: 'visible' }}>
      <title>Cow</title>
      <style>{`
        @keyframes walk-left-legs {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes walk-right-legs {
          0%, 100% { transform: rotate(18deg); }
          50% { transform: rotate(-18deg); }
        }
        @keyframes body-bob {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          25% { transform: translateY(-1.2px) rotate(0deg); }
          50% { transform: translateY(0) rotate(1.5deg); }
          75% { transform: translateY(-1.2px) rotate(0deg); }
        }
        @keyframes head-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(1px) rotate(-2deg); }
        }
        @keyframes tail-wag {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(15deg); }
        }
        .cow-leg-bl, .cow-leg-fr {
          animation: walk-left-legs 0.6s infinite ease-in-out;
        }
        .cow-leg-fl, .cow-leg-br {
          animation: walk-right-legs 0.6s infinite ease-in-out;
        }
        .cow-body-group {
          animation: body-bob 0.6s infinite ease-in-out;
          transform-origin: 50px 30px;
        }
        .cow-head {
          animation: head-bob 0.6s infinite ease-in-out;
          transform-origin: 75px 15px;
        }
        .cow-tail {
          animation: tail-wag 0.8s infinite ease-in-out;
          transform-origin: 15px 20px;
        }
      `}</style>

      {/* Legs */}
      {/* Back Left Leg */}
      <g className='cow-leg-bl' style={{ transformOrigin: '25px 35px' }}>
        <rect x='22' y='32' width='6' height='16' rx='3' fill='#E5E5E5' />
        <rect x='22' y='45' width='6' height='3' rx='1' fill='#333333' />
      </g>
      {/* Front Left Leg */}
      <g className='cow-leg-fl' style={{ transformOrigin: '65px 35px' }}>
        <rect x='62' y='32' width='6' height='16' rx='3' fill='#E5E5E5' />
        <rect x='62' y='45' width='6' height='3' rx='1' fill='#333333' />
      </g>
      {/* Back Right Leg */}
      <g className='cow-leg-br' style={{ transformOrigin: '32px 35px' }}>
        <rect
          x='29'
          y='32'
          width='6'
          height='16'
          rx='3'
          fill='#FFFFFF'
          stroke='#E2E8F0'
          strokeWidth='0.5'
        />
        <rect x='29' y='45' width='6' height='3' rx='1' fill='#111111' />
      </g>
      {/* Front Right Leg */}
      <g className='cow-leg-fr' style={{ transformOrigin: '72px 35px' }}>
        <rect
          x='69'
          y='32'
          width='6'
          height='16'
          rx='3'
          fill='#FFFFFF'
          stroke='#E2E8F0'
          strokeWidth='0.5'
        />
        <rect x='69' y='45' width='6' height='3' rx='1' fill='#111111' />
      </g>

      {/* Body & Head Group */}
      <g className='cow-body-group'>
        {/* Tail */}
        <g className='cow-tail'>
          <path
            d='M 15 20 C 8 20, 5 28, 5 35'
            stroke='#FFFFFF'
            strokeWidth='2.5'
            fill='none'
            strokeLinecap='round'
          />
          <circle cx='5' cy='35' r='2' fill='#111111' />
        </g>

        {/* Body */}
        <rect
          x='15'
          y='15'
          width='65'
          height='24'
          rx='8'
          fill='#FFFFFF'
          stroke='#E2E8F0'
          strokeWidth='0.5'
        />

        {/* Spots */}
        <path d='M 25 15 C 28 20, 34 20, 36 15 Z' fill='#111111' />
        <path d='M 45 17 C 48 24, 54 24, 56 17 Z' fill='#111111' />
        <path d='M 62 15 C 65 21, 68 20, 70 15 Z' fill='#111111' />
        <path d='M 15 22 C 20 24, 21 29, 15 32 Z' fill='#111111' />

        {/* Head Group */}
        <g className='cow-head'>
          <rect
            x='70'
            y='10'
            width='10'
            height='13'
            rx='2'
            fill='#FFFFFF'
            stroke='#E2E8F0'
            strokeWidth='0.5'
          />
          <rect
            x='73'
            y='2'
            width='19'
            height='17'
            rx='5'
            fill='#FFFFFF'
            stroke='#E2E8F0'
            strokeWidth='0.5'
          />
          <path d='M 73 5 C 77 7, 77 11, 73 13 Z' fill='#111111' />
          {/* Horns */}
          <path d='M 77 2 C 76 -3, 72 -5, 72 -5 C 72 -5, 76 -3, 78 0 Z' fill='#E2E8F0' />
          <path d='M 88 2 C 89 -3, 93 -5, 93 -5 C 93 -5, 89 -3, 87 0 Z' fill='#E2E8F0' />
          {/* Ears */}
          <path d='M 72 5 C 68 5, 68 8, 72 8 Z' fill='#FCA5A5' stroke='#E2E8F0' strokeWidth='0.5' />
          <path d='M 92 5 C 96 5, 96 8, 92 8 Z' fill='#FCA5A5' stroke='#E2E8F0' strokeWidth='0.5' />
          {/* Eyes */}
          <circle cx='79.5' cy='8.5' r='1.2' fill='#000000' />
          <circle cx='86.5' cy='8.5' r='1.2' fill='#000000' />
          {/* Muzzle */}
          <rect x='75' y='12' width='15' height='6' rx='3' fill='#FCA5A5' />
          <circle cx='80' cy='15' r='0.8' fill='#B91C1C' />
          <circle cx='85' cy='15' r='0.8' fill='#B91C1C' />
        </g>
      </g>
    </svg>
  );
};
