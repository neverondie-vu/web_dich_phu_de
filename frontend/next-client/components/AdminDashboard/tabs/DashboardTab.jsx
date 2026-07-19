import Icon from "../Icon";
import { DailyChart, MetricCard, PageTitle } from "../Shared";

export default function DashboardTab({
  active,
  logs,
  onRefresh,
  stats,
  totals,
  users,
}) {
  return (
    <div className={`admin-tab ${active ? "active" : ""}`}>
      <PageTitle
        title="Tổng quan hệ thống"
        description="Theo dõi người dùng, job xử lý và cảnh báo vận hành trong một màn hình."
        action={
          <button className="admin-btn secondary" onClick={onRefresh} type="button">
            <Icon name="refresh" />
            Làm mới dữ liệu
          </button>
        }
      />

      <div className="admin-stats-grid">
        <MetricCard
          label="Người dùng"
          value={users.length}
          detail={`${totals.plusUsers} tài khoản Plus`}
        />
        <MetricCard
          label="Job đã xử lý"
          value={totals.totalJobs}
          detail={`${totals.weekJobs} job trong 7 ngày`}
          tone="green"
        />
        <MetricCard
          label="Đang chạy"
          value={totals.activeJobs}
          detail="Job trong hàng đợi xử lý"
          tone="blue"
        />
        <MetricCard
          label="Cảnh báo lỗi"
          value={totals.failedJobs}
          detail="Job cần kiểm tra lại"
          tone="red"
        />
      </div>

      <div className="admin-grid dashboard-grid">
        <section className="admin-card span-2">
          <div className="admin-card-header">
            <div>
              <h2>Lưu lượng xử lý 7 ngày</h2>
              <p>Số job video/audio được tạo theo ngày.</p>
            </div>
          </div>
          <DailyChart daily={stats.daily} />
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2>Cảnh báo hệ thống</h2>
              <p>Các job lỗi mới nhất từ backend.</p>
            </div>
          </div>
          <div className="admin-log-list compact">
            {logs.length === 0 ? (
              <div className="admin-empty">Không có lỗi mới.</div>
            ) : (
              logs.map((log, index) => (
                <article
                  className="admin-log-card danger"
                  key={`${log.time}-${index}`}
                >
                  <strong>{log.level}</strong>
                  <p>{log.message}</p>
                  <span>{log.time}</span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
