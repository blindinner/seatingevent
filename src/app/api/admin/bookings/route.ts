import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminEmail } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');

    // Verify user is admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: cookieHeader || '' } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = supabaseAdmin.client;

    // Get all bookings
    const { data: bookings, error: bookingsError } = await admin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Get event names for each booking
    const eventIds = [...new Set(bookings?.map(b => b.event_id) || [])];
    const { data: events } = await admin
      .from('events')
      .select('id, name, short_id')
      .in('id', eventIds);

    const eventMap = new Map(events?.map(e => [e.id, { name: e.name, short_id: e.short_id }]) || []);

    const bookingsWithEventNames = (bookings || []).map(booking => ({
      id: booking.id,
      ticket_code: booking.ticket_code,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      event_id: booking.event_id,
      event_name: eventMap.get(booking.event_id)?.name || 'Unknown Event',
      event_short_id: eventMap.get(booking.event_id)?.short_id || booking.event_id,
      seat_ids: booking.seat_ids,
      seat_count: booking.seat_count,
      amount_paid: booking.amount_paid,
      currency: booking.currency,
      payment_status: booking.payment_status,
      platform_fee_amount: booking.platform_fee_amount,
      organizer_amount: booking.organizer_amount,
      created_at: booking.created_at,
    }));

    return NextResponse.json({ bookings: bookingsWithEventNames });
  } catch (error) {
    console.error('Admin bookings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
