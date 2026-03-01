'use client';

import type { ShapePreview as ShapePreviewData } from '@/stores/drawingStore';

interface ShapePreviewProps {
  previewShape: ShapePreviewData | null;
  zoom: number;
}

export function ShapePreview({ previewShape, zoom }: ShapePreviewProps) {
  if (!previewShape) return null;

  const renderPreviewShape = () => {
    switch (previewShape.areaType) {
      case 'rectangle':
        if (!previewShape.width || !previewShape.height) return null;
        return (
          <rect
            x={previewShape.x}
            y={previewShape.y}
            width={previewShape.width}
            height={previewShape.height}
            fill="rgba(75, 85, 99, 0.4)"
            stroke="#4b5563"
            strokeWidth={2 / zoom}
            rx={4 / zoom}
          />
        );
      case 'ellipse':
        if (!previewShape.width || !previewShape.height) return null;
        return (
          <ellipse
            cx={previewShape.x + previewShape.width / 2}
            cy={previewShape.y + previewShape.height / 2}
            rx={previewShape.width / 2}
            ry={previewShape.height / 2}
            fill="rgba(75, 85, 99, 0.4)"
            stroke="#4b5563"
            strokeWidth={2 / zoom}
          />
        );
      case 'polygon':
        if (!previewShape.points || previewShape.points.length < 2) return null;

        // Draw lines connecting points
        const lines = [];
        for (let i = 0; i < previewShape.points.length - 1; i++) {
          const p1 = previewShape.points[i];
          const p2 = previewShape.points[i + 1];
          lines.push(
            <line
              key={`line-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#4b5563"
              strokeWidth={2 / zoom}
            />
          );
        }

        // Draw closing line preview (from last committed point to first)
        if (previewShape.points.length >= 3) {
          const firstPoint = previewShape.points[0];
          const lastCommittedPoint = previewShape.points[previewShape.points.length - 2];
          if (lastCommittedPoint) {
            lines.push(
              <line
                key="closing-line"
                x1={lastCommittedPoint.x}
                y1={lastCommittedPoint.y}
                x2={firstPoint.x}
                y2={firstPoint.y}
                stroke="#4b5563"
                strokeWidth={1 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                opacity={0.5}
              />
            );
          }
        }

        // Draw vertices
        const vertices = previewShape.points.slice(0, -1).map((point, i) => (
          <circle
            key={`vertex-${i}`}
            cx={point.x}
            cy={point.y}
            r={4 / zoom}
            fill="#4b5563"
            stroke="#fff"
            strokeWidth={1 / zoom}
          />
        ));

        // Draw the polygon fill if we have at least 3 committed points
        let polygonFill = null;
        if (previewShape.points.length >= 4) {
          const committedPoints = previewShape.points.slice(0, -1);
          const pointsString = committedPoints.map(p => `${p.x},${p.y}`).join(' ');
          polygonFill = (
            <polygon
              points={pointsString}
              fill="rgba(75, 85, 99, 0.2)"
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
    if (previewShape.areaType === 'polygon') return null;
    if (!previewShape.width || !previewShape.height) return null;
    if (previewShape.width < 20 || previewShape.height < 20) return null;

    const badgeX = previewShape.x + previewShape.width + 10 / zoom;
    const badgeY = previewShape.y;

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
          {Math.round(previewShape.width)} x {Math.round(previewShape.height)}
        </text>
      </g>
    );
  };

  // Show point count badge for polygon
  const renderPolygonBadge = () => {
    if (previewShape.areaType !== 'polygon') return null;
    if (!previewShape.points || previewShape.points.length < 2) return null;

    const lastPoint = previewShape.points[previewShape.points.length - 1];
    const pointCount = previewShape.points.length - 1; // Exclude cursor point

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
    <g className="shape-preview" style={{ pointerEvents: 'none' }}>
      {renderPreviewShape()}
      {renderDimensionsBadge()}
      {renderPolygonBadge()}
    </g>
  );
}
