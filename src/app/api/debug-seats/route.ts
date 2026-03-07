import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Allow passing eventId as query param, default to test event
  const url = new URL(request.url);
  const eventId = url.searchParams.get('eventId') || '26d0da5c-05b1-46b1-8768-13685d593393';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const debug: Record<string, unknown> = {
    eventId,
    timestamp: new Date().toISOString(),
    architecture: 'bookings-table-single-source-of-truth',
  };

  if (!serviceKey) {
    return NextResponse.json({ error: 'No service key configured' }, { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get all bookings for this event
  const { data: allBookings, error: bookingsError } = await client
    .from('bookings')
    .select('id, seat_ids, payment_status, created_at, customer_name')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (bookingsError) {
    debug.error = bookingsError;
    return NextResponse.json(debug);
  }

  // Build seat status (same logic as API)
  const seatStatus: Record<string, string> = {};
  const paidBookings = allBookings?.filter(b => b.payment_status === 'paid') || [];
  const pendingBookings = allBookings?.filter(b => b.payment_status === 'pending') || [];
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

  for (const booking of paidBookings) {
    for (const seatId of booking.seat_ids || []) {
      seatStatus[seatId] = 'sold';
    }
  }

  for (const booking of pendingBookings) {
    const createdAt = new Date(booking.created_at).getTime();
    if (createdAt > fifteenMinutesAgo) {
      for (const seatId of booking.seat_ids || []) {
        if (!seatStatus[seatId]) {
          seatStatus[seatId] = 'locked';
        }
      }
    }
  }

  debug.bookings = {
    total: allBookings?.length || 0,
    paid: paidBookings.length,
    pending: pendingBookings.length,
    other: (allBookings?.length || 0) - paidBookings.length - pendingBookings.length,
  };

  debug.seatStatus = seatStatus;
  debug.soldSeatsCount = Object.values(seatStatus).filter(s => s === 'sold').length;
  debug.lockedSeatsCount = Object.values(seatStatus).filter(s => s === 'locked').length;

  // Also show the raw bookings for debugging
  debug.rawBookings = allBookings?.map(b => ({
    id: b.id.substring(0, 8) + '...',
    status: b.payment_status,
    seats: b.seat_ids?.length || 0,
    customer: b.customer_name,
    created: new Date(b.created_at).toISOString(),
  }));

  return NextResponse.json(debug, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
