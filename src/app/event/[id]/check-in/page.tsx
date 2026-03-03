'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/auth';

interface Attendee {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  ticketCode: string | null;
  seatCount: number;
  seatIds: string[];
  checkedInAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface EventInfo {
  id: string;
  name: string;
  userId: string;
}

export default function CheckInPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch event and attendees
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/signin?redirect=/event/${eventId}/check-in`);
      return;
    }

    async function fetchData() {
      try {
        const supabase = getSupabaseClient();

        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, name, user_id')
          .eq('id', eventId)
          .single();

        if (eventError || !eventData) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        // Check ownership
        if (eventData.user_id !== user!.id) {
          router.push(`/event/${eventId}`);
          return;
        }

        setEvent({
          id: eventData.id,
          name: eventData.name,
          userId: eventData.user_id,
        });

        // Fetch paid attendees
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('event_id', eventId)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false });

        if (!bookingsError && bookings) {
          const mapped: Attendee[] = bookings.map(b => ({
            id: b.id,
            customerName: b.customer_name,
            customerEmail: b.customer_email,
            ticketCode: b.ticket_code,
            seatCount: b.seat_count,
            seatIds: b.seat_ids || [],
            checkedInAt: b.checked_in_at,
            createdAt: b.created_at,
            metadata: b.metadata || {},
          }));
          setAttendees(mapped);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load check-in data');
        setLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading, eventId, router]);

  // Filter attendees by search
  const filteredAttendees = attendees.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.customerName?.toLowerCase().includes(query) ||
      a.customerEmail?.toLowerCase().includes(query) ||
      a.ticketCode?.toLowerCase().includes(query)
    );
  });

  // Check-in stats
  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter(a => a.checkedInAt).length;
  const totalTickets = attendees.reduce((sum, a) => sum + a.seatCount, 0);
  const checkedInTickets = attendees.filter(a => a.checkedInAt).reduce((sum, a) => sum + a.seatCount, 0);

  // Handle check-in
  const handleCheckIn = useCallback(async (attendee: Attendee) => {
    if (attendee.checkedInAt) return; // Already checked in

    setCheckingIn(attendee.id);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', attendee.id);

      if (updateError) throw updateError;

      // Update local state
      setAttendees(prev =>
        prev.map(a =>
          a.id === attendee.id ? { ...a, checkedInAt: new Date().toISOString() } : a
        )
      );

      setSuccessMessage(`${attendee.customerName || 'Guest'} checked in!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Check-in error:', err);
      setError('Failed to check in attendee');
    } finally {
      setCheckingIn(null);
    }
  }, []);

  // Handle undo check-in
  const handleUndoCheckIn = useCallback(async (attendee: Attendee) => {
    if (!attendee.checkedInAt) return;

    setCheckingIn(attendee.id);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ checked_in_at: null })
        .eq('id', attendee.id);

      if (updateError) throw updateError;

      setAttendees(prev =>
        prev.map(a =>
          a.id === attendee.id ? { ...a, checkedInAt: null } : a
        )
      );
    } catch (err) {
      console.error('Undo check-in error:', err);
      setError('Failed to undo check-in');
    } finally {
      setCheckingIn(null);
    }
  }, []);

  // Quick check-in by ticket code
  const handleQuickCheckIn = useCallback(async () => {
    const code = searchQuery.trim().toUpperCase();
    if (!code) return;

    const attendee = attendees.find(a => a.ticketCode?.toUpperCase() === code);
    if (!attendee) {
      setError(`Ticket code "${code}" not found`);
      return;
    }

    if (attendee.checkedInAt) {
      setError(`${attendee.customerName || 'This ticket'} is already checked in`);
      return;
    }

    await handleCheckIn(attendee);
    setSearchQuery('');
  }, [searchQuery, attendees, handleCheckIn]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading check-in...
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/my-events')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to My Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a09]">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 bg-[#0a0a09]/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/event/${eventId}/dashboard`}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Check-in</h1>
                <p className="text-sm text-white/50">{event?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-white/50">
                <span className="text-white font-semibold">{checkedInCount}</span> / {totalAttendees} checked in
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalAttendees}</div>
            <div className="text-xs text-white/50">Total Orders</div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{checkedInCount}</div>
            <div className="text-xs text-white/50">Checked In</div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalTickets}</div>
            <div className="text-xs text-white/50">Total Tickets</div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{checkedInTickets}</div>
            <div className="text-xs text-white/50">Tickets In</div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && event && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400/70 hover:text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Search / Scan */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or ticket code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickCheckIn();
                }}
                className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/20 text-lg"
                autoFocus
              />
            </div>
            <button
              onClick={handleQuickCheckIn}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Check In
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">Enter ticket code and press Enter to quick check-in</p>
        </div>

        {/* Attendee List */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.08]">
            <h2 className="text-sm font-medium text-white">
              Attendees {filteredAttendees.length !== attendees.length && `(${filteredAttendees.length} of ${attendees.length})`}
            </h2>
          </div>

          {filteredAttendees.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              {attendees.length === 0 ? 'No attendees yet' : 'No attendees match your search'}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredAttendees.map((attendee) => {
                const seats = (attendee.metadata?.seats as Array<{ label?: string }>) || [];
                const seatLabels = seats.map(s => s.label).filter(Boolean).join(', ') || `${attendee.seatCount} ticket(s)`;
                const isCheckedIn = !!attendee.checkedInAt;
                const isProcessing = checkingIn === attendee.id;

                return (
                  <div
                    key={attendee.id}
                    className={`p-4 flex items-center gap-4 ${isCheckedIn ? 'bg-green-500/5' : 'hover:bg-white/[0.02]'}`}
                  >
                    {/* Status indicator */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCheckedIn ? 'bg-green-500/20' : 'bg-white/[0.06]'
                    }`}>
                      {isCheckedIn ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium text-white/60">
                          {attendee.customerName?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {attendee.customerName || 'Unknown'}
                        </span>
                        {isCheckedIn && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                            IN
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/50 truncate">{attendee.customerEmail}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {seatLabels} · <span className="font-mono">{attendee.ticketCode}</span>
                      </div>
                    </div>

                    {/* Action */}
                    {isCheckedIn ? (
                      <button
                        onClick={() => handleUndoCheckIn(attendee)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Undo
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckIn(attendee)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                          </svg>
                        )}
                        Check In
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
