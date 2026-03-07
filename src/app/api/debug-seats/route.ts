import { NextRequest, NextResponse } from 'next/server';
import { getSeatStatus } from '@/lib/seat-status';
import { createClient } from '@supabase/supabase-js';

// Force dynamic - disable ALL caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get('eventId') || '26d0da5c-05b1-46b1-8768-13685d593393';

  try {
    // Use shared function
    const result = await getSeatStatus(eventId);

    // Also fetch raw bookings for debugging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: rawBookings } = await client
      .from('bookings')
      .select('id, seat_ids, payment_status, created_at, customer_name')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      eventId,
      timestamp: new Date().toISOString(),
      architecture: 'shared-seat-status-function',
      seatStatus: result.seatStatus,
      bookings: {
        total: result.debug.totalBookings,
        paid: result.debug.paidCount,
        pending: result.debug.pendingCount,
      },
      soldSeatsCount: result.debug.soldSeats,
      rawBookings: rawBookings?.map(b => ({
        id: b.id.substring(0, 8) + '...',
        status: b.payment_status,
        seats: b.seat_ids?.length || 0,
        customer: b.customer_name,
        created: b.created_at,
      })),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
