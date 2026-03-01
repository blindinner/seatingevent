'use client';

import type { AreaElement } from '@/types/map';

interface AreaRendererProps {
  area: AreaElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function AreaRenderer({ area, isSelected, onSelect }: AreaRendererProps) {
  const renderShape = () => {
    switch (area.areaType) {
      case 'rectangle':
        return (
          <rect
            x={area.x}
            y={area.y}
            width={area.width || 0}
            height={area.height || 0}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
            rx={4}
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={area.x + (area.width || 0) / 2}
            cy={area.y + (area.height || 0) / 2}
            rx={(area.width || 0) / 2}
            ry={(area.height || 0) / 2}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
          />
        );
      case 'polygon':
        if (!area.points || area.points.length < 3) return null;
        const pointsString = area.points
          .map(p => `${area.x + p.x},${area.y + p.y}`)
          .join(' ');
        return (
          <polygon
            points={pointsString}
            fill={area.fill}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray="8 4"
          />
        );
      default:
        return null;
    }
  };

  const renderSelectionIndicator = () => {
    if (!isSelected) return null;

    switch (area.areaType) {
      case 'rectangle':
        return (
          <rect
            x={area.x - 4}
            y={area.y - 4}
            width={(area.width || 0) + 8}
            height={(area.height || 0) + 8}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            rx={6}
            pointerEvents="none"
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={area.x + (area.width || 0) / 2}
            cy={area.y + (area.height || 0) / 2}
            rx={(area.width || 0) / 2 + 4}
            ry={(area.height || 0) / 2 + 4}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        );
      case 'polygon':
        if (!area.points || area.points.length < 3) return null;
        // For polygon, show selection handles at vertices
        return (
          <g pointerEvents="none">
            {area.points.map((point, i) => (
              <circle
                key={i}
                cx={area.x + point.x}
                cy={area.y + point.y}
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

  // Calculate label position
  const getLabelPosition = () => {
    switch (area.areaType) {
      case 'rectangle':
      case 'ellipse':
        return {
          x: area.x + (area.width || 0) / 2,
          y: area.y + (area.height || 0) / 2,
        };
      case 'polygon':
        if (!area.points || area.points.length === 0) {
          return { x: area.x, y: area.y };
        }
        // Calculate centroid
        const sumX = area.points.reduce((sum, p) => sum + p.x, 0);
        const sumY = area.points.reduce((sum, p) => sum + p.y, 0);
        return {
          x: area.x + sumX / area.points.length,
          y: area.y + sumY / area.points.length,
        };
      default:
        return { x: area.x, y: area.y };
    }
  };

  const labelPos = getLabelPosition();

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
    >
      {renderShape()}

      {/* Label */}
      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={area.stroke}
        fontSize={14}
        fontWeight="500"
        pointerEvents="none"
      >
        {area.label}
      </text>

      {/* Capacity if set */}
      {area.capacity && (
        <text
          x={labelPos.x}
          y={labelPos.y + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={area.stroke}
          fontSize={11}
          pointerEvents="none"
        >
          ({area.capacity} capacity)
        </text>
      )}

      {renderSelectionIndicator()}
    </g>
  );
}
