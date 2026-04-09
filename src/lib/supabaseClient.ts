import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

/**
 * Factory : le fetch fermé sur `client` évite toute référence circulaire et garantit que
 * chaque requête REST appelle getSession() puis fixe Authorization: Bearer <JWT utilisateur>.
 * (DevTools → Network : vérifier eyJ… sur /rest/v1/*, pas seulement la clé anon.)
 */
function createSupabase(): SupabaseClient {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers ?? undefined);
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }
        return fetch(input, { ...init, headers });
      },
    },
  });
  return client;
}

export const supabase = createSupabase();

/** Session avec access_token (indispensable pour que RLS traite l’utilisateur comme `authenticated`). */
export async function getValidSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null as const, error };
  const session = data.session;
  if (!session?.access_token) return { session: null as const, error: null };
  return { session, error: null };
}
