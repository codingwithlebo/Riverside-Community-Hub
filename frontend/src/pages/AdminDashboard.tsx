import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  listAdminBookings,
  updateBookingStatus,
  listMembers,
  getAdminStats,
} from "../lib/api";
import type { AdminBooking, Member, AdminStats } from "../lib/api";

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${s.toLocaleDateString(undefined, dateFmt)}, ${s.toLocaleTimeString(undefined, timeFmt)}–${e.toLocaleTimeString(undefined, timeFmt)}`;
}

export default function AdminDashboard() {
  const { session } = useAuth();
  const token = session!.access_token;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<AdminBooking[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  function refreshBookings() {
    listAdminBookings(token, "pending").then(setPending).catch((e) => setError(e.message));
  }

  useEffect(() => {
    getAdminStats(token).then(setStats).catch((e) => setError(e.message));
    refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      listMembers(token, search).then(setMembers).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [search, token]);

  async function handleDecision(bookingId: string, decision: "approved" | "rejected") {
    setActioning(bookingId);
    try {
      await updateBookingStatus(token, bookingId, decision);
      refreshBookings();
      getAdminStats(token).then(setStats).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update that booking.");
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="page-wide">
      <h1>Staff dashboard</h1>
      <p className="sub">Pending requests, member directory, and this month at a glance.</p>

      {error && <div className="form-error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats?.bookings_this_month ?? "…"}</span>
          <span className="stat-label">bookings this month</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {stats ? `R${stats.total_donations.toLocaleString()}` : "…"}
          </span>
          <span className="stat-label">total donations</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.active_members ?? "…"}</span>
          <span className="stat-label">active members</span>
        </div>
      </div>

      <h2>Pending bookings</h2>
      {pending && pending.length === 0 && <p>Nothing waiting on approval right now.</p>}
      <ul className="booking-list">
        {pending?.map((b) => (
          <li key={b.id} className="booking-row">
            <div>
              <strong>{b.resources?.name ?? "Resource"}</strong>
              <div className="sub">
                {b.profiles?.full_name ?? "Member"} · {formatRange(b.start_time, b.end_time)}
              </div>
            </div>
            <div className="approval-actions">
              <button
                className="btn-approve"
                disabled={actioning === b.id}
                onClick={() => handleDecision(b.id, "approved")}
              >
                Approve
              </button>
              <button
                className="btn-reject"
                disabled={actioning === b.id}
                onClick={() => handleDecision(b.id, "rejected")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h2>Member directory</h2>
      <input
        className="search-input"
        type="text"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="member-list">
        {members?.map((m) => (
          <li key={m.id} className="member-row">
            <span>{m.full_name}</span>
            <span className="sub">{m.membership_tier}</span>
            <span className="role-pill">{m.role}</span>
          </li>
        ))}
        {members && members.length === 0 && <p>No members match that search.</p>}
      </ul>
    </div>
  );
}
