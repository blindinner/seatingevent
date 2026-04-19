import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Helper to get user from request
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

export async function POST(
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

    // Fetch the original event (using admin client to bypass RLS)
    const { data: originalEvent, error: fetchError } = await supabaseAdmin.client
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify the event belongs to this user
    if (originalEvent.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate a new short ID for the duplicate
    const shortId = nanoid(10);

    // Get the global platform fee configuration
    const { getFeeConfig } = await import('@/lib/financial');
    const feeConfig = await getFeeConfig();

    // Create the duplicate event
    const { data: newEvent, error: insertError } = await supabaseAdmin.client
      .from('events')
      .insert({
        short_id: shortId,
        slug: null, // Don't duplicate the slug to avoid conflicts
        map_id: originalEvent.map_id,
        user_id: user.id,
        name: `${originalEvent.name} (Copy)`,
        description: originalEvent.description,
        description_rtl: originalEvent.description_rtl,
        hosted_by: originalEvent.hosted_by,
        start_date: originalEvent.start_date,
        start_time: originalEvent.start_time,
        end_date: originalEvent.end_date,
        end_time: originalEvent.end_time,
        location: originalEvent.location,
        location_lat: originalEvent.location_lat,
        location_lng: originalEvent.location_lng,
        cover_image_url: originalEvent.cover_image_url,
        event_type: originalEvent.event_type,
        ticket_tiers: originalEvent.ticket_tiers,
        currency: originalEvent.currency,
        theme_color: originalEvent.theme_color,
        theme_font: originalEvent.theme_font,
        accent_color: originalEvent.accent_color,
        require_approval: originalEvent.require_approval,
        send_qr_code: originalEvent.send_qr_code,
        is_demo: originalEvent.is_demo,
        language: originalEvent.language,
        seat_status: {}, // Fresh seat status (no bookings)
        platform_fee_percent: feeConfig.platformFeePercent,
        white_label_theme_id: originalEvent.white_label_theme_id,
        is_draft: true, // Duplicated events start as drafts
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error duplicating event:', insertError);
      return NextResponse.json({ error: 'Failed to duplicate event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error('Duplicate event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
