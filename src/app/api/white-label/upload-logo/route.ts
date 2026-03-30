import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const themeId = formData.get('themeId') as string;
    const type = formData.get('type') as string; // 'nav' or 'email'

    if (!file || !themeId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // Verify user has access to this theme
    const { data: theme, error: fetchError } = await supabaseAdmin.client
      .from('white_label_themes')
      .select('id')
      .eq('id', themeId)
      .contains('allowed_emails', [user.email])
      .single();

    if (fetchError || !theme) {
      return NextResponse.json({ error: 'Theme not found or access denied' }, { status: 404 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Get file extension
    const extension = file.name.split('.').pop() || 'png';
    const filename = `brand-logos/${themeId}/${type}-${Date.now()}.${extension}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.client
      .storage
      .from('event-covers') // Reusing existing bucket
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.client
      .storage
      .from('event-covers')
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
