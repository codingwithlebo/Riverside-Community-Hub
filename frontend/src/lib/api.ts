const API_URL = import.meta.env.VITE_API_URL as string;

export interface Resource {
  id: string;
  name: string;
  type: "room" | "equipment";
  capacity: number | null;
  description: string | null;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  status: "pending" | "approved";
}

export interface Booking {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
}

export interface AdminBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
  resources: { name: string } | null;
  profiles: { full_name: string } | null;
}

export interface Member {
  id: string;
  full_name: string;
  role: "member" | "staff" | "admin";
  membership_tier: "free" | "standard" | "family";
  joined_at: string;
}

export interface AdminStats {
  bookings_this_month: number;
  total_donations: number;
  active_members: number;
}

export interface Campaign {
  id: string;
  title: string;
  goal_amount: number;
  current_amount: number;
  active: boolean;
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return body;
}

// Public — no token needed, matches the backend's open GET /resources route.
export async function listResources(): Promise<Resource[]> {
  const res = await fetch(`${API_URL}/resources`);
  const data = await handle<{ resources: Resource[] }>(res);
  return data.resources;
}

// Public — upcoming pending/approved bookings for a resource, so the
// frontend can render "already taken" slots without exposing who booked them.
export async function getAvailability(resourceId: string): Promise<AvailabilitySlot[]> {
  const res = await fetch(`${API_URL}/resources/${resourceId}/availability`);
  const data = await handle<{ availability: AvailabilitySlot[] }>(res);
  return data.availability;
}

// Requires the caller's Supabase access token — the backend verifies it,
// loads their role, and scopes the insert to member_id = that user via RLS.
export async function createBooking(
  token: string,
  input: { resource_id: string; start_time: string; end_time: string }
): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await handle<{ booking: Booking }>(res);
  return data.booking;
}

// RLS scopes this to the caller's own bookings automatically (staff/admin
// would see everyone's, but the member-facing UI only calls this as a member).
export async function listMyBookings(token: string): Promise<Booking[]> {
  const res = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handle<{ bookings: Booking[] }>(res);
  return data.bookings;
}

// --- staff/admin ---

export async function listAdminBookings(
  token: string,
  status: "pending" | "all" = "pending"
): Promise<AdminBooking[]> {
  const res = await fetch(`${API_URL}/admin/bookings?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handle<{ bookings: AdminBooking[] }>(res);
  return data.bookings;
}

export async function updateBookingStatus(
  token: string,
  bookingId: string,
  status: "approved" | "rejected"
): Promise<Booking> {
  const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  const data = await handle<{ booking: Booking }>(res);
  return data.booking;
}

export async function listMembers(token: string, search = ""): Promise<Member[]> {
  const res = await fetch(
    `${API_URL}/admin/members${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await handle<{ members: Member[] }>(res);
  return data.members;
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle<AdminStats>(res);
}

// --- donations (public) ---

export async function listCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${API_URL}/donations/campaigns`);
  const data = await handle<{ campaigns: Campaign[] }>(res);
  return data.campaigns;
}

// Works for both signed-in members (pass a token so the donation is
// attached to their account) and anonymous givers (omit token entirely —
// donor_id stays null on the backend).
export async function createDonation(input: {
  amount: number;
  campaign_id: string;
  token?: string;
}): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.token) headers.Authorization = `Bearer ${input.token}`;

  const res = await fetch(`${API_URL}/donations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount: input.amount, campaign_id: input.campaign_id }),
  });
  await handle(res);
}
