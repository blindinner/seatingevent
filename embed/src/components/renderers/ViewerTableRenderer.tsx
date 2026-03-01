import React from 'react';
import type { TableElement, CategoryConfig, SeatStatusInfo, SeatElement } from '../../types';
import { ViewerSeatRenderer } from './ViewerSeatRenderer';

interface ViewerTableRendererProps {
  table: TableElement;
  categories: CategoryConfig[];
  seatStatuses: Record<string, SeatStatusInfo>;
  selectedSeatIds: Set<string>;
  onSeatClick: (seatId: string) => void;
  onSeatHover?: (e: React.MouseEvent, seat: SeatElement, rowLabel?: string, sectionLabel?: string) => void;
  onSeatLeave?: () => void;
}

export function ViewerTableRenderer({
  table,
  categories,
  seatStatuses,
  selectedSeatIds,
  onSeatClick,
  onSeatHover,
  onSeatLeave,
}: ViewerTableRendererProps) {
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

  return (
    <g transform={`rotate(${table.rotation} ${table.x} ${table.y})`}>
      {/* Table shape */}
      {renderTableShape()}

      {/* Table label */}
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
        {table.label}
      </text>

      {/* Seats around table */}
      {table.seats?.map((seat) => {
        const seatStatus = seatStatuses[seat.id] || { status: 'available' as const };
        const isSelected = selectedSeatIds.has(seat.id);
        const displayStatus = isSelected ? 'selected' : seatStatus.status;

        return (
          <ViewerSeatRenderer
            key={seat.id}
            seat={seat}
            parentX={table.x}
            parentY={table.y}
            categories={categories}
            status={displayStatus}
            isSelected={isSelected}
            onClick={() => onSeatClick(seat.id)}
            onHover={onSeatHover}
            onLeave={onSeatLeave}
            rowLabel={table.label}
          />
        );
      })}
    </g>
  );
}
