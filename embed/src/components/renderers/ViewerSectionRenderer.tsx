import React from 'react';
import type { SectionElement, CategoryConfig, SeatStatusInfo, SeatElement } from '../../types';
import { ViewerRowRenderer } from './ViewerRowRenderer';

interface ViewerSectionRendererProps {
  section: SectionElement;
  categories: CategoryConfig[];
  seatStatuses: Record<string, SeatStatusInfo>;
  selectedSeatIds: Set<string>;
  onSeatClick: (seatId: string) => void;
  onSeatHover?: (e: React.MouseEvent, seat: SeatElement, rowLabel?: string, sectionLabel?: string) => void;
  onSeatLeave?: () => void;
}

export function ViewerSectionRenderer({
  section,
  categories,
  seatStatuses,
  selectedSeatIds,
  onSeatClick,
  onSeatHover,
  onSeatLeave,
}: ViewerSectionRendererProps) {
  return (
    <g transform={`rotate(${section.rotation} ${section.x} ${section.y})`}>
      {/* Section label */}
      <text
        x={section.x}
        y={section.y - 20}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.6)"
        fontSize={14}
        fontWeight="600"
        pointerEvents="none"
      >
        {section.label}
      </text>

      {/* Rows */}
      {section.rows?.map((row) => (
        <ViewerRowRenderer
          key={row.id}
          row={{
            ...row,
            x: section.x + row.x,
            y: section.y + row.y,
          }}
          categories={categories}
          seatStatuses={seatStatuses}
          selectedSeatIds={selectedSeatIds}
          onSeatClick={onSeatClick}
          onSeatHover={onSeatHover}
          onSeatLeave={onSeatLeave}
          sectionLabel={section.label}
        />
      ))}
    </g>
  );
}
