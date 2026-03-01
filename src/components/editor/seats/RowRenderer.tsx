'use client';

import type { RowElement } from '@/types/map';
import { useMapStore } from '@/stores/mapStore';

interface RowRendererProps {
  row: RowElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function RowRenderer({ row, isSelected, onSelect }: RowRendererProps) {
  const { getCategoryColor, map } = useMapStore();
  const color = getCategoryColor(row.category);
  const labelColor = map?.labelColor || '#374151';

  const renderSeats = () => {
    // Use actual seat data if available, otherwise fall back to calculated positions
    if (row.seats && row.seats.length > 0) {
      return row.seats.map((seat, i) => {
        const x = row.x + seat.x;
        const y = row.y + seat.y;
        const seatColor = getCategoryColor(seat.category);

        return (
          <g key={seat.id || i}>
            <circle
              cx={x}
              cy={y}
              r={seat.radius || row.seatRadius}
              fill={seatColor}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
            />
            {(seat.radius || row.seatRadius) >= 10 && (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={Math.max(6, (seat.radius || row.seatRadius) * 0.6)}
                fontWeight="500"
                pointerEvents="none"
              >
                {seat.label.replace(row.label, '')}
              </text>
            )}
          </g>
        );
      });
    }

    // Fallback: calculate positions (for backwards compatibility)
    const seats = [];
    for (let i = 0; i < row.seatCount; i++) {
      const x = row.x + i * row.seatSpacing;
      const y = row.y;

      let seatNumber: number;
      switch (row.numberingDirection) {
        case 'right-to-left':
          seatNumber = row.seatCount - i + row.startNumber - 1;
          break;
        case 'center-out':
          const center = Math.ceil(row.seatCount / 2);
          const offset = i - center + 1;
          seatNumber = Math.abs(offset) * 2 + (offset <= 0 ? 0 : -1) + row.startNumber;
          break;
        default:
          seatNumber = i + row.startNumber;
      }

      seats.push(
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={row.seatRadius}
            fill={color}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          {row.seatRadius >= 10 && (
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={Math.max(6, row.seatRadius * 0.6)}
              fontWeight="500"
              pointerEvents="none"
            >
              {seatNumber}
            </text>
          )}
        </g>
      );
    }
    return seats;
  };

  // Calculate bounds based on actual seat positions
  const getBounds = () => {
    if (row.seats && row.seats.length > 0) {
      const xs = row.seats.map(s => s.x);
      const ys = row.seats.map(s => s.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: row.x + minX,
        y: row.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    // Fallback for horizontal layout
    return {
      x: row.x,
      y: row.y,
      width: (row.seatCount - 1) * row.seatSpacing,
      height: 0,
    };
  };

  const bounds = getBounds();

  // Get label position setting (default to 'left' for beginning)
  const labelPosition = row.rowLabelPosition ?? 'left';
  const showStartLabel = labelPosition === 'left' || labelPosition === 'both';
  const showEndLabel = labelPosition === 'both';

  // Calculate label positions based on first and last seat
  const getFirstSeatPos = () => {
    if (row.seats && row.seats.length > 0) {
      return { x: row.x + row.seats[0].x, y: row.y + row.seats[0].y };
    }
    return { x: row.x, y: row.y };
  };

  const getLastSeatPos = () => {
    if (row.seats && row.seats.length > 0) {
      const lastSeat = row.seats[row.seats.length - 1];
      return { x: row.x + lastSeat.x, y: row.y + lastSeat.y };
    }
    return { x: row.x + (row.seatCount - 1) * row.seatSpacing, y: row.y };
  };

  const firstSeat = getFirstSeatPos();
  const lastSeat = getLastSeatPos();

  // Calculate direction vector for label offset
  const dx = lastSeat.x - firstSeat.x;
  const dy = lastSeat.y - firstSeat.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / length;
  const dirY = dy / length;

  // Label offset from seats
  const labelOffset = row.seatRadius + 15;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      transform={`rotate(${row.rotation} ${bounds.x + bounds.width / 2} ${bounds.y + bounds.height / 2})`}
    >
      {/* Row label at beginning */}
      {showStartLabel && (
        <text
          x={firstSeat.x - dirX * labelOffset}
          y={firstSeat.y - dirY * labelOffset}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={labelColor}
          opacity={0.7}
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {row.label}
        </text>
      )}

      {/* Row label at end */}
      {showEndLabel && (
        <text
          x={lastSeat.x + dirX * labelOffset}
          y={lastSeat.y + dirY * labelOffset}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={labelColor}
          opacity={0.7}
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {row.label}
        </text>
      )}

      {/* Seats */}
      {renderSeats()}
    </g>
  );
}
