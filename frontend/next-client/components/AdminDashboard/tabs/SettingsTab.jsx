import { PageTitle } from "../Shared";

export default function SettingsTab({
  active,
  maxStorageGb,
  onMaxStorageChange,
  onRetentionDaysChange,
  onSaveConfig,
  onTranslationProviderChange,
  onWhisperModelChange,
  retentionDays,
  translationProvider,
  whisperModel,
}) {
  return (
    <div className={`admin-tab ${active ? "active" : ""}`}>
      <PageTitle
        title="Cấu hình AI"
        description="Thiết lập model xử lý giọng nói và các giới hạn vận hành của máy chủ."
      />

      <form onSubmit={onSaveConfig}>
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>AI Engine</h2>
                <p>Chọn model Whisper phù hợp hiệu năng máy.</p>
              </div>
            </div>
            <div className="admin-form-stack">
              <label className="admin-field">
                <span>Whisper model</span>
                <select
                  onChange={(event) => onWhisperModelChange(event.target.value)}
                  value={whisperModel}
                >
                  <option value="base">Whisper Base - nhanh, chính xác vừa</option>
                  <option value="small">Whisper Small - cân bằng</option>
                  <option value="medium">Whisper Medium - chính xác cao</option>
                  <option value="large-v3">
                    Whisper Large v3 - tốt nhất, tốn tài nguyên
                  </option>
                </select>
              </label>
              <label className="admin-field">
                <span>Dịch phụ đề</span>
                <select
                  onChange={(event) =>
                    onTranslationProviderChange(event.target.value)
                  }
                  value={translationProvider}
                >
                  <option value="nllb">Meta NLLB-200</option>
                  <option value="google">Google Translate API</option>
                  <option value="gpt">OpenAI GPT</option>
                </select>
              </label>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Máy chủ & lưu trữ</h2>
                <p>
                  Các thông số vận hành dùng cho báo cáo và cấu hình nội
                  bộ.
                </p>
              </div>
            </div>
            <div className="admin-form-stack">
              <label className="admin-field">
                <span>Dung lượng lưu trữ tối đa (GB)</span>
                <input
                  min="1"
                  onChange={(event) => onMaxStorageChange(event.target.value)}
                  type="number"
                  value={maxStorageGb || ""}
                />
              </label>
              <label className="admin-field">
                <span>Tự động xóa file cũ sau (ngày)</span>
                <input
                  min="1"
                  onChange={(event) => onRetentionDaysChange(event.target.value)}
                  type="number"
                  value={retentionDays || ""}
                />
              </label>
            </div>
          </section>
        </div>
        <div className="admin-form-actions">
          <button className="admin-btn primary" type="submit">
            Lưu cấu hình
          </button>
        </div>
      </form>
    </div>
  );
}
