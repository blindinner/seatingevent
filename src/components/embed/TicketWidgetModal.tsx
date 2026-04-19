'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Performance, WidgetTheme } from './TicketWidget';
import type { PublicEvent } from '@/types/event';
import type { MapData } from '@/types/map';
import { SeatMapViewer } from '@/components/event/SeatMapViewer';
import { TicketSelector } from '@/components/event/TicketSelector';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';

interface TicketWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  performance: Performance;
  theme?: WidgetTheme;
  apiEndpoint?: string;
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

// Format time for display
function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Format date for display
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function TicketWidgetModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  performance,
  theme = {},
  apiEndpoint,
}: TicketWidgetModalProps) {
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<PublicEvent | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [seatStatus, setSeatStatus] = useState<Record<string, string>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    selectedSeats,
    selectedTickets,
    getTotalPrice,
    getTotalTickets,
    clearSelection,
    clearTickets,
  } = useSeatSelectionStore();

  // Theme
  const primaryColor = theme.primaryColor || '#10b981';
  const backgroundColor = theme.backgroundColor || '#1a1a1a';
  const isDark = !isLightColor(backgroundColor);
  const buttonTextColor = isLightColor(primaryColor) ? '#000' : '#fff';

  // Determine if user has selected something
  const hasSelection = eventData?.eventType === 'seated'
    ? selectedSeats.length > 0
    : getTotalTickets() > 0;

  const totalPrice = getTotalPrice();
  const isFreeEvent = totalPrice === 0 && hasSelection;

  // Fetch event data when modal opens
  const fetchEventData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use custom API endpoint or default
      const endpoint = apiEndpoint || `/api/events/${eventId}`;
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) throw new Error('Failed to load event');

      const data = await res.json();
      setEventData(data.event);
      setMapData(data.mapData || null);
      setSeatStatus(data.event?.seatStatus || {});
    } catch (err) {
      setError('Unable to load event data. Please try again.');
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, apiEndpoint]);

  useEffect(() => {
    if (isOpen) {
      fetchEventData();
      // Clear any previous selection when opening
      clearSelection();
      clearTickets();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, fetchEventData, clearSelection, clearTickets]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !checkoutOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, checkoutOpen]);

  const handleCheckout = () => {
    if (hasSelection) {
      setCheckoutOpen(true);
    }
  };

  const handleCheckoutSuccess = () => {
    clearSelection();
    clearTickets();
    setCheckoutOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="absolute inset-4 md:inset-8 lg:inset-12 rounded-3xl overflow-hidden flex flex-col"
            style={{ backgroundColor }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
            >
              <div>
                <h2
                  className="text-[18px] font-semibold"
                  style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                >
                  {eventName}
                </h2>
                <p
                  className="text-[14px] mt-0.5"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                >
                  {formatDate(performance.date)} · {formatTime(performance.time)}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 animate-spin mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      style={{ color: primaryColor }}
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <p
                      className="text-[14px] mt-3"
                      style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                    >
                      Loading seat map...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-6">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
                    >
                      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p
                      className="text-[16px] font-medium mb-2"
                      style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                    >
                      Something went wrong
                    </p>
                    <p
                      className="text-[14px] mb-4"
                      style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                    >
                      {error}
                    </p>
                    <button
                      onClick={fetchEventData}
                      className="px-4 py-2 text-[14px] font-medium rounded-lg"
                      style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : eventData?.eventType === 'seated' && mapData ? (
                <>
                  {/* Seat Map */}
                  <div className="flex-1 min-h-0">
                    <SeatMapViewer
                      mapData={mapData}
                      currency={eventData.currency}
                      backgroundColor={backgroundColor}
                      compact={false}
                      height="h-full"
                      seatStatus={seatStatus}
                      accentColor={primaryColor}
                    />
                  </div>

                  {/* Selection Sidebar - Desktop */}
                  <div
                    className="hidden lg:flex flex-col w-80 border-l flex-shrink-0"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <div
                      className="p-5 border-b"
                      style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                    >
                      <h3
                        className="text-[14px] font-medium"
                        style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                      >
                        Your Selection
                      </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                      {selectedSeats.length === 0 ? (
                        <p
                          className="text-[14px] text-center py-8"
                          style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                        >
                          Click on seats to select them
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedSeats.map((seat) => (
                            <div
                              key={seat.seatId}
                              className="flex items-center justify-between text-[14px] py-2 px-3 rounded-lg"
                              style={{
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                              }}
                            >
                              <span style={{ color: isDark ? '#fff' : '#1a1a1a' }}>{seat.label}</span>
                              <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                {formatCurrency(seat.price, eventData.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Checkout Footer */}
                    <div
                      className="p-5 border-t"
                      style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className="text-[14px]"
                          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                        >
                          Total
                        </span>
                        <span
                          className="text-[20px] font-semibold"
                          style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                        >
                          {formatCurrency(totalPrice, eventData.currency)}
                        </span>
                      </div>
                      <button
                        onClick={handleCheckout}
                        disabled={!hasSelection}
                        className="w-full py-3.5 text-[15px] font-semibold rounded-xl transition-all"
                        style={{
                          backgroundColor: hasSelection ? primaryColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: hasSelection ? buttonTextColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                          cursor: hasSelection ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {hasSelection ? 'Continue to Checkout' : 'Select seats to continue'}
                      </button>
                    </div>
                  </div>
                </>
              ) : eventData?.eventType === 'ga' && eventData.ticketTiers ? (
                // GA Event - Ticket Selector
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-md mx-auto">
                      <h3
                        className="text-[16px] font-medium mb-4"
                        style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                      >
                        Select Tickets
                      </h3>
                      <TicketSelector
                        tiers={eventData.ticketTiers}
                        currency={eventData.currency}
                        isDarkMode={isDark}
                      />
                    </div>
                  </div>

                  {/* GA Checkout Footer */}
                  <div
                    className="p-5 border-t"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                      <div>
                        <p
                          className="text-[13px]"
                          style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                        >
                          {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''} selected
                        </p>
                        <p
                          className="text-[20px] font-semibold"
                          style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                        >
                          {isFreeEvent ? 'Free' : formatCurrency(totalPrice, eventData.currency)}
                        </p>
                      </div>
                      <button
                        onClick={handleCheckout}
                        disabled={!hasSelection}
                        className="px-8 py-3.5 text-[15px] font-semibold rounded-xl transition-all"
                        style={{
                          backgroundColor: hasSelection ? primaryColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: hasSelection ? buttonTextColor : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                          cursor: hasSelection ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {hasSelection ? 'Checkout' : 'Select tickets'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p
                    className="text-[14px]"
                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                  >
                    No seating information available
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Footer */}
            {!loading && !error && hasSelection && (
              <div
                className="lg:hidden p-4 border-t"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p
                      className="text-[12px]"
                      style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                    >
                      {eventData?.eventType === 'seated'
                        ? `${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''}`
                        : `${getTotalTickets()} ticket${getTotalTickets() !== 1 ? 's' : ''}`}
                    </p>
                    <p
                      className="text-[18px] font-semibold"
                      style={{ color: isDark ? '#fff' : '#1a1a1a' }}
                    >
                      {isFreeEvent ? 'Free' : formatCurrency(totalPrice, eventData?.currency || 'USD')}
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="px-6 py-3 text-[15px] font-semibold rounded-xl"
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Checkout Modal */}
          {eventData && (
            <CheckoutModal
              isOpen={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              eventId={eventId}
              eventName={eventName}
              eventDate={formatDate(performance.date)}
              eventTime={formatTime(performance.time)}
              selectedSeats={selectedSeats}
              selectedTickets={selectedTickets}
              totalPrice={totalPrice}
              currency={eventData.currency}
              themeColor={backgroundColor}
              onSuccess={handleCheckoutSuccess}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
