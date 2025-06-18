import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey,
{
    auth: {
      persistSession: true, // Enable session persistence
      autoRefreshToken: true, // Enable auto-refreshing the token
      storageKey: 'app-auth',
      detectSessionInUrl: true,
      storage: localStorage // Use localStorage for session storage
    },
    db: {
        schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-web'
      }
    }
  }
)
