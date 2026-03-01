import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service role key
 *
 * IMPORTANT: Only use this in server-side code (API routes, server actions)
 * This client bypasses Row Level Security (RLS)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let adminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminInstance) {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'Supabase admin credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
    adminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminInstance;
}

export const supabaseAdmin = {
  get client() {
    return getSupabaseAdmin();
  },
};
