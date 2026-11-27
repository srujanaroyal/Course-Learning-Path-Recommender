import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { clearSession, getToken, getUser } from "./api.js";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Assessment from "./pages/Assessment.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Path from "./pages/Path.jsx";
import Gap from "./pages/Gap.jsx";
import Progress from "./pages/Progress.jsx";
import Admin from "./pages/Admin.jsx";

const NAV = [
  ["/", "Dashboard"],
  ["/profile", "My profile"],
  ["/assessment", "Skill assessment"],
  ["/recommendations", "Recommended courses"],
  ["/path", "Learning path"],
  ["/gap", "Skill gap"],
  ["/progress", "My progress"],
];

function Shell({ children }) {
  const user = getUser();
  const navigate = useNavigate();
  const logout = () => { clearSession(); navigate("/login"); };
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Pathfinder</div>
        <nav>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
          ))}
          {user?.is_admin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="who">
          <span>{user?.name}</span>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Private({ children, admin }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  if (admin && !getUser()?.is_admin) return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/forgot" element={<Auth mode="forgot" />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="/assessment" element={<Private><Assessment /></Private>} />
      <Route path="/recommendations" element={<Private><Recommendations /></Private>} />
      <Route path="/path" element={<Private><Path /></Private>} />
      <Route path="/gap" element={<Private><Gap /></Private>} />
      <Route path="/progress" element={<Private><Progress /></Private>} />
      <Route path="/admin" element={<Private admin><Admin /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
