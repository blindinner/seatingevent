'use client';

import { useRef, useState, useCallback, useMemo, useEffect, MouseEvent, WheelEvent } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';
import { useDrawingStore } from '@/stores/drawingStore';
import { screenToCanvas, getElementBounds, boundsIntersect } from '@/lib/utils';
import { calculateSnapGuides } from '@/lib/snapCalculator';
import type { MapElement, Point, Bounds, SnapGuide } from '@/types/map';
import { SeatRenderer } from './seats/SeatRenderer';
import { RowRenderer } from './seats/RowRenderer';
import { SectionRenderer } from './seats/SectionRenderer';
import { StageRenderer } from './elements/StageRenderer';
import { RectangleRenderer } from './elements/RectangleRenderer';
import { TableRenderer } from './elements/TableRenderer';
import { TextRenderer } from './elements/TextRenderer';
import { BoothRenderer } from './elements/BoothRenderer';
import { AreaRenderer } from './elements/AreaRenderer';
import { ShapeRenderer } from './elements/ShapeRenderer';
import { LineRenderer } from './elements/LineRenderer';
import { AreaPreview } from './AreaPreview';
import { ShapePreview } from './ShapePreview';
import { LinePreview } from './LinePreview';
import { SelectionBox } from './SelectionBox';
import { SnapGuides } from './SnapGuides';
import { Grid } from './Grid';
import { ResizeHandles, calculateResizedBounds, type ResizeHandle } from './ResizeHandles';
import { RowHandles, RowSelectionOutline, calculateRotationAngle, calculateNewSeatCount, getRowDirection, type RowHandleType } from './RowHandles';
import { RowPreview } from './RowPreview';
import { TextEditor } from './TextEditor';
import type { RowElement, SeatElement } from '@/types/map';

export function Canvas() {
  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    panX,
    panY,
    activeTool,
    selectedIds,
    showGrid,
    gridSize,
    snapToGrid,
    isPanning,
    setZoom,
    setPan,
    setIsPanning,
    selectElement,
    selectElements,
    deselectAll,
    activeCategory,
    editingTextId,
    startEditingText,
    stopEditingText,
    setActiveTool,
  } = useEditorStore();

  const {
    map,
    addElement,
    updateElement,
    moveElements,
    createSeat,
    createRow,
    createStage,
    createRectangle,
    createTable,
    createRoundTable,
    createRectTable,
    createText,
    createBooth,
  } = useMapStore();

  const { showSmartGuides } = useEditorStore();

  // Drawing store for multi-step row, area, shape, booth, and text tools
  const {
    isDrawing,
    tool: drawingTool,
    phase: drawingPhase,
    startPoint: drawingStartPoint,
    currentPoint: drawingCurrentPoint,
    anchorPoints: drawingAnchorPoints,
    previewSeats,
    previewRows,
    previewAngle,
    previewArea,
    previewShape,
    previewLine,
    previewText,
    previewBooths,
    seatRadius: drawingSeatRadius,
    startDrawing,
    updateCursor,
    commitClick,
    finishDrawing,
    cancelDrawing,
    isRowDrawingTool,
    isAreaDrawingTool,
    isShapeBlockDrawingTool,
    isShapeDrawingTool,
    isLineDrawingTool,
    isBoothDrawingTool,
    isTextDrawingTool,
  } = useDrawingStore();

  // For segmented rows, the guideline should start from the last anchor point
  // (which is the position of the last placed seat)
  const segmentStartPoint = useMemo(() => {
    if (drawingTool === 'rowSegmented' && drawingAnchorPoints.length > 1) {
      return drawingAnchorPoints[drawingAnchorPoints.length - 1];
    }
    return null;
  }, [drawingTool, drawingAnchorPoints]);

  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<Bounds | null>(null);
  const [isDraggingElements, setIsDraggingElements] = useState(false);
  const [lastDragPoint, setLastDragPoint] = useState<Point | null>(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuide[]>([]);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Track when we just finished editing text to prevent creating new elements
  const justFinishedEditingRef = useRef(false);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStartBounds, setResizeStartBounds] = useState<Bounds | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<Point | null>(null);

  // Row extend/rotate state
  const [isExtendingRow, setIsExtendingRow] = useState(false);
  const [activeRowHandle, setActiveRowHandle] = useState<RowHandleType | null>(null);
  const [rowExtendStartPoint, setRowExtendStartPoint] = useState<Point | null>(null);
  const [rowExtendStartSeatCount, setRowExtendStartSeatCount] = useState<number>(0);
  const [isRotatingRow, setIsRotatingRow] = useState(false);
  const [rowRotateStartAngle, setRowRotateStartAngle] = useState<number>(0);
  const [rowRotateStartRotation, setRowRotateStartRotation] = useState<number>(0);

  // Simple text box drawing state
  const [textBoxStart, setTextBoxStart] = useState<Point | null>(null);
  const [textBoxCurrent, setTextBoxCurrent] = useState<Point | null>(null);

  // Track spacebar for temporary pan mode (Figma-style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Escape key globally - switch to select tool
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();

        // Cancel any drawing in progress
        if (isDrawing) {
          cancelDrawing();
        }

        // Deselect all elements
        deselectAll();

        // Switch to select tool
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDrawing, cancelDrawing, deselectAll, setActiveTool]);

  // Handle Enter for finishing segmented drawings
  useEffect(() => {
    if (!isDrawing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Enter') {
        // Finish drawing for segmented tools
        if (activeTool === 'rowSegmented' || activeTool === 'boothSegmented' ||
            activeTool === 'polyArea' || activeTool === 'polygon' || activeTool === 'line') {
          e.preventDefault();
          const elements = finishDrawing();
          elements.forEach((el) => addElement(el));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, activeTool, finishDrawing, addElement]);

  // Handle wheel - zoom with Ctrl/Cmd, pan otherwise (trackpad support)
  // Use native event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();

      // Pinch zoom (Ctrl+wheel) or regular scroll wheel
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) {
        // Zoom
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newZoom = Math.max(0.1, Math.min(5, zoom * delta));

        // Zoom towards mouse position
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
          const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);

          setPan(newPanX, newPanY);
        }

        setZoom(newZoom);
      } else {
        // Pan (trackpad two-finger scroll)
        setPan(panX - e.deltaX, panY - e.deltaY);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom, panX, panY, setZoom, setPan]);

  // Get canvas position from mouse event
  const getCanvasPoint = useCallback(
    (e: MouseEvent): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      return screenToCanvas(screenX, screenY, { x: panX, y: panY }, zoom);
    },
    [panX, panY, zoom]
  );

  // Snap point to grid if enabled
  const snapPoint = useCallback(
    (point: Point): Point => {
      if (!snapToGrid) return point;
      return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
      };
    },
    [snapToGrid, gridSize]
  );

  // Get the single selected element if it's resizable
  const selectedResizableElement = useMemo(() => {
    if (selectedIds.length !== 1 || !map) return null;
    const element = map.elements.find((el) => el.id === selectedIds[0]);
    if (!element) return null;
    // Only certain element types are resizable
    const resizableTypes = ['rectangle', 'stage', 'text'];
    if (!resizableTypes.includes(element.type)) return null;
    return element;
  }, [selectedIds, map]);

  // Get the single selected element if it's a row
  const selectedRowElement = useMemo(() => {
    if (selectedIds.length !== 1 || !map) return null;
    const element = map.elements.find((el) => el.id === selectedIds[0]);
    if (!element || element.type !== 'row') return null;
    return element as RowElement;
  }, [selectedIds, map]);

  // Get all selected row elements (for multi-selection visual feedback)
  const selectedRowElements = useMemo(() => {
    if (!map) return [];
    return map.elements.filter(
      (el): el is RowElement => el.type === 'row' && selectedIds.includes(el.id)
    );
  }, [selectedIds, map]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedResizableElement) return;

      const bounds = getElementBounds(selectedResizableElement);
      const point = getCanvasPoint(e);

      setIsResizing(true);
      setActiveResizeHandle(handle);
      setResizeStartBounds(bounds);
      setResizeStartPoint(point);
    },
    [selectedResizableElement, getCanvasPoint]
  );

  // Handle row extend start (drag ends to add/remove seats)
  const handleRowExtendStart = useCallback(
    (handle: RowHandleType, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedRowElement) return;

      const point = getCanvasPoint(e);
      setIsExtendingRow(true);
      setActiveRowHandle(handle);
      setRowExtendStartPoint(point);
      setRowExtendStartSeatCount(selectedRowElement.seatCount);
    },
    [selectedRowElement, getCanvasPoint]
  );

  // Handle row rotate start
  const handleRowRotateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedRowElement) return;

      const point = getCanvasPoint(e);

      // Get actual row center from seat positions
      let centerX: number, centerY: number;
      if (selectedRowElement.seats && selectedRowElement.seats.length > 0) {
        const firstSeat = selectedRowElement.seats[0];
        const lastSeat = selectedRowElement.seats[selectedRowElement.seats.length - 1];
        centerX = selectedRowElement.x + (firstSeat.x + lastSeat.x) / 2;
        centerY = selectedRowElement.y + (firstSeat.y + lastSeat.y) / 2;
      } else {
        const rowWidth = (selectedRowElement.seatCount - 1) * selectedRowElement.seatSpacing;
        centerX = selectedRowElement.x + rowWidth / 2;
        centerY = selectedRowElement.y;
      }

      const startAngle = calculateRotationAngle(
        { x: centerX, y: centerY },
        point
      );

      setIsRotatingRow(true);
      setRowRotateStartAngle(startAngle);
      setRowRotateStartRotation(selectedRowElement.rotation || 0);
    },
    [selectedRowElement, getCanvasPoint]
  );

  // Separate elements by layer for proper z-ordering (must be before handleMouseDown)
  const { belowElements, seatElements, aboveElements, elementsInZOrder } = useMemo(() => {
    if (!map) return { belowElements: [], seatElements: [], aboveElements: [], elementsInZOrder: [] };

    const below: MapElement[] = [];
    const seats: MapElement[] = [];
    const above: MapElement[] = [];

    for (const element of map.elements) {
      if (element.layer === 'above') {
        above.push(element);
      } else if (element.type === 'row' || element.type === 'seat' || element.type === 'section' || element.type === 'table') {
        seats.push(element);
      } else if (element.layer === 'below' || !element.layer) {
        below.push(element);
      } else {
        below.push(element);
      }
    }

    // Elements in z-order from top to bottom (for hit detection)
    // Reverse order: above (top) → seats → below (bottom)
    const elementsInZOrder = [...above].reverse().concat([...seats].reverse(), [...below].reverse());

    return { belowElements: below, seatElements: seats, aboveElements: above, elementsInZOrder };
  }, [map]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const point = getCanvasPoint(e);
      const snappedPoint = snapPoint(point);
      setDragStart(point);

      // Middle mouse button (button 1) always pans
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        return;
      }

      // Only process left click for other actions
      if (e.button !== 0) return;

      // Spacebar + drag = pan (Figma-style)
      if (isSpacePressed) {
        setIsPanning(true);
        return;
      }

      // Pan tool
      if (activeTool === 'pan') {
        setIsPanning(true);
        return;
      }

      // Simple text box drawing - just track start point
      if (activeTool === 'text') {
        setTextBoxStart(snappedPoint);
        setTextBoxCurrent(snappedPoint);
        return;
      }

      // Handle multi-step row, area, shape, line, and booth drawing tools
      if (isRowDrawingTool(activeTool) || isAreaDrawingTool(activeTool) || isShapeBlockDrawingTool(activeTool) || isLineDrawingTool(activeTool) || isBoothDrawingTool(activeTool)) {
        if (!isDrawing) {
          // Start new drawing session with default layout values
          startDrawing(activeTool, snappedPoint, {
            seatSpacing: 32,
            seatRadius: 10,
            rowSpacing: 40,
            category: activeCategory,
          });
        } else {
          // Already drawing - this is a subsequent click
          if (activeTool === 'row') {
            // Row tool: second click finishes
            const rows = finishDrawing();
            rows.forEach((row) => addElement(row));
          } else if (activeTool === 'rowSegmented') {
            // Segmented row: click adds anchor, doesn't finish
            commitClick(snappedPoint);
          } else if (activeTool === 'polyArea' || activeTool === 'polygon' || activeTool === 'line') {
            // Polygon area/shape or line: click adds vertex, doesn't finish
            commitClick(snappedPoint);
          } else if (activeTool === 'boothSegmented') {
            // Segmented booth: click adds anchor, doesn't finish
            commitClick(snappedPoint);
          } else if (activeTool === 'multipleRows') {
            if (drawingPhase === 'firstClick') {
              // First subsequent click: define first row endpoint
              commitClick(snappedPoint);
            } else if (drawingPhase === 'extending') {
              // Second subsequent click: finish all rows
              const rows = finishDrawing();
              rows.forEach((row) => addElement(row));
            }
          }
        }
        return;
      }

      // Check if clicking on ANY selected element (start dragging all selected)
      // Use z-ordered elements so topmost element is checked first
      if (activeTool === 'select' && selectedIds.length > 0) {
        const clickedOnSelected = elementsInZOrder.some((el) => {
          if (!selectedIds.includes(el.id)) return false;
          const bounds = getElementBounds(el);
          return (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
          );
        });

        if (clickedOnSelected) {
          setIsDraggingElements(true);
          setLastDragPoint(point);
          return;
        }
      }

      // Select tool - check if clicking on an element
      // Use z-ordered elements so topmost element gets selected
      if (activeTool === 'select') {
        const clickedElement = elementsInZOrder.find((el) => {
          const bounds = getElementBounds(el);
          return (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
          );
        });

        if (clickedElement) {
          selectElement(clickedElement.id, e.shiftKey);
          setIsDraggingElements(true);
          setLastDragPoint(point);
        } else {
          // Click on empty space = selection rectangle (Figma-style)
          deselectAll();
          setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Complex drawing handler, deps are intentionally curated for performance
    [activeTool, getCanvasPoint, snapPoint, map, selectedIds, selectElement, deselectAll, setIsPanning, isSpacePressed, elementsInZOrder, isDrawing, isRowDrawingTool, isAreaDrawingTool, isShapeBlockDrawingTool, isLineDrawingTool, isBoothDrawingTool, isTextDrawingTool, startDrawing, finishDrawing, commitClick, addElement, activeCategory, drawingPhase]
  );

  // Handle mouse move
  /* eslint-disable react-hooks/exhaustive-deps -- Complex drawing handler, deps are intentionally curated for performance */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const point = getCanvasPoint(e);
      const snappedPoint = snapPoint(point);

      // Simple text box drawing - update current point
      if (textBoxStart && activeTool === 'text') {
        setTextBoxCurrent(snappedPoint);
        return;
      }

      // Update drawing preview for row, area, shape, line, and booth tools
      // Read isDrawing directly from store to avoid stale closure
      const currentlyDrawing = useDrawingStore.getState().isDrawing;
      if (currentlyDrawing && (isRowDrawingTool(activeTool) || isAreaDrawingTool(activeTool) || isShapeBlockDrawingTool(activeTool) || isLineDrawingTool(activeTool) || isBoothDrawingTool(activeTool))) {
        updateCursor(snappedPoint);
      }

      // Handle resizing
      if (isResizing && activeResizeHandle && resizeStartBounds && resizeStartPoint && selectedResizableElement) {
        const deltaX = point.x - resizeStartPoint.x;
        const deltaY = point.y - resizeStartPoint.y;
        const maintainAspectRatio = e.shiftKey;

        const newBounds = calculateResizedBounds(
          resizeStartBounds,
          activeResizeHandle,
          deltaX,
          deltaY,
          maintainAspectRatio
        );

        // Update the element based on its type
        if (selectedResizableElement.type === 'rectangle' || selectedResizableElement.type === 'stage') {
          updateElement(selectedResizableElement.id, {
            x: newBounds.x,
            y: newBounds.y,
            width: newBounds.width,
            height: newBounds.height,
          });
        } else if (selectedResizableElement.type === 'text') {
          // For text, we update width/height and adjust fontSize based on height change
          const originalBounds = resizeStartBounds;
          const scaleY = newBounds.height / originalBounds.height;
          const newFontSize = Math.max(8, Math.min(200, (selectedResizableElement as any).fontSize * scaleY));
          updateElement(selectedResizableElement.id, {
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2,
            width: newBounds.width,
            height: newBounds.height,
            fontSize: newFontSize,
          });
          // Update the start bounds/point for continuous resize
          setResizeStartBounds(newBounds);
          setResizeStartPoint(point);
        }
        return;
      }

      // Handle row extending (drag ends to add/remove seats)
      if (isExtendingRow && activeRowHandle && rowExtendStartPoint && selectedRowElement) {
        // Get the actual row direction from seat positions
        const { dirX, dirY } = getRowDirection(selectedRowElement);

        // Calculate drag distance along the row's axis
        const dx = point.x - rowExtendStartPoint.x;
        const dy = point.y - rowExtendStartPoint.y;

        // Project drag onto row's direction
        const dragAlongRow = dx * dirX + dy * dirY;

        const newSeatCount = calculateNewSeatCount(
          rowExtendStartSeatCount,
          selectedRowElement.seatSpacing,
          dragAlongRow,
          activeRowHandle as 'left-end' | 'right-end'
        );

        // When extending from left, we need to adjust the row position
        if (activeRowHandle === 'left-end' && newSeatCount !== selectedRowElement.seatCount) {
          const seatDiff = selectedRowElement.seatCount - newSeatCount;
          const xOffset = seatDiff * selectedRowElement.seatSpacing * dirX;
          const yOffset = seatDiff * selectedRowElement.seatSpacing * dirY;

          updateElement(selectedRowElement.id, {
            seatCount: newSeatCount,
            x: selectedRowElement.x + xOffset,
            y: selectedRowElement.y + yOffset,
          });
        } else {
          updateElement(selectedRowElement.id, { seatCount: newSeatCount });
        }
        return;
      }

      // Handle row rotation
      if (isRotatingRow && selectedRowElement) {
        // Get actual row center from seat positions
        let centerX: number, centerY: number;
        if (selectedRowElement.seats && selectedRowElement.seats.length > 0) {
          const firstSeat = selectedRowElement.seats[0];
          const lastSeat = selectedRowElement.seats[selectedRowElement.seats.length - 1];
          centerX = selectedRowElement.x + (firstSeat.x + lastSeat.x) / 2;
          centerY = selectedRowElement.y + (firstSeat.y + lastSeat.y) / 2;
        } else {
          const rowWidth = (selectedRowElement.seatCount - 1) * selectedRowElement.seatSpacing;
          centerX = selectedRowElement.x + rowWidth / 2;
          centerY = selectedRowElement.y;
        }

        const currentAngle = calculateRotationAngle(
          { x: centerX, y: centerY },
          point
        );

        let newRotation = rowRotateStartRotation + (currentAngle - rowRotateStartAngle);

        // Snap to 15-degree increments if shift is held
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        // Normalize to 0-360
        newRotation = ((newRotation % 360) + 360) % 360;

        updateElement(selectedRowElement.id, { rotation: newRotation });
        return;
      }

      // Panning (requires dragStart)
      if (isPanning && dragStart) {
        const deltaX = (point.x - dragStart.x) * zoom;
        const deltaY = (point.y - dragStart.y) * zoom;
        setPan(panX + deltaX, panY + deltaY);
        return;
      }

      // Dragging selected elements
      if (isDraggingElements && lastDragPoint) {
        const deltaX = point.x - lastDragPoint.x;
        const deltaY = point.y - lastDragPoint.y;

        if (snapToGrid) {
          // Grid snapping - moves in grid increments
          const snappedDelta = {
            x: Math.round(deltaX / gridSize) * gridSize,
            y: Math.round(deltaY / gridSize) * gridSize,
          };
          if (snappedDelta.x !== 0 || snappedDelta.y !== 0) {
            moveElements(selectedIds, snappedDelta.x, snappedDelta.y);
            setLastDragPoint({
              x: lastDragPoint.x + snappedDelta.x,
              y: lastDragPoint.y + snappedDelta.y,
            });
          }
          setActiveSnapGuides([]);
        } else if (showSmartGuides && map && selectedIds.length > 0) {
          // Smart guides - free movement with visual alignment guides
          moveElements(selectedIds, deltaX, deltaY);
          setLastDragPoint(point);

          // Calculate and show guides using latest store state (not stale React state)
          const currentMap = useMapStore.getState().map;
          if (currentMap) {
            const movedElement = currentMap.elements.find((el) => selectedIds.includes(el.id));
            if (movedElement) {
              const draggingBounds = getElementBounds(movedElement);
              const otherBounds = currentMap.elements
                .filter((el) => !selectedIds.includes(el.id))
                .map(getElementBounds);
              const { guides } = calculateSnapGuides(
                draggingBounds,
                otherBounds,
                currentMap.width,
                currentMap.height
              );
              setActiveSnapGuides(guides);
            }
          }
        } else {
          // Free movement without any snapping
          moveElements(selectedIds, deltaX, deltaY);
          setLastDragPoint(point);
          setActiveSnapGuides([]);
        }
        return;
      }

      // Selection rectangle
      if (selectionRect && dragStart) {
        const width = point.x - dragStart.x;
        const height = point.y - dragStart.y;
        setSelectionRect({
          x: width >= 0 ? dragStart.x : point.x,
          y: height >= 0 ? dragStart.y : point.y,
          width: Math.abs(width),
          height: Math.abs(height),
        });
      }
    },
    [
      dragStart,
      getCanvasPoint,
      snapPoint,
      isPanning,
      isDraggingElements,
      lastDragPoint,
      zoom,
      panX,
      panY,
      setPan,
      moveElements,
      selectedIds,
      selectionRect,
      snapToGrid,
      gridSize,
      isResizing,
      activeResizeHandle,
      resizeStartBounds,
      resizeStartPoint,
      selectedResizableElement,
      updateElement,
      isDrawing,
      isRowDrawingTool,
      isAreaDrawingTool,
      isShapeBlockDrawingTool,
      isLineDrawingTool,
      isBoothDrawingTool,
      isTextDrawingTool,
      updateCursor,
      activeTool,
      isExtendingRow,
      activeRowHandle,
      rowExtendStartPoint,
      rowExtendStartSeatCount,
      selectedRowElement,
      isRotatingRow,
      rowRotateStartAngle,
      rowRotateStartRotation,
      textBoxStart,
    ]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handle mouse up
  /* eslint-disable react-hooks/exhaustive-deps -- Complex drawing handler, deps are intentionally curated for performance */
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const point = getCanvasPoint(e);
      const snappedPoint = snapPoint(point);

      // Finish text box drawing
      if (textBoxStart && textBoxCurrent && activeTool === 'text') {
        const width = Math.abs(textBoxCurrent.x - textBoxStart.x);
        const height = Math.abs(textBoxCurrent.y - textBoxStart.y);

        // Only create if box is big enough
        if (width > 20 && height > 10) {
          const x = Math.min(textBoxStart.x, textBoxCurrent.x);
          const y = Math.min(textBoxStart.y, textBoxCurrent.y);
          // Create text at center of box
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          addElement(createText(centerX, centerY, 'Text', width, height));
        }

        setTextBoxStart(null);
        setTextBoxCurrent(null);
        return;
      }

      // Finish selection rectangle
      if (selectionRect && selectionRect.width > 5 && selectionRect.height > 5) {
        const selected = map?.elements
          .filter((el) => {
            const bounds = getElementBounds(el);
            return boundsIntersect(bounds, selectionRect);
          })
          .map((el) => el.id);

        if (selected && selected.length > 0) {
          selectElements(selected);
        }
      }

      // Finish shape drawing (rectArea, ellipseArea) on mouse up
      // Read isDrawing directly from store to avoid stale closure
      const currentlyDrawing = useDrawingStore.getState().isDrawing;
      if (currentlyDrawing && isShapeDrawingTool(activeTool)) {
        const elements = finishDrawing();
        elements.forEach((el) => addElement(el));
      }

      // Create new elements based on tool
      // Note: Row, area, shape, line, booth, and text drawing tools are handled separately
      // Also don't create new elements while editing text or just after finishing editing
      if (!isPanning && !isDraggingElements && !selectionRect && !isResizing && !editingTextId && !justFinishedEditingRef.current && !isRowDrawingTool(activeTool) && !isAreaDrawingTool(activeTool) && !isShapeBlockDrawingTool(activeTool) && !isLineDrawingTool(activeTool) && !isBoothDrawingTool(activeTool) && !isTextDrawingTool(activeTool)) {
        switch (activeTool) {
          case 'seat':
            addElement(createSeat(snappedPoint.x, snappedPoint.y, activeCategory));
            break;
          case 'stage':
            addElement(createStage(snappedPoint.x, snappedPoint.y, 300, 100));
            break;
          case 'table':
            addElement(createTable(snappedPoint.x, snappedPoint.y, 8, 'T1'));
            break;
          case 'roundTable':
            addElement(createRoundTable(snappedPoint.x, snappedPoint.y, 8, 'T1'));
            break;
          case 'rectTable':
            addElement(createRectTable(snappedPoint.x, snappedPoint.y, 6, 'T1'));
            break;
          case 'booth': {
            // Count existing booths to determine next number
            const existingBooths = map?.elements.filter(el => el.type === 'booth') || [];
            const nextBoothNumber = existingBooths.length + 1;
            addElement(createBooth(snappedPoint.x, snappedPoint.y, String(nextBoothNumber)));
            break;
          }
        }
      }

      // Reset states
      setDragStart(null);
      setSelectionRect(null);
      setIsPanning(false);
      setIsDraggingElements(false);
      setLastDragPoint(null);
      setActiveSnapGuides([]);
      setIsResizing(false);
      setActiveResizeHandle(null);
      setResizeStartBounds(null);
      setResizeStartPoint(null);
      // Reset row operation states
      setIsExtendingRow(false);
      setActiveRowHandle(null);
      setRowExtendStartPoint(null);
      setRowExtendStartSeatCount(0);
      setIsRotatingRow(false);
      setRowRotateStartAngle(0);
      setRowRotateStartRotation(0);

      // Clear the flag after mouseUp so future text elements can be created
      justFinishedEditingRef.current = false;
    },
    [
      getCanvasPoint,
      snapPoint,
      selectionRect,
      map,
      selectElements,
      isPanning,
      isDraggingElements,
      isResizing,
      activeTool,
      addElement,
      createSeat,
      createStage,
      createRectangle,
      createTable,
      createRoundTable,
      createRectTable,
      createBooth,
      createText,
      activeCategory,
      setIsPanning,
      isRowDrawingTool,
      isAreaDrawingTool,
      isShapeDrawingTool,
      isTextDrawingTool,
      isDrawing,
      finishDrawing,
      textBoxStart,
      textBoxCurrent,
    ]
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handle mouse leave - only reset states, don't create elements
  const handleMouseLeave = useCallback(() => {
    // Reset states without creating new elements
    setDragStart(null);
    setSelectionRect(null);
    setIsPanning(false);
    setIsDraggingElements(false);
    setLastDragPoint(null);
    setActiveSnapGuides([]);
    setIsResizing(false);
    setActiveResizeHandle(null);
    setResizeStartBounds(null);
    setResizeStartPoint(null);
    // Reset text box drawing
    setTextBoxStart(null);
    setTextBoxCurrent(null);
    // Reset row operation states
    setIsExtendingRow(false);
    setActiveRowHandle(null);
    setRowExtendStartPoint(null);
    setRowExtendStartSeatCount(0);
    setIsRotatingRow(false);
    setRowRotateStartAngle(0);
    setRowRotateStartRotation(0);
  }, [setIsPanning]);

  // Cancel drawing when tool changes
  useEffect(() => {
    if (isDrawing && !isRowDrawingTool(activeTool) && !isAreaDrawingTool(activeTool) && !isShapeBlockDrawingTool(activeTool) && !isLineDrawingTool(activeTool) && !isBoothDrawingTool(activeTool)) {
      cancelDrawing();
    }
  }, [activeTool, isDrawing, isRowDrawingTool, isAreaDrawingTool, isShapeBlockDrawingTool, isLineDrawingTool, isBoothDrawingTool, cancelDrawing]);

  // Render element based on type
  const renderElement = (element: MapElement) => {
    const isSelected = selectedIds.includes(element.id);

    switch (element.type) {
      case 'seat':
        return (
          <SeatRenderer
            key={element.id}
            seat={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'row':
        return (
          <RowRenderer
            key={element.id}
            row={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'section':
        return (
          <SectionRenderer
            key={element.id}
            section={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'stage':
        return (
          <StageRenderer
            key={element.id}
            stage={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'rectangle':
        return (
          <RectangleRenderer
            key={element.id}
            rectangle={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'table':
        return (
          <TableRenderer
            key={element.id}
            table={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'booth':
        return (
          <BoothRenderer
            key={element.id}
            booth={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'area':
        return (
          <AreaRenderer
            key={element.id}
            area={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'shape':
        return (
          <ShapeRenderer
            key={element.id}
            shape={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'line':
        return (
          <LineRenderer
            key={element.id}
            line={element}
            isSelected={isSelected}
            onSelect={() => selectElement(element.id)}
          />
        );
      case 'text':
        return (
          <TextRenderer
            key={element.id}
            textElement={element}
            isSelected={isSelected}
            isEditing={editingTextId === element.id}
            onSelect={() => selectElement(element.id)}
            onDoubleClick={() => startEditingText(element.id)}
          />
        );
      default:
        return null;
    }
  };

  // Get cursor based on tool and state (Figma-style)
  const getCursor = () => {
    if (isResizing) return 'default'; // Cursor is set by resize handle
    if (isPanning) return 'grabbing';
    if (isSpacePressed) return 'grab'; // Spacebar held = ready to pan
    if (isDraggingElements) return 'move';
    switch (activeTool) {
      case 'pan':
        return 'grab';
      case 'select':
        return 'default';
      default:
        return 'crosshair';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-gray-950 relative"
      style={{ cursor: getCursor() }}
    >
      <svg
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* Background */}
          <rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill={map?.backgroundColor || '#ffffff'}
          />

          {/* Background Image (for image import feature) */}
          {map?.backgroundImage?.visible && (
            <image
              href={map.backgroundImage.src}
              x={0}
              y={0}
              width={map.backgroundImage.width * map.backgroundImage.scale}
              height={map.backgroundImage.height * map.backgroundImage.scale}
              opacity={map.backgroundImage.opacity}
              style={{ pointerEvents: 'none' }}
              preserveAspectRatio="none"
            />
          )}

          {/* Grid */}
          {showGrid && <Grid gridSize={gridSize} />}

          {/* Elements - Below layer */}
          {belowElements.map(renderElement)}

          {/* Elements - Seats layer */}
          {seatElements.map(renderElement)}

          {/* Elements - Above layer */}
          {aboveElements.map(renderElement)}

          {/* Snap guides */}
          {activeSnapGuides.length > 0 && (
            <SnapGuides
              guides={activeSnapGuides}
              canvasWidth={map?.width}
              canvasHeight={map?.height}
            />
          )}

          {/* Row drawing preview - only for row tools */}
          {isDrawing && isRowDrawingTool(activeTool) && (
            <RowPreview
              startPoint={drawingStartPoint}
              currentPoint={drawingCurrentPoint}
              segmentStartPoint={segmentStartPoint}
              previewSeats={previewSeats}
              previewRows={previewRows}
              angle={previewAngle}
              seatRadius={drawingSeatRadius}
              zoom={zoom}
            />
          )}

          {/* Area preview while drawing */}
          {isDrawing && isAreaDrawingTool(activeTool) && (
            <AreaPreview
              previewArea={previewArea}
              zoom={zoom}
            />
          )}

          {/* Shape preview while drawing */}
          {isDrawing && isShapeBlockDrawingTool(activeTool) && (
            <ShapePreview
              previewShape={previewShape}
              zoom={zoom}
            />
          )}

          {/* Line preview while drawing */}
          {isDrawing && isLineDrawingTool(activeTool) && (
            <LinePreview
              previewLine={previewLine}
              zoom={zoom}
            />
          )}

          {/* Text box preview while drawing */}
          {textBoxStart && textBoxCurrent && (() => {
            const width = Math.abs(textBoxCurrent.x - textBoxStart.x);
            const height = Math.abs(textBoxCurrent.y - textBoxStart.y);
            const x = Math.min(textBoxStart.x, textBoxCurrent.x);
            const y = Math.min(textBoxStart.y, textBoxCurrent.y);
            if (width < 5 || height < 5) return null;
            return (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="rgba(255, 255, 255, 0.1)"
                  stroke="#ffffff"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                  rx={4 / zoom}
                />
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize={Math.max(12, Math.min(72, Math.round(height * 0.7)))}
                  fontFamily="sans-serif"
                >
                  Text
                </text>
              </g>
            );
          })()}

          {/* Booth preview while drawing */}
          {isDrawing && isBoothDrawingTool(activeTool) && previewBooths.length > 0 && (
            <g>
              {/* Draw line connecting booths */}
              {drawingAnchorPoints.length > 0 && drawingCurrentPoint && (
                <line
                  x1={drawingAnchorPoints[drawingAnchorPoints.length - 1].x}
                  y1={drawingAnchorPoints[drawingAnchorPoints.length - 1].y}
                  x2={drawingCurrentPoint.x}
                  y2={drawingCurrentPoint.y}
                  stroke="rgba(99, 102, 241, 0.3)"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                />
              )}
              {/* Render preview booths */}
              {previewBooths.map((booth, index) => (
                <g key={index}>
                  <rect
                    x={booth.x}
                    y={booth.y}
                    width={booth.width}
                    height={booth.height}
                    fill="rgba(99, 102, 241, 0.3)"
                    stroke="#6366f1"
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                    rx={4}
                  />
                  <text
                    x={booth.x + booth.width / 2}
                    y={booth.y + booth.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={14 / zoom}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {booth.label}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Selection rectangle */}
          {selectionRect && (
            <SelectionBox bounds={selectionRect} />
          )}

          {/* Resize handles for selected resizable element */}
          {selectedResizableElement && activeTool === 'select' && !isDraggingElements && (
            <ResizeHandles
              bounds={getElementBounds(selectedResizableElement)}
              onResizeStart={handleResizeStart}
              zoom={zoom}
            />
          )}

          {/* Selection outlines for multiple selected rows */}
          {selectedRowElements.length > 1 && activeTool === 'select' && !isDraggingElements && (
            selectedRowElements.map((row) => (
              <RowSelectionOutline key={row.id} row={row} zoom={zoom} />
            ))
          )}

          {/* Row manipulation handles for single selected row */}
          {selectedRowElement && activeTool === 'select' && !isDraggingElements && (
            <RowHandles
              row={selectedRowElement}
              zoom={zoom}
              onExtendStart={handleRowExtendStart}
              onRotateStart={handleRowRotateStart}
            />
          )}
        </g>
      </svg>

      {/* Text editor overlay */}
      {editingTextId && map && (() => {
        const textElement = map.elements.find(el => el.id === editingTextId && el.type === 'text');
        if (!textElement || textElement.type !== 'text') return null;
        return (
          <TextEditor
            textElement={textElement}
            zoom={zoom}
            panX={panX}
            panY={panY}
            onSave={(newText) => {
              justFinishedEditingRef.current = true;
              updateElement(editingTextId, { text: newText });
              stopEditingText();
            }}
            onCancel={() => {
              justFinishedEditingRef.current = true;
              stopEditingText();
            }}
          />
        );
      })()}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom(Math.min(5, zoom * 1.2))}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white text-lg font-bold"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(0.1, zoom / 1.2))}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white text-lg font-bold"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan(0, 0);
          }}
          className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white text-xs"
        >
          Reset
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
