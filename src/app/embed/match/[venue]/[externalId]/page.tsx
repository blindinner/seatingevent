import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Disable caching - always fetch fresh embed settings
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface EmbedSettings {
  primaryColor?: string;
  backgroundColor?: string;
  borderRadius?: string;
  buttonStyle?: string;
  compact?: boolean;
  hideHeader?: boolean;
  hidePoweredBy?: boolean;
}

interface PageProps {
  params: Promise<{ venue: string; externalId: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function EmbedMatchPage({ params, searchParams }: PageProps) {
  const { venue, externalId } = await params;
  const search = await searchParams;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find the venue (white-label theme) by slug, including embed_settings
  const { data: theme, error: themeError } = await supabase
    .from('white_label_themes')
    .select('id, embed_settings')
    .eq('slug', venue)
    .eq('is_active', true)
    .single();

  if (themeError || !theme) {
    notFound();
  }

  // Find the event by external ID within this venue
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('white_label_theme_id', theme.id)
    .eq('external_id', externalId)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // Build query params - theme defaults + URL overrides
  const embedSettings = (theme.embed_settings || {}) as EmbedSettings;
  const queryParams = new URLSearchParams();

  // Apply theme embed settings as defaults
  if (embedSettings.primaryColor) {
    queryParams.set('primaryColor', embedSettings.primaryColor.replace('#', ''));
  }
  if (embedSettings.backgroundColor) {
    queryParams.set('bgColor', embedSettings.backgroundColor.replace('#', ''));
  }
  if (embedSettings.borderRadius) {
    queryParams.set('borderRadius', embedSettings.borderRadius);
  }
  if (embedSettings.buttonStyle) {
    queryParams.set('buttonStyle', embedSettings.buttonStyle);
  }
  if (embedSettings.compact) {
    queryParams.set('compact', 'true');
  }
  if (embedSettings.hideHeader) {
    queryParams.set('hideHeader', 'true');
  }
  if (embedSettings.hidePoweredBy) {
    queryParams.set('hidePoweredBy', 'true');
  }

  // URL params override theme defaults
  for (const [key, value] of Object.entries(search)) {
    if (value) {
      queryParams.set(key, value);
    }
  }

  const queryString = queryParams.toString();
  const redirectUrl = `/embed/${event.id}${queryString ? `?${queryString}` : ''}`;

  redirect(redirectUrl);
}
