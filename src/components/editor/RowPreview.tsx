'use client';

import type { Point } from '@/types/map';
import type { SeatPreview, RowPreview as RowPreviewData } from '@/lib/rowPreviewCalculator';
import { formatAngle, isAngleStraight } from '@/lib/rowPreviewCalculator';

interface RowPreviewProps {
  startPoint: Point | null;
  currentPoint: Point | null;
  segmentStartPoint: Point | null; // For segmented rows: where current segment starts (last seat position)
  previewSeats: SeatPreview[];
  previewRows: RowPreviewData[];
  angle: number;
  seatRadius: number;
  zoom: number;
}

export function RowPreview({
  startPoint,
  currentPoint,
  segmentStartPoint,
  previewSeats,
  previewRows,
  angle,
  seatRadius,
  zoom,
}: RowPreviewProps) {
  if (!startPoint) return null;

  const isStraight = isAngleStraight(angle);
  const formattedAngle = formatAngle(angle);

  // Calculate total seat count
  const totalSeats = previewRows.length > 0
    ? previewRows.reduce((sum, row) => sum + row.seats.length, 0)
    : previewSeats.length;

  // Calculate badge position - near the cursor/endpoint
  const badgePoint = currentPoint || startPoint;
  const badgeOffsetX = 20 / zoom;
  const badgeOffsetY = -30 / zoom;

  // For the guideline, use segmentStartPoint if available (for segmented rows)
  // This shows the line from the last placed seat to the cursor
  const guidelineStart = segmentStartPoint || startPoint;

  return (
    <g className="row-preview" style={{ pointerEvents: 'none' }}>
      {/* Guideline from segment start to cursor */}
      {currentPoint && (
        <line
          x1={guidelineStart.x}
          y1={guidelineStart.y}
          x2={currentPoint.x}
          y2={currentPoint.y}
          stroke={isStraight ? '#22c55e' : '#6b7280'}
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom} ${4 / zoom}`}
          opacity={0.8}
        />
      )}

      {/* Preview seats for single row or segmented row */}
      {previewSeats.map((seat, index) => (
        <circle
          key={`preview-seat-${index}`}
          cx={seat.x}
          cy={seat.y}
          r={seatRadius}
          fill="#3b82f6"
          opacity={0.5}
          stroke="#60a5fa"
          strokeWidth={1 / zoom}
        />
      ))}

      {/* Preview rows for multiple rows tool */}
      {previewRows.map((row, rowIndex) => (
        <g key={`preview-row-${rowIndex}`}>
          {/* Row guideline */}
          <line
            x1={row.startPoint.x}
            y1={row.startPoint.y}
            x2={row.endPoint.x}
            y2={row.endPoint.y}
            stroke={rowIndex === 0 ? '#3b82f6' : '#6b7280'}
            strokeWidth={1 / zoom}
            strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            opacity={0.4}
          />
          {/* Seats for this row */}
          {row.seats.map((seat, seatIndex) => (
            <circle
              key={`preview-row-${rowIndex}-seat-${seatIndex}`}
              cx={seat.x}
              cy={seat.y}
              r={seatRadius}
              fill={rowIndex === 0 ? '#3b82f6' : '#8b5cf6'}
              opacity={0.5}
              stroke={rowIndex === 0 ? '#60a5fa' : '#a78bfa'}
              strokeWidth={1 / zoom}
            />
          ))}
        </g>
      ))}

      {/* Start point indicator */}
      <circle
        cx={startPoint.x}
        cy={startPoint.y}
        r={4 / zoom}
        fill="#22c55e"
        stroke="#fff"
        strokeWidth={1 / zoom}
      />

      {/* Info badges */}
      {totalSeats > 0 && (
        <g transform={`translate(${badgePoint.x + badgeOffsetX}, ${badgePoint.y + badgeOffsetY})`}>
          {/* Background */}
          <rect
            x={0}
            y={0}
            width={previewRows.length > 0 ? 90 / zoom : 70 / zoom}
            height={previewRows.length > 0 ? 50 / zoom : 40 / zoom}
            rx={4 / zoom}
            fill="rgba(0, 0, 0, 0.8)"
          />

          {/* Angle badge */}
          <rect
            x={4 / zoom}
            y={4 / zoom}
            width={40 / zoom}
            height={16 / zoom}
            rx={3 / zoom}
            fill={isStraight ? '#22c55e' : '#4b5563'}
          />
          <text
            x={24 / zoom}
            y={15 / zoom}
            textAnchor="middle"
            fill="#fff"
            fontSize={10 / zoom}
            fontWeight="bold"
          >
            {formattedAngle}
          </text>

          {/* Seat count badge */}
          <text
            x={50 / zoom}
            y={15 / zoom}
            fill="#9ca3af"
            fontSize={10 / zoom}
          >
            {totalSeats} {totalSeats === 1 ? 'seat' : 'seats'}
          </text>

          {/* Row count badge (for multiple rows) */}
          {previewRows.length > 0 && (
            <text
              x={8 / zoom}
              y={35 / zoom}
              fill="#a78bfa"
              fontSize={10 / zoom}
            >
              {previewRows.length} {previewRows.length === 1 ? 'row' : 'rows'}
            </text>
          )}
        </g>
      )}
    </g>
  );
}
