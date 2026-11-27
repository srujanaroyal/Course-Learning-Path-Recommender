import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Header, LEVELS, State, useLoad } from "../ui.jsx";

export default function Assessment() {
  const meta = useLoad("/meta");
  const [picked, setPicked] = useState({});        // skill -> self level
  const [step, setStep] = useState(1);
  const [questions, setQuestions] = useState({});
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  if (!meta.data) return <><Header title="Skill assessment" /><State loading={meta.loading} error={meta.error} /></>;

  const toggle = (s) => {
    const next = { ...picked };
    if (next[s]) delete next[s]; else next[s] = 1;
    setPicked(next);
  };

  const toQuiz = async () => {
    setError("");
    try {
      const q = await api(`/assessment/questions?skills=${encodeURIComponent(Object.keys(picked).join(";"))}`);
      setQuestions(q);
      setAnswers(Object.fromEntries(Object.entries(q).map(([k, v]) => [k, Array(v.length).fill(-1)])));
      if (Object.keys(q).length) setStep(2); else await submit({}, {});
    } catch (e) { setError(e.message); }
  };

  const submit = async (ans = answers, qs = questions) => {
    setError("");
    const cleaned = {};
    Object.keys(qs).forEach((k) => { cleaned[k] = ans[k]; });
    try {
      const r = await api("/assessment", { method: "POST", body: { self_levels: picked, answers: cleaned } });
      setResults(r.results); setStep(3);
    } catch (e) { setError(e.message); }
  };

  const unanswered = Object.values(answers).some((a) => a.includes(-1));

  if (step === 3) {
    return (
      <>
        <Header title="Assessment complete">Your skill levels are saved to your profile.</Header>
        <table className="table">
          <thead><tr><th>Skill</th><th>Quiz score</th><th>Level</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.skill}><td>{r.skill}</td><td>{r.total ? `${r.correct} of ${r.total}` : "Self-rated"}</td><td>{r.level_name}</td></tr>
            ))}
          </tbody>
        </table>
        <p><Link className="btn" to="/recommendations">See recommended courses</Link></p>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <Header title="Quick quiz">Three questions per skill. Your result sets your level.</Header>
        {Object.entries(questions).map(([skill, qs]) => (
          <fieldset key={skill} className="quiz">
            <legend>{skill}</legend>
            {qs.map((q, qi) => (
              <div key={qi} className="q">
                <p>{q.q}</p>
                {q.options.map((o, oi) => (
                  <label key={oi} className="radio">
                    <input type="radio" name={`${skill}-${qi}`} checked={answers[skill][qi] === oi}
                      onChange={() => setAnswers({ ...answers, [skill]: answers[skill].map((v, i) => (i === qi ? oi : v)) })} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        ))}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={unanswered} onClick={() => submit()}>Submit assessment</button>
        {unanswered && <span className="muted"> Answer every question to submit.</span>}
      </>
    );
  }

  return (
    <>
      <Header title="Skill assessment">Choose the skills you already use, then rate yourself. Skills with a quiz are checked against your answers.</Header>
      <div className="chips">
        {meta.data.skills.map((s) => (
          <button key={s} type="button" className={`chip ${picked[s] ? "on" : ""}`} aria-pressed={!!picked[s]} onClick={() => toggle(s)}>
            {s}{meta.data.quiz_skills.includes(s) ? " ✓" : ""}
          </button>
        ))}
      </div>
      <p className="muted">A tick means this skill has a quiz.</p>
      {Object.keys(picked).length > 0 && (
        <ul className="skill-rows">
          {Object.entries(picked).map(([s, l]) => (
            <li key={s}>
              <span>{s}</span>
              <select aria-label={`${s} self rating`} value={l} onChange={(e) => setPicked({ ...picked, [s]: Number(e.target.value) })}>
                {[1, 2, 3].map((x) => <option key={x} value={x}>{LEVELS[x]}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={!Object.keys(picked).length} onClick={toQuiz}>Continue</button>
    </>
  );
}
