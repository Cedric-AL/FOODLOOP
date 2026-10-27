import { donationStages, donationGroup, donationLabel } from "./donationStatus";
export default function AdminInsights({
  donations,
}: {
  donations: { status: string; createdAt: string }[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - 6 + i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      date: day.toLocaleDateString(),
      count: donations.filter(
        (d) => new Date(d.createdAt) >= day && new Date(d.createdAt) < next,
      ).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const statuses = donationStages;
  return (
    <section className="admin-insights" aria-label="Donation insights">
      <article className="insight-card">
        <div className="insight-title">
          <div>
            <h2>Donation activity</h2>
          </div>
          <span className="insight-period">Last 7 days</span>
        </div>
        <p className="sub">New donations per day · your local time</p>
        <div className="activity-chart">
          {days.map((d, i) => (
            <div
              className="activity-column"
              key={i}
              aria-label={`${d.date}: ${d.count} donations`}
            >
              <strong>{d.count}</strong>
              <div className="activity-track">
                <span style={{ height: `${(d.count / max) * 100}%` }} />
              </div>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        {!donations.length && (
          <p className="sub">
            Activity will appear when the first donation is submitted.
          </p>
        )}
      </article>
      <article className="insight-card">
        <div className="insight-title">
          <div>
            <h2>Donation status</h2>
          </div>
          <strong>{donations.length}</strong>
        </div>
        <div className="status-breakdown">
          {statuses.map((status) => {
            const count = donations.filter(
              (d) => donationGroup(d.status) === status,
            ).length;
            return (
              <div key={status}>
                <span>{donationLabel(status)}</span>
                <b>{count}</b>
                <progress
                  aria-label={donationLabel(status)}
                  max={Math.max(1, donations.length)}
                  value={count}
                />
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
