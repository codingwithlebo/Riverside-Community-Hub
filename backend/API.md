# API Reference — Riverside Community Hub Backend

Base URL (local): `http://localhost:4000`

## Authentication

Most routes require a Supabase-issued JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

Get this token from the frontend's Supabase session
(`supabase.auth.getSession()` → `session.access_token`). The backend
verifies it against Supabase Auth, loads the caller's role from
`profiles`, and proxies the request through a Supabase client scoped to
that user's token — so **Row Level Security applies to every request
exactly as it would if the browser talked to Supabase directly.**

Routes marked **Public** need no header at all.

Common error shape for every route:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing/invalid fields, or a Supabase/DB error |
| `401` | Missing, malformed, or invalid/expired token |
| `403` | Authenticated, but role isn't allowed to do this |
| `409` | Booking conflict — the time slot is already taken |
| `500` | Unexpected server error |

---

## Health

### `GET /health`
**Public.** Confirms the server is running.

**Response `200`:**
```json
{ "ok": true }
```

---

## Resources

### `GET /resources`
**Public.** List all rooms/equipment. Paginated to the first 50.

**Response `200`:**
```json
{
  "resources": [
    {
      "id": "uuid",
      "name": "Main Hall",
      "type": "room",
      "capacity": 80,
      "description": "Large multipurpose hall for events and programmes"
    }
  ]
}
```

### `GET /resources/:id/availability`
**Public.** Upcoming `pending`/`approved` bookings for one resource — powers
the calendar/availability view without exposing who booked what.

**Response `200`:**
```json
{
  "availability": [
    { "start_time": "2026-10-01T09:00:00Z", "end_time": "2026-10-01T11:00:00Z", "status": "approved" }
  ]
}
```

### `POST /resources`
**Staff/admin only.**

**Body:**
```json
{ "name": "Storage Room", "type": "room", "capacity": 5, "description": "Optional" }
```
`type` must be `"room"` or `"equipment"`.

**Response `201`:** `{ "resource": { ...as above... } }`

### `PATCH /resources/:id`
**Staff/admin only.** Body: any of `name`, `capacity`, `description`.

**Response `200`:** `{ "resource": { ...updated row... } }`

---

## Bookings

### `GET /bookings`
**Authenticated.** Members see only their own bookings (enforced by RLS);
staff/admin see everyone's. Paginated to the first 50.

**Response `200`:**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "resource_id": "uuid",
      "start_time": "2026-10-01T09:00:00Z",
      "end_time": "2026-10-01T11:00:00Z",
      "status": "pending",
      "created_at": "2026-09-20T12:00:00Z"
    }
  ]
}
```

### `POST /bookings`
**Authenticated (any role).** Requests a booking as the caller.

**Body:**
```json
{
  "resource_id": "uuid",
  "start_time": "2026-10-01T09:00:00Z",
  "end_time": "2026-10-01T11:00:00Z"
}
```

**Response `201`:** `{ "booking": { ...status: "pending"... } }`

**Response `409`** (slot already taken — DB-level exclusion constraint, not just app logic):
```json
{ "error": "That resource is already booked for this time slot" }
```

### `PATCH /bookings/:id/status`
**Staff/admin only.** Approve, reject, or cancel a booking.

**Body:**
```json
{ "status": "approved" }
```
`status` must be one of `pending`, `approved`, `rejected`, `cancelled`.

**Response `200`:** `{ "booking": { ...updated row... } }`

---

## Donations

### `GET /donations/campaigns`
**Public.** Active fundraising campaigns — powers the progress bar.

**Response `200`:**
```json
{
  "campaigns": [
    { "id": "uuid", "title": "Winter Food Parcels 2026", "goal_amount": 50000, "current_amount": 1200, "active": true }
  ]
}
```

### `POST /donations`
**Public** (works with or without a token). If an `Authorization` header
is present and valid, the donation is linked to that member (`donor_id`
set); otherwise it's recorded anonymously.

**Body:**
```json
{ "amount": 250, "campaign_id": "uuid" }
```

**Response `201`:** `{ "donation": { ...row... } }`

Also bumps the campaign's `current_amount` by the donated amount.

### `GET /donations`
**Admin only.** All donations, newest first. Paginated to 200.

### `GET /donations/export`
**Admin only.** Streams a CSV file (`Content-Disposition: attachment`) of
every donation — id, donor_id, amount, campaign_id, created_at.

---

## Admin

All routes below require **staff or admin** role.

### `GET /admin/bookings?status=pending`
Enriched booking queue with resource name and member name joined in, so
the dashboard doesn't need separate lookups. `status` defaults to
`pending`; pass `status=all` for every booking regardless of state.

**Response `200`:**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "start_time": "2026-10-01T09:00:00Z",
      "end_time": "2026-10-01T11:00:00Z",
      "status": "pending",
      "created_at": "2026-09-20T12:00:00Z",
      "resources": { "name": "Main Hall" },
      "profiles": { "full_name": "Jane Member" }
    }
  ]
}
```

### `GET /admin/members?search=`
Member directory with an optional case-insensitive name filter.

**Response `200`:**
```json
{
  "members": [
    { "id": "uuid", "full_name": "Jane Member", "role": "member", "membership_tier": "free", "joined_at": "2026-06-01T00:00:00Z" }
  ]
}
```

### `GET /admin/stats`
Simple reporting numbers for the dashboard.

**Response `200`:**
```json
{
  "bookings_this_month": 12,
  "total_donations": 4300,
  "active_members": 58
}
```
