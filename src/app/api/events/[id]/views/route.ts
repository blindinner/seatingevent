import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for inserting page views (bypasses RLS for inserts)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { visitorId, referrer } = body;

    if (!visitorId) {
      return NextResponse.json({ error: 'Missing visitorId' }, { status: 400 });
    }

    // Get user agent and extract device type
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = getDeviceType(userAgent);

    // Get country from Vercel headers (if deployed on Vercel)
    const country = request.headers.get('x-vercel-ip-country') || null;

    // Insert page view
    const { error } = await supabase.from('page_views').insert({
      event_id: eventId,
      visitor_id: visitorId,
      referrer: referrer || null,
      user_agent: userAgent,
      country,
      device_type: deviceType,
    });

    if (error) {
      console.error('Failed to record page view:', error);
      return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Page view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
