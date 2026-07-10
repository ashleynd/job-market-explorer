import { getTotals } from "@/lib/data";

export default function StatCards() {
  const { totalPostings, medianSalary, remoteShare, topTrend } = getTotals();

  return (
    <div className="stat-grid">
      <div className="stat-card">
        <p className="label">Postings analyzed</p>
        <p className="value">{totalPostings.toLocaleString()}</p>
      </div>
      <div className="stat-card">
        <p className="label">Median salary</p>
        <p className="value">${Math.round(medianSalary / 1000)}K</p>
      </div>
      <div className="stat-card">
        <p className="label">Remote share</p>
        <p className="value">{Math.round(remoteShare * 100)}%</p>
      </div>
      <div className="stat-card">
        <p className="label">Fastest growing</p>
        <p className="value">{topTrend.skill}</p>
      </div>
    </div>
  );
}
