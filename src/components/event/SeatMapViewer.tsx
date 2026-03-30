'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type {
  MapData, MapElement, SeatElement, RowElement, SectionElement, TableElement,
  CategoryConfig, RectangleElement, TextElement, LineElement, AreaElement,
  BoothElement, ShapeElement, CircleElement, BarElement, PillarElement, StageElement
} from '@/types/map';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

// Helper to darken/lighten a hex color for stroke
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface SeatMapViewerProps {
  mapData: MapData;
  currency: string;
  backgroundColor?: string;
  compact?: boolean; // If true, shows a contained card-like view without zoom controls
  height?: string; // Custom height class, e.g., "h-[300px]"
  seatStatus?: Record<string, string>; // seatId -> status (e.g., "sold:orderId")
  accentColor?: string; // Color for selected seats (defaults to green)
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export function SeatMapViewer({ mapData, currency, backgroundColor, compact = false, height, seatStatus = {}, accentColor }: SeatMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<{ seat: SeatElement; category: CategoryConfig | undefined } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const { toggleSeat, isSeatSelected, selectedSeats } = useSeatSelectionStore();

  // Get category config by ID
  const getCategoryConfig = useCallback((categoryId: string): CategoryConfig | undefined => {
    return mapData.categories.find(c => c.id === categoryId);
  }, [mapData.categories]);

  // Get category color
  const getCategoryColor = useCallback((categoryId: string): string => {
    const category = getCategoryConfig(categoryId);
    return category?.color || '#3B82F6';
  }, [getCategoryConfig]);

  // Calculate content bounds to fit map
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processElement = (el: MapElement, offsetX = 0, offsetY = 0) => {
      // Skip invisible elements
      if (el.visible === false) return;

      const x = el.x + offsetX;
      const y = el.y + offsetY;

      if (el.type === 'seat') {
        const radius = (el as SeatElement).radius || 12;
        minX = Math.min(minX, x - radius);
        minY = Math.min(minY, y - radius);
        maxX = Math.max(maxX, x + radius);
        maxY = Math.max(maxY, y + radius);
      } else if (el.type === 'row') {
        const row = el as RowElement;
        for (const seat of row.seats || []) {
          const seatX = x + seat.x;
          const seatY = y + seat.y;
          const radius = seat.radius || 12;
          minX = Math.min(minX, seatX - radius);
          minY = Math.min(minY, seatY - radius);
          maxX = Math.max(maxX, seatX + radius);
          maxY = Math.max(maxY, seatY + radius);
        }
      } else if (el.type === 'section') {
        const section = el as SectionElement;
        for (const row of section.rows || []) {
          for (const seat of row.seats || []) {
            const seatX = x + row.x + seat.x;
            const seatY = y + row.y + seat.y;
            const radius = seat.radius || 12;
            minX = Math.min(minX, seatX - radius);
            minY = Math.min(minY, seatY - radius);
            maxX = Math.max(maxX, seatX + radius);
            maxY = Math.max(maxY, seatY + radius);
          }
        }
      } else if (el.type === 'table') {
        const table = el as TableElement;
        const w = table.width || 80;
        const h = table.height || 80;
        minX = Math.min(minX, x - w / 2);
        minY = Math.min(minY, y - h / 2);
        maxX = Math.max(maxX, x + w / 2);
        maxY = Math.max(maxY, y + h / 2);
        // Include table seats
        for (const seat of table.seats || []) {
          const seatX = x + seat.x;
          const seatY = y + seat.y;
          const radius = seat.radius || 12;
          minX = Math.min(minX, seatX - radius);
          minY = Math.min(minY, seatY - radius);
          maxX = Math.max(maxX, seatX + radius);
          maxY = Math.max(maxY, seatY + radius);
        }
      } else if (el.type === 'booth') {
        const booth = el as BoothElement;
        const scale = booth.scale || 1;
        const w = booth.width * scale;
        const h = booth.height * scale;
        minX = Math.min(minX, x - w / 2);
        minY = Math.min(minY, y - h / 2);
        maxX = Math.max(maxX, x + w / 2);
        maxY = Math.max(maxY, y + h / 2);
      } else if (el.type === 'circle') {
        const circle = el as CircleElement;
        minX = Math.min(minX, x - circle.radius);
        minY = Math.min(minY, y - circle.radius);
        maxX = Math.max(maxX, x + circle.radius);
        maxY = Math.max(maxY, y + circle.radius);
      } else if (el.type === 'pillar') {
        const pillar = el as PillarElement;
        minX = Math.min(minX, x - pillar.radius);
        minY = Math.min(minY, y - pillar.radius);
        maxX = Math.max(maxX, x + pillar.radius);
        maxY = Math.max(maxY, y + pillar.radius);
      } else if (el.type === 'text') {
        // x,y is the center of the text box
        const text = el as TextElement;
        const w = text.width || 100;
        const h = text.height || 30;
        minX = Math.min(minX, x - w / 2);
        minY = Math.min(minY, y - h / 2);
        maxX = Math.max(maxX, x + w / 2);
        maxY = Math.max(maxY, y + h / 2);
      } else if (el.type === 'line') {
        const line = el as LineElement;
        for (const p of line.points || []) {
          minX = Math.min(minX, x + p.x);
          minY = Math.min(minY, y + p.y);
          maxX = Math.max(maxX, x + p.x);
          maxY = Math.max(maxY, y + p.y);
        }
      } else if ('width' in el && 'height' in el) {
        // Generic elements with width/height (rectangle, stage, bar, area, shape)
        const w = (el as { width: number }).width || 100;
        const h = (el as { height: number }).height || 100;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    };

    for (const el of mapData.elements) {
      processElement(el);
    }

    if (minX === Infinity) {
      return { x: 0, y: 0, width: mapData.width, height: mapData.height };
    }

    const padding = 50;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };
  }, [mapData]);

  // Fit to container on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = clientWidth / bounds.width;
    const scaleY = clientHeight / bounds.height;
    const zoom = Math.min(scaleX, scaleY, 1.5) * 0.9; // Cap max zoom and add some padding

    setViewState({
      zoom,
      panX: (clientWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
      panY: (clientHeight - bounds.height * zoom) / 2 - bounds.y * zoom,
    });
  }, [bounds]);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.ctrlKey || e.metaKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.panX, y: e.clientY - viewState.panY });
      e.preventDefault();
    }
  }, [viewState.panX, viewState.panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setViewState(prev => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y,
      }));
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle seat click
  const handleSeatClick = useCallback((seat: SeatElement, parentCategory?: string) => {
    // Check if seat is unavailable (from map data or live status)
    const liveStatus = seatStatus[seat.id];
    // Handle both full format (sold:orderId) and simplified format (sold)
    const isSold = liveStatus === 'sold' || liveStatus?.startsWith('sold:');
    const isLocked = liveStatus === 'locked' || liveStatus?.startsWith('locked:');
    if (seat.status === 'booked' || seat.status === 'blocked' || seat.status === 'reserved' || isSold || isLocked) {
      return; // Can't select unavailable seats
    }

    const categoryId = seat.category || parentCategory || 'general';
    const category = getCategoryConfig(categoryId);
    const price = seat.price ?? category?.price ?? 0;

    toggleSeat(seat.id, seat.label, categoryId, price);
  }, [toggleSeat, getCategoryConfig, seatStatus]);

  // Handle seat hover
  const handleSeatHover = useCallback((
    e: React.MouseEvent,
    seat: SeatElement,
    parentCategory?: string
  ) => {
    const categoryId = seat.category || parentCategory || 'general';
    const category = getCategoryConfig(categoryId);
    setHoveredSeat({ seat, category });
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, [getCategoryConfig]);

  const handleSeatLeave = useCallback(() => {
    setHoveredSeat(null);
  }, []);

  // Render a single seat
  const renderSeat = (seat: SeatElement, offsetX = 0, offsetY = 0, parentCategory?: string) => {
    const x = seat.x + offsetX;
    const y = seat.y + offsetY;
    const categoryId = seat.category || parentCategory || 'general';
    const isSelected = isSeatSelected(seat.id);
    // Check live seat status from database
    const liveStatus = seatStatus[seat.id];
    // Handle both full format (sold:orderId) and simplified format (sold)
    const isSold = liveStatus === 'sold' || liveStatus?.startsWith('sold:');
    const isLocked = liveStatus === 'locked' || liveStatus?.startsWith('locked:');
    const isUnavailable = seat.status === 'booked' || seat.status === 'blocked' || seat.status === 'reserved' || isSold || isLocked;

    let fillColor = getCategoryColor(categoryId);
    let strokeColor = 'rgba(255,255,255,0.2)';
    let strokeWidth = 1;
    let opacity = 1;

    if (isSelected) {
      fillColor = accentColor || '#22C55E'; // Use accent color or fallback to green
      strokeColor = accentColor ? adjustColorBrightness(accentColor, -20) : '#16A34A';
      strokeWidth = 2;
    } else if (isUnavailable) {
      fillColor = '#1f1f1f'; // Dark gray for unavailable
      strokeColor = '#444444';
      opacity = 0.6;
    }

    return (
      <g
        key={seat.id}
        onClick={() => handleSeatClick(seat, parentCategory)}
        onMouseEnter={(e) => handleSeatHover(e, seat, parentCategory)}
        onMouseLeave={handleSeatLeave}
        style={{ cursor: isUnavailable ? 'not-allowed' : 'pointer' }}
      >
        <circle
          cx={x}
          cy={y}
          r={seat.radius || 12}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
        {/* X mark for sold/unavailable seats */}
        {isUnavailable && (
          <>
            <line
              x1={x - (seat.radius || 12) * 0.4}
              y1={y - (seat.radius || 12) * 0.4}
              x2={x + (seat.radius || 12) * 0.4}
              y2={y + (seat.radius || 12) * 0.4}
              stroke="#666"
              strokeWidth={1.5}
              opacity={0.8}
              pointerEvents="none"
            />
            <line
              x1={x + (seat.radius || 12) * 0.4}
              y1={y - (seat.radius || 12) * 0.4}
              x2={x - (seat.radius || 12) * 0.4}
              y2={y + (seat.radius || 12) * 0.4}
              stroke="#666"
              strokeWidth={1.5}
              opacity={0.8}
              pointerEvents="none"
            />
          </>
        )}
        {(seat.radius || 12) >= 10 && !isUnavailable && (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={Math.max(7, (seat.radius || 12) * 0.6)}
            fontWeight="500"
            pointerEvents="none"
          >
            {seat.label.split(/[A-Za-z]+/).pop() || seat.label}
          </text>
        )}
      </g>
    );
  };

  // Render a row
  const renderRow = (row: RowElement, offsetX = 0, offsetY = 0) => {
    return (
      <g key={row.id} transform={`translate(${row.x + offsetX}, ${row.y + offsetY})`}>
        {row.seats?.map(seat => renderSeat(seat, 0, 0, row.category))}
      </g>
    );
  };

  // Render a section
  const renderSection = (section: SectionElement) => {
    return (
      <g key={section.id} transform={`translate(${section.x}, ${section.y})`}>
        {section.rows?.map(row => renderRow(row))}
      </g>
    );
  };

  // Render a table
  const renderTable = (table: TableElement) => {
    const w = table.width || 80;
    const h = table.height || 80;

    return (
      <g key={table.id} transform={`translate(${table.x}, ${table.y})`}>
        {/* Table surface */}
        {table.shape === 'circle' || table.shape === 'oval' ? (
          <ellipse
            cx={0}
            cy={0}
            rx={w / 2}
            ry={h / 2}
            fill={table.fill || '#4B5563'}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          />
        ) : (
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill={table.fill || '#4B5563'}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            rx={4}
          />
        )}
        {/* Table label */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {table.label}
        </text>
        {/* Table seats */}
        {table.seats?.map(seat => renderSeat(seat, 0, 0, table.category))}
      </g>
    );
  };

  // Render a stage
  const renderStage = (stage: StageElement) => {
    return (
      <g key={stage.id} transform={`translate(${stage.x}, ${stage.y})${stage.rotation ? ` rotate(${stage.rotation})` : ''}`}>
        <rect
          width={stage.width}
          height={stage.height}
          fill={stage.fill || '#374151'}
          rx={stage.shape === 'rounded' ? 20 : 0}
        />
        <text
          x={stage.width / 2}
          y={stage.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={14}
          fontWeight="600"
          letterSpacing="0.1em"
          pointerEvents="none"
        >
          {stage.label}
        </text>
      </g>
    );
  };

  // Render a rectangle
  const renderRectangle = (rect: RectangleElement) => {
    return (
      <g key={rect.id} transform={`translate(${rect.x}, ${rect.y})${rect.rotation ? ` rotate(${rect.rotation})` : ''}`}>
        <rect
          width={rect.width}
          height={rect.height}
          fill={rect.fill || 'transparent'}
          stroke={rect.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={rect.strokeWidth || 1}
          rx={rect.cornerRadius || 0}
        />
      </g>
    );
  };

  // Render a circle
  const renderCircle = (circle: CircleElement) => {
    return (
      <circle
        key={circle.id}
        cx={circle.x}
        cy={circle.y}
        r={circle.radius}
        fill={circle.fill || 'transparent'}
        stroke={circle.stroke || 'rgba(255,255,255,0.3)'}
        strokeWidth={circle.strokeWidth || 1}
      />
    );
  };

  // Render text - x,y is the CENTER of the text box
  const renderText = (text: TextElement) => {
    // Calculate text x position based on alignment (same as editor)
    const getTextX = () => {
      switch (text.align) {
        case 'left':
          return text.x - (text.width || 100) / 2 + 8;
        case 'right':
          return text.x + (text.width || 100) / 2 - 8;
        default:
          return text.x;
      }
    };

    return (
      <g key={text.id} transform={text.rotation ? `rotate(${text.rotation} ${text.x} ${text.y})` : undefined}>
        <text
          x={getTextX()}
          y={text.y}
          textAnchor={text.align === 'center' ? 'middle' : text.align === 'right' ? 'end' : 'start'}
          dominantBaseline="middle"
          fill={text.fill || 'white'}
          fontSize={text.fontSize || 14}
          fontFamily={text.fontFamily || 'sans-serif'}
          pointerEvents="none"
        >
          {text.text}
        </text>
      </g>
    );
  };

  // Render a line
  const renderLine = (line: LineElement) => {
    if (!line.points || line.points.length < 2) return null;
    const pathData = line.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <path
        key={line.id}
        d={pathData}
        stroke={line.stroke || 'rgba(255,255,255,0.5)'}
        strokeWidth={line.strokeWidth || 2}
        fill="none"
        transform={`translate(${line.x}, ${line.y})${line.rotation ? ` rotate(${line.rotation})` : ''}`}
      />
    );
  };

  // Render an area (GA area)
  const renderArea = (area: AreaElement) => {
    const transform = `translate(${area.x}, ${area.y})${area.rotation ? ` rotate(${area.rotation})` : ''}`;

    if (area.areaType === 'ellipse' && area.width && area.height) {
      return (
        <g key={area.id} transform={transform}>
          <ellipse
            cx={area.width / 2}
            cy={area.height / 2}
            rx={area.width / 2}
            ry={area.height / 2}
            fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
            stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
            strokeWidth={area.strokeWidth || 2}
          />
          {area.label && (
            <text
              x={area.width / 2}
              y={area.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={14}
              fontWeight="500"
              pointerEvents="none"
            >
              {area.displayedLabel || area.label}
            </text>
          )}
        </g>
      );
    } else if (area.areaType === 'polygon' && area.points && area.points.length > 2) {
      const pathData = area.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      return (
        <g key={area.id} transform={transform}>
          <path
            d={pathData}
            fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
            stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
            strokeWidth={area.strokeWidth || 2}
          />
          {area.label && (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={14}
              fontWeight="500"
              pointerEvents="none"
            >
              {area.displayedLabel || area.label}
            </text>
          )}
        </g>
      );
    } else {
      // Default rectangle
      return (
        <g key={area.id} transform={transform}>
          <rect
            width={area.width || 100}
            height={area.height || 100}
            fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
            stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
            strokeWidth={area.strokeWidth || 2}
            rx={4}
          />
          {area.label && (
            <text
              x={(area.width || 100) / 2}
              y={(area.height || 100) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={14}
              fontWeight="500"
              pointerEvents="none"
            >
              {area.displayedLabel || area.label}
            </text>
          )}
        </g>
      );
    }
  };

  // Render a shape
  const renderShape = (shape: ShapeElement) => {
    const transform = `translate(${shape.x}, ${shape.y})${shape.rotation ? ` rotate(${shape.rotation})` : ''}`;

    if (shape.shapeType === 'ellipse' && shape.width && shape.height) {
      return (
        <ellipse
          key={shape.id}
          cx={shape.width / 2}
          cy={shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={shape.strokeWidth || 1}
          transform={transform}
        />
      );
    } else if (shape.shapeType === 'polygon' && shape.points && shape.points.length > 2) {
      const pathData = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      return (
        <path
          key={shape.id}
          d={pathData}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={shape.strokeWidth || 1}
          transform={transform}
        />
      );
    } else {
      // Default rectangle
      return (
        <rect
          key={shape.id}
          width={shape.width || 100}
          height={shape.height || 100}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={shape.strokeWidth || 1}
          rx={shape.cornerRadius || 0}
          transform={transform}
        />
      );
    }
  };

  // Render a booth
  const renderBooth = (booth: BoothElement) => {
    const scale = booth.scale || 1;
    return (
      <g key={booth.id} transform={`translate(${booth.x}, ${booth.y})${booth.rotation ? ` rotate(${booth.rotation})` : ''} scale(${scale})`}>
        <rect
          x={-booth.width / 2}
          y={-booth.height / 2}
          width={booth.width}
          height={booth.height}
          fill={booth.fill || '#4B5563'}
          stroke={booth.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {booth.displayedLabel || booth.label || booth.boothNumber}
        </text>
      </g>
    );
  };

  // Render a bar
  const renderBar = (bar: BarElement) => {
    return (
      <g key={bar.id} transform={`translate(${bar.x}, ${bar.y})${bar.rotation ? ` rotate(${bar.rotation})` : ''}`}>
        <rect
          width={bar.width}
          height={bar.height}
          fill={bar.fill || '#6B7280'}
          rx={4}
        />
        <text
          x={bar.width / 2}
          y={bar.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="500"
          pointerEvents="none"
        >
          {bar.label}
        </text>
      </g>
    );
  };

  // Render a pillar
  const renderPillar = (pillar: PillarElement) => {
    return (
      <circle
        key={pillar.id}
        cx={pillar.x}
        cy={pillar.y}
        r={pillar.radius}
        fill={pillar.fill || '#374151'}
      />
    );
  };

  // Render elements
  const renderElement = (element: MapElement) => {
    // Skip invisible elements
    if (element.visible === false) return null;

    switch (element.type) {
      case 'seat':
        return renderSeat(element as SeatElement);
      case 'row':
        return renderRow(element as RowElement);
      case 'section':
        return renderSection(element as SectionElement);
      case 'table':
        return renderTable(element as TableElement);
      case 'stage':
        return renderStage(element as StageElement);
      case 'rectangle':
        return renderRectangle(element as RectangleElement);
      case 'circle':
        return renderCircle(element as CircleElement);
      case 'text':
        return renderText(element as TextElement);
      case 'line':
        return renderLine(element as LineElement);
      case 'area':
        return renderArea(element as AreaElement);
      case 'shape':
        return renderShape(element as ShapeElement);
      case 'booth':
        return renderBooth(element as BoothElement);
      case 'bar':
        return renderBar(element as BarElement);
      case 'pillar':
        return renderPillar(element as PillarElement);
      default:
        return null;
    }
  };

  const containerHeight = height || (compact ? 'h-[280px]' : 'h-[400px] md:h-[500px]');
  const containerBg = backgroundColor || mapData.backgroundColor || '#18181b';

  return (
    <div className="relative">
      {/* Map Container */}
      <div
        ref={containerRef}
        className={`relative w-full ${containerHeight} overflow-hidden`}
        style={{ backgroundColor: containerBg }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${viewState.panX}, ${viewState.panY}) scale(${viewState.zoom})`}>
            {/* Background - uses theme color if provided */}
            <rect
              x={bounds.x - 100}
              y={bounds.y - 100}
              width={bounds.width + 200}
              height={bounds.height + 200}
              fill={containerBg}
            />

            {/* Render elements in layer order: below -> normal -> above */}
            {mapData.elements.filter(el => el.layer === 'below').map(renderElement)}
            {mapData.elements.filter(el => !el.layer || (el.layer !== 'below' && el.layer !== 'above')).map(renderElement)}
            {mapData.elements.filter(el => el.layer === 'above').map(renderElement)}
          </g>
        </svg>

        {/* Zoom Controls - hidden in compact mode */}
        {!compact && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <span className="text-[12px] text-white/60 min-w-[40px] text-center">
              {Math.round(viewState.zoom * 100)}%
            </span>
            <button
              onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }))}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Category Legend - different styling based on compact mode */}
      <div className={compact ? 'px-4 py-3 flex flex-wrap items-center gap-3' : 'mt-4 flex flex-wrap items-center gap-4'}>
        {mapData.categories.map(category => (
          <div key={category.id} className="flex items-center gap-1.5">
            <div
              className={compact ? 'w-2 h-2 rounded-full' : 'w-3 h-3 rounded-full'}
              style={{ backgroundColor: category.color }}
            />
            <span className={compact ? 'text-[11px] text-white/50' : 'text-[12px] text-white/60'}>
              {category.name}
              {category.price !== undefined && category.price > 0 && (
                <span className={compact ? 'text-white/30 ml-1' : 'text-white/40 ml-1'}>
                  ({formatCurrency(category.price, currency)})
                </span>
              )}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className={compact ? 'w-2 h-2 rounded-full bg-green-500' : 'w-3 h-3 rounded-full bg-green-500'} />
          <span className={compact ? 'text-[11px] text-white/50' : 'text-[12px] text-white/60'}>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-[#1f1f1f] border border-[#444444] relative`}>
            <div className="absolute inset-0 flex items-center justify-center text-[#666] text-[6px] font-bold">×</div>
          </div>
          <span className={compact ? 'text-[11px] text-white/50' : 'text-[12px] text-white/60'}>Sold</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredSeat && (
        <div
          className="fixed z-50 bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 40,
          }}
        >
          <div className="text-[13px] text-white font-medium">{hoveredSeat.seat.label}</div>
          {hoveredSeat.category && (
            <div className="text-[12px] text-white/60">
              {hoveredSeat.category.name}
              {hoveredSeat.category.price !== undefined && (
                <span className="ml-2">{formatCurrency(hoveredSeat.category.price, currency)}</span>
              )}
            </div>
          )}
          {(hoveredSeat.seat.status === 'booked' || hoveredSeat.seat.status === 'reserved') && (
            <div className="text-[11px] text-red-400 mt-1">Unavailable</div>
          )}
        </div>
      )}
    </div>
  );
}
