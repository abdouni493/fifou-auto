
import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ievdekuapysvmiuiadum.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldmRla3VhcHlzdm1pdWlhZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTUyMzcsImV4cCI6MjA5MzY3MTIzN30.25aaNOzkfNZtLFswI_Rb0IES-Auyfr_InFt0ioCjK5A';

// Validate that we have the required credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not properly configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'autolux-web'
    }
  }
});

