import React from 'react';

export function GeniusGeometricMatrix() {
  // Generate coordinates for outer and inner nodes to form a geometric lattice
  // outside the avatar's face. Radius >= 52 ensures the face is not blocked.
  const outerNodes = [];
  const innerNodes = [];
  const N = 24; // 24-point complex geometry
  
  for (let i = 0; i < N; i++) {
    const angle = (i * 360 / N) * (Math.PI / 180);
    outerNodes.push({
      x: 64 + 62 * Math.sin(angle),
      y: 64 - 62 * Math.cos(angle)
    });
    innerNodes.push({
      x: 64 + 52 * Math.sin(angle),
      y: 64 - 52 * Math.cos(angle)
    });
  }

  return (
    <svg viewBox='0 0 128 128' fill='none' overflow='visible' className='w-full h-full'>
      <style>{`
        @keyframes ggm-spin-cw { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes ggm-spin-ccw { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
        @keyframes ggm-pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.4); filter: drop-shadow(0 0 4px #22d3ee); } }
        @keyframes ggm-glow-line { 0%, 100% { opacity: 0.1; stroke: #8b5cf6; } 50% { opacity: 0.9; stroke: #38bdf8; filter: drop-shadow(0 0 3px #38bdf8); } }
        @keyframes ggm-core-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; filter: drop-shadow(0 0 6px #fde68a); } }
        
        .ggm-origin { transform-origin: 64px 64px; }
        .ggm-layer-1 { animation: ggm-spin-cw 45s linear infinite; }
        .ggm-layer-2 { animation: ggm-spin-ccw 30s linear infinite; }
        .ggm-layer-3 { animation: ggm-spin-cw 60s linear infinite; }
        .ggm-node { animation: ggm-pulse 3s ease-in-out infinite; }
        .ggm-line-pulse { animation: ggm-glow-line 4s ease-in-out infinite; }
        .ggm-core { animation: ggm-core-pulse 5s ease-in-out infinite; }
      `}</style>
      
      <g opacity='0.95'>
        {/* Layer 1: The Outer Sacred Web */}
        <g className='ggm-origin ggm-layer-1'>
          <circle cx='64' cy='64' r='52' stroke='#8b5cf6' strokeWidth='0.5' strokeDasharray='2 6' opacity='0.5' />
          <circle cx='64' cy='64' r='62' stroke='#0ea5e9' strokeWidth='0.5' strokeDasharray='1 4 4 1' opacity='0.4' />
          
          {/* Complex Zig-Zag Web connecting inner and outer rings */}
          {innerNodes.map((node, i) => {
            const prevOuter = outerNodes[i];
            const nextOuter = outerNodes[(i + 1) % N];
            const nextInner = innerNodes[(i + 1) % N];
            const skipOuter = outerNodes[(i + 2) % N]; // Advanced geometric skips
            
            return (
              <g key={`web-${i}`}>
                {/* Primary V-Shapes */}
                <line x1={node.x} y1={node.y} x2={prevOuter.x} y2={prevOuter.y} stroke='#38bdf8' strokeWidth='0.8' className={i % 3 === 0 ? 'ggm-line-pulse' : ''} opacity='0.5' style={{ animationDelay: `${i * 0.1}s` }} />
                <line x1={node.x} y1={node.y} x2={nextOuter.x} y2={nextOuter.y} stroke='#8b5cf6' strokeWidth='0.6' opacity='0.4' />
                
                {/* Advanced Geometric Skips (Star-like connections) */}
                {i % 2 === 0 && (
                  <line x1={node.x} y1={node.y} x2={skipOuter.x} y2={skipOuter.y} stroke='#e0f2fe' strokeWidth='0.4' opacity='0.3' />
                )}
                
                {/* Inner Ring Links */}
                <line x1={node.x} y1={node.y} x2={nextInner.x} y2={nextInner.y} stroke='#c084fc' strokeWidth='0.8' opacity='0.4' />
              </g>
            );
          })}
        </g>

        {/* Layer 2: Orbiting Tech Nodes & Prisms */}
        <g className='ggm-origin ggm-layer-2'>
          {outerNodes.map((node, i) => (
            <g key={`outer-node-${i}`}>
              {/* Outer Golden Prisms */}
              {i % 4 === 0 && (
                <g className='ggm-core' style={{ animationDelay: `${i * 0.25}s` }}>
                  <polygon points={`${node.x},${node.y - 4} ${node.x + 3},${node.y + 2} ${node.x - 3},${node.y + 2}`} fill='#fbbf24' opacity='0.8' />
                  <circle cx={node.x} cy={node.y} r='5' stroke='#fde68a' strokeWidth='0.5' fill='none' opacity='0.6' />
                </g>
              )}
              {/* Mid-sized Cyan Nodes */}
              {i % 4 === 2 && (
                <circle cx={node.x} cy={node.y} r='2' fill='#22d3ee' className='ggm-node' style={{ animationDelay: `${i * 0.1}s` }} />
              )}
            </g>
          ))}
          
          {innerNodes.map((node, i) => (
            <g key={`inner-node-${i}`}>
              {/* Inner Violet Nodes */}
              {i % 3 === 0 && (
                <circle cx={node.x} cy={node.y} r='1.5' fill='#d8b4fe' className='ggm-node' style={{ animationDelay: `${i * 0.15}s` }} />
              )}
            </g>
          ))}
        </g>

        {/* Layer 3: Faint Background Compass Data */}
        <g className='ggm-origin ggm-layer-3' opacity='0.6'>
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={`compass-${i}`} transform={`rotate(${i * 90} 64 64)`}>
              {/* Cardinal Point Markers */}
              <line x1='64' y1='-2' x2='64' y2='6' stroke='#7dd3fc' strokeWidth='1.5' />
              <circle cx='64' cy='-4' r='1.5' fill='#bae6fd' />
              {/* Data Text / Runes Simulation */}
              <rect x='62' y='8' width='1' height='4' fill='#38bdf8' opacity='0.5' />
              <rect x='65' y='8' width='1' height='6' fill='#38bdf8' opacity='0.5' />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
