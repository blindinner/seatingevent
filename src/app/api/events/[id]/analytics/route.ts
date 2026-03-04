import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/auth';

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, all

    // Get current user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this event
    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date range
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch page views within the period
    const { data: pageViews, error: viewsError } = await serviceClient
      .from('page_views')
      .select('viewed_at, visitor_id, referrer, device_type, country')
      .eq('event_id', eventId)
      .gte('viewed_at', startDate.toISOString())
      .order('viewed_at', { ascending: true });

    if (viewsError) {
      console.error('Failed to fetch page views:', viewsError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Process analytics data
    const totalViews = pageViews?.length || 0;
    const uniqueVisitors = new Set(pageViews?.map(v => v.visitor_id)).size;

    // Group views by day
    const viewsByDay: Record<string, { views: number; unique: Set<string> }> = {};

    for (const view of pageViews || []) {
      const day = new Date(view.viewed_at).toISOString().split('T')[0];
      if (!viewsByDay[day]) {
        viewsByDay[day] = { views: 0, unique: new Set() };
      }
      viewsByDay[day].views++;
      viewsByDay[day].unique.add(view.visitor_id);
    }

    // Convert to array format
    const dailyViews = Object.entries(viewsByDay).map(([date, data]) => ({
      date,
      views: data.views,
      uniqueVisitors: data.unique.size,
    }));

    // Device breakdown
    const deviceCounts: Record<string, number> = {};
    for (const view of pageViews || []) {
      const device = view.device_type || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    }

    // Top referrers
    const referrerCounts: Record<string, number> = {};
    for (const view of pageViews || []) {
      if (view.referrer) {
        try {
          const url = new URL(view.referrer);
          const domain = url.hostname;
          referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
        } catch {
          referrerCounts['direct'] = (referrerCounts['direct'] || 0) + 1;
        }
      } else {
        referrerCounts['direct'] = (referrerCounts['direct'] || 0) + 1;
      }
    }

    const topReferrers = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    return NextResponse.json({
      totalViews,
      uniqueVisitors,
      dailyViews,
      deviceBreakdown: deviceCounts,
      topReferrers,
      period,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
