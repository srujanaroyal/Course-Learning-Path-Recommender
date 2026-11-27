import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api.js";

export const LEVELS = ["", "Beginner", "Intermediate", "Advanced"];

export function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    return api(path).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload, loading: !data && !error };
}

export function Header({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function State({ loading, error }) {
  if (loading) return <p className="muted">Loading…</p>;
  if (!error) return null;
  const needsProfile = /career goal/i.test(error);
  return (
    <div className="notice">
      <p>{error}</p>
      {needsProfile && <Link className="btn" to="/profile">Complete your profile</Link>}
    </div>
  );
}

export function Bar({ value, tone = "teal" }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100">
      <span className={`fill ${tone}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

export const Level = ({ level }) => <span className={`tag lv-${String(level).toLowerCase()}`}>{level}</span>;
