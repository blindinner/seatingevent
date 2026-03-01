import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  MapElement,
  ViewState,
  ToolType,
  Bounds,
  HistoryEntry,
  SeatCategory,
  LayoutConfig,
} from '@/types/map';

const MAX_HISTORY_SIZE = 50;

// Alignment guide for smart snapping
export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number; // x for vertical, y for horizontal
  start: number; // start of the line
  end: number; // end of the line
}

interface EditorState {
  // View state
  zoom: number;
  panX: number;
  panY: number;

  // Tool state
  activeTool: ToolType;

  // Selection state
  selectedIds: string[];
  selectionBounds: Bounds | null;

  // Clipboard
  clipboard: MapElement[];
  clipboardSectionConfig: { config: LayoutConfig; name: string; sectionId?: string } | null;

  // Grid settings
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Smart alignment guides
  showSmartGuides: boolean;
  activeGuides: AlignmentGuide[];
  smartGuideThreshold: number; // Distance in pixels to trigger guide

  // Category settings
  activeCategory: SeatCategory;

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;

  // UI state
  isPanning: boolean;
  isDrawing: boolean;
  showPropertyPanel: boolean;
  showMinimap: boolean;

  // Text editing state
  editingTextId: string | null;
}

interface EditorActions {
  // View actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: (canvasWidth: number, canvasHeight: number, contentBounds: Bounds) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;

  // Tool actions
  setActiveTool: (tool: ToolType) => void;

  // Selection actions
  selectElement: (id: string, addToSelection?: boolean) => void;
  selectElements: (ids: string[]) => void;
  deselectAll: () => void;
  setSelectionBounds: (bounds: Bounds | null) => void;

  // Grid actions
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;

  // Smart guide actions
  toggleSmartGuides: () => void;
  setActiveGuides: (guides: AlignmentGuide[]) => void;
  clearActiveGuides: () => void;

  // Category actions
  setActiveCategory: (category: SeatCategory) => void;

  // History actions
  pushHistory: (elements: MapElement[]) => void;
  undo: () => MapElement[] | null;
  redo: () => MapElement[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // UI actions
  setIsPanning: (isPanning: boolean) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  togglePropertyPanel: () => void;
  toggleMinimap: () => void;

  // Clipboard actions
  copyToClipboard: (elements: MapElement[], sectionConfig?: { config: LayoutConfig; name: string; sectionId?: string } | null) => void;
  getClipboard: () => MapElement[];
  getClipboardSectionConfig: () => { config: LayoutConfig; name: string; sectionId?: string } | null;
  hasClipboard: () => boolean;

  // Text editing actions
  startEditingText: (id: string) => void;
  stopEditingText: () => void;
}

const initialState: EditorState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTool: 'select',
  selectedIds: [],
  selectionBounds: null,
  clipboard: [],
  clipboardSectionConfig: null,
  showGrid: false,
  snapToGrid: false,
  gridSize: 20,
  showSmartGuides: true,
  activeGuides: [],
  smartGuideThreshold: 5,
  activeCategory: 'general',
  history: [],
  historyIndex: -1,
  isPanning: false,
  isDrawing: false,
  showPropertyPanel: true,
  showMinimap: false,
  editingTextId: null,
};

export const useEditorStore = create<EditorState & EditorActions>()(
  (set, get) => ({
    ...initialState,

    // View actions
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

    zoomIn: () => {
      const { zoom } = get();
      set({ zoom: Math.min(5, zoom * 1.2) });
    },

    zoomOut: () => {
      const { zoom } = get();
      set({ zoom: Math.max(0.1, zoom / 1.2) });
    },

    fitToScreen: (canvasWidth, canvasHeight, contentBounds) => {
      if (contentBounds.width === 0 || contentBounds.height === 0) return;

      const padding = 50;
      const scaleX = (canvasWidth - padding * 2) / contentBounds.width;
      const scaleY = (canvasHeight - padding * 2) / contentBounds.height;
      const zoom = Math.min(scaleX, scaleY, 2);

      const panX = (canvasWidth - contentBounds.width * zoom) / 2 - contentBounds.x * zoom;
      const panY = (canvasHeight - contentBounds.height * zoom) / 2 - contentBounds.y * zoom;

      set({ zoom, panX, panY });
    },

    setPan: (x, y) => set({ panX: x, panY: y }),

    resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

    // Tool actions
    setActiveTool: (tool) => {
      set({ activeTool: tool });
      if (tool !== 'select') {
        set({ selectedIds: [], selectionBounds: null });
      }
    },

    // Selection actions
    selectElement: (id, addToSelection = false) => {
      const { selectedIds } = get();
      if (addToSelection) {
        if (selectedIds.includes(id)) {
          set({ selectedIds: selectedIds.filter((i) => i !== id) });
        } else {
          set({ selectedIds: [...selectedIds, id] });
        }
      } else {
        set({ selectedIds: [id] });
      }
    },

    selectElements: (ids) => set({ selectedIds: ids }),

    deselectAll: () => set({ selectedIds: [], selectionBounds: null }),

    setSelectionBounds: (bounds) => set({ selectionBounds: bounds }),

    // Grid actions
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

    toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

    setGridSize: (size) => set({ gridSize: size }),

    // Smart guide actions
    toggleSmartGuides: () => set((state) => ({ showSmartGuides: !state.showSmartGuides })),

    setActiveGuides: (guides) => set({ activeGuides: guides }),

    clearActiveGuides: () => set({ activeGuides: [] }),

    // Category actions
    setActiveCategory: (category) => set({ activeCategory: category }),

    // History actions
    pushHistory: (elements) => {
      const { history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        elements: JSON.parse(JSON.stringify(elements)),
        timestamp: Date.now(),
      });

      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        set({ historyIndex: newIndex });
        return JSON.parse(JSON.stringify(history[newIndex].elements));
      }
      return null;
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        set({ historyIndex: newIndex });
        return JSON.parse(JSON.stringify(history[newIndex].elements));
      }
      return null;
    },

    canUndo: () => {
      const { historyIndex } = get();
      return historyIndex > 0;
    },

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    clearHistory: () => set({ history: [], historyIndex: -1 }),

    // UI actions
    setIsPanning: (isPanning) => set({ isPanning }),

    setIsDrawing: (isDrawing) => set({ isDrawing }),

    togglePropertyPanel: () => set((state) => ({ showPropertyPanel: !state.showPropertyPanel })),

    toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

    // Clipboard actions
    copyToClipboard: (elements, sectionConfig = null) => {
      // Deep copy elements to clipboard, optionally with section config
      set({
        clipboard: JSON.parse(JSON.stringify(elements)),
        clipboardSectionConfig: sectionConfig ? JSON.parse(JSON.stringify(sectionConfig)) : null,
      });
    },

    getClipboard: () => {
      const { clipboard } = get();
      return JSON.parse(JSON.stringify(clipboard));
    },

    getClipboardSectionConfig: () => {
      const { clipboardSectionConfig } = get();
      return clipboardSectionConfig ? JSON.parse(JSON.stringify(clipboardSectionConfig)) : null;
    },

    hasClipboard: () => {
      const { clipboard } = get();
      return clipboard.length > 0;
    },

    // Text editing actions
    startEditingText: (id) => set({ editingTextId: id }),
    stopEditingText: () => set({ editingTextId: null }),
  })
);
