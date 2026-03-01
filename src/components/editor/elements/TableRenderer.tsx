'use client';

import type { TableElement } from '@/types/map';
import { useMapStore } from '@/stores/mapStore';

interface TableRendererProps {
  table: TableElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function TableRenderer({ table, isSelected, onSelect }: TableRendererProps) {
  const { getCategoryColor } = useMapStore();

  // Render seats from the actual seat positions stored in the table
  const renderSeats = () => {
    return table.seats.map((seat, i) => {
      const seatColor = getCategoryColor(seat.category);
      const cx = table.x + seat.x;
      const cy = table.y + seat.y;
      // Extract just the seat number/letter part from label (after the dash)
      const seatLabel = seat.label.includes('-') ? seat.label.split('-').pop() : seat.label;

      return (
        <g key={seat.id || i}>
          <circle
            cx={cx}
            cy={cy}
            r={seat.radius}
            fill={seatColor}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          {seat.radius >= 10 && (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={Math.max(6, seat.radius * 0.6)}
              fontWeight="500"
              pointerEvents="none"
            >
              {seatLabel}
            </text>
          )}
        </g>
      );
    });
  };

  // Render the table shape based on type
  const renderTableShape = () => {
    switch (table.shape) {
      case 'circle':
        return (
          <circle
            cx={table.x}
            cy={table.y}
            r={table.width / 2}
            fill={table.fill}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        );
      case 'oval':
        return (
          <ellipse
            cx={table.x}
            cy={table.y}
            rx={table.width / 2}
            ry={table.height / 2}
            fill={table.fill}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        );
      case 'rectangle':
        return (
          <rect
            x={table.x - table.width / 2}
            y={table.y - table.height / 2}
            width={table.width}
            height={table.height}
            rx={4}
            fill={table.fill}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        );
      default:
        return null;
    }
  };

  // Calculate selection indicator bounds
  const getSelectionBounds = () => {
    if (table.seats.length === 0) {
      return {
        minX: -table.width / 2 - 10,
        maxX: table.width / 2 + 10,
        minY: -table.height / 2 - 10,
        maxY: table.height / 2 + 10,
      };
    }

    const seatRadius = table.seats[0]?.radius || 12;
    let minX = -table.width / 2;
    let maxX = table.width / 2;
    let minY = -table.height / 2;
    let maxY = table.height / 2;

    table.seats.forEach((seat) => {
      minX = Math.min(minX, seat.x - seatRadius);
      maxX = Math.max(maxX, seat.x + seatRadius);
      minY = Math.min(minY, seat.y - seatRadius);
      maxY = Math.max(maxY, seat.y + seatRadius);
    });

    return { minX: minX - 4, maxX: maxX + 4, minY: minY - 4, maxY: maxY + 4 };
  };

  const bounds = getSelectionBounds();

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      transform={`rotate(${table.rotation} ${table.x} ${table.y})`}
    >
      {/* Table shape */}
      {renderTableShape()}

      {/* Table label */}
      {(table.labelVisible !== false) && (
        <text
          x={table.x}
          y={table.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {table.displayedLabel || table.label}
        </text>
      )}

      {/* Seats around table */}
      {renderSeats()}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={table.x + bounds.minX}
          y={table.y + bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          rx={table.shape === 'circle' ? (bounds.maxX - bounds.minX) / 2 : 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
