import { supabaseAdmin } from './supabase-admin';

export type SeatStatus = 'available' | 'reserved' | 'sold' | 'locked';

/**
 * Get seat status from bookings table (single source of truth)
 * - Paid bookings = sold
 * - Pending bookings within 15 minutes = locked
 */
export async function getSeatStatusFromBookings(
  eventId: string
): Promise<Record<string, SeatStatus>> {
  const seatStatus: Record<string, SeatStatus> = {};

  // Query paid bookings
  const { data: paidBookings, error: paidError } = await supabaseAdmin.client
    .from('bookings')
    .select('id, seat_ids')
    .eq('event_id', eventId)
    .eq('payment_status', 'paid');

  if (paidError) {
    console.error('[Seats] Error fetching paid bookings:', paidError);
    throw paidError;
  }

  // Query pending bookings (active checkout sessions)
  const { data: pendingBookings, error: pendingError } = await supabaseAdmin.client
    .from('bookings')
    .select('id, seat_ids, created_at')
    .eq('event_id', eventId)
    .eq('payment_status', 'pending');

  if (pendingError) {
    console.error('[Seats] Error fetching pending bookings:', pendingError);
    throw pendingError;
  }

  // Mark paid seats as sold
  for (const booking of paidBookings || []) {
    for (const seatId of booking.seat_ids || []) {
      seatStatus[seatId] = 'sold';
    }
  }

  // Mark pending seats as locked (if checkout started within 15 minutes)
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

  return seatStatus;
}

/**
 * Check if specific seats are available for booking
 * Uses bookings table as single source of truth
 */
export async function checkSeatsAvailability(
  eventId: string,
  seatIds: string[]
): Promise<{ available: boolean; unavailableSeats: string[] }> {
  const seatStatus = await getSeatStatusFromBookings(eventId);
  const unavailableSeats: string[] = [];

  for (const seatId of seatIds) {
    const status = seatStatus[seatId];
    if (status === 'sold' || status === 'locked') {
      unavailableSeats.push(seatId);
    }
  }

  return {
    available: unavailableSeats.length === 0,
    unavailableSeats,
  };
}

/**
 * Lock seats by creating a pending booking
 * This is atomic - if booking creation fails, no seats are locked
 * The booking itself serves as the lock (with payment_status = 'pending')
 *
 * NOTE: This function now just checks availability before the order is created.
 * The actual "lock" happens when createOrder() is called in payments/create route.
 */
export async function lockSeats(
  eventId: string,
  seatIds: string[],
  _lockId: string, // Unused now, kept for API compatibility
  _durationMs: number = 15 * 60 * 1000 // Unused now, kept for API compatibility
): Promise<{ success: boolean; unavailableSeats: string[] }> {
  // Check availability using bookings table
  const availability = await checkSeatsAvailability(eventId, seatIds);

  if (!availability.available) {
    return {
      success: false,
      unavailableSeats: availability.unavailableSeats,
    };
  }

  // Seats are available! The actual booking will be created by createOrder()
  // in the payments/create route, which serves as the lock
  return { success: true, unavailableSeats: [] };
}

/**
 * Release locked seats by deleting/cancelling the pending booking
 * This is called when checkout is cancelled
 */
export async function releaseSeats(
  eventId: string,
  seatIds: string[],
  bookingId?: string
): Promise<void> {
  // If we have a booking ID, mark it as cancelled
  if (bookingId) {
    const { error } = await supabaseAdmin.client
      .from('bookings')
      .update({ payment_status: 'cancelled' })
      .eq('id', bookingId)
      .eq('payment_status', 'pending'); // Only cancel if still pending

    if (error) {
      console.error('[Seats] Error cancelling booking:', error);
      throw error;
    }
    return;
  }

  // If no booking ID, find and cancel any pending bookings with these exact seats
  // This is a fallback case - shouldn't normally happen
  console.warn('[Seats] releaseSeats called without bookingId - using fallback logic');

  const { data: pendingBookings } = await supabaseAdmin.client
    .from('bookings')
    .select('id, seat_ids')
    .eq('event_id', eventId)
    .eq('payment_status', 'pending');

  for (const booking of pendingBookings || []) {
    // Check if this booking contains any of the seats we want to release
    const bookingSeatIds = booking.seat_ids || [];
    const hasMatchingSeats = seatIds.some(seatId => bookingSeatIds.includes(seatId));

    if (hasMatchingSeats) {
      await supabaseAdmin.client
        .from('bookings')
        .update({ payment_status: 'cancelled' })
        .eq('id', booking.id);
    }
  }
}

/**
 * Reserve seats for a completed order
 * This updates the booking status to 'paid' (should already be done by webhook)
 * Kept for backwards compatibility but the webhook is the main handler
 */
export async function reserveSeatsForOrder(
  eventId: string,
  seatIds: string[],
  orderId: string
): Promise<void> {
  // The webhook already handles updating payment_status to 'paid'
  // This function is now mostly a no-op but we keep it for compatibility

  // Just verify the booking exists and has the right status
  const { data: booking, error } = await supabaseAdmin.client
    .from('bookings')
    .select('id, payment_status, seat_ids')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('[Seats] Error verifying booking:', error);
    throw error;
  }

  if (booking.payment_status !== 'paid') {
    console.warn('[Seats] reserveSeatsForOrder called but booking is not paid:', booking.payment_status);
  }

  // Verify seat_ids match
  const bookingSeatIds = new Set(booking.seat_ids || []);
  const requestedSeatIds = new Set(seatIds);

  for (const seatId of requestedSeatIds) {
    if (!bookingSeatIds.has(seatId)) {
      console.warn('[Seats] Seat ID mismatch in reserveSeatsForOrder:', seatId);
    }
  }

  console.log('[Seats] Verified booking:', orderId, 'status:', booking.payment_status);
}

/**
 * Get seat status for an event (convenience wrapper)
 */
export async function getEventSeatStatus(
  eventId: string
): Promise<Record<string, SeatStatus>> {
  return getSeatStatusFromBookings(eventId);
}
