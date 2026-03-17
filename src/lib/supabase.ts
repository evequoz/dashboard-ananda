// On neutralise Supabase car nous utilisons n8n et le VPS en direct
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
};

// On exporte createClient au cas où un autre fichier l'appelle, mais il ne fait rien
export const createClient = () => supabase;
