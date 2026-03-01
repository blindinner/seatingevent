import { createClient, SupabaseClient, User, Provider } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export type OAuthProvider = 'google' | 'github' | 'azure';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Check if user needs to confirm email
  if (data.user && !data.session) {
    return { user: data.user, needsEmailConfirmation: true };
  }

  return { user: data.user, session: data.session, needsEmailConfirmation: false };
}

export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = getSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  return subscription;
}
