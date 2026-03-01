'use client';

import { useState } from 'react';
import type { Bounds } from '@/types/map';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface ResizeHandlesProps {
  bounds: Bounds;
  onResizeStart: (handle: ResizeHandle, e: React.MouseEvent) => void;
  zoom: number;
}

export function ResizeHandles({ bounds, onResizeStart, zoom }: ResizeHandlesProps) {
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle | null>(null);

  // Handle size adjusted for zoom
  const handleSize = 8 / zoom;
  const halfHandle = handleSize / 2;

  const handles: { id: ResizeHandle; x: number; y: number; cursor: string }[] = [
    // Corners
    { id: 'nw', x: bounds.x - halfHandle, y: bounds.y - halfHandle, cursor: 'nwse-resize' },
    { id: 'ne', x: bounds.x + bounds.width - halfHandle, y: bounds.y - halfHandle, cursor: 'nesw-resize' },
    { id: 'se', x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height - halfHandle, cursor: 'nwse-resize' },
    { id: 'sw', x: bounds.x - halfHandle, y: bounds.y + bounds.height - halfHandle, cursor: 'nesw-resize' },
    // Edges
    { id: 'n', x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y - halfHandle, cursor: 'ns-resize' },
    { id: 's', x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y + bounds.height - halfHandle, cursor: 'ns-resize' },
    { id: 'e', x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, cursor: 'ew-resize' },
    { id: 'w', x: bounds.x - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, cursor: 'ew-resize' },
  ];

  return (
    <g>
      {/* Selection outline */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5 / zoom}
        pointerEvents="none"
      />

      {/* Resize handles */}
      {handles.map((handle) => (
        <rect
          key={handle.id}
          x={handle.x}
          y={handle.y}
          width={handleSize}
          height={handleSize}
          fill={hoveredHandle === handle.id ? '#3b82f6' : '#ffffff'}
          stroke="#3b82f6"
          strokeWidth={1 / zoom}
          style={{ cursor: handle.cursor }}
          onMouseEnter={() => setHoveredHandle(handle.id)}
          onMouseLeave={() => setHoveredHandle(null)}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(handle.id, e);
          }}
        />
      ))}
    </g>
  );
}

// Calculate new bounds based on resize handle and delta
export function calculateResizedBounds(
  originalBounds: Bounds,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  maintainAspectRatio: boolean = false
): Bounds {
  let { x, y, width, height } = originalBounds;

  // Minimum size
  const minSize = 10;

  switch (handle) {
    case 'nw':
      x += deltaX;
      y += deltaY;
      width -= deltaX;
      height -= deltaY;
      break;
    case 'n':
      y += deltaY;
      height -= deltaY;
      break;
    case 'ne':
      y += deltaY;
      width += deltaX;
      height -= deltaY;
      break;
    case 'e':
      width += deltaX;
      break;
    case 'se':
      width += deltaX;
      height += deltaY;
      break;
    case 's':
      height += deltaY;
      break;
    case 'sw':
      x += deltaX;
      width -= deltaX;
      height += deltaY;
      break;
    case 'w':
      x += deltaX;
      width -= deltaX;
      break;
  }

  // Enforce minimum size
  if (width < minSize) {
    if (handle.includes('w')) {
      x -= minSize - width;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes('n')) {
      y -= minSize - height;
    }
    height = minSize;
  }

  // Maintain aspect ratio if shift is held (for corner handles)
  if (maintainAspectRatio && ['nw', 'ne', 'se', 'sw'].includes(handle)) {
    const originalRatio = originalBounds.width / originalBounds.height;
    const newRatio = width / height;

    if (newRatio > originalRatio) {
      // Width is too large, adjust it
      const newWidth = height * originalRatio;
      if (handle.includes('w')) {
        x += width - newWidth;
      }
      width = newWidth;
    } else {
      // Height is too large, adjust it
      const newHeight = width / originalRatio;
      if (handle.includes('n')) {
        y += height - newHeight;
      }
      height = newHeight;
    }
  }

  return { x, y, width, height };
}
