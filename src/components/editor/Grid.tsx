'use client';

interface GridProps {
  gridSize: number;
}

export function Grid({ gridSize }: GridProps) {
  return (
    <rect
      x={-5000}
      y={-5000}
      width={10000}
      height={10000}
      fill="url(#grid)"
      pointerEvents="none"
    />
  );
}
