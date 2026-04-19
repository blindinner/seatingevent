import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// CORS headers for public API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Hash an API key for lookup
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Validate API key and return user/theme info
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

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST - Create or update an event
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'API key required. Use: Authorization: Bearer sk_live_...' },
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

    const body = await request.json();

    // Validate required fields
    const { external_id, name, date, time } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Required fields: name, date' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse optional fields
    const {
      description,
      location,
      end_date,
      end_time,
      price,
      currency = 'ILS',
      quantity = -1, // -1 = unlimited
      cover_image_url,
      event_type = 'ga',
      map_id,
      require_approval = false,
      is_demo = false,
      language = 'en',
    } = body;

    // Build ticket tiers from price if provided
    let ticketTiers = null;
    if (price !== undefined) {
      ticketTiers = [{
        id: nanoid(8),
        name: 'General Admission',
        price: parseFloat(price) || 0,
        quantity: parseInt(quantity) || -1,
      }];
    }

    // Check if event with this external_id already exists for this user/theme
    let existingEvent = null;
    if (external_id) {
      const query = supabase
        .from('events')
        .select('id')
        .eq('external_id', external_id)
        .eq('user_id', keyRecord.user_id);

      if (keyRecord.white_label_theme_id) {
        query.eq('white_label_theme_id', keyRecord.white_label_theme_id);
      }

      const { data } = await query.single();
      existingEvent = data;
    }

    const eventData = {
      user_id: keyRecord.user_id,
      white_label_theme_id: keyRecord.white_label_theme_id,
      external_id: external_id || null,
      name,
      description: description || null,
      start_date: date,
      start_time: time || null,
      end_date: end_date || null,
      end_time: end_time || null,
      location: location || null,
      cover_image_url: cover_image_url || null,
      event_type,
      ticket_tiers: ticketTiers,
      currency,
      map_id: map_id || null,
      require_approval,
      is_demo,
      language,
    };

    let event;
    let created = false;

    if (existingEvent) {
      // Update existing event
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', existingEvent.id)
        .select('id, short_id, external_id, name, start_date, start_time')
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return NextResponse.json(
          { error: 'Failed to update event' },
          { status: 500, headers: corsHeaders }
        );
      }
      event = data;
    } else {
      // Create new event with short_id
      const shortId = nanoid(10);
      const { data, error } = await supabase
        .from('events')
        .insert({ ...eventData, short_id: shortId })
        .select('id, short_id, external_id, name, start_date, start_time')
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return NextResponse.json(
          { error: 'Failed to create event' },
          { status: 500, headers: corsHeaders }
        );
      }
      event = data;
      created = true;
    }

    // Build response with useful URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seated.app';

    return NextResponse.json({
      success: true,
      created,
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
        dashboard: `${baseUrl}/event/${event.id}/dashboard`,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in event creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET - List events
export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const externalId = searchParams.get('external_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('events')
      .select('id, short_id, external_id, name, start_date, start_time, end_date, end_time, location, event_type, currency, created_at')
      .eq('user_id', keyRecord.user_id)
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (keyRecord.white_label_theme_id) {
      query = query.eq('white_label_theme_id', keyRecord.white_label_theme_id);
    }

    if (externalId) {
      query = query.eq('external_id', externalId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500, headers: corsHeaders }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seated.app';

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        shortId: e.short_id,
        externalId: e.external_id,
        name: e.name,
        date: e.start_date,
        time: e.start_time,
        endDate: e.end_date,
        endTime: e.end_time,
        location: e.location,
        eventType: e.event_type,
        currency: e.currency,
        createdAt: e.created_at,
        urls: {
          embed: `${baseUrl}/embed/${e.id}`,
          page: `${baseUrl}/event/${e.short_id || e.id}`,
        }
      })),
      pagination: {
        limit,
        offset,
        count: events.length,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error listing events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
