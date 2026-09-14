import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { listCampaigns, createDonation } from "../lib/api";
import type { Campaign } from "../lib/api";

const PRESET_AMOUNTS = [100, 250, 500, 1000];

export default function Donate() {
  const { session } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState<number | "">("");
  const [pledgeType, setPledgeType] = useState<"once" | "recurring">("once");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function loadCampaign() {
    listCampaigns()
      .then((campaigns) => setCampaign(campaigns[0] ?? null))
      .catch((e) => setLoadError(e.message));
  }

  useEffect(loadCampaign, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(false);

    if (!campaign) return;
    if (!amount || amount <= 0) {
      setSubmitError("Enter an amount greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await createDonation({
        amount,
        campaign_id: campaign.id,
        token: session?.access_token,
      });
      setSuccess(true);
      setAmount("");
      loadCampaign(); // refresh progress bar with the new total
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <div className="form-error">{loadError}</div>;
  if (!campaign) return <p>Loading…</p>;

  const pct = Math.min(100, Math.round((campaign.current_amount / campaign.goal_amount) * 100));

  return (
    <div className="page-wide">
      <h1>{campaign.title}</h1>
      <p className="sub">Every parcel funds a family through the coldest months.</p>

      <div className="progress-wrap">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-stats">
          <strong>R{campaign.current_amount.toLocaleString()}</strong> raised of R
          {campaign.goal_amount.toLocaleString()} goal ({pct}%)
        </div>
      </div>

      <h2>Make a donation</h2>
      {submitError && <div className="form-error">{submitError}</div>}
      {success && (
        <div className="form-notice">
          Thank you — your donation has been recorded and the total above is updated.
        </div>
      )}
      {!session && (
        <p className="sub">
          Donating without an account? That's fine — this can stay anonymous. Sign in first if
          you'd like it linked to your membership.
        </p>
      )}

      <form onSubmit={handleSubmit} className="donate-form">
        <div className="pledge-toggle">
          <button
            type="button"
            className={pledgeType === "once" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setPledgeType("once")}
          >
            One-off
          </button>
          <button
            type="button"
            className={pledgeType === "recurring" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setPledgeType("recurring")}
          >
            Adopt a food parcel (recurring)
          </button>
        </div>
        {pledgeType === "recurring" && (
          <p className="pledge-note">
            This logs your intent to give monthly — we'll follow up to set up the recurring
            amount; no card is charged automatically yet.
          </p>
        )}

        <div className="amount-presets">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              type="button"
              key={preset}
              className={amount === preset ? "amount-btn active" : "amount-btn"}
              onClick={() => setAmount(preset)}
            >
              R{preset}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="amount">Or enter an amount (R)</label>
          <input
            id="amount"
            type="number"
            min={1}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? "Processing…"
            : pledgeType === "recurring"
              ? "Pledge monthly"
              : "Donate now"}
        </button>
      </form>
    </div>
  );
}
