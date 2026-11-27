import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar as BarChart } from "react-chartjs-2";
import { Header, LEVELS, State, useLoad } from "../ui.jsx";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Gap() {
  const { data, error, loading } = useLoad("/skill-gap");
  if (loading || error) return <><Header title="Skill gap" /><State loading={loading} error={error} /></>;

  const chart = {
    labels: data.skills.map((s) => s.skill),
    datasets: [
      { label: "Your level", data: data.skills.map((s) => s.current), backgroundColor: "#0b7a75" },
      { label: "Needed for the job", data: data.skills.map((s) => s.required), backgroundColor: "#e8a33d" },
    ],
  };
  const options = {
    indexAxis: "y", responsive: true, maintainAspectRatio: false,
    scales: { x: { min: 0, max: 3, ticks: { stepSize: 1, callback: (v) => LEVELS[v] || "None" } } },
    plugins: { legend: { position: "bottom" } },
  };
  const missing = data.skills.filter((s) => s.status === "Missing").map((s) => s.skill);

  return (
    <>
      <Header title={`Skill gap for ${data.goal}`}>You are {data.readiness}% of the way to job-ready skills.</Header>
      {missing.length > 0 && <p className="notice slim">Missing completely: {missing.join(", ")}</p>}
      <div className="chart" style={{ height: Math.max(280, data.skills.length * 34) }}>
        <BarChart data={chart} options={options} />
      </div>
      <table className="table">
        <thead><tr><th>Skill</th><th>Your level</th><th>Needed</th><th>Status</th></tr></thead>
        <tbody>
          {data.skills.map((s) => (
            <tr key={s.skill}>
              <td>{s.skill}</td><td>{LEVELS[s.current] || "None"}</td><td>{LEVELS[s.required]}</td>
              <td><span className={`state ${s.status === "Mastered" ? "completed" : s.status === "Missing" ? "missing" : "next"}`}>{s.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
