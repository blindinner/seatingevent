'use client';

import type { AreaPreview as AreaPreviewData } from '@/stores/drawingStore';

interface AreaPreviewProps {
  previewArea: AreaPreviewData | null;
  zoom: number;
}

export function AreaPreview({ previewArea, zoom }: AreaPreviewProps) {
  if (!previewArea) return null;

  const renderPreviewShape = () => {
    switch (previewArea.areaType) {
      case 'rectangle':
        if (!previewArea.width || !previewArea.height) return null;
        return (
          <rect
            x={previewArea.x}
            y={previewArea.y}
            width={previewArea.width}
            height={previewArea.height}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            strokeDasharray={`${8 / zoom} ${4 / zoom}`}
            rx={4 / zoom}
          />
        );
      case 'ellipse':
        if (!previewArea.width || !previewArea.height) return null;
        return (
          <ellipse
            cx={previewArea.x + previewArea.width / 2}
            cy={previewArea.y + previewArea.height / 2}
            rx={previewArea.width / 2}
            ry={previewArea.height / 2}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth={2 / zoom}
            strokeDasharray={`${8 / zoom} ${4 / zoom}`}
          />
        );
      case 'polygon':
        if (!previewArea.points || previewArea.points.length < 2) return null;

        // Draw lines connecting points
        const lines = [];
        for (let i = 0; i < previewArea.points.length - 1; i++) {
          const p1 = previewArea.points[i];
          const p2 = previewArea.points[i + 1];
          lines.push(
            <line
              key={`line-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#3b82f6"
              strokeWidth={2 / zoom}
              strokeDasharray={`${8 / zoom} ${4 / zoom}`}
            />
          );
        }

        // Draw closing line preview (from last committed point to first)
        if (previewArea.points.length >= 3) {
          const firstPoint = previewArea.points[0];
          const lastCommittedPoint = previewArea.points[previewArea.points.length - 2];
          if (lastCommittedPoint) {
            lines.push(
              <line
                key="closing-line"
                x1={lastCommittedPoint.x}
                y1={lastCommittedPoint.y}
                x2={firstPoint.x}
                y2={firstPoint.y}
                stroke="#3b82f6"
                strokeWidth={1 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                opacity={0.5}
              />
            );
          }
        }

        // Draw vertices
        const vertices = previewArea.points.slice(0, -1).map((point, i) => (
          <circle
            key={`vertex-${i}`}
            cx={point.x}
            cy={point.y}
            r={4 / zoom}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={1 / zoom}
          />
        ));

        // Draw the polygon fill if we have at least 3 committed points
        let polygonFill = null;
        if (previewArea.points.length >= 4) {
          const committedPoints = previewArea.points.slice(0, -1);
          const pointsString = committedPoints.map(p => `${p.x},${p.y}`).join(' ');
          polygonFill = (
            <polygon
              points={pointsString}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />
          );
        }

        return (
          <g>
            {polygonFill}
            {lines}
            {vertices}
          </g>
        );
      default:
        return null;
    }
  };

  // Show dimensions badge for rect/ellipse
  const renderDimensionsBadge = () => {
    if (previewArea.areaType === 'polygon') return null;
    if (!previewArea.width || !previewArea.height) return null;
    if (previewArea.width < 20 || previewArea.height < 20) return null;

    const badgeX = previewArea.x + previewArea.width + 10 / zoom;
    const badgeY = previewArea.y;

    return (
      <g transform={`translate(${badgeX}, ${badgeY})`}>
        <rect
          x={0}
          y={0}
          width={80 / zoom}
          height={24 / zoom}
          rx={4 / zoom}
          fill="rgba(0, 0, 0, 0.8)"
        />
        <text
          x={40 / zoom}
          y={15 / zoom}
          textAnchor="middle"
          fill="#fff"
          fontSize={10 / zoom}
          fontWeight="500"
        >
          {Math.round(previewArea.width)} x {Math.round(previewArea.height)}
        </text>
      </g>
    );
  };

  // Show point count badge for polygon
  const renderPolygonBadge = () => {
    if (previewArea.areaType !== 'polygon') return null;
    if (!previewArea.points || previewArea.points.length < 2) return null;

    const lastPoint = previewArea.points[previewArea.points.length - 1];
    const pointCount = previewArea.points.length - 1; // Exclude cursor point

    return (
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
    );
  };

  return (
    <g className="area-preview" style={{ pointerEvents: 'none' }}>
      {renderPreviewShape()}
      {renderDimensionsBadge()}
      {renderPolygonBadge()}
    </g>
  );
}
