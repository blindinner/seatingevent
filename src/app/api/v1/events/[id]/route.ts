import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function validateApiKey(supabase: SupabaseClient, apiKey: string) {
  const keyHash = hashApiKey(apiKey);

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('id, user_id, white_label_theme_id, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !keyRecord) {
    return null;
  }

  // Note: last_used_at tracking skipped for now (api_keys not in generated types)
  return keyRecord;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET - Get single event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = authHeader.slice(7);
    const keyRecord = await validateApiKey(supabase, apiKey);

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Try to find by ID or external_id
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', keyRecord.user_id);

    // Check if id looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      // Try external_id
      query = query.eq('external_id', id);
    }

    if (keyRecord.white_label_theme_id) {
      query = query.eq('white_label_theme_id', keyRecord.white_label_theme_id);
    }

    const { data: event, error } = await query.single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seated.app';

    return NextResponse.json({
      event: {
        id: event.id,
        shortId: event.short_id,
        externalId: event.external_id,
        name: event.name,
        description: event.description,
        date: event.start_date,
        time: event.start_time,
        endDate: event.end_date,
        endTime: event.end_time,
        location: event.location,
        eventType: event.event_type,
        ticketTiers: event.ticket_tiers,
        currency: event.currency,
        mapId: event.map_id,
        requireApproval: event.require_approval,
        isDemo: event.is_demo,
        isDraft: event.is_draft,
        language: event.language,
        createdAt: event.created_at,
      },
      urls: {
        embed: `${baseUrl}/embed/${event.id}`,
        page: `${baseUrl}/event/${event.short_id || event.id}`,
        dashboard: `${baseUrl}/event/${event.id}/dashboard`,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT - Update event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = authHeader.slice(7);
    const keyRecord = await validateApiKey(supabase, apiKey);

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Find the event
    let findQuery = supabase
      .from('events')
      .select('id')
      .eq('user_id', keyRecord.user_id);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      findQuery = findQuery.eq('id', id);
    } else {
      findQuery = findQuery.eq('external_id', id);
    }

    if (keyRecord.white_label_theme_id) {
      findQuery = findQuery.eq('white_label_theme_id', keyRecord.white_label_theme_id);
    }

    const { data: existing, error: findError } = await findQuery.single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.date !== undefined) updateData.start_date = body.date;
    if (body.time !== undefined) updateData.start_time = body.time;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;
    if (body.end_time !== undefined) updateData.end_time = body.end_time;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url;
    if (body.external_id !== undefined) updateData.external_id = body.external_id;
    if (body.is_demo !== undefined) updateData.is_demo = body.is_demo;
    if (body.is_draft !== undefined) updateData.is_draft = body.is_draft;
    if (body.language !== undefined) updateData.language = body.language;

    const { data: event, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', existing.id)
      .select('id, short_id, external_id, name, start_date, start_time')
      .single();

    if (updateError) {
      console.error('Error updating event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500, headers: corsHeaders }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seated.app';

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        shortId: event.short_id,
        externalId: event.external_id,
        name: event.name,
        date: event.start_date,
        time: event.start_time,
      },
      urls: {
        embed: `${baseUrl}/embed/${event.id}`,
        page: `${baseUrl}/event/${event.short_id || event.id}`,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Delete event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = authHeader.slice(7);
    const keyRecord = await validateApiKey(supabase, apiKey);

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    let deleteQuery = supabase
      .from('events')
      .delete()
      .eq('user_id', keyRecord.user_id);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      deleteQuery = deleteQuery.eq('id', id);
    } else {
      deleteQuery = deleteQuery.eq('external_id', id);
    }

    if (keyRecord.white_label_theme_id) {
      deleteQuery = deleteQuery.eq('white_label_theme_id', keyRecord.white_label_theme_id);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
