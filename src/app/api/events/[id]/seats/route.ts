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

    // Debug logging
    console.log('[Seats API] Event ID:', id);
    console.log('[Seats API] Query result:', { event, error });
    console.log('[Seats API] seat_status from DB:', event?.seat_status);

    if (error || !event) {
      console.error('[Seats API] Error or no event:', error);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const rawStatus = (event.seat_status || {}) as Record<string, string>;
    console.log('[Seats API] rawStatus entries:', Object.keys(rawStatus).length);
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
    // Include debug info temporarily
    return NextResponse.json({
      seatStatus,
      _debug: {
        eventId: id,
        rawStatusKeys: Object.keys(rawStatus),
        processedKeys: Object.keys(seatStatus),
        hasData: !!event?.seat_status,
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
