'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';
import { cn } from '@/lib/utils';
import type { ToolType, SeatCategory } from '@/types/map';

// SVG Icons for table types
function RoundTableIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="10" cy="10" r="5" />
      <circle cx="10" cy="3" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="15" cy="14" r="1.5" />
      <circle cx="10" cy="17" r="1.5" />
      <circle cx="5" cy="14" r="1.5" />
      <circle cx="5" cy="6" r="1.5" />
    </svg>
  );
}

function RectTableIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Rectangular table */}
      <rect x="4" y="7" width="12" height="6" rx="1" />
      {/* Top seats */}
      <circle cx="7" cy="4" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      {/* Bottom seats */}
      <circle cx="7" cy="16" r="1.5" />
      <circle cx="13" cy="16" r="1.5" />
    </svg>
  );
}

function BoothIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Booth square */}
      <rect x="3" y="3" width="14" height="14" rx="2" />
      {/* Booth number indicator */}
      <text
        x="10"
        y="12"
        fontSize="8"
        fill="currentColor"
        textAnchor="middle"
        stroke="none"
        fontWeight="bold"
      >
        B
      </text>
    </svg>
  );
}

function BoothSegmentedIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Multiple booths in a row */}
      <rect x="1" y="6" width="5" height="8" rx="1" />
      <rect x="7.5" y="6" width="5" height="8" rx="1" />
      <rect x="14" y="6" width="5" height="8" rx="1" />
      {/* Connecting line */}
      <line x1="6" y1="10" x2="7.5" y2="10" strokeDasharray="1 1" />
      <line x1="12.5" y1="10" x2="14" y2="10" strokeDasharray="1 1" />
    </svg>
  );
}

// Area tool icons
function RectAreaIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="14" height="10" rx="1" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

function EllipseAreaIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="10" cy="10" rx="7" ry="5" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

function PolyAreaIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="10,3 17,8 14,17 6,17 3,8" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

// Shape tool icons (solid blocks, no GA text)
function RectShapeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="14" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function EllipseShapeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="10" cy="10" rx="7" ry="5" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function PolyShapeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="10,3 17,8 14,17 6,17 3,8" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 17 L10 7 L17 12" />
      <circle cx="3" cy="17" r="1.5" fill="currentColor" />
      <circle cx="10" cy="7" r="1.5" fill="currentColor" />
      <circle cx="17" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

interface ToolButtonProps {
  tool: ToolType;
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors',
        isActive
          ? 'bg-primary-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      )}
      title={label}
    >
      <span className="text-lg flex items-center justify-center">{icon}</span>
      <span className="text-[10px] mt-0.5">{label}</span>
    </button>
  );
}

interface SubMenuItem {
  type: ToolType;
  icon: ReactNode;
  label: string;
}

interface ToolButtonWithSubmenuProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  subItems: SubMenuItem[];
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

function ToolButtonWithSubmenu({
  icon,
  label,
  isActive,
  subItems,
  activeTool,
  onSelectTool,
}: ToolButtonWithSubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find the currently active sub-item to show its icon
  const activeSubItem = subItems.find((item) => item.type === activeTool);
  const displayIcon = activeSubItem ? activeSubItem.icon : icon;
  const displayLabel = activeSubItem ? activeSubItem.label : label;
  // Get the current tool to select (either the active sub-item or the first item)
  const currentTool = activeSubItem ? activeSubItem.type : subItems[0].type;

  // Handle main button click - select the tool
  const handleMainClick = () => {
    onSelectTool(currentTool);
    setIsOpen(false);
  };

  // Handle dropdown arrow click - toggle submenu
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleMainClick}
        className={cn(
          'w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors relative',
          isActive
            ? 'bg-primary-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        )}
        title={label}
      >
        <span className="flex items-center justify-center">{displayIcon}</span>
        <span className="text-[10px] mt-0.5">{displayLabel}</span>
        {/* Submenu indicator - clickable to open menu */}
        <span
          onClick={handleDropdownClick}
          className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center text-[8px] opacity-60 hover:opacity-100 hover:bg-gray-600 rounded-br-lg cursor-pointer"
        >
          ▾
        </span>
      </button>

      {/* Submenu dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-[100] min-w-[140px]">
          {subItems.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onSelectTool(item.type);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                activeTool === item.type
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              )}
            >
              <span className="w-6 flex items-center justify-center">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryButtonProps {
  category: SeatCategory;
  color: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function CategoryButton({ color, label, isActive, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2',
        isActive
          ? 'bg-gray-700 ring-2 ring-primary-500'
          : 'bg-gray-800 hover:bg-gray-700'
      )}
      title={label}
    >
      <span
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}

// Table tool types for submenu
const TABLE_TOOLS: ToolType[] = ['roundTable', 'rectTable'];

// Booth tool types for submenu
const BOOTH_TOOLS: ToolType[] = ['booth', 'boothSegmented'];

// Area tool types for submenu
const AREA_TOOLS: ToolType[] = ['rectArea', 'ellipseArea', 'polyArea'];

// Shape tool types for submenu
const SHAPE_TOOLS: ToolType[] = ['rectangle', 'ellipse', 'polygon'];

export function Toolbar() {
  const { activeTool, setActiveTool, activeCategory, setActiveCategory, canUndo, canRedo, undo, redo } =
    useEditorStore();
  const { map, setElements } = useMapStore();

  const tools: { type: ToolType; icon: ReactNode; label: string }[] = [
    { type: 'select', icon: '⬚', label: 'Select' },
    { type: 'pan', icon: '✋', label: 'Pan' },
    { type: 'seat', icon: '◯', label: 'Seat' },
    { type: 'row', icon: '⋯', label: 'Row' },
    { type: 'section', icon: '▤', label: 'Section' },
    { type: 'stage', icon: '▬', label: 'Stage' },
    { type: 'text', icon: 'T', label: 'Text' },
    { type: 'line', icon: <LineIcon />, label: 'Line' },
  ];

  const tableSubItems: SubMenuItem[] = [
    { type: 'roundTable', icon: <RoundTableIcon />, label: 'Round' },
    { type: 'rectTable', icon: <RectTableIcon />, label: 'Rect' },
  ];

  const boothSubItems: SubMenuItem[] = [
    { type: 'booth', icon: <BoothIcon />, label: 'Single' },
    { type: 'boothSegmented', icon: <BoothSegmentedIcon />, label: 'Segmented' },
  ];

  const areaSubItems: SubMenuItem[] = [
    { type: 'rectArea', icon: <RectAreaIcon />, label: 'Rectangle' },
    { type: 'ellipseArea', icon: <EllipseAreaIcon />, label: 'Ellipse' },
    { type: 'polyArea', icon: <PolyAreaIcon />, label: 'Polygon' },
  ];

  const shapeSubItems: SubMenuItem[] = [
    { type: 'rectangle', icon: <RectShapeIcon />, label: 'Rectangle' },
    { type: 'ellipse', icon: <EllipseShapeIcon />, label: 'Ellipse' },
    { type: 'polygon', icon: <PolyShapeIcon />, label: 'Polygon' },
  ];

  const categories = map?.categories || [];

  const handleUndo = () => {
    const elements = undo();
    if (elements) {
      setElements(elements);
    }
  };

  const handleRedo = () => {
    const elements = redo();
    if (elements) {
      setElements(elements);
    }
  };

  const isTableToolActive = TABLE_TOOLS.includes(activeTool);
  const isBoothToolActive = BOOTH_TOOLS.includes(activeTool);
  const isAreaToolActive = AREA_TOOLS.includes(activeTool);
  const isShapeToolActive = SHAPE_TOOLS.includes(activeTool);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Tools Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tools
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => (
            <ToolButton
              key={tool.type}
              tool={tool.type}
              icon={tool.icon}
              label={tool.label}
              isActive={activeTool === tool.type}
              onClick={() => setActiveTool(tool.type)}
            />
          ))}
          {/* Table tool with submenu */}
          <ToolButtonWithSubmenu
            icon={<RoundTableIcon />}
            label="Table"
            isActive={isTableToolActive}
            subItems={tableSubItems}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
          {/* Booth tool with submenu */}
          <ToolButtonWithSubmenu
            icon={<BoothIcon />}
            label="Booth"
            isActive={isBoothToolActive}
            subItems={boothSubItems}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
          {/* Area tool with submenu */}
          <ToolButtonWithSubmenu
            icon={<RectAreaIcon />}
            label="Area"
            isActive={isAreaToolActive}
            subItems={areaSubItems}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
          {/* Shape tool with submenu */}
          <ToolButtonWithSubmenu
            icon={<RectShapeIcon />}
            label="Shape"
            isActive={isShapeToolActive}
            subItems={shapeSubItems}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          History
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo()}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              canUndo()
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            )}
          >
            ↶ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo()}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              canRedo()
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            )}
          >
            Redo ↷
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Seat Category
        </h3>
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <CategoryButton
              key={cat.id}
              category={cat.id}
              color={cat.color}
              label={cat.name}
              isActive={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 mt-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Tips
        </h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Scroll to zoom</li>
          <li>• Click to place elements</li>
          <li>• Drag to move selection</li>
          <li>• Shift+click to multi-select</li>
          <li>• Delete key to remove</li>
        </ul>
      </div>
    </div>
  );
}
