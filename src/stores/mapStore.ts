import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  MapData,
  MapElement,
  SeatElement,
  RowElement,
  SectionElement,
  StageElement,
  RectangleElement,
  TextElement,
  TableElement,
  BoothElement,
  CategoryConfig,
  SeatCategory,
  ElementLayer,
  LayoutConfig,
  Point,
  SeatLabelType,
  SeatDirection,
  BackgroundImage,
} from '@/types/map';
import { calculateBounds } from '@/lib/utils';

const defaultCategories: CategoryConfig[] = [
  { id: 'general', name: 'General Admission', color: '#3B82F6', price: 0 },
];

// Check if a row is segmented (seats don't follow a straight line)
function isSegmentedRow(row: RowElement): boolean {
  if (!row.seats || row.seats.length < 3) return false;

  const firstSeat = row.seats[0];
  const lastSeat = row.seats[row.seats.length - 1];

  // Calculate the expected direction from first to last
  const totalDx = lastSeat.x - firstSeat.x;
  const totalDy = lastSeat.y - firstSeat.y;
  const totalLength = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

  if (totalLength < 1) return false;

  const dirX = totalDx / totalLength;
  const dirY = totalDy / totalLength;

  // Check if intermediate seats deviate significantly from the line
  for (let i = 1; i < row.seats.length - 1; i++) {
    const seat = row.seats[i];
    const dx = seat.x - firstSeat.x;
    const dy = seat.y - firstSeat.y;

    // Project onto direction and perpendicular
    const alongLine = dx * dirX + dy * dirY;
    const perpendicular = Math.abs(dx * (-dirY) + dy * dirX);

    // If perpendicular distance is significant (more than 2 seat radii), it's segmented
    if (perpendicular > row.seatRadius * 2) {
      return true;
    }
  }

  return false;
}

// Helper function to generate seats for a row
function generateSeatsForRow(row: RowElement, newSeatCount: number): SeatElement[] {
  const { seatSpacing, seatRadius, category, label, startNumber = 1, numberingDirection = 'left-to-right', seatLabelType = '1' } = row;
  const curveAmount = row.curveAmount || 0;
  const isCurved = curveAmount > 0;

  // Check if this is a segmented row
  const segmented = isSegmentedRow(row);

  // For segmented rows with same seat count, preserve shape but scale for spacing
  if (segmented && row.seats && row.seats.length === newSeatCount) {
    // Calculate the old average spacing
    let totalDistance = 0;
    for (let i = 1; i < row.seats.length; i++) {
      const dx = row.seats[i].x - row.seats[i - 1].x;
      const dy = row.seats[i].y - row.seats[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    const oldSpacing = totalDistance / (row.seats.length - 1);
    const scale = seatSpacing / oldSpacing;

    // Scale positions from first seat
    const seats: SeatElement[] = [];
    const firstSeat = row.seats[0];

    for (let i = 0; i < newSeatCount; i++) {
      const oldSeat = row.seats[i];

      // Scale position relative to first seat
      const newX = i === 0 ? 0 : (oldSeat.x - firstSeat.x) * scale;
      const newY = i === 0 ? 0 : (oldSeat.y - firstSeat.y) * scale;

      // Calculate seat label
      let seatIndex: number;
      if (numberingDirection === 'right-to-left') {
        seatIndex = newSeatCount - 1 - i;
      } else if (numberingDirection === 'center-out') {
        const middle = Math.floor(newSeatCount / 2);
        if (i < middle) {
          seatIndex = middle - i;
        } else {
          seatIndex = i - middle + 1;
        }
      } else {
        seatIndex = i;
      }

      const seatNum = startNumber + seatIndex;
      let seatLabel: string;
      switch (seatLabelType) {
        case 'A': seatLabel = String.fromCharCode(64 + seatNum); break;
        case 'a': seatLabel = String.fromCharCode(96 + seatNum); break;
        case 'I': seatLabel = toRomanNumeral(seatNum); break;
        case 'i': seatLabel = toRomanNumeral(seatNum).toLowerCase(); break;
        default: seatLabel = `${seatNum}`;
      }

      seats.push({
        id: nanoid(),
        type: 'seat',
        x: newX,
        y: newY,
        rotation: 0,
        locked: false,
        visible: true,
        label: `${label}${seatLabel}`,
        category,
        status: 'available',
        radius: seatRadius,
      });
    }

    return seats;
  }

  // For non-segmented rows or when seat count changes, use standard generation
  const seats: SeatElement[] = [];

  // Calculate the row direction from existing seats (first to last)
  let baseAngle = 0;

  if (row.seats && row.seats.length >= 2) {
    const firstSeat = row.seats[0];
    const lastSeat = row.seats[row.seats.length - 1];
    const dx = lastSeat.x - firstSeat.x;
    const dy = lastSeat.y - firstSeat.y;
    baseAngle = Math.atan2(dy, dx);
  }

  const cosAngle = Math.cos(baseAngle);
  const sinAngle = Math.sin(baseAngle);

  // Generate positions in local coordinates
  const localPositions: { x: number; y: number }[] = [];

  if (isCurved && newSeatCount > 1) {
    const rowWidth = (newSeatCount - 1) * seatSpacing;
    const minRadius = rowWidth * 0.5;
    const maxRadius = rowWidth * 10;
    const curveRadius = maxRadius - (curveAmount / 100) * (maxRadius - minRadius);
    const angleSpan = rowWidth / curveRadius;
    const startAngle = -angleSpan / 2;
    const anglePerSeat = angleSpan / (newSeatCount - 1);

    for (let i = 0; i < newSeatCount; i++) {
      const seatAngle = startAngle + i * anglePerSeat;
      const localX = curveRadius * Math.sin(seatAngle) + rowWidth / 2;
      const localY = curveRadius * (1 - Math.cos(seatAngle));
      localPositions.push({ x: localX, y: localY });
    }
  } else {
    for (let i = 0; i < newSeatCount; i++) {
      localPositions.push({ x: i * seatSpacing, y: 0 });
    }
  }

  // Offset so first seat is at origin
  const offsetX = localPositions[0]?.x || 0;
  const offsetY = localPositions[0]?.y || 0;

  for (let i = 0; i < newSeatCount; i++) {
    let seatIndex: number;
    if (numberingDirection === 'right-to-left') {
      seatIndex = newSeatCount - 1 - i;
    } else if (numberingDirection === 'center-out') {
      const middle = Math.floor(newSeatCount / 2);
      if (i < middle) {
        seatIndex = middle - i;
      } else {
        seatIndex = i - middle + 1;
      }
    } else {
      seatIndex = i;
    }

    const seatNum = startNumber + seatIndex;
    let seatLabel: string;
    switch (seatLabelType) {
      case 'A': seatLabel = String.fromCharCode(64 + seatNum); break;
      case 'a': seatLabel = String.fromCharCode(96 + seatNum); break;
      case 'I': seatLabel = toRomanNumeral(seatNum); break;
      case 'i': seatLabel = toRomanNumeral(seatNum).toLowerCase(); break;
      default: seatLabel = `${seatNum}`;
    }

    const localX = localPositions[i].x - offsetX;
    const localY = localPositions[i].y - offsetY;
    const seatX = localX * cosAngle - localY * sinAngle;
    const seatY = localX * sinAngle + localY * cosAngle;

    seats.push({
      id: nanoid(),
      type: 'seat',
      x: seatX,
      y: seatY,
      rotation: 0,
      locked: false,
      visible: true,
      label: `${label}${seatLabel}`,
      category,
      status: 'available',
      radius: seatRadius,
    });
  }

  return seats;
}

// Helper function to convert number to Roman numeral
function toRomanNumeral(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  let result = '';
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

// Helper function to generate a seat label based on type and index
function generateSeatLabel(
  labelType: SeatLabelType,
  index: number,
  startAt: number,
  tableLabel: string
): string {
  const num = startAt + index;
  let seatLabel: string;
  switch (labelType) {
    case 'A': seatLabel = String.fromCharCode(64 + num); break;
    case 'a': seatLabel = String.fromCharCode(96 + num); break;
    case 'I': seatLabel = toRomanNumeral(num); break;
    case 'i': seatLabel = toRomanNumeral(num).toLowerCase(); break;
    default: seatLabel = `${num}`;
  }
  return `${tableLabel}-${seatLabel}`;
}

// Helper function to generate seats for a table
function generateSeatsForTable(table: TableElement): SeatElement[] {
  const {
    seatCount,
    openSpaces = 0,
    seatDirection = 'clockwise',
    seatLabelType = '1',
    seatStartAt = 1,
    category = 'regular',
    label,
    shape,
    width,
    height,
  } = table;

  const seats: SeatElement[] = [];
  const seatRadius = 12;
  const effectiveSeatCount = seatCount + openSpaces;

  if (shape === 'circle' || shape === 'oval') {
    // Round/oval table: arrange seats in a circle
    const tableRadius = width / 2;
    const seatDistance = tableRadius + 20;

    // Calculate which positions should be open spaces (evenly distributed)
    const openSpacePositions = new Set<number>();
    if (openSpaces > 0) {
      // Distribute open spaces evenly, starting from the back (position 0 is top)
      const spacing = effectiveSeatCount / openSpaces;
      for (let i = 0; i < openSpaces; i++) {
        // Start from half of effectiveSeatCount (bottom of table) and space evenly
        const pos = Math.round((effectiveSeatCount / 2) + (i * spacing)) % effectiveSeatCount;
        openSpacePositions.add(pos);
      }
    }

    let seatIndex = 0;
    for (let i = 0; i < effectiveSeatCount; i++) {
      // Skip this position if it's an open space
      if (openSpacePositions.has(i)) continue;

      // Calculate angle based on direction
      let angle: number;
      if (seatDirection === 'clockwise') {
        angle = (i / effectiveSeatCount) * Math.PI * 2 - Math.PI / 2;
      } else {
        angle = -(i / effectiveSeatCount) * Math.PI * 2 - Math.PI / 2;
      }

      const seatLabel = generateSeatLabel(seatLabelType, seatIndex, seatStartAt, label);
      seatIndex++;

      seats.push({
        id: nanoid(),
        type: 'seat',
        x: Math.cos(angle) * seatDistance,
        y: Math.sin(angle) * seatDistance,
        rotation: 0,
        locked: false,
        visible: true,
        label: seatLabel,
        category,
        status: 'available',
        radius: seatRadius,
      });
    }
  } else {
    // Rectangular table: seats distributed by side
    const tableWidth = width;
    const tableHeight = height;
    const seatOffset = 25;

    // Get per-side chair counts (fall back to distributing seatCount evenly on top/bottom)
    const chairsUp = table.chairsUp ?? Math.ceil(seatCount / 2);
    const chairsDown = table.chairsDown ?? Math.floor(seatCount / 2);
    const chairsLeft = table.chairsLeft ?? 0;
    const chairsRight = table.chairsRight ?? 0;

    let seatIndex = 0;

    // Helper to add a seat
    const addSeat = (x: number, y: number) => {
      const seatLabel = generateSeatLabel(seatLabelType, seatIndex, seatStartAt, label);
      seats.push({
        id: nanoid(),
        type: 'seat',
        x,
        y,
        rotation: 0,
        locked: false,
        visible: true,
        label: seatLabel,
        category,
        status: 'available',
        radius: seatRadius,
      });
      seatIndex++;
    };

    if (seatDirection === 'clockwise') {
      // Clockwise: Top (left to right) -> Right (top to bottom) -> Bottom (right to left) -> Left (bottom to top)

      // Top side
      if (chairsUp > 0) {
        const spacingTop = tableWidth / (chairsUp + 1);
        for (let i = 0; i < chairsUp; i++) {
          addSeat(-tableWidth / 2 + spacingTop * (i + 1), -tableHeight / 2 - seatOffset);
        }
      }

      // Right side
      if (chairsRight > 0) {
        const spacingRight = tableHeight / (chairsRight + 1);
        for (let i = 0; i < chairsRight; i++) {
          addSeat(tableWidth / 2 + seatOffset, -tableHeight / 2 + spacingRight * (i + 1));
        }
      }

      // Bottom side (right to left for clockwise)
      if (chairsDown > 0) {
        const spacingBottom = tableWidth / (chairsDown + 1);
        for (let i = chairsDown - 1; i >= 0; i--) {
          addSeat(-tableWidth / 2 + spacingBottom * (i + 1), tableHeight / 2 + seatOffset);
        }
      }

      // Left side (bottom to top for clockwise)
      if (chairsLeft > 0) {
        const spacingLeft = tableHeight / (chairsLeft + 1);
        for (let i = chairsLeft - 1; i >= 0; i--) {
          addSeat(-tableWidth / 2 - seatOffset, -tableHeight / 2 + spacingLeft * (i + 1));
        }
      }
    } else {
      // Counter-clockwise: Top (right to left) -> Left (top to bottom) -> Bottom (left to right) -> Right (bottom to top)

      // Top side (right to left)
      if (chairsUp > 0) {
        const spacingTop = tableWidth / (chairsUp + 1);
        for (let i = chairsUp - 1; i >= 0; i--) {
          addSeat(-tableWidth / 2 + spacingTop * (i + 1), -tableHeight / 2 - seatOffset);
        }
      }

      // Left side (top to bottom)
      if (chairsLeft > 0) {
        const spacingLeft = tableHeight / (chairsLeft + 1);
        for (let i = 0; i < chairsLeft; i++) {
          addSeat(-tableWidth / 2 - seatOffset, -tableHeight / 2 + spacingLeft * (i + 1));
        }
      }

      // Bottom side (left to right)
      if (chairsDown > 0) {
        const spacingBottom = tableWidth / (chairsDown + 1);
        for (let i = 0; i < chairsDown; i++) {
          addSeat(-tableWidth / 2 + spacingBottom * (i + 1), tableHeight / 2 + seatOffset);
        }
      }

      // Right side (bottom to top)
      if (chairsRight > 0) {
        const spacingRight = tableHeight / (chairsRight + 1);
        for (let i = chairsRight - 1; i >= 0; i--) {
          addSeat(tableWidth / 2 + seatOffset, -tableHeight / 2 + spacingRight * (i + 1));
        }
      }
    }
  }

  return seats;
}

// Helper function to calculate table radius based on seat count
function calculateTableRadius(seatCount: number, seatRadius: number = 12): number {
  // Minimum spacing between seat centers should be about 2.5x seat radius
  const minSeatSpacing = seatRadius * 2.5;
  // Circumference needed = seatCount * minSeatSpacing
  const circumference = seatCount * minSeatSpacing;
  // radius = circumference / (2 * PI)
  const tableRadius = circumference / (2 * Math.PI);
  // Minimum table radius
  return Math.max(tableRadius, 30);
}

interface MapState {
  map: MapData | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

interface MapActions {
  // Map lifecycle
  createNewMap: (name?: string) => void;
  loadMap: (map: MapData) => void;
  setMapName: (name: string) => void;
  setMapDescription: (description: string) => void;

  // Element CRUD
  addElement: (element: MapElement) => void;
  addElements: (elements: MapElement[]) => void;
  updateElement: (id: string, updates: Partial<MapElement>) => void;
  updateElements: (updates: { id: string; changes: Partial<MapElement> }[]) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => MapElement[];

  // Element helpers
  getElementById: (id: string) => MapElement | undefined;
  getElementsByIds: (ids: string[]) => MapElement[];

  // Seat helpers
  createSeat: (x: number, y: number, category: SeatCategory, label?: string) => SeatElement;
  createRow: (x: number, y: number, seatCount: number, category: SeatCategory, label?: string) => RowElement;
  createSection: (x: number, y: number, rowCount: number, seatsPerRow: number, category: SeatCategory, label?: string) => SectionElement;

  // Shape helpers
  createStage: (x: number, y: number, width: number, height: number) => StageElement;
  createRectangle: (x: number, y: number, width: number, height: number) => RectangleElement;
  createText: (x: number, y: number, text: string, width?: number, height?: number) => TextElement;
  createTable: (x: number, y: number, seatCount: number, label?: string) => TableElement;
  createRoundTable: (x: number, y: number, seatCount: number, label?: string) => TableElement;
  createRectTable: (x: number, y: number, seatCount: number, label?: string) => TableElement;
  createBooth: (x: number, y: number, boothNumber?: string) => BoothElement;

  // Bulk operations
  moveElements: (ids: string[], deltaX: number, deltaY: number) => void;
  rotateElements: (ids: string[], angle: number) => void;
  alignElements: (ids: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (ids: string[], direction: 'horizontal' | 'vertical') => void;

  // Categories
  updateCategory: (id: string, updates: Partial<CategoryConfig>) => void;
  addCategory: (category: CategoryConfig) => void;
  deleteCategory: (id: string) => void;
  getCategoryColor: (category: string) => string;

  // State management
  setElements: (elements: MapElement[]) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;

  // Utilities
  fixDuplicateSeatIds: () => number; // Returns count of fixed IDs

  // Generated elements management
  replaceGeneratedElements: (newElements: MapElement[]) => void;
  setElementLayer: (id: string, layer: ElementLayer) => void;
  setLayoutConfig: (config: LayoutConfig) => void;

  // Section management
  groupRowsIntoSection: (rowIds: string[], label?: string) => SectionElement | null;
  ungroupSection: (sectionId: string) => RowElement[];
  renameSection: (sectionId: string, label: string) => void;
  getSections: () => SectionElement[];

  // Background management
  setBackgroundColor: (color: string) => void;
  setLabelColor: (color: string) => void;
  setBackgroundImage: (image: BackgroundImage) => void;
  updateBackgroundImage: (updates: Partial<BackgroundImage>) => void;
  removeBackgroundImage: () => void;
}

const createDefaultMap = (name: string = 'Untitled Map'): MapData => ({
  id: nanoid(),
  name,
  elements: [],
  width: 2000,
  height: 1500,
  backgroundColor: '#ffffff',
  labelColor: '#374151',
  gridSize: 20,
  showGrid: true,
  snapToGrid: true,
  categories: defaultCategories,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useMapStore = create<MapState & MapActions>()((set, get) => ({
  map: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,

  // Map lifecycle
  createNewMap: (name) => {
    set({ map: createDefaultMap(name), isDirty: false });
  },

  loadMap: (map) => {
    set({ map, isDirty: false });
  },

  setMapName: (name) => {
    const { map } = get();
    if (map) {
      set({ map: { ...map, name, updatedAt: new Date().toISOString() }, isDirty: true });
    }
  },

  setMapDescription: (description) => {
    const { map } = get();
    if (map) {
      set({ map: { ...map, description, updatedAt: new Date().toISOString() }, isDirty: true });
    }
  },

  // Element CRUD
  addElement: (element) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          elements: [...map.elements, element],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  addElements: (elements) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          elements: [...map.elements, ...elements],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  updateElement: (id, updates) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          elements: map.elements.map((el) => {
            if (el.id !== id) return el;

            // Special handling for rows: regenerate seats when layout properties change
            if (el.type === 'row') {
              const row = el as RowElement;
              const rowUpdates = updates as Partial<RowElement>;

              // Check if any property that affects seat positions has changed
              const seatCountChanged = 'seatCount' in rowUpdates && rowUpdates.seatCount !== row.seatCount;
              const spacingChanged = 'seatSpacing' in rowUpdates && rowUpdates.seatSpacing !== row.seatSpacing;
              const curveChanged = 'curveAmount' in rowUpdates && rowUpdates.curveAmount !== row.curveAmount;

              if (seatCountChanged || spacingChanged || curveChanged) {
                // Merge updates first, then regenerate seats based on new state
                const updatedRow = { ...row, ...updates } as RowElement;
                const newSeatCount = updatedRow.seatCount;
                const newSeats = generateSeatsForRow(updatedRow, newSeatCount);
                return { ...updatedRow, seats: newSeats } as MapElement;
              }
            }

            // Special handling for tables: regenerate seats when relevant properties change
            if (el.type === 'table') {
              const table = el as TableElement;
              const tableUpdates = updates as Partial<TableElement>;

              // Properties that require seat regeneration
              const seatCountChanged = 'seatCount' in tableUpdates && tableUpdates.seatCount !== table.seatCount;
              const openSpacesChanged = 'openSpaces' in tableUpdates && tableUpdates.openSpaces !== table.openSpaces;
              const directionChanged = 'seatDirection' in tableUpdates && tableUpdates.seatDirection !== table.seatDirection;
              const labelTypeChanged = 'seatLabelType' in tableUpdates && tableUpdates.seatLabelType !== table.seatLabelType;
              const startAtChanged = 'seatStartAt' in tableUpdates && tableUpdates.seatStartAt !== table.seatStartAt;
              const categoryChanged = 'category' in tableUpdates && tableUpdates.category !== table.category;
              const labelChanged = 'label' in tableUpdates && tableUpdates.label !== table.label;
              const shapeChanged = 'shape' in tableUpdates && tableUpdates.shape !== table.shape;
              const widthChanged = 'width' in tableUpdates && tableUpdates.width !== table.width;
              const heightChanged = 'height' in tableUpdates && tableUpdates.height !== table.height;
              // Per-side chair counts for rectangular tables
              const chairsUpChanged = 'chairsUp' in tableUpdates && tableUpdates.chairsUp !== table.chairsUp;
              const chairsDownChanged = 'chairsDown' in tableUpdates && tableUpdates.chairsDown !== table.chairsDown;
              const chairsLeftChanged = 'chairsLeft' in tableUpdates && tableUpdates.chairsLeft !== table.chairsLeft;
              const chairsRightChanged = 'chairsRight' in tableUpdates && tableUpdates.chairsRight !== table.chairsRight;

              const needsRegeneration = seatCountChanged || openSpacesChanged || directionChanged ||
                labelTypeChanged || startAtChanged || categoryChanged || labelChanged ||
                shapeChanged || widthChanged || heightChanged ||
                chairsUpChanged || chairsDownChanged || chairsLeftChanged || chairsRightChanged;

              if (needsRegeneration) {
                // Merge updates first
                let updatedTable = { ...table, ...updates } as TableElement;

                // For rectangular tables, update seatCount based on per-side chairs
                if (updatedTable.shape === 'rectangle') {
                  const totalChairs = (updatedTable.chairsUp ?? 0) + (updatedTable.chairsDown ?? 0) +
                    (updatedTable.chairsLeft ?? 0) + (updatedTable.chairsRight ?? 0);
                  updatedTable = { ...updatedTable, seatCount: totalChairs };
                }

                // If automatic radius is enabled and seat count changed, recalculate table size
                if (updatedTable.automaticRadius && (seatCountChanged || 'automaticRadius' in tableUpdates)) {
                  const newRadius = calculateTableRadius(updatedTable.seatCount);
                  updatedTable = { ...updatedTable, width: newRadius * 2, height: newRadius * 2 };
                }

                // Regenerate seats
                const newSeats = generateSeatsForTable(updatedTable);
                return { ...updatedTable, seats: newSeats } as MapElement;
              }

              // Handle automatic radius toggle
              if ('automaticRadius' in tableUpdates && tableUpdates.automaticRadius) {
                const updatedTable = { ...table, ...updates } as TableElement;
                const newRadius = calculateTableRadius(updatedTable.seatCount);
                const newSeats = generateSeatsForTable({ ...updatedTable, width: newRadius * 2, height: newRadius * 2 });
                return { ...updatedTable, width: newRadius * 2, height: newRadius * 2, seats: newSeats } as MapElement;
              }
            }

            return { ...el, ...updates } as MapElement;
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  updateElements: (updates) => {
    const { map } = get();
    if (map) {
      const updateMap = new Map(updates.map((u) => [u.id, u.changes]));
      set({
        map: {
          ...map,
          elements: map.elements.map((el) => {
            const changes = updateMap.get(el.id);
            return changes ? ({ ...el, ...changes } as MapElement) : el;
          }),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  deleteElements: (ids) => {
    const { map } = get();
    if (map) {
      const idsSet = new Set(ids);
      set({
        map: {
          ...map,
          elements: map.elements.filter((el) => !idsSet.has(el.id)),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  duplicateElements: (ids) => {
    const { map } = get();
    if (!map) return [];

    const elements = map.elements.filter((el) => ids.includes(el.id));
    if (elements.length === 0) return [];

    // Calculate the bounding box of selected elements to determine offset
    const bounds = calculateBounds(elements);
    // Offset by the width of the selection + gap, so duplicates appear to the right
    const offsetX = bounds.width + 50;
    const offsetY = 0;

    const duplicates = elements.map((el) => {
      const duplicate = {
        ...JSON.parse(JSON.stringify(el)),
        id: nanoid(),
        x: el.x + offsetX,
        y: el.y + offsetY,
        isGenerated: false, // Mark as manual element so it won't be replaced
      };

      // Regenerate seat IDs for rows
      if (duplicate.type === 'row' && duplicate.seats) {
        duplicate.seats = duplicate.seats.map((seat: any) => ({
          ...seat,
          id: nanoid(),
          isGenerated: false,
        }));
      }

      // Regenerate IDs for sections (rows and their seats)
      if (duplicate.type === 'section' && duplicate.rows) {
        duplicate.rows = duplicate.rows.map((row: any) => ({
          ...row,
          id: nanoid(),
          seats: row.seats?.map((seat: any) => ({
            ...seat,
            id: nanoid(),
            isGenerated: false,
          })) || [],
        }));
      }

      // Regenerate seat IDs for tables
      if (duplicate.type === 'table' && duplicate.seats) {
        duplicate.seats = duplicate.seats.map((seat: any) => ({
          ...seat,
          id: nanoid(),
          isGenerated: false,
        }));
      }

      return duplicate;
    });

    // Check if we're duplicating multiple rows - if so, auto-group into a section
    const duplicatedRows = duplicates.filter((el) => el.type === 'row');
    const nonRowDuplicates = duplicates.filter((el) => el.type !== 'row');

    if (duplicatedRows.length > 1) {
      // Add all duplicates first
      set({
        map: {
          ...map,
          elements: [...map.elements, ...duplicates],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });

      // Then group the rows into a section
      const rowIds = duplicatedRows.map((r) => r.id);
      const existingSections = get().map?.elements.filter((el) => el.type === 'section') || [];
      const sectionName = `Section ${existingSections.length + 1}`;

      const section = get().groupRowsIntoSection(rowIds, sectionName);
      return section ? [section] : duplicates;
    } else {
      // Just duplicate normally
      set({
        map: {
          ...map,
          elements: [...map.elements, ...duplicates],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });

      return duplicates;
    }
  },

  // Element helpers
  getElementById: (id) => {
    const { map } = get();
    return map?.elements.find((el) => el.id === id);
  },

  getElementsByIds: (ids) => {
    const { map } = get();
    if (!map) return [];
    const idsSet = new Set(ids);
    return map.elements.filter((el) => idsSet.has(el.id));
  },

  // Seat helpers
  createSeat: (x, y, category, label) => ({
    id: nanoid(),
    type: 'seat' as const,
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    label: label || 'A1',
    category,
    status: 'available' as const,
    radius: 12,
  }),

  createRow: (x, y, seatCount, category, label) => {
    const seatSpacing = 30;
    const seatRadius = 12;
    const seats: SeatElement[] = [];

    for (let i = 0; i < seatCount; i++) {
      seats.push({
        id: nanoid(),
        type: 'seat',
        x: i * seatSpacing,
        y: 0,
        rotation: 0,
        locked: false,
        visible: true,
        label: `${label || 'A'}${i + 1}`,
        category,
        status: 'available',
        radius: seatRadius,
      });
    }

    return {
      id: nanoid(),
      type: 'row' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      seatCount,
      seatSpacing,
      seatRadius,
      seats,
      curved: false,
      label: label || 'A',
      numberingDirection: 'left-to-right' as const,
      startNumber: 1,
      category,
    };
  },

  createSection: (x, y, rowCount, seatsPerRow, category, label) => {
    const rowSpacing = 35;
    const rows: RowElement[] = [];

    for (let i = 0; i < rowCount; i++) {
      const rowLabel = String.fromCharCode(65 + i);
      rows.push({
        id: nanoid(),
        type: 'row',
        x: 0,
        y: i * rowSpacing,
        rotation: 0,
        locked: false,
        visible: true,
        seatCount: seatsPerRow,
        seatSpacing: 30,
        seatRadius: 12,
        seats: Array.from({ length: seatsPerRow }, (_, j) => ({
          id: nanoid(),
          type: 'seat' as const,
          x: j * 30,
          y: 0,
          rotation: 0,
          locked: false,
          visible: true,
          label: `${rowLabel}${j + 1}`,
          category,
          status: 'available' as const,
          radius: 12,
        })),
        curved: false,
        label: rowLabel,
        numberingDirection: 'left-to-right',
        startNumber: 1,
        category,
      });
    }

    return {
      id: nanoid(),
      type: 'section' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      rows,
      label: label || 'Section 1',
      rowSpacing,
      category,
    };
  },

  // Shape helpers
  createStage: (x, y, width, height) => ({
    id: nanoid(),
    type: 'stage' as const,
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    width,
    height,
    label: 'STAGE',
    shape: 'rectangle' as const,
    fill: '#374151',
  }),

  createRectangle: (x, y, width, height) => ({
    id: nanoid(),
    type: 'rectangle' as const,
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    width,
    height,
    fill: '#4B5563',
    stroke: '#6B7280',
    strokeWidth: 1,
    cornerRadius: 0,
  }),

  createText: (x, y, text, width = 100, height = 30) => ({
    id: nanoid(),
    type: 'text' as const,
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    text,
    fontSize: Math.max(12, Math.min(72, Math.round(height * 0.7))),
    fontFamily: 'sans-serif',
    fill: '#FFFFFF',
    align: 'center' as const,
    width,
    height,
  }),

  createTable: (x, y, seatCount, label) => {
    const tableRadius = 40;
    const seatRadius = 12;
    const seatDistance = tableRadius + 20;
    const seats: SeatElement[] = [];

    for (let i = 0; i < seatCount; i++) {
      const angle = (i / seatCount) * Math.PI * 2 - Math.PI / 2;
      seats.push({
        id: nanoid(),
        type: 'seat',
        x: Math.cos(angle) * seatDistance,
        y: Math.sin(angle) * seatDistance,
        rotation: 0,
        locked: false,
        visible: true,
        label: `${label || 'T1'}-${i + 1}`,
        category: 'general',
        status: 'available',
        radius: seatRadius,
      });
    }

    return {
      id: nanoid(),
      type: 'table' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      width: tableRadius * 2,
      height: tableRadius * 2,
      shape: 'circle' as const,
      seats,
      seatCount,
      label: label || 'Table 1',
      fill: '#4B5563',
      // New properties with defaults
      category: 'general' as const,
      openSpaces: 0,
      automaticRadius: true,
      sectionLabel: '',
      displayedLabel: '',
      labelVisible: true,
      seatLabelType: '1' as const,
      seatStartAt: 1,
      seatDirection: 'clockwise' as const,
      seatDisplayedType: 'Seat',
      bookingType: 'by-seat' as const,
    };
  },

  // Round table - seats arranged in a circle around a circular table
  createRoundTable: (x, y, seatCount, label) => {
    const tableRadius = 40;
    const seatRadius = 12;
    const seatDistance = tableRadius + 20;
    const seats: SeatElement[] = [];

    for (let i = 0; i < seatCount; i++) {
      const angle = (i / seatCount) * Math.PI * 2 - Math.PI / 2;
      seats.push({
        id: nanoid(),
        type: 'seat',
        x: Math.cos(angle) * seatDistance,
        y: Math.sin(angle) * seatDistance,
        rotation: 0,
        locked: false,
        visible: true,
        label: `${label || 'T1'}-${i + 1}`,
        category: 'general',
        status: 'available',
        radius: seatRadius,
      });
    }

    return {
      id: nanoid(),
      type: 'table' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      width: tableRadius * 2,
      height: tableRadius * 2,
      shape: 'circle' as const,
      seats,
      seatCount,
      label: label || 'Table 1',
      fill: '#4B5563',
      // New properties with defaults
      category: 'general' as const,
      openSpaces: 0,
      automaticRadius: true,
      sectionLabel: '',
      displayedLabel: '',
      labelVisible: true,
      seatLabelType: '1' as const,
      seatStartAt: 1,
      seatDirection: 'clockwise' as const,
      seatDisplayedType: 'Seat',
      bookingType: 'by-seat' as const,
    };
  },

  // Rectangular table - seats arranged along the sides
  createRectTable: (x, y, seatCount, label) => {
    const tableWidth = 120;
    const tableHeight = 36;

    // Default distribution: split evenly between top and bottom
    const chairsUp = Math.ceil(seatCount / 2);
    const chairsDown = Math.floor(seatCount / 2);

    // Create base table object for seat generation
    const baseTable: TableElement = {
      id: nanoid(),
      type: 'table' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      width: tableWidth,
      height: tableHeight,
      shape: 'rectangle' as const,
      seats: [],
      seatCount,
      label: label || 'Table 1',
      fill: '#4B5563',
      // New properties with defaults
      category: 'general' as const,
      openSpaces: 0,
      automaticRadius: false,
      sectionLabel: '',
      displayedLabel: '',
      labelVisible: true,
      // Per-side chair distribution
      chairsUp,
      chairsDown,
      chairsLeft: 0,
      chairsRight: 0,
      // Seat labeling
      seatLabelType: '1' as const,
      seatStartAt: 1,
      seatDirection: 'clockwise' as const,
      seatDisplayedType: 'Seat',
      bookingType: 'by-seat' as const,
    };

    // Generate seats using the helper function
    const seats = generateSeatsForTable(baseTable);

    return { ...baseTable, seats };
  },

  // Booth - square booth for conferences/exhibitions
  createBooth: (x, y, boothNumber) => {
    const boothWidth = 95;
    const boothHeight = 60;

    return {
      id: nanoid(),
      type: 'booth' as const,
      x,
      y,
      rotation: 0,
      locked: false,
      visible: true,
      width: boothWidth,
      height: boothHeight,
      label: boothNumber || '1',
      boothNumber: boothNumber || '1',
      fill: '#374151',
      stroke: '#6B7280',
      // New properties
      category: 'general' as const,
      scale: 1,
      sectionLabel: '',
      displayedLabel: '',
      entrance: '',
    };
  },

  // Bulk operations
  moveElements: (ids, deltaX, deltaY) => {
    const { map } = get();
    if (map) {
      const idsSet = new Set(ids);
      set({
        map: {
          ...map,
          elements: map.elements.map((el) =>
            idsSet.has(el.id) ? { ...el, x: el.x + deltaX, y: el.y + deltaY } : el
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  rotateElements: (ids, angle) => {
    const { map } = get();
    if (map) {
      const idsSet = new Set(ids);
      set({
        map: {
          ...map,
          elements: map.elements.map((el) =>
            idsSet.has(el.id) ? { ...el, rotation: (el.rotation + angle) % 360 } : el
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  alignElements: (ids, alignment) => {
    const { map } = get();
    if (!map || ids.length < 2) return;

    const elements = map.elements.filter((el) => ids.includes(el.id));
    let targetValue: number;

    switch (alignment) {
      case 'left':
        targetValue = Math.min(...elements.map((el) => el.x));
        break;
      case 'center':
        const minX = Math.min(...elements.map((el) => el.x));
        const maxX = Math.max(...elements.map((el) => el.x));
        targetValue = (minX + maxX) / 2;
        break;
      case 'right':
        targetValue = Math.max(...elements.map((el) => el.x));
        break;
      case 'top':
        targetValue = Math.min(...elements.map((el) => el.y));
        break;
      case 'middle':
        const minY = Math.min(...elements.map((el) => el.y));
        const maxY = Math.max(...elements.map((el) => el.y));
        targetValue = (minY + maxY) / 2;
        break;
      case 'bottom':
        targetValue = Math.max(...elements.map((el) => el.y));
        break;
    }

    const idsSet = new Set(ids);
    const isHorizontal = ['left', 'center', 'right'].includes(alignment);

    set({
      map: {
        ...map,
        elements: map.elements.map((el) => {
          if (!idsSet.has(el.id)) return el;
          return isHorizontal
            ? { ...el, x: targetValue }
            : { ...el, y: targetValue };
        }),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  distributeElements: (ids, direction) => {
    const { map } = get();
    if (!map || ids.length < 3) return;

    const elements = map.elements.filter((el) => ids.includes(el.id));
    const sorted = [...elements].sort((a, b) =>
      direction === 'horizontal' ? a.x - b.x : a.y - b.y
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpace = direction === 'horizontal'
      ? last.x - first.x
      : last.y - first.y;
    const spacing = totalSpace / (sorted.length - 1);

    const updates = sorted.map((el, i) => ({
      id: el.id,
      changes: direction === 'horizontal'
        ? { x: first.x + spacing * i }
        : { y: first.y + spacing * i },
    }));

    get().updateElements(updates as { id: string; changes: Partial<MapElement> }[]);
  },

  // Categories
  updateCategory: (id, updates) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          categories: map.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  addCategory: (category) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          categories: [...map.categories, category],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  deleteCategory: (id) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          categories: map.categories.filter((cat) => cat.id !== id),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  getCategoryColor: (category) => {
    const { map } = get();
    const cat = map?.categories.find((c) => c.id === category);
    return cat?.color || '#3B82F6';
  },

  // State management
  setElements: (elements) => {
    const { map } = get();
    if (map) {
      set({
        map: { ...map, elements, updatedAt: new Date().toISOString() },
        isDirty: true,
      });
    }
  },

  setIsDirty: (isDirty) => set({ isDirty }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setLastSaved: (date) => set({ lastSaved: date }),

  // Fix duplicate seat IDs by regenerating all seat IDs
  fixDuplicateSeatIds: () => {
    const { map } = get();
    if (!map) return 0;

    const seenIds = new Set<string>();
    let fixedCount = 0;

    const fixedElements = map.elements.map((el) => {
      if (el.type === 'row') {
        const row = el as RowElement;
        if (row.seats) {
          const fixedSeats = row.seats.map((seat) => {
            if (seenIds.has(seat.id)) {
              fixedCount++;
              return { ...seat, id: nanoid() };
            }
            seenIds.add(seat.id);
            return seat;
          });
          return { ...row, seats: fixedSeats };
        }
      }

      if (el.type === 'section') {
        const section = el as SectionElement;
        if (section.rows) {
          const fixedRows = section.rows.map((row) => {
            if (seenIds.has(row.id)) {
              fixedCount++;
              row = { ...row, id: nanoid() };
            } else {
              seenIds.add(row.id);
            }

            if (row.seats) {
              const fixedSeats = row.seats.map((seat) => {
                if (seenIds.has(seat.id)) {
                  fixedCount++;
                  return { ...seat, id: nanoid() };
                }
                seenIds.add(seat.id);
                return seat;
              });
              return { ...row, seats: fixedSeats };
            }
            return row;
          });
          return { ...section, rows: fixedRows };
        }
      }

      if (el.type === 'table') {
        const table = el as TableElement;
        if (table.seats) {
          const fixedSeats = table.seats.map((seat) => {
            if (seenIds.has(seat.id)) {
              fixedCount++;
              return { ...seat, id: nanoid() };
            }
            seenIds.add(seat.id);
            return seat;
          });
          return { ...table, seats: fixedSeats };
        }
      }

      return el;
    });

    if (fixedCount > 0) {
      set({
        map: { ...map, elements: fixedElements, updatedAt: new Date().toISOString() },
        isDirty: true,
      });
    }

    return fixedCount;
  },

  // Generated elements management
  replaceGeneratedElements: (newElements) => {
    const { map } = get();
    if (map) {
      // Keep elements that are NOT generated, replace generated ones with new elements
      const manualElements = map.elements.filter((el) => !el.isGenerated);
      set({
        map: {
          ...map,
          elements: [...newElements, ...manualElements],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  setElementLayer: (id, layer) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          elements: map.elements.map((el) =>
            el.id === id ? { ...el, layer } : el
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  setLayoutConfig: (config) => {
    const { map } = get();
    if (map) {
      set({
        map: {
          ...map,
          layoutConfig: config,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  // Section management
  groupRowsIntoSection: (rowIds, label) => {
    const { map } = get();
    if (!map || rowIds.length === 0) return null;

    // Get the rows to group
    const rowsToGroup = map.elements.filter(
      (el): el is RowElement => el.type === 'row' && rowIds.includes(el.id)
    );

    if (rowsToGroup.length === 0) return null;

    // Calculate section position (top-left of all rows)
    const bounds = calculateBounds(rowsToGroup);

    // Calculate average row spacing
    const sortedRows = [...rowsToGroup].sort((a, b) => a.y - b.y);
    let avgRowSpacing = 40; // default
    if (sortedRows.length > 1) {
      const spacings = sortedRows.slice(1).map((row, i) => row.y - sortedRows[i].y);
      avgRowSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    }

    // Get the most common category
    const categoryCounts = rowsToGroup.reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as SeatCategory || 'general';

    // Count existing sections for default naming
    const existingSections = map.elements.filter((el) => el.type === 'section');
    const defaultLabel = label || `Section ${existingSections.length + 1}`;

    // Create rows relative to section position
    const relativeRows: RowElement[] = sortedRows.map((row) => ({
      ...row,
      x: row.x - bounds.x,
      y: row.y - bounds.y,
    }));

    // Create the section
    const section: SectionElement = {
      id: nanoid(),
      type: 'section',
      x: bounds.x,
      y: bounds.y,
      rotation: 0,
      locked: false,
      visible: true,
      rows: relativeRows,
      label: defaultLabel,
      rowSpacing: avgRowSpacing,
      category: mostCommonCategory,
    };

    // Remove the individual rows and add the section
    const remainingElements = map.elements.filter((el) => !rowIds.includes(el.id));

    set({
      map: {
        ...map,
        elements: [...remainingElements, section],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });

    return section;
  },

  ungroupSection: (sectionId) => {
    const { map } = get();
    if (!map) return [];

    const section = map.elements.find(
      (el): el is SectionElement => el.type === 'section' && el.id === sectionId
    );

    if (!section) return [];

    // Convert relative row positions to absolute
    const absoluteRows: RowElement[] = section.rows.map((row) => ({
      ...row,
      id: nanoid(), // Generate new IDs
      x: row.x + section.x,
      y: row.y + section.y,
      isGenerated: false,
      seats: row.seats.map((seat) => ({
        ...seat,
        id: nanoid(),
        isGenerated: false,
      })),
    }));

    // Remove the section and add the individual rows
    const remainingElements = map.elements.filter((el) => el.id !== sectionId);

    set({
      map: {
        ...map,
        elements: [...remainingElements, ...absoluteRows],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });

    return absoluteRows;
  },

  renameSection: (sectionId, label) => {
    const { map } = get();
    if (!map) return;

    set({
      map: {
        ...map,
        elements: map.elements.map((el) =>
          el.id === sectionId && el.type === 'section'
            ? { ...el, label }
            : el
        ),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  getSections: () => {
    const { map } = get();
    if (!map) return [];
    return map.elements.filter((el): el is SectionElement => el.type === 'section');
  },

  // Background management
  setBackgroundColor: (color) => {
    const { map } = get();
    if (map) {
      set({
        map: { ...map, backgroundColor: color, updatedAt: new Date().toISOString() },
        isDirty: true,
      });
    }
  },

  setLabelColor: (color) => {
    const { map } = get();
    if (map) {
      set({
        map: { ...map, labelColor: color, updatedAt: new Date().toISOString() },
        isDirty: true,
      });
    }
  },

  setBackgroundImage: (image) => {
    const { map } = get();
    if (map) {
      set({
        map: { ...map, backgroundImage: image, updatedAt: new Date().toISOString() },
        isDirty: true,
      });
    }
  },

  updateBackgroundImage: (updates) => {
    const { map } = get();
    if (map && map.backgroundImage) {
      set({
        map: {
          ...map,
          backgroundImage: { ...map.backgroundImage, ...updates },
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      });
    }
  },

  removeBackgroundImage: () => {
    const { map } = get();
    if (map) {
      const { backgroundImage, ...rest } = map;
      set({
        map: { ...rest, updatedAt: new Date().toISOString() } as MapData,
        isDirty: true,
      });
    }
  },
}));
