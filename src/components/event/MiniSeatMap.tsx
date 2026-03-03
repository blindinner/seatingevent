'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import type {
  MapData, MapElement, SeatElement, RowElement, SectionElement, TableElement,
  RectangleElement, TextElement, LineElement, AreaElement,
  BoothElement, ShapeElement, CircleElement, BarElement, PillarElement, StageElement
} from '@/types/map';

interface MiniSeatMapProps {
  mapData: MapData;
  seatStatus?: Record<string, string>; // seatId -> status (e.g., "sold:orderId", "locked:...")
  height?: number;
}

export function MiniSeatMap({ mapData, seatStatus = {}, height = 200 }: MiniSeatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 600 });

  // Calculate content bounds
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const processElement = (el: MapElement, offsetX = 0, offsetY = 0) => {
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
      } else if ('width' in el && 'height' in el) {
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

    const padding = 30;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };
  }, [mapData]);

  useEffect(() => {
    setViewBox(bounds);
  }, [bounds]);

  // Get category color
  const getCategoryColor = (categoryId: string): string => {
    const category = mapData.categories.find(c => c.id === categoryId);
    return category?.color || '#3B82F6';
  };

  // Check if seat is unavailable
  const isSeatUnavailable = (seat: SeatElement): boolean => {
    const status = seatStatus[seat.id];
    const isSold = status === 'sold' || status?.startsWith('sold:');
    const isLocked = status === 'locked' || status?.startsWith('locked:');
    const isBooked = seat.status === 'booked' || seat.status === 'blocked' || seat.status === 'reserved';
    return isSold || isLocked || isBooked;
  };

  // Render a single seat
  const renderSeat = (seat: SeatElement, offsetX = 0, offsetY = 0, parentCategory?: string) => {
    const x = seat.x + offsetX;
    const y = seat.y + offsetY;
    const categoryId = seat.category || parentCategory || 'general';
    const isUnavailable = isSeatUnavailable(seat);
    const color = isUnavailable ? '#374151' : getCategoryColor(categoryId);

    return (
      <circle
        key={seat.id}
        cx={x}
        cy={y}
        r={seat.radius || 12}
        fill={color}
        opacity={isUnavailable ? 0.4 : 0.9}
      />
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
        {table.shape === 'circle' || table.shape === 'oval' ? (
          <ellipse
            cx={0}
            cy={0}
            rx={w / 2}
            ry={h / 2}
            fill={table.fill || '#4B5563'}
            opacity={0.5}
          />
        ) : (
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            fill={table.fill || '#4B5563'}
            opacity={0.5}
            rx={4}
          />
        )}
        {table.seats?.map(seat => renderSeat(seat, 0, 0, table.category))}
      </g>
    );
  };

  // Render a stage (simplified)
  const renderStage = (stage: StageElement) => {
    return (
      <rect
        key={stage.id}
        x={stage.x}
        y={stage.y}
        width={stage.width}
        height={stage.height}
        fill={stage.fill || '#374151'}
        opacity={0.5}
        rx={stage.shape === 'rounded' ? 20 : 0}
      />
    );
  };

  // Render a rectangle
  const renderRectangle = (rect: RectangleElement) => {
    return (
      <rect
        key={rect.id}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={rect.fill || 'transparent'}
        stroke={rect.stroke || 'rgba(255,255,255,0.2)'}
        strokeWidth={rect.strokeWidth || 1}
        rx={rect.cornerRadius || 0}
        opacity={0.5}
      />
    );
  };

  // Render text (simplified - just skip it for mini map)
  const renderText = (_text: TextElement) => null;

  // Render a line
  const renderLine = (line: LineElement) => {
    if (!line.points || line.points.length < 2) return null;
    const pathData = line.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <path
        key={line.id}
        d={pathData}
        stroke={line.stroke || 'rgba(255,255,255,0.3)'}
        strokeWidth={line.strokeWidth || 2}
        fill="none"
        transform={`translate(${line.x}, ${line.y})`}
        opacity={0.5}
      />
    );
  };

  // Render an area
  const renderArea = (area: AreaElement) => {
    const transform = `translate(${area.x}, ${area.y})`;

    if (area.areaType === 'ellipse' && area.width && area.height) {
      return (
        <ellipse
          key={area.id}
          cx={area.width / 2}
          cy={area.height / 2}
          rx={area.width / 2}
          ry={area.height / 2}
          fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
          stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
          strokeWidth={area.strokeWidth || 2}
          transform={transform}
          opacity={0.5}
        />
      );
    } else if (area.areaType === 'polygon' && area.points && area.points.length > 2) {
      const pathData = area.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      return (
        <path
          key={area.id}
          d={pathData}
          fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
          stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
          strokeWidth={area.strokeWidth || 2}
          transform={transform}
          opacity={0.5}
        />
      );
    } else {
      return (
        <rect
          key={area.id}
          width={area.width || 100}
          height={area.height || 100}
          fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
          stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
          strokeWidth={area.strokeWidth || 2}
          transform={transform}
          rx={4}
          opacity={0.5}
        />
      );
    }
  };

  // Render a shape
  const renderShape = (shape: ShapeElement) => {
    const transform = `translate(${shape.x}, ${shape.y})`;

    if (shape.shapeType === 'ellipse' && shape.width && shape.height) {
      return (
        <ellipse
          key={shape.id}
          cx={shape.width / 2}
          cy={shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.2)'}
          strokeWidth={shape.strokeWidth || 1}
          transform={transform}
          opacity={0.5}
        />
      );
    } else if (shape.shapeType === 'polygon' && shape.points && shape.points.length > 2) {
      const pathData = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      return (
        <path
          key={shape.id}
          d={pathData}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.2)'}
          strokeWidth={shape.strokeWidth || 1}
          transform={transform}
          opacity={0.5}
        />
      );
    } else {
      return (
        <rect
          key={shape.id}
          width={shape.width || 100}
          height={shape.height || 100}
          fill={shape.fill || 'transparent'}
          stroke={shape.stroke || 'rgba(255,255,255,0.2)'}
          strokeWidth={shape.strokeWidth || 1}
          rx={shape.cornerRadius || 0}
          transform={transform}
          opacity={0.5}
        />
      );
    }
  };

  // Render a booth
  const renderBooth = (booth: BoothElement) => {
    const scale = booth.scale || 1;
    return (
      <rect
        key={booth.id}
        x={booth.x - (booth.width * scale) / 2}
        y={booth.y - (booth.height * scale) / 2}
        width={booth.width * scale}
        height={booth.height * scale}
        fill={booth.fill || '#4B5563'}
        rx={4}
        opacity={0.5}
      />
    );
  };

  // Render a bar
  const renderBar = (bar: BarElement) => {
    return (
      <rect
        key={bar.id}
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        fill={bar.fill || '#6B7280'}
        rx={4}
        opacity={0.5}
      />
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
        opacity={0.5}
      />
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
        stroke={circle.stroke || 'rgba(255,255,255,0.2)'}
        strokeWidth={circle.strokeWidth || 1}
        opacity={0.5}
      />
    );
  };

  // Render element
  const renderElement = (element: MapElement) => {
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

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height, backgroundColor: mapData.backgroundColor || '#18181b' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill={mapData.backgroundColor || '#18181b'}
        />

        {/* Render elements in layer order */}
        {mapData.elements.filter(el => el.layer === 'below').map(renderElement)}
        {mapData.elements.filter(el => !el.layer || (el.layer !== 'below' && el.layer !== 'above')).map(renderElement)}
        {mapData.elements.filter(el => el.layer === 'above').map(renderElement)}
      </svg>
    </div>
  );
}
