import { createClient } from "@supabase/supabase-js";

// This uses the PUBLIC anon/publishable key only — safe to ship to the
// browser because every table has RLS policies controlling what this
// client can actually read or write. Never put the service role/secret
// key here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
