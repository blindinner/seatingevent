'use client';

import type { SectionElement } from '@/types/map';
import { useMapStore } from '@/stores/mapStore';

interface SectionRendererProps {
  section: SectionElement;
  isSelected: boolean;
  onSelect: () => void;
}

export function SectionRenderer({ section, isSelected, onSelect }: SectionRendererProps) {
  const { getCategoryColor, map } = useMapStore();
  const labelColor = map?.labelColor || '#374151';

  const renderRows = () => {
    return section.rows.map((row, rowIndex) => {
      const rowY = section.y + row.y; // Use row's actual Y position
      // Use the row's category, or fall back to section's category
      const rowColor = getCategoryColor(row.category || section.category);

      return (
        <g key={row.id}>
          {/* Row label */}
          <text
            x={section.x + row.x - 20}
            y={rowY}
            textAnchor="end"
            dominantBaseline="middle"
            fill={labelColor}
            opacity={0.7}
            fontSize={12}
            fontWeight="500"
            pointerEvents="none"
          >
            {row.label}
          </text>

          {/* Seats in row - use actual seat data if available */}
          {row.seats && row.seats.length > 0 ? (
            // Render from actual seat data
            row.seats.map((seat, i) => {
              // Use seat's category, or row's category, or section's category
              const seatColor = getCategoryColor(seat.category || row.category || section.category);
              const x = section.x + row.x + seat.x;
              const y = rowY + seat.y;

              return (
                <g key={seat.id}>
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
            })
          ) : (
            // Fallback: generate seats from row properties
            Array.from({ length: row.seatCount }, (_, i) => {
              const x = section.x + row.x + i * row.seatSpacing;
              let seatNumber: number;

              switch (row.numberingDirection) {
                case 'right-to-left':
                  seatNumber = row.seatCount - i + (row.startNumber || 1) - 1;
                  break;
                case 'center-out':
                  const center = Math.ceil(row.seatCount / 2);
                  const offset = i - center + 1;
                  seatNumber = Math.abs(offset) * 2 + (offset <= 0 ? 0 : -1) + (row.startNumber || 1);
                  break;
                default:
                  seatNumber = i + (row.startNumber || 1);
              }

              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={rowY}
                    r={row.seatRadius}
                    fill={rowColor}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                  {row.seatRadius >= 10 && (
                    <text
                      x={x}
                      y={rowY}
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
            })
          )}
        </g>
      );
    });
  };

  // Calculate section bounds
  const maxSeatsPerRow = Math.max(...section.rows.map((r) => r.seatCount));
  const maxSpacing = Math.max(...section.rows.map((r) => r.seatSpacing));
  const maxRadius = Math.max(...section.rows.map((r) => r.seatRadius));
  const sectionWidth = (maxSeatsPerRow - 1) * maxSpacing + maxRadius * 2;
  const sectionHeight = (section.rows.length - 1) * section.rowSpacing + maxRadius * 2;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: 'pointer' }}
      transform={`rotate(${section.rotation} ${section.x + sectionWidth / 2} ${section.y + sectionHeight / 2})`}
    >
      {/* Section label */}
      <text
        x={section.x + sectionWidth / 2}
        y={section.y - 20}
        textAnchor="middle"
        fill={labelColor}
        opacity={0.85}
        fontSize={14}
        fontWeight="600"
        pointerEvents="none"
      >
        {section.label}
      </text>

      {/* Rows */}
      {renderRows()}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={section.x - maxRadius - 30}
          y={section.y - maxRadius - 30}
          width={sectionWidth + 60}
          height={sectionHeight + 60}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
          rx={8}
        />
      )}
    </g>
  );
}
