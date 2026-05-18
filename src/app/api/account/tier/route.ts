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

// POST - Update user tier
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier } = body;

    if (!tier || !['free', 'branded'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Get current profile to check if upgrading
    const { data: currentProfile } = await supabaseAdmin.client
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const isUpgrading = currentProfile?.tier === 'free' && tier === 'branded';

    // Update profile tier
    const { error: updateError } = await supabaseAdmin.client
      .from('profiles')
      .update({
        tier,
        tier_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update tier:', updateError);
      return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
    }

    // If upgrading to branded, create a white-label theme for them
    let themeId = null;
    if (isUpgrading && user.email) {
      // Check if they already have a theme
      const { data: existingThemes } = await supabaseAdmin.client
        .from('white_label_themes')
        .select('id')
        .contains('allowed_emails', [user.email]);

      if (!existingThemes || existingThemes.length === 0) {
        // Create a new theme for them
        const slug = generateSlug(user.email);

        const { data: newTheme, error: themeError } = await supabaseAdmin.client
          .from('white_label_themes')
          .insert({
            slug,
            name: 'My Brand',
            allowed_emails: [user.email],
            is_active: true,
          })
          .select('id')
          .single();

        if (themeError) {
          console.error('Failed to create theme:', themeError);
          // Don't fail the request, just log the error
        } else {
          themeId = newTheme.id;
        }
      } else {
        themeId = existingThemes[0].id;
      }
    }

    return NextResponse.json({
      success: true,
      tier,
      themeId,
    });

  } catch (error) {
    console.error('Error in tier API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to generate a unique slug from email
function generateSlug(email: string): string {
  // Take the part before @ and clean it up
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);

  return `${base}-${suffix}`;
}
