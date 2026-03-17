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

    // Get all users
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get events count and revenue for each user
    const usersWithStats = await Promise.all(
      (usersData?.users || []).map(async (u) => {
        // Get events count
        const { count: eventsCount } = await admin
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id);

        // Get user's events
        const { data: userEvents } = await admin
          .from('events')
          .select('id')
          .eq('user_id', u.id);

        // Get total revenue from bookings for user's events
        let totalRevenue = 0;
        if (userEvents && userEvents.length > 0) {
          const eventIds = userEvents.map(e => e.id);
          const { data: bookings } = await admin
            .from('bookings')
            .select('amount_paid')
            .in('event_id', eventIds)
            .eq('payment_status', 'paid');

          totalRevenue = bookings?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;
        }

        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          eventsCount: eventsCount || 0,
          totalRevenue,
        };
      })
    );

    // Sort by created_at descending (newest first)
    usersWithStats.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
