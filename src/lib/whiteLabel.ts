import type { WhiteLabelTheme, BackgroundConfig } from '@/types/whiteLabel';

interface DatabaseWhiteLabelTheme {
  id: string;
  name: string;
  slug: string;
  nav_logo_url: string;
  email_logo_url: string | null;
  email_from_name: string | null;
  background_config: BackgroundConfig;
  brand_color: string | null;
  default_hosted_by: string | null;
  default_location: string | null;
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
    emailLogoUrl: dbTheme.email_logo_url,
    emailFromName: dbTheme.email_from_name,
    backgroundConfig: dbTheme.background_config || { elements: [] },
    brandColor: dbTheme.brand_color,
    defaultHostedBy: dbTheme.default_hosted_by,
    defaultLocation: dbTheme.default_location,
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
