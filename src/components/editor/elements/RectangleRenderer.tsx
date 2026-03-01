'use client';

import type { RectangleElement } from '@/types/map';

interface RectangleRendererProps {
  rectangle: RectangleElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function RectangleRenderer({ rectangle, isSelected, onSelect }: RectangleRendererProps) {
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      transform={`rotate(${rectangle.rotation} ${rectangle.x + rectangle.width / 2} ${rectangle.y + rectangle.height / 2})`}
    >
      <rect
        x={rectangle.x}
        y={rectangle.y}
        width={rectangle.width}
        height={rectangle.height}
        rx={rectangle.cornerRadius}
        ry={rectangle.cornerRadius}
        fill={rectangle.fill}
        stroke={rectangle.stroke}
        strokeWidth={rectangle.strokeWidth}
      />
      {isSelected && (
        <rect
          x={rectangle.x - 2}
          y={rectangle.y - 2}
          width={rectangle.width + 4}
          height={rectangle.height + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
