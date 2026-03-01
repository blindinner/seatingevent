import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Point, ToolType, SeatCategory, RowElement, SeatElement, AreaElement, ShapeElement, LineElement, MapElement, BoothElement, TextElement } from '@/types/map';
import {
  calculateRowPreview,
  calculateMultipleRowsPreview,
  type SeatPreview,
  type RowPreview,
} from '@/lib/rowPreviewCalculator';

// Preview for booth drawing
export interface BoothPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export type DrawingPhase = 'idle' | 'firstClick' | 'extending' | 'addingRows' | 'drawingShape' | 'drawingPolygon';

// Preview for area/shape drawing
export interface AreaPreview {
  areaType: 'rectangle' | 'ellipse' | 'polygon';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[];
}

// Same structure for shape preview
export type ShapePreview = AreaPreview;

// Preview for line drawing
export interface LinePreview {
  points: Point[];
}

// Preview for text box drawing
export interface TextPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingState {
  // Active drawing session
  isDrawing: boolean;
  tool: ToolType | null;
  phase: DrawingPhase;

  // Points collected
  startPoint: Point | null;
  currentPoint: Point | null;
  anchorPoints: Point[]; // For segments - each anchored endpoint

  // First row definition (for multiple rows tool)
  firstRowEnd: Point | null;

  // Row preview data
  previewSeats: SeatPreview[];
  previewRows: RowPreview[];
  previewAngle: number;

  // Area preview data
  previewArea: AreaPreview | null;
  polygonPoints: Point[]; // For polygon area/shape

  // Shape preview data (same structure as area)
  previewShape: ShapePreview | null;

  // Line preview data
  previewLine: LinePreview | null;

  // Text preview data
  previewText: TextPreview | null;

  // Booth preview data
  previewBooths: BoothPreview[];
  boothWidth: number;
  boothHeight: number;
  boothSpacing: number;

  // Configuration (pulled from seating config)
  seatSpacing: number;
  seatRadius: number;
  rowSpacing: number;
  category: SeatCategory;
}

interface DrawingActions {
  // Start a new drawing session
  startDrawing: (tool: ToolType, point: Point, config: DrawingConfig) => void;

  // Update cursor position during drawing
  updateCursor: (point: Point) => void;

  // Handle a click during drawing (anchor segment, finish row, etc.)
  commitClick: (point: Point) => void;

  // Finish drawing and return elements to create
  finishDrawing: () => MapElement[];

  // Cancel drawing without creating elements
  cancelDrawing: () => void;

  // Check if a tool is a row drawing tool
  isRowDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool is an area drawing tool
  isAreaDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool is a shape block drawing tool
  isShapeBlockDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool uses drag-to-size (rect/ellipse for both area and shape)
  isShapeDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool is a line drawing tool
  isLineDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool is a booth drawing tool
  isBoothDrawingTool: (tool: ToolType) => boolean;

  // Check if a tool is a text drawing tool
  isTextDrawingTool: (tool: ToolType) => boolean;
}

export interface DrawingConfig {
  seatSpacing: number;
  seatRadius: number;
  rowSpacing: number;
  category: SeatCategory;
}

const initialState: DrawingState = {
  isDrawing: false,
  tool: null,
  phase: 'idle',
  startPoint: null,
  currentPoint: null,
  anchorPoints: [],
  firstRowEnd: null,
  previewSeats: [],
  previewRows: [],
  previewAngle: 0,
  previewArea: null,
  previewShape: null,
  previewLine: null,
  previewText: null,
  previewBooths: [],
  boothWidth: 95,
  boothHeight: 60,
  boothSpacing: 10,
  polygonPoints: [],
  seatSpacing: 30,
  seatRadius: 12,
  rowSpacing: 40,
  category: 'general',
};

const ROW_DRAWING_TOOLS: ToolType[] = ['row', 'rowSegmented', 'multipleRows'];
const AREA_DRAWING_TOOLS: ToolType[] = ['rectArea', 'ellipseArea', 'polyArea'];
const SHAPE_BLOCK_TOOLS: ToolType[] = ['rectangle', 'ellipse', 'polygon'];
const LINE_TOOLS: ToolType[] = ['line'];
const BOOTH_DRAWING_TOOLS: ToolType[] = ['boothSegmented'];
const TEXT_DRAWING_TOOLS: ToolType[] = ['text'];
// Tools that use drag-to-size (not click-to-place-vertices)
const DRAG_TO_SIZE_TOOLS: ToolType[] = ['rectArea', 'ellipseArea', 'rectangle', 'ellipse', 'text'];

export const useDrawingStore = create<DrawingState & DrawingActions>()((set, get) => ({
  ...initialState,

  isRowDrawingTool: (tool) => ROW_DRAWING_TOOLS.includes(tool),
  isAreaDrawingTool: (tool) => AREA_DRAWING_TOOLS.includes(tool),
  isShapeBlockDrawingTool: (tool) => SHAPE_BLOCK_TOOLS.includes(tool),
  isShapeDrawingTool: (tool) => DRAG_TO_SIZE_TOOLS.includes(tool),
  isLineDrawingTool: (tool) => LINE_TOOLS.includes(tool),
  isBoothDrawingTool: (tool) => BOOTH_DRAWING_TOOLS.includes(tool),
  isTextDrawingTool: (tool) => TEXT_DRAWING_TOOLS.includes(tool),

  startDrawing: (tool, point, config) => {
    const isArea = AREA_DRAWING_TOOLS.includes(tool);
    const isShape = SHAPE_BLOCK_TOOLS.includes(tool);
    const isLine = LINE_TOOLS.includes(tool);
    const isBooth = BOOTH_DRAWING_TOOLS.includes(tool);
    const isText = TEXT_DRAWING_TOOLS.includes(tool);
    const isPolygonArea = tool === 'polyArea';
    const isPolygonShape = tool === 'polygon';
    const isPolygon = isPolygonArea || isPolygonShape;

    // Determine the shape type
    const getShapeType = (t: ToolType): 'rectangle' | 'ellipse' | 'polygon' => {
      if (t === 'rectArea' || t === 'rectangle') return 'rectangle';
      if (t === 'ellipseArea' || t === 'ellipse') return 'ellipse';
      return 'polygon';
    };

    // Determine phase based on tool type
    const getPhase = (): DrawingPhase => {
      if (isPolygon || isLine) return 'drawingPolygon';
      if (isArea || isShape || isText) return 'drawingShape';
      return 'firstClick';
    };

    set({
      isDrawing: true,
      tool,
      phase: getPhase(),
      startPoint: point,
      currentPoint: point,
      anchorPoints: [point],
      firstRowEnd: null,
      previewSeats: [],
      previewRows: [],
      previewAngle: 0,
      previewArea: isArea ? {
        areaType: getShapeType(tool),
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        points: isPolygonArea ? [point] : undefined,
      } : null,
      previewShape: isShape ? {
        areaType: getShapeType(tool),
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        points: isPolygonShape ? [point] : undefined,
      } : null,
      previewLine: isLine ? {
        points: [point],
      } : null,
      previewText: isText ? {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      } : null,
      previewBooths: isBooth ? [] : [],
      polygonPoints: (isPolygon || isLine) ? [point] : [],
      seatSpacing: config.seatSpacing,
      seatRadius: config.seatRadius,
      rowSpacing: config.rowSpacing,
      category: config.category,
    });
  },

  updateCursor: (point) => {
    const state = get();
    if (!state.isDrawing || !state.startPoint) return;

    const { tool, phase, anchorPoints, firstRowEnd, seatSpacing, seatRadius, rowSpacing, polygonPoints } = state;

    // Handle area tools (drag-to-size)
    if (tool === 'rectArea' || tool === 'ellipseArea') {
      const startPoint = state.startPoint;
      const width = point.x - startPoint.x;
      const height = point.y - startPoint.y;

      set({
        currentPoint: point,
        previewArea: {
          areaType: tool === 'rectArea' ? 'rectangle' : 'ellipse',
          x: width >= 0 ? startPoint.x : point.x,
          y: height >= 0 ? startPoint.y : point.y,
          width: Math.abs(width),
          height: Math.abs(height),
        },
      });
      return;
    }

    // Handle text tool (drag-to-size)
    if (tool === 'text') {
      const startPoint = state.startPoint;
      const width = point.x - startPoint.x;
      const height = point.y - startPoint.y;

      set({
        currentPoint: point,
        previewText: {
          x: width >= 0 ? startPoint.x : point.x,
          y: height >= 0 ? startPoint.y : point.y,
          width: Math.abs(width),
          height: Math.abs(height),
        },
      });
      return;
    }

    // Handle shape block tools (drag-to-size)
    if (tool === 'rectangle' || tool === 'ellipse') {
      const startPoint = state.startPoint;
      const width = point.x - startPoint.x;
      const height = point.y - startPoint.y;

      set({
        currentPoint: point,
        previewShape: {
          areaType: tool === 'rectangle' ? 'rectangle' : 'ellipse',
          x: width >= 0 ? startPoint.x : point.x,
          y: height >= 0 ? startPoint.y : point.y,
          width: Math.abs(width),
          height: Math.abs(height),
        },
      });
      return;
    }

    // Handle polygon area (click-to-place)
    if (tool === 'polyArea') {
      set({
        currentPoint: point,
        previewArea: {
          areaType: 'polygon',
          x: state.startPoint.x,
          y: state.startPoint.y,
          points: [...polygonPoints, point],
        },
      });
      return;
    }

    // Handle polygon shape (click-to-place)
    if (tool === 'polygon') {
      set({
        currentPoint: point,
        previewShape: {
          areaType: 'polygon',
          x: state.startPoint.x,
          y: state.startPoint.y,
          points: [...polygonPoints, point],
        },
      });
      return;
    }

    // Handle line tool (click-to-place)
    if (tool === 'line') {
      set({
        currentPoint: point,
        previewLine: {
          points: [...polygonPoints, point],
        },
      });
      return;
    }

    // Handle booth segmented tool
    if (tool === 'boothSegmented') {
      const { boothWidth, boothHeight, boothSpacing } = state;
      const segmentStart = anchorPoints[anchorPoints.length - 1] || state.startPoint;

      // Calculate distance and direction
      const dx = point.x - segmentStart.x;
      const dy = point.y - segmentStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const boothSize = Math.max(boothWidth, boothHeight) + boothSpacing;

      // Calculate how many booths fit in this segment
      const numBooths = Math.max(1, Math.floor(distance / boothSize) + 1);

      // Generate booth previews along the line
      const currentSegmentBooths: BoothPreview[] = [];
      for (let i = 0; i < numBooths; i++) {
        const t = numBooths > 1 ? i / (numBooths - 1) : 0;
        const x = segmentStart.x + dx * t - boothWidth / 2;
        const y = segmentStart.y + dy * t - boothHeight / 2;
        currentSegmentBooths.push({
          x,
          y,
          width: boothWidth,
          height: boothHeight,
          label: String(state.previewBooths.length + i + 1),
        });
      }

      // Combine with previously anchored booths (excluding duplicates at anchor points)
      let allBooths: BoothPreview[] = [];
      if (anchorPoints.length > 1) {
        // Rebuild booths from all previous segments
        for (let segIdx = 0; segIdx < anchorPoints.length - 1; segIdx++) {
          const segStart = anchorPoints[segIdx];
          const segEnd = anchorPoints[segIdx + 1];
          const segDx = segEnd.x - segStart.x;
          const segDy = segEnd.y - segStart.y;
          const segDist = Math.sqrt(segDx * segDx + segDy * segDy);
          const segNumBooths = Math.max(1, Math.floor(segDist / boothSize) + 1);

          for (let i = 0; i < segNumBooths; i++) {
            // Skip first booth of subsequent segments (it overlaps with last booth of previous)
            if (segIdx > 0 && i === 0) continue;
            const t = segNumBooths > 1 ? i / (segNumBooths - 1) : 0;
            const bx = segStart.x + segDx * t - boothWidth / 2;
            const by = segStart.y + segDy * t - boothHeight / 2;
            allBooths.push({
              x: bx,
              y: by,
              width: boothWidth,
              height: boothHeight,
              label: String(allBooths.length + 1),
            });
          }
        }

        // Add current segment booths, skipping first if it overlaps
        const boothsToAdd = currentSegmentBooths.slice(1);
        boothsToAdd.forEach((b, i) => {
          allBooths.push({ ...b, label: String(allBooths.length + 1) });
        });
      } else {
        allBooths = currentSegmentBooths;
      }

      set({
        currentPoint: point,
        previewBooths: allBooths,
      });
      return;
    }

    // Handle row tools (existing logic)
    const segmentStart = anchorPoints[anchorPoints.length - 1] || state.startPoint;

    if (tool === 'row' || tool === 'rowSegmented') {
      let { seats: currentSeats, angle } = calculateRowPreview(
        segmentStart,
        point,
        seatSpacing,
        seatRadius
      );

      let allPreviewSeats: SeatPreview[] = [];

      if (tool === 'rowSegmented' && anchorPoints.length > 1) {
        const epsilon = 0.5;

        // Build all previous segments first
        for (let i = 0; i < anchorPoints.length - 1; i++) {
          const { seats: segmentSeats } = calculateRowPreview(
            anchorPoints[i],
            anchorPoints[i + 1],
            seatSpacing,
            seatRadius
          );

          // For segments after the first, check if first seat duplicates the last seat of previous segments
          let adjustedSeats = segmentSeats;
          if (i > 0 && segmentSeats.length > 0 && allPreviewSeats.length > 0) {
            const firstSeat = segmentSeats[0];
            const lastPreviousSeat = allPreviewSeats[allPreviewSeats.length - 1];
            const isDuplicate =
              Math.abs(firstSeat.x - lastPreviousSeat.x) < epsilon &&
              Math.abs(firstSeat.y - lastPreviousSeat.y) < epsilon;

            if (isDuplicate) {
              adjustedSeats = segmentSeats.slice(1);
            }
          }
          allPreviewSeats = [...allPreviewSeats, ...adjustedSeats];
        }

        // For current segment, skip first seat ONLY if it duplicates the last seat of previous segments
        if (currentSeats.length > 0 && allPreviewSeats.length > 0) {
          const firstCurrentSeat = currentSeats[0];
          const lastPreviousSeat = allPreviewSeats[allPreviewSeats.length - 1];
          const isDuplicate =
            Math.abs(firstCurrentSeat.x - lastPreviousSeat.x) < epsilon &&
            Math.abs(firstCurrentSeat.y - lastPreviousSeat.y) < epsilon;

          if (isDuplicate) {
            currentSeats = currentSeats.slice(1);
          }
        }
      }

      allPreviewSeats = [...allPreviewSeats, ...currentSeats];

      set({
        currentPoint: point,
        previewSeats: allPreviewSeats,
        previewAngle: angle,
      });
    } else if (tool === 'multipleRows') {
      if (phase === 'firstClick') {
        const { seats, angle } = calculateRowPreview(
          segmentStart,
          point,
          seatSpacing,
          seatRadius
        );
        set({
          currentPoint: point,
          previewSeats: seats,
          previewAngle: angle,
          previewRows: [],
        });
      } else if (phase === 'extending' && firstRowEnd) {
        const { seats: firstRowSeats, angle } = calculateRowPreview(
          state.startPoint!,
          firstRowEnd,
          seatSpacing,
          seatRadius
        );

        const rows = calculateMultipleRowsPreview(
          state.startPoint!,
          firstRowEnd,
          point,
          firstRowSeats,
          angle,
          rowSpacing,
          seatSpacing,
          seatRadius
        );

        set({
          currentPoint: point,
          previewSeats: [],
          previewRows: rows,
          previewAngle: angle,
        });
      }
    }
  },

  commitClick: (point) => {
    const state = get();
    if (!state.isDrawing) return;

    const { tool, phase, anchorPoints, previewSeats, polygonPoints } = state;

    // Handle polygon area - add point
    if (tool === 'polyArea') {
      const newPoints = [...polygonPoints, point];
      set({
        polygonPoints: newPoints,
        anchorPoints: [...anchorPoints, point],
        previewArea: {
          areaType: 'polygon',
          x: state.startPoint!.x,
          y: state.startPoint!.y,
          points: newPoints,
        },
      });
      return;
    }

    // Handle polygon shape - add point
    if (tool === 'polygon') {
      const newPoints = [...polygonPoints, point];
      set({
        polygonPoints: newPoints,
        anchorPoints: [...anchorPoints, point],
        previewShape: {
          areaType: 'polygon',
          x: state.startPoint!.x,
          y: state.startPoint!.y,
          points: newPoints,
        },
      });
      return;
    }

    // Handle line tool - add point
    if (tool === 'line') {
      const newPoints = [...polygonPoints, point];
      set({
        polygonPoints: newPoints,
        anchorPoints: [...anchorPoints, point],
        previewLine: {
          points: newPoints,
        },
      });
      return;
    }

    // Handle booth segmented tool - anchor segment
    if (tool === 'boothSegmented') {
      const { previewBooths, boothWidth, boothHeight } = state;
      if (previewBooths.length === 0) return;

      // Anchor at the center of the last booth
      const lastBooth = previewBooths[previewBooths.length - 1];
      const anchorPoint = {
        x: lastBooth.x + boothWidth / 2,
        y: lastBooth.y + boothHeight / 2,
      };

      set({
        anchorPoints: [...anchorPoints, anchorPoint],
        currentPoint: anchorPoint,
      });
      return;
    }

    // Handle row tools
    if (tool === 'row') {
      // Row tool: second click finishes
    } else if (tool === 'rowSegmented') {
      if (previewSeats.length === 0) {
        return;
      }

      const lastSeat = previewSeats[previewSeats.length - 1];
      const anchorPoint = { x: lastSeat.x, y: lastSeat.y };
      const lastAnchor = anchorPoints[anchorPoints.length - 1];

      const epsilon = 0.5;
      const isSamePosition =
        Math.abs(anchorPoint.x - lastAnchor.x) < epsilon &&
        Math.abs(anchorPoint.y - lastAnchor.y) < epsilon;

      if (isSamePosition) {
        return;
      }

      const newAnchorPoints = [...anchorPoints, anchorPoint];

      set({
        anchorPoints: newAnchorPoints,
        currentPoint: anchorPoint,
      });
    } else if (tool === 'multipleRows') {
      if (phase === 'firstClick') {
        set({
          phase: 'extending',
          firstRowEnd: point,
          anchorPoints: [...anchorPoints, point],
        });
      }
    }
  },

  finishDrawing: () => {
    const state = get();
    if (!state.isDrawing || !state.startPoint) return [];

    const {
      tool,
      startPoint,
      currentPoint,
      seatSpacing,
      seatRadius,
      rowSpacing,
      category,
      previewRows,
      previewSeats,
      previewArea,
      previewShape,
      previewText,
      previewBooths,
      polygonPoints,
    } = state;

    const elements: MapElement[] = [];

    // Handle text tool
    if (tool === 'text') {
      if (previewText && previewText.width > 20 && previewText.height > 10) {
        elements.push(createTextFromPreview(previewText));
      }
    }

    // Handle area tools
    if (tool === 'rectArea' || tool === 'ellipseArea') {
      if (previewArea && previewArea.width && previewArea.height &&
          previewArea.width > 10 && previewArea.height > 10) {
        elements.push(createAreaFromPreview(previewArea));
      }
    } else if (tool === 'polyArea') {
      if (polygonPoints.length >= 3) {
        elements.push(createAreaFromPreview({
          areaType: 'polygon',
          x: startPoint.x,
          y: startPoint.y,
          points: polygonPoints,
        }));
      }
    }

    // Handle shape block tools
    if (tool === 'rectangle' || tool === 'ellipse') {
      if (previewShape && previewShape.width && previewShape.height &&
          previewShape.width > 10 && previewShape.height > 10) {
        elements.push(createShapeFromPreview(previewShape));
      }
    } else if (tool === 'polygon') {
      if (polygonPoints.length >= 3) {
        elements.push(createShapeFromPreview({
          areaType: 'polygon',
          x: startPoint.x,
          y: startPoint.y,
          points: polygonPoints,
        }));
      }
    }

    // Handle line tool
    if (tool === 'line') {
      if (polygonPoints.length >= 2) {
        elements.push(createLineFromPreview(polygonPoints));
      }
    }

    // Handle booth segmented tool
    if (tool === 'boothSegmented') {
      if (previewBooths.length > 0) {
        previewBooths.forEach((boothPreview) => {
          elements.push(createBoothFromPreview(boothPreview, category));
        });
      }
    }

    // Handle row tools
    if (tool === 'row') {
      if (!currentPoint) {
        set(initialState);
        return [];
      }

      const { seats, angle } = calculateRowPreview(
        startPoint,
        currentPoint,
        seatSpacing,
        seatRadius
      );

      if (seats.length > 0) {
        elements.push(createRowFromPreview(
          startPoint,
          seats,
          angle,
          seatSpacing,
          seatRadius,
          category,
          'A'
        ));
      }
    } else if (tool === 'rowSegmented') {
      if (previewSeats.length > 0) {
        elements.push(createRowFromPreview(
          startPoint,
          previewSeats,
          0,
          seatSpacing,
          seatRadius,
          category,
          'A'
        ));
      }
    } else if (tool === 'multipleRows') {
      previewRows.forEach((rowPreview, index) => {
        const rowLabel = String.fromCharCode(65 + index);
        elements.push(createRowFromPreview(
          rowPreview.startPoint,
          rowPreview.seats,
          rowPreview.angle,
          seatSpacing,
          seatRadius,
          category,
          rowLabel
        ));
      });
    }

    // Reset state
    set(initialState);

    return elements;
  },

  cancelDrawing: () => {
    set(initialState);
  },
}));

// Helper function to create a RowElement from preview data
function createRowFromPreview(
  startPoint: Point,
  seats: SeatPreview[],
  angle: number,
  seatSpacing: number,
  seatRadius: number,
  category: SeatCategory,
  label: string
): RowElement {
  const seatElements: SeatElement[] = seats.map((seat, index) => ({
    id: nanoid(),
    type: 'seat' as const,
    x: seat.x - startPoint.x,
    y: seat.y - startPoint.y,
    rotation: 0,
    locked: false,
    visible: true,
    label: `${label}${index + 1}`,
    category,
    status: 'available' as const,
    radius: seatRadius,
  }));

  return {
    id: nanoid(),
    type: 'row' as const,
    x: startPoint.x,
    y: startPoint.y,
    rotation: 0,
    locked: false,
    visible: true,
    seatCount: seatElements.length,
    seatSpacing,
    seatRadius,
    seats: seatElements,
    curved: false,
    label,
    numberingDirection: 'left-to-right' as const,
    startNumber: 1,
    category,
  };
}

// Helper function to create an AreaElement from preview data
function createAreaFromPreview(preview: AreaPreview): AreaElement {
  const baseElement = {
    id: nanoid(),
    type: 'area' as const,
    x: preview.x,
    y: preview.y,
    rotation: 0,
    locked: false,
    visible: true,
    label: 'Area',
    fill: 'rgba(59, 130, 246, 0.2)',
    stroke: '#3b82f6',
    strokeWidth: 2,
  };

  if (preview.areaType === 'polygon' && preview.points) {
    // For polygon, store points relative to the element position
    const minX = Math.min(...preview.points.map(p => p.x));
    const minY = Math.min(...preview.points.map(p => p.y));
    const relativePoints = preview.points.map(p => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    return {
      ...baseElement,
      x: minX,
      y: minY,
      areaType: 'polygon',
      points: relativePoints,
    };
  }

  return {
    ...baseElement,
    areaType: preview.areaType,
    width: preview.width,
    height: preview.height,
  };
}

// Helper function to create a ShapeElement from preview data
function createShapeFromPreview(preview: ShapePreview): ShapeElement {
  const baseElement = {
    id: nanoid(),
    type: 'shape' as const,
    x: preview.x,
    y: preview.y,
    rotation: 0,
    locked: false,
    visible: true,
    fill: '#4b5563',
    stroke: '#374151',
    strokeWidth: 2,
    cornerRadius: 4,
  };

  if (preview.areaType === 'polygon' && preview.points) {
    // For polygon, store points relative to the element position
    const minX = Math.min(...preview.points.map(p => p.x));
    const minY = Math.min(...preview.points.map(p => p.y));
    const relativePoints = preview.points.map(p => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    return {
      ...baseElement,
      x: minX,
      y: minY,
      shapeType: 'polygon',
      points: relativePoints,
    };
  }

  return {
    ...baseElement,
    shapeType: preview.areaType,
    width: preview.width,
    height: preview.height,
  };
}

// Helper function to create a LineElement from preview data
function createLineFromPreview(points: Point[]): LineElement {
  // Calculate bounding box
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));

  // Store points relative to the element position
  const relativePoints = points.map(p => ({
    x: p.x - minX,
    y: p.y - minY,
  }));

  return {
    id: nanoid(),
    type: 'line' as const,
    x: minX,
    y: minY,
    rotation: 0,
    locked: false,
    visible: true,
    points: relativePoints,
    stroke: '#374151',
    strokeWidth: 2,
  };
}

// Helper function to create a BoothElement from preview data
function createBoothFromPreview(preview: BoothPreview, category: SeatCategory): BoothElement {
  return {
    id: nanoid(),
    type: 'booth' as const,
    x: preview.x,
    y: preview.y,
    rotation: 0,
    locked: false,
    visible: true,
    width: preview.width,
    height: preview.height,
    label: preview.label,
    boothNumber: preview.label,
    fill: '#6366f1',
    stroke: '#4f46e5',
    category,
    scale: 1,
    sectionLabel: '',
    displayedLabel: preview.label,
    entrance: '',
  };
}

// Helper function to create a TextElement from preview data
function createTextFromPreview(preview: TextPreview): TextElement {
  // Calculate appropriate font size based on height (use ~80% of height for text)
  const fontSize = Math.max(12, Math.min(72, Math.round(preview.height * 0.7)));

  return {
    id: nanoid(),
    type: 'text' as const,
    // Position at center of text box
    x: preview.x + preview.width / 2,
    y: preview.y + preview.height / 2,
    rotation: 0,
    locked: false,
    visible: true,
    text: 'Text',
    fontSize,
    fontFamily: 'sans-serif',
    fill: '#FFFFFF',
    align: 'center',
    width: preview.width,
    height: preview.height,
  };
}
