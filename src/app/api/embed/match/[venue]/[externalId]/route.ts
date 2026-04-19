import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venue: string; externalId: string }> }
) {
  const { venue, externalId } = await params;

  // CORS headers for embeds
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the venue (white-label theme) by slug
    const { data: theme, error: themeError } = await supabase
      .from('white_label_themes')
      .select('id')
      .eq('slug', venue)
      .eq('is_active', true)
      .single();

    if (themeError || !theme) {
      return NextResponse.json(
        { error: 'Venue not found', venue },
        { status: 404, headers }
      );
    }

    // Find the event by external ID within this venue
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('white_label_theme_id', theme.id)
      .eq('external_id', externalId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found', venue, externalId },
        { status: 404, headers }
      );
    }

    // Return the event ID for redirect or direct use
    return NextResponse.json({
      eventId: event.id,
      redirectUrl: `/embed/${event.id}`,
    }, { headers });

  } catch (error) {
    console.error('Error matching event:', error);
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
