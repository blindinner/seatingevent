'use client';

import type { PublicEvent } from '@/types/event';
import type { MapData } from '@/types/map';
import { useSeatSelectionStore } from '@/stores/seatSelectionStore';
import { formatCurrency } from '@/lib/currency';

interface SelectionPanelProps {
  event: PublicEvent;
  mapData: MapData | null;
  onGetTickets: () => void;
}

export function SelectionPanel({ event, mapData, onGetTickets }: SelectionPanelProps) {
  const { selectedSeats, selectedTickets, clearSelection, clearTickets, getTotalPrice, getTotalSeats, getTotalTickets } = useSeatSelectionStore();

  const isSeatedEvent = event.eventType === 'seated';
  const hasSelection = isSeatedEvent ? selectedSeats.length > 0 : getTotalTickets() > 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] overflow-hidden">
      {/* Event Summary */}
      <div className="p-5 border-b border-white/[0.06]">
        <h3 className="text-[16px] font-semibold text-white mb-2">{event.name}</h3>
        <div className="space-y-1 text-[13px] text-white/60">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>{formatDate(event.startDate)}</span>
            {event.startTime && <span>at {formatTime(event.startTime)}</span>}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Selection Details */}
      {hasSelection && (
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-white/40 uppercase tracking-wider">
              {isSeatedEvent ? 'Selected Seats' : 'Selected Tickets'}
            </span>
            <button
              onClick={isSeatedEvent ? clearSelection : clearTickets}
              className="text-[12px] text-white/50 hover:text-white/80 transition-colors"
            >
              Clear
            </button>
          </div>

          {isSeatedEvent ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedSeats.map((seat) => (
                <div key={seat.seatId} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[14px] text-white">{seat.label}</span>
                    <span className="text-[12px] text-white/40 ml-2">{seat.category}</span>
                  </div>
                  <span className="text-[14px] text-white/70">
                    {formatCurrency(seat.price, event.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTickets.map((ticket) => (
                <div key={ticket.tierId} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[14px] text-white">{ticket.tierName}</span>
                    <span className="text-[12px] text-white/40 ml-2">x{ticket.quantity}</span>
                  </div>
                  <span className="text-[14px] text-white/70">
                    {formatCurrency(ticket.price * ticket.quantity, event.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Total and CTA */}
      <div className="p-5 space-y-4">
        {hasSelection && (
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-white/60">Total</span>
            <span className="text-[20px] font-semibold text-white">
              {formatCurrency(getTotalPrice(), event.currency)}
            </span>
          </div>
        )}

        <button
          onClick={onGetTickets}
          disabled={!hasSelection}
          className="w-full h-12 text-[15px] font-semibold rounded-full transition-colors bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasSelection ? 'Get Tickets' : (isSeatedEvent ? 'Select seats to continue' : 'Select tickets to continue')}
        </button>

        {!hasSelection && (
          <p className="text-center text-[12px] text-white/40">
            {isSeatedEvent
              ? 'Click on available seats in the map to select them'
              : 'Choose your ticket type and quantity above'}
          </p>
        )}
      </div>
    </div>
  );
}
