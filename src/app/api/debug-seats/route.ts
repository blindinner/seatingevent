import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const eventId = '26d0da5c-05b1-46b1-8768-13685d593393';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const debug: Record<string, unknown> = {
    supabaseUrl: supabaseUrl.substring(0, 30) + '...',
    hasServiceKey: !!serviceKey,
    serviceKeyPrefix: serviceKey.substring(0, 20) + '...',
    hasAnonKey: !!anonKey,
  };

  // Try with service key
  if (serviceKey) {
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error, count } = await client
      .from('bookings')
      .select('id, seat_ids, payment_status', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    debug.serviceKeyResult = { data, error, count };
  }

  // Try with anon key
  if (anonKey) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error, count } = await client
      .from('bookings')
      .select('id, seat_ids, payment_status', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('payment_status', 'paid');

    debug.anonKeyResult = { data, error, count };
  }

  return NextResponse.json(debug);
}
