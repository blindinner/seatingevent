'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { nanoid } from 'nanoid';
import type { TicketTier, EventType } from '@/types/event';
import { EventTypeSelector } from '@/components/create/EventTypeSelector';
import { TicketTierEditor } from '@/components/create/TicketTierEditor';
import { SeatMapEditorModal } from '@/components/create/SeatMapEditorModal';
import { CurrencySelector } from '@/components/create/CurrencySelector';
import { useMapStore } from '@/stores/mapStore';
import { formatCurrency, formatCurrencyRange, getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currency';
import { getSupabaseClient } from '@/lib/auth';
import { uploadCoverImage } from '@/lib/supabase';
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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; currentMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    days.push({ day, currentMonth: false, date: new Date(year, month - 1, day) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ day, currentMonth: true, date: new Date(year, month, day) });
  }
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

  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const minDateParsed = minDate ? parseLocalDate(minDate) : null;
  const isDisabled = (date: Date) => {
    if (!minDateParsed) return false;
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-gray-900">{monthNames[month]}</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="w-9 h-9 flex items-center justify-center text-[12px] font-medium text-gray-400">{day}</div>
        ))}
      </div>
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
                disabled ? 'text-gray-200 cursor-not-allowed'
                : isSelected(item.date) ? 'bg-gray-900 text-white font-medium'
                : isToday(item.date) ? 'bg-gray-100 text-gray-900 font-medium'
                : item.currentMonth ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-300'
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
        left: rect.right + window.scrollX - 140,
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

  const formatTimeDisplay = (time: string) => {
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
          onClick={() => { onChange(time); onClose(); }}
          className={`w-full px-4 py-2 text-left text-[13px] transition-colors ${
            value === time ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {formatTimeDisplay(time)}
        </button>
      ))}
    </div>,
    document.body
  );
}

// Price input component
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

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(priceInCents !== undefined ? (priceInCents / 100).toString() : '');
    }
  }, [priceInCents, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    const dollars = parseFloat(value);
    if (!isNaN(dollars)) onChange(Math.round(dollars * 100));
    else if (value === '') onChange(0);
  };

  const handleBlur = () => {
    setIsFocused(false);
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
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-[13px]">{currencySymbol}</span>
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

export default function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageChanged, setCoverImageChanged] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('22:00');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [sendQrCode, setSendQrCode] = useState(true);
  const [eventType, setEventType] = useState<EventType>('ga');
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);

  // Check if the event is free (all ticket prices are 0)
  const isFreeEvent = eventType === 'ga' && ticketTiers.every(tier => tier.price === 0);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [seatMapModalOpen, setSeatMapModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);
  const [selectedColor, setSelectedColor] = useState(themeColors[1]);
  const [selectedFont, setSelectedFont] = useState(themeFonts[0]);

  const startDateRef = useRef<HTMLButtonElement>(null);
  const startTimeRef = useRef<HTMLButtonElement>(null);
  const endDateRef = useRef<HTMLButtonElement>(null);
  const endTimeRef = useRef<HTMLButtonElement>(null);

  const { map, loadMap, updateCategory, addCategory, deleteCategory } = useMapStore();

  // Fetch event data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/signin?redirect=/event/${eventId}/edit`);
      return;
    }

    async function fetchEvent() {
      try {
        const supabase = getSupabaseClient();
        const { data: event, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error || !event) {
          router.push('/my-events');
          return;
        }

        if (event.user_id !== user!.id) {
          router.push(`/event/${eventId}`);
          return;
        }

        // Populate form fields
        setEventName(event.name || '');
        setCoverImage(event.cover_image_url || null);
        setStartDate(event.start_date || formatLocalDate(new Date()));
        setStartTime(event.start_time || '19:00');
        setEndDate(event.end_date || event.start_date || formatLocalDate(new Date()));
        setEndTime(event.end_time || '22:00');
        setLocation(event.location || '');
        setLocationLat(event.location_lat || null);
        setLocationLng(event.location_lng || null);
        setDescription(event.description || '');
        setRequireApproval(event.require_approval || false);
        setSendQrCode(event.send_qr_code !== false); // Default to true
        setEventType(event.event_type || 'ga');
        setTicketTiers(event.ticket_tiers || [{ id: nanoid(), name: 'General Admission', price: 0, quantity: -1 }]);
        setCurrency(event.currency || DEFAULT_CURRENCY);

        // Find matching theme color or set custom
        const matchingColor = themeColors.find(c => c.bg === event.theme_color);
        if (matchingColor) {
          setSelectedColor(matchingColor);
        } else if (event.theme_color) {
          setSelectedColor({ id: 'custom', name: 'Custom', bg: event.theme_color });
        }

        // Find matching font
        const matchingFont = themeFonts.find(f => f.id === event.theme_font);
        if (matchingFont) setSelectedFont(matchingFont);

        // Load map if seated event
        if (event.map_id) {
          const { data: mapData } = await supabase
            .from('maps')
            .select('*')
            .eq('id', event.map_id)
            .single();

          if (mapData?.data) {
            loadMap(mapData.data);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching event:', err);
        router.push('/my-events');
      }
    }

    fetchEvent();
  }, [user, authLoading, eventId, router, loadMap]);

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    const startParsed = parseLocalDate(newStartDate);
    const endParsed = parseLocalDate(endDate);
    if (endParsed < startParsed) setEndDate(newStartDate);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const getTicketSummary = () => {
    if (eventType === 'seated' && map) {
      const categories = map.categories.filter(c => c.price !== undefined && c.price > 0);
      if (categories.length === 0) return 'Free';
      const prices = categories.map(c => c.price!);
      return formatCurrencyRange(Math.min(...prices), Math.max(...prices), currency);
    }
    const prices = ticketTiers.map(t => t.price);
    return formatCurrencyRange(Math.min(...prices), Math.max(...prices), currency);
  };

  const getCapacityDisplay = () => {
    if (eventType === 'seated' && map) {
      let seatCount = 0;
      for (const el of map.elements) {
        if (el.type === 'row') seatCount += el.seats?.length || 0;
        else if (el.type === 'section') {
          for (const row of el.rows) seatCount += row.seats?.length || 0;
        }
        else if (el.type === 'table') seatCount += el.seats?.length || 0;
        else if (el.type === 'seat') seatCount += 1;
      }
      return seatCount > 0 ? `${seatCount} seats` : 'No seats yet';
    }
    const totalCapacity = ticketTiers.reduce((sum, tier) => {
      if (tier.quantity === -1 || sum === -1) return -1;
      return sum + tier.quantity;
    }, 0);
    return totalCapacity === -1 ? 'Unlimited' : `${totalCapacity}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!eventName.trim()) {
        setSubmitError('Event name is required');
        setIsSubmitting(false);
        return;
      }

      const supabase = getSupabaseClient();

      // Upload new cover image if changed
      let coverImageUrl = coverImage;
      if (coverImageChanged && coverImage && coverImage.startsWith('data:')) {
        try {
          coverImageUrl = await uploadCoverImage(coverImage, user!.id);
        } catch (uploadError) {
          console.error('Failed to upload cover image:', uploadError);
        }
      }

      // Update map if seated
      if (eventType === 'seated' && map) {
        const { data: existingEvent } = await supabase
          .from('events')
          .select('map_id')
          .eq('id', eventId)
          .single();

        if (existingEvent?.map_id) {
          await supabase
            .from('maps')
            .update({ data: map })
            .eq('id', existingEvent.map_id);
        }
      }

      // Update event
      const { error } = await supabase
        .from('events')
        .update({
          name: eventName,
          description: description || null,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate || null,
          end_time: endTime || null,
          location: location || null,
          location_lat: locationLat,
          location_lng: locationLng,
          cover_image_url: coverImageUrl,
          event_type: eventType,
          ticket_tiers: eventType === 'ga' ? ticketTiers : null,
          currency,
          theme_color: selectedColor.bg,
          theme_font: selectedFont.id,
          require_approval: requireApproval,
          send_qr_code: isFreeEvent ? sendQrCode : true, // Only applies to free events
        })
        .eq('id', eventId);

      if (error) throw error;

      router.push(`/event/${eventId}/dashboard`);
    } catch (error) {
      console.error('Failed to update event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to update event');
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

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
          <Link href={`/event/${eventId}/dashboard`} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[14px]">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              form="edit-event-form"
              disabled={isSubmitting}
              className="h-9 px-5 text-[13px] font-semibold rounded-full transition-colors bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-5xl mx-auto px-6 py-10 pb-28">
        <form id="edit-event-form" onSubmit={handleSubmit}>
          <div className="flex gap-10">
            {/* Left Column - Cover Image */}
            <div className="w-80 flex-shrink-0 space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                {coverImage ? (
                  <div className="aspect-[4/5] relative group">
                    <img src={coverImage} alt="Event cover" className="w-full h-full object-cover" />
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
                                setCoverImage(e.target?.result as string);
                                setCoverImageChanged(true);
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
                    <button
                      type="button"
                      onClick={() => { setCoverImage(null); setCoverImageChanged(true); }}
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
                            setCoverImage(e.target?.result as string);
                            setCoverImageChanged(true);
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
            </div>

            {/* Right Column */}
            <div className="flex-1 space-y-5">
              {/* Event Name */}
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event name"
                className={`w-full text-[2.5rem] font-semibold text-white placeholder:text-white/20 bg-transparent focus:outline-none tracking-tight ${selectedFont.style}`}
              />

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
                      <div className="flex-1">
                        <button
                          ref={startDateRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'startDate' ? null : 'startDate')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/90 group-hover:text-white transition-colors">
                            {startDate ? formatDate(startDate) : 'Select date'}
                          </span>
                        </button>
                        <CalendarPicker
                          value={startDate || formatLocalDate(new Date())}
                          onChange={handleStartDateChange}
                          isOpen={openPicker === 'startDate'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={startDateRef}
                        />
                      </div>
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
                      <div className="flex-1">
                        <button
                          ref={endDateRef}
                          type="button"
                          onClick={() => setOpenPicker(openPicker === 'endDate' ? null : 'endDate')}
                          className="flex items-center gap-2 group"
                        >
                          <span className="text-[14px] text-white/90 group-hover:text-white transition-colors">
                            {endDate ? formatDate(endDate) : 'Select date'}
                          </span>
                        </button>
                        <CalendarPicker
                          value={endDate || startDate || formatLocalDate(new Date())}
                          onChange={setEndDate}
                          isOpen={openPicker === 'endDate'}
                          onClose={() => setOpenPicker(null)}
                          triggerRef={endDateRef}
                          minDate={startDate}
                        />
                      </div>
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
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add venue or location"
                    className="flex-1 text-[14px] text-white/90 placeholder:text-white/30 bg-transparent focus:outline-none"
                  />
                  {location && (
                    <button
                      type="button"
                      onClick={() => { setLocation(''); setLocationLat(null); setLocationLng(null); }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
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

              {/* Seat Map Editor (for Seated events) */}
              {eventType === 'seated' && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                      <div>
                        <span className="text-[14px] text-white/70">Seat Map</span>
                        <p className="text-[12px] text-white/40">{map ? `${getCapacityDisplay()}` : 'No seat map yet'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeatMapModalOpen(true)}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-[13px] font-medium hover:bg-white/20 transition-colors"
                    >
                      {map ? 'Edit Map' : 'Create Map'}
                    </button>
                  </div>
                </div>
              )}

              {/* Pricing Editor (for Seated events) */}
              {eventType === 'seated' && map && (
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
                    <div className="p-3 space-y-2">
                      {map.categories.map(category => (
                        <div key={category.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] group">
                          <input
                            type="color"
                            value={category.color}
                            onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                            className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
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
                </div>
              )}

              {/* Options */}
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent divide-y divide-white/[0.04]">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                    </svg>
                    <span className="text-[14px] text-white/70">Tickets</span>
                  </div>
                  <span className="text-[14px] text-white/50">{getTicketSummary()}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span className="text-[14px] text-white/70">Capacity</span>
                  </div>
                  <span className="text-[14px] text-white/50">{getCapacityDisplay()}</span>
                </div>
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
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${requireApproval ? 'bg-white' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${requireApproval ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'}`} />
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
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${sendQrCode ? 'bg-white' : 'bg-white/10'}`}
                    >
                      <div className={`w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${sendQrCode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 text-[15px] font-semibold rounded-full transition-all bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Fixed Bottom Theme Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
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
                        ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.bg }}
                    title={color.name}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={selectedColor.id === 'custom' ? selectedColor.bg : '#1a1a1a'}
                    onChange={(e) => setSelectedColor({ id: 'custom', name: 'Custom', bg: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className={`w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center border ${
                      selectedColor.id === 'custom' ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ background: 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                  >
                    <div className="w-3 h-3 rounded-full bg-black/80" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-white/40">Font</span>
              <div className="flex gap-1.5">
                {themeFonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSelectedFont(font)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${font.style} ${
                      selectedFont.id === font.id ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/15'
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
      <SeatMapEditorModal isOpen={seatMapModalOpen} onClose={() => setSeatMapModalOpen(false)} />

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
    </div>
  );
}
