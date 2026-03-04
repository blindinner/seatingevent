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

    console.log('[Seats API] Event ID:', id);
    console.log('[Seats API] Query result:', { event, error });
    console.log('[Seats API] seat_status from DB:', event?.seat_status);

    if (error || !event) {
      console.error('[Seats API] Error or no event:', error);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const rawStatus = (event.seat_status || {}) as Record<string, string>;
    console.log('[Seats API] rawStatus:', rawStatus);
    const now = Date.now();
    const seatStatus: Record<string, string> = {};

    // Process seat status - filter out expired locks
    for (const [seatId, status] of Object.entries(rawStatus)) {
      if (status.startsWith('sold:')) {
        seatStatus[seatId] = 'sold';
      } else if (status.startsWith('locked:')) {
        const parts = status.split(':');
        const expiresAt = parseInt(parts[2] || '0');
        if (expiresAt > now) {
          seatStatus[seatId] = 'locked';
        }
      }
    }

    console.log('[Seats API] Processed seatStatus:', seatStatus);

    // Seat status changes via webhooks, must not be cached
    return NextResponse.json({
      seatStatus,
      // Debug info - remove after fixing
      _debug: {
        eventId: id,
        rawStatusKeys: Object.keys(rawStatus),
        rawStatusSample: Object.entries(rawStatus).slice(0, 3),
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Fetch seat status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
