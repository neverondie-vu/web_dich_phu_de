import ClassicInfoNav from "../../components/ClassicInfoNav";

const chips = [
  ["Phân tích ngữ cảnh", "blue"],
  ["Đồng bộ mili-giây", "cyan"],
  ["Tối ưu cho Video Ngắn", "purple"],
];

const scopeItems = [
  ["1", "Giao Diện Người Dùng (Frontend)", "Tương tác tải video & Cấu hình dịch"],
  ["2", "Lõi Nhận Diện (AI Engine)", "Mô hình nhận dạng giọng nói"],
  ["3", "Xử Lý Đa Phương Tiện (FFmpeg)", "Hardsub và Render Video"],
];

const techCards = [
  [
    "🎙️",
    "Mô Hình AI Speech-to-Text",
    "Ứng dụng mô hình mạng nơ-ron chuyên sâu (Whisper) để trích xuất văn bản từ âm thanh với khả năng lọc nhiễu, nhận dạng chính xác từng khung giờ.",
  ],
  [
    "⏱️",
    "Đồng Bộ & Xử Lý Timecode",
    "Xây dựng thuật toán ánh xạ thời gian thực, đảm bảo đoạn văn bản được hiển thị khớp với giọng nói gốc.",
  ],
  [
    "🎞️",
    "Xử Lý Video (FFmpeg)",
    "Thao tác luồng dữ liệu media, nhúng văn bản dưới dạng phụ đề trực tiếp vào file MP4 để xuất bản.",
  ],
];

const steps = [
  ["01", "Input (Đầu vào)", "Hệ thống tiếp nhận tệp Video/Audio, thiết lập thông số dịch thuật và vị trí hiển thị."],
  ["02", "AI Extract", "Tiền xử lý âm thanh, sử dụng mô hình học sâu để bóc tách thành văn bản kèm nhãn thời gian."],
  ["03", "Translation Sync", "Dịch thuật ngôn ngữ đích, đồng thời kiểm tra và khớp lại chuỗi timecode."],
  ["04", "Output (Đầu ra)", "Kết xuất thành file phụ đề SRT hoặc hard-sub trực tiếp lên video thành phẩm."],
];

export const metadata = {
  title: "Về Dự Án AutoSub",
};

export default function AboutPage() {
  return (
    <div className="classic-page classic-about-page">
      <ClassicInfoNav active="about" />

      <section className="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-tag">Báo Cáo Dự Án</div>
          <h1>
            Hệ Thống Tự Động Hóa
            <br />
            <span className="gradient-text">Phụ Đề Video</span>
          </h1>
          <p>
            Dự án phát triển phần mềm hỗ trợ tạo, dịch thuật và đồng bộ phụ đề đa
            ngôn ngữ, ứng dụng công nghệ nhận dạng giọng nói.
          </p>
          <div className="hero-actions">
            <a href="#tech" className="btn-primary">
              <span>Cấu Trúc Hệ Thống</span>
              <span>↓</span>
            </a>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="mission" id="mission">
        <div className="container">
          <div className="mission-inner">
            <div className="mission-content reveal visible">
              <span className="section-tag">📌 MỤC TIÊU ĐỀ TÀI</span>
              <h2 className="section-title">
                Giải Quyết Bài Toán
                <br />
                Đồng Bộ Ngôn Ngữ
              </h2>
              <p className="section-subtitle">
                Dự án tập trung giải quyết khó khăn trong việc thiết lập và căn chỉnh
                thời gian thủ công khi làm phụ đề cho video ngắn.
              </p>
              <p className="section-subtitle">
                Hệ thống AutoSub cung cấp workflow tự động hóa: bóc băng âm thanh,
                dịch thuật ngữ nghĩa, xuất file SRT hoặc video hoàn chỉnh có phụ đề.
              </p>
              <div className="classic-chip-row">
                {chips.map(([label, tone]) => (
                  <span className={`classic-chip ${tone}`} key={label}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mission-visual reveal visible">
              <div className="mission-card">
                <div className="mission-card-icon">🎯</div>
                <h3>Phạm Vi Dự Án</h3>
                <p>
                  Tập trung tối ưu hóa cho các định dạng video ngắn trên các nền tảng
                  mạng xã hội.
                </p>
                <div className="scope-list">
                  {scopeItems.map(([num, title, text]) => (
                    <div className="scope-row" key={num}>
                      <span>{num}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="tech" id="tech">
        <div className="container">
          <div className="tech-header">
            <div className="reveal visible">
              <span className="section-tag">⚙️ LÝ THUYẾT & CÔNG NGHỆ LÕI</span>
              <h2 className="section-title">
                Kiến Trúc &
                <br />
                Nền Tảng Hệ Thống
              </h2>
            </div>
            <p className="section-subtitle reveal visible">
              Dự án sử dụng kiến trúc phần mềm tích hợp AI, tối ưu hóa quá trình xử lý
              đa phương tiện thông qua các luồng xử lý đồng thời.
            </p>
          </div>

          <div className="tech-grid">
            {techCards.map(([icon, title, text]) => (
              <article className="tech-card reveal visible" key={title}>
                <span className="tech-icon">{icon}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="workflow" id="workflow">
        <div className="container">
          <div className="workflow-header reveal visible">
            <span className="section-tag">🔄 KIẾN TRÚC LUỒNG HOẠT ĐỘNG</span>
            <h2 className="section-title">Quy Trình Xử Lý Hệ Thống</h2>
            <p className="section-subtitle">
              Mô tả 4 bước thực thi chính của phần mềm từ lúc tiếp nhận đầu vào đến
              khi trả kết quả.
            </p>
          </div>

          <div className="steps">
            {steps.map(([num, title, text]) => (
              <div className="step reveal visible" key={num}>
                <div className="step-num">{num}</div>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
