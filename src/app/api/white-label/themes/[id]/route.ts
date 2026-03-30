import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get user from request Authorization header
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // First verify user has access to this theme
    const { data: theme, error: fetchError } = await supabaseAdmin.client
      .from('white_label_themes')
      .select('*')
      .eq('id', id)
      .contains('allowed_emails', [user.email])
      .single();

    if (fetchError || !theme) {
      return NextResponse.json({ error: 'Theme not found or access denied' }, { status: 404 });
    }

    // Build update object with only allowed fields
    const allowedFields = [
      'nav_logo_url',
      'logo_destination_url',
      'email_logo_url',
      'email_from_name',
      'brand_color',
      'default_hosted_by',
      'default_location',
      'social_links',
    ];

    const updates: Record<string, any> = {};

    if (body.navLogoUrl !== undefined) updates.nav_logo_url = body.navLogoUrl;
    if (body.logoDestinationUrl !== undefined) updates.logo_destination_url = body.logoDestinationUrl;
    if (body.emailLogoUrl !== undefined) updates.email_logo_url = body.emailLogoUrl;
    if (body.emailFromName !== undefined) updates.email_from_name = body.emailFromName;
    if (body.brandColor !== undefined) updates.brand_color = body.brandColor;
    if (body.defaultHostedBy !== undefined) updates.default_hosted_by = body.defaultHostedBy;
    if (body.defaultLocation !== undefined) updates.default_location = body.defaultLocation;
    if (body.socialLinks !== undefined) updates.social_links = body.socialLinks;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedTheme, error: updateError } = await supabaseAdmin.client
      .from('white_label_themes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating theme:', updateError);
      return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
    }

    return NextResponse.json({ success: true, theme: updatedTheme });
  } catch (error) {
    console.error('Error in theme update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { getThemeById, canUserAccessTheme } = await import('@/lib/whiteLabel');

    const hasAccess = await canUserAccessTheme(user.email, id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const theme = await getThemeById(id);
    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ theme });
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
