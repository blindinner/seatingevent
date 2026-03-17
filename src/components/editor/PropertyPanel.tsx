'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useMapStore } from '@/stores/mapStore';
import { Input, Select, Slider, ColorPicker } from '@/components/ui';
import type { MapElement, SeatElement, RowElement, SectionElement, StageElement, RectangleElement, TextElement, TableElement, BoothElement, AreaElement, RowLabelPosition, SeatLabelType, TableBookingType, SeatDirection, BackgroundImage } from '@/types/map';
import { isSegmentedRow } from './RowHandles';

// Format price for display
function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return '—';
  if (price === 0) return 'Free';
  return `$${price}`;
}

function CategorySettings() {
  const { map, updateCategory, addCategory, deleteCategory } = useMapStore();
  const categories = map?.categories || [];

  // Handle price change - store the actual value
  const handlePriceChange = (categoryId: string, value: string) => {
    const price = parseFloat(value);
    if (isNaN(price) || value === '') {
      updateCategory(categoryId, { price: undefined });
    } else {
      updateCategory(categoryId, { price });
    }
  };

  // Get display price
  const getDisplayPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '';
    return price.toString();
  };

  const handleNameChange = (categoryId: string, value: string) => {
    updateCategory(categoryId, { name: value });
  };

  const handleColorChange = (categoryId: string, value: string) => {
    updateCategory(categoryId, { color: value });
  };

  const handleAddCategory = () => {
    const newId = `custom-${Date.now()}`;
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#8B5CF6', '#EC4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    addCategory({
      id: newId,
      name: 'New Category',
      color: randomColor,
      price: 0, // Default to free
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (categories.length > 1) {
      deleteCategory(categoryId);
    }
  };

  return (
    <div className="mb-4">
      <div className="mb-4 pb-4 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase">
          Pricing Categories
        </span>
        <button
          onClick={handleAddCategory}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          + Add
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Set ticket prices for each category. Seats inherit their category price.
      </p>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="p-3 bg-gray-800/50 rounded-lg space-y-2">
            {/* Category Name - Editable with Delete */}
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <input
                type="text"
                value={cat.name}
                onChange={(e) => handleNameChange(cat.id, e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white font-medium"
              />
              {categories.length > 1 && (
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                  title="Delete category"
                >
                  ×
                </button>
              )}
            </div>

            {/* Color and Price Row */}
            <div className="flex items-center gap-2">
              {/* Color Picker */}
              <div className="relative">
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => handleColorChange(cat.id, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                  style={{ backgroundColor: cat.color }}
                />
              </div>

              {/* Price Input */}
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={getDisplayPrice(cat.price)}
                  onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                />
              </div>
              <span className="text-xs text-gray-500 w-12 text-right">
                {cat.price === 0 || cat.price === undefined ? 'Free' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoSelection() {
  const { map, setBackgroundColor, setLabelColor, updateBackgroundImage, fixDuplicateSeatIds } = useMapStore();
  const [fixResult, setFixResult] = useState<string | null>(null);
  const backgroundImage = map?.backgroundImage;

  return (
    <div className="p-4">
      {/* Canvas Background Color */}
      <div className="mb-4">
        <div className="mb-4 pb-4 border-b border-gray-800">
          <span className="text-xs font-medium text-gray-500 uppercase">
            Canvas Settings
          </span>
        </div>

        {/* Background Color */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">Background</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={map?.backgroundColor || '#ffffff'}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setBackgroundColor('#ffffff')}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                White
              </button>
              <button
                onClick={() => setBackgroundColor('#1a1a2e')}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Label Color */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 mb-2">Label Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={map?.labelColor || '#374151'}
              onChange={(e) => setLabelColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setLabelColor('#374151')}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                Dark
              </button>
              <button
                onClick={() => setLabelColor('#ffffff')}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                White
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image Controls - Only when background exists */}
      {backgroundImage && (
        <div className="mb-4">
          <div className="mb-4 pb-4 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-500 uppercase">
              Background Image
            </span>
          </div>

          {/* Visibility toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={backgroundImage.visible}
                onChange={(e) => updateBackgroundImage({ visible: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-300">Visible</span>
            </label>
          </div>

          {/* Opacity slider */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-2">
              Opacity: {Math.round(backgroundImage.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={backgroundImage.opacity * 100}
              onChange={(e) => updateBackgroundImage({ opacity: Number(e.target.value) / 100 })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Image info */}
          <div className="text-xs text-gray-500">
            <p>Size: {backgroundImage.width} x {backgroundImage.height}</p>
            <p>Scale: {(backgroundImage.scale * 100).toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* Utilities section */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 uppercase">
            Utilities
          </span>
        </div>
        <button
          onClick={() => {
            const count = fixDuplicateSeatIds();
            if (count > 0) {
              setFixResult(`Fixed ${count} duplicate seat IDs`);
            } else {
              setFixResult('No duplicates found');
            }
            setTimeout(() => setFixResult(null), 3000);
          }}
          className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          Fix Duplicate Seat IDs
        </button>
        {fixResult && (
          <p className="mt-2 text-xs text-green-400">{fixResult}</p>
        )}
      </div>
    </div>
  );
}

type RowLabelType = 'letter' | 'number';

type BoothLabelType = 'number' | 'letter';

function MultipleSelection({ count, selectedElements }: { count: number; selectedElements: MapElement[] }) {
  const { map, alignElements, distributeElements, updateElement } = useMapStore();
  const { selectedIds } = useEditorStore();
  const categories = useMapStore((s) => s.map?.categories || []);
  const [startValue, setStartValue] = useState('A');
  const [labelDirection, setLabelDirection] = useState<'top-to-bottom' | 'bottom-to-top'>('top-to-bottom');
  const [rowLabelType, setRowLabelType] = useState<RowLabelType>('letter');

  // Booth-specific state
  const [boothLabelType, setBoothLabelType] = useState<BoothLabelType>('number');
  const [boothStartValue, setBoothStartValue] = useState('1');
  const [boothDirection, setBoothDirection] = useState<'left-to-right' | 'right-to-left'>('left-to-right');

  // Check if selection contains rows
  const selectedRows = selectedElements.filter((el): el is RowElement => el.type === 'row');
  const hasRows = selectedRows.length > 0;
  const totalSeatsInSelection = selectedRows.reduce((sum, row) => sum + row.seats.length, 0);

  // Check if selection contains booths
  const selectedBooths = selectedElements.filter((el): el is BoothElement => el.type === 'booth');
  const hasBooths = selectedBooths.length > 1; // Only show booth controls when 2+ booths selected

  // Generate seat label based on numbering direction and label type
  const generateSeatLabel = (
    rowLabel: string,
    seatIndex: number,
    totalSeats: number,
    direction: 'left-to-right' | 'right-to-left' | 'center-out',
    labelType: SeatLabelType = '1'
  ): string => {
    let seatNumber: number;
    switch (direction) {
      case 'left-to-right':
        seatNumber = seatIndex + 1;
        break;
      case 'right-to-left':
        seatNumber = totalSeats - seatIndex;
        break;
      case 'center-out':
        const center = Math.floor(totalSeats / 2);
        const offset = seatIndex - center;
        if (totalSeats % 2 === 0) {
          seatNumber = Math.abs(offset) + (offset < 0 ? 0 : 1);
        } else {
          seatNumber = Math.abs(offset) + 1;
        }
        break;
      default:
        seatNumber = seatIndex + 1;
    }

    // Format based on label type
    let seatLabel: string;
    switch (labelType) {
      case 'A':
        seatLabel = String.fromCharCode(64 + seatNumber);
        break;
      case 'a':
        seatLabel = String.fromCharCode(96 + seatNumber);
        break;
      case 'I':
        seatLabel = toRoman(seatNumber);
        break;
      case 'i':
        seatLabel = toRoman(seatNumber).toLowerCase();
        break;
      default:
        seatLabel = String(seatNumber);
    }

    return `${rowLabel}${seatLabel}`;
  };

  // Convert number to Roman numeral
  const toRoman = (num: number): string => {
    const romanNumerals: [number, string][] = [
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
  };

  // Generate row label from index (supports letters and numbers)
  const generateRowLabel = (index: number, startValue: string, labelType: RowLabelType): string => {
    if (labelType === 'number') {
      const startNum = parseInt(startValue, 10) || 1;
      return String(startNum + index);
    }
    // Letter mode
    const startCode = startValue.toUpperCase().charCodeAt(0);
    const effectiveIndex = startCode - 65 + index;
    if (effectiveIndex < 26) {
      return String.fromCharCode(65 + effectiveIndex);
    }
    const first = Math.floor(effectiveIndex / 26) - 1;
    const second = effectiveIndex % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  // Smart sort rows based on their arrangement (horizontal stacking vs vertical side-by-side)
  const smartSortRows = (rows: RowElement[]): RowElement[] => {
    if (rows.length < 2) return rows;

    // Calculate the spread in X and Y positions
    const xValues = rows.map(r => r.x);
    const yValues = rows.map(r => r.y);
    const xSpread = Math.max(...xValues) - Math.min(...xValues);
    const ySpread = Math.max(...yValues) - Math.min(...yValues);

    // If Y spread is greater, rows are stacked vertically (sort by Y)
    // If X spread is greater, rows are side by side (sort by X)
    if (ySpread >= xSpread) {
      // Primary sort by Y, secondary by X
      return [...rows].sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.x - b.x;
      });
    } else {
      // Primary sort by X, secondary by Y
      return [...rows].sort((a, b) => {
        const xDiff = a.x - b.x;
        if (Math.abs(xDiff) > 10) return xDiff;
        return a.y - b.y;
      });
    }
  };

  // Bulk relabel all selected rows with given parameters
  const relabelSelectedRowsWithParams = (
    value: string,
    direction: 'top-to-bottom' | 'bottom-to-top',
    type: RowLabelType
  ) => {
    if (!value) return;

    // Smart sort rows based on their arrangement
    const sortedRows = smartSortRows(selectedRows);

    // If bottom-to-top, reverse the order for labeling
    const rowsToLabel = direction === 'bottom-to-top' ? [...sortedRows].reverse() : sortedRows;

    rowsToLabel.forEach((row, index) => {
      const newLabel = generateRowLabel(index, value, type);
      const seatLabelType = row.seatLabelType ?? '1';
      const newSeats = row.seats.map((seat, seatIndex) => ({
        ...seat,
        label: generateSeatLabel(newLabel, seatIndex, row.seats.length, row.numberingDirection, seatLabelType),
      }));
      updateElement(row.id, { label: newLabel, seats: newSeats });
    });
  };

  // Change numbering direction for all selected rows
  const changeAllNumberingDirection = (direction: 'left-to-right' | 'right-to-left' | 'center-out') => {
    selectedRows.forEach((row) => {
      const labelType = row.seatLabelType ?? '1';
      const newSeats = row.seats.map((seat, seatIndex) => ({
        ...seat,
        label: generateSeatLabel(row.label, seatIndex, row.seats.length, direction, labelType),
      }));
      updateElement(row.id, { numberingDirection: direction, seats: newSeats });
    });
  };

  // Change seat label type for all selected rows
  const changeAllSeatLabelType = (labelType: SeatLabelType) => {
    selectedRows.forEach((row) => {
      const newSeats = row.seats.map((seat, seatIndex) => ({
        ...seat,
        label: generateSeatLabel(row.label, seatIndex, row.seats.length, row.numberingDirection, labelType),
      }));
      updateElement(row.id, { seatLabelType: labelType, seats: newSeats });
    });
  };

  // Change category for all selected rows
  const changeAllCategory = (category: SeatElement['category']) => {
    selectedRows.forEach((row) => {
      const newSeats = row.seats.map((seat) => ({ ...seat, category }));
      updateElement(row.id, { category, seats: newSeats });
    });
  };

  // Change seat spacing for all selected rows while preserving their center positions
  const changeAllSeatSpacing = (newSpacing: number) => {
    selectedRows.forEach((row) => {
      if (row.seats.length < 2) return;

      // Calculate current row center (in absolute coordinates)
      const seatXs = row.seats.map(s => row.x + s.x);
      const seatYs = row.seats.map(s => row.y + s.y);
      const oldCenterX = (Math.min(...seatXs) + Math.max(...seatXs)) / 2;
      const oldCenterY = (Math.min(...seatYs) + Math.max(...seatYs)) / 2;

      // Calculate current spacing to find scale factor
      const currentSpacing = row.seatSpacing || 30;
      const scale = newSpacing / currentSpacing;

      // Scale all seat positions relative to first seat (in local coordinates)
      const firstSeat = row.seats[0];
      const newSeats = row.seats.map((seat, i) => {
        if (i === 0) return seat;
        return {
          ...seat,
          x: (seat.x - firstSeat.x) * scale + firstSeat.x,
          y: (seat.y - firstSeat.y) * scale + firstSeat.y,
        };
      });

      // Calculate new row center after scaling
      const newSeatXs = newSeats.map(s => row.x + s.x);
      const newSeatYs = newSeats.map(s => row.y + s.y);
      const newCenterX = (Math.min(...newSeatXs) + Math.max(...newSeatXs)) / 2;
      const newCenterY = (Math.min(...newSeatYs) + Math.max(...newSeatYs)) / 2;

      // Calculate offset needed to restore original center
      const offsetX = oldCenterX - newCenterX;
      const offsetY = oldCenterY - newCenterY;

      // Apply offset to row position to keep center aligned
      updateElement(row.id, {
        x: row.x + offsetX,
        y: row.y + offsetY,
        seatSpacing: newSpacing,
        seats: newSeats
      });
    });
  };

  // Get average spacing from selected rows for initial slider value
  const averageSpacing = selectedRows.length > 0
    ? Math.round(selectedRows.reduce((sum, row) => sum + (row.seatSpacing || 30), 0) / selectedRows.length)
    : 30;

  // ========== BOOTH FUNCTIONS ==========

  // Smart sort booths based on their arrangement
  const smartSortBooths = (booths: BoothElement[]): BoothElement[] => {
    if (booths.length < 2) return booths;

    const xValues = booths.map(b => b.x);
    const yValues = booths.map(b => b.y);
    const xSpread = Math.max(...xValues) - Math.min(...xValues);
    const ySpread = Math.max(...yValues) - Math.min(...yValues);

    // If X spread is greater, booths are arranged horizontally
    if (xSpread >= ySpread) {
      return [...booths].sort((a, b) => {
        const xDiff = a.x - b.x;
        if (Math.abs(xDiff) > 10) return xDiff;
        return a.y - b.y;
      });
    } else {
      // Booths are arranged vertically
      return [...booths].sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.x - b.x;
      });
    }
  };

  // Generate booth label from index
  const generateBoothLabel = (index: number, startValue: string, labelType: BoothLabelType): string => {
    if (labelType === 'number') {
      const startNum = parseInt(startValue, 10) || 1;
      return String(startNum + index);
    }
    // Letter mode
    const startCode = startValue.toUpperCase().charCodeAt(0);
    const effectiveIndex = startCode - 65 + index;
    if (effectiveIndex < 26) {
      return String.fromCharCode(65 + effectiveIndex);
    }
    const first = Math.floor(effectiveIndex / 26) - 1;
    const second = effectiveIndex % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  // Relabel all selected booths
  const relabelBooths = (
    value: string,
    direction: 'left-to-right' | 'right-to-left',
    labelType: BoothLabelType
  ) => {
    if (!value) return;

    const sortedBooths = smartSortBooths(selectedBooths);
    const boothsToLabel = direction === 'right-to-left' ? [...sortedBooths].reverse() : sortedBooths;

    boothsToLabel.forEach((booth, index) => {
      const newLabel = generateBoothLabel(index, value, labelType);
      updateElement(booth.id, { label: newLabel, boothNumber: newLabel, displayedLabel: newLabel });
    });
  };

  // Change category for all selected booths
  const changeAllBoothCategory = (category: SeatElement['category']) => {
    selectedBooths.forEach((booth) => {
      updateElement(booth.id, { category });
    });
  };

  // Change section label for all selected booths
  const changeAllBoothSectionLabel = (sectionLabel: string) => {
    selectedBooths.forEach((booth) => {
      updateElement(booth.id, { sectionLabel });
    });
  };

  return (
    <div className="p-4">
      <p className="text-sm text-gray-400 mb-4">
        {count} elements selected
        {hasRows && <span className="text-gray-500"> ({selectedRows.length} rows, {totalSeatsInSelection} seats)</span>}
      </p>

      <div className="space-y-4">
        {/* Align/Distribute - always show first */}
        <div className="pb-4 border-b border-gray-800">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Align</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => alignElements(selectedIds, 'left')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Left
            </button>
            <button
              onClick={() => alignElements(selectedIds, 'center')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Center
            </button>
            <button
              onClick={() => alignElements(selectedIds, 'right')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Right
            </button>
            <button
              onClick={() => alignElements(selectedIds, 'top')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Top
            </button>
            <button
              onClick={() => alignElements(selectedIds, 'middle')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Middle
            </button>
            <button
              onClick={() => alignElements(selectedIds, 'bottom')}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
            >
              Bottom
            </button>
          </div>
          {count >= 3 && (
            <>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Distribute</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => distributeElements(selectedIds, 'horizontal')}
                  className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                >
                  Horizontal
                </button>
                <button
                  onClick={() => distributeElements(selectedIds, 'vertical')}
                  className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                >
                  Vertical
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bulk Row Options */}
        {hasRows && (
          <>
            {/* Row Labeling */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Row Labels
              </h4>
              <div className="space-y-3">
                {/* Label Type Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setRowLabelType('letter');
                      setStartValue('A');
                      relabelSelectedRowsWithParams('A', labelDirection, 'letter');
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      rowLabelType === 'letter'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    A, B, C...
                  </button>
                  <button
                    onClick={() => {
                      setRowLabelType('number');
                      setStartValue('1');
                      relabelSelectedRowsWithParams('1', labelDirection, 'number');
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      rowLabelType === 'number'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    1, 2, 3...
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">
                      {rowLabelType === 'letter' ? 'Start Letter' : 'Start Number'}
                    </label>
                    <input
                      type={rowLabelType === 'number' ? 'number' : 'text'}
                      value={startValue}
                      onChange={(e) => {
                        const newValue = rowLabelType === 'letter'
                          ? e.target.value.toUpperCase().slice(0, 2)
                          : e.target.value;
                        setStartValue(newValue);
                        if (newValue) {
                          relabelSelectedRowsWithParams(newValue, labelDirection, rowLabelType);
                        }
                      }}
                      maxLength={rowLabelType === 'letter' ? 2 : undefined}
                      min={rowLabelType === 'number' ? 1 : undefined}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      placeholder={rowLabelType === 'letter' ? 'A' : '1'}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Order</label>
                    <select
                      value={labelDirection}
                      onChange={(e) => {
                        const newDirection = e.target.value as 'top-to-bottom' | 'bottom-to-top';
                        setLabelDirection(newDirection);
                        relabelSelectedRowsWithParams(startValue, newDirection, rowLabelType);
                      }}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    >
                      <option value="top-to-bottom">{rowLabelType === 'letter' ? 'A' : '1'} at Top</option>
                      <option value="bottom-to-top">{rowLabelType === 'letter' ? 'A' : '1'} at Bottom</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Seat Numbering */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Seat Numbering
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Direction</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => changeAllNumberingDirection('left-to-right')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      L → R
                    </button>
                    <button
                      onClick={() => changeAllNumberingDirection('center-out')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      Center
                    </button>
                    <button
                      onClick={() => changeAllNumberingDirection('right-to-left')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      R ← L
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Label Format</label>
                  <div className="grid grid-cols-5 gap-1">
                    <button
                      onClick={() => changeAllSeatLabelType('1')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      1, 2
                    </button>
                    <button
                      onClick={() => changeAllSeatLabelType('A')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      A, B
                    </button>
                    <button
                      onClick={() => changeAllSeatLabelType('a')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      a, b
                    </button>
                    <button
                      onClick={() => changeAllSeatLabelType('I')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      I, II
                    </button>
                    <button
                      onClick={() => changeAllSeatLabelType('i')}
                      className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
                    >
                      i, ii
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Seat Spacing */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Seat Spacing (All Rows)
              </h4>
              <div className="space-y-2">
                <Slider
                  label={`Spacing: ${averageSpacing}px`}
                  min={20}
                  max={100}
                  value={averageSpacing}
                  onChange={(e) => changeAllSeatSpacing(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500">
                  Adjusts spacing for {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Category (All Seats)
              </h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => changeAllCategory(cat.id)}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className="text-gray-500">{formatPrice(cat.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bulk Booth Options */}
        {hasBooths && (
          <>
            {/* Category */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Category
              </h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => changeAllBoothCategory(cat.id)}
                    className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className="text-gray-500">{formatPrice(cat.price)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section labeling */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Section labeling
              </h4>
              <Input
                label="Section label"
                value={selectedBooths[0]?.sectionLabel || ''}
                onChange={(e) => changeAllBoothSectionLabel(e.target.value)}
                placeholder="e.g., Hall A"
              />
            </div>

            {/* Booth labeling */}
            <div className="pb-4 border-b border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Booth labeling
              </h4>
              <div className="space-y-3">
                {/* Label Type Toggle */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Labels</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setBoothLabelType('number');
                        setBoothStartValue('1');
                        relabelBooths('1', boothDirection, 'number');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        boothLabelType === 'number'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      1, 2, 3...
                    </button>
                    <button
                      onClick={() => {
                        setBoothLabelType('letter');
                        setBoothStartValue('A');
                        relabelBooths('A', boothDirection, 'letter');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        boothLabelType === 'letter'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      A, B, C...
                    </button>
                  </div>
                </div>

                {/* Start At */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-16">Start at</span>
                  <button
                    onClick={() => {
                      const newValue = boothLabelType === 'number'
                        ? String(Math.max(1, parseInt(boothStartValue, 10) - 1))
                        : String.fromCharCode(Math.max(65, boothStartValue.charCodeAt(0) - 1));
                      setBoothStartValue(newValue);
                      relabelBooths(newValue, boothDirection, boothLabelType);
                    }}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                  >
                    ‹
                  </button>
                  <span className="flex-1 text-center text-white">{boothStartValue}</span>
                  <button
                    onClick={() => {
                      const newValue = boothLabelType === 'number'
                        ? String(parseInt(boothStartValue, 10) + 1)
                        : String.fromCharCode(Math.min(90, boothStartValue.charCodeAt(0) + 1));
                      setBoothStartValue(newValue);
                      relabelBooths(newValue, boothDirection, boothLabelType);
                    }}
                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                  >
                    ›
                  </button>
                </div>

                {/* Direction */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 w-16">Direction</span>
                  <button
                    onClick={() => {
                      const newDirection = boothDirection === 'left-to-right' ? 'right-to-left' : 'left-to-right';
                      setBoothDirection(newDirection);
                      relabelBooths(boothStartValue, newDirection, boothLabelType);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white flex items-center justify-center gap-2"
                  >
                    {boothDirection === 'left-to-right' ? '→ Left to Right' : '← Right to Left'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function SeatProperties({ seat }: { seat: SeatElement }) {
  const { updateElement, getCategoryColor } = useMapStore();
  const categories = useMapStore((s) => s.map?.categories || []);

  return (
    <div className="space-y-4">
      <Input
        label="Label"
        value={seat.label}
        onChange={(e) => updateElement(seat.id, { label: e.target.value })}
      />
      <Select
        label="Category"
        value={seat.category}
        onChange={(e) => updateElement(seat.id, { category: e.target.value as SeatElement['category'] })}
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Slider
        label="Radius"
        min={8}
        max={24}
        value={seat.radius}
        onChange={(e) => updateElement(seat.id, { radius: Number(e.target.value) })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="X"
          type="number"
          value={seat.x}
          onChange={(e) => updateElement(seat.id, { x: Number(e.target.value) })}
        />
        <Input
          label="Y"
          type="number"
          value={seat.y}
          onChange={(e) => updateElement(seat.id, { y: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

function RowProperties({ row }: { row: RowElement }) {
  const { updateElement } = useMapStore();
  const categories = useMapStore((s) => s.map?.categories || []);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);

  const selectedSeat = selectedSeatIndex !== null ? row.seats[selectedSeatIndex] : null;

  const updateSeat = (seatIndex: number, updates: Partial<SeatElement>) => {
    const newSeats = row.seats.map((seat, i) =>
      i === seatIndex ? { ...seat, ...updates } : seat
    );
    updateElement(row.id, { seats: newSeats });
  };

  const updateAllSeats = (updates: Partial<SeatElement>) => {
    const newSeats = row.seats.map((seat) => ({ ...seat, ...updates }));
    updateElement(row.id, { seats: newSeats });
  };

  // Generate seat label based on numbering direction and label type
  const generateSeatLabel = (
    rowLabel: string,
    seatIndex: number,
    totalSeats: number,
    direction: 'left-to-right' | 'right-to-left' | 'center-out',
    labelType: SeatLabelType = '1'
  ): string => {
    let seatNumber: number;
    switch (direction) {
      case 'left-to-right':
        seatNumber = seatIndex + 1;
        break;
      case 'right-to-left':
        seatNumber = totalSeats - seatIndex;
        break;
      case 'center-out':
        const center = Math.floor(totalSeats / 2);
        const offset = seatIndex - center;
        if (totalSeats % 2 === 0) {
          seatNumber = Math.abs(offset) + (offset < 0 ? 0 : 1);
        } else {
          seatNumber = Math.abs(offset) + 1;
        }
        break;
      default:
        seatNumber = seatIndex + 1;
    }

    // Format based on label type
    let seatLabel: string;
    switch (labelType) {
      case 'A':
        seatLabel = String.fromCharCode(64 + seatNumber); // A, B, C...
        break;
      case 'a':
        seatLabel = String.fromCharCode(96 + seatNumber); // a, b, c...
        break;
      case 'I':
        seatLabel = toRoman(seatNumber); // I, II, III...
        break;
      case 'i':
        seatLabel = toRoman(seatNumber).toLowerCase(); // i, ii, iii...
        break;
      default:
        seatLabel = String(seatNumber); // 1, 2, 3...
    }

    return `${rowLabel}${seatLabel}`;
  };

  // Convert number to Roman numeral
  const toRoman = (num: number): string => {
    const romanNumerals: [number, string][] = [
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
  };

  // Check if this is a segmented row
  const segmented = isSegmentedRow(row);

  // Default values for new properties
  const curveAmount = row.curveAmount ?? 0;
  const rowLabelEnabled = row.rowLabelEnabled ?? true;
  const rowLabelPosition = row.rowLabelPosition ?? 'left';
  const rowDisplayedType = row.rowDisplayedType ?? 'Row';
  const seatLabelType = row.seatLabelType ?? '1';
  const seatDisplayedType = row.seatDisplayedType ?? 'Seat';
  const sectionLabel = row.sectionLabel ?? '';

  return (
    <div className="space-y-4">
      {/* Row Section */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Row</h4>
        <div className="space-y-3">
          {/* Hide seat count and curve for segmented rows */}
          {!segmented && (
            <>
              <Slider
                label="Number of seats"
                min={1}
                max={50}
                value={row.seatCount}
                onChange={(e) => updateElement(row.id, { seatCount: Number(e.target.value) })}
              />
              <Slider
                label="Curve"
                min={0}
                max={100}
                value={curveAmount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  updateElement(row.id, {
                    curveAmount: value,
                    curved: value > 0
                  });
                }}
              />
              <Slider
                label="Seat spacing"
                min={20}
                max={60}
                value={row.seatSpacing}
                onChange={(e) => updateElement(row.id, { seatSpacing: Number(e.target.value) })}
              />
            </>
          )}
          {segmented && (
            <p className="text-xs text-gray-500">
              Segmented row - seat count and curve cannot be modified
            </p>
          )}
        </div>
      </div>

      {/* Section Labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Section labeling</h4>
        <Input
          label="Section label"
          value={sectionLabel}
          onChange={(e) => updateElement(row.id, { sectionLabel: e.target.value })}
          placeholder="e.g., Orchestra, Balcony"
        />
      </div>

      {/* Row Labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Row labeling</h4>
        <div className="space-y-3">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Enabled</span>
            <button
              onClick={() => updateElement(row.id, { rowLabelEnabled: !rowLabelEnabled })}
              className={`w-10 h-6 rounded-full transition-colors ${
                rowLabelEnabled ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                  rowLabelEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {rowLabelEnabled && (
            <>
              <Input
                label="Label"
                value={row.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  const newSeats = row.seats.map((seat, index) => ({
                    ...seat,
                    label: generateSeatLabel(newLabel, index, row.seats.length, row.numberingDirection, seatLabelType),
                  }));
                  updateElement(row.id, { label: newLabel, seats: newSeats });
                }}
              />

              <Select
                label="Label position"
                value={rowLabelPosition === 'right' ? 'left' : rowLabelPosition}
                onChange={(e) => updateElement(row.id, { rowLabelPosition: e.target.value as RowLabelPosition })}
                options={[
                  { value: 'left', label: 'Beginning of row' },
                  { value: 'both', label: 'Both ends' },
                  { value: 'none', label: 'None' },
                ]}
              />

              <Input
                label="Displayed type"
                value={rowDisplayedType}
                onChange={(e) => updateElement(row.id, { rowDisplayedType: e.target.value })}
                placeholder="Row"
              />
            </>
          )}
        </div>
      </div>

      {/* Seat Labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Seat labeling</h4>
        <div className="space-y-3">
          <Select
            label="Labels"
            value={seatLabelType}
            onChange={(e) => {
              const newLabelType = e.target.value as SeatLabelType;
              const newSeats = row.seats.map((seat, index) => ({
                ...seat,
                label: generateSeatLabel(row.label, index, row.seats.length, row.numberingDirection, newLabelType),
              }));
              updateElement(row.id, { seatLabelType: newLabelType, seats: newSeats });
            }}
            options={[
              { value: '1', label: '1, 2, 3...' },
              { value: 'A', label: 'A, B, C...' },
              { value: 'a', label: 'a, b, c...' },
              { value: 'I', label: 'I, II, III...' },
              { value: 'i', label: 'i, ii, iii...' },
            ]}
          />
          <Select
            label="Numbering direction"
            value={row.numberingDirection}
            onChange={(e) => {
              const newDirection = e.target.value as RowElement['numberingDirection'];
              const newSeats = row.seats.map((seat, index) => ({
                ...seat,
                label: generateSeatLabel(row.label, index, row.seats.length, newDirection, seatLabelType),
              }));
              updateElement(row.id, { numberingDirection: newDirection, seats: newSeats });
            }}
            options={[
              { value: 'left-to-right', label: 'Left to Right' },
              { value: 'right-to-left', label: 'Right to Left' },
              { value: 'center-out', label: 'Center Out' },
            ]}
          />
          <Input
            label="Displayed type"
            value={seatDisplayedType}
            onChange={(e) => updateElement(row.id, { seatDisplayedType: e.target.value })}
            placeholder="Seat"
          />
        </div>
      </div>

      {/* Category */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                updateElement(row.id, { category: cat.id });
                updateAllSeats({ category: cat.id });
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                row.category === cat.id
                  ? 'bg-gray-700 ring-2 ring-indigo-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-gray-500">{formatPrice(cat.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seat Size */}
      <div className="border-t border-gray-800 pt-4">
        <Slider
          label="Seat Size"
          min={8}
          max={20}
          value={row.seatRadius}
          onChange={(e) => {
            const newRadius = Number(e.target.value);
            const newSeats = row.seats.map((seat) => ({
              ...seat,
              radius: newRadius,
            }));
            updateElement(row.id, { seatRadius: newRadius, seats: newSeats });
          }}
        />
      </div>

      {/* Seat List */}
      <div className="border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">
            Seats ({row.seats.length})
          </h4>
          {selectedSeatIndex !== null && (
            <button
              onClick={() => setSelectedSeatIndex(null)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Back to row
            </button>
          )}
        </div>

        {selectedSeat && selectedSeatIndex !== null ? (
          // Individual Seat Editing
          <div className="space-y-3 bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: categories.find(c => c.id === selectedSeat.category)?.color || '#3B82F6' }}
              />
              <span className="text-sm font-medium text-white">{selectedSeat.label}</span>
            </div>
            <Input
              label="Label"
              value={selectedSeat.label}
              onChange={(e) => updateSeat(selectedSeatIndex, { label: e.target.value })}
            />
            <Select
              label="Category"
              value={selectedSeat.category}
              onChange={(e) => updateSeat(selectedSeatIndex, { category: e.target.value as SeatElement['category'] })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Status"
              value={selectedSeat.status}
              onChange={(e) => updateSeat(selectedSeatIndex, { status: e.target.value as SeatElement['status'] })}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'sold', label: 'Sold' },
                { value: 'blocked', label: 'Blocked' },
              ]}
            />
          </div>
        ) : (
          // Seat Grid
          <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto">
            {row.seats.map((seat, index) => (
              <button
                key={seat.id}
                onClick={() => setSelectedSeatIndex(index)}
                className="w-full aspect-square rounded flex items-center justify-center text-[10px] font-medium hover:ring-2 hover:ring-indigo-500 transition-all"
                style={{
                  backgroundColor: categories.find(c => c.id === seat.category)?.color || '#3B82F6',
                  opacity: seat.status === 'blocked' ? 0.4 : 1,
                }}
                title={`${seat.label} - ${seat.status}`}
              >
                {seat.label.replace(row.label, '')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionProperties({ section }: { section: SectionElement }) {
  const { updateElement, renameSection, ungroupSection } = useMapStore();
  const { selectElements } = useEditorStore();
  const categories = useMapStore((s) => s.map?.categories || []);
  const [startLetter, setStartLetter] = useState('A');
  const [labelDirection, setLabelDirection] = useState<'top-to-bottom' | 'bottom-to-top'>('top-to-bottom');

  const totalSeats = section.rows.reduce((sum, row) => sum + row.seats.length, 0);

  // Generate seat label based on numbering direction
  const generateSeatLabel = (
    rowLabel: string,
    seatIndex: number,
    totalSeats: number,
    direction: 'left-to-right' | 'right-to-left' | 'center-out'
  ): string => {
    let seatNumber: number;
    switch (direction) {
      case 'left-to-right':
        seatNumber = seatIndex + 1;
        break;
      case 'right-to-left':
        seatNumber = totalSeats - seatIndex;
        break;
      case 'center-out':
        const center = Math.floor(totalSeats / 2);
        const offset = seatIndex - center;
        if (totalSeats % 2 === 0) {
          seatNumber = Math.abs(offset) + (offset < 0 ? 0 : 1);
        } else {
          seatNumber = Math.abs(offset) + 1;
        }
        break;
      default:
        seatNumber = seatIndex + 1;
    }
    return `${rowLabel}${seatNumber}`;
  };

  // Generate row label from index
  const generateRowLabel = (index: number, startChar: string): string => {
    const startCode = startChar.toUpperCase().charCodeAt(0);
    const effectiveIndex = startCode - 65 + index;
    if (effectiveIndex < 26) {
      return String.fromCharCode(65 + effectiveIndex);
    }
    const first = Math.floor(effectiveIndex / 26) - 1;
    const second = effectiveIndex % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
  };

  // Relabel all rows in the section
  const relabelSectionRows = () => {
    // Sort rows by Y position (relative to section)
    const sortedRows = [...section.rows].sort((a, b) => a.y - b.y);

    // If bottom-to-top, reverse the order for labeling
    const rowsToLabel = labelDirection === 'bottom-to-top' ? [...sortedRows].reverse() : sortedRows;

    const newRows = section.rows.map((row) => {
      const labelIndex = rowsToLabel.findIndex((r) => r.id === row.id);
      const newLabel = generateRowLabel(labelIndex, startLetter);
      const newSeats = row.seats.map((seat, seatIndex) => ({
        ...seat,
        label: generateSeatLabel(newLabel, seatIndex, row.seats.length, row.numberingDirection),
      }));
      return { ...row, label: newLabel, seats: newSeats };
    });

    updateElement(section.id, { rows: newRows });
  };

  // Change numbering direction for all rows
  const changeAllNumberingDirection = (direction: 'left-to-right' | 'right-to-left' | 'center-out') => {
    const newRows = section.rows.map((row) => {
      const newSeats = row.seats.map((seat, seatIndex) => ({
        ...seat,
        label: generateSeatLabel(row.label, seatIndex, row.seats.length, direction),
      }));
      return { ...row, numberingDirection: direction, seats: newSeats };
    });
    updateElement(section.id, { rows: newRows });
  };

  // Change category for all seats
  const changeAllCategory = (category: SeatElement['category']) => {
    const newRows = section.rows.map((row) => ({
      ...row,
      category,
      seats: row.seats.map((seat) => ({ ...seat, category })),
    }));
    updateElement(section.id, { rows: newRows, category });
  };

  // Handle ungroup
  const handleUngroup = () => {
    const rows = ungroupSection(section.id);
    if (rows.length > 0) {
      selectElements(rows.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Name */}
      <Input
        label="Section Name"
        value={section.label}
        onChange={(e) => renameSection(section.id, e.target.value)}
      />

      {/* Stats */}
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Rows</span>
          <span className="text-white">{section.rows.length}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-400">Total Seats</span>
          <span className="text-white">{totalSeats}</span>
        </div>
      </div>

      {/* Row Labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
          Row Labels
        </h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Start Letter</label>
              <input
                type="text"
                value={startLetter}
                onChange={(e) => setStartLetter(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                placeholder="A"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Direction</label>
              <select
                value={labelDirection}
                onChange={(e) => setLabelDirection(e.target.value as 'top-to-bottom' | 'bottom-to-top')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="top-to-bottom">A at Top</option>
                <option value="bottom-to-top">A at Bottom</option>
              </select>
            </div>
          </div>
          <button
            onClick={relabelSectionRows}
            className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
          >
            Relabel All Rows
          </button>
        </div>
      </div>

      {/* Seat Numbering */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
          Seat Numbering
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => changeAllNumberingDirection('left-to-right')}
            className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
          >
            L → R
          </button>
          <button
            onClick={() => changeAllNumberingDirection('center-out')}
            className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
          >
            Center
          </button>
          <button
            onClick={() => changeAllNumberingDirection('right-to-left')}
            className="px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white transition-colors"
          >
            R ← L
          </button>
        </div>
      </div>

      {/* Category */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
          Category (All Seats)
        </h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => changeAllCategory(cat.id)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                section.category === cat.id
                  ? 'bg-gray-700 ring-2 ring-indigo-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-gray-500">{formatPrice(cat.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ungroup */}
      <div className="border-t border-gray-800 pt-4">
        <button
          onClick={handleUngroup}
          className="w-full px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Ungroup Section
        </button>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Shortcut: Cmd+Shift+G
        </p>
      </div>
    </div>
  );
}

function StageProperties({ stage }: { stage: StageElement }) {
  const { updateElement } = useMapStore();

  return (
    <div className="space-y-4">
      <Input
        label="Label"
        value={stage.label}
        onChange={(e) => updateElement(stage.id, { label: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Width"
          type="number"
          value={stage.width}
          onChange={(e) => updateElement(stage.id, { width: Number(e.target.value) })}
        />
        <Input
          label="Height"
          type="number"
          value={stage.height}
          onChange={(e) => updateElement(stage.id, { height: Number(e.target.value) })}
        />
      </div>
      <Select
        label="Shape"
        value={stage.shape}
        onChange={(e) => updateElement(stage.id, { shape: e.target.value as StageElement['shape'] })}
        options={[
          { value: 'rectangle', label: 'Rectangle' },
          { value: 'rounded', label: 'Rounded' },
          { value: 'semicircle', label: 'Semicircle' },
        ]}
      />
      <ColorPicker
        label="Fill Color"
        value={stage.fill}
        onChange={(e) => updateElement(stage.id, { fill: e.target.value })}
      />
    </div>
  );
}

function RectangleProperties({ rectangle }: { rectangle: RectangleElement }) {
  const { updateElement } = useMapStore();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Width"
          type="number"
          value={rectangle.width}
          onChange={(e) => updateElement(rectangle.id, { width: Number(e.target.value) })}
        />
        <Input
          label="Height"
          type="number"
          value={rectangle.height}
          onChange={(e) => updateElement(rectangle.id, { height: Number(e.target.value) })}
        />
      </div>
      <ColorPicker
        label="Fill"
        value={rectangle.fill}
        onChange={(e) => updateElement(rectangle.id, { fill: e.target.value })}
      />
      <ColorPicker
        label="Stroke"
        value={rectangle.stroke}
        onChange={(e) => updateElement(rectangle.id, { stroke: e.target.value })}
      />
      <Slider
        label="Corner Radius"
        min={0}
        max={50}
        value={rectangle.cornerRadius}
        onChange={(e) => updateElement(rectangle.id, { cornerRadius: Number(e.target.value) })}
      />
    </div>
  );
}

function TextProperties({ textElement }: { textElement: TextElement }) {
  const { updateElement } = useMapStore();

  return (
    <div className="space-y-4">
      <Input
        label="Text"
        value={textElement.text}
        onChange={(e) => updateElement(textElement.id, { text: e.target.value })}
      />
      <Slider
        label="Font Size"
        min={10}
        max={72}
        value={textElement.fontSize}
        onChange={(e) => updateElement(textElement.id, { fontSize: Number(e.target.value) })}
      />
      <ColorPicker
        label="Color"
        value={textElement.fill}
        onChange={(e) => updateElement(textElement.id, { fill: e.target.value })}
      />
      <Select
        label="Align"
        value={textElement.align}
        onChange={(e) => updateElement(textElement.id, { align: e.target.value as TextElement['align'] })}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
    </div>
  );
}

// Helper to convert number to Roman numeral
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

// Helper to format start value based on label type
function formatStartValue(num: number, labelType: SeatLabelType): string {
  switch (labelType) {
    case 'A': return String.fromCharCode(64 + num);
    case 'a': return String.fromCharCode(96 + num);
    case 'I': return toRomanNumeral(num);
    case 'i': return toRomanNumeral(num).toLowerCase();
    default: return `${num}`;
  }
}

function TableProperties({ table }: { table: TableElement }) {
  const { updateElement } = useMapStore();
  const categories = useMapStore((s) => s.map?.categories || []);

  // Default values
  const openSpaces = table.openSpaces ?? 0;
  const automaticRadius = table.automaticRadius ?? true;
  const rotation = table.rotation ?? 0;
  const sectionLabel = table.sectionLabel ?? '';
  const displayedLabel = table.displayedLabel ?? table.label;
  const labelVisible = table.labelVisible ?? true;
  const seatLabelType = table.seatLabelType ?? '1';
  const seatStartAt = table.seatStartAt ?? 1;
  const seatDirection = table.seatDirection ?? 'clockwise';
  const seatDisplayedType = table.seatDisplayedType ?? 'Seat';
  const bookingType = table.bookingType ?? 'by-seat';
  const isRoundTable = table.shape === 'circle' || table.shape === 'oval';
  // Per-side chair counts for rectangular tables
  const chairsUp = table.chairsUp ?? Math.ceil(table.seatCount / 2);
  const chairsDown = table.chairsDown ?? Math.floor(table.seatCount / 2);
  const chairsLeft = table.chairsLeft ?? 0;
  const chairsRight = table.chairsRight ?? 0;

  return (
    <div className="space-y-4">
      {/* Category */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateElement(table.id, { category: cat.id })}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                table.category === cat.id
                  ? 'bg-gray-700 ring-2 ring-indigo-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-gray-500">{formatPrice(cat.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Round Table / Rectangular Table Settings */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
          {isRoundTable ? 'Round Table' : 'Rectangular Table'}
        </h4>
        <div className="space-y-3">
          {isRoundTable ? (
            <>
              {/* Round table: single chairs slider */}
              <Slider
                label="Chairs"
                min={2}
                max={12}
                value={table.seatCount}
                onChange={(e) => updateElement(table.id, { seatCount: Number(e.target.value) })}
              />
              <Slider
                label="Open spaces"
                min={0}
                max={table.seatCount - 1}
                value={openSpaces}
                onChange={(e) => updateElement(table.id, { openSpaces: Number(e.target.value) })}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Automatic radius</span>
                <button
                  onClick={() => updateElement(table.id, { automaticRadius: !automaticRadius })}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    automaticRadius ? 'bg-indigo-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                      automaticRadius ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {!automaticRadius && (
                <Slider
                  label="Radius"
                  min={30}
                  max={150}
                  value={table.width / 2}
                  onChange={(e) => {
                    const radius = Number(e.target.value);
                    updateElement(table.id, { width: radius * 2, height: radius * 2 });
                  }}
                />
              )}
            </>
          ) : (
            <>
              {/* Rectangular table: per-side chair controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 w-16">Up</span>
                <button
                  onClick={() => updateElement(table.id, { chairsUp: Math.max(0, chairsUp - 1) })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ‹
                </button>
                <span className="flex-1 text-center text-white">{chairsUp} chairs</span>
                <button
                  onClick={() => updateElement(table.id, { chairsUp: chairsUp + 1 })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ›
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 w-16">Down</span>
                <button
                  onClick={() => updateElement(table.id, { chairsDown: Math.max(0, chairsDown - 1) })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ‹
                </button>
                <span className="flex-1 text-center text-white">{chairsDown} chairs</span>
                <button
                  onClick={() => updateElement(table.id, { chairsDown: chairsDown + 1 })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ›
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 w-16">Left</span>
                <button
                  onClick={() => updateElement(table.id, { chairsLeft: Math.max(0, chairsLeft - 1) })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ‹
                </button>
                <span className="flex-1 text-center text-white">{chairsLeft} chairs</span>
                <button
                  onClick={() => updateElement(table.id, { chairsLeft: chairsLeft + 1 })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ›
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 w-16">Right</span>
                <button
                  onClick={() => updateElement(table.id, { chairsRight: Math.max(0, chairsRight - 1) })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ‹
                </button>
                <span className="flex-1 text-center text-white">{chairsRight} chairs</span>
                <button
                  onClick={() => updateElement(table.id, { chairsRight: chairsRight + 1 })}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
                >
                  ›
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Shape */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Shape</h4>
        <div className="space-y-3">
          {!isRoundTable && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Width</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateElement(table.id, { width: Math.max(40, table.width - 10) })}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                    >
                      ‹
                    </button>
                    <span className="text-white text-xs w-12 text-center">{table.width} pt</span>
                    <button
                      onClick={() => updateElement(table.id, { width: table.width + 10 })}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={40}
                  max={300}
                  value={table.width}
                  onChange={(e) => updateElement(table.id, { width: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Height</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateElement(table.id, { height: Math.max(20, table.height - 10) })}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                    >
                      ‹
                    </button>
                    <span className="text-white text-xs w-12 text-center">{table.height} pt</span>
                    <button
                      onClick={() => updateElement(table.id, { height: table.height + 10 })}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  value={table.height}
                  onChange={(e) => updateElement(table.id, { height: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-20">Rotation</span>
            <button
              onClick={() => updateElement(table.id, { rotation: Math.max(0, rotation - 15) })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-white">{rotation}°</span>
            <button
              onClick={() => updateElement(table.id, { rotation: (rotation + 15) % 360 })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ›
            </button>
          </div>
          <ColorPicker
            label="Fill"
            value={table.fill}
            onChange={(e) => updateElement(table.id, { fill: e.target.value })}
          />
        </div>
      </div>

      {/* Section labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Section labeling</h4>
        <Input
          label="Section label"
          value={sectionLabel}
          onChange={(e) => updateElement(table.id, { sectionLabel: e.target.value })}
          placeholder="e.g., VIP Area"
        />
      </div>

      {/* Table labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Table labeling</h4>
        <div className="space-y-3">
          <Input
            label="Label"
            value={table.label}
            onChange={(e) => updateElement(table.id, { label: e.target.value })}
          />
          <Input
            label="Displayed label"
            value={displayedLabel}
            onChange={(e) => updateElement(table.id, { displayedLabel: e.target.value })}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Visible</span>
            <button
              onClick={() => updateElement(table.id, { labelVisible: !labelVisible })}
              className={`w-10 h-6 rounded-full transition-colors ${
                labelVisible ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                  labelVisible ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Seat labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Seat labeling</h4>
        <div className="space-y-3">
          <Select
            label="Labels"
            value={seatLabelType}
            onChange={(e) => updateElement(table.id, { seatLabelType: e.target.value as SeatLabelType })}
            options={[
              { value: '1', label: '1, 2, 3...' },
              { value: 'A', label: 'A, B, C...' },
              { value: 'a', label: 'a, b, c...' },
              { value: 'I', label: 'I, II, III...' },
              { value: 'i', label: 'i, ii, iii...' },
            ]}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-20">Start at</span>
            <button
              onClick={() => updateElement(table.id, { seatStartAt: Math.max(1, seatStartAt - 1) })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-white">
              {formatStartValue(seatStartAt, seatLabelType)}
            </span>
            <button
              onClick={() => updateElement(table.id, { seatStartAt: seatStartAt + 1 })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-20">Direction</span>
            <button
              onClick={() => updateElement(table.id, {
                seatDirection: seatDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise'
              })}
              className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white flex items-center justify-center gap-2"
            >
              {seatDirection === 'clockwise' ? '↻ Clockwise' : '↺ Counter-clockwise'}
            </button>
          </div>
          <Input
            label="Displayed type"
            value={seatDisplayedType}
            onChange={(e) => updateElement(table.id, { seatDisplayedType: e.target.value })}
            placeholder="Seat"
          />
        </div>
      </div>

      {/* Miscellaneous */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Miscellaneous</h4>
        <div className="space-y-3">
          <Select
            label="Booking type"
            value={bookingType}
            onChange={(e) => updateElement(table.id, { bookingType: e.target.value as TableBookingType })}
            options={[
              { value: 'by-seat', label: 'Book by seat' },
              { value: 'by-table', label: 'Book by table' },
            ]}
          />
          <p className="text-xs text-gray-500">
            {bookingType === 'by-seat'
              ? 'Users select individual seats. The seats get booked, not the table.'
              : 'Users book the entire table at once.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function BoothProperties({ booth }: { booth: BoothElement }) {
  const { updateElement } = useMapStore();
  const categories = useMapStore((s) => s.map?.categories || []);

  // Default values
  const scale = booth.scale ?? 1;
  const sectionLabel = booth.sectionLabel ?? '';
  const displayedLabel = booth.displayedLabel ?? booth.label;
  const entrance = booth.entrance ?? '';

  return (
    <div className="space-y-4">
      {/* Category */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateElement(booth.id, { category: cat.id })}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                booth.category === cat.id
                  ? 'bg-gray-700 ring-2 ring-indigo-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-left">{cat.name}</span>
              <span className="text-gray-500">{formatPrice(cat.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shape */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Shape</h4>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Width</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateElement(booth.id, { width: Math.max(20, booth.width - 5) })}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                >
                  ‹
                </button>
                <span className="text-white text-xs w-12 text-center">{booth.width} pt</span>
                <button
                  onClick={() => updateElement(booth.id, { width: booth.width + 5 })}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                >
                  ›
                </button>
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={200}
              value={booth.width}
              onChange={(e) => updateElement(booth.id, { width: Number(e.target.value) })}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Height</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateElement(booth.id, { height: Math.max(20, booth.height - 5) })}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                >
                  ‹
                </button>
                <span className="text-white text-xs w-12 text-center">{booth.height} pt</span>
                <button
                  onClick={() => updateElement(booth.id, { height: booth.height + 5 })}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
                >
                  ›
                </button>
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={200}
              value={booth.height}
              onChange={(e) => updateElement(booth.id, { height: Number(e.target.value) })}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-20">Rotation</span>
            <button
              onClick={() => updateElement(booth.id, { rotation: Math.max(0, booth.rotation - 15) })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-white">{booth.rotation}°</span>
            <button
              onClick={() => updateElement(booth.id, { rotation: (booth.rotation + 15) % 360 })}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Transform */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Transform</h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Scale</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateElement(booth.id, { scale: Math.max(0.5, scale - 0.1) })}
                className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
              >
                ‹
              </button>
              <span className="text-white text-xs w-12 text-center">{scale.toFixed(1)}x</span>
              <button
                onClick={() => updateElement(booth.id, { scale: Math.min(2, scale + 0.1) })}
                className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
              >
                ›
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={scale}
            onChange={(e) => updateElement(booth.id, { scale: Number(e.target.value) })}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* Section labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Section labeling</h4>
        <Input
          label="Section label"
          value={sectionLabel}
          onChange={(e) => updateElement(booth.id, { sectionLabel: e.target.value })}
          placeholder="e.g., Hall A"
        />
      </div>

      {/* Booth labeling */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Booth labeling</h4>
        <div className="space-y-3">
          <Input
            label="Label"
            value={booth.label}
            onChange={(e) => updateElement(booth.id, { label: e.target.value })}
          />
          <Input
            label="Displayed label"
            value={displayedLabel}
            onChange={(e) => updateElement(booth.id, { displayedLabel: e.target.value })}
          />
        </div>
      </div>

      {/* Miscellaneous */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Miscellaneous</h4>
        <Input
          label="Entrance"
          value={entrance}
          onChange={(e) => updateElement(booth.id, { entrance: e.target.value })}
          placeholder="e.g., North, South"
        />
      </div>

      {/* Colors */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Colors</h4>
        <div className="space-y-3">
          <ColorPicker
            label="Fill"
            value={booth.fill}
            onChange={(e) => updateElement(booth.id, { fill: e.target.value })}
          />
          <ColorPicker
            label="Stroke"
            value={booth.stroke}
            onChange={(e) => updateElement(booth.id, { stroke: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function AreaProperties({ area }: { area: AreaElement }) {
  const { updateElement } = useMapStore();

  // Default values
  const displayedLabel = area.displayedLabel ?? area.label;

  return (
    <div className="space-y-4">
      {/* Labeling */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Labeling</h4>
        <div className="space-y-3">
          <Input
            label="Name (internal)"
            value={area.label}
            onChange={(e) => updateElement(area.id, { label: e.target.value })}
            placeholder="e.g., GA Floor"
          />
          <Input
            label="Display name"
            value={displayedLabel}
            onChange={(e) => updateElement(area.id, { displayedLabel: e.target.value })}
            placeholder="e.g., General Admission - Floor"
          />
        </div>
      </div>

      {/* Colors */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Colors</h4>
        <div className="space-y-3">
          <ColorPicker
            label="Fill"
            value={area.fill}
            onChange={(e) => updateElement(area.id, { fill: e.target.value })}
          />
          <ColorPicker
            label="Stroke"
            value={area.stroke}
            onChange={(e) => updateElement(area.id, { stroke: e.target.value })}
          />
          <Slider
            label="Stroke width"
            min={0}
            max={10}
            value={area.strokeWidth}
            onChange={(e) => updateElement(area.id, { strokeWidth: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

function ElementProperties({ element }: { element: MapElement }) {
  switch (element.type) {
    case 'seat':
      return <SeatProperties seat={element} />;
    case 'row':
      return <RowProperties row={element} />;
    case 'section':
      return <SectionProperties section={element} />;
    case 'stage':
      return <StageProperties stage={element} />;
    case 'rectangle':
      return <RectangleProperties rectangle={element} />;
    case 'text':
      return <TextProperties textElement={element} />;
    case 'table':
      return <TableProperties table={element} />;
    case 'booth':
      return <BoothProperties booth={element} />;
    case 'area':
      return <AreaProperties area={element} />;
    default:
      return <div className="p-4 text-sm text-gray-500">No properties available</div>;
  }
}

export function PropertyPanel() {
  const { selectedIds, showPropertyPanel } = useEditorStore();
  const { map, deleteElements, duplicateElements } = useMapStore();

  if (!showPropertyPanel) return null;

  const selectedElements = map?.elements.filter((el) => selectedIds.includes(el.id)) || [];

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">Properties</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedElements.length === 0 && <NoSelection />}
        {selectedElements.length === 1 && (
          <div className="p-4">
            <div className="mb-4 pb-4 border-b border-gray-800">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {selectedElements[0].type}
              </span>
            </div>
            <ElementProperties element={selectedElements[0]} />
          </div>
        )}
        {selectedElements.length > 1 && <MultipleSelection count={selectedElements.length} selectedElements={selectedElements} />}
      </div>

      {selectedElements.length > 0 && (
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => duplicateElements(selectedIds)}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white"
          >
            Duplicate
          </button>
          <button
            onClick={() => deleteElements(selectedIds)}
            className="w-full px-4 py-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-sm text-red-400"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
