import { makeBackendUrl } from "../../../lib/api";
import Icon from "../Icon";
import { PageTitle } from "../Shared";
import { formatDate, statusClass, statusLabel } from "../utils";

export default function ContentTab({ active, jobs, onRefresh }) {
  return (
    <div className={`admin-tab ${active ? "active" : ""}`}>
      <PageTitle
        title="Tiến trình & phụ đề"
        description="Theo dõi toàn bộ job xử lý video/audio, trạng thái và tệp đầu ra."
        action={
          <button className="admin-btn secondary" onClick={onRefresh} type="button">
            <Icon name="refresh" />
            Tải lại
          </button>
        }
      />

      <section className="admin-card no-padding">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tệp xử lý</th>
                <th>Người dùng</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Đầu ra</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="admin-empty">Chưa có job xử lý.</div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const canDownloadSrt =
                    Boolean(job.has_srt) ||
                    ["completed", "transcribed"].includes(job.status);
                  const canDownloadVideo =
                    job.has_hardsub && job.media_type !== "audio";
                  return (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.filename}</strong>
                        <span>{job.file_type || job.media_type || "Tệp"}</span>
                      </td>
                      <td>{job.user_email}</td>
                      <td>
                        <span className={`admin-status ${statusClass(job.status)}`}>
                          {statusLabel(job.status)}
                        </span>
                      </td>
                      <td>{formatDate(job.created_at)}</td>
                      <td>
                        <div className="admin-output-actions">
                          {canDownloadSrt ? (
                            <a
                              className="admin-btn tiny secondary"
                              href={makeBackendUrl(`/api/download_srt/${job.id}`)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              SRT
                            </a>
                          ) : null}
                          {canDownloadVideo ? (
                            <a
                              className="admin-btn tiny primary"
                              href={makeBackendUrl(`/api/download/${job.id}`)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              MP4
                            </a>
                          ) : null}
                          {!canDownloadSrt && !canDownloadVideo ? (
                            <span className="admin-muted">Đang xử lý</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
