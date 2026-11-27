import { Header, Level, State, useLoad } from "../ui.jsx";
import { Link } from "react-router-dom";

const LABEL = { completed: "Completed", next: "Start here", available: "Ready", locked: "Locked" };

export default function Path() {
  const { data, error, loading } = useLoad("/learning-path");
  if (loading || error) return <><Header title="Learning path" /><State loading={loading} error={error} /></>;

  const groups = [];
  data.path.forEach((c) => {
    const last = groups[groups.length - 1];
    if (last && last.name === c.milestone) last.items.push(c); else groups.push({ name: c.milestone, items: [c] });
  });

  return (
    <>
      <Header title={`Path to ${data.career_goal}`}>
        {data.remaining_hours} hours left. At {data.hours_per_week} hours a week, that is about {data.estimated_weeks} weeks.
      </Header>
      {!data.path.length && <p>Your skills already cover this goal. Explore <Link to="/recommendations">recommended courses</Link> to go further.</p>}
      <div className="route">
        {groups.map((g) => (
          <section key={g.name} className="milestone">
            <h2>{g.name}</h2>
            <ol>
              {g.items.map((c) => (
                <li key={c.id} className={`stop ${c.status}`}>
                  <span className="dot" aria-hidden="true">{c.status === "completed" ? "✓" : c.step}</span>
                  <div>
                    <h3>{c.title} <span className={`state ${c.status}`}>{LABEL[c.status]}</span></h3>
                    <p className="meta"><Level level={c.level} /> <span>{c.duration_hours} hours</span></p>
                    {c.prereq_titles.length > 0 && <p className="muted">Needs: {c.prereq_titles.join(", ")}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
