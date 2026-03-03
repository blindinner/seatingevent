import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Fetch current seat status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: event, error } = await supabaseAdmin.client
      .from('events')
      .select('seat_status')
      .eq('id', id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const rawStatus = (event.seat_status || {}) as Record<string, string>;
    const now = Date.now();
    const seatStatus: Record<string, string> = {};

    // Process seat status - filter out expired locks
    for (const [seatId, status] of Object.entries(rawStatus)) {
      if (status.startsWith('sold:')) {
        seatStatus[seatId] = 'sold';
      } else if (status.startsWith('locked:')) {
        // Check if lock expired
        const parts = status.split(':');
        const expiresAt = parseInt(parts[2] || '0');
        if (expiresAt > now) {
          seatStatus[seatId] = 'locked';
        }
        // If expired, don't include it (seat is available)
      }
    }

    return NextResponse.json({ seatStatus });
  } catch (error) {
    console.error('Fetch seat status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
