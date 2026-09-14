# Riverside Community Hub

A membership, booking, and donations platform for Riverside Community Hub — a
nonprofit community centre offering youth programmes, a small gym, meeting/
event rooms, and a food-parcel donation drive.

Built as Melsoft Academy Company Project 3.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  React + TS      │──────▶  Express + TS API │──────▶  Supabase        │
│  (frontend/)      │      │  (backend/)       │      │  Postgres + Auth  │
│  Vite, Router     │◀──────  RLS-scoped        │◀──────  Row Level       │
└─────────────────┘      └──────────────────┘      │  Security         │
        │                                            └──────────────────┘
        └───────────────── direct calls for auth/session (Supabase JS) ────┘
```

- **Frontend** (`/frontend`) — React + TypeScript (Vite). Handles auth
  (signup/login via Supabase directly), the public resource catalogue,
  booking requests, the donation page, and a role-gated staff/admin
  dashboard. Talks to the backend for anything that needs server-side
  validation (bookings, donations, admin views).
- **Backend** (`/backend`) — Express + TypeScript. Verifies each request's
  Supabase JWT, loads the caller's role from `profiles`, and proxies
  requests through a per-user Supabase client so **Row Level Security
  policies apply exactly as they would from the browser** — the backend
  never uses its elevated service-role access for user-facing reads/writes.
- **Supabase** — Postgres database, Auth (email/password with email
  confirmation), and Row Level Security policies enforcing who can read or
  write what, at the database layer, not just the UI.

## User roles

| Role | Can do |
|---|---|
| Public visitor | Browse resources, view availability, see donation progress |
| Member | Book resources, view own bookings, donate |
| Staff | Approve/reject bookings, view member directory & reports |
| Admin | Everything staff can, plus manage staff accounts (manual, via DB for now) |

Enforced by Supabase Auth + RLS policies on every table — see
`backend/README` schema notes below.

## Local setup

### Prerequisites
- Node.js 20+
- A Supabase project (free tier is fine)

### 1. Database
In your Supabase project's SQL Editor, run **`backend/schema.sql`** in full.
It creates every table, the RLS policies, the auto-profile-on-signup
trigger, and seeds a few starter resources and a donation campaign.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `PORT` | Any free port, defaults to 4000 |
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Same page → publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → secret/service_role key. **Never commit this or share it — it bypasses RLS entirely.** |

```bash
npm run dev
```

Runs at `http://localhost:4000`. Check `http://localhost:4000/health`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Same Supabase Project URL as above |
| `VITE_SUPABASE_ANON_KEY` | Same publishable/anon key as above (safe for the browser — RLS is what actually protects the data) |
| `VITE_API_URL` | `http://localhost:4000` locally, or the deployed backend URL in production |

```bash
npm run dev
```

Runs at `http://localhost:5173`.

## Environment variables — full reference

**Never commit `.env` files.** Both folders `.gitignore` them; only
`.env.example` (with placeholder values) is checked in.

| File | Variable | Sensitive? |
|---|---|---|
| `backend/.env` | `SUPABASE_SERVICE_ROLE_KEY` | Yes — full DB access, bypasses RLS |
| `backend/.env` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | No — safe to expose |
| `frontend/.env` | `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL` | No — designed to be public, RLS enforces access |

## Project status

See the project brief's deliverables checklist for full scope. Core
functional flows (auth, bookings with approval workflow, donations with
progress tracking, staff dashboard with reporting) are implemented and
tested against a live Supabase project. Deployment and final polish are
tracked separately.
