import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'sk_live_';
  const randomPart = randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

// Hash an API key for storage
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// POST - Create a new API key
export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the auth token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name = 'Default', whiteLabelThemeId } = body;

    // If whiteLabelThemeId is provided, verify ownership
    if (whiteLabelThemeId) {
      const { data: theme, error: themeError } = await supabase
        .from('white_label_themes')
        .select('id')
        .eq('id', whiteLabelThemeId)
        .eq('user_id', user.id)
        .single();

      if (themeError || !theme) {
        return NextResponse.json({ error: 'Invalid white label theme' }, { status: 400 });
      }
    }

    // Generate the API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12) + '...';

    // Store in database
    const { data: keyRecord, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        white_label_theme_id: whiteLabelThemeId || null,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select('id, name, key_prefix, created_at, white_label_theme_id')
      .single();

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Return the full key only once - it won't be retrievable again
    return NextResponse.json({
      id: keyRecord.id,
      name: keyRecord.name,
      key: apiKey, // Only returned on creation!
      keyPrefix: keyRecord.key_prefix,
      whiteLabelThemeId: keyRecord.white_label_theme_id,
      createdAt: keyRecord.created_at,
      message: 'Save this key - it will not be shown again!'
    });

  } catch (error) {
    console.error('Error in API key creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List user's API keys
export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, is_active, white_label_theme_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json({ keys });

  } catch (error) {
    console.error('Error listing API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
