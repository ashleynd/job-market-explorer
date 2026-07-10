import { getSkillStats } from "@/lib/data";

export default function SkillsTable() {
  const stats = getSkillStats();

  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Skill</th>
            <th>Postings</th>
            <th>6-mo trend</th>
            <th>Median salary</th>
            <th>Remote</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.skill}>
              <td>{s.skill}</td>
              <td>{s.postings.toLocaleString()}</td>
              <td className={s.trend6mo >= 0 ? "trend-up" : "trend-down"}>
                {s.trend6mo >= 0 ? "▲" : "▼"} {Math.abs(Math.round(s.trend6mo * 100))}%
              </td>
              <td>${Math.round(s.medianSalary / 1000)}K</td>
              <td>{Math.round(s.remoteShare * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
