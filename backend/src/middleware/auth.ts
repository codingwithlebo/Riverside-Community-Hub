import { Request, Response, NextFunction } from "express";
import { supabaseAdmin, supabaseForUser } from "../lib/supabase";

// Extend Express's Request type so downstream routes get typed access
// to the authenticated user, their role, and a request-scoped Supabase
// client that respects their RLS policies.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "member" | "staff" | "admin";
      };
      supabase?: ReturnType<typeof supabaseForUser>;
    }
  }
}

// Verifies the bearer token against Supabase Auth, then looks up the
// caller's role from `profiles`. Attaches `req.user` and a `req.supabase`
// client scoped to that user's token so route handlers automatically
// get RLS-enforced queries — they never need the service role key.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: "No profile found for this user" });
  }

  req.user = { id: userData.user.id, role: profile.role };
  req.supabase = supabaseForUser(token);
  next();
}

// Route-level role gate. Use after requireAuth, e.g.:
//   router.get("/reports", requireAuth, requireRole("staff", "admin"), handler)
export function requireRole(...roles: Array<"member" | "staff" | "admin">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
