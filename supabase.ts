
import { createClient } from '@supabase/supabase-js';

// CRITICAL FIX: Always use hardcoded absolute Supabase URL.
// DO NOT rely on environment variables — if VITE_SUPABASE_URL is misconfigured
// in Vercel (e.g. set to the app domain instead of supabase.co), it causes
// all API calls to be routed to /api/db/ which results in 500 errors.
const SUPABASE_URL = 'https://ievdekuapysvmiuiadum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldmRla3VhcHlzdm1pdWlhZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTUyMzcsImV4cCI6MjA5MzY3MTIzN30.25aaNOzkfNZtLFswI_Rb0IES-Auyfr_InFt0ioCjK5A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
