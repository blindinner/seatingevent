import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicEvent } from '@/lib/supabase';

// GET - Fetch event data (public, for embeds)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Try to fetch event by ID or short_id
    let event = await getPublicEvent(id);

    // If not found by UUID, try short_id
    if (!event) {
      const { data: eventByShortId } = await supabaseAdmin.client
        .from('events')
        .select('id')
        .eq('short_id', id)
        .single();

      if (eventByShortId) {
        event = await getPublicEvent(eventByShortId.id);
      }
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch map data if seated event
    let mapData = null;
    if (event.mapId) {
      const { data: mapRow } = await supabaseAdmin.client
        .from('maps')
        .select('data')
        .eq('id', event.mapId)
        .single();

      if (mapRow) {
        mapData = mapRow.data;
      }
    }

    // Calculate ticket availability for GA events
    let tiers = event.ticketTiers || [];
    if (event.eventType === 'ga' && tiers.length > 0) {
      // Get booking counts per tier
      const { data: bookings } = await supabaseAdmin.client
        .from('bookings')
        .select('metadata')
        .eq('event_id', event.id)
        .eq('payment_status', 'completed');

      const tierSales: Record<string, number> = {};
      bookings?.forEach(booking => {
        const ticketSelections = booking.metadata?.ticketSelections || [];
        ticketSelections.forEach((sel: { tierId: string; quantity: number }) => {
          tierSales[sel.tierId] = (tierSales[sel.tierId] || 0) + sel.quantity;
        });
      });

      tiers = tiers.map(tier => ({
        ...tier,
        sold: tierSales[tier.id] || 0,
        remaining: tier.quantity === -1 ? -1 : Math.max(0, tier.quantity - (tierSales[tier.id] || 0)),
      }));
    }

    return NextResponse.json({
      event,
      mapData,
      tiers,
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to get user from request (supports both Authorization header and cookies)
async function getUserFromRequest(request: NextRequest) {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
  }

  // Fall back to cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieHeader,
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  return null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Verify the event belongs to this user (using admin client to bypass RLS)
    const { data: event, error: fetchError } = await supabaseAdmin.client
      .from('events')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete related bookings first (if any)
    await supabaseAdmin.client
      .from('bookings')
      .delete()
      .eq('event_id', id);

    // Delete the event
    const { error: deleteError } = await supabaseAdmin.client
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
