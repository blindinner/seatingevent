'use client';

import { useState, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { MapElement, RowElement, SectionElement, SeatElement } from '@/types/map';

interface PreviewModalProps {
  onClose: () => void;
}

interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface SeatInfo {
  id: string;
  label: string;
  category: string;
  price?: number;
  row?: string;
  section?: string;
}

interface TooltipData {
  x: number;
  y: number;
  seat: SeatInfo;
  categoryColor?: string;
}

// Calculate bounding box of all elements (same as embed widget)
function calculateContentBounds(elements: MapElement[]): ContentBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const processElement = (el: any, offsetX = 0, offsetY = 0) => {
    const x = el.x + offsetX;
    const y = el.y + offsetY;

    switch (el.type) {
      case 'seat':
        const r = el.radius || 10;
        minX = Math.min(minX, x - r);
        minY = Math.min(minY, y - r);
        maxX = Math.max(maxX, x + r);
        maxY = Math.max(maxY, y + r);
        break;
      case 'row':
        if (el.seats) {
          for (const seat of el.seats) {
            processElement(seat, x, y);
          }
        }
        break;
      case 'section':
        if (el.rows) {
          for (const row of el.rows) {
            processElement(row, x, y);
          }
        }
        break;
      case 'stage':
      case 'rectangle':
      case 'area':
      case 'booth':
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + (el.width || 100));
        maxY = Math.max(maxY, y + (el.height || 60));
        break;
      case 'table':
        // Table is centered at x,y
        const tableRadius = Math.max(el.width || 50, el.height || 50) / 2 + 20;
        if (el.seats) {
          for (const seat of el.seats) {
            const seatR = seat.radius || 10;
            minX = Math.min(minX, x + seat.x - seatR);
            minY = Math.min(minY, y + seat.y - seatR);
            maxX = Math.max(maxX, x + seat.x + seatR);
            maxY = Math.max(maxY, y + seat.y + seatR);
          }
        }
        minX = Math.min(minX, x - tableRadius);
        minY = Math.min(minY, y - tableRadius);
        maxX = Math.max(maxX, x + tableRadius);
        maxY = Math.max(maxY, y + tableRadius);
        break;
      case 'circle':
        const circleR = el.radius || 20;
        minX = Math.min(minX, x - circleR);
        minY = Math.min(minY, y - circleR);
        maxX = Math.max(maxX, x + circleR);
        maxY = Math.max(maxY, y + circleR);
        break;
      case 'shape':
        if (el.shapeType === 'ellipse') {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + (el.width || 100));
          maxY = Math.max(maxY, y + (el.height || 100));
        } else if (el.shapeType === 'polygon' && el.points) {
          for (const p of el.points) {
            minX = Math.min(minX, x + p.x);
            minY = Math.min(minY, y + p.y);
            maxX = Math.max(maxX, x + p.x);
            maxY = Math.max(maxY, y + p.y);
          }
        } else {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + (el.width || 100));
          maxY = Math.max(maxY, y + (el.height || 100));
        }
        break;
      case 'line':
        if (el.points) {
          for (const p of el.points) {
            minX = Math.min(minX, x + p.x);
            minY = Math.min(minY, y + p.y);
            maxX = Math.max(maxX, x + p.x);
            maxY = Math.max(maxY, y + p.y);
          }
        }
        break;
      case 'text':
        const textWidth = (el.text?.length || 5) * (el.fontSize || 16) * 0.6;
        const textHeight = el.fontSize || 16;
        // Text is center-aligned
        minX = Math.min(minX, x - textWidth / 2);
        minY = Math.min(minY, y - textHeight / 2);
        maxX = Math.max(maxX, x + textWidth / 2);
        maxY = Math.max(maxY, y + textHeight / 2);
        break;
      default:
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + (el.width || 50));
        maxY = Math.max(maxY, y + (el.height || 50));
    }
  };

  for (const el of elements) {
    if (el.visible !== false) {
      processElement(el);
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
  }

  // Add 10% padding (same as embed)
  const padding = Math.max((maxX - minX), (maxY - minY)) * 0.1;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Uniform color for available seats (matches embed)
const AVAILABLE_COLOR = '#6366F1';

export function PreviewModal({ onClose }: PreviewModalProps) {
  const { map } = useMapStore();
  const [selectedSeats, setSelectedSeats] = useState<Map<string, SeatInfo>>(new Map());
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!map) return null;

  const contentBounds = calculateContentBounds(map.elements || []);

  const getCategoryInfo = (categoryId: string) => {
    return map.categories?.find(c => c.id === categoryId);
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const handleSeatClick = (seatInfo: SeatInfo) => {
    setSelectedSeats(prev => {
      const next = new Map(prev);
      if (next.has(seatInfo.id)) {
        next.delete(seatInfo.id);
      } else {
        next.set(seatInfo.id, seatInfo);
      }
      return next;
    });
  };

  const handleSeatHover = (e: React.MouseEvent, seatInfo: SeatInfo, categoryColor?: string) => {
    setTooltip({ x: e.clientX, y: e.clientY, seat: seatInfo, categoryColor });
  };

  const handleSeatLeave = () => setTooltip(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () => setZoom(z => Math.min(3, z * 1.2));
  const zoomOut = () => setZoom(z => Math.max(0.3, z / 1.2));
  const resetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  const totalPrice = Array.from(selectedSeats.values()).reduce(
    (sum, seat) => sum + (seat.price || 0), 0
  );

  const renderSeat = (
    seat: SeatElement,
    baseX: number,
    baseY: number,
    rowLabel?: string,
    sectionLabel?: string
  ) => {
    const x = baseX + seat.x;
    const y = baseY + seat.y;
    const radius = seat.radius || 10;
    const category = getCategoryInfo(seat.category);
    const isSelected = selectedSeats.has(seat.id);

    const seatInfo: SeatInfo = {
      id: seat.id,
      label: seat.label,
      category: seat.category,
      price: category?.price,
      row: rowLabel,
      section: sectionLabel,
    };

    // Determine fill color: selected=green, hovered=category color, default=uniform
    const isHovered = hoveredSeatId === seat.id;
    const fillColor = isSelected
      ? '#22c55e'
      : isHovered
        ? (category?.color || AVAILABLE_COLOR)
        : AVAILABLE_COLOR;

    return (
      <g key={seat.id}>
        <circle
          cx={x}
          cy={y}
          r={radius}
          fill={fillColor}
          stroke={isSelected ? '#16a34a' : 'rgba(255,255,255,0.3)'}
          strokeWidth={isSelected ? 2 : 1}
          style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
          onClick={(e) => { e.stopPropagation(); handleSeatClick(seatInfo); }}
          onMouseEnter={(e) => {
            setHoveredSeatId(seat.id);
            handleSeatHover(e, seatInfo, category?.color);
          }}
          onMouseLeave={() => {
            setHoveredSeatId(null);
            handleSeatLeave();
          }}
        />
        {radius >= 10 && (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={Math.max(6, radius * 0.6)}
            fontWeight="500"
            pointerEvents="none"
          >
            {seat.label.replace(rowLabel || '', '')}
          </text>
        )}
      </g>
    );
  };

  const renderRow = (row: RowElement) => {
    const labelColor = map.labelColor || '#374151';
    return (
      <g key={row.id}>
        <text
          x={row.x - 20}
          y={row.y + (row.seats?.[0]?.y || 0)}
          textAnchor="end"
          dominantBaseline="middle"
          fill={labelColor}
          opacity={0.7}
          fontSize={12}
          fontWeight="500"
        >
          {row.label}
        </text>
        {row.seats?.map(seat => renderSeat(seat, row.x, row.y, row.label))}
      </g>
    );
  };

  const renderSection = (section: SectionElement) => {
    const labelColor = map.labelColor || '#374151';
    return (
      <g key={section.id}>
        <text
          x={section.x + 100}
          y={section.y - 20}
          textAnchor="middle"
          fill={labelColor}
          opacity={0.85}
          fontSize={14}
          fontWeight="600"
        >
          {section.label}
        </text>
        {section.rows.map(row => (
          <g key={row.id}>
            <text
              x={section.x + row.x - 20}
              y={section.y + row.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill={labelColor}
              opacity={0.7}
              fontSize={12}
              fontWeight="500"
            >
              {row.label}
            </text>
            {row.seats?.map(seat =>
              renderSeat(seat, section.x + row.x, section.y + row.y, row.label, section.label)
            )}
          </g>
        ))}
      </g>
    );
  };

  const renderElement = (element: MapElement) => {
    if (element.visible === false) return null;
    const el = element as any;

    switch (element.type) {
      case 'row':
        return renderRow(element as RowElement);
      case 'section':
        return renderSection(element as SectionElement);
      case 'stage':
        return (
          <g key={element.id}>
            <rect
              x={element.x}
              y={element.y}
              width={el.width || 200}
              height={el.height || 60}
              rx={8}
              fill={el.fill || '#1f2937'}
              stroke="#374151"
              strokeWidth={2}
            />
            <text
              x={element.x + (el.width || 200) / 2}
              y={element.y + (el.height || 60) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#9ca3af"
              fontSize={16}
              fontWeight="600"
            >
              {el.label || 'STAGE'}
            </text>
          </g>
        );
      case 'rectangle':
        return (
          <rect
            key={element.id}
            x={element.x}
            y={element.y}
            width={el.width || 100}
            height={el.height || 100}
            rx={el.cornerRadius || 0}
            fill={el.fill || '#374151'}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth || 0}
            opacity={el.opacity || 1}
          />
        );
      case 'text':
        return (
          <text
            key={element.id}
            x={element.x}
            y={element.y}
            textAnchor={el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle'}
            dominantBaseline="middle"
            fill={el.fill || '#ffffff'}
            fontSize={el.fontSize || 16}
            fontFamily={el.fontFamily || 'sans-serif'}
            fontWeight={el.fontWeight || '400'}
          >
            {el.text || ''}
          </text>
        );
      case 'table':
        // Render table shape
        const tableShape = el.shape || 'circle';
        return (
          <g key={element.id}>
            {tableShape === 'circle' && (
              <circle
                cx={element.x}
                cy={element.y}
                r={el.width / 2}
                fill={el.fill || '#374151'}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}
            {tableShape === 'oval' && (
              <ellipse
                cx={element.x}
                cy={element.y}
                rx={el.width / 2}
                ry={el.height / 2}
                fill={el.fill || '#374151'}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}
            {tableShape === 'rectangle' && (
              <rect
                x={element.x - el.width / 2}
                y={element.y - el.height / 2}
                width={el.width}
                height={el.height}
                rx={4}
                fill={el.fill || '#374151'}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}
            {/* Table label */}
            <text
              x={element.x}
              y={element.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={12}
              fontWeight="500"
              pointerEvents="none"
            >
              {el.displayedLabel || el.label}
            </text>
            {/* Table seats */}
            {el.seats?.map((seat: any, i: number) => {
              const seatX = element.x + seat.x;
              const seatY = element.y + seat.y;
              const seatRadius = seat.radius || 10;
              const isSelected = selectedSeats.has(seat.id);
              const seatInfo: SeatInfo = {
                id: seat.id,
                label: seat.label,
                category: seat.category,
                price: getCategoryInfo(seat.category)?.price,
              };
              return (
                <g key={seat.id || i}>
                  <circle
                    cx={seatX}
                    cy={seatY}
                    r={seatRadius}
                    fill={isSelected ? '#22c55e' : AVAILABLE_COLOR}
                    stroke={isSelected ? '#16a34a' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); handleSeatClick(seatInfo); }}
                  />
                  {seatRadius >= 10 && (
                    <text
                      x={seatX}
                      y={seatY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={Math.max(6, seatRadius * 0.6)}
                      fontWeight="500"
                      pointerEvents="none"
                    >
                      {seat.label.includes('-') ? seat.label.split('-').pop() : seat.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      case 'booth':
        return (
          <g key={element.id}>
            <rect
              x={element.x}
              y={element.y}
              width={el.width || 60}
              height={el.height || 40}
              rx={4}
              fill={el.fill || '#4f46e5'}
              stroke={el.stroke || '#3730a3'}
              strokeWidth={el.strokeWidth || 1}
            />
            <text
              x={element.x + (el.width || 60) / 2}
              y={element.y + (el.height || 40) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={12}
              fontWeight="500"
            >
              {el.boothNumber || el.label || ''}
            </text>
          </g>
        );
      case 'shape':
        if (el.shapeType === 'rectangle') {
          return (
            <rect
              key={element.id}
              x={element.x}
              y={element.y}
              width={el.width || 100}
              height={el.height || 100}
              rx={el.cornerRadius || 0}
              fill={el.fill || '#374151'}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth || 0}
            />
          );
        } else if (el.shapeType === 'ellipse') {
          return (
            <ellipse
              key={element.id}
              cx={element.x + (el.width || 100) / 2}
              cy={element.y + (el.height || 100) / 2}
              rx={(el.width || 100) / 2}
              ry={(el.height || 100) / 2}
              fill={el.fill || '#374151'}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth || 0}
            />
          );
        } else if (el.shapeType === 'polygon' && el.points) {
          const pointsString = el.points
            .map((p: { x: number; y: number }) => `${element.x + p.x},${element.y + p.y}`)
            .join(' ');
          return (
            <polygon
              key={element.id}
              points={pointsString}
              fill={el.fill || '#374151'}
              stroke={el.stroke}
              strokeWidth={el.strokeWidth || 0}
            />
          );
        }
        return null;
      case 'area':
        return (
          <rect
            key={element.id}
            x={element.x}
            y={element.y}
            width={el.width || 100}
            height={el.height || 100}
            fill={el.fill || 'rgba(99, 102, 241, 0.2)'}
            stroke={el.stroke || '#6366f1'}
            strokeWidth={el.strokeWidth || 2}
            strokeDasharray={el.strokeDasharray}
          />
        );
      case 'line':
        if (el.points && el.points.length >= 2) {
          const pathD = el.points
            .map((p: { x: number; y: number }, i: number) =>
              `${i === 0 ? 'M' : 'L'} ${element.x + p.x} ${element.y + p.y}`
            )
            .join(' ');
          return (
            <path
              key={element.id}
              d={pathD}
              fill="none"
              stroke={el.stroke || '#6366f1'}
              strokeWidth={el.strokeWidth || 2}
            />
          );
        }
        return null;
      case 'circle':
        return (
          <circle
            key={element.id}
            cx={element.x}
            cy={element.y}
            r={el.radius || 20}
            fill={el.fill || '#374151'}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth || 0}
          />
        );
      case 'seat':
        // Standalone seat
        const seatInfo: SeatInfo = {
          id: element.id,
          label: el.label || '',
          category: el.category || 'general',
          price: getCategoryInfo(el.category)?.price,
        };
        const isSelected = selectedSeats.has(element.id);
        return (
          <g key={element.id}>
            <circle
              cx={element.x}
              cy={element.y}
              r={el.radius || 10}
              fill={isSelected ? '#22c55e' : AVAILABLE_COLOR}
              stroke={isSelected ? '#16a34a' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isSelected ? 2 : 1}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); handleSeatClick(seatInfo); }}
            />
            {(el.radius || 10) >= 10 && (
              <text
                x={element.x}
                y={element.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={Math.max(6, (el.radius || 10) * 0.6)}
                fontWeight="500"
                pointerEvents="none"
              >
                {el.label || ''}
              </text>
            )}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Modal container */}
      <div className="relative bg-gray-100 rounded-xl shadow-2xl overflow-hidden" style={{ width: 800, height: 500 }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center bg-gray-900/80 hover:bg-gray-900 text-white rounded-full transition-colors"
        >
          ✕
        </button>

        {/* Embed preview container - matches embed widget size */}
        <div
          className="w-full h-full relative overflow-hidden"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); handleSeatLeave(); }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`${contentBounds.minX} ${contentBounds.minY} ${contentBounds.width} ${contentBounds.height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <rect
              x={contentBounds.minX}
              y={contentBounds.minY}
              width={contentBounds.width}
              height={contentBounds.height}
              fill={map.backgroundColor || 'transparent'}
            />
            {map.elements.map(renderElement)}
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-0.5 bg-gray-900/85 backdrop-blur rounded-lg p-1">
            <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded text-lg">+</button>
            <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded text-lg">−</button>
            <button onClick={resetView} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded text-sm">⊙</button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 bg-gray-900/85 backdrop-blur rounded-lg px-3 py-2 text-xs font-medium text-white/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" style={{ boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span>Unavailable</span>
            </div>
          </div>

          {/* Selection panel */}
          {selectedSeats.size > 0 && (
            <div className="absolute top-3 right-12 bg-gray-900/92 backdrop-blur-xl rounded-xl p-4 min-w-[200px] max-w-[260px] text-white shadow-xl">
              <div className="flex justify-between items-center mb-3 text-sm font-semibold">
                <span>Your Selection</span>
                <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{selectedSeats.size}</span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto mb-3">
                {Array.from(selectedSeats.values()).map(seat => (
                  <div key={seat.id} className="flex justify-between items-center p-2.5 bg-white/5 rounded-lg text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold">{seat.label}</span>
                      <span className="text-xs text-white/50">
                        {seat.section && `${seat.section} · `}{seat.row && `Row ${seat.row}`}
                      </span>
                    </div>
                    <span className="font-bold text-green-400">{formatPrice(seat.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center py-3 border-t border-white/10 font-semibold">
                <span>Total</span>
                <span className="text-lg font-bold text-green-400">{formatPrice(totalPrice)}</span>
              </div>
              <button className="w-full mt-3 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg">
                Continue to Checkout
              </button>
            </div>
          )}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-[60] pointer-events-none bg-gray-900/95 backdrop-blur rounded-lg px-3 py-2.5 shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, minWidth: 140 }}
          >
            <div className="flex gap-4 mb-2 pb-2 border-b border-white/10">
              {tooltip.seat.row && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-white/50 uppercase">Row</span>
                  <span className="text-sm font-semibold text-white">{tooltip.seat.row}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-white/50 uppercase">Seat</span>
                <span className="text-sm font-semibold text-white">{tooltip.seat.label}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-white/50 uppercase">Category</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.categoryColor || '#6B7280' }} />
                  {getCategoryInfo(tooltip.seat.category)?.name || 'Standard'}
                </span>
              </div>
            </div>
            {tooltip.seat.price !== undefined && (
              <div className="text-lg font-bold text-green-400 text-center pt-1">
                {formatPrice(tooltip.seat.price)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="absolute bottom-8 text-center text-white/60 text-sm">
        This is how your seat map will appear when embedded (800×500px)
      </div>
    </div>
  );
}
