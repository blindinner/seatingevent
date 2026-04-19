'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { PublicEvent } from '@/types/event';
import type { MapData } from '@/types/map';
import { SeatMapViewer } from '@/components/event/SeatMapViewer';
import { TicketSelector } from '@/components/event/TicketSelector';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

// Helper to check if a color is light
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function formatDate(dateStr: string, language: 'en' | 'he' = 'en') {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(time: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

interface TicketTierWithAvailability {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  remaining?: number;
  sold?: number;
}

export default function EmbedEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;

  // URL params for theming
  const primaryColorParam = searchParams.get('primaryColor');
  const bgColorParam = searchParams.get('bgColor');
  const textColorParam = searchParams.get('textColor');
  const languageParam = searchParams.get('lang') as 'en' | 'he' | null;

  // Layout & style params
  const hideHeader = searchParams.get('hideHeader') === 'true';
  const hidePoweredBy = searchParams.get('hidePoweredBy') === 'true';
  const compact = searchParams.get('compact') === 'true';
  const borderRadiusParam = searchParams.get('borderRadius') || 'lg'; // none, sm, md, lg, full
  const paddingParam = searchParams.get('padding') || 'md'; // sm, md, lg
  const buttonStyleParam = searchParams.get('buttonStyle') || 'rounded'; // rounded, pill, square
  const fontParam = searchParams.get('font'); // inherit, system, or custom font family

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [ticketTiers, setTicketTiers] = useState<TicketTierWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const {
    selectedSeats,
    selectedTickets,
    getTotalPrice,
    getTotalTickets,
    clearSelection,
    clearTickets,
  } = useSeatSelectionStore();

  // Clear selection on mount
  useEffect(() => {
    clearSelection();
    clearTickets();
  }, [clearSelection, clearTickets]);

  // Fetch event data
  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('Event not found');

        const data = await res.json();
        setEvent(data.event);

        // Set map data if available
        if (data.mapData) {
          setMapData(data.mapData);
        }

        // Set ticket tiers with availability
        if (data.event.ticketTiers) {
          setTicketTiers(data.tiers || data.event.ticketTiers);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId]);

  // Fetch live seat status for seated events
  const fetchSeatStatus = useCallback(async () => {
    if (!event || event.eventType !== 'seated') return;

    try {
      const res = await fetch(`/api/events/${eventId}/seats`);
      if (res.ok) {
        const data = await res.json();
        setEvent(prev => prev ? { ...prev, seatStatus: data.seatStatus || {} } : null);
      }
    } catch (err) {
      console.error('Failed to fetch seat status:', err);
    }
  }, [event, eventId]);

  // Fetch live ticket availability for GA events
  const fetchTicketAvailability = useCallback(async () => {
    if (!event || event.eventType !== 'ga') return;

    try {
      const res = await fetch(`/api/events/${eventId}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTicketTiers(data.tiers || []);
      }
    } catch (err) {
      console.error('Failed to fetch ticket availability:', err);
    }
  }, [event, eventId]);

  // Poll for availability updates
  useEffect(() => {
    if (!event) return;

    // Initial fetch
    fetchSeatStatus();
    fetchTicketAvailability();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchSeatStatus();
      fetchTicketAvailability();
    }, 30000);

    return () => clearInterval(interval);
  }, [event, fetchSeatStatus, fetchTicketAvailability]);

  // Theme
  const primaryColor = primaryColorParam ? `#${primaryColorParam.replace('#', '')}` : event?.accentColor || '#10b981';
  const backgroundColor = bgColorParam ? `#${bgColorParam.replace('#', '')}` : '#ffffff';
  const isDark = !isLightColor(backgroundColor);
  const textColor = textColorParam
    ? `#${textColorParam.replace('#', '')}`
    : isDark ? '#ffffff' : '#1a1a1a';
  const mutedTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const subtleTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const buttonTextColor = isLightColor(primaryColor) ? '#000' : '#fff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBgColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const language = languageParam || event?.language || 'en';
  const isRtl = language === 'he';

  // Border radius mapping
  const borderRadiusMap: Record<string, string> = {
    none: '0',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };
  const borderRadius = borderRadiusMap[borderRadiusParam] || borderRadiusMap.lg;
  const buttonBorderRadius = buttonStyleParam === 'pill'
    ? '9999px'
    : buttonStyleParam === 'square'
      ? '0.375rem'
      : borderRadius;

  // Padding mapping
  const paddingMap: Record<string, { x: string; y: string }> = {
    sm: { x: '0.75rem', y: '0.5rem' },
    md: { x: '1.25rem', y: '1rem' },
    lg: { x: '1.5rem', y: '1.25rem' },
  };
  const padding = paddingMap[paddingParam] || paddingMap.md;

  // Font family
  const fontFamily = fontParam === 'inherit'
    ? 'inherit'
    : fontParam
      ? fontParam
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Selection state
  const hasSelection = event?.eventType === 'seated'
    ? selectedSeats.length > 0
    : getTotalTickets() > 0;
  const totalPrice = getTotalPrice();
  const isFreeEvent = totalPrice === 0 && hasSelection;

  // Translations
  const t = {
    en: {
      selectTickets: 'Select Tickets',
      selectSeats: 'Select Your Seats',
      clickToSelect: 'Click on seats to select them',
      checkout: 'Continue to Checkout',
      register: 'Register',
      selectToCheckout: 'Select tickets to continue',
      total: 'Total',
      tickets: 'tickets',
      ticket: 'ticket',
      seats: 'seats',
      seat: 'seat',
      free: 'Free',
      poweredBy: 'Powered by',
      loading: 'Loading...',
      eventNotFound: 'Event not found',
    },
    he: {
      selectTickets: 'בחירת כרטיסים',
      selectSeats: 'בחר מקומות ישיבה',
      clickToSelect: 'לחץ על מושב לבחירה',
      checkout: 'המשך לתשלום',
      register: 'הרשמה',
      selectToCheckout: 'בחר כרטיסים להמשך',
      total: 'סה"כ',
      tickets: 'כרטיסים',
      ticket: 'כרטיס',
      seats: 'מושבים',
      seat: 'מושב',
      free: 'חינם',
      poweredBy: 'מופעל ע"י',
      loading: 'טוען...',
      eventNotFound: 'אירוע לא נמצא',
    },
  }[language];

  const handleCheckout = () => {
    if (hasSelection && event) {
      setCheckoutOpen(true);
    }
  };

  const handleCheckoutSuccess = () => {
    clearSelection();
    clearTickets();
    setCheckoutOpen(false);
    // Refresh availability
    fetchSeatStatus();
    fetchTicketAvailability();
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor, direction: isRtl ? 'rtl' : 'ltr' }}
      >
        <div className="text-center">
          <svg
            className="w-8 h-8 animate-spin mx-auto"
            style={{ color: primaryColor }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p
            className="text-sm mt-3"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
          >
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor, direction: isRtl ? 'rtl' : 'ltr' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
          >
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p
            className="text-lg font-medium"
            style={{ color: isDark ? '#fff' : '#1a1a1a' }}
          >
            {t.eventNotFound}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${compact ? '' : 'min-h-screen'}`}
      style={{
        backgroundColor,
        direction: isRtl ? 'rtl' : 'ltr',
        fontFamily,
        borderRadius: compact ? borderRadius : undefined,
        overflow: compact ? 'hidden' : undefined,
      }}
    >
      {/* Event Header */}
      {!hideHeader && (
        <header
          style={{
            padding: `${padding.y} ${padding.x}`,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <h1
            className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}
            style={{ color: textColor }}
          >
            {event.name}
          </h1>
          <div
            className="flex items-center gap-3 mt-1 text-sm"
            style={{ color: mutedTextColor }}
          >
            {event.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location.split(',')[0]}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(event.startDate, language)} · {formatTime(event.startTime)}
            </span>
          </div>
        </header>
      )}

      {/* Ticket Selection Area */}
      <div className="flex-1 overflow-auto">
        {event.eventType === 'seated' && mapData ? (
          // Seated Event - Seat Map
          <div className="h-full flex flex-col">
            <div
              style={{
                padding: `${paddingMap.sm.y} ${padding.x}`,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <h2
                className="text-sm font-medium"
                style={{ color: mutedTextColor }}
              >
                {t.selectSeats}
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: subtleTextColor }}
              >
                {t.clickToSelect}
              </p>
            </div>
            <div className={compact ? 'min-h-[200px]' : 'flex-1 min-h-[300px]'}>
              <SeatMapViewer
                mapData={mapData}
                currency={event.currency}
                backgroundColor={backgroundColor}
                compact={compact}
                height="h-full"
                seatStatus={event.seatStatus}
                accentColor={primaryColor}
              />
            </div>
          </div>
        ) : event.eventType === 'ga' && ticketTiers.length > 0 ? (
          // GA Event - Ticket Tiers
          <div style={{ padding: padding.x }}>
            <h2
              className="text-sm font-medium mb-4 mt-4"
              style={{ color: mutedTextColor }}
            >
              {t.selectTickets}
            </h2>
            <TicketSelector
              tiers={ticketTiers}
              currency={event.currency}
              isDarkMode={isDark}
            />
          </div>
        ) : (
          // No tickets available
          <div className="flex-1 flex items-center justify-center p-6">
            <p style={{ color: mutedTextColor }}>
              No tickets available
            </p>
          </div>
        )}
      </div>

      {/* Selected Seats Summary (for seated events) */}
      {event.eventType === 'seated' && selectedSeats.length > 0 && (
        <div
          style={{
            padding: `${paddingMap.sm.y} ${padding.x}`,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <div className="flex flex-wrap gap-2 max-h-20 overflow-auto">
            {selectedSeats.map((seat) => (
              <span
                key={seat.seatId}
                className="text-xs px-2 py-1"
                style={{
                  backgroundColor: cardBgColor,
                  color: textColor,
                  borderRadius: borderRadius,
                }}
              >
                {seat.label} · {formatCurrency(seat.price, event.currency)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer with Checkout */}
      <footer
        style={{
          padding: `${padding.y} ${padding.x}`,
          borderTop: `1px solid ${borderColor}`,
          backgroundColor: cardBgColor,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            {hasSelection && (
              <>
                <p
                  className="text-sm"
                  style={{ color: mutedTextColor }}
                >
                  {t.total} ({event.eventType === 'seated'
                    ? `${selectedSeats.length} ${selectedSeats.length === 1 ? t.seat : t.seats}`
                    : `${getTotalTickets()} ${getTotalTickets() === 1 ? t.ticket : t.tickets}`
                  })
                </p>
                <p
                  className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}
                  style={{ color: textColor }}
                >
                  {isFreeEvent ? t.free : formatCurrency(totalPrice, event.currency)}
                </p>
              </>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={!hasSelection}
            className={`${compact ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-base'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              backgroundColor: primaryColor,
              color: buttonTextColor,
              borderRadius: buttonBorderRadius,
            }}
          >
            {hasSelection
              ? (isFreeEvent ? t.register : t.checkout)
              : t.selectToCheckout
            }
          </button>
        </div>

        {/* Powered by */}
        {!hidePoweredBy && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <span
              className="text-xs"
              style={{ color: subtleTextColor }}
            >
              {t.poweredBy}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: mutedTextColor }}
            >
              Seated
            </span>
          </div>
        )}
      </footer>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        eventId={event.id}
        eventName={event.name}
        eventDate={formatDate(event.startDate, language)}
        eventTime={formatTime(event.startTime) || ''}
        selectedSeats={selectedSeats}
        selectedTickets={selectedTickets}
        totalPrice={totalPrice}
        currency={event.currency}
        themeColor={backgroundColor}
        whiteLabelTheme={event.whiteLabelTheme}
        language={language}
        onSuccess={handleCheckoutSuccess}
        embedStyles={{
          primaryColor: primaryColor,
          backgroundColor: backgroundColor,
          borderRadius: borderRadius,
          buttonBorderRadius: buttonBorderRadius,
        }}
      />
    </div>
  );
}
