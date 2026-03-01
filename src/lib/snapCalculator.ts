import type { Bounds, Point, SnapGuide } from '@/types/map';

const SNAP_THRESHOLD = 8;

interface SnapResult {
  snappedPosition: Point;
  guides: SnapGuide[];
}

interface BoundsWithCenter extends Bounds {
  centerX: number;
  centerY: number;
  right: number;
  bottom: number;
}

function getBoundsWithCenter(bounds: Bounds): BoundsWithCenter {
  return {
    ...bounds,
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
    right: bounds.x + bounds.width,
    bottom: bounds.y + bounds.height,
  };
}

export function calculateSnapGuides(
  draggingBounds: Bounds,
  allBounds: Bounds[],
  canvasWidth: number = 1000,
  canvasHeight: number = 800,
  threshold: number = SNAP_THRESHOLD
): SnapResult {
  const guides: SnapGuide[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;
  let deltaX = 0;
  let deltaY = 0;

  const dragging = getBoundsWithCenter(draggingBounds);

  // Canvas center guides
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  // Check canvas center X alignment
  if (Math.abs(dragging.centerX - canvasCenterX) < threshold) {
    guides.push({ type: 'vertical', position: canvasCenterX, isCenter: true });
    deltaX = canvasCenterX - dragging.centerX;
    snapX = canvasCenterX;
  }

  // Check canvas center Y alignment
  if (Math.abs(dragging.centerY - canvasCenterY) < threshold) {
    guides.push({ type: 'horizontal', position: canvasCenterY, isCenter: true });
    deltaY = canvasCenterY - dragging.centerY;
    snapY = canvasCenterY;
  }

  // Check alignment with other elements
  for (const bounds of allBounds) {
    const target = getBoundsWithCenter(bounds);

    // Skip self
    if (
      bounds.x === draggingBounds.x &&
      bounds.y === draggingBounds.y &&
      bounds.width === draggingBounds.width &&
      bounds.height === draggingBounds.height
    ) {
      continue;
    }

    // Vertical alignment checks (X axis)
    if (snapX === null) {
      // Left edge to left edge
      if (Math.abs(dragging.x - target.x) < threshold) {
        guides.push({ type: 'vertical', position: target.x, isCenter: false });
        deltaX = target.x - dragging.x;
        snapX = target.x;
      }
      // Right edge to right edge
      else if (Math.abs(dragging.right - target.right) < threshold) {
        guides.push({ type: 'vertical', position: target.right, isCenter: false });
        deltaX = target.right - dragging.right;
        snapX = target.right;
      }
      // Center to center
      else if (Math.abs(dragging.centerX - target.centerX) < threshold) {
        guides.push({ type: 'vertical', position: target.centerX, isCenter: true });
        deltaX = target.centerX - dragging.centerX;
        snapX = target.centerX;
      }
      // Left edge to right edge
      else if (Math.abs(dragging.x - target.right) < threshold) {
        guides.push({ type: 'vertical', position: target.right, isCenter: false });
        deltaX = target.right - dragging.x;
        snapX = target.right;
      }
      // Right edge to left edge
      else if (Math.abs(dragging.right - target.x) < threshold) {
        guides.push({ type: 'vertical', position: target.x, isCenter: false });
        deltaX = target.x - dragging.right;
        snapX = target.x;
      }
    }

    // Horizontal alignment checks (Y axis)
    if (snapY === null) {
      // Top edge to top edge
      if (Math.abs(dragging.y - target.y) < threshold) {
        guides.push({ type: 'horizontal', position: target.y, isCenter: false });
        deltaY = target.y - dragging.y;
        snapY = target.y;
      }
      // Bottom edge to bottom edge
      else if (Math.abs(dragging.bottom - target.bottom) < threshold) {
        guides.push({ type: 'horizontal', position: target.bottom, isCenter: false });
        deltaY = target.bottom - dragging.bottom;
        snapY = target.bottom;
      }
      // Center to center
      else if (Math.abs(dragging.centerY - target.centerY) < threshold) {
        guides.push({ type: 'horizontal', position: target.centerY, isCenter: true });
        deltaY = target.centerY - dragging.centerY;
        snapY = target.centerY;
      }
      // Top edge to bottom edge
      else if (Math.abs(dragging.y - target.bottom) < threshold) {
        guides.push({ type: 'horizontal', position: target.bottom, isCenter: false });
        deltaY = target.bottom - dragging.y;
        snapY = target.bottom;
      }
      // Bottom edge to top edge
      else if (Math.abs(dragging.bottom - target.y) < threshold) {
        guides.push({ type: 'horizontal', position: target.y, isCenter: false });
        deltaY = target.y - dragging.bottom;
        snapY = target.y;
      }
    }

    // Early exit if both snaps found
    if (snapX !== null && snapY !== null) {
      break;
    }
  }

  return {
    snappedPosition: {
      x: draggingBounds.x + deltaX,
      y: draggingBounds.y + deltaY,
    },
    guides,
  };
}

export function getElementCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}
