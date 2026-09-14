import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// All routes here are staff/admin only. RLS backs this up independently
// (bookings/profiles policies already grant staff/admin broader reads),
// but requireRole gives a clean 403 before hitting the DB at all.
router.use(requireAuth, requireRole("staff", "admin"));

// GET /admin/bookings?status=pending
// Enriched booking queue — joins resource name and member name so the
// dashboard doesn't need N+1 lookups. Defaults to pending only (the
// brief's "pending bookings queue"); pass status=all for everything.
router.get("/bookings", async (req, res) => {
  const status = (req.query.status as string) || "pending";

  let query = req.supabase!
    .from("bookings")
    .select(
      "id, start_time, end_time, status, created_at, resources(name), profiles(full_name)"
    )
    .order("created_at", { ascending: true })
    .range(0, 99);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ bookings: data });
});

// GET /admin/members?search=
// Member directory with a simple name/email search, per the brief's
// "member directory with search/filter" requirement.
router.get("/members", async (req, res) => {
  const search = (req.query.search as string) || "";

  let query = req.supabase!
    .from("profiles")
    .select("id, full_name, role, membership_tier, joined_at")
    .order("joined_at", { ascending: false })
    .range(0, 99);

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ members: data });
});

// GET /admin/stats
// Minimal reporting: bookings this month, total donations, active members.
// Uses count-only queries where possible to keep this cheap.
router.get("/stats", async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [bookingsThisMonth, donationsTotal, activeMembers] = await Promise.all([
    req.supabase!
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString()),
    req.supabase!.from("donations").select("amount"),
    req.supabase!
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "member"),
  ]);

  if (bookingsThisMonth.error) return res.status(400).json({ error: bookingsThisMonth.error.message });
  if (donationsTotal.error) return res.status(400).json({ error: donationsTotal.error.message });
  if (activeMembers.error) return res.status(400).json({ error: activeMembers.error.message });

  const totalDonations = (donationsTotal.data ?? []).reduce(
    (sum, d) => sum + Number(d.amount),
    0
  );

  res.json({
    bookings_this_month: bookingsThisMonth.count ?? 0,
    total_donations: totalDonations,
    active_members: activeMembers.count ?? 0,
  });
});

export default router;
