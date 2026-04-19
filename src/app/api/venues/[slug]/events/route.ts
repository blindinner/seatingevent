import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Allow CORS for embeds
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First get the white-label theme by slug
    const { data: theme, error: themeError } = await supabase
      .from('white_label_themes')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404, headers }
      );
    }

    // Get all upcoming events for this venue
    const today = new Date().toISOString().split('T')[0];

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('white_label_theme_id', theme.id)
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500, headers }
      );
    }

    // Get seat status for seated events
    const seatedEventIds = events
      ?.filter(e => e.event_type === 'seated' && e.map_id)
      .map(e => e.id) || [];

    let seatStatusMap: Record<string, Record<string, string>> = {};

    if (seatedEventIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('event_id, seat_ids')
        .in('event_id', seatedEventIds)
        .eq('status', 'paid');

      if (bookings) {
        for (const booking of bookings) {
          if (!seatStatusMap[booking.event_id]) {
            seatStatusMap[booking.event_id] = {};
          }
          for (const seatId of (booking.seat_ids || [])) {
            seatStatusMap[booking.event_id][seatId] = 'sold';
          }
        }
      }
    }

    // Get ticket counts for GA events
    const gaEventIds = events
      ?.filter(e => e.event_type === 'ga')
      .map(e => e.id) || [];

    let ticketSoldMap: Record<string, Record<string, number>> = {};

    if (gaEventIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('event_id, metadata')
        .in('event_id', gaEventIds)
        .eq('status', 'paid');

      if (bookings) {
        for (const booking of bookings) {
          if (!ticketSoldMap[booking.event_id]) {
            ticketSoldMap[booking.event_id] = {};
          }
          const seats = (booking.metadata?.seats as Array<{ category?: string }>) || [];
          for (const seat of seats) {
            const tierId = seat.category || 'default';
            ticketSoldMap[booking.event_id][tierId] =
              (ticketSoldMap[booking.event_id][tierId] || 0) + 1;
          }
        }
      }
    }

    // Transform events to public format
    const publicEvents = events?.map(event => ({
      id: event.id,
      shortId: event.short_id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      hostedBy: event.hosted_by,
      startDate: event.start_date,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.location,
      coverImageUrl: event.cover_image_url,
      eventType: event.event_type,
      ticketTiers: event.ticket_tiers,
      currency: event.currency,
      themeColor: event.theme_color,
      accentColor: event.accent_color,
      mapId: event.map_id,
      language: event.language || 'en',
      seatStatus: seatStatusMap[event.id] || {},
      ticketsSold: ticketSoldMap[event.id] || {},
    })) || [];

    return NextResponse.json({
      venue: {
        id: theme.id,
        name: theme.name,
        slug: theme.slug,
        logoUrl: theme.nav_logo_url,
        brandColor: theme.brand_color,
        socialLinks: theme.social_links,
      },
      events: publicEvents,
    }, { headers });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
