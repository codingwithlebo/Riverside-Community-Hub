import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listMyBookings } from "../lib/api";
import type { Booking, Resource } from "../lib/api";
import { listResources } from "../lib/api";

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${s.toLocaleDateString(undefined, dateFmt)}, ${s.toLocaleTimeString(undefined, timeFmt)}–${e.toLocaleTimeString(undefined, timeFmt)}`;
}

export default function MyBookings() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([listMyBookings(session.access_token), listResources()])
      .then(([b, r]) => {
        setBookings(b);
        setResources(r);
      })
      .catch((e) => setError(e.message));
  }, [session]);

  function resourceName(id: string) {
    return resources.find((r) => r.id === id)?.name ?? "Resource";
  }

  return (
    <div className="page-wide">
      <h1>My bookings</h1>
      <p className="sub">Everything you've requested, and where it stands.</p>

      {error && <div className="form-error">{error}</div>}
      {!bookings && !error && <p>Loading…</p>}
      {bookings && bookings.length === 0 && (
        <p>
          No bookings yet — head to <a href="/resources">rooms &amp; equipment</a> to request one.
        </p>
      )}

      <ul className="booking-list">
        {bookings?.map((b) => (
          <li key={b.id} className="booking-row">
            <div>
              <strong>{resourceName(b.resource_id)}</strong>
              <div className="sub">{formatRange(b.start_time, b.end_time)}</div>
            </div>
            <span className={`status-tag ${b.status}`}>{b.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
