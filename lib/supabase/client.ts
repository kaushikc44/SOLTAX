// SolTax AU - Supabase Browser Client
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      redirectTo: `${origin}/auth/callback`,
    },
  });
}

// Email/Password Auth helpers
export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
  });
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function sendMagicLink(email: string) {
  const supabase = createClient();
  return supabase.auth.signInWithOtp({
    email,
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Auth state change listener
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
