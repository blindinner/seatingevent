import React, { useState } from 'react';
import type { SeatElement, CategoryConfig, WidgetSeatStatus } from '../../types';

// Uniform color for available seats
const AVAILABLE_COLOR = '#6366F1'; // Indigo

interface ViewerSeatRendererProps {
  seat: SeatElement;
  parentX: number;
  parentY: number;
  categories: CategoryConfig[];
  status: WidgetSeatStatus;
  isSelected: boolean;
  onClick: () => void;
  onHover?: (e: React.MouseEvent, seat: SeatElement, rowLabel?: string, sectionLabel?: string) => void;
  onLeave?: () => void;
  rowLabel?: string;
  sectionLabel?: string;
}

export function ViewerSeatRenderer({
  seat,
  parentX,
  parentY,
  categories,
  status,
  isSelected,
  onClick,
  onHover,
  onLeave,
  rowLabel,
  sectionLabel,
}: ViewerSeatRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const category = categories.find((c) => c.id === seat.category);
  const categoryColor = category?.color || '#6B7280';

  const isAvailable = status !== 'booked' && status !== 'held';

  // Get the fill color based on status and hover state
  const getFillColor = () => {
    // Selected always shows green
    if (status === 'selected') {
      return '#22C55E';
    }
    // Held shows orange
    if (status === 'held') {
      return '#F59E0B';
    }
    // Booked shows gray
    if (status === 'booked') {
      return '#6B7280';
    }
    // Available: show category color on hover, uniform color otherwise
    if (isHovered) {
      return categoryColor;
    }
    return AVAILABLE_COLOR;
  };

  const getCursor = () => {
    if (!isAvailable) {
      return 'not-allowed';
    }
    return 'pointer';
  };

  const x = parentX + seat.x;
  const y = parentY + seat.y;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        if (isAvailable) {
          onClick();
        }
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (onHover && isAvailable) {
          onHover(e, seat, rowLabel, sectionLabel);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onLeave) {
          onLeave();
        }
      }}
      style={{ cursor: getCursor() }}
      role="button"
      aria-label={`Seat ${seat.label}, ${status}`}
      className="smw-seat"
    >
      <circle
        cx={x}
        cy={y}
        r={seat.radius}
        fill={getFillColor()}
        stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.2)'}
        strokeWidth={isSelected ? 2.5 : 1}
        opacity={!isAvailable ? 0.5 : 1}
        className="smw-seat-circle"
        style={{ transition: 'fill 0.15s ease' }}
      />
      {seat.radius >= 10 && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.max(7, seat.radius * 0.65)}
          fontWeight="600"
          pointerEvents="none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {rowLabel ? seat.label.replace(rowLabel, '') : seat.label}
        </text>
      )}
    </g>
  );
}
