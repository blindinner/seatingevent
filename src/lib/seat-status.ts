import { createClient } from '@supabase/supabase-js';

export interface SeatStatusResult {
  seatStatus: Record<string, string>;
  debug: {
    totalBookings: number;
    paidCount: number;
    pendingCount: number;
    soldSeats: number;
    timestamp: number;
  };
}

/**
 * Fetch seat status from bookings table
 * Single source of truth for all seat availability checks
 */
export async function getSeatStatus(eventId: string): Promise<SeatStatusResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  // Create fresh client for each request
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Query all bookings for this event
  const { data: allBookings, error } = await supabase
    .from('bookings')
    .select('id, seat_ids, payment_status, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getSeatStatus] Database error:', error);
    throw error;
  }

  // Build seat status
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

  return {
    seatStatus,
    debug: {
      totalBookings: allBookings?.length || 0,
      paidCount: paidBookings.length,
      pendingCount: pendingBookings.length,
      soldSeats: Object.keys(seatStatus).filter(k => seatStatus[k] === 'sold').length,
      timestamp: Date.now(),
    }
  };
}
