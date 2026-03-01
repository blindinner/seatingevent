'use client';

import type { Bounds } from '@/types/map';

interface SelectionBoxProps {
  bounds: Bounds;
}

export function SelectionBox({ bounds }: SelectionBoxProps) {
  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3b82f6"
      strokeWidth={1}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
}
