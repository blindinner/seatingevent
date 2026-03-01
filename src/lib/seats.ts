import { supabaseAdmin } from './supabase-admin';

export type SeatStatus = 'available' | 'reserved' | 'sold' | 'locked';

/**
 * Reserve seats for a completed order
 */
export async function reserveSeatsForOrder(
  eventId: string,
  seatIds: string[],
  orderId: string
): Promise<void> {
  // Get current seat status
  const { data: event, error: fetchError } = await supabaseAdmin.client
    .from('events')
    .select('seat_status')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const currentStatus = (event?.seat_status || {}) as Record<string, string>;

  // Update seat status for each seat
  const newStatus = { ...currentStatus };
  for (const seatId of seatIds) {
    newStatus[seatId] = `sold:${orderId}`;
  }

  // Update the event
  const { error: updateError } = await supabaseAdmin.client
    .from('events')
    .update({ seat_status: newStatus })
    .eq('id', eventId);

  if (updateError) throw updateError;
}

/**
 * Lock seats temporarily during checkout (prevent double booking)
 */
export async function lockSeats(
  eventId: string,
  seatIds: string[],
  lockId: string,
  durationMs: number = 10 * 60 * 1000 // 10 minutes default
): Promise<{ success: boolean; unavailableSeats: string[] }> {
  // Get current seat status
  const { data: event, error: fetchError } = await supabaseAdmin.client
    .from('events')
    .select('seat_status')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const currentStatus = (event?.seat_status || {}) as Record<string, string>;
  const now = Date.now();
  const unavailableSeats: string[] = [];

  // Check which seats are available
  for (const seatId of seatIds) {
    const status = currentStatus[seatId];

    if (!status || status === 'available') {
      continue; // Available
    }

    if (status.startsWith('sold:')) {
      unavailableSeats.push(seatId);
      continue; // Already sold
    }

    if (status.startsWith('locked:')) {
      // Check if lock has expired
      const [, , expiresAt] = status.split(':');
      if (expiresAt && parseInt(expiresAt) > now) {
        unavailableSeats.push(seatId);
        continue; // Still locked
      }
      // Lock expired, can be re-locked
    }
  }

  if (unavailableSeats.length > 0) {
    return { success: false, unavailableSeats };
  }

  // Lock all seats
  const expiresAt = now + durationMs;
  const newStatus = { ...currentStatus };
  for (const seatId of seatIds) {
    newStatus[seatId] = `locked:${lockId}:${expiresAt}`;
  }

  const { error: updateError } = await supabaseAdmin.client
    .from('events')
    .update({ seat_status: newStatus })
    .eq('id', eventId);

  if (updateError) throw updateError;

  return { success: true, unavailableSeats: [] };
}

/**
 * Release locked seats (e.g., when checkout is cancelled)
 */
export async function releaseSeats(
  eventId: string,
  seatIds: string[],
  lockId: string
): Promise<void> {
  // Get current seat status
  const { data: event, error: fetchError } = await supabaseAdmin.client
    .from('events')
    .select('seat_status')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const currentStatus = (event?.seat_status || {}) as Record<string, string>;
  const newStatus = { ...currentStatus };

  // Only release seats that are locked with the same lockId
  for (const seatId of seatIds) {
    const status = currentStatus[seatId];
    if (status && status.startsWith(`locked:${lockId}:`)) {
      delete newStatus[seatId]; // Remove = available
    }
  }

  const { error: updateError } = await supabaseAdmin.client
    .from('events')
    .update({ seat_status: newStatus })
    .eq('id', eventId);

  if (updateError) throw updateError;
}

/**
 * Get seat status for an event
 */
export async function getEventSeatStatus(
  eventId: string
): Promise<Record<string, SeatStatus>> {
  const { data: event, error } = await supabaseAdmin.client
    .from('events')
    .select('seat_status')
    .eq('id', eventId)
    .single();

  if (error) throw error;

  const rawStatus = (event?.seat_status || {}) as Record<string, string>;
  const result: Record<string, SeatStatus> = {};
  const now = Date.now();

  for (const [seatId, status] of Object.entries(rawStatus)) {
    if (status.startsWith('sold:')) {
      result[seatId] = 'sold';
    } else if (status.startsWith('locked:')) {
      // Check if lock expired
      const [, , expiresAt] = status.split(':');
      if (expiresAt && parseInt(expiresAt) > now) {
        result[seatId] = 'locked';
      } else {
        result[seatId] = 'available'; // Lock expired
      }
    } else if (status === 'reserved') {
      result[seatId] = 'reserved';
    } else {
      result[seatId] = 'available';
    }
  }

  return result;
}

/**
 * Check if specific seats are available
 */
export async function checkSeatsAvailability(
  eventId: string,
  seatIds: string[]
): Promise<{ available: boolean; unavailableSeats: string[] }> {
  const seatStatus = await getEventSeatStatus(eventId);
  const unavailableSeats: string[] = [];

  for (const seatId of seatIds) {
    const status = seatStatus[seatId];
    if (status && status !== 'available') {
      unavailableSeats.push(seatId);
    }
  }

  return {
    available: unavailableSeats.length === 0,
    unavailableSeats,
  };
}
