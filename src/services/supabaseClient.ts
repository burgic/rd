import { createClient } from '@supabase/supabase-js';

// Debug: Log environment variables
console.log('Environment variables:', {
  url: process.env.REACT_APP_SUPABASE_URL,
  key: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
});

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey,
{
    auth: {
      persistSession: true, // Enable session persistence
      autoRefreshToken: false, // Disable auto-refreshing the token
      storageKey: 'app-auth',
      detectSessionInUrl: true,
      storage: localStorage // Use localStorage for session storage
    },
    db: {
        schema: 'public'
    }
  }
)
