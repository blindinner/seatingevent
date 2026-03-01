'use client';

import type { LineElement } from '@/types/map';

interface LineRendererProps {
  line: LineElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function LineRenderer({ line, isSelected, onSelect }: LineRendererProps) {
  if (!line.points || line.points.length < 2) return null;

  // Build the path from points
  const pathData = line.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${line.x + p.x} ${line.y + p.y}`)
    .join(' ');

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Main line */}
      <path
        d={pathData}
        fill="none"
        stroke={line.stroke}
        strokeWidth={line.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wider invisible path for easier selection */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(line.strokeWidth + 10, 15)}
      />

      {/* Selection indicator - show vertices when selected */}
      {isSelected && (
        <g pointerEvents="none">
          {line.points.map((point, i) => (
            <circle
              key={i}
              cx={line.x + point.x}
              cy={line.y + point.y}
              r={4}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
        </g>
      )}
    </g>
  );
}
