import { Link } from "react-router-dom";
import { Bar, Header, Level, State, useLoad } from "../ui.jsx";

export default function Dashboard() {
  const { data: d, error, loading } = useLoad("/dashboard");
  if (loading || error) return <><Header title="Dashboard" /><State loading={loading} error={error} /></>;
  const preview = d.path.filter((c) => c.status !== "completed").slice(0, 5);

  return (
    <>
      <Header title={`Hello, ${d.name.split(" ")[0]}`}>
        {d.has_profile ? <>Your goal: <strong>{d.career_goal}</strong></> : "Set a career goal to get your first learning path."}
      </Header>

      {!d.has_profile && (
        <div className="notice">
          <p>Your recommendations start once we know your goal, interests and current skills.</p>
          <Link className="btn" to="/profile">Complete your profile</Link>
        </div>
      )}

      <section className="stats">
        <div><b>{d.recommended}</b><span>Recommended courses</span></div>
        <div><b>{d.completed}</b><span>Completed</span></div>
        <div><b>{d.in_progress}</b><span>In progress</span></div>
        <div><b>{d.readiness}%</b><span>Ready for {d.career_goal || "your goal"}</span></div>
      </section>

      {d.has_profile && (
        <div className="two">
          <section>
            <h2>Learning path progress</h2>
            <Bar value={d.progress_percent} />
            <p className="muted">{d.progress_percent}% of your path completed</p>
            <ol className="plain-list">
              {preview.map((c) => (
                <li key={c.id}>
                  <span>{c.title}</span><Level level={c.level} />
                </li>
              ))}
              {!preview.length && <li>You have completed every course on this path.</li>}
            </ol>
            <Link to="/path">See the full path</Link>
          </section>
          <section className="next">
            <h2>Up next</h2>
            {d.next_course ? (
              <>
                <h3>{d.next_course.title}</h3>
                <p>{d.next_course.description}</p>
                <p className="muted">{d.next_course.duration_hours} hours · {d.next_course.level}</p>
                <Link className="btn" to="/progress">Start this course</Link>
              </>
            ) : <p>No course waiting. Check your recommendations for new ideas.</p>}
          </section>
        </div>
      )}
    </>
  );
}
