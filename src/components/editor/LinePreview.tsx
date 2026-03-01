'use client';

import type { LinePreview as LinePreviewData } from '@/stores/drawingStore';

interface LinePreviewProps {
  previewLine: LinePreviewData | null;
  zoom: number;
}

export function LinePreview({ previewLine, zoom }: LinePreviewProps) {
  if (!previewLine || !previewLine.points || previewLine.points.length < 2) return null;

  // Draw lines connecting points
  const lines = [];
  for (let i = 0; i < previewLine.points.length - 1; i++) {
    const p1 = previewLine.points[i];
    const p2 = previewLine.points[i + 1];
    lines.push(
      <line
        key={`line-${i}`}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="#374151"
        strokeWidth={2 / zoom}
        strokeLinecap="round"
      />
    );
  }

  // Draw vertices (committed points only, not the cursor point)
  const vertices = previewLine.points.slice(0, -1).map((point, i) => (
    <circle
      key={`vertex-${i}`}
      cx={point.x}
      cy={point.y}
      r={4 / zoom}
      fill="#374151"
      stroke="#fff"
      strokeWidth={1 / zoom}
    />
  ));

  // Show point count badge
  const lastPoint = previewLine.points[previewLine.points.length - 1];
  const pointCount = previewLine.points.length - 1; // Exclude cursor point

  return (
    <g className="line-preview" style={{ pointerEvents: 'none' }}>
      {lines}
      {vertices}

      {/* Point count badge */}
      {pointCount >= 1 && (
        <g transform={`translate(${lastPoint.x + 15 / zoom}, ${lastPoint.y - 15 / zoom})`}>
          <rect
            x={0}
            y={0}
            width={70 / zoom}
            height={24 / zoom}
            rx={4 / zoom}
            fill="rgba(0, 0, 0, 0.8)"
          />
          <text
            x={35 / zoom}
            y={15 / zoom}
            textAnchor="middle"
            fill="#fff"
            fontSize={10 / zoom}
            fontWeight="500"
          >
            {pointCount} {pointCount === 1 ? 'point' : 'points'}
          </text>
        </g>
      )}
    </g>
  );
}
