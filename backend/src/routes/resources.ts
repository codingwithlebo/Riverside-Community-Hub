import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// GET /resources
// Public — no auth required. RLS's "public read resources" policy allows
// this for anyone, so we use the admin client here purely for convenience
// (no user token to scope to); the policy itself is what makes this safe
// to expose without auth.
router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select("id, name, type, capacity, description")
    .order("name", { ascending: true })
    .range(0, 49);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ resources: data });
});

// GET /resources/:id/availability
// Public — returns upcoming pending/approved bookings for a resource so
// the frontend can render a calendar/availability view without exposing
// who booked what (just the time ranges).
router.get("/:id/availability", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("start_time, end_time, status")
    .eq("resource_id", req.params.id)
    .in("status", ["pending", "approved"])
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .range(0, 199);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ availability: data });
});

// POST /resources
// Staff/admin only. RLS's "staff manage resources" policy backs this up
// at the DB layer too.
router.post("/", requireAuth, requireRole("staff", "admin"), async (req, res) => {
  const { name, type, capacity, description } = req.body ?? {};

  if (!name || !type) {
    return res.status(400).json({ error: "name and type are required" });
  }
  if (!["room", "equipment"].includes(type)) {
    return res.status(400).json({ error: "type must be 'room' or 'equipment'" });
  }

  const { data, error } = await req.supabase!
    .from("resources")
    .insert({ name, type, capacity, description })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ resource: data });
});

// PATCH /resources/:id
// Staff/admin only — edit an existing resource.
router.patch("/:id", requireAuth, requireRole("staff", "admin"), async (req, res) => {
  const { name, capacity, description } = req.body ?? {};

  const { data, error } = await req.supabase!
    .from("resources")
    .update({ name, capacity, description })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ resource: data });
});

export default router;
