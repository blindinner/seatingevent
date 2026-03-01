'use client';

import type { SnapGuide } from '@/types/map';

interface SnapGuidesProps {
  guides: SnapGuide[];
  canvasWidth?: number;
  canvasHeight?: number;
}

export function SnapGuides({ guides, canvasWidth = 2000, canvasHeight = 1500 }: SnapGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <g className="snap-guides" pointerEvents="none">
      {guides.map((guide, index) => {
        const strokeColor = guide.isCenter ? '#6366f1' : '#22c55e';
        const strokeWidth = guide.isCenter ? 1.5 : 1;
        const dashArray = guide.isCenter ? '8,4' : '4,4';

        if (guide.type === 'vertical') {
          return (
            <line
              key={`v-${index}`}
              x1={guide.position}
              y1={-canvasHeight}
              x2={guide.position}
              y2={canvasHeight * 2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              opacity={0.8}
            />
          );
        } else {
          return (
            <line
              key={`h-${index}`}
              x1={-canvasWidth}
              y1={guide.position}
              x2={canvasWidth * 2}
              y2={guide.position}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              opacity={0.8}
            />
          );
        }
      })}
    </g>
  );
}
