'use client';

import { useState, useCallback } from 'react';

interface DetectedElement {
  type: 'seat' | 'booth';
  x: number;
  y: number;
  width?: number;
  height?: number;
  confidence: number;
}

interface UploadedImage {
  src: string;
  width: number;
  height: number;
  fileName: string;
}

interface DetectionResultsProps {
  image: UploadedImage;
  detectedElements: DetectedElement[];
  zoom: number;
  onElementsChange: (elements: DetectedElement[]) => void;
  onDetectAnother: () => void;
  onDetectAnotherColor?: () => void;
  onContinue: () => void;
}

export function DetectionResults({
  image,
  detectedElements,
  zoom,
  onElementsChange,
  onDetectAnother,
  onDetectAnotherColor,
  onContinue,
}: DetectionResultsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate scale for displaying the image
  const scale = zoom / 100;

  // Group elements by type
  const seats = detectedElements.filter((el) => el.type === 'seat');
  const booths = detectedElements.filter((el) => el.type === 'booth');

  // Estimate row count (simple heuristic: group by similar Y values)
  const estimateRows = (elements: DetectedElement[]): number => {
    if (elements.length === 0) return 0;
    const yValues = elements.map((el) => el.y).sort((a, b) => a - b);
    let rows = 1;
    let lastY = yValues[0];
    const threshold = 30; // pixels

    for (const y of yValues) {
      if (y - lastY > threshold) {
        rows++;
        lastY = y;
      }
    }
    return rows;
  };

  const seatRows = estimateRows(seats);

  const handleRemoveElement = useCallback((index: number) => {
    const newElements = detectedElements.filter((_, i) => i !== index);
    onElementsChange(newElements);
    setSelectedIndex(null);
  }, [detectedElements, onElementsChange]);

  const handleElementClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(selectedIndex === index ? null : index);
  }, [selectedIndex]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Get color based on element type and confidence
  const getElementColor = (element: DetectedElement, isSelected: boolean) => {
    if (isSelected) return '#f59e0b'; // amber for selected

    if (element.type === 'seat') {
      // Green gradient based on confidence
      const alpha = 0.5 + element.confidence * 0.5;
      return `rgba(34, 197, 94, ${alpha})`;
    } else {
      // Purple for booths
      const alpha = 0.5 + element.confidence * 0.5;
      return `rgba(139, 92, 246, ${alpha})`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-6 px-8">
        <h2 className="text-xl font-bold text-white mb-2">Detection Results</h2>
        <p className="text-gray-400">
          Click on any element to select it, then remove if it&apos;s a false positive.
        </p>
      </div>

      {/* Image with overlays */}
      <div className="flex-1 relative overflow-auto mx-8 rounded-lg bg-gray-900">
        <div
          className="relative inline-block"
          onClick={handleBackgroundClick}
        >
          {/* Base image */}
          <img
            src={image.src}
            alt="Scanned chart"
            style={{
              width: image.width * scale,
              height: image.height * scale,
            }}
            draggable={false}
          />

          {/* Detected elements overlay */}
          <svg
            className="absolute inset-0"
            style={{
              width: image.width * scale,
              height: image.height * scale,
            }}
            viewBox={`0 0 ${image.width} ${image.height}`}
          >
            {detectedElements.map((element, index) => {
              const isSelected = selectedIndex === index;
              const color = getElementColor(element, isSelected);

              if (element.type === 'seat') {
                return (
                  <g key={index} onClick={(e) => handleElementClick(index, e)} style={{ cursor: 'pointer' }}>
                    {/* Seat circle */}
                    <circle
                      cx={element.x}
                      cy={element.y}
                      r={12}
                      fill={color}
                      stroke={isSelected ? '#f59e0b' : '#22c55e'}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    {/* Connection line to next seat in row (visual only) */}
                  </g>
                );
              } else {
                // Booth rectangle
                return (
                  <g key={index} onClick={(e) => handleElementClick(index, e)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={element.x - (element.width || 40) / 2}
                      y={element.y - (element.height || 30) / 2}
                      width={element.width || 40}
                      height={element.height || 30}
                      fill={color}
                      stroke={isSelected ? '#f59e0b' : '#8b5cf6'}
                      strokeWidth={isSelected ? 3 : 2}
                      rx={4}
                    />
                  </g>
                );
              }
            })}
          </svg>
        </div>
      </div>

      {/* Results summary */}
      <div className="px-8 py-4">
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-3 text-center mb-4">
          <span className="text-green-400 font-medium">
            {seats.length > 0 && `Detected ${seats.length} seats`}
            {seats.length > 0 && seatRows > 0 && ` in ${seatRows} row${seatRows > 1 ? 's' : ''}`}
            {seats.length > 0 && booths.length > 0 && ', '}
            {booths.length > 0 && `${booths.length} booths`}
            {seats.length === 0 && booths.length === 0 && 'No elements detected'}
          </span>
        </div>

        {/* Selected element actions */}
        {selectedIndex !== null && (
          <div className="bg-gray-800 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-gray-300 text-sm">
              Selected: {detectedElements[selectedIndex].type} at ({Math.round(detectedElements[selectedIndex].x)}, {Math.round(detectedElements[selectedIndex].y)})
            </span>
            <button
              onClick={() => handleRemoveElement(selectedIndex)}
              className="px-3 py-1 bg-red-900/50 hover:bg-red-900/70 text-red-400 rounded text-sm transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          {onDetectAnotherColor && (seats.length > 0 || booths.length > 0) && (
            <button
              onClick={onDetectAnotherColor}
              className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white transition-colors"
            >
              + Detect Another Color
            </button>
          )}
          <button
            onClick={onDetectAnother}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Detect Another Type
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
