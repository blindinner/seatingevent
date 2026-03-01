'use client';

import type { ShapeElement } from '@/types/map';

interface ShapeRendererProps {
  shape: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function ShapeRenderer({ shape, isSelected, onSelect }: ShapeRendererProps) {
  const renderShape = () => {
    switch (shape.shapeType) {
      case 'rectangle':
        return (
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width || 0}
            height={shape.height || 0}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            rx={shape.cornerRadius || 0}
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={shape.x + (shape.width || 0) / 2}
            cy={shape.y + (shape.height || 0) / 2}
            rx={(shape.width || 0) / 2}
            ry={(shape.height || 0) / 2}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
        );
      case 'polygon':
        if (!shape.points || shape.points.length < 3) return null;
        const pointsString = shape.points
          .map(p => `${shape.x + p.x},${shape.y + p.y}`)
          .join(' ');
        return (
          <polygon
            points={pointsString}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
        );
      default:
        return null;
    }
  };

  const renderSelectionIndicator = () => {
    if (!isSelected) return null;

    switch (shape.shapeType) {
      case 'rectangle':
        return (
          <rect
            x={shape.x - 4}
            y={shape.y - 4}
            width={(shape.width || 0) + 8}
            height={(shape.height || 0) + 8}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            rx={(shape.cornerRadius || 0) + 2}
            pointerEvents="none"
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={shape.x + (shape.width || 0) / 2}
            cy={shape.y + (shape.height || 0) / 2}
            rx={(shape.width || 0) / 2 + 4}
            ry={(shape.height || 0) / 2 + 4}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        );
      case 'polygon':
        if (!shape.points || shape.points.length < 3) return null;
        // For polygon, show selection handles at vertices
        return (
          <g pointerEvents="none">
            {shape.points.map((point, i) => (
              <circle
                key={i}
                cx={shape.x + point.x}
                cy={shape.y + point.y}
                r={4}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
    >
      {renderShape()}
      {renderSelectionIndicator()}
    </g>
  );
}
