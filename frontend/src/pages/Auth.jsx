import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api.js";

const COPY = {
  login: { title: "Welcome back", cta: "Log in" },
  register: { title: "Create your account", cta: "Create account" },
  forgot: { title: "Reset your password", cta: "Set new password" },
};

export default function Auth({ mode }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setDone("");
    try {
      if (mode === "forgot") {
        await api("/auth/reset-password", { method: "POST", body: { email: form.email, new_password: form.password } });
        setDone("Password updated. You can log in now.");
      } else {
        const body = mode === "register" ? form : { email: form.email, password: form.password };
        const user = await api(`/auth/${mode}`, { method: "POST", body });
        setSession(user);
        navigate(user.is_admin ? "/admin" : mode === "register" ? "/profile" : "/");
      }
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <section className="auth-pitch">
        <div className="brand">Pathfinder</div>
        <h1>Know what to learn next.</h1>
        <p>Tell us your skills and your career goal. We build the course sequence that closes the gap, in the order you should take it.</p>
        <ol className="mini-path" aria-hidden="true">
          <li className="done">Excel Essentials</li>
          <li className="done">SQL for Beginners</li>
          <li className="now">Python for Data Analysis</li>
          <li>Power BI Essentials</li>
          <li>Data Analytics Capstone</li>
        </ol>
      </section>
      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>{COPY[mode].title}</h2>
          {mode === "register" && (
            <label>Full name<input value={form.name} onChange={set("name")} required autoComplete="name" /></label>
          )}
          <label>Email<input type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></label>
          <label>{mode === "forgot" ? "New password" : "Password"}
            <input type="password" minLength={6} value={form.password} onChange={set("password")} required
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          {done && <p className="ok" role="status">{done}</p>}
          <button className="btn" disabled={busy}>{busy ? "Please wait…" : COPY[mode].cta}</button>
          <div className="auth-links">
            {mode !== "login" && <Link to="/login">Back to log in</Link>}
            {mode === "login" && <Link to="/register">Create an account</Link>}
            {mode === "login" && <Link to="/forgot">Forgot password?</Link>}
          </div>
          {mode === "login" && <p className="hint">Admin demo: admin@demo.com / admin123</p>}
        </form>
      </section>
    </div>
  );
}
