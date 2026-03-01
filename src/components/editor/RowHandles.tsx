'use client';

import { useState, useMemo } from 'react';
import type { RowElement, Point } from '@/types/map';

export type RowHandleType = 'left-end' | 'right-end' | 'rotate';

interface RowHandlesProps {
  row: RowElement;
  zoom: number;
  onExtendStart: (handle: RowHandleType, e: React.MouseEvent) => void;
  onRotateStart: (e: React.MouseEvent) => void;
}

// Rotate a point around a center
function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
  const angleRad = angleDeg * (Math.PI / 180);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

// Calculate the actual row geometry from seat positions, applying row rotation
function getRowGeometry(row: RowElement) {
  // Get first and last seat positions in LOCAL coordinates (before rotation)
  let localFirstX: number, localFirstY: number;
  let localLastX: number, localLastY: number;

  if (row.seats && row.seats.length > 0) {
    // Use actual seat positions (local to row)
    const firstSeat = row.seats[0];
    const lastSeat = row.seats[row.seats.length - 1];
    localFirstX = row.x + firstSeat.x;
    localFirstY = row.y + firstSeat.y;
    localLastX = row.x + lastSeat.x;
    localLastY = row.y + lastSeat.y;
  } else {
    // Fallback: calculate from row properties (horizontal layout)
    localFirstX = row.x;
    localFirstY = row.y;
    localLastX = row.x + (row.seatCount - 1) * row.seatSpacing;
    localLastY = row.y;
  }

  // Calculate the rotation center (same as RowRenderer uses)
  const localCenterX = (localFirstX + localLastX) / 2;
  const localCenterY = (localFirstY + localLastY) / 2;

  // Apply row rotation to get world coordinates
  const rotation = row.rotation || 0;
  const firstRotated = rotatePoint(localFirstX, localFirstY, localCenterX, localCenterY, rotation);
  const lastRotated = rotatePoint(localLastX, localLastY, localCenterX, localCenterY, rotation);

  const firstSeatX = firstRotated.x;
  const firstSeatY = firstRotated.y;
  const lastSeatX = lastRotated.x;
  const lastSeatY = lastRotated.y;

  // Calculate row direction vector (in world space, after rotation)
  const dx = lastSeatX - firstSeatX;
  const dy = lastSeatY - firstSeatY;
  const rowLength = Math.sqrt(dx * dx + dy * dy);

  // Normalized direction (from first to last seat)
  const dirX = rowLength > 0 ? dx / rowLength : 1;
  const dirY = rowLength > 0 ? dy / rowLength : 0;

  // Row center (same before and after rotation around itself)
  const centerX = localCenterX;
  const centerY = localCenterY;

  // Row angle in degrees (includes both seat arrangement angle AND rotation property)
  const localAngle = Math.atan2(localLastY - localFirstY, localLastX - localFirstX) * (180 / Math.PI);
  const angle = localAngle + rotation;

  return {
    firstSeatX,
    firstSeatY,
    lastSeatX,
    lastSeatY,
    centerX,
    centerY,
    dirX,
    dirY,
    rowLength,
    angle,
    rotation,
  };
}

// Check if row is segmented (seats don't follow a straight line)
export function isSegmentedRow(row: RowElement): boolean {
  if (!row.seats || row.seats.length < 3) return false;

  const firstSeat = row.seats[0];
  const lastSeat = row.seats[row.seats.length - 1];
  const totalDx = lastSeat.x - firstSeat.x;
  const totalDy = lastSeat.y - firstSeat.y;
  const totalLength = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

  if (totalLength < 1) return false;

  const dirX = totalDx / totalLength;
  const dirY = totalDy / totalLength;

  for (let i = 1; i < row.seats.length - 1; i++) {
    const seat = row.seats[i];
    const dx = seat.x - firstSeat.x;
    const dy = seat.y - firstSeat.y;
    const perpendicular = Math.abs(dx * (-dirY) + dy * dirX);
    if (perpendicular > row.seatRadius * 2) {
      return true;
    }
  }
  return false;
}

// Get bounding box for segmented row (considering all seat positions with rotation)
function getSegmentedRowBounds(row: RowElement, padding: number, rotation: number): { x: number; y: number; width: number; height: number } {
  if (!row.seats || row.seats.length === 0) {
    return { x: row.x - padding, y: row.y - padding, width: padding * 2, height: padding * 2 };
  }

  const seats = row.seats;

  // Calculate rotation center
  const firstSeat = seats[0];
  const lastSeat = seats[seats.length - 1];
  const localCenterX = row.x + (firstSeat.x + lastSeat.x) / 2;
  const localCenterY = row.y + (firstSeat.y + lastSeat.y) / 2;

  // Get world positions for all seats (with rotation applied)
  const worldSeats = seats.map(seat => {
    const localX = row.x + seat.x;
    const localY = row.y + seat.y;
    return rotatePoint(localX, localY, localCenterX, localCenterY, rotation);
  });

  // Find bounding box
  const seatRadius = row.seatRadius;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const seat of worldSeats) {
    minX = Math.min(minX, seat.x - seatRadius);
    minY = Math.min(minY, seat.y - seatRadius);
    maxX = Math.max(maxX, seat.x + seatRadius);
    maxY = Math.max(maxY, seat.y + seatRadius);
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
  };
}

export function RowHandles({ row, zoom, onExtendStart, onRotateStart }: RowHandlesProps) {
  const [hoveredHandle, setHoveredHandle] = useState<RowHandleType | null>(null);

  const geometry = useMemo(() => getRowGeometry(row), [row]);
  const { firstSeatX, firstSeatY, lastSeatX, lastSeatY, centerX, centerY, dirX, dirY, angle } = geometry;

  // Check if this is a segmented row
  const segmented = useMemo(() => isSegmentedRow(row), [row]);

  // Handle sizes adjusted for zoom
  const handleRadius = 6 / zoom;
  const rotateHandleRadius = 5 / zoom;
  const rotateHandleDistance = 30 / zoom;
  const strokeWidth = 1.5 / zoom;
  const handleOffset = row.seatRadius + 10 / zoom;
  const outlinePadding = row.seatRadius + 5 / zoom;

  // Position handles at the ends of the row, along the row direction
  const leftEndX = firstSeatX - dirX * handleOffset;
  const leftEndY = firstSeatY - dirY * handleOffset;
  const rightEndX = lastSeatX + dirX * handleOffset;
  const rightEndY = lastSeatY + dirY * handleOffset;

  // Rotation handle position (perpendicular to row, above center)
  const perpX = -dirY;
  const perpY = dirX;
  const rotateX = centerX + perpX * (row.seatRadius + rotateHandleDistance);
  const rotateY = centerY + perpY * (row.seatRadius + rotateHandleDistance);

  // Arrow offset for visual indicators
  const arrowOffset = 3 / zoom;
  const arrowLength = 3 / zoom;

  // Get bounding box for segmented rows
  const segmentedBounds = useMemo(() => {
    if (!segmented) return null;
    return getSegmentedRowBounds(row, 5 / zoom, geometry.rotation);
  }, [segmented, row, zoom, geometry.rotation]);

  return (
    <g>
      {/* Selection outline - bounding box rectangle for both segmented and straight rows */}
      {segmented && segmentedBounds ? (
        <rect
          x={segmentedBounds.x}
          y={segmentedBounds.y}
          width={segmentedBounds.width}
          height={segmentedBounds.height}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          rx={4 / zoom}
          pointerEvents="none"
        />
      ) : (
        <rect
          x={firstSeatX - row.seatRadius - 5 / zoom}
          y={firstSeatY - row.seatRadius - 5 / zoom}
          width={geometry.rowLength + row.seatRadius * 2 + 10 / zoom}
          height={row.seatRadius * 2 + 10 / zoom}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          rx={4 / zoom}
          pointerEvents="none"
          transform={`rotate(${angle} ${firstSeatX} ${firstSeatY})`}
        />
      )}

      {/* Left end handle - drag to add/remove seats from left (not for segmented rows) */}
      {!segmented && (
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredHandle('left-end')}
          onMouseLeave={() => setHoveredHandle(null)}
          onMouseDown={(e) => {
            e.stopPropagation();
            onExtendStart('left-end', e);
          }}
        >
          {/* Handle circle */}
          <circle
            cx={leftEndX}
            cy={leftEndY}
            r={handleRadius}
            fill={hoveredHandle === 'left-end' ? '#3b82f6' : '#ffffff'}
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
          />
          {/* Extend indicator arrow pointing outward from row */}
          <path
            d={`M ${leftEndX - dirX * arrowOffset} ${leftEndY - dirY * arrowOffset}
                L ${leftEndX - dirX * (arrowOffset + arrowLength)} ${leftEndY - dirY * (arrowOffset + arrowLength) - perpX * arrowLength}
                M ${leftEndX - dirX * arrowOffset} ${leftEndY - dirY * arrowOffset}
                L ${leftEndX - dirX * (arrowOffset + arrowLength)} ${leftEndY - dirY * (arrowOffset + arrowLength) + perpX * arrowLength}`}
            stroke={hoveredHandle === 'left-end' ? '#ffffff' : '#3b82f6'}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </g>
      )}

      {/* Right end handle - drag to add/remove seats from right (not for segmented rows) */}
      {!segmented && (
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredHandle('right-end')}
          onMouseLeave={() => setHoveredHandle(null)}
          onMouseDown={(e) => {
            e.stopPropagation();
            onExtendStart('right-end', e);
          }}
        >
          {/* Handle circle */}
          <circle
            cx={rightEndX}
            cy={rightEndY}
            r={handleRadius}
            fill={hoveredHandle === 'right-end' ? '#3b82f6' : '#ffffff'}
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
          />
          {/* Extend indicator arrow pointing outward from row */}
          <path
            d={`M ${rightEndX + dirX * arrowOffset} ${rightEndY + dirY * arrowOffset}
                L ${rightEndX + dirX * (arrowOffset + arrowLength)} ${rightEndY + dirY * (arrowOffset + arrowLength) - perpX * arrowLength}
                M ${rightEndX + dirX * arrowOffset} ${rightEndY + dirY * arrowOffset}
                L ${rightEndX + dirX * (arrowOffset + arrowLength)} ${rightEndY + dirY * (arrowOffset + arrowLength) + perpX * arrowLength}`}
            stroke={hoveredHandle === 'right-end' ? '#ffffff' : '#3b82f6'}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </g>
      )}

      {/* Rotation handle - perpendicular to row */}
      <g
        style={{ cursor: 'grab' }}
        onMouseEnter={() => setHoveredHandle('rotate')}
        onMouseLeave={() => setHoveredHandle(null)}
        onMouseDown={(e) => {
          e.stopPropagation();
          onRotateStart(e);
        }}
      >
        {/* Line connecting to row */}
        <line
          x1={centerX + perpX * (row.seatRadius + 5 / zoom)}
          y1={centerY + perpY * (row.seatRadius + 5 / zoom)}
          x2={rotateX - perpX * rotateHandleRadius}
          y2={rotateY - perpY * rotateHandleRadius}
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
        />
        {/* Rotation handle circle */}
        <circle
          cx={rotateX}
          cy={rotateY}
          r={rotateHandleRadius}
          fill={hoveredHandle === 'rotate' ? '#3b82f6' : '#ffffff'}
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
        />
        {/* Rotation icon */}
        <path
          d={`M ${rotateX - 2 / zoom} ${rotateY - 1 / zoom}
              A ${2 / zoom} ${2 / zoom} 0 1 1 ${rotateX + 2 / zoom} ${rotateY - 1 / zoom}`}
          stroke={hoveredHandle === 'rotate' ? '#ffffff' : '#3b82f6'}
          strokeWidth={0.8 / zoom}
          fill="none"
        />
        <path
          d={`M ${rotateX + 2 / zoom} ${rotateY - 1 / zoom} L ${rotateX + 3 / zoom} ${rotateY - 2.5 / zoom} L ${rotateX + 0.5 / zoom} ${rotateY - 2 / zoom}`}
          fill={hoveredHandle === 'rotate' ? '#ffffff' : '#3b82f6'}
        />
      </g>
    </g>
  );
}

// Calculate the angle from center to a point
export function calculateRotationAngle(center: Point, point: Point): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because we measure from top
}

// Get the row direction vector from a row element
export function getRowDirection(row: RowElement): { dirX: number; dirY: number; angle: number } {
  const geometry = getRowGeometry(row);
  return {
    dirX: geometry.dirX,
    dirY: geometry.dirY,
    angle: geometry.angle,
  };
}

// Calculate new seat count based on drag distance along row direction
export function calculateNewSeatCount(
  currentCount: number,
  seatSpacing: number,
  dragDistance: number,
  handle: 'left-end' | 'right-end'
): number {
  // How many seats would fit in the drag distance?
  const seatsDelta = Math.round(dragDistance / seatSpacing);

  // For left handle, dragging outward (negative along row direction) adds seats
  // For right handle, dragging outward (positive along row direction) adds seats
  const newCount = handle === 'left-end'
    ? currentCount - seatsDelta  // Dragging left adds, right removes
    : currentCount + seatsDelta;

  // Minimum 1 seat, maximum 100
  return Math.max(1, Math.min(100, newCount));
}

// Simple selection outline for multi-selected rows (no handles)
interface RowSelectionOutlineProps {
  row: RowElement;
  zoom: number;
}

export function RowSelectionOutline({ row, zoom }: RowSelectionOutlineProps) {
  const geometry = useMemo(() => getRowGeometry(row), [row]);
  const { firstSeatX, firstSeatY, angle } = geometry;

  const segmented = useMemo(() => isSegmentedRow(row), [row]);
  const strokeWidth = 1.5 / zoom;
  const padding = 5 / zoom;

  // Get bounding box for segmented rows
  const segmentedBounds = useMemo(() => {
    if (!segmented) return null;
    return getSegmentedRowBounds(row, padding, geometry.rotation);
  }, [segmented, row, padding, geometry.rotation]);

  if (segmented && segmentedBounds) {
    return (
      <rect
        x={segmentedBounds.x}
        y={segmentedBounds.y}
        width={segmentedBounds.width}
        height={segmentedBounds.height}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / zoom} ${2 / zoom}`}
        rx={4 / zoom}
        pointerEvents="none"
      />
    );
  }

  return (
    <rect
      x={firstSeatX - row.seatRadius - padding}
      y={firstSeatY - row.seatRadius - padding}
      width={geometry.rowLength + row.seatRadius * 2 + padding * 2}
      height={row.seatRadius * 2 + padding * 2}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={strokeWidth}
      strokeDasharray={`${4 / zoom} ${2 / zoom}`}
      rx={4 / zoom}
      pointerEvents="none"
      transform={`rotate(${angle} ${firstSeatX} ${firstSeatY})`}
    />
  );
}
