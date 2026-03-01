'use client';

import { useState, useCallback } from 'react';
import type { BoothElement } from '@/types/map';
import { useMapStore } from '@/stores/mapStore';

interface BoothRendererProps {
  booth: BoothElement;
  isSelected: boolean;
  onSelect: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const MIN_SIZE = 20;

export function BoothRenderer({ booth, isSelected, onSelect }: BoothRendererProps) {
  const { getCategoryColor, updateElement } = useMapStore();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);

  // Get scale (default to 1)
  const scale = booth.scale ?? 1;

  // Calculate scaled dimensions
  const scaledWidth = booth.width * scale;
  const scaledHeight = booth.height * scale;

  // Center point for rotation
  const centerX = booth.x + scaledWidth / 2;
  const centerY = booth.y + scaledHeight / 2;

  // Get category color for stroke accent
  const categoryColor = booth.category ? getCategoryColor(booth.category) : booth.stroke;

  // Display label (use displayedLabel if set, otherwise use label)
  const displayLabel = booth.displayedLabel || booth.label;

  // Handle resize start
  const handleResizeStart = useCallback((handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);

    // Capture initial state at drag start
    const startState = {
      x: booth.x,
      y: booth.y,
      width: scaledWidth,
      height: scaledHeight,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startState.mouseX;
      const dy = moveEvent.clientY - startState.mouseY;

      let newX = startState.x;
      let newY = startState.y;
      let newWidth = startState.width;
      let newHeight = startState.height;

      // Apply resize based on handle
      switch (handle) {
        case 'nw':
          newX = startState.x + dx;
          newY = startState.y + dy;
          newWidth = startState.width - dx;
          newHeight = startState.height - dy;
          break;
        case 'n':
          newY = startState.y + dy;
          newHeight = startState.height - dy;
          break;
        case 'ne':
          newY = startState.y + dy;
          newWidth = startState.width + dx;
          newHeight = startState.height - dy;
          break;
        case 'e':
          newWidth = startState.width + dx;
          break;
        case 'se':
          newWidth = startState.width + dx;
          newHeight = startState.height + dy;
          break;
        case 's':
          newHeight = startState.height + dy;
          break;
        case 'sw':
          newX = startState.x + dx;
          newWidth = startState.width - dx;
          newHeight = startState.height + dy;
          break;
        case 'w':
          newX = startState.x + dx;
          newWidth = startState.width - dx;
          break;
      }

      // Enforce minimum size
      if (newWidth < MIN_SIZE) {
        if (handle.includes('w')) {
          newX = startState.x + startState.width - MIN_SIZE;
        }
        newWidth = MIN_SIZE;
      }
      if (newHeight < MIN_SIZE) {
        if (handle.includes('n')) {
          newY = startState.y + startState.height - MIN_SIZE;
        }
        newHeight = MIN_SIZE;
      }

      updateElement(booth.id, {
        x: newX,
        y: newY,
        width: newWidth / scale,
        height: newHeight / scale,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [booth, scaledWidth, scaledHeight, scale, updateElement]);

  // Get cursor for handle
  const getCursor = (handle: ResizeHandle): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      default:
        return 'pointer';
    }
  };

  // Render resize handles
  const renderResizeHandles = () => {
    if (!isSelected) return null;

    const handles: { handle: ResizeHandle; x: number; y: number }[] = [
      // Corners
      { handle: 'nw', x: booth.x, y: booth.y },
      { handle: 'ne', x: booth.x + scaledWidth, y: booth.y },
      { handle: 'se', x: booth.x + scaledWidth, y: booth.y + scaledHeight },
      { handle: 'sw', x: booth.x, y: booth.y + scaledHeight },
      // Edges
      { handle: 'n', x: booth.x + scaledWidth / 2, y: booth.y },
      { handle: 'e', x: booth.x + scaledWidth, y: booth.y + scaledHeight / 2 },
      { handle: 's', x: booth.x + scaledWidth / 2, y: booth.y + scaledHeight },
      { handle: 'w', x: booth.x, y: booth.y + scaledHeight / 2 },
    ];

    return (
      <>
        {handles.map(({ handle, x, y }) => (
          <rect
            key={handle}
            x={x - HANDLE_SIZE / 2}
            y={y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1.5}
            style={{ cursor: getCursor(handle) }}
            onMouseDown={(e) => handleResizeStart(handle, e)}
          />
        ))}
      </>
    );
  };

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ cursor: isResizing ? getCursor(resizeHandle!) : 'pointer' }}
      transform={`rotate(${booth.rotation} ${centerX} ${centerY})`}
    >
      {/* Booth background */}
      <rect
        x={booth.x}
        y={booth.y}
        width={scaledWidth}
        height={scaledHeight}
        fill={booth.fill}
        stroke={categoryColor}
        strokeWidth={2}
        rx={4}
      />

      {/* Booth number/label */}
      <text
        x={booth.x + scaledWidth / 2}
        y={booth.y + scaledHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={Math.max(12, Math.min(24, scaledWidth * 0.25))}
        fontWeight="bold"
        pointerEvents="none"
      >
        {displayLabel}
      </text>

      {/* Entrance indicator (if set) */}
      {booth.entrance && (
        <text
          x={booth.x + scaledWidth / 2}
          y={booth.y + scaledHeight - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={8}
          pointerEvents="none"
        >
          ↓ {booth.entrance}
        </text>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <rect
          x={booth.x - 4}
          y={booth.y - 4}
          width={scaledWidth + 8}
          height={scaledHeight + 8}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          rx={6}
          pointerEvents="none"
        />
      )}

      {/* Resize handles */}
      {renderResizeHandles()}
    </g>
  );
}
