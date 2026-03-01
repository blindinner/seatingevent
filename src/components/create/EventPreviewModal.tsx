'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EventType, TicketTier } from '@/types/event';
import type { MapData } from '@/types/map';
import { SeatMapViewer } from '@/components/event/SeatMapViewer';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

interface EventPreviewData {
  name: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  locationCoords: { lat: number; lng: number } | null;
  coverImage: string | null;
  eventType: EventType;
  ticketTiers: TicketTier[];
  currency: string;
  themeColor: string;
  themeFont: string;
}

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: EventPreviewData;
  mapData: MapData | null;
}

export function EventPreviewModal({ isOpen, onClose, eventData, mapData }: EventPreviewModalProps) {
  const { selectedSeats, getTotalPrice, clearSelection } = useSeatSelectionStore();

  const handleGetTickets = () => {
    if (selectedSeats.length > 0) {
      // In preview mode, just show a message - no actual checkout
      alert(`Preview: ${selectedSeats.length} seat(s) selected for ${formatCurrency(getTotalPrice(), eventData.currency)}. Checkout will work on the live event page.`);
    }
  };

  // Parse date for display
  const parseDateInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      fullDate: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    };
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const startDateInfo = parseDateInfo(eventData.startDate);
  const endDateInfo = parseDateInfo(eventData.endDate);

  const fontClass = eventData.themeFont === 'serif' ? 'font-serif' : eventData.themeFont === 'mono' ? 'font-mono' : 'font-sans';

  // Clear selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearSelection();
    }
  }, [isOpen, clearSelection]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col">
      {/* Preview Banner */}
      <div className="bg-indigo-600 text-white py-2 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[14px] font-medium">Preview Mode - This is how attendees will see your event</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-medium transition-colors"
        >
          Exit Preview
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content - Mirrors create page layout */}
      <div className="flex-1 overflow-auto min-h-screen transition-colors duration-500" style={{ backgroundColor: eventData.themeColor }}>
        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.03]" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.02]" />
        </div>

        {/* Navigation */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.04]" style={{ backgroundColor: `${eventData.themeColor}cc` }}>
          <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white" />
              <span className="text-[16px] font-medium text-white/90">seated</span>
            </div>
            {/* Show selection summary in nav when seats selected */}
            {selectedSeats.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-white/60">
                  {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} · {formatCurrency(getTotalPrice(), eventData.currency)}
                </span>
                <button
                  onClick={handleGetTickets}
                  className="h-10 px-6 text-[14px] font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                >
                  Get Tickets
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="relative max-w-6xl mx-auto px-8 py-12 pb-32">
          <div className="flex gap-12">
            {/* Left Column - Cover Image */}
            <div className="w-[340px] flex-shrink-0 space-y-5">
              {/* Cover Image */}
              <div className="relative rounded-3xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                {eventData.coverImage ? (
                  <div className="aspect-[4/5]">
                    <img src={eventData.coverImage} alt="Event cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/5] flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5">
                      <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <p className="text-[15px] text-white/50 mb-1">No cover image</p>
                  </div>
                )}
              </div>

              {/* Selection Summary - Only show when seats selected */}
              {selectedSeats.length > 0 && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                  <div className="p-5 border-b border-white/[0.03]">
                    <h3 className="text-[15px] font-medium text-white/70">Your Selection</h3>
                  </div>
                  <div className="p-5 space-y-3 max-h-56 overflow-y-auto">
                    {selectedSeats.map((seat) => (
                      <div key={seat.seatId} className="flex justify-between text-[14px]">
                        <span className="text-white/80">{seat.label}</span>
                        <span className="text-white/60">{formatCurrency(seat.price, eventData.currency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 border-t border-white/[0.03]">
                    <div className="flex justify-between text-[17px] font-semibold mb-4">
                      <span className="text-white">Total</span>
                      <span className="text-white">{formatCurrency(getTotalPrice(), eventData.currency)}</span>
                    </div>
                    <button
                      onClick={handleGetTickets}
                      className="w-full py-3.5 text-[15px] font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                    >
                      Get Tickets
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="flex-1 space-y-6">
              {/* Event Name - Larger */}
              <div>
                <h1 className={`text-[3rem] font-bold text-white tracking-tight leading-tight ${fontClass}`}>
                  {eventData.name || 'Event Name'}
                </h1>
              </div>

              {/* Date/Time - Luma style with date widget */}
              <div className="flex items-start gap-5">
                {/* Date Widget */}
                <div className="w-16 h-16 rounded-xl bg-white/[0.08] backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">{startDateInfo.month}</span>
                  <span className="text-[24px] font-bold text-white leading-none">{startDateInfo.day}</span>
                </div>
                {/* Date Details */}
                <div className="flex-1 pt-1">
                  <p className="text-[17px] text-white font-medium">{startDateInfo.fullDate}</p>
                  <p className="text-[15px] text-white/60 mt-1">
                    {formatTime(eventData.startTime)} - {formatTime(eventData.endTime)}
                  </p>
                </div>
              </div>

              {/* Location - Luma style */}
              {eventData.location && (
                <div className="flex items-start gap-5">
                  {/* Location Icon */}
                  <div className="w-16 h-16 rounded-xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  {/* Location Details */}
                  <div className="flex-1 pt-1">
                    <p className="text-[17px] text-white font-medium">{eventData.location.split(',')[0]}</p>
                    {eventData.location.includes(',') && (
                      <p className="text-[15px] text-white/60 mt-1">{eventData.location.split(',').slice(1).join(',').trim()}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Description - Larger card */}
              {eventData.description && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                  <div className="px-6 py-5">
                    <h3 className="text-[13px] text-white/40 uppercase tracking-wider font-medium mb-3">About Event</h3>
                    <p className="text-[16px] text-white/90 leading-relaxed whitespace-pre-wrap">{eventData.description}</p>
                  </div>
                </div>
              )}

              {/* Location Map - Larger */}
              {eventData.location && eventData.locationCoords && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                  <div className="px-6 py-5">
                    <h3 className="text-[13px] text-white/40 uppercase tracking-wider font-medium mb-1">Location</h3>
                    <p className="text-[16px] text-white/90">{eventData.location}</p>
                  </div>
                  <div className="relative">
                    <iframe
                      src={`https://www.google.com/maps?q=${encodeURIComponent(eventData.location)}&z=15&output=embed`}
                      className="w-full h-56 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}

              {/* Seat Map - Larger and more prominent */}
              {eventData.eventType === 'seated' && mapData && (
                <div className="rounded-2xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                  <div className="px-6 py-5 border-b border-white/[0.03]">
                    <h3 className="text-[13px] text-white/40 uppercase tracking-wider font-medium mb-1">Select Your Seats</h3>
                    <p className="text-[15px] text-white/70">Click on a seat to select it</p>
                  </div>
                  <SeatMapViewer
                    mapData={mapData}
                    currency={eventData.currency}
                    backgroundColor={eventData.themeColor}
                    compact={true}
                    height="h-[420px]"
                  />
                </div>
              )}

              {/* No map placeholder */}
              {eventData.eventType === 'seated' && !mapData && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-dashed border-white/10 p-10 text-center">
                  <svg className="w-14 h-14 text-white/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <p className="text-[16px] text-white/40">No seat map created yet</p>
                  <p className="text-[14px] text-white/30 mt-2">Create a seat map to enable seat selection</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

    </div>,
    document.body
  );
}
