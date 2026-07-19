import Icon from "../Icon";
import { PageTitle } from "../Shared";

export default function SecurityTab({
  active,
  auditLogs,
  blacklist,
  maintenance,
  onAddIp,
  onRefresh,
  onRemoveIp,
  onToggleMaintenance,
}) {
  return (
    <div className={`admin-tab ${active ? "active" : ""}`}>
      <PageTitle
        title="Bảo mật & nhật ký"
        description="Kiểm soát chế độ bảo trì, IP bị chặn và nhật ký xử lý từ backend."
        action={
          <button className="admin-btn secondary" onClick={onRefresh} type="button">
            <Icon name="refresh" />
            Làm mới
          </button>
        }
      />

      <div className="admin-security-grid">
        <div className="admin-stack">
          <section className="admin-card">
            <div className="admin-card-header admin-security-heading system">
              <div>
                <h2>Trạng thái hệ thống</h2>
                <p>Bật/tắt bảo trì trên toàn backend.</p>
              </div>
            </div>
            <div className="admin-maintenance-row">
              <div>
                <strong>
                  {maintenance ? "Đang bảo trì" : "Đang hoạt động"}
                </strong>
                <span>
                  {maintenance
                    ? "Người dùng tạm thời bị chặn thao tác."
                    : "API đang phục vụ bình thường."}
                </span>
              </div>
              <label className="admin-switch">
                <input
                  checked={maintenance}
                  onChange={(event) => onToggleMaintenance(event.target.checked)}
                  type="checkbox"
                />
                <span />
              </label>
            </div>
          </section>

          <form className="admin-card" onSubmit={onAddIp}>
            <div className="admin-card-header admin-security-heading blocklist">
              <div>
                <h2>Danh sách chặn IP</h2>
                <p>Chặn các địa chỉ truy cập bất thường.</p>
              </div>
            </div>
            <div className="admin-form-stack">
              <label className="admin-field">
                <span>Địa chỉ IP</span>
                <input name="ip" placeholder="Ví dụ: 192.168.1.10" />
              </label>
              <button className="admin-btn danger" type="submit">
                Thêm vào danh sách chặn
              </button>
            </div>
            <div className="admin-ip-list">
              {blacklist.length === 0 ? (
                <div className="admin-empty compact">Chưa có IP bị chặn.</div>
              ) : (
                blacklist.map((ip) => (
                  <div className="admin-ip-row" key={ip}>
                    <span>{ip}</span>
                    <button onClick={() => onRemoveIp(ip)} type="button">
                      Gỡ
                    </button>
                  </div>
                ))
              )}
            </div>
          </form>
        </div>

        <section className="admin-card admin-audit-card">
          <div className="admin-card-header admin-security-heading audit">
            <div>
              <h2>Nhật ký xử lý</h2>
              <p>50 sự kiện gần nhất từ backend.</p>
            </div>
          </div>
          <div className="admin-log-list">
            {auditLogs.length === 0 ? (
              <div className="admin-empty">Chưa có nhật ký từ server.</div>
            ) : (
              auditLogs.map((log, index) => (
                <article className="admin-log-card" key={`${log.time}-${index}`}>
                  <div>
                    <strong>{log.action}</strong>
                    <span>{log.time}</span>
                  </div>
                  <p>{log.description}</p>
                  <small>{log.user_agent}</small>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
