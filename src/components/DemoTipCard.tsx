import React from 'react';
import { Lightbulb } from 'lucide-react';
import { DEMO_TIPS } from '../game/constants';
import { Phase } from '../game/types';

interface DemoTipCardProps {
  phase: Phase;
}

export const DemoTipCard: React.FC<DemoTipCardProps> = ({ phase }) => {
  const tip = DEMO_TIPS[phase];
  if (!tip) return null;

  return (
    <aside
      aria-label="Demo phase tip"
      className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-950/25 px-4 py-3.5 text-left"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-amber-200">{tip.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{tip.body}</p>
        </div>
      </div>
    </aside>
  );
};
