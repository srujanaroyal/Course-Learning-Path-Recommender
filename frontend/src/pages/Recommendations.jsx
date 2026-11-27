import { useState } from "react";
import { api } from "../api.js";
import { Bar, Header, Level, State, useLoad } from "../ui.jsx";

export default function Recommendations() {
  const { data, error, loading, reload } = useLoad("/recommendations");
  const [open, setOpen] = useState(null);
  const [fb, setFb] = useState({});
  const [sent, setSent] = useState({});

  const enroll = async (id) => { await api("/progress", { method: "POST", body: { course_id: id, percent: 0 } }); reload(); };
  const sendFeedback = async (id) => {
    const f = fb[id] || { rating: 5, comment: "" };
    await api("/feedback", { method: "POST", body: { course_id: id, ...f } });
    setSent({ ...sent, [id]: true });
  };

  if (loading || error) return <><Header title="Recommended courses" /><State loading={loading} error={error} /></>;
  const w = data.weights;

  return (
    <>
      <Header title="Recommended courses">
        Ranked for <strong>{data.career_goal}</strong>. Score = {w.skill * 100}% skill match + {w.goal * 100}% career goal + {w.interest * 100}% interests + {w.level * 100}% level fit.
      </Header>
      {!data.recommendations.length && <p>You have covered everything we can recommend for this goal.</p>}
      <ol className="courses">
        {data.recommendations.map((c, i) => (
          <li key={c.id}>
            <div className="rank">{i + 1}</div>
            <div className="course-body">
              <div className="course-top">
                <h3>{c.title}</h3>
                <div className="score"><b>{Math.round(c.score)}</b><span>match</span></div>
              </div>
              <p>{c.description}</p>
              <p className="meta"><Level level={c.level} /> <span>{c.duration_hours} hours</span> <span>{c.category}</span></p>
              <p className="skills">You will learn: {c.new_skills.join(", ")}</p>
              <div className="actions">
                {c.enrolled ? <span className="ok">Enrolled</span> : <button className="btn small" onClick={() => enroll(c.id)}>Enroll</button>}
                <a className="btn small ghost" href={c.url} target="_blank" rel="noreferrer">Find course online</a>
                <button className="link" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide score details" : "Why this score?"}</button>
              </div>
              {open === c.id && (
                <div className="why">
                  {[["Skill match", c.breakdown.skill], ["Career goal", c.breakdown.goal], ["Interests", c.breakdown.interest], ["Level fit", c.breakdown.level]].map(([label, v]) => (
                    <div key={label}><span>{label}</span><Bar value={v} /><b>{v}</b></div>
                  ))}
                  <div className="feedback">
                    {sent[c.id] ? <span className="ok">Thanks for the feedback.</span> : (
                      <>
                        <label>Was this a good recommendation?
                          <select value={(fb[c.id] || {}).rating || 5} onChange={(e) => setFb({ ...fb, [c.id]: { ...(fb[c.id] || {}), rating: Number(e.target.value) } })}>
                            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} out of 5</option>)}
                          </select>
                        </label>
                        <input placeholder="Add a comment (optional)" onChange={(e) => setFb({ ...fb, [c.id]: { rating: 5, ...(fb[c.id] || {}), comment: e.target.value } })} />
                        <button className="btn small ghost" onClick={() => sendFeedback(c.id)}>Send feedback</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
