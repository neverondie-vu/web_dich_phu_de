export function PageTitle({ title, description, action }) {
  return (
    <div className="admin-page-head">
      <div>
        <p className="admin-eyebrow">AutoSub Admin</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DailyChart({ daily }) {
  const items = Array.isArray(daily) ? daily : [];
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));

  if (items.length === 0) {
    return (
      <div className="admin-empty admin-chart-empty">
        Chưa có dữ liệu trong 7 ngày gần nhất.
      </div>
    );
  }

  return (
    <div className="admin-chart">
      {items.map((item) => {
        const count = Number(item.count) || 0;
        const height = Math.max(8, Math.round((count / max) * 100));
        return (
          <div className="admin-chart-item" key={item.date}>
            <div className="admin-chart-track">
              <span
                className="admin-chart-bar"
                style={{ height: `${height}%` }}
              />
            </div>
            <strong>{count}</strong>
            <span>{String(item.date).slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MetricCard({ label, value, detail, tone = "cyan" }) {
  return (
    <article className={`admin-kpi tone-${tone}`}>
      <span className="admin-kpi-dot" />
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
