import { Router } from "express";
import { supabaseAdmin, supabaseForUser } from "../lib/supabase";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// GET /campaigns
// Public — powers the donation drive progress bar. No auth needed;
// RLS's "public read campaigns" policy allows this.
router.get("/campaigns", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, title, goal_amount, current_amount, active")
    .eq("active", true)
    .order("title", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ campaigns: data });
});

// POST /donations
// Public — donation form. Works for both logged-in members (donor_id set,
// so they can see it in their own history) and anonymous givers (no auth
// header at all, donor_id stays null). RLS's "public insert donations"
// policy permits the insert either way.
router.post("/", async (req, res) => {
  const { amount, campaign_id } = req.body ?? {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  // If an Authorization header is present, scope the insert to that user
  // so donor_id gets set and RLS lets them read it back later. Otherwise
  // fall back to the admin client for a fully anonymous donation.
  const authHeader = req.headers.authorization;
  let donorId: string | null = null;
  let client = supabaseAdmin;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (userData?.user) {
      donorId = userData.user.id;
      client = supabaseForUser(token) as typeof supabaseAdmin;
    }
  }

  const { data, error } = await client
    .from("donations")
    .insert({ amount, campaign_id: campaign_id ?? null, donor_id: donorId })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Bump the campaign's running total. Not atomic against concurrent
  // donations at this scale — fine for the brief's scope, but a Postgres
  // function/trigger would be the production-grade version.
  if (campaign_id) {
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("current_amount")
      .eq("id", campaign_id)
      .single();

    if (campaign) {
      await supabaseAdmin
        .from("campaigns")
        .update({ current_amount: Number(campaign.current_amount) + Number(amount) })
        .eq("id", campaign_id);
    }
  }

  res.status(201).json({ donation: data });
});

// GET /donations
// Admin only — full donation list for the reporting dashboard.
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { data, error } = await req.supabase!
    .from("donations")
    .select("id, donor_id, amount, campaign_id, created_at")
    .order("created_at", { ascending: false })
    .range(0, 199);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ donations: data });
});

// GET /donations/export
// Admin only — CSV export per the brief's requirement.
router.get("/export", requireAuth, requireRole("admin"), async (req, res) => {
  const { data, error } = await req.supabase!
    .from("donations")
    .select("id, donor_id, amount, campaign_id, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const header = "id,donor_id,amount,campaign_id,created_at";
  const rows = (data ?? []).map(
    (d) => `${d.id},${d.donor_id ?? ""},${d.amount},${d.campaign_id ?? ""},${d.created_at}`
  );
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=donations.csv");
  res.send(csv);
});

export default router;
