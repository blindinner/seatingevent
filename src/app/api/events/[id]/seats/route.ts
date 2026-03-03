import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch current seat status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Create fresh client per request to avoid stale data in serverless warm starts
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: event, error } = await supabase
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

    // Debug: log what we got from the database
    console.log('Seats API - event_id:', id);
    console.log('Seats API - raw seat_status from DB:', JSON.stringify(rawStatus));
    console.log('Seats API - raw seat count:', Object.keys(rawStatus).length);
    console.log('Seats API - raw seat keys:', Object.keys(rawStatus).join(', '));

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

    console.log('Seats API - processed seat count:', Object.keys(seatStatus).length);
    console.log('Seats API - processed seat keys:', Object.keys(seatStatus).join(', '));

    // Seat status changes via webhooks, must not be cached
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
