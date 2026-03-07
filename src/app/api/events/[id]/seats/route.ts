import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch current seat status for an event
// Uses EXACT same pattern as working debug-seats endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!serviceKey) {
      console.error('[Seats API] No SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Server configuration error', debug: 'no_service_key' }, { status: 500 });
    }

    // Create fresh client - exact same as debug endpoint
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Single query for all bookings (same as debug endpoint)
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, seat_ids, payment_status, created_at')
      .eq('event_id', eventId);

    if (bookingsError) {
      console.error('[Seats API] Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch seat status', debug: bookingsError.message }, { status: 500 });
    }

    // Build seat status from bookings
    const seatStatus: Record<string, string> = {};
    const paidBookings = allBookings?.filter(b => b.payment_status === 'paid') || [];
    const pendingBookings = allBookings?.filter(b => b.payment_status === 'pending') || [];
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

    // Mark paid seats as sold
    for (const booking of paidBookings) {
      for (const seatId of booking.seat_ids || []) {
        seatStatus[seatId] = 'sold';
      }
    }

    // Mark pending seats as locked (if within 15 minutes)
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

    return NextResponse.json({
      seatStatus,
      _debug: {
        ts: Date.now(),
        totalBookings: allBookings?.length || 0,
        paidCount: paidBookings.length,
        pendingCount: pendingBookings.length,
        soldSeats: Object.keys(seatStatus).filter(k => seatStatus[k] === 'sold').length,
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Fetch seat status error:', error);
    return NextResponse.json({ error: 'Internal server error', debug: String(error) }, { status: 500 });
  }
}
