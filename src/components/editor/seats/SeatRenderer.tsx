'use client';

import type { SeatElement } from '@/types/map';
import { useMapStore } from '@/stores/mapStore';

interface SeatRendererProps {
  seat: SeatElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function SeatRenderer({ seat, isSelected, onSelect }: SeatRendererProps) {
  const { getCategoryColor } = useMapStore();
  const color = getCategoryColor(seat.category);

  const getStatusColor = () => {
    switch (seat.status) {
      case 'selected':
        return '#22C55E';
      case 'booked':
        return '#EF4444';
      case 'blocked':
        return '#6B7280';
      case 'reserved':
        return '#F59E0B';
      default:
        return color;
    }
  };

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      transform={`rotate(${seat.rotation} ${seat.x} ${seat.y})`}
    >
      <circle
        cx={seat.x}
        cy={seat.y}
        r={seat.radius}
        fill={getStatusColor()}
        stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'}
        strokeWidth={isSelected ? 3 : 1}
      />
      {seat.radius >= 12 && (
        <text
          x={seat.x}
          y={seat.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.max(8, seat.radius * 0.7)}
          fontWeight="500"
          pointerEvents="none"
        >
          {seat.label}
        </text>
      )}
    </g>
  );
}
