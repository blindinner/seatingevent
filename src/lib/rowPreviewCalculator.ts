import type { Point } from '@/types/map';

export interface SeatPreview {
  x: number;
  y: number;
  index: number;
}

export interface RowPreview {
  startPoint: Point;
  endPoint: Point;
  seats: SeatPreview[];
  angle: number;
}

/**
 * Calculate seats for a row preview from start to end point at any angle.
 * Returns the seats positioned along the line and the angle in degrees.
 */
export function calculateRowPreview(
  startPoint: Point,
  endPoint: Point,
  seatSpacing: number,
  seatRadius: number
): { seats: SeatPreview[]; angle: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Calculate how many seats fit in the distance
  // First seat at start, then spaced by seatSpacing
  const seatCount = Math.max(1, Math.floor(distance / seatSpacing) + 1);

  // Unit vector in the direction of the row
  const unitX = distance > 0 ? dx / distance : 1;
  const unitY = distance > 0 ? dy / distance : 0;

  const seats: SeatPreview[] = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      x: startPoint.x + unitX * i * seatSpacing,
      y: startPoint.y + unitY * i * seatSpacing,
      index: i,
    });
  }

  return { seats, angle };
}

/**
 * Calculate the angle between two points in degrees.
 * 0° is pointing right, 90° is pointing down.
 */
export function calculateAngle(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Normalize an angle to be between -180 and 180 degrees.
 */
export function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

/**
 * Check if an angle is "straight" (close to 0°, 45°, 90°, 135°, 180°, etc.).
 * Returns true if within tolerance of a straight angle.
 */
export function isAngleStraight(angle: number, tolerance: number = 2): boolean {
  const normalizedAngle = normalizeAngle(angle);
  const absAngle = Math.abs(normalizedAngle);

  // Check for 0°, 45°, 90°, 135°, 180° (and their negatives)
  const straightAngles = [0, 45, 90, 135, 180];

  return straightAngles.some((straight) => {
    const diff = Math.abs(absAngle - straight);
    return diff <= tolerance || diff >= 180 - tolerance;
  });
}

/**
 * Get the nearest straight angle to the given angle.
 */
export function getNearestStraightAngle(angle: number): number {
  const normalizedAngle = normalizeAngle(angle);
  const straightAngles = [-180, -135, -90, -45, 0, 45, 90, 135, 180];

  let nearest = 0;
  let minDiff = Infinity;

  for (const straight of straightAngles) {
    const diff = Math.abs(normalizedAngle - straight);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = straight;
    }
  }

  return nearest;
}

/**
 * Format an angle for display (e.g., "45°", "-90°").
 */
export function formatAngle(angle: number): string {
  const normalized = normalizeAngle(angle);
  return `${Math.round(normalized)}°`;
}

/**
 * Calculate multiple parallel rows based on cursor position.
 * The rows are perpendicular to the first row's direction.
 */
export function calculateMultipleRowsPreview(
  firstRowStart: Point,
  firstRowEnd: Point,
  cursorPoint: Point,
  firstRowSeats: SeatPreview[],
  rowAngle: number,
  rowSpacing: number,
  seatSpacing: number,
  seatRadius: number
): RowPreview[] {
  // Calculate perpendicular direction (rotated 90 degrees)
  const angleRad = (rowAngle * Math.PI) / 180;
  const perpAngleRad = angleRad + Math.PI / 2; // 90 degrees perpendicular

  // Unit vector perpendicular to the row direction
  const perpUnitX = Math.cos(perpAngleRad);
  const perpUnitY = Math.sin(perpAngleRad);

  // Calculate distance from first row to cursor along perpendicular direction
  const dx = cursorPoint.x - firstRowStart.x;
  const dy = cursorPoint.y - firstRowStart.y;

  // Project cursor offset onto perpendicular direction
  const perpDistance = dx * perpUnitX + dy * perpUnitY;

  // Calculate number of rows based on distance
  const numRows = Math.max(1, Math.floor(Math.abs(perpDistance) / rowSpacing) + 1);

  // Direction of row addition (positive or negative perpendicular)
  const direction = perpDistance >= 0 ? 1 : -1;

  const rows: RowPreview[] = [];

  for (let i = 0; i < numRows; i++) {
    // Calculate offset for this row
    const offset = i * rowSpacing * direction;

    // Calculate start point for this row
    const rowStartX = firstRowStart.x + perpUnitX * offset;
    const rowStartY = firstRowStart.y + perpUnitY * offset;

    const rowEndX = firstRowEnd.x + perpUnitX * offset;
    const rowEndY = firstRowEnd.y + perpUnitY * offset;

    // Generate seats for this row
    const { seats } = calculateRowPreview(
      { x: rowStartX, y: rowStartY },
      { x: rowEndX, y: rowEndY },
      seatSpacing,
      seatRadius
    );

    rows.push({
      startPoint: { x: rowStartX, y: rowStartY },
      endPoint: { x: rowEndX, y: rowEndY },
      seats,
      angle: rowAngle,
    });
  }

  return rows;
}

/**
 * Calculate the distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
