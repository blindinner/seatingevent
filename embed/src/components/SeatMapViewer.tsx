import React, { useRef, useState, useCallback } from 'react';
import { useWidgetStore } from '../stores/widgetStore';
import {
  ViewerRowRenderer,
  ViewerSectionRenderer,
  ViewerTableRenderer,
  ViewerStageRenderer,
  ViewerShapeRenderer,
  ViewerRectangleRenderer,
  ViewerCircleRenderer,
  ViewerPolygonRenderer,
  ViewerLineRenderer,
  ViewerTextRenderer,
  ViewerAreaRenderer,
  ViewerBoothRenderer,
  ViewerBarRenderer,
  ViewerPillarRenderer,
  ViewerImageRenderer,
  ViewerSeatRenderer,
} from './renderers';
import type { MapElement, SeatElement, CategoryConfig } from '../types';

interface TooltipData {
  x: number;
  y: number;
  seat: SeatElement;
  rowLabel?: string;
  sectionLabel?: string;
  category?: CategoryConfig;
  price?: number;
}

interface SeatMapViewerProps {
  showLegend?: boolean;
  showZoomControls?: boolean;
}

export function SeatMapViewer({ showLegend = true, showZoomControls = true }: SeatMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const {
    config,
    map,
    seatStatuses,
    selectedSeatIds,
    contentBounds,
    zoom,
    panX,
    panY,
    setPan,
    zoomIn,
    zoomOut,
    resetView,
    selectSeat,
    deselectSeat,
  } = useWidgetStore();

  // Get price for a seat (respecting client overrides)
  const getSeatPrice = useCallback((category?: CategoryConfig): number | undefined => {
    if (!category) return undefined;
    const priceOverrides = config?.categoryPrices;
    if (priceOverrides && category.name in priceOverrides) {
      return priceOverrides[category.name];
    }
    return category.price;
  }, [config?.categoryPrices]);

  // Format price for display
  const formatPrice = (price: number | undefined): string => {
    if (price === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Handle seat hover
  const handleSeatHover = useCallback((
    e: React.MouseEvent,
    seat: SeatElement,
    rowLabel?: string,
    sectionLabel?: string
  ) => {
    if (!map) return;
    const category = map.categories.find(c => c.id === seat.category);
    const price = getSeatPrice(category);

    setTooltip({
      x: e.clientX,
      y: e.clientY,
      seat,
      rowLabel,
      sectionLabel,
      category,
      price,
    });
  }, [map, getSeatPrice]);

  const handleSeatLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Handle pan drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    },
    [panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan(e.clientX - dragStart.x, e.clientY - dragStart.y);
    },
    [isDragging, dragStart, setPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle seat click
  const handleSeatClick = useCallback(
    (seatId: string) => {
      if (selectedSeatIds.has(seatId)) {
        deselectSeat(seatId);
      } else {
        selectSeat(seatId);
      }
    },
    [selectedSeatIds, selectSeat, deselectSeat]
  );

  if (!map) {
    return (
      <div className="smw-loading">
        <div className="smw-spinner" />
        <span>Loading seat map...</span>
      </div>
    );
  }

  // Separate elements by layer
  const belowElements = map.elements.filter((el) => el.layer === 'below');
  const aboveElements = map.elements.filter((el) => el.layer !== 'below');

  const renderElement = (element: MapElement) => {
    if (!element.visible) return null;

    switch (element.type) {
      case 'seat':
        const seatStatus = seatStatuses[element.id] || { status: 'available' as const };
        const isSelected = selectedSeatIds.has(element.id);
        return (
          <ViewerSeatRenderer
            key={element.id}
            seat={element}
            parentX={0}
            parentY={0}
            categories={map.categories}
            status={isSelected ? 'selected' : seatStatus.status}
            isSelected={isSelected}
            onClick={() => handleSeatClick(element.id)}
            onHover={handleSeatHover}
            onLeave={handleSeatLeave}
          />
        );

      case 'row':
        return (
          <ViewerRowRenderer
            key={element.id}
            row={element}
            categories={map.categories}
            seatStatuses={seatStatuses}
            selectedSeatIds={selectedSeatIds}
            onSeatClick={handleSeatClick}
            onSeatHover={handleSeatHover}
            onSeatLeave={handleSeatLeave}
          />
        );

      case 'section':
        return (
          <ViewerSectionRenderer
            key={element.id}
            section={element}
            categories={map.categories}
            seatStatuses={seatStatuses}
            selectedSeatIds={selectedSeatIds}
            onSeatClick={handleSeatClick}
            onSeatHover={handleSeatHover}
            onSeatLeave={handleSeatLeave}
          />
        );

      case 'table':
        return (
          <ViewerTableRenderer
            key={element.id}
            table={element}
            categories={map.categories}
            seatStatuses={seatStatuses}
            selectedSeatIds={selectedSeatIds}
            onSeatClick={handleSeatClick}
            onSeatHover={handleSeatHover}
            onSeatLeave={handleSeatLeave}
          />
        );

      case 'stage':
        return <ViewerStageRenderer key={element.id} stage={element} />;

      case 'shape':
        return <ViewerShapeRenderer key={element.id} shape={element} />;

      case 'rectangle':
        return <ViewerRectangleRenderer key={element.id} rect={element} />;

      case 'circle':
        return <ViewerCircleRenderer key={element.id} circle={element} />;

      case 'polygon':
        return <ViewerPolygonRenderer key={element.id} polygon={element} />;

      case 'line':
        return <ViewerLineRenderer key={element.id} line={element} />;

      case 'text':
        return <ViewerTextRenderer key={element.id} text={element} />;

      case 'area':
        return <ViewerAreaRenderer key={element.id} area={element} />;

      case 'booth':
        return <ViewerBoothRenderer key={element.id} booth={element} />;

      case 'bar':
        return <ViewerBarRenderer key={element.id} bar={element} />;

      case 'pillar':
        return <ViewerPillarRenderer key={element.id} pillar={element} />;

      case 'image':
        return <ViewerImageRenderer key={element.id} image={element} />;

      default:
        return null;
    }
  };

  // Get background color (config override, or transparent by default)
  const backgroundColor = config?.canvasBackgroundColor ?? 'transparent';

  return (
    <div className="smw-viewer" ref={containerRef}>
      {/* Canvas */}
      <div
        className="smw-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          handleSeatLeave();
        }}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          className="smw-canvas"
          width="100%"
          height="100%"
          viewBox={contentBounds
            ? `${contentBounds.minX} ${contentBounds.minY} ${contentBounds.width} ${contentBounds.height}`
            : `0 0 ${map.width} ${map.height}`
          }
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Background */}
          <rect
            x={contentBounds?.minX ?? 0}
            y={contentBounds?.minY ?? 0}
            width={contentBounds?.width ?? map.width}
            height={contentBounds?.height ?? map.height}
            fill={backgroundColor}
          />

          {/* Below layer elements */}
          {belowElements.map(renderElement)}

          {/* Above layer elements (default) */}
          {aboveElements.map(renderElement)}
        </svg>
      </div>

      {/* Seat Tooltip */}
      {tooltip && (
        <div
          className="smw-tooltip"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <div className="smw-tooltip-header">
            {tooltip.rowLabel && (
              <div className="smw-tooltip-cell">
                <span className="smw-tooltip-label">Row</span>
                <span className="smw-tooltip-value">{tooltip.rowLabel}</span>
              </div>
            )}
            <div className="smw-tooltip-cell">
              <span className="smw-tooltip-label">Seat</span>
              <span className="smw-tooltip-value">{tooltip.seat.label}</span>
            </div>
            <div className="smw-tooltip-cell">
              <span className="smw-tooltip-label">Category</span>
              <span className="smw-tooltip-value">
                <span
                  className="smw-tooltip-category-dot"
                  style={{ backgroundColor: tooltip.category?.color || '#6B7280' }}
                />
                {tooltip.category?.name || 'Standard'}
              </span>
            </div>
          </div>
          {tooltip.price !== undefined && (
            <div className="smw-tooltip-price">
              {formatPrice(tooltip.price)}
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      {showZoomControls && (
        <div className="smw-zoom-controls">
          <button onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={resetView} title="Reset view" aria-label="Reset view">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="smw-legend">
          <div className="smw-legend-item">
            <span className="smw-legend-dot smw-legend-available" />
            <span>Available</span>
          </div>
          <div className="smw-legend-item">
            <span className="smw-legend-dot smw-legend-selected" />
            <span>Selected</span>
          </div>
          <div className="smw-legend-item">
            <span className="smw-legend-dot smw-legend-held" />
            <span>Held</span>
          </div>
          <div className="smw-legend-item">
            <span className="smw-legend-dot smw-legend-booked" />
            <span>Booked</span>
          </div>
        </div>
      )}
    </div>
  );
}
