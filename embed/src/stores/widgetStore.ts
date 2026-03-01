import { create } from 'zustand';
import type {
  EventData,
  MapData,
  SeatStatusInfo,
  SelectedSeat,
  WidgetConfig,
  SeatElement,
  MapElement,
} from '../types';

interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface WidgetState {
  // Config
  config: WidgetConfig | null;

  // Data
  event: EventData | null;
  map: MapData | null;
  seatStatuses: Record<string, SeatStatusInfo>;
  contentBounds: ContentBounds | null;

  // Selection
  selectedSeatIds: Set<string>;
  currentHoldId: string | null;
  holdExpiresAt: string | null;

  // View state
  zoom: number;
  panX: number;
  panY: number;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setConfig: (config: WidgetConfig) => void;
  setEventData: (event: EventData, map: MapData, seatStatuses: Record<string, SeatStatusInfo>) => void;
  updateSeatStatuses: (seatStatuses: Record<string, SeatStatusInfo>) => void;

  selectSeat: (seatId: string) => boolean;
  deselectSeat: (seatId: string) => void;
  clearSelection: () => void;

  setHold: (holdId: string, expiresAt: string) => void;
  clearHold: () => void;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Derived data helpers
  getSelectedSeats: () => SelectedSeat[];
  canSelectSeat: (seatId: string) => boolean;
  getSeatStatus: (seatId: string) => SeatStatusInfo;
}

// Calculate bounding box of all elements
function calculateContentBounds(elements: MapElement[]): ContentBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const processElement = (el: MapElement, offsetX = 0, offsetY = 0) => {
    const x = el.x + offsetX;
    const y = el.y + offsetY;

    // Get element dimensions based on type
    let width = 0;
    let height = 0;

    switch (el.type) {
      case 'seat':
        width = height = el.radius * 2;
        minX = Math.min(minX, x - el.radius);
        minY = Math.min(minY, y - el.radius);
        maxX = Math.max(maxX, x + el.radius);
        maxY = Math.max(maxY, y + el.radius);
        break;
      case 'row':
        // Process seats in row
        if (el.seats) {
          for (const seat of el.seats) {
            processElement(seat, x, y);
          }
        }
        break;
      case 'section':
        // Process rows in section
        if (el.rows) {
          for (const row of el.rows) {
            processElement(row, x, y);
          }
        }
        break;
      case 'table':
        width = el.width;
        height = el.height;
        minX = Math.min(minX, x - width / 2);
        minY = Math.min(minY, y - height / 2);
        maxX = Math.max(maxX, x + width / 2);
        maxY = Math.max(maxY, y + height / 2);
        // Also process seats
        if (el.seats) {
          for (const seat of el.seats) {
            processElement(seat, x, y);
          }
        }
        break;
      case 'stage':
      case 'rectangle':
      case 'bar':
        width = el.width;
        height = el.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        break;
      case 'circle':
      case 'pillar':
        const radius = el.radius;
        minX = Math.min(minX, x - radius);
        minY = Math.min(minY, y - radius);
        maxX = Math.max(maxX, x + radius);
        maxY = Math.max(maxY, y + radius);
        break;
      case 'booth':
        width = el.width * (el.scale || 1);
        height = el.height * (el.scale || 1);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        break;
      case 'text':
        // Approximate text bounds
        minX = Math.min(minX, x);
        minY = Math.min(minY, y - el.fontSize);
        maxX = Math.max(maxX, x + el.text.length * el.fontSize * 0.6);
        maxY = Math.max(maxY, y);
        break;
      case 'area':
      case 'shape':
        if (el.width && el.height) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + el.width);
          maxY = Math.max(maxY, y + el.height);
        } else if (el.points) {
          for (const pt of el.points) {
            minX = Math.min(minX, x + pt.x);
            minY = Math.min(minY, y + pt.y);
            maxX = Math.max(maxX, x + pt.x);
            maxY = Math.max(maxY, y + pt.y);
          }
        }
        break;
      case 'polygon':
      case 'line':
        if (el.points) {
          for (const pt of el.points) {
            minX = Math.min(minX, x + pt.x);
            minY = Math.min(minY, y + pt.y);
            maxX = Math.max(maxX, x + pt.x);
            maxY = Math.max(maxY, y + pt.y);
          }
        }
        break;
      case 'image':
        width = el.width;
        height = el.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        break;
    }
  };

  for (const el of elements) {
    if (el.visible !== false) {
      processElement(el);
    }
  }

  // Fallback if no elements
  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
  }

  // Add padding (10%)
  const padding = Math.max((maxX - minX), (maxY - minY)) * 0.1;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  // Initial state
  config: null,
  event: null,
  map: null,
  seatStatuses: {},
  contentBounds: null,
  selectedSeatIds: new Set(),
  currentHoldId: null,
  holdExpiresAt: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isLoading: true,
  error: null,

  // Actions
  setConfig: (config) => set({ config }),

  setEventData: (event, map, seatStatuses) => {
    const contentBounds = calculateContentBounds(map.elements);
    set({
      event,
      map,
      seatStatuses,
      contentBounds,
      isLoading: false,
      error: null,
    });
  },

  updateSeatStatuses: (seatStatuses) => {
    const state = get();

    // Keep our selections if they're still available or held by us
    const newSelectedIds = new Set<string>();
    for (const seatId of state.selectedSeatIds) {
      const status = seatStatuses[seatId];
      if (!status) continue;

      // Keep selection if available or held by our session
      if (status.status === 'available') {
        newSelectedIds.add(seatId);
      } else if (status.status === 'held' && status.holdId === state.currentHoldId) {
        newSelectedIds.add(seatId);
      }
    }

    set({
      seatStatuses,
      selectedSeatIds: newSelectedIds,
    });
  },

  selectSeat: (seatId) => {
    const state = get();

    // Check max seats
    const maxSeats = state.config?.maxSeats ?? 10;
    if (state.selectedSeatIds.size >= maxSeats) {
      return false;
    }

    // Check if seat is available
    if (!state.canSelectSeat(seatId)) {
      return false;
    }

    const newSelected = new Set(state.selectedSeatIds);
    newSelected.add(seatId);
    set({ selectedSeatIds: newSelected });

    // Trigger callback
    if (state.config?.onSelectionChange) {
      setTimeout(() => {
        const seats = get().getSelectedSeats();
        state.config!.onSelectionChange!(seats);
      }, 0);
    }

    return true;
  },

  deselectSeat: (seatId) => {
    const state = get();
    const newSelected = new Set(state.selectedSeatIds);
    newSelected.delete(seatId);
    set({ selectedSeatIds: newSelected });

    // Trigger callback
    if (state.config?.onSelectionChange) {
      setTimeout(() => {
        const seats = get().getSelectedSeats();
        state.config!.onSelectionChange!(seats);
      }, 0);
    }
  },

  clearSelection: () => {
    const state = get();
    set({ selectedSeatIds: new Set() });

    if (state.config?.onSelectionChange) {
      state.config.onSelectionChange([]);
    }
  },

  setHold: (holdId, expiresAt) =>
    set({
      currentHoldId: holdId,
      holdExpiresAt: expiresAt,
    }),

  clearHold: () =>
    set({
      currentHoldId: null,
      holdExpiresAt: null,
    }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  zoomIn: () => {
    const state = get();
    set({ zoom: Math.min(5, state.zoom * 1.2) });
  },

  zoomOut: () => {
    const state = get();
    set({ zoom: Math.max(0.1, state.zoom / 1.2) });
  },

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  // Derived data helpers
  getSelectedSeats: () => {
    const state = get();
    if (!state.map) return [];

    const seats: SelectedSeat[] = [];
    const seatMap = buildSeatMap(state.map.elements);

    // Get client's price overrides if provided
    const priceOverrides = state.config?.categoryPrices;

    for (const seatId of state.selectedSeatIds) {
      const seatInfo = seatMap.get(seatId);
      if (seatInfo) {
        const category = state.map.categories.find((c) => c.id === seatInfo.seat.category);

        // Price priority:
        // 1. Client's categoryPrices override (matched by category name)
        // 2. Our category price from the map
        // 3. Individual seat price
        let price = seatInfo.seat.price;
        if (category) {
          price = category.price ?? price;
          // Check for client's price override by category name
          if (priceOverrides && category.name in priceOverrides) {
            price = priceOverrides[category.name];
          }
        }

        seats.push({
          id: seatId,
          label: seatInfo.seat.label,
          category: seatInfo.seat.category,
          price,
          rowLabel: seatInfo.rowLabel,
          sectionLabel: seatInfo.sectionLabel,
        });
      }
    }

    return seats;
  },

  canSelectSeat: (seatId) => {
    const state = get();
    const status = state.seatStatuses[seatId];

    if (!status) return false;
    if (status.status === 'booked') return false;
    if (status.status === 'held' && status.holdId !== state.currentHoldId) return false;

    return true;
  },

  getSeatStatus: (seatId) => {
    const state = get();
    return state.seatStatuses[seatId] || { status: 'available' };
  },
}));

// Helper to build a map of seat ID -> seat info for quick lookup
interface SeatInfo {
  seat: SeatElement;
  rowLabel?: string;
  sectionLabel?: string;
}

function buildSeatMap(elements: MapElement[]): Map<string, SeatInfo> {
  const seatMap = new Map<string, SeatInfo>();

  for (const element of elements) {
    if (element.type === 'seat') {
      seatMap.set(element.id, { seat: element });
    } else if (element.type === 'row' && element.seats) {
      for (const seat of element.seats) {
        seatMap.set(seat.id, {
          seat,
          rowLabel: element.label,
        });
      }
    } else if (element.type === 'section' && element.rows) {
      for (const row of element.rows) {
        if (row.seats) {
          for (const seat of row.seats) {
            seatMap.set(seat.id, {
              seat,
              rowLabel: row.label,
              sectionLabel: element.label,
            });
          }
        }
      }
    } else if (element.type === 'table' && element.seats) {
      for (const seat of element.seats) {
        seatMap.set(seat.id, {
          seat,
          rowLabel: element.label,
        });
      }
    }
  }

  return seatMap;
}
