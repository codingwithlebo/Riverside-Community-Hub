import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listResources, getAvailability, createBooking } from "../lib/api";
import type { Resource, AvailabilitySlot } from "../lib/api";

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return sameDay
    ? `${s.toLocaleDateString(undefined, dateFmt)}, ${s.toLocaleTimeString(undefined, timeFmt)}–${e.toLocaleTimeString(undefined, timeFmt)}`
    : `${s.toLocaleString(undefined, { ...dateFmt, ...timeFmt })} – ${e.toLocaleString(undefined, { ...dateFmt, ...timeFmt })}`;
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [resource, setResource] = useState<Resource | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([listResources(), getAvailability(id)])
      .then(([resources, slots]) => {
        setResource(resources.find((r) => r.id === id) ?? null);
        setAvailability(slots);
      })
      .catch((e) => setLoadError(e.message));
  }, [id]);

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (!id || !session) return;
    setBookingError(null);
    setBookingSuccess(false);

    if (!startTime || !endTime) {
      setBookingError("Pick a start and end time.");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking(session.access_token, {
        resource_id: id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setBookingSuccess(true);
      setStartTime("");
      setEndTime("");
      const slots = await getAvailability(id);
      setAvailability(slots);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <div className="form-error">{loadError}</div>;
  if (!resource) return <p>Loading…</p>;

  return (
    <div className="page-wide">
      <Link to="/resources" className="back-link">
        ← All rooms &amp; equipment
      </Link>
      <span className={`type-tag ${resource.type}`}>{resource.type}</span>
      <h1>{resource.name}</h1>
      {resource.description && <p className="sub">{resource.description}</p>}
      {resource.capacity && <p className="capacity">Capacity: {resource.capacity}</p>}

      <h2>Already booked</h2>
      {availability.length === 0 ? (
        <p>No upcoming bookings — it's wide open.</p>
      ) : (
        <ul className="slot-list">
          {availability.map((slot, i) => (
            <li key={i}>
              {formatRange(slot.start_time, slot.end_time)}
              {slot.status === "pending" && <span className="status-tag pending">pending</span>}
            </li>
          ))}
        </ul>
      )}

      <h2>Request a booking</h2>
      {!session ? (
        <p>
          <Link to="/login">Sign in</Link> to request a booking.
        </p>
      ) : (
        <form onSubmit={handleBook} className="booking-form">
          {bookingError && <div className="form-error">{bookingError}</div>}
          {bookingSuccess && (
            <div className="form-notice">
              Booking requested — staff will approve or decline it, and you'll see the status
              update in My bookings.
            </div>
          )}
          <div className="field">
            <label htmlFor="start">Start</label>
            <input
              id="start"
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="end">End</label>
            <input
              id="end"
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Requesting…" : "Request booking"}
          </button>
        </form>
      )}
    </div>
  );
}
