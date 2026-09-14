import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// GET /bookings
// Members: RLS on `req.supabase` (scoped to their token) automatically
// restricts this to their own bookings, per the "own bookings" policy.
// Staff/admin: RLS "staff manage bookings" policy lets this same query
// return every booking with no extra code needed here.
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await req.supabase!
    .from("bookings")
    .select("id, resource_id, start_time, end_time, status, created_at")
    .order("start_time", { ascending: true })
    .range(0, 49); // paginate — first 50, per non-functional requirement

  if (error) return res.status(400).json({ error: error.message });
  res.json({ bookings: data });
});

// POST /bookings
// Any authenticated member can request a booking. Validates the shape
// here; the DB's exclusion constraint (no_overlap) is the real guard
// against double-booking, so a 409 means "someone already holds that slot".
router.post("/", requireAuth, async (req, res) => {
  const { resource_id, start_time, end_time } = req.body ?? {};

  if (!resource_id || !start_time || !end_time) {
    return res.status(400).json({ error: "resource_id, start_time, end_time are required" });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: "end_time must be after start_time" });
  }

  const { data, error } = await req.supabase!
    .from("bookings")
    .insert({
      resource_id,
      member_id: req.user!.id,
      start_time,
      end_time,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // Postgres exclusion constraint violation -> conflict
    if (error.code === "23P01") {
      return res.status(409).json({ error: "That resource is already booked for this time slot" });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ booking: data });
});

// PATCH /bookings/:id/status
// Staff/admin only — approve/reject/cancel. requireRole gates this before
// the handler runs; RLS's "staff manage bookings" policy backs it up at
// the DB layer too, so the permission is enforced twice, not just in the UI.
router.patch("/:id/status", requireAuth, requireRole("staff", "admin"), async (req, res) => {
  const { status } = req.body ?? {};
  const allowed = ["pending", "approved", "rejected", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
  }

  const { data, error } = await req.supabase!
    .from("bookings")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ booking: data });
});

export default router;
