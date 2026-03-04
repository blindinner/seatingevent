import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch current seat status for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Create fresh client per request with cache-busting headers
    // This ensures PostgREST doesn't serve stale cached data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        },
      }
    );

    const { data: event, error } = await supabase
      .from('events')
      .select('seat_status')
      .eq('id', id)
      .single();

    if (error || !event) {
      console.error('[Seats API] Error or no event:', error);
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
        const parts = status.split(':');
        const expiresAt = parseInt(parts[2] || '0');
        if (expiresAt > now) {
          seatStatus[seatId] = 'locked';
        }
      }
    }

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
