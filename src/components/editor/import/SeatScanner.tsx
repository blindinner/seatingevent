'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Our standard seat radius in pixels
const SEAT_RADIUS = 12;

interface UploadedImage {
  src: string;
  width: number;
  height: number;
  fileName: string;
}

interface SeatScannerProps {
  image: UploadedImage;
  isLoading?: boolean;
  onScan: (zoom: number, samplePoint: { x: number; y: number }) => void;
  onSkip: () => void;
}

export function SeatScanner({ image, isLoading = false, onScan, onSkip }: SeatScannerProps) {
  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // The cursor circle stays fixed at SEAT_RADIUS
  // User zooms the IMAGE until seats in the image match this fixed cursor size
  const cursorRadius = SEAT_RADIUS;

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      // Middle click, right click, or shift+click to pan
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update cursor position for the circle indicator
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setCursorPos(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPanning) return;

    // Get click position relative to the image
    if (containerRef.current && imageRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - containerRect.left;
      const clickY = e.clientY - containerRect.top;

      // Convert to image coordinates
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      const scale = zoom / 100;
      const imageDisplayWidth = image.width * scale;
      const imageDisplayHeight = image.height * scale;

      // Image top-left position
      const imageLeft = containerCenterX - imageDisplayWidth / 2 + pan.x;
      const imageTop = containerCenterY - imageDisplayHeight / 2 + pan.y;

      // Position relative to image (in original image coordinates)
      const imageX = (clickX - imageLeft) / scale;
      const imageY = (clickY - imageTop) / scale;

      // Check if click is within image bounds
      if (imageX >= 0 && imageX <= image.width && imageY >= 0 && imageY <= image.height) {
        onScan(zoom, { x: imageX, y: imageY });
      }
    }
  }, [isPanning, zoom, pan, image, onScan]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-6 px-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
            1
          </div>
          <h2 className="text-xl font-bold text-white">Scanning</h2>
        </div>
        <p className="text-gray-400">
          Zoom to match the cursor circle with the seats size. Then click a seat to scan.
        </p>
      </div>

      {/* Image viewer */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-900 mx-8 rounded-lg cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: isPanning ? 'grabbing' : 'none' }}
      >
        {/* Image */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <img
            ref={imageRef}
            src={image.src}
            alt="Chart to scan"
            className="max-w-none"
            style={{
              width: image.width * (zoom / 100),
              height: image.height * (zoom / 100),
            }}
            draggable={false}
          />
        </div>

        {/* Cursor circle indicator */}
        {cursorPos && !isPanning && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Outer circle (seat size indicator) */}
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r={cursorRadius}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Center dot */}
            <circle
              cx={cursorPos.x}
              cy={cursorPos.y}
              r="2"
              fill="#22c55e"
            />
            {/* Crosshair lines */}
            <line
              x1={cursorPos.x - cursorRadius - 5}
              y1={cursorPos.y}
              x2={cursorPos.x - cursorRadius + 3}
              y2={cursorPos.y}
              stroke="#22c55e"
              strokeWidth="1"
            />
            <line
              x1={cursorPos.x + cursorRadius - 3}
              y1={cursorPos.y}
              x2={cursorPos.x + cursorRadius + 5}
              y2={cursorPos.y}
              stroke="#22c55e"
              strokeWidth="1"
            />
            <line
              x1={cursorPos.x}
              y1={cursorPos.y - cursorRadius - 5}
              x2={cursorPos.x}
              y2={cursorPos.y - cursorRadius + 3}
              stroke="#22c55e"
              strokeWidth="1"
            />
            <line
              x1={cursorPos.x}
              y1={cursorPos.y + cursorRadius - 3}
              x2={cursorPos.x}
              y2={cursorPos.y + cursorRadius + 5}
              stroke="#22c55e"
              strokeWidth="1"
            />
          </svg>
        )}

        {/* Instructions overlay */}
        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-lg text-sm text-gray-300">
          <p>Scroll to zoom • Shift+drag to pan • Click on a seat</p>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">Detecting seats...</p>
            <p className="text-gray-400 text-sm mt-1">Finding similar colored regions</p>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-6 py-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Zoom level</span>
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

        {/* Zoom slider */}
        <input
          type="range"
          min="25"
          max="300"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Skip option */}
      <div className="text-center pb-6">
        <button
          onClick={onSkip}
          className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          Skip scanning, calibrate instead
        </button>
      </div>
    </div>
  );
}
