'use client';

import { useState, useEffect, useRef } from 'react';
import type { TextElement } from '@/types/map';

interface TextEditorProps {
  textElement: TextElement;
  zoom: number;
  panX: number;
  panY: number;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

export function TextEditor({ textElement, zoom, panX, panY, onSave, onCancel }: TextEditorProps) {
  const [text, setText] = useState(textElement.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select text when mounted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Calculate position in screen coordinates
  const screenX = textElement.x * zoom + panX;
  const screenY = textElement.y * zoom + panY;
  const fontSize = textElement.fontSize * zoom;
  const width = (textElement.width || 100) * zoom;

  // Calculate text alignment offset
  const getAlignOffset = () => {
    switch (textElement.align) {
      case 'left':
        return 0;
      case 'right':
        return -100; // percentage
      default:
        return -50; // center
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(text);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Cancel on blur (clicking outside) - only Enter saves
    onCancel();
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: screenX,
        top: screenY,
        transform: `translate(${getAlignOffset()}%, -50%) rotate(${textElement.rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="border-2 border-blue-500 rounded px-1 outline-none"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: textElement.fontFamily,
          color: textElement.fill,
          backgroundColor: '#ffffff', // Match canvas background
          width: `${width}px`,
          minWidth: '50px',
          textAlign: textElement.align,
        }}
      />
    </div>
  );
}
