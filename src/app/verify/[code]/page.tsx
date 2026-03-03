'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface TicketData {
  valid: boolean;
  error?: string;
  ticket?: {
    code: string;
    customerName: string;
    customerEmail: string;
    seatCount: number;
    seats: string[];
    checkedInAt: string | null;
    isCheckedIn: boolean;
  };
  event?: {
    id: string;
    name: string;
    date: string;
    time: string | null;
    location: string | null;
  };
}

export default function VerifyTicketPage() {
  const params = useParams();
  const code = params.code as string;

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyTicket() {
      try {
        const res = await fetch(`/api/verify?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        setTicketData(data);
      } catch {
        setTicketData({ valid: false, error: 'Failed to verify ticket' });
      } finally {
        setLoading(false);
      }
    }

    verifyTicket();
  }, [code]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setCheckInError(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state to show checked in
        setTicketData(prev => prev ? {
          ...prev,
          ticket: prev.ticket ? {
            ...prev.ticket,
            isCheckedIn: true,
            checkedInAt: data.checkedInAt,
          } : undefined,
        } : null);
      } else {
        setCheckInError(data.error || 'Failed to check in');
      }
    } catch {
      setCheckInError('Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatCheckedInTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Verifying ticket...</p>
        </div>
      </div>
    );
  }

  // Invalid ticket
  if (!ticketData?.valid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Ticket</h1>
            <p className="text-red-400 mb-6">{ticketData?.error || 'This ticket could not be verified'}</p>
            <p className="text-white/40 text-sm font-mono">{code}</p>
          </div>
        </div>
      </div>
    );
  }

  const { ticket, event } = ticketData;

  // Already checked in
  if (ticket?.isCheckedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Already Checked In</h1>
            <p className="text-yellow-400 mb-4">This ticket was already used</p>
            <p className="text-white/60 text-sm mb-6">
              Checked in at {ticket.checkedInAt ? formatCheckedInTime(ticket.checkedInAt) : 'unknown time'}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left mb-4">
              <p className="text-white font-medium">{ticket.customerName}</p>
              <p className="text-white/50 text-sm">{ticket.customerEmail}</p>
              {ticket.seats.length > 0 && (
                <p className="text-white/50 text-sm mt-2">
                  Seats: {ticket.seats.join(', ')}
                </p>
              )}
            </div>

            <p className="text-white/40 text-sm font-mono">{ticket.code}</p>
          </div>
        </div>
      </div>
    );
  }

  // Valid ticket - ready to check in
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Valid Ticket</h1>
          <p className="text-green-400 mb-6">Ready to check in</p>

          {/* Event Info */}
          {event && (
            <div className="bg-white/5 rounded-xl p-4 text-left mb-4">
              <h2 className="text-white font-semibold mb-2">{event.name}</h2>
              <p className="text-white/60 text-sm">
                {formatDate(event.date)}
                {event.time && ` at ${formatTime(event.time)}`}
              </p>
              {event.location && (
                <p className="text-white/50 text-sm mt-1">{event.location}</p>
              )}
            </div>
          )}

          {/* Guest Info */}
          {ticket && (
            <div className="bg-white/5 rounded-xl p-4 text-left mb-6">
              <p className="text-white font-medium">{ticket.customerName}</p>
              <p className="text-white/50 text-sm">{ticket.customerEmail}</p>
              {ticket.seats.length > 0 && (
                <p className="text-white/70 text-sm mt-2">
                  <span className="text-white/40">Seats:</span> {ticket.seats.join(', ')}
                </p>
              )}
              {ticket.seatCount > 0 && (
                <p className="text-white/50 text-sm mt-1">
                  {ticket.seatCount} ticket{ticket.seatCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {checkInError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{checkInError}</p>
            </div>
          )}

          {/* Check In Button */}
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-lg font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {checkingIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Check In Guest
              </>
            )}
          </button>

          <p className="text-white/40 text-sm font-mono mt-4">{ticket?.code}</p>
        </div>
      </div>
    </div>
  );
}
