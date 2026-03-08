'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { nanoid } from 'nanoid';
import type { TicketTier, EventType } from '@/types/event';
import { EventTypeSelector } from '@/components/create/EventTypeSelector';
import { TicketTierEditor } from '@/components/create/TicketTierEditor';
import { SeatMapEditorModal } from '@/components/create/SeatMapEditorModal';
import { CurrencySelector } from '@/components/create/CurrencySelector';
import { useMapStore } from '@/stores/mapStore';
import { formatCurrency, formatCurrencyRange, getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currency';
import { getUser } from '@/lib/auth';
import { createMap, createExtendedEvent, uploadCoverImage } from '@/lib/supabase';
import { SimpleAuthModal } from '@/components/auth/SimpleAuthModal';
import { EventPreviewModal } from '@/components/create/EventPreviewModal';
import { useAuth } from '@/components/auth/AuthProvider';

// Helper to parse date string as local date (avoids timezone issues)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to format date as YYYY-MM-DD in local time
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calendar Picker Component
function CalendarPicker({
  value,
  onChange,
  isOpen,
  onClose,
  triggerRef,
  minDate,
}: {
  value: string;
  onChange: (date: string) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  minDate?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => parseLocalDate(value));
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setViewDate(parseLocalDate(value));
  }, [value]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const selectedDate = parseLocalDate(value);

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build calendar grid
  const days: { day: number; currentMonth: boolean; date: Date }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    days.push({ day, currentMonth: false, date: new Date(year, month - 1, day) });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ day, currentMonth: true, date: new Date(year, month, day) });
  }

  // Next month days to fill grid
  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day++) {
    days.push({ day, currentMonth: false, date: new Date(year, month + 1, day) });
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDate = (date: Date) => {
    onChange(formatLocalDate(date));
    onClose();
  };

  const isSelected = (date: Date) =>
    date.toDateString() === selectedDate.toDateString();

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  const minDateParsed = minDate ? parseLocalDate(minDate) : null;
  const isDisabled = (date: Date) => {
    if (!minDateParsed) return false;
    // Compare dates without time
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const minOnly = new Date(minDateParsed.getFullYear(), minDateParsed.getMonth(), minDateParsed.getDate());
    return dateOnly < minOnly;
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl p-4 min-w-[280px] animate-in"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-gray-900">
          {monthNames[month]}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="w-9 h-9 flex items-center justify-center text-[12px] font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((item, i) => {
          const disabled = isDisabled(item.date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => !disabled && selectDate(item.date)}
              disabled={disabled}
              className={`w-9 h-9 flex items-center justify-center text-[13px] rounded-full transition-colors ${
                disabled
                  ? 'text-gray-200 cursor-not-allowed'
                  : isSelected(item.date)
                  ? 'bg-gray-900 text-white font-medium'
                  : isToday(item.date)
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : item.currentMonth
                  ? 'text-gray-900 hover:bg-gray-100'
                  : 'text-gray-300'
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// Address suggestion type for new Places API
interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

// Address Autocomplete Component (using Places API New)
function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: { address: string; lat: number; lng: number }) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Update dropdown position
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width + 40, // Add some extra width
      });
    }
  }, [isOpen, suggestions]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions using Places API (New)
  const fetchSuggestions = async (input: string) => {
    if (!apiKey || !input.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['establishment', 'geocode'],
        }),
      });

      const data = await response.json();

      if (data.suggestions) {
        const formattedSuggestions: PlaceSuggestion[] = data.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            mainText: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
            secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
          }));
        setSuggestions(formattedSuggestions);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle suggestion select
  const handleSelect = async (suggestion: PlaceSuggestion) => {
    if (!apiKey) return;

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}?fields=formattedAddress,location`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
          },
        }
      );

      const data = await response.json();

      const address = data.formattedAddress || `${suggestion.mainText}, ${suggestion.secondaryText}`;
      const lat = data.location?.latitude || 0;
      const lng = data.location?.longitude || 0;

      onChange(address);
      onSelect({ address, lat, lng });
      setIsOpen(false);
      setSuggestions([]);
    } catch (error) {
      console.error('Error fetching place details:', error);
      // Fallback: use the suggestion text
      const address = `${suggestion.mainText}, ${suggestion.secondaryText}`;
      onChange(address);
      setIsOpen(false);
      setSuggestions([]);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder="Add venue or location"
        className="w-full text-[14px] text-white/90 placeholder:text-white/30 bg-transparent focus:outline-none"
      />

      {/* Suggestions dropdown - rendered via portal */}
      {isOpen && suggestions.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl py-2 max-h-[280px] overflow-y-auto animate-in"
          style={{ top: position.top, left: position.left, minWidth: position.width }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-start gap-3"
            >
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div>
                <p className="text-[13px] text-gray-900 font-medium">
                  {suggestion.mainText}
                </p>
                <p className="text-[12px] text-gray-500">
                  {suggestion.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Time Picker Component
function TimePicker({
  value,
  onChange,
  isOpen,
  onClose,
  triggerRef,
}: {
  value: string;
  onChange: (time: string) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 140, // Align to right edge
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl py-2 min-w-[140px] max-h-[280px] overflow-y-auto animate-in"
      style={{ top: position.top, left: position.left }}
    >
      {times.map((time) => (
        <button
          key={time}
          type="button"
          onClick={() => {
            onChange(time);
            onClose();
          }}
          className={`w-full px-4 py-2 text-left text-[13px] transition-colors ${
            value === time
              ? 'bg-gray-900 text-white font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {formatTime(time)}
        </button>
      ))}
    </div>,
    document.body
  );
}

// Price input component with local state to allow proper typing
function CategoryPriceInput({
  priceInCents,
  currencySymbol,
  onChange,
}: {
  priceInCents: number | undefined;
  currencySymbol: string;
  onChange: (cents: number) => void;
}) {
  const [localValue, setLocalValue] = useState(() =>
    priceInCents !== undefined ? (priceInCents / 100).toString() : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when external value changes (but not while focused)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(priceInCents !== undefined ? (priceInCents / 100).toString() : '');
    }
  }, [priceInCents, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);

    // Update store in real-time
    const dollars = parseFloat(value);
    if (!isNaN(dollars)) {
      onChange(Math.round(dollars * 100));
    } else if (value === '') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the value on blur
    const dollars = parseFloat(localValue);
    if (!isNaN(dollars)) {
      setLocalValue(dollars.toFixed(2));
      onChange(Math.round(dollars * 100));
    } else {
      setLocalValue('0.00');
      onChange(0);
    }
  };

  return (
    <div className="relative w-28">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-[13px]">
        {currencySymbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="0.00"
        className="w-full pl-6 pr-2 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-[13px] text-white text-right focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
  );
}

const themeColors = [
  { id: 'zinc', name: 'Zinc', bg: '#18181b' },
  { id: 'stone', name: 'Stone', bg: '#1c1917' },
  { id: 'slate', name: 'Slate', bg: '#0f172a' },
  { id: 'green', name: 'Green', bg: '#052e16' },
  { id: 'purple', name: 'Purple', bg: '#1e1b2e' },
  { id: 'wine', name: 'Wine', bg: '#1c1017' },
];

const themeFonts = [
  { id: 'default', name: 'Default', style: 'font-sans' },
  { id: 'serif', name: 'Serif', style: 'font-serif' },
  { id: 'mono', name: 'Mono', style: 'font-mono' },
];

function MapPreview({ map }: { map: import('@/types/map').MapData | null }) {
  if (!map || map.elements.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-white/30">
        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <span className="text-[12px]">No elements yet</span>
        <span className="text-[11px] text-white/20 mt-1">Click &quot;Edit map&quot; to design</span>
      </div>
    );
  }

  // Calculate bounds to fit the map
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const processElement = (el: import('@/types/map').MapElement) => {
    if (el.visible === false) return;
    const x = el.x;
    const y = el.y;

    if (el.type === 'seat') {
      const radius = el.radius || 12;
      minX = Math.min(minX, x - radius);
      minY = Math.min(minY, y - radius);
      maxX = Math.max(maxX, x + radius);
      maxY = Math.max(maxY, y + radius);
    } else if (el.type === 'row') {
      for (const seat of el.seats || []) {
        const seatX = x + seat.x;
        const seatY = y + seat.y;
        const radius = seat.radius || 12;
        minX = Math.min(minX, seatX - radius);
        minY = Math.min(minY, seatY - radius);
        maxX = Math.max(maxX, seatX + radius);
        maxY = Math.max(maxY, seatY + radius);
      }
    } else if (el.type === 'section') {
      for (const row of el.rows || []) {
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
      const w = el.width || 80;
      const h = el.height || 80;
      minX = Math.min(minX, x - w / 2 - 30);
      minY = Math.min(minY, y - h / 2 - 30);
      maxX = Math.max(maxX, x + w / 2 + 30);
      maxY = Math.max(maxY, y + h / 2 + 30);
    } else if (el.type === 'booth') {
      const scale = (el as import('@/types/map').BoothElement).scale || 1;
      const w = el.width * scale;
      const h = el.height * scale;
      minX = Math.min(minX, x - w / 2);
      minY = Math.min(minY, y - h / 2);
      maxX = Math.max(maxX, x + w / 2);
      maxY = Math.max(maxY, y + h / 2);
    } else if (el.type === 'circle') {
      const radius = (el as import('@/types/map').CircleElement).radius;
      minX = Math.min(minX, x - radius);
      minY = Math.min(minY, y - radius);
      maxX = Math.max(maxX, x + radius);
      maxY = Math.max(maxY, y + radius);
    } else if (el.type === 'pillar') {
      const radius = (el as import('@/types/map').PillarElement).radius;
      minX = Math.min(minX, x - radius);
      minY = Math.min(minY, y - radius);
      maxX = Math.max(maxX, x + radius);
      maxY = Math.max(maxX, y + radius);
    } else if (el.type === 'line') {
      const line = el as import('@/types/map').LineElement;
      for (const p of line.points || []) {
        minX = Math.min(minX, x + p.x);
        minY = Math.min(minY, y + p.y);
        maxX = Math.max(maxX, x + p.x);
        maxY = Math.max(maxY, y + p.y);
      }
    } else if (el.type === 'text') {
      // x,y is the center for text elements
      const text = el as import('@/types/map').TextElement;
      const w = text.width || 100;
      const h = text.height || 30;
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

  for (const el of map.elements) {
    processElement(el);
  }

  if (minX === Infinity) {
    return null;
  }

  const padding = 20;
  const contentWidth = maxX - minX + padding * 2;
  const contentHeight = maxY - minY + padding * 2;
  const viewBox = `${minX - padding} ${minY - padding} ${contentWidth} ${contentHeight}`;

  // Get category color
  const getCategoryColor = (categoryId: string) => {
    const category = map.categories.find(c => c.id === categoryId);
    return category?.color || '#3B82F6';
  };

  // Render seat
  const renderSeat = (seat: import('@/types/map').SeatElement, offsetX = 0, offsetY = 0, parentCategory?: string) => {
    const x = seat.x + offsetX;
    const y = seat.y + offsetY;
    const categoryId = seat.category || parentCategory || 'general';
    const color = getCategoryColor(categoryId);
    const radius = Math.max(2, (seat.radius || 12) * 0.8);

    return (
      <circle
        key={seat.id}
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        opacity={0.8}
      />
    );
  };

  // Render row
  const renderRow = (row: import('@/types/map').RowElement, offsetX = 0, offsetY = 0) => {
    return (
      <g key={row.id} transform={`translate(${row.x + offsetX}, ${row.y + offsetY})`}>
        {row.seats?.map(seat => renderSeat(seat, 0, 0, row.category))}
      </g>
    );
  };

  // Render section
  const renderSection = (section: import('@/types/map').SectionElement) => {
    return (
      <g key={section.id} transform={`translate(${section.x}, ${section.y})`}>
        {section.rows?.map(row => renderRow(row))}
      </g>
    );
  };

  // Render table
  const renderTable = (table: import('@/types/map').TableElement) => {
    const w = table.width || 80;
    const h = table.height || 80;

    return (
      <g key={table.id} transform={`translate(${table.x}, ${table.y})`}>
        {table.shape === 'circle' || table.shape === 'oval' ? (
          <ellipse cx={0} cy={0} rx={w / 2} ry={h / 2} fill="rgba(255,255,255,0.1)" />
        ) : (
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="rgba(255,255,255,0.1)" rx={4} />
        )}
        {table.seats?.map(seat => renderSeat(seat, 0, 0, table.category))}
      </g>
    );
  };

  // Render stage
  const renderStage = (stage: import('@/types/map').StageElement) => {
    return (
      <g key={stage.id} transform={`translate(${stage.x}, ${stage.y})`}>
        <rect
          width={stage.width}
          height={stage.height}
          fill="rgba(255,255,255,0.15)"
          rx={stage.shape === 'rounded' ? 10 : 0}
        />
        <text
          x={stage.width / 2}
          y={stage.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
          fontWeight="600"
        >
          {stage.label}
        </text>
      </g>
    );
  };

  // Render rectangle
  const renderRectangle = (rect: import('@/types/map').RectangleElement) => {
    return (
      <g key={rect.id} transform={`translate(${rect.x}, ${rect.y})${rect.rotation ? ` rotate(${rect.rotation})` : ''}`}>
        <rect
          width={rect.width}
          height={rect.height}
          fill={rect.fill || 'transparent'}
          stroke={rect.stroke || 'rgba(255,255,255,0.3)'}
          strokeWidth={Math.max(0.5, (rect.strokeWidth || 1) * 0.5)}
          rx={rect.cornerRadius || 0}
          opacity={0.8}
        />
      </g>
    );
  };

  // Render text - x,y is the CENTER of the text box
  const renderText = (text: import('@/types/map').TextElement) => {
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
          fontSize={Math.max(6, (text.fontSize || 14) * 0.7)}
          opacity={0.8}
        >
          {text.text}
        </text>
      </g>
    );
  };

  // Render shape
  const renderShape = (shape: import('@/types/map').ShapeElement) => {
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
          strokeWidth={Math.max(0.5, (shape.strokeWidth || 1) * 0.5)}
          transform={transform}
          opacity={0.8}
        />
      );
    }
    return (
      <rect
        key={shape.id}
        width={shape.width || 100}
        height={shape.height || 100}
        fill={shape.fill || 'transparent'}
        stroke={shape.stroke || 'rgba(255,255,255,0.3)'}
        strokeWidth={Math.max(0.5, (shape.strokeWidth || 1) * 0.5)}
        rx={shape.cornerRadius || 0}
        transform={transform}
        opacity={0.8}
      />
    );
  };

  // Render area
  const renderArea = (area: import('@/types/map').AreaElement) => {
    const transform = `translate(${area.x}, ${area.y})${area.rotation ? ` rotate(${area.rotation})` : ''}`;
    return (
      <g key={area.id} transform={transform}>
        <rect
          width={area.width || 100}
          height={area.height || 100}
          fill={area.fill || 'rgba(59, 130, 246, 0.2)'}
          stroke={area.stroke || 'rgba(59, 130, 246, 0.5)'}
          strokeWidth={Math.max(0.5, (area.strokeWidth || 2) * 0.5)}
          rx={4}
          opacity={0.8}
        />
        {area.label && (
          <text
            x={(area.width || 100) / 2}
            y={(area.height || 100) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={8}
            opacity={0.6}
          >
            {area.displayedLabel || area.label}
          </text>
        )}
      </g>
    );
  };

  // Render booth
  const renderBooth = (booth: import('@/types/map').BoothElement) => {
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
          strokeWidth={0.5}
          rx={4}
          opacity={0.8}
        />
      </g>
    );
  };

  // Render line
  const renderLine = (line: import('@/types/map').LineElement) => {
    if (!line.points || line.points.length < 2) return null;
    const pathData = line.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <path
        key={line.id}
        d={pathData}
        stroke={line.stroke || 'rgba(255,255,255,0.5)'}
        strokeWidth={Math.max(0.5, (line.strokeWidth || 2) * 0.5)}
        fill="none"
        transform={`translate(${line.x}, ${line.y})${line.rotation ? ` rotate(${line.rotation})` : ''}`}
        opacity={0.8}
      />
    );
  };

  // Render element
  const renderElement = (el: import('@/types/map').MapElement) => {
    if (el.visible === false) return null;
    switch (el.type) {
      case 'seat':
        return renderSeat(el);
      case 'row':
        return renderRow(el);
      case 'section':
        return renderSection(el);
      case 'table':
        return renderTable(el);
      case 'stage':
        return renderStage(el);
      case 'rectangle':
        return renderRectangle(el);
      case 'text':
        return renderText(el);
      case 'shape':
        return renderShape(el);
      case 'area':
        return renderArea(el);
      case 'booth':
        return renderBooth(el);
      case 'line':
        return renderLine(el);
      default:
        return null;
    }
  };

  return (
    <div className="h-40 w-full">
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render in layer order */}
        {map.elements.filter(el => el.layer === 'below').map(renderElement)}
        {map.elements.filter(el => !el.layer || (el.layer !== 'below' && el.layer !== 'above')).map(renderElement)}
        {map.elements.filter(el => el.layer === 'above').map(renderElement)}
      </svg>
    </div>
  );
}

export default function CreateEvent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [eventName, setEventName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageIsLandscape, setCoverImageIsLandscape] = useState(false);
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState(() => formatLocalDate(new Date()));
  const [endTime, setEndTime] = useState('22:00');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Show auth modal for unauthenticated users (only after auth state is loaded)
  const showAuthModal = !authLoading && user === null;

  // Picker open states
  const [openPicker, setOpenPicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);

  // Refs for picker triggers
  const startDateRef = useRef<HTMLButtonElement>(null);
  const startTimeRef = useRef<HTMLButtonElement>(null);
  const endDateRef = useRef<HTMLButtonElement>(null);
  const endTimeRef = useRef<HTMLButtonElement>(null);

  // Handle start date change - also update end date if needed
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    // If end date is before new start date, sync it
    const startParsed = parseLocalDate(newStartDate);
    const endParsed = parseLocalDate(endDate);
    if (endParsed < startParsed) {
      setEndDate(newStartDate);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [capacity, setCapacity] = useState('Unlimited');

  // Event type and ticketing state
  const [eventType, setEventType] = useState<EventType>('ga');
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: nanoid(), name: 'General Admission', price: 0, quantity: -1 }
  ]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [sendQrCode, setSendQrCode] = useState(true); // Whether to include QR code in confirmation emails
  const [seatMapModalOpen, setSeatMapModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Check if the event is free (all ticket prices are 0)
  const isFreeEvent = eventType === 'ga' && ticketTiers.every(tier => tier.price === 0);

  // Access map store for seated events
  const { map, updateCategory, addCategory, deleteCategory } = useMapStore();

  // Theme state
  const [selectedColor, setSelectedColor] = useState(themeColors[1]); // stone default
  const [selectedFont, setSelectedFont] = useState(themeFonts[0]);

  // Calculate ticket summary for display
  const getTicketSummary = () => {
    if (eventType === 'seated' && map) {
      // For seated events, show price range from categories
      const categories = map.categories.filter(c => c.price !== undefined && c.price > 0);
      if (categories.length === 0) return 'Free';
      const prices = categories.map(c => c.price!);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return formatCurrencyRange(min, max, currency);
    }
    // For GA events, show ticket tier price range
    const prices = ticketTiers.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return formatCurrencyRange(min, max, currency);
  };

  // Calculate capacity for display
  const getCapacityDisplay = () => {
    if (eventType === 'seated' && map) {
      // Count seats from map elements
      let seatCount = 0;
      for (const el of map.elements) {
        if (el.type === 'row') {
          seatCount += el.seats?.length || 0;
        } else if (el.type === 'section') {
          for (const row of el.rows) {
            seatCount += row.seats?.length || 0;
          }
        } else if (el.type === 'table') {
          seatCount += el.seats?.length || 0;
        } else if (el.type === 'seat') {
          seatCount += 1;
        }
      }
      return seatCount > 0 ? `${seatCount} seats` : 'No seats yet';
    }
    // For GA events, calculate from ticket tiers
    const totalCapacity = ticketTiers.reduce((sum, tier) => {
      if (tier.quantity === -1) return -1;
      if (sum === -1) return -1;
      return sum + tier.quantity;
    }, 0);
    return totalCapacity === -1 ? 'Unlimited' : `${totalCapacity}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Check if user is logged in
      const currentUser = await getUser();
      if (!currentUser) {
        setSubmitError('Please sign in to create an event');
        setIsSubmitting(false);
        return;
      }

      // Validate required fields
      if (!eventName.trim()) {
        setSubmitError('Event name is required');
        setIsSubmitting(false);
        return;
      }

      let mapId: string | null = null;

      // 1. For seated events, save the map first
      if (eventType === 'seated' && map) {
        const savedMap = await createMap({
          user_id: currentUser.id,
          name: `${eventName} Seat Map`,
          description: null,
          data: map,
          thumbnail_url: null,
          is_template: false,
        });
        mapId = savedMap.id;
      }

      // 2. Upload cover image if present
      let coverImageUrl: string | null = null;
      if (coverImage) {
        try {
          coverImageUrl = await uploadCoverImage(coverImage, currentUser.id);
        } catch (uploadError) {
          console.error('Failed to upload cover image:', uploadError);
          // Continue without cover image
        }
      }

      // 3. Create the event
      const newEvent = await createExtendedEvent({
        mapId: mapId || undefined,
        userId: currentUser.id,
        name: eventName,
        description: description || undefined,
        startDate,
        startTime,
        endDate: endDate || undefined,
        endTime: endTime || undefined,
        location: location || undefined,
        locationLat: locationCoords?.lat,
        locationLng: locationCoords?.lng,
        coverImageUrl: coverImageUrl || undefined,
        eventType,
        ticketTiers: eventType === 'ga' ? ticketTiers : undefined,
        currency,
        themeColor: selectedColor.bg,
        themeFont: selectedFont.id,
        requireApproval,
        sendQrCode: isFreeEvent ? sendQrCode : true, // Only applies to free events
      });

      // 4. Redirect to event page using short_id for nicer URLs
      router.push(`/event/${newEvent.short_id || newEvent.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create event');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: selectedColor.bg }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.03]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.02]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.04]" style={{ backgroundColor: `${selectedColor.bg}cc` }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg group-hover:scale-105 transition-transform bg-white" />
            <span className="text-[15px] font-medium text-white/90">seated</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* User indicator */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-medium text-white">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs text-white/70 max-w-[100px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="h-9 px-4 text-[13px] font-medium rounded-full transition-colors bg-white/10 text-white hover:bg-white/20 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button
              type="submit"
              form="create-event-form"
              disabled={isSubmitting}
              className="h-9 px-5 text-[13px] font-semibold rounded-full transition-colors bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-5xl mx-auto px-6 py-10 pb-28">
        <form id="create-event-form" onSubmit={handleSubmit}>
          <div className="flex gap-10">
            {/* Left Column */}
            <div className="w-80 flex-shrink-0 space-y-4">
              {/* Cover Image */}
              <div className="relative rounded-3xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                {coverImage ? (
                  <div className={`${coverImageIsLandscape ? 'aspect-[16/10]' : 'aspect-[4/5]'} relative group`}>
                    <img
                      src={coverImage}
                      alt="Event cover"
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <label className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const dataUrl = e.target?.result as string;
                                setCoverImage(dataUrl);
                                // Detect aspect ratio
                                const img = new window.Image();
                                img.onload = () => setCoverImageIsLandscape(img.width > img.height);
                                img.src = dataUrl;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-[13px] font-medium hover:bg-white/30 transition-colors">
                          Change image
                        </div>
                      </label>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => { setCoverImage(null); setCoverImageIsLandscape(false); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="aspect-[4/5] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/[0.08] transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const dataUrl = e.target?.result as string;
                            setCoverImage(dataUrl);
                            // Detect aspect ratio
                            const img = new window.Image();
                            img.onload = () => setCoverImageIsLandscape(img.width > img.height);
                            img.src = dataUrl;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <p className="text-[14px] text-white/50 mb-1">Add cover image</p>
                    <p className="text-[12px] text-white/30">Recommended: 800x1000px</p>
                  </label>
                )}
              </div>

              {/* Seat Map Preview - show for seated events */}
              {eventType === 'seated' && (
                <div className="relative rounded-2xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                  <div className="p-4 border-b border-white/[0.03] flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-white/30 uppercase tracking-wider">Seat Map</p>
                      <p className="text-[13px] text-white/70 mt-0.5">{map?.name || 'Click to design'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeatMapModalOpen(true)}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors bg-white/10 text-white hover:bg-white/20"
                    >
                      Edit map
                    </button>
                  </div>
                  <div className="p-4">
                    <MapPreview map={map} />
                  </div>
                  {map && map.categories.length > 0 && (
                    <div className="px-4 pb-4 flex flex-wrap items-center gap-3 text-[10px]">
                      {map.categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-white/40">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats - show for seated events */}
              {eventType === 'seated' && map && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent">
                    <p className="text-[11px] text-white/40 uppercase tracking-wider">Elements</p>
                    <p className="text-[20px] font-semibold text-white mt-1">{map.elements.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent">
                    <p className="text-[11px] text-white/40 uppercase tracking-wider">Total Seats</p>
                    <p className="text-[20px] font-semibold text-white mt-1">{getCapacityDisplay().replace(' seats', '')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="flex-1 space-y-5">
              {/* Event Name */}
              <div>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Event name"
                  className={`w-full text-[2.5rem] font-semibold text-white placeholder:text-white/20 bg-transparent focus:outline-none tracking-tight ${selectedFont.style}`}
                  autoFocus
                />
              </div>

              {/* Date/Time */}
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent">
                <div className="flex">
                  <div className="flex-1 divide-y divide-white/[0.06]">
                    {/* Start Row */}
                    <div className="flex items-center px-4 py-3.5">
                      <div className="w-10 flex items-center">
                        <div className="w-2 h-2 rounded-full border-2 border-white/50" />
                      </div>
                      <span className="text-[13px] text-white/40 w-12">Start</span>
                      {/* Start Date */}
                      <div className="flex-1">
                        <button
                          ref={startDateRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'startDate' ? null : 'startDate')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/90 group-hover:text-white transition-colors">
                            {formatDate(startDate)}
                          </span>
                          <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                        </button>
                        <CalendarPicker
                          value={startDate}
                          onChange={handleStartDateChange}
                          isOpen={openPicker === 'startDate'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={startDateRef}
                        />
                      </div>
                      {/* Start Time */}
                      <div>
                        <button
                          ref={startTimeRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'startTime' ? null : 'startTime')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/70 group-hover:text-white transition-colors">
                            {formatTime(startTime)}
                          </span>
                          <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <TimePicker
                          value={startTime}
                          onChange={setStartTime}
                          isOpen={openPicker === 'startTime'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={startTimeRef}
                        />
                      </div>
                    </div>
                    {/* End Row */}
                    <div className="flex items-center px-4 py-3.5">
                      <div className="w-10 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-white/50" />
                      </div>
                      <span className="text-[13px] text-white/40 w-12">End</span>
                      {/* End Date */}
                      <div className="flex-1">
                        <button
                          ref={endDateRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'endDate' ? null : 'endDate')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/90 group-hover:text-white transition-colors">
                            {formatDate(endDate)}
                          </span>
                          <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                        </button>
                        <CalendarPicker
                          value={endDate}
                          onChange={setEndDate}
                          isOpen={openPicker === 'endDate'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={endDateRef}
                          minDate={startDate}
                        />
                      </div>
                      {/* End Time */}
                      <div>
                        <button
                          ref={endTimeRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'endTime' ? null : 'endTime')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/70 group-hover:text-white transition-colors">
                            {formatTime(endTime)}
                          </span>
                          <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <TimePicker
                          value={endTime}
                          onChange={setEndTime}
                          isOpen={openPicker === 'endTime'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={endTimeRef}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <svg className="w-5 h-5 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <AddressAutocomplete
                    value={location}
                    onChange={setLocation}
                    onSelect={(place) => {
                      setLocationCoords({ lat: place.lat, lng: place.lng });
                    }}
                  />
                  {location && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocation('');
                        setLocationCoords(null);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Google Maps Embed */}
                {locationCoords && location && (
                  <div className="relative">
                    <iframe
                      src={`https://www.google.com/maps?q=${encodeURIComponent(location)}&z=15&output=embed`}
                      className="w-full h-48 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="absolute inset-0 pointer-events-none border-t border-white/[0.06]" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <svg className="w-5 h-5 text-white/30 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description..."
                    rows={3}
                    className="flex-1 text-[14px] text-white/90 placeholder:text-white/30 bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
                  />
                </div>
              </div>

              {/* Event Type Selector */}
              <div className="space-y-3">
                <p className="text-[12px] text-white/40 uppercase tracking-wider px-1">Event Type</p>
                <EventTypeSelector value={eventType} onChange={setEventType} />
              </div>

              {/* Ticket Tiers (for GA events) */}
              {eventType === 'ga' && (
                <TicketTierEditor
                  tiers={ticketTiers}
                  currency={currency}
                  onCurrencyChange={setCurrency}
                  onChange={setTicketTiers}
                />
              )}

              {/* Pricing Editor (for Seated events) */}
              {eventType === 'seated' && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                      <div>
                        <span className="text-[14px] text-white/70">Ticket Pricing</span>
                        <p className="text-[12px] text-white/40">Set prices for each seat category</p>
                      </div>
                    </div>
                    <CurrencySelector value={currency} onChange={setCurrency} />
                  </div>
                  {map ? (
                    <div className="p-3 space-y-2">
                      {map.categories.map(category => (
                        <div key={category.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] group">
                          <div className="relative w-6 h-6 flex-shrink-0">
                            <div
                              className="w-6 h-6 rounded-full cursor-pointer"
                              style={{ backgroundColor: category.color }}
                            />
                            <input
                              type="color"
                              value={category.color}
                              onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                            className="flex-1 bg-transparent text-[13px] text-white/80 focus:outline-none focus:text-white"
                          />
                          <CategoryPriceInput
                            priceInCents={category.price}
                            currencySymbol={getCurrencySymbol(currency)}
                            onChange={(cents) => updateCategory(category.id, { price: cents })}
                          />
                          {map.categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteCategory(category.id)}
                              className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Add Category Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#8B5CF6', '#EC4899', '#FFD700'];
                          const usedColors = new Set(map.categories.map(c => c.color));
                          const availableColor = colors.find(c => !usedColors.has(c)) || colors[Math.floor(Math.random() * colors.length)];
                          addCategory({
                            id: `cat-${Date.now()}`,
                            name: `Category ${map.categories.length + 1}`,
                            color: availableColor,
                            price: 0,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[13px]">Add Category</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-[13px] text-white/40">
                      Create a seat map to set pricing
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent divide-y divide-white/[0.04]">
                {/* Ticket Summary */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                    </svg>
                    <span className="text-[14px] text-white/70">Tickets</span>
                  </div>
                  <span className="text-[14px] text-white/50">{getTicketSummary()}</span>
                </div>

                {/* Capacity */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span className="text-[14px] text-white/70">Capacity</span>
                  </div>
                  <span className="text-[14px] text-white/50">{getCapacityDisplay()}</span>
                </div>

                {/* Require Approval */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[14px] text-white/70">Require approval</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequireApproval(!requireApproval)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                      requireApproval ? 'bg-white' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${
                      requireApproval ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'
                    }`} />
                  </button>
                </div>

                {/* Send QR Code - Only show for free events */}
                {isFreeEvent && (
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                      </svg>
                      <div>
                        <span className="text-[14px] text-white/70">Include QR code</span>
                        <p className="text-[12px] text-white/40">Send QR code in confirmation email</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendQrCode(!sendQrCode)}
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                        sendQrCode ? 'bg-white' : 'bg-white/10'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${
                        sendQrCode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'
                      }`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <button
                type="submit"
                className="w-full py-4 text-[15px] font-semibold rounded-full transition-all bg-white text-black hover:bg-white/90"
              >
                Create Event
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Fixed Bottom Theme Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Color */}
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-white/40">Color</span>
              <div className="flex gap-1.5">
                {themeColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full transition-all duration-200 border ${
                      selectedColor.id === color.id && selectedColor.id !== 'custom'
                        ? 'border-white scale-110'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.bg }}
                    title={color.name}
                  />
                ))}
                {/* Custom color picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={selectedColor.id === 'custom' ? selectedColor.bg : '#1a1a1a'}
                    onChange={(e) => {
                      setSelectedColor({
                        id: 'custom',
                        name: 'Custom',
                        bg: e.target.value
                      });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className={`w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center border ${
                      selectedColor.id === 'custom'
                        ? 'border-white scale-110'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{
                      background: 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-black/80" />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Font */}
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-white/40">Font</span>
              <div className="flex gap-1.5">
                {themeFonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSelectedFont(font)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${font.style} ${
                      selectedFont.id === font.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Map Editor Modal */}
      <SeatMapEditorModal
        isOpen={seatMapModalOpen}
        onClose={() => setSeatMapModalOpen(false)}
      />

      {/* Auth Modal - shown for unauthenticated users */}
      <SimpleAuthModal
        isOpen={showAuthModal}
        onSuccess={() => {
          // Auth state will update automatically via useAuth hook
          // Modal will close when user becomes non-null
        }}
      />

      {/* Error Toast */}
      {submitError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[13px]">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Event Preview Modal */}
      <EventPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        eventData={{
          name: eventName,
          description,
          startDate,
          startTime,
          endDate,
          endTime,
          location,
          locationCoords,
          coverImage,
          eventType,
          ticketTiers,
          currency,
          themeColor: selectedColor.bg,
          themeFont: selectedFont.id,
        }}
        mapData={map}
      />
    </div>
  );
}
