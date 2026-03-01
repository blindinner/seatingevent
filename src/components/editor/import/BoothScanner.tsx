'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UploadedImage {
  src: string;
  width: number;
  height: number;
  fileName: string;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface BoothScannerProps {
  image: UploadedImage;
  isLoading?: boolean;
  onScan: (selection: { x: number; y: number; width: number; height: number }) => void;
  onSkip: () => void;
}

export function BoothScanner({ image, isLoading = false, onScan, onSkip }: BoothScannerProps) {
  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scale = zoom / 100;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(300, z + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(25, z - 10));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom((z) => Math.min(300, Math.max(25, z + delta)));
  }, []);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const containerRect = containerRef.current.getBoundingClientRect();
    const clickX = screenX - containerRect.left;
    const clickY = screenY - containerRect.top;

    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;

    const imageDisplayWidth = image.width * scale;
    const imageDisplayHeight = image.height * scale;

    const imageLeft = containerCenterX - imageDisplayWidth / 2 + pan.x;
    const imageTop = containerCenterY - imageDisplayHeight / 2 + pan.y;

    const imageX = (clickX - imageLeft) / scale;
    const imageY = (clickY - imageTop) / scale;

    return { x: imageX, y: imageY };
  }, [image, scale, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      // Middle click, right click, or shift+click to pan
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    } else if (e.button === 0) {
      // Left click to start drawing
      const imageCoords = screenToImage(e.clientX, e.clientY);

      // Check if within image bounds
      if (imageCoords.x >= 0 && imageCoords.x <= image.width &&
          imageCoords.y >= 0 && imageCoords.y <= image.height) {
        setIsDrawing(true);
        setSelection({
          startX: imageCoords.x,
          startY: imageCoords.y,
          endX: imageCoords.x,
          endY: imageCoords.y,
        });
      }
    }
  }, [screenToImage, image]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (isDrawing && selection) {
      const imageCoords = screenToImage(e.clientX, e.clientY);
      setSelection((prev) => prev ? {
        ...prev,
        endX: Math.max(0, Math.min(image.width, imageCoords.x)),
        endY: Math.max(0, Math.min(image.height, imageCoords.y)),
      } : null);
    }
  }, [isPanning, lastPanPoint, isDrawing, selection, screenToImage, image]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setIsDrawing(false);
  }, []);

  const handleDetect = useCallback(() => {
    if (!selection) return;

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);

    if (width < 10 || height < 10) {
      alert('Please draw a larger selection box around a booth');
      return;
    }

    onScan({ x, y, width, height });
  }, [selection, onScan]);

  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'Escape') {
        setSelection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut]);

  // Calculate selection box for display
  const getSelectionRect = () => {
    if (!selection) return null;
    return {
      x: Math.min(selection.startX, selection.endX),
      y: Math.min(selection.startY, selection.endY),
      width: Math.abs(selection.endX - selection.startX),
      height: Math.abs(selection.endY - selection.startY),
    };
  };

  const selectionRect = getSelectionRect();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-6 px-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
            1
          </div>
          <h2 className="text-xl font-bold text-white">Draw Selection</h2>
        </div>
        <p className="text-gray-400">
          Draw a box around one booth to detect similar ones. Shift+drag to pan.
        </p>
      </div>

      {/* Image viewer */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-900 mx-8 rounded-lg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: isPanning ? 'grabbing' : isDrawing ? 'crosshair' : 'crosshair' }}
      >
        {/* Image */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <div className="relative">
            <img
              src={image.src}
              alt="Chart to scan"
              className="max-w-none"
              style={{
                width: image.width * scale,
                height: image.height * scale,
              }}
              draggable={false}
            />

            {/* Selection overlay */}
            {selectionRect && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: image.width * scale,
                  height: image.height * scale,
                }}
                viewBox={`0 0 ${image.width} ${image.height}`}
              >
                {/* Dimmed area outside selection */}
                <defs>
                  <mask id="selection-mask">
                    <rect x="0" y="0" width={image.width} height={image.height} fill="white" />
                    <rect
                      x={selectionRect.x}
                      y={selectionRect.y}
                      width={selectionRect.width}
                      height={selectionRect.height}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={image.width}
                  height={image.height}
                  fill="rgba(0,0,0,0.5)"
                  mask="url(#selection-mask)"
                />

                {/* Selection border */}
                <rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />

                {/* Corner handles */}
                {[
                  { x: selectionRect.x, y: selectionRect.y },
                  { x: selectionRect.x + selectionRect.width, y: selectionRect.y },
                  { x: selectionRect.x, y: selectionRect.y + selectionRect.height },
                  { x: selectionRect.x + selectionRect.width, y: selectionRect.y + selectionRect.height },
                ].map((corner, i) => (
                  <circle
                    key={i}
                    cx={corner.x}
                    cy={corner.y}
                    r="4"
                    fill="#8b5cf6"
                    stroke="white"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            )}
          </div>
        </div>

        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg text-sm text-gray-300">
          <p>Click and drag to select • Scroll to zoom • Shift+drag to pan</p>
        </div>

        {/* Selection size indicator */}
        {selectionRect && selectionRect.width > 0 && selectionRect.height > 0 && (
          <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg text-sm text-white">
            {Math.round(selectionRect.width)} x {Math.round(selectionRect.height)} px
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">Detecting booths...</p>
            <p className="text-gray-400 text-sm mt-1">Finding similar colored regions</p>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-6 py-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Zoom</span>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            −
          </button>
          <span className="text-white min-w-[60px] text-center font-mono">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            +
          </button>
        </div>

        <input
          type="range"
          min="25"
          max="300"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />

        {/* Action buttons */}
        <div className="flex gap-3">
          {selection && (
            <>
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleDetect}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
              >
                Detect Similar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Skip option */}
      <div className="text-center pb-6">
        <button
          onClick={onSkip}
          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          Skip detection, place manually instead
        </button>
      </div>
    </div>
  );
}
