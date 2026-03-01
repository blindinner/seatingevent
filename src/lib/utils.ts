import type { MapElement, Bounds, Point } from '@/types/map';

export function calculateBounds(elements: MapElement[]): Bounds {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const elementBounds = getElementBounds(element);
    minX = Math.min(minX, elementBounds.x);
    minY = Math.min(minY, elementBounds.y);
    maxX = Math.max(maxX, elementBounds.x + elementBounds.width);
    maxY = Math.max(maxY, elementBounds.y + elementBounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getElementBounds(element: MapElement): Bounds {
  switch (element.type) {
    case 'seat':
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        width: element.radius * 2,
        height: element.radius * 2,
      };
    case 'row':
      // If row has actual seat data, calculate bounds from seat positions
      if (element.seats && element.seats.length > 0) {
        const seatXs = element.seats.map((s: { x: number }) => element.x + s.x);
        const seatYs = element.seats.map((s: { y: number }) => element.y + s.y);
        const radius = element.seatRadius || 12;
        const minX = Math.min(...seatXs) - radius;
        const maxX = Math.max(...seatXs) + radius;
        const minY = Math.min(...seatYs) - radius;
        const maxY = Math.max(...seatYs) + radius;
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
      // Fallback: calculate from row properties
      const rowWidth = (element.seatCount - 1) * element.seatSpacing + element.seatRadius * 2;
      return {
        x: element.x - element.seatRadius,
        y: element.y - element.seatRadius,
        width: rowWidth,
        height: element.seatRadius * 2,
      };
    case 'section':
      const sectionWidth = element.rows[0]
        ? (element.rows[0].seatCount - 1) * element.rows[0].seatSpacing + element.rows[0].seatRadius * 2
        : 100;
      const sectionHeight = element.rows.length * element.rowSpacing;
      return {
        x: element.x,
        y: element.y,
        width: sectionWidth,
        height: sectionHeight,
      };
    case 'stage':
    case 'rectangle':
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    case 'circle':
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        width: element.radius * 2,
        height: element.radius * 2,
      };
    case 'table':
      // Table center is at (element.x, element.y)
      // Calculate bounds that keep center at table position
      if (element.seats && element.seats.length > 0) {
        const seatRadius = element.seats[0]?.radius || 12;
        // Find the maximum extent from center in each direction
        let maxExtentX = element.width / 2;
        let maxExtentY = element.height / 2;
        element.seats.forEach((seat: { x: number; y: number; radius?: number }) => {
          const r = seat.radius || seatRadius;
          maxExtentX = Math.max(maxExtentX, Math.abs(seat.x) + r);
          maxExtentY = Math.max(maxExtentY, Math.abs(seat.y) + r);
        });
        // Create symmetric bounds centered on table position
        return {
          x: element.x - maxExtentX,
          y: element.y - maxExtentY,
          width: maxExtentX * 2,
          height: maxExtentY * 2,
        };
      }
      // Fallback for tables without seat data
      const tableRadius = element.width / 2 + 32;
      return {
        x: element.x - tableRadius,
        y: element.y - tableRadius,
        width: tableRadius * 2,
        height: tableRadius * 2,
      };
    case 'text':
      // Text element: x,y is the center point, use width/height if available
      if (element.width && element.height) {
        return {
          x: element.x - element.width / 2,
          y: element.y - element.height / 2,
          width: element.width,
          height: element.height,
        };
      }
      // Fallback for old text elements without width/height
      const textPadding = 8;
      const textWidth = Math.max(element.text.length * element.fontSize * 0.6, 40); // Min width 40px
      const textHeight = element.fontSize + textPadding * 2;
      return {
        x: element.x - textWidth / 2,
        y: element.y - textHeight / 2,
        width: textWidth,
        height: textHeight,
      };
    case 'shape':
      // For polygon shapes, calculate bounds from points
      if (element.shapeType === 'polygon' && element.points && element.points.length >= 3) {
        const xs = element.points.map((p: { x: number; y: number }) => element.x + p.x);
        const ys = element.points.map((p: { x: number; y: number }) => element.y + p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
      // Rectangle and ellipse shapes use width/height
      return {
        x: element.x,
        y: element.y,
        width: element.width || 50,
        height: element.height || 50,
      };
    case 'area':
      // Areas have width and height
      return {
        x: element.x,
        y: element.y,
        width: element.width || 100,
        height: element.height || 100,
      };
    case 'booth':
      // Booths have width and height
      return {
        x: element.x,
        y: element.y,
        width: element.width || 60,
        height: element.height || 40,
      };
    case 'line':
      // Lines: calculate bounding box from points
      if (element.points && element.points.length >= 2) {
        const xs = element.points.map((p: { x: number; y: number }) => element.x + p.x);
        const ys = element.points.map((p: { x: number; y: number }) => element.y + p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        // Add padding for easier selection
        const padding = 5;
        return {
          x: minX - padding,
          y: minY - padding,
          width: Math.max(maxX - minX + padding * 2, 10),
          height: Math.max(maxY - minY + padding * 2, 10),
        };
      }
      return { x: element.x, y: element.y, width: 50, height: 50 };
    default:
      // Fallback: check if element has width/height
      if ('width' in element && 'height' in element) {
        return {
          x: element.x,
          y: element.y,
          width: (element as any).width || 50,
          height: (element as any).height || 50,
        };
      }
      return { x: element.x, y: element.y, width: 50, height: 50 };
  }
}

export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  pan: Point,
  zoom: number
): Point {
  return {
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  pan: Point,
  zoom: number
): Point {
  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y,
  };
}

export function formatSeatLabel(
  rowLabel: string,
  seatNumber: number,
  direction: 'left-to-right' | 'right-to-left' | 'center-out',
  totalSeats: number
): string {
  let displayNumber: number;

  switch (direction) {
    case 'left-to-right':
      displayNumber = seatNumber;
      break;
    case 'right-to-left':
      displayNumber = totalSeats - seatNumber + 1;
      break;
    case 'center-out':
      const center = Math.ceil(totalSeats / 2);
      const offset = seatNumber - center;
      displayNumber = Math.abs(offset) * 2 + (offset <= 0 ? 1 : 0);
      break;
    default:
      displayNumber = seatNumber;
  }

  return `${rowLabel}${displayNumber}`;
}

export function generateRowLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
