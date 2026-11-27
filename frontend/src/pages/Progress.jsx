import { api } from "../api.js";
import { Bar, Header, Level, State, useLoad } from "../ui.jsx";

export default function Progress() {
  const { data, error, loading, reload } = useLoad("/progress");
  const update = async (course_id, body) => { await api("/progress", { method: "POST", body: { course_id, ...body } }); reload(); };

  if (loading || error) return <><Header title="My progress" /><State loading={loading} error={error} /></>;
  const ongoing = data.progress.filter((p) => p.status === "in_progress");
  const done = data.progress.filter((p) => p.status === "completed");
  const next = data.next_course;

  return (
    <>
      <Header title="My progress">Update your progress as you learn. Finishing a course raises your skill levels.</Header>

      {next && (
        <section className="next wide">
          <h2>Next recommended course</h2>
          <h3>{next.title}</h3>
          <p>{next.description}</p>
          {ongoing.some((o) => o.course_id === next.id) ? <p className="muted">Already in progress below.</p> :
            <button className="btn" onClick={() => update(next.id, { percent: 0 })}>Start this course</button>}
        </section>
      )}

      <h2>In progress</h2>
      {!ongoing.length && <p className="muted">Nothing in progress. Enroll in a course from your recommendations or learning path.</p>}
      <ul className="progress-list">
        {ongoing.map((p) => (
          <li key={p.course_id}>
            <div className="row"><h3>{p.title}</h3><Level level={p.level} /></div>
            <Bar value={p.percent} />
            <div className="row">
              <label className="slider">{p.percent}% done
                <input type="range" min="0" max="100" step="10" defaultValue={p.percent}
                  onMouseUp={(e) => update(p.course_id, { percent: Number(e.target.value) })}
                  onTouchEnd={(e) => update(p.course_id, { percent: Number(e.target.value) })}
                  onKeyUp={(e) => update(p.course_id, { percent: Number(e.target.value) })} />
              </label>
              <button className="btn small" onClick={() => update(p.course_id, { completed: true })}>Mark as completed</button>
            </div>
          </li>
        ))}
      </ul>

      <h2>Completed</h2>
      {!done.length && <p className="muted">No completed courses yet.</p>}
      <ul className="plain-list">
        {done.map((p) => <li key={p.course_id}><span>{p.title}</span><span className="state completed">Completed</span></li>)}
      </ul>
    </>
  );
}
