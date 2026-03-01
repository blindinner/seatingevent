import React from 'react';
import type { RowElement, CategoryConfig, SeatStatusInfo, SeatElement } from '../../types';
import { ViewerSeatRenderer } from './ViewerSeatRenderer';

interface ViewerRowRendererProps {
  row: RowElement;
  categories: CategoryConfig[];
  seatStatuses: Record<string, SeatStatusInfo>;
  selectedSeatIds: Set<string>;
  onSeatClick: (seatId: string) => void;
  onSeatHover?: (e: React.MouseEvent, seat: SeatElement, rowLabel?: string, sectionLabel?: string) => void;
  onSeatLeave?: () => void;
  sectionLabel?: string;
}

export function ViewerRowRenderer({
  row,
  categories,
  seatStatuses,
  selectedSeatIds,
  onSeatClick,
  onSeatHover,
  onSeatLeave,
  sectionLabel,
}: ViewerRowRendererProps) {
  const getBounds = () => {
    if (row.seats && row.seats.length > 0) {
      const xs = row.seats.map((s) => s.x);
      const ys = row.seats.map((s) => s.y);
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
    return {
      x: row.x,
      y: row.y,
      width: (row.seatCount - 1) * row.seatSpacing,
      height: 0,
    };
  };

  const bounds = getBounds();

  // Get label position setting (default to 'left')
  const labelPosition = row.rowLabelPosition ?? 'left';
  const showStartLabel = labelPosition === 'left' || labelPosition === 'both';
  const showEndLabel = labelPosition === 'both';

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

  const dx = lastSeat.x - firstSeat.x;
  const dy = lastSeat.y - firstSeat.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / length;
  const dirY = dy / length;
  const labelOffset = row.seatRadius + 15;

  return (
    <g
      transform={`rotate(${row.rotation} ${bounds.x + bounds.width / 2} ${bounds.y + bounds.height / 2})`}
    >
      {/* Row label at beginning */}
      {showStartLabel && (
        <text
          x={firstSeat.x - dirX * labelOffset}
          y={firstSeat.y - dirY * labelOffset}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.5)"
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
          fill="rgba(255,255,255,0.5)"
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {row.label}
        </text>
      )}

      {/* Seats */}
      {row.seats?.map((seat) => {
        const seatStatus = seatStatuses[seat.id] || { status: 'available' as const };
        const isSelected = selectedSeatIds.has(seat.id);
        const displayStatus = isSelected ? 'selected' : seatStatus.status;

        return (
          <ViewerSeatRenderer
            key={seat.id}
            seat={seat}
            parentX={row.x}
            parentY={row.y}
            categories={categories}
            status={displayStatus}
            isSelected={isSelected}
            onClick={() => onSeatClick(seat.id)}
            onHover={onSeatHover}
            onLeave={onSeatLeave}
            rowLabel={row.label}
            sectionLabel={sectionLabel}
          />
        );
      })}
    </g>
  );
}
