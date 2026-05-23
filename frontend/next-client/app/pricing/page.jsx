import Link from "next/link";
import ClassicInfoNav from "../../components/ClassicInfoNav";

const plans = [
  {
    name: "Basic",
    desc: "Hoàn hảo để làm quen và trải nghiệm công nghệ cốt lõi của AutoSub.",
    price: "0đ",
    suffix: "/ vĩnh viễn",
    button: (
      <Link href="/app" className="btn-plan btn-basic">
        Bắt Đầu Miễn Phí
      </Link>
    ),
    features: [
      ["✓", "Xử lý tối đa 10 phút video / ngày"],
      ["✓", "Dịch thuật 5 ngôn ngữ phổ biến"],
      ["✓", "Tùy chỉnh MarginV cơ bản"],
      ["✓", "Tải file phụ đề (.SRT)"],
      ["✗", "Render Video Full HD / 4K", true],
      ["✗", "Xóa Watermark (Logo nền)", true],
    ],
  },
  {
    premium: true,
    name: "Plus Pro",
    desc: "Giải pháp chuyên nghiệp dành cho MMO, Creators và hệ thống Reup số lượng lớn.",
    price: "$15",
    suffix: "/ tháng",
    button: (
      <button className="btn-plan btn-premium disabled-plan" disabled>
        Đang phát triển
      </button>
    ),
    features: [
      ["✓", "Không giới hạn thời lượng xử lý"],
      ["✓", "Mở khóa toàn bộ 100+ ngôn ngữ"],
      ["✓", "Render Video trực tiếp lên tới 4K"],
      ["✓", "Tắt hoàn toàn Logo (Watermark)"],
      ["✓", "Chỉnh sửa độ mờ nền chữ linh hoạt"],
      ["✓", "Ưu tiên hàng đợi máy chủ (Speed x3)"],
    ],
  },
];

export const metadata = {
  title: "Bảng Giá - AutoSub",
};

export default function PricingPage() {
  return (
    <div className="classic-page classic-pricing-page">
      <ClassicInfoNav active="pricing" />

      <section className="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-tag">Đầu Tư Thông Minh</div>
          <h1>
            Bảng Giá <span className="gradient-text">Dịch Vụ</span>
          </h1>
          <p>
            Lựa chọn gói giải pháp tối ưu cho nhu cầu phát triển kênh nội dung và
            tự động hóa hệ thống video của bạn.
          </p>
        </div>
      </section>

      <section className="pricing-section">
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article className={`pricing-card reveal visible ${plan.premium ? "premium" : ""}`} key={plan.name}>
                {plan.premium && <div className="badge-popular">Khuyên Dùng</div>}
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-desc">{plan.desc}</p>
                <div className="plan-price">
                  {plan.price} <span className="price-suffix">{plan.suffix}</span>
                </div>
                <ul className="feature-list">
                  {plan.features.map(([icon, text, disabled]) => (
                    <li className={disabled ? "disabled" : ""} key={text}>
                      <span className={icon === "✓" ? "icon-check" : "icon-x"}>{icon}</span>
                      <span>{disabled ? <span className="line-through">{text}</span> : text}</span>
                    </li>
                  ))}
                </ul>
                {plan.button}
              </article>
            ))}
          </div>
        </div>
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
