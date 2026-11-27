import { useState } from "react";
import { api } from "../api.js";
import { Header, LEVELS, State, useLoad } from "../ui.jsx";

const EMPTY = { title: "", career_goals: "", category: "", level: "Beginner", duration_hours: 10, interests: "", prerequisites: "", skills: "", description: "" };
const csv = (s) => s.split(";").map((x) => x.trim()).filter(Boolean);

export default function Admin() {
  const stats = useLoad("/admin/stats");
  const courses = useLoad("/admin/courses");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const refresh = () => { stats.reload(); courses.reload(); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setError("");
    const body = {
      ...form, duration_hours: Number(form.duration_hours),
      career_goals: csv(form.career_goals), interests: csv(form.interests), skills: csv(form.skills),
      prerequisites: csv(form.prerequisites).map(Number).filter((n) => !Number.isNaN(n)),
    };
    try {
      await api(editing ? `/admin/courses/${editing}` : "/admin/courses", { method: editing ? "PUT" : "POST", body });
      setForm(EMPTY); setEditing(null); refresh();
    } catch (err) { setError(err.message); }
  };
  const edit = (c) => {
    setEditing(c.id);
    setForm({ title: c.title, career_goals: c.goals.join("; "), category: c.category, level: c.level, duration_hours: c.duration_hours,
      interests: c.interests.join("; "), prerequisites: c.prereqs.join("; "), skills: c.skills.join("; "), description: c.description });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.title}"? Student progress on this course is removed too.`)) return;
    await api(`/admin/courses/${c.id}`, { method: "DELETE" }); refresh();
  };

  if (!stats.data || !courses.data) return <><Header title="Admin" /><State loading={!(stats.error || courses.error)} error={stats.error || courses.error} /></>;
  const s = stats.data;

  return (
    <>
      <Header title="Admin dashboard">Manage the course catalogue and watch how students use it.</Header>
      <section className="stats">
        <div><b>{s.students}</b><span>Students</span></div>
        <div><b>{s.courses}</b><span>Courses</span></div>
        <div><b>{s.enrollments}</b><span>Enrollments</span></div>
        <div><b>{s.avg_rating ?? "–"}</b><span>Average rating ({s.feedback_count})</span></div>
      </section>

      <form className="form" onSubmit={save}>
        <h2>{editing ? "Edit course" : "Add a course"}</h2>
        <div className="grid2">
          <label>Title<input value={form.title} onChange={set("title")} required /></label>
          <label>Category<input value={form.category} onChange={set("category")} /></label>
          <label>Level<select value={form.level} onChange={set("level")}>{LEVELS.slice(1).map((l) => <option key={l}>{l}</option>)}</select></label>
          <label>Duration in hours<input type="number" min="1" value={form.duration_hours} onChange={set("duration_hours")} /></label>
          <label>Career goals (separate with ;)<input value={form.career_goals} onChange={set("career_goals")} placeholder="Data Analyst; Data Scientist" /></label>
          <label>Skills taught (separate with ;)<input value={form.skills} onChange={set("skills")} placeholder="SQL; Databases" /></label>
          <label>Interests (separate with ;)<input value={form.interests} onChange={set("interests")} placeholder="Data; Analytics" /></label>
          <label>Prerequisite course IDs (separate with ;)<input value={form.prerequisites} onChange={set("prerequisites")} placeholder="1; 3" /></label>
        </div>
        <label>Description<textarea rows="2" value={form.description} onChange={set("description")} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button className="btn">{editing ? "Save changes" : "Add course"}</button>
          {editing && <button type="button" className="btn ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </form>

      <h2>Course catalogue</h2>
      <div className="scroll">
        <table className="table">
          <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Level</th><th>Hours</th><th>Skills</th><th></th></tr></thead>
          <tbody>
            {courses.data.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td><td>{c.title}</td><td>{c.category}</td><td>{c.level}</td><td>{c.duration_hours}</td><td>{c.skills.join(", ")}</td>
                <td className="nowrap"><button className="link" onClick={() => edit(c)}>Edit</button> <button className="link danger" onClick={() => remove(c)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
