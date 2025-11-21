import React from 'react';

const LoginBackground = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      zIndex: -1
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
          </linearGradient>
          
          <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.15 }} />
            <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0.05 }} />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#bgGradient)" />

        {/* Modern geometric buildings silhouette */}
        {/* Building 1 - Left */}
        <rect x="100" y="650" width="180" height="430" fill="url(#buildingGradient)" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.4;0.3" dur="4s" repeatCount="indefinite" />
        </rect>
        
        {/* Building 2 */}
        <path d="M 320 720 L 320 1080 L 480 1080 L 480 720 L 400 680 Z" 
              fill="url(#buildingGradient)" opacity="0.35" />

        {/* Building 3 - Tall center */}
        <rect x="520" y="450" width="200" height="630" fill="url(#buildingGradient)" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.5;0.4" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* Building 4 */}
        <path d="M 760 600 L 760 1080 L 920 1080 L 920 600 L 840 560 Z" 
              fill="url(#buildingGradient)" opacity="0.35" />

        {/* Building 5 */}
        <rect x="960" y="700" width="160" height="380" fill="url(#buildingGradient)" opacity="0.3" />

        {/* Building 6 - Right tall */}
        <rect x="1160" y="500" width="220" height="580" fill="url(#buildingGradient)" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.5;0.4" dur="5s" repeatCount="indefinite" />
        </rect>

        {/* Building 7 */}
        <path d="M 1420 680 L 1420 1080 L 1580 1080 L 1580 680 L 1500 640 Z" 
              fill="url(#buildingGradient)" opacity="0.3" />

        {/* Building 8 - Far right */}
        <rect x="1620" y="750" width="200" height="330" fill="url(#buildingGradient)" opacity="0.25" />

        {/* Window details on buildings */}
        {/* Building 1 windows */}
        {[...Array(12)].map((_, row) => 
          [...Array(4)].map((_, col) => (
            <rect 
              key={`w1-${row}-${col}`}
              x={120 + col * 35} 
              y={680 + row * 35} 
              width="20" 
              height="25" 
              fill="rgba(255, 255, 255, 0.15)"
              opacity={Math.random() > 0.3 ? 1 : 0.3}
            >
              <animate 
                attributeName="opacity" 
                values="0.15;0.3;0.15" 
                dur={`${3 + Math.random() * 2}s`} 
                repeatCount="indefinite" 
              />
            </rect>
          ))
        )}

        {/* Building 3 windows (tall center) */}
        {[...Array(18)].map((_, row) => 
          [...Array(5)].map((_, col) => (
            <rect 
              key={`w3-${row}-${col}`}
              x={545 + col * 35} 
              y={480 + row * 35} 
              width="20" 
              height="25" 
              fill="rgba(255, 255, 255, 0.2)"
              opacity={Math.random() > 0.2 ? 1 : 0.3}
            >
              <animate 
                attributeName="opacity" 
                values="0.2;0.4;0.2" 
                dur={`${2 + Math.random() * 3}s`} 
                repeatCount="indefinite" 
              />
            </rect>
          ))
        )}

        {/* Building 6 windows (right tall) */}
        {[...Array(16)].map((_, row) => 
          [...Array(5)].map((_, col) => (
            <rect 
              key={`w6-${row}-${col}`}
              x={1185 + col * 38} 
              y={530 + row * 36} 
              width="22" 
              height="26" 
              fill="rgba(255, 255, 255, 0.18)"
              opacity={Math.random() > 0.25 ? 1 : 0.3}
            >
              <animate 
                attributeName="opacity" 
                values="0.18;0.35;0.18" 
                dur={`${2.5 + Math.random() * 2.5}s`} 
                repeatCount="indefinite" 
              />
            </rect>
          ))
        )}

        {/* Crane silhouette - iconic construction element */}
        <g opacity="0.25">
          {/* Crane tower */}
          <rect x="1350" y="350" width="25" height="350" fill="rgba(255, 255, 255, 0.3)" />
          
          {/* Crane arm */}
          <rect x="1200" y="345" width="350" height="15" fill="rgba(255, 255, 255, 0.3)" />
          
          {/* Crane cable */}
          <line x1="1450" y1="360" x2="1450" y2="550" 
                stroke="rgba(255, 255, 255, 0.3)" strokeWidth="3" />
          
          {/* Load */}
          <rect x="1430" y="550" width="40" height="40" fill="rgba(255, 255, 255, 0.3)" />
          
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 1362 350; 3 1362 350; 0 1362 350; -3 1362 350; 0 1362 350"
            dur="8s"
            repeatCount="indefinite"
          />
        </g>

        {/* Floating geometric shapes for modern touch */}
        <circle cx="300" cy="250" r="60" fill="rgba(255, 255, 255, 0.08)" filter="url(#glow)">
          <animate attributeName="cy" values="250;280;250" dur="6s" repeatCount="indefinite" />
        </circle>

        <rect x="1500" y="200" width="80" height="80" fill="rgba(255, 255, 255, 0.06)" 
              transform="rotate(45 1540 240)" filter="url(#glow)">
          <animateTransform attributeName="transform" type="rotate" 
                          values="45 1540 240; 60 1540 240; 45 1540 240" 
                          dur="8s" repeatCount="indefinite" />
          <animate attributeName="y" values="200;230;200" dur="7s" repeatCount="indefinite" />
        </rect>

        <polygon points="850,150 900,200 800,200" fill="rgba(255, 255, 255, 0.07)" filter="url(#glow)">
          <animate attributeName="opacity" values="0.07;0.12;0.07" dur="5s" repeatCount="indefinite" />
        </polygon>

        {/* Grid pattern overlay for technical feel */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Overlay gradient for depth */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.2) 100%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
};

export default LoginBackground;
