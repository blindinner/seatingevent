import type { WhiteLabelTheme, BackgroundConfig, SocialLinks } from '@/types/whiteLabel';

interface DatabaseWhiteLabelTheme {
  id: string;
  name: string;
  slug: string;
  nav_logo_url: string;
  logo_destination_url: string | null;
  email_logo_url: string | null;
  email_from_name: string | null;
  background_config: BackgroundConfig;
  brand_color: string | null;
  default_hosted_by: string | null;
  default_location: string | null;
  social_links: SocialLinks | null;
  allowed_emails: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function transformTheme(dbTheme: DatabaseWhiteLabelTheme): WhiteLabelTheme {
  return {
    id: dbTheme.id,
    name: dbTheme.name,
    slug: dbTheme.slug,
    navLogoUrl: dbTheme.nav_logo_url,
    logoDestinationUrl: dbTheme.logo_destination_url,
    emailLogoUrl: dbTheme.email_logo_url,
    emailFromName: dbTheme.email_from_name,
    backgroundConfig: dbTheme.background_config || { elements: [] },
    brandColor: dbTheme.brand_color,
    defaultHostedBy: dbTheme.default_hosted_by,
    defaultLocation: dbTheme.default_location,
    socialLinks: dbTheme.social_links,
    allowedEmails: dbTheme.allowed_emails || [],
    isActive: dbTheme.is_active,
    createdAt: dbTheme.created_at,
    updatedAt: dbTheme.updated_at,
  };
}

export async function getAvailableThemesForUser(email: string): Promise<WhiteLabelTheme[]> {
  const { supabaseAdmin } = await import('./supabase-admin');

  const { data, error } = await supabaseAdmin.client
    .from('white_label_themes')
    .select('*')
    .contains('allowed_emails', [email])
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching themes for user:', error);
    return [];
  }

  return (data || []).map(transformTheme);
}

export async function getThemeById(id: string): Promise<WhiteLabelTheme | null> {
  const { supabaseAdmin } = await import('./supabase-admin');

  const { data, error } = await supabaseAdmin.client
    .from('white_label_themes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching theme:', error);
    return null;
  }

  return transformTheme(data);
}

export async function getThemeBySlug(slug: string): Promise<WhiteLabelTheme | null> {
  const { supabaseAdmin } = await import('./supabase-admin');

  const { data, error } = await supabaseAdmin.client
    .from('white_label_themes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching theme:', error);
    return null;
  }

  return transformTheme(data);
}

export async function canUserAccessTheme(email: string, themeId: string): Promise<boolean> {
  const { supabaseAdmin } = await import('./supabase-admin');

  const { data, error } = await supabaseAdmin.client
    .from('white_label_themes')
    .select('id')
    .eq('id', themeId)
    .contains('allowed_emails', [email])
    .eq('is_active', true)
    .single();

  if (error) return false;
  return !!data;
}

// Event summary for listings (lighter than full PublicEvent)
export interface BrandEventSummary {
  id: string;
  shortId: string | null;
  slug: string | null;
  name: string;
  description: string | null;
  hostedBy: string | null;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  location: string | null;
  coverImageUrl: string | null;
  eventType: 'ga' | 'seated';
  themeColor: string | null;
}

export async function getUpcomingEventsByTheme(themeId: string): Promise<BrandEventSummary[]> {
  const { supabaseAdmin } = await import('./supabase-admin');

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin.client
    .from('events')
    .select(`
      id,
      short_id,
      slug,
      name,
      description,
      hosted_by,
      start_date,
      start_time,
      end_date,
      end_time,
      location,
      cover_image_url,
      event_type,
      theme_color
    `)
    .eq('white_label_theme_id', themeId)
    .gte('start_date', today)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching events for theme:', error);
    return [];
  }

  return (data || []).map((event: any) => ({
    id: event.id,
    shortId: event.short_id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    hostedBy: event.hosted_by,
    startDate: event.start_date,
    startTime: event.start_time,
    endDate: event.end_date,
    endTime: event.end_time,
    location: event.location,
    coverImageUrl: event.cover_image_url,
    eventType: event.event_type,
    themeColor: event.theme_color,
  }));
}
