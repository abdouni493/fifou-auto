
import { createClient } from '@supabase/supabase-js';

// PRODUCTION FIX: Always use absolute Supabase URL.
// If env vars are missing/empty in Vercel, fall back to hardcoded values.
// This prevents the client from making relative /api/db/ requests.
const SUPABASE_URL = 'https://ievdekuapysvmiuiadum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldmRla3VhcHlzdm1pdWlhZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTUyMzcsImV4cCI6MjA5MzY3MTIzN30.25aaNOzkfNZtLFswI_Rb0IES-Auyfr_InFt0ioCjK5A';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = (rawUrl && rawUrl.startsWith('https://')) ? rawUrl : SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'autolux-web',
    },
  },
});
