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

    // Get all users (for counting and filtering)
    const { data: allUsersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = allUsersData?.users || [];
    const totalUsers = allUsers.length;

    // Get users created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersThisWeek = allUsers.filter(
      u => new Date(u.created_at) > oneWeekAgo
    ).length;

    // Get total events
    const { count: totalEvents } = await admin
      .from('events')
      .select('*', { count: 'exact', head: true });

    // Get active events (future dates)
    const today = new Date().toISOString().split('T')[0];
    const { count: activeEvents } = await admin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_date', today);

    // Get total bookings
    const { count: totalBookings } = await admin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid');

    // Get total revenue
    const { data: revenueData } = await admin
      .from('bookings')
      .select('amount_paid')
      .eq('payment_status', 'paid');

    const totalRevenue = revenueData?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;

    // Get recent signups (last 10) - sort by created_at
    const recentUsers = [...allUsers]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Get recent events (last 10)
    const { data: recentEvents } = await admin
      .from('events')
      .select('id, short_id, name, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent bookings (last 10)
    const { data: recentBookings } = await admin
      .from('bookings')
      .select('id, customer_email, amount_paid, created_at, event_id, payment_status')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        newUsersThisWeek,
        totalEvents: totalEvents || 0,
        activeEvents: activeEvents || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
      },
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })),
      recentEvents: recentEvents || [],
      recentBookings: recentBookings || [],
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
