import ClassicInfoNav from "../../components/ClassicInfoNav";

const featureRows = [
  {
    title: (
      <>
        Giao Diện Trực Quan,
        <br />
        Thao Tác Một Chạm
      </>
    ),
    text: "Bảng điều khiển được thiết kế tối giản, tập trung vào hiệu suất. Bạn chỉ cần chọn video MP4 và hệ thống tự động lo phần còn lại.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    alt: "Giao diện Dashboard",
    items: [
      "Hỗ trợ tải lên định dạng Video phổ biến (MP4).",
      "Quản lý tiến trình xử lý minh bạch.",
      "Nhận trả file trực tiếp qua nút Download an toàn.",
    ],
  },
  {
    reverse: true,
    title: (
      <>
        Nhận Diện Ngữ Nghĩa &
        <br />
        Dịch Thuật Đa Ngôn Ngữ
      </>
    ),
    text: "Engine học sâu tự động nhận diện và dịch thuật giọng nói sang các ngôn ngữ phổ biến, đáp ứng nhu cầu nội dung xuyên biên giới.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800",
    alt: "AI Language Engine",
    items: [
      "Dịch sang Tiếng Anh chuẩn bản địa.",
      "Hỗ trợ thị trường Châu Á: Trung, Nhật, Hàn.",
      "Tách câu tự động theo ngữ điệu và hơi thở.",
    ],
  },
  {
    title: (
      <>
        Tùy Biến Style &
        <br />
        Hardsub Siêu Tốc
      </>
    ),
    text: "Bạn kiểm soát vị trí và độ hiển thị của phụ đề. Hệ thống gắn cứng phụ đề trực tiếp lên từng khung hình video.",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
    alt: "Video Rendering FFmpeg",
    items: [
      "Tọa độ Y giúp tránh UI TikTok/Reels.",
      "Độ mờ nền chữ linh hoạt theo nền sáng/tối.",
      "Render video hoàn chỉnh sẵn sàng đăng tải.",
    ],
  },
];

export const metadata = {
  title: "Tính Năng - AutoSub",
};

export default function FeaturesPage() {
  return (
    <div className="classic-page classic-features-page">
      <ClassicInfoNav active="features" />

      <section className="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-tag">Tính Năng Cốt Lõi</div>
          <h1>
            Sức Mạnh Của <span className="gradient-text">AutoSub</span>
          </h1>
          <p>
            Khám phá bộ công cụ mạnh mẽ được tích hợp bên trong bảng điều khiển,
            giúp bạn kiểm soát hoàn toàn quy trình xử lý và thiết kế phụ đề đa ngôn ngữ.
          </p>
        </div>
      </section>

      <section className="features-wrapper container">
        {featureRows.map((row, index) => (
          <article className={`feature-row reveal visible ${row.reverse ? "reverse" : ""}`} key={index}>
            <div className="text-col">
              <h2>{row.title}</h2>
              <p>{row.text}</p>
              <div className="feature-list">
                {row.items.map((item) => (
                  <div className="feature-item" key={item}>
                    <div className="feature-item-icon">✓</div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="img-col">
              <div className="img-glow" />
              <div className="img-wrapper">
                <img src={row.image} alt={row.alt} />
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="divider" />
      <footer className="classic-footer">
        <div>
          <div className="logo">AutoSub</div>
          <p>Báo cáo đồ án: Hệ thống phụ đề AI.</p>
        </div>
      </footer>
    </div>
  );
}
