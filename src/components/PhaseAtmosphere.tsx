import React from 'react';
import { Phase } from '../game/types';

interface PhaseAtmosphereProps {
  phase: Phase;
  children: React.ReactNode;
}

const STARS = [
  { top: '8%', left: '12%', size: 2, delay: '0s' },
  { top: '14%', left: '78%', size: 3, delay: '0.7s' },
  { top: '22%', left: '34%', size: 2, delay: '1.4s' },
  { top: '19%', left: '88%', size: 2, delay: '2.1s' },
  { top: '32%', left: '18%', size: 3, delay: '0.4s' },
  { top: '38%', left: '66%', size: 2, delay: '1.8s' },
  { top: '48%', left: '9%', size: 2, delay: '1.1s' },
  { top: '54%', left: '82%', size: 3, delay: '2.5s' },
  { top: '66%', left: '26%', size: 2, delay: '0.9s' },
  { top: '72%', left: '71%', size: 2, delay: '1.6s' },
  { top: '82%', left: '15%', size: 3, delay: '2.9s' },
  { top: '86%', left: '52%', size: 2, delay: '0.3s' },
  { top: '10%', left: '53%', size: 2, delay: '1.9s' },
  { top: '42%', left: '44%', size: 2, delay: '2.2s' },
];

export const PhaseAtmosphere: React.FC<PhaseAtmosphereProps> = ({ phase, children }) => {
  let bgClass = 'bg-[#08080c]';
  let glowStyle: React.CSSProperties = {
    background:
      'radial-gradient(circle at 50% 0%, rgba(255, 46, 77, 0.22) 0%, rgba(255, 46, 77, 0.05) 38%, rgba(8, 8, 12, 0) 70%)',
  };

  if (phase === 'night') {
    bgClass = 'bg-[#04081a]';
    glowStyle = {
      background:
        'radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.16) 0%, rgba(30, 58, 138, 0.22) 38%, rgba(4, 8, 26, 0) 75%)',
    };
  } else if (phase === 'morning') {
    bgClass = 'bg-[#170b08]';
    glowStyle = {
      background:
        'radial-gradient(circle at 50% 0%, rgba(251, 146, 60, 0.34) 0%, rgba(217, 119, 6, 0.16) 42%, rgba(23, 11, 8, 0) 75%)',
    };
  } else if (phase === 'voting' || phase === 'vote_result') {
    bgClass = 'bg-[#160409]';
    glowStyle = {
      background:
        'radial-gradient(circle at 50% 5%, rgba(255, 46, 77, 0.34) 0%, rgba(153, 27, 27, 0.18) 45%, rgba(22, 4, 9, 0) 76%)',
    };
  } else if (phase === 'discussion') {
    bgClass = 'bg-[#0b0b12]';
    glowStyle = {
      background:
        'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.14) 0%, rgba(255, 46, 77, 0.08) 42%, rgba(11, 11, 18, 0) 72%)',
    };
  } else if (phase === 'gameover') {
    bgClass = 'bg-[#0a080e]';
    glowStyle = {
      background:
        'radial-gradient(circle at 50% 0%, rgba(255, 46, 77, 0.24) 0%, rgba(250, 204, 21, 0.1) 42%, rgba(10, 8, 14, 0) 75%)',
    };
  }

  return (
    <div
      className={`relative min-h-dvh w-full overflow-x-hidden transition-colors duration-500 ${bgClass}`}
    >
      {/* Phase ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
        style={glowStyle}
      />

      {/* Starfield during Night phase */}
      {phase === 'night' && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-55">
          {STARS.map((star, idx) => (
            <span
              key={idx}
              className="star-twinkle absolute rounded-full bg-sky-100"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Subtle film grain */}
      <div
        aria-hidden="true"
        className="film-grain pointer-events-none fixed inset-0 z-0 opacity-75"
      />

      {/* Main foreground layer */}
      <div className="relative z-10 flex min-h-dvh w-full flex-col">{children}</div>
    </div>
  );
};
