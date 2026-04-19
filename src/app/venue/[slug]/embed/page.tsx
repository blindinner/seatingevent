'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicEvent } from '@/types/event';
import type { MapData } from '@/types/map';
import { SeatMapViewer } from '@/components/event/SeatMapViewer';
import { TicketSelector } from '@/components/event/TicketSelector';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

interface Venue {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
}

interface EventWithStatus extends PublicEvent {
  ticketsSold?: Record<string, number>;
}

// Helper to check if a color is light
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

function formatTime(time: string | null) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function VenueEmbedPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventWithStatus[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithStatus | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);
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

  // Theme
  const primaryColor = venue?.brandColor || selectedEvent?.accentColor || '#10b981';
  const backgroundColor = '#ffffff';
  const isDark = false; // Light theme for embeds
  const buttonTextColor = isLightColor(primaryColor) ? '#000' : '#fff';

  // Selection state
  const hasSelection = selectedEvent?.eventType === 'seated'
    ? selectedSeats.length > 0
    : getTotalTickets() > 0;
  const totalPrice = getTotalPrice();

  // Fetch venue and events
  useEffect(() => {
    async function fetchVenueData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/venues/${slug}/events`);
        if (!res.ok) {
          throw new Error('Venue not found');
        }

        const data = await res.json();
        setVenue(data.venue);
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchVenueData();
  }, [slug]);

  // Fetch map data when selecting a seated event
  const fetchMapData = useCallback(async (mapId: string) => {
    setLoadingMap(true);
    try {
      const res = await fetch(`/api/maps/${mapId}`);
      if (res.ok) {
        const data = await res.json();
        setMapData(data);
      }
    } catch (err) {
      console.error('Failed to load map:', err);
    } finally {
      setLoadingMap(false);
    }
  }, []);

  // Handle event selection
  const handleSelectEvent = (event: EventWithStatus) => {
    // Clear previous selection
    clearSelection();
    clearTickets();
    setMapData(null);

    setSelectedEvent(event);

    // Load map if seated event
    if (event.eventType === 'seated' && event.mapId) {
      fetchMapData(event.mapId);
    }
  };

  // Handle back to event list
  const handleBack = () => {
    setSelectedEvent(null);
    setMapData(null);
    clearSelection();
    clearTickets();
  };

  // Handle checkout
  const handleCheckout = () => {
    if (hasSelection && selectedEvent) {
      setCheckoutOpen(true);
    }
  };

  const handleCheckoutSuccess = () => {
    clearSelection();
    clearTickets();
    setCheckoutOpen(false);
    setSelectedEvent(null);
  };

  // Calculate ticket availability for GA events
  const getTicketTiersWithAvailability = (event: EventWithStatus) => {
    if (!event.ticketTiers) return [];

    return event.ticketTiers.map(tier => {
      const sold = event.ticketsSold?.[tier.name] || 0;
      const remaining = tier.quantity === -1 ? -1 : Math.max(0, tier.quantity - sold);
      return { ...tier, remaining, sold };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-500 mt-3">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-zinc-900">Venue not found</p>
          <p className="text-sm text-zinc-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100 sticky top-0 bg-white z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedEvent && (
              <button
                onClick={handleBack}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {venue.logoUrl ? (
              <img src={venue.logoUrl} alt={venue.name} className="h-8 w-auto" />
            ) : (
              <span className="font-semibold text-zinc-900">{venue.name}</span>
            )}
          </div>

          {/* Selection summary */}
          {selectedEvent && hasSelection && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600">
                {selectedEvent.eventType === 'seated'
                  ? `${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''}`
                  : `${getTotalTickets()} ticket${getTotalTickets() !== 1 ? 's' : ''}`
                }
              </span>
              <span className="font-semibold text-zinc-900">
                {formatCurrency(totalPrice, selectedEvent.currency)}
              </span>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!selectedEvent ? (
          // Event List View
          <motion.div
            key="event-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4"
          >
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              Upcoming Events
            </h2>

            {events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const dateInfo = formatDate(event.startDate);
                  const timeStr = formatTime(event.startTime);
                  const minPrice = event.ticketTiers
                    ? Math.min(...event.ticketTiers.map(t => t.price))
                    : 0;

                  return (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className="w-full text-left p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex gap-4">
                        {/* Date badge */}
                        <div className="w-14 h-14 rounded-xl bg-zinc-100 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">
                            {dateInfo.month}
                          </span>
                          <span className="text-xl font-bold text-zinc-900 leading-none">
                            {dateInfo.day}
                          </span>
                        </div>

                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-900 truncate group-hover:text-zinc-700">
                            {event.name}
                          </h3>
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {dateInfo.weekday} · {timeStr}
                            {event.location && ` · ${event.location.split(',')[0]}`}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${primaryColor}15`,
                                color: primaryColor,
                              }}
                            >
                              {event.eventType === 'seated' ? 'Select Seats' : 'General Admission'}
                            </span>
                            <span className="text-sm font-medium text-zinc-700">
                              {minPrice === 0 ? 'Free' : `From ${formatCurrency(minPrice, event.currency)}`}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Powered by */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <span className="text-xs text-zinc-400">Powered by</span>
              <span className="text-xs font-medium text-zinc-500">Seated</span>
            </div>
          </motion.div>
        ) : (
          // Event Detail View
          <motion.div
            key="event-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-[calc(100vh-57px)]"
          >
            {/* Event Header */}
            <div className="p-4 border-b border-zinc-100">
              <h2 className="text-xl font-semibold text-zinc-900">{selectedEvent.name}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {formatDate(selectedEvent.startDate).full} · {formatTime(selectedEvent.startTime)}
                {selectedEvent.location && ` · ${selectedEvent.location}`}
              </p>
            </div>

            {/* Ticket Selection */}
            <div className="flex-1 overflow-auto">
              {selectedEvent.eventType === 'seated' ? (
                // Seated Event - Show Map
                <div className="h-full flex flex-col">
                  {loadingMap ? (
                    <div className="flex-1 flex items-center justify-center">
                      <svg className="w-8 h-8 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : mapData ? (
                    <div className="flex-1">
                      <SeatMapViewer
                        mapData={mapData}
                        currency={selectedEvent.currency}
                        backgroundColor="#ffffff"
                        compact={false}
                        height="h-full"
                        seatStatus={selectedEvent.seatStatus}
                        accentColor={primaryColor}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-zinc-500">Seat map not available</p>
                    </div>
                  )}
                </div>
              ) : (
                // GA Event - Show Ticket Tiers
                <div className="p-4">
                  <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
                    Select Tickets
                  </h3>
                  <TicketSelector
                    tiers={getTicketTiersWithAvailability(selectedEvent)}
                    currency={selectedEvent.currency}
                    isDarkMode={false}
                  />
                </div>
              )}
            </div>

            {/* Footer with Checkout */}
            <div className="border-t border-zinc-100 p-4 bg-white">
              {selectedEvent.eventType === 'seated' && selectedSeats.length > 0 && (
                <div className="mb-3 max-h-24 overflow-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <span
                        key={seat.seatId}
                        className="text-xs px-2 py-1 rounded-lg bg-zinc-100 text-zinc-700"
                      >
                        {seat.label} · {formatCurrency(seat.price, selectedEvent.currency)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  {hasSelection && (
                    <>
                      <p className="text-sm text-zinc-500">
                        {selectedEvent.eventType === 'seated'
                          ? `${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''}`
                          : `${getTotalTickets()} ticket${getTotalTickets() !== 1 ? 's' : ''}`
                        }
                      </p>
                      <p className="text-xl font-semibold text-zinc-900">
                        {totalPrice === 0 ? 'Free' : formatCurrency(totalPrice, selectedEvent.currency)}
                      </p>
                    </>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!hasSelection}
                  className="px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: hasSelection ? primaryColor : '#e5e5e5',
                    color: hasSelection ? buttonTextColor : '#999',
                  }}
                >
                  {hasSelection ? 'Continue to Checkout' : 'Select tickets'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      {selectedEvent && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          eventDate={formatDate(selectedEvent.startDate).full}
          eventTime={formatTime(selectedEvent.startTime) || ''}
          selectedSeats={selectedSeats}
          selectedTickets={selectedTickets}
          totalPrice={totalPrice}
          currency={selectedEvent.currency}
          themeColor={selectedEvent.themeColor || '#ffffff'}
          whiteLabelTheme={selectedEvent.whiteLabelTheme}
          language={selectedEvent.language}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
