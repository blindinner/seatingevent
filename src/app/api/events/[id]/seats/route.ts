import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch current seat status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Create fresh client per request (same pattern as working debug endpoint)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Query paid bookings
    const { data: paidBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, seat_ids')
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    if (bookingsError) {
      console.error('[Seats API] Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch seat status' }, { status: 500 });
    }

    // Query pending bookings for locked seats
    const { data: pendingBookings } = await supabase
      .from('bookings')
      .select('id, seat_ids, created_at')
      .eq('event_id', eventId)
      .eq('payment_status', 'pending');

    // Build seat status
    const seatStatus: Record<string, string> = {};

    // Mark paid seats as sold
    for (const booking of paidBookings || []) {
      for (const seatId of booking.seat_ids || []) {
        seatStatus[seatId] = 'sold';
      }
    }

    // Mark pending seats as locked (if within 15 minutes)
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    for (const booking of pendingBookings || []) {
      const createdAt = new Date(booking.created_at).getTime();
      if (createdAt > fifteenMinutesAgo) {
        for (const seatId of booking.seat_ids || []) {
          if (!seatStatus[seatId]) {
            seatStatus[seatId] = 'locked';
          }
        }
      }
    }

    return NextResponse.json({ seatStatus }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Fetch seat status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
