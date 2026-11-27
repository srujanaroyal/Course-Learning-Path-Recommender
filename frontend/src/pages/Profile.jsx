import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Header, LEVELS, State, useLoad } from "../ui.jsx";

export default function Profile() {
  const meta = useLoad("/meta");
  const prof = useLoad("/profile");
  const [form, setForm] = useState(null);
  const [newSkill, setNewSkill] = useState({ name: "", level: 1 });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (prof.data) setForm(prof.data); }, [prof.data]);
  if (!form || !meta.data) return <><Header title="My profile" /><State loading={!(meta.error || prof.error)} error={meta.error || prof.error} /></>;

  const set = (k, v) => setForm({ ...form, [k]: v });
  const toggleInterest = (i) => set("interests", form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);
  const setSkillLevel = (name, level) => set("skills", form.skills.map((s) => (s.name === name ? { ...s, level } : s)));
  const addSkill = () => {
    const name = newSkill.name.trim();
    if (!name || form.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    set("skills", [...form.skills, { name, level: Number(newSkill.level) }]);
    setNewSkill({ name: "", level: 1 });
  };
  const save = async (e) => {
    e.preventDefault(); setMsg(""); setError("");
    try { await api("/profile", { method: "PUT", body: form }); setMsg("Profile saved. Your recommendations are updated."); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <Header title="My profile">This is what the recommender uses to rank courses for you.</Header>
      <form className="form" onSubmit={save}>
        <div className="grid2">
          <label>Education
            <select value={form.education} onChange={(e) => set("education", e.target.value)}>
              <option value="">Choose one</option>
              {meta.data.education.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Career goal
            <select value={form.career_goal} onChange={(e) => set("career_goal", e.target.value)} required>
              <option value="">Choose one</option>
              {meta.data.career_goals.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Preferred difficulty
            <select value={form.learning_level} onChange={(e) => set("learning_level", e.target.value)}>
              {LEVELS.slice(1).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Hours available per week
            <input type="number" min="1" max="80" value={form.hours_per_week} onChange={(e) => set("hours_per_week", Number(e.target.value))} />
          </label>
        </div>

        <fieldset>
          <legend>Interests</legend>
          <div className="chips">
            {meta.data.interests.map((i) => (
              <button type="button" key={i} className={`chip ${form.interests.includes(i) ? "on" : ""}`}
                aria-pressed={form.interests.includes(i)} onClick={() => toggleInterest(i)}>{i}</button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Current skills</legend>
          {!form.skills.length && <p className="muted">No skills added yet. Add the ones you already have, or take the skill assessment.</p>}
          <ul className="skill-rows">
            {form.skills.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <select aria-label={`${s.name} level`} value={s.level} onChange={(e) => setSkillLevel(s.name, Number(e.target.value))}>
                  {[1, 2, 3].map((l) => <option key={l} value={l}>{LEVELS[l]}</option>)}
                </select>
                <button type="button" className="link" onClick={() => set("skills", form.skills.filter((x) => x.name !== s.name))}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="add-skill">
            <input list="skills" placeholder="Skill name, for example SQL" value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} />
            <datalist id="skills">{meta.data.skills.map((s) => <option key={s} value={s} />)}</datalist>
            <select value={newSkill.level} onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}>
              {[1, 2, 3].map((l) => <option key={l} value={l}>{LEVELS[l]}</option>)}
            </select>
            <button type="button" className="btn ghost" onClick={addSkill}>Add skill</button>
          </div>
        </fieldset>

        {error && <p className="error" role="alert">{error}</p>}
        {msg && <p className="ok" role="status">{msg}</p>}
        <button className="btn">Save profile</button>
      </form>
    </>
  );
}
