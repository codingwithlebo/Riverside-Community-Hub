# Riverside Community Hub — Staff Handover Guide

This guide is for Riverside staff and admin users — no technical
background needed. It covers day-to-day use of the platform: logging in,
approving bookings, checking on members, and viewing reports.

If something doesn't match what you see on screen, the platform may have
been updated since this guide was written — check with whoever manages
the technical side of the site.

---

## 1. Logging in

1. Go to the site's web address (ask your administrator for the link if
   you don't have it).
2. Click **Sign in** in the top right.
3. Enter the email and password you were given.
4. You'll land on your dashboard, which shows your name and your role
   (Staff or Admin).

If you don't have an account yet, someone with Admin access needs to
create one for you and set your role to Staff or Admin — new signups
default to a regular Member account, which can't approve bookings or see
member details.

---

## 2. Approving or rejecting a booking request

When a member requests a room or piece of equipment, it doesn't get
confirmed automatically — it waits for a staff member to review it. This
stops double-bookings and lets you keep an eye on who's using the space.

1. Click **Staff dashboard** in the top navigation (only visible once
   you're signed in with a Staff or Admin account).
2. Under **Pending bookings**, you'll see every request waiting on a
   decision — who asked, what they want, and when.
3. Click **Approve** to confirm it, or **Reject** to decline it.
4. That's it — the member will see the updated status the next time they
   check their own bookings page. There's no separate notification step
   yet, so if a request is urgent, it's worth reaching out to the member
   directly for now.

Approved and rejected requests disappear from this list once actioned —
they're not deleted, just no longer "waiting."

---

## 3. Looking up members

Still on the **Staff dashboard**, scroll to **Member directory**.

- Type a name into the search box to filter the list as you type.
- Each entry shows the member's name, their membership tier (Free,
  Standard, or Family), and their role.

This is a read-only view for now — to change someone's role (for example,
promoting a member to Staff) or their membership tier, that currently
needs to be done directly in the database by whoever manages the
technical side. Ask them, or see the *Database access* note at the
bottom of this guide.

---

## 4. Checking on donations

Donations don't need staff approval — anyone can donate anytime through
the public **Donate** page, with or without an account.

To see the numbers:
- The **Staff dashboard**'s top row shows **total donations** at a
  glance, updated live.
- For a full list of every individual donation (useful for board reports
  or funder updates), that currently needs to be pulled from the
  database directly — ask your technical contact for a CSV export.

---

## 5. Understanding membership tiers

Members choose (or are assigned) one of three tiers when they sign up:

| Tier | What it means |
|---|---|
| Free | Basic access |
| Standard | — |
| Family | — |

Tier benefits and pricing aren't enforced by the platform yet — there's
no payment step built in. Upgrading someone's tier, or renewing an
expiring membership, is currently a manual step done in the database.

---

## 6. What the platform doesn't do yet

Worth knowing so you don't go looking for these:

- **No automatic email notifications** when a booking is approved or
  rejected, or when a membership is expiring — members need to check the
  site itself.
- **No online payments** — donations and membership fees are recorded,
  but no money actually moves through the platform yet.
- **No self-service role/tier changes** — an admin can't yet promote a
  member to staff, or change someone's membership tier, from within the
  site itself; both currently require direct database access.

---

## Database access (for your technical contact)

If you need something this guide says isn't possible yet — changing a
member's role, exporting donation data, adjusting a campaign goal — your
technical contact can do it directly in the Supabase project's **Table
Editor** or **SQL Editor**. Common examples:

Promote a member to staff:
```sql
update profiles set role = 'staff' where id = '<their user id>';
```

Change someone's membership tier:
```sql
update profiles set membership_tier = 'family' where id = '<their user id>';
```

Update a campaign's fundraising goal:
```sql
update campaigns set goal_amount = 75000 where title = 'Winter Food Parcels 2026';
```
