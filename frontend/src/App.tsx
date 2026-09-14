import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import ResourceDetail from "./pages/ResourceDetail";
import MyBookings from "./pages/MyBookings";
import AdminDashboard from "./pages/AdminDashboard";
import StaffRoute from "./components/StaffRoute";
import Donate from "./pages/Donate";

function Topbar() {
  const { session, role, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <Link to="/" className="mark">
        Riverside Community Hub
      </Link>
      <nav>
        <Link to="/resources">Rooms &amp; equipment</Link>
        <Link to="/donate">Donate</Link>
        {session ? (
          <>
            <Link to="/bookings">My bookings</Link>
            <Link to="/dashboard">Dashboard</Link>
            {(role === "staff" || role === "admin") && <Link to="/admin">Staff dashboard</Link>}
            <button className="link" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Join</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="shell">
          <Topbar />
          <main>
            <Routes>
              <Route path="/" element={<Navigate to="/resources" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:id" element={<ResourceDetail />} />
              <Route path="/donate" element={<Donate />} />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <StaffRoute>
                    <AdminDashboard />
                  </StaffRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
