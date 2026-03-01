'use client';

import type { TextElement } from '@/types/map';

interface TextRendererProps {
  textElement: TextElement;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

export function TextRenderer({ textElement, isSelected, isEditing, onSelect, onDoubleClick }: TextRendererProps) {
  const getTextAnchor = () => {
    switch (textElement.align) {
      case 'left':
        return 'start';
      case 'right':
        return 'end';
      default:
        return 'middle';
    }
  };

  // Calculate text x position based on alignment
  const getTextX = () => {
    switch (textElement.align) {
      case 'left':
        return textElement.x - textElement.width / 2 + 8; // 8px padding
      case 'right':
        return textElement.x + textElement.width / 2 - 8; // 8px padding
      default:
        return textElement.x; // center
    }
  };

  // Calculate selection box bounds from element position and dimensions
  const boxX = textElement.x - textElement.width / 2;
  const boxY = textElement.y - textElement.height / 2;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      style={{ cursor: 'pointer', opacity: isEditing ? 0 : 1 }}
      transform={`rotate(${textElement.rotation} ${textElement.x} ${textElement.y})`}
    >
      {/* Text box background (visible when selected) */}
      <rect
        x={boxX}
        y={boxY}
        width={textElement.width}
        height={textElement.height}
        fill="transparent"
        pointerEvents="all"
      />
      <text
        x={getTextX()}
        y={textElement.y}
        textAnchor={getTextAnchor()}
        dominantBaseline="middle"
        fill={textElement.fill}
        fontSize={textElement.fontSize}
        fontFamily={textElement.fontFamily}
      >
        {textElement.text}
      </text>
      {isSelected && (
        <rect
          x={boxX}
          y={boxY}
          width={textElement.width}
          height={textElement.height}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
