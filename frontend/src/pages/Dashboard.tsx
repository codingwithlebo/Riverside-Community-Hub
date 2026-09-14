import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { session, role } = useAuth();

  return (
    <div className="dashboard">
      <h1>Hi, you're signed in</h1>
      <p className="sub">
        {session?.user.email} · <span className="role-pill">{role ?? "loading role…"}</span>
      </p>
      <p>
        This is a placeholder — bookings, membership status, and donations UI plug in here next.
      </p>
    </div>
  );
}
