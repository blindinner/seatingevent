import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import type { DatabaseMap, DatabaseEvent, DatabaseGuest, MapData } from '@/types/map';
import type { CreateEventInput, PublicEvent } from '@/types/event';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Export for direct use when needed
export const supabase = {
  get client() {
    return getSupabase();
  }
};

// Map operations
export async function getMaps(userId: string) {
  const { data, error } = await getSupabase()
    .from('maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as DatabaseMap[];
}

export async function getMap(id: string) {
  const { data, error } = await getSupabase()
    .from('maps')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DatabaseMap;
}

export async function createMap(map: Omit<DatabaseMap, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await getSupabase()
    .from('maps')
    .insert(map)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseMap;
}

export async function updateMap(id: string, updates: Partial<DatabaseMap>) {
  const { data, error } = await getSupabase()
    .from('maps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseMap;
}

export async function deleteMap(id: string) {
  const { error } = await getSupabase()
    .from('maps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Event operations
export async function getEvents(mapId: string) {
  const { data, error } = await getSupabase()
    .from('events')
    .select('*')
    .eq('map_id', mapId)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data as DatabaseEvent[];
}

export async function getEvent(id: string) {
  const { data, error } = await getSupabase()
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DatabaseEvent;
}

export async function createEvent(event: Omit<DatabaseEvent, 'id' | 'created_at'>) {
  const { data, error } = await getSupabase()
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseEvent;
}

// Extended event type for Luma-seated events (includes all new fields)
export interface ExtendedDatabaseEvent {
  id: string;
  short_id: string | null;
  slug: string | null;
  map_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  description_rtl: boolean;
  hosted_by: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  cover_image_url: string | null;
  event_type: 'ga' | 'seated';
  ticket_tiers: any | null;
  currency: string;
  theme_color: string | null;
  theme_font: string | null;
  accent_color: string | null;
  require_approval: boolean;
  send_qr_code: boolean;
  is_demo: boolean;
  is_draft: boolean;
  language: 'en' | 'he';
  seat_status: Record<string, string>;
  created_at: string;
  white_label_theme_id: string | null;
  external_id: string | null;
}

export async function createExtendedEvent(input: CreateEventInput): Promise<ExtendedDatabaseEvent> {
  // Generate a short, URL-friendly ID (10 chars)
  const shortId = nanoid(10);

  // Get the global platform fee configuration
  const { getFeeConfig } = await import('./financial');
  const feeConfig = await getFeeConfig();

  const { data, error } = await getSupabase()
    .from('events')
    .insert({
      short_id: shortId,
      slug: input.slug || null,
      map_id: input.mapId || null,
      user_id: input.userId,
      name: input.name,
      description: input.description || null,
      description_rtl: input.descriptionRtl || false,
      hosted_by: input.hostedBy || null,
      start_date: input.startDate,
      start_time: input.startTime || null,
      end_date: input.endDate || null,
      end_time: input.endTime || null,
      location: input.location || null,
      location_lat: input.locationLat || null,
      location_lng: input.locationLng || null,
      cover_image_url: input.coverImageUrl || null,
      event_type: input.eventType,
      ticket_tiers: input.ticketTiers || null,
      currency: input.currency,
      theme_color: input.themeColor || null,
      theme_font: input.themeFont || null,
      accent_color: input.accentColor || null,
      require_approval: input.requireApproval,
      send_qr_code: input.sendQrCode !== false, // Default to true
      is_demo: input.isDemo || false,
      is_draft: input.isDraft || false,
      language: input.language || 'en',
      seat_status: {},
      platform_fee_percent: feeConfig.platformFeePercent, // Use global fee config
      white_label_theme_id: input.whiteLabelThemeId || null,
      external_id: input.externalId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExtendedDatabaseEvent;
}

// Build seat status from bookings (source of truth)
async function getSeatStatusFromBookings(eventId: string, supabaseClient: any): Promise<Record<string, string>> {
  const seatStatus: Record<string, string> = {};

  // Query paid bookings
  const { data: paidBookings } = await supabaseClient
    .from('bookings')
    .select('id, seat_ids')
    .eq('event_id', eventId)
    .eq('payment_status', 'paid');

  // Query pending bookings (active checkout sessions)
  const { data: pendingBookings } = await supabaseClient
    .from('bookings')
    .select('id, seat_ids, created_at')
    .eq('event_id', eventId)
    .eq('payment_status', 'pending');

  // Mark paid seats as sold
  for (const booking of paidBookings || []) {
    for (const seatId of booking.seat_ids || []) {
      seatStatus[seatId] = 'sold';
    }
  }

  // Mark pending seats as locked (if checkout started within 15 minutes)
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  for (const booking of pendingBookings || []) {
    const createdAt = new Date(booking.created_at).getTime();
    if (createdAt > fifteenMinutesAgo) {
      for (const seatId of booking.seat_ids || []) {
        if (!seatStatus[seatId]) {
          seatStatus[seatId] = 'locked';
        }
      }
    }
  }

  return seatStatus;
}

export async function getPublicEvent(idOrShortId: string): Promise<PublicEvent | null> {
  // Use admin client to bypass RLS
  const { supabaseAdmin } = await import('./supabase-admin');

  // Check if the input looks like a UUID (36 chars with hyphens)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrShortId);

  let data, error;

  if (isUuid) {
    // If it's a UUID, search by id first, fallback to short_id
    ({ data, error } = await supabaseAdmin.client
      .from('events')
      .select('*')
      .or(`id.eq.${idOrShortId},short_id.eq.${idOrShortId}`)
      .single());
  } else {
    // If it's not a UUID, only search by short_id
    ({ data, error } = await supabaseAdmin.client
      .from('events')
      .select('*')
      .eq('short_id', idOrShortId)
      .single());
  }

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  const event = data as ExtendedDatabaseEvent;

  // Get seat status from bookings (source of truth) - use the actual UUID id
  const seatStatus = await getSeatStatusFromBookings(event.id, supabaseAdmin.client);

  // Fetch white-label theme if set
  let whiteLabelTheme;
  if (event.white_label_theme_id) {
    const { getThemeById } = await import('./whiteLabel');
    whiteLabelTheme = await getThemeById(event.white_label_theme_id) || undefined;
  }

  return {
    id: event.id,
    shortId: event.short_id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    descriptionRtl: event.description_rtl || false,
    hostedBy: event.hosted_by,
    startDate: event.start_date,
    startTime: event.start_time,
    endDate: event.end_date,
    endTime: event.end_time,
    location: event.location,
    locationLat: event.location_lat,
    locationLng: event.location_lng,
    coverImageUrl: event.cover_image_url,
    eventType: event.event_type,
    ticketTiers: event.ticket_tiers,
    currency: event.currency,
    themeColor: event.theme_color,
    themeFont: event.theme_font,
    accentColor: event.accent_color,
    requireApproval: event.require_approval,
    sendQrCode: event.send_qr_code !== false, // Default to true for backwards compatibility
    isDemo: event.is_demo || false,
    isDraft: event.is_draft || false,
    language: event.language || 'en',
    mapId: event.map_id,
    userId: event.user_id,
    createdAt: event.created_at,
    seatStatus,
    whiteLabelThemeId: event.white_label_theme_id,
    whiteLabelTheme,
    externalId: event.external_id || null,
  };
}

// Get event by branded URL (theme slug + event slug)
export async function getEventByBrandedSlug(themeSlug: string, eventSlug: string): Promise<PublicEvent | null> {
  const { supabaseAdmin } = await import('./supabase-admin');
  const { getThemeBySlug } = await import('./whiteLabel');

  // First, look up the theme by slug
  const theme = await getThemeBySlug(themeSlug);
  if (!theme) return null;

  // Then look up the event by theme ID and event slug
  const { data, error } = await supabaseAdmin.client
    .from('events')
    .select('*')
    .eq('white_label_theme_id', theme.id)
    .eq('slug', eventSlug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  const event = data as ExtendedDatabaseEvent;

  // Get seat status from bookings
  const seatStatus = await getSeatStatusFromBookings(event.id, supabaseAdmin.client);

  return {
    id: event.id,
    shortId: event.short_id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    descriptionRtl: event.description_rtl || false,
    hostedBy: event.hosted_by,
    startDate: event.start_date,
    startTime: event.start_time,
    endDate: event.end_date,
    endTime: event.end_time,
    location: event.location,
    locationLat: event.location_lat,
    locationLng: event.location_lng,
    coverImageUrl: event.cover_image_url,
    eventType: event.event_type,
    ticketTiers: event.ticket_tiers,
    currency: event.currency,
    themeColor: event.theme_color,
    themeFont: event.theme_font,
    accentColor: event.accent_color,
    requireApproval: event.require_approval,
    sendQrCode: event.send_qr_code !== false,
    isDemo: event.is_demo || false,
    isDraft: event.is_draft || false,
    language: event.language || 'en',
    mapId: event.map_id,
    userId: event.user_id,
    createdAt: event.created_at,
    seatStatus,
    whiteLabelThemeId: event.white_label_theme_id,
    whiteLabelTheme: theme,
    externalId: event.external_id || null,
  };
}

export async function uploadCoverImage(base64Data: string, userId: string): Promise<string> {
  // Extract the file extension and content type from the base64 string
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image data');
  }

  const extension = matches[1];
  const base64Content = matches[2];
  const contentType = `image/${extension}`;

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Generate a unique filename
  const filename = `${userId}/${Date.now()}.${extension}`;

  const { data, error } = await getSupabase()
    .storage
    .from('event-covers')
    .upload(filename, bytes, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  // Get the public URL
  const { data: { publicUrl } } = getSupabase()
    .storage
    .from('event-covers')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function updateEvent(id: string, updates: Partial<DatabaseEvent>) {
  const { data, error } = await getSupabase()
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseEvent;
}

export async function deleteEvent(id: string) {
  const { error } = await getSupabase()
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export interface EventWithMap extends DatabaseEvent {
  map_name: string;
  total_seats: number;
}

// Helper function to count bookable items (seats, booths, tables) in map data
function countBookableItems(mapData: MapData | null): number {
  if (!mapData || !mapData.elements) return 0;

  let count = 0;
  for (const element of mapData.elements) {
    if (element.type === 'seat') {
      count += 1;
    } else if (element.type === 'row' && 'seats' in element) {
      count += element.seats?.length || 0;
    } else if (element.type === 'table' && 'seats' in element) {
      count += element.seats?.length || 0;
    } else if (element.type === 'booth') {
      count += 1;
    }
  }
  return count;
}

export async function getUserEvents(userId: string): Promise<EventWithMap[]> {
  const { data, error } = await getSupabase()
    .from('events')
    .select(`
      *,
      maps!inner(name, user_id, data)
    `)
    .eq('maps.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform the data to include map_name and total_seats at the top level
  return (data || []).map((event: any) => ({
    ...event,
    map_name: event.maps?.name || 'Unknown Map',
    total_seats: countBookableItems(event.maps?.data),
    maps: undefined, // Remove the nested maps object
  }));
}

// Guest operations
export async function getGuests(eventId: string) {
  const { data, error } = await getSupabase()
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('importance_rank', { ascending: true });

  if (error) throw error;
  return data as DatabaseGuest[];
}

export async function createGuest(guest: Omit<DatabaseGuest, 'id' | 'created_at'>) {
  const { data, error } = await getSupabase()
    .from('guests')
    .insert(guest)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseGuest;
}

export async function updateGuest(id: string, updates: Partial<DatabaseGuest>) {
  const { data, error } = await getSupabase()
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as DatabaseGuest;
}

export async function deleteGuest(id: string) {
  const { error } = await getSupabase()
    .from('guests')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Real-time subscriptions - watches bookings table (source of truth)
export function subscribeToEventSeats(
  eventId: string,
  callback: (payload: { type: 'booking_change'; eventId: string }) => void
) {
  return getSupabase()
    .channel(`bookings:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'bookings',
        filter: `event_id=eq.${eventId}`,
      },
      () => {
        // Notify that bookings changed - frontend should refetch
        callback({ type: 'booking_change', eventId });
      }
    )
    .subscribe();
}
