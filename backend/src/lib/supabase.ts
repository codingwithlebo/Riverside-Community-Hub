import { createClient } from "@supabase/supabase-js";

// Two clients:
// - supabaseAdmin: uses the SERVICE ROLE key, bypasses RLS. Only use this
//   for operations the backend must do on behalf of the system (e.g.
//   verifying a user's JWT). Never expose this client or key to the frontend.
// - supabaseForUser: built per-request, scoped to the requesting user's JWT,
//   so RLS policies apply exactly as they would from the Supabase client
//   directly. Prefer this for all normal reads/writes.

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY in .env"
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Creates a Supabase client scoped to the requesting user's access token,
// so every query made with it is subject to that user's RLS policies.
export function supabaseForUser(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
