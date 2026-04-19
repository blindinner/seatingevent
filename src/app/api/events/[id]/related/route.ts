import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // First, get the current event to find its host/theme
    const { data: currentEvent, error: eventError } = await supabaseAdmin.client
      .from('events')
      .select('id, user_id, white_label_theme_id')
      .eq('id', id)
      .single();

    if (eventError || !currentEvent) {
      return NextResponse.json({ events: [] });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Build query for related events
    let query = supabaseAdmin.client
      .from('events')
      .select(`
        id,
        short_id,
        slug,
        name,
        description,
        hosted_by,
        start_date,
        start_time,
        location,
        cover_image_url,
        event_type,
        theme_color,
        white_label_theme_id
      `)
      .neq('id', id) // Exclude current event
      .gte('start_date', today) // Only upcoming events
      .order('start_date', { ascending: true })
      .limit(6);

    // If event has a white-label theme, get events from same theme
    // Otherwise, get events from same user
    if (currentEvent.white_label_theme_id) {
      query = query.eq('white_label_theme_id', currentEvent.white_label_theme_id);
    } else {
      query = query.eq('user_id', currentEvent.user_id);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching related events:', error);
      return NextResponse.json({ events: [] });
    }

    // Transform to camelCase
    const transformedEvents = (events || []).map((event: any) => ({
      id: event.id,
      shortId: event.short_id,
      slug: event.slug,
      name: event.name,
      description: event.description,
      hostedBy: event.hosted_by,
      startDate: event.start_date,
      startTime: event.start_time,
      location: event.location,
      coverImageUrl: event.cover_image_url,
      eventType: event.event_type,
      themeColor: event.theme_color,
      whiteLabelThemeId: event.white_label_theme_id,
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Error in related events API:', error);
    return NextResponse.json({ events: [] });
  }
}
