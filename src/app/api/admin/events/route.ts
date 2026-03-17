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

    // Get all events
    const { data: events, error: eventsError } = await admin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Get user emails for each event
    const userIds = [...new Set(events?.map(e => e.user_id) || [])];
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const userMap = new Map(usersData?.users?.map(u => [u.id, u.email]) || []);

    // Get booking stats for each event
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        const { data: bookings } = await admin
          .from('bookings')
          .select('amount_paid, seat_count')
          .eq('event_id', event.id)
          .eq('payment_status', 'paid');

        const ticketsSold = bookings?.reduce((sum, b) => sum + (b.seat_count || 0), 0) || 0;
        const totalRevenue = bookings?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;

        return {
          id: event.id,
          short_id: event.short_id,
          name: event.name,
          start_date: event.start_date,
          start_time: event.start_time,
          location: event.location,
          event_type: event.event_type,
          currency: event.currency,
          cover_image_url: event.cover_image_url,
          created_at: event.created_at,
          user_id: event.user_id,
          organizer_email: userMap.get(event.user_id) || 'Unknown',
          ticketsSold,
          totalRevenue,
        };
      })
    );

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error('Admin events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
