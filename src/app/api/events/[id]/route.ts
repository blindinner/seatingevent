import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    // Create a client to verify the user from cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieHeader || '',
          },
        },
      }
    );

    // Get the current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the event belongs to this user (using admin client to bypass RLS)
    const { data: event, error: fetchError } = await supabaseAdmin.client
      .from('events')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete related bookings first (if any)
    await supabaseAdmin.client
      .from('bookings')
      .delete()
      .eq('event_id', id);

    // Delete the event
    const { error: deleteError } = await supabaseAdmin.client
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
