import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Fetch current seat status for an event
// This queries the bookings table directly (source of truth) instead of relying on seat_status field
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Query paid bookings directly - this is the source of truth
    console.log('[Seats API] Querying bookings for event:', eventId);

    const { data: paidBookings, error: bookingsError } = await supabaseAdmin.client
      .from('bookings')
      .select('id, seat_ids')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    console.log('[Seats API] Query result:', {
      count: paidBookings?.length,
      bookings: paidBookings,
      error: bookingsError
    });

    if (bookingsError) {
      console.error('[Seats API] Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch seat status' }, { status: 500 });
    }

    // Query pending bookings to check for locked seats (active checkout sessions)
    const { data: pendingBookings, error: pendingError } = await supabaseAdmin.client
      .from('bookings')
      .select('id, seat_ids, created_at')
      .eq('event_id', eventId)
      .eq('payment_status', 'pending');

    if (pendingError) {
      console.error('[Seats API] Error fetching pending bookings:', pendingError);
      // Continue without pending - sold seats are more important
    }

    // Build seat status from bookings
    const seatStatus: Record<string, string> = {};

    // Mark all paid booking seats as sold
    for (const booking of paidBookings || []) {
      for (const seatId of booking.seat_ids || []) {
        seatStatus[seatId] = 'sold';
      }
    }

    // Mark pending booking seats as locked (if not older than 15 minutes)
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    for (const booking of pendingBookings || []) {
      const createdAt = new Date(booking.created_at).getTime();
      if (createdAt > fifteenMinutesAgo) {
        for (const seatId of booking.seat_ids || []) {
          // Don't override sold status
          if (!seatStatus[seatId]) {
            seatStatus[seatId] = 'locked';
          }
        }
      }
    }

    return NextResponse.json({ seatStatus }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Fetch seat status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
