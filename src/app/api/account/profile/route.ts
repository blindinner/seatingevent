import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get user from request
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// GET - Fetch user profile with tier info
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Fetch profile
    const { data: profile, error } = await supabaseAdmin.client
      .from('profiles')
      .select('tier, tier_updated_at, email, verification_status')
      .eq('id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, create it with defaults
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabaseAdmin.client
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            tier: 'free',
          })
          .select('tier, tier_updated_at, email, verification_status')
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

        return NextResponse.json({ profile: newProfile });
      }

      console.error('Failed to fetch profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
