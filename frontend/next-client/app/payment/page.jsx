import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "Thanh toán | AutoSub",
};

export default function PaymentPage() {
  return (
    <>
      <SiteHeader />
      <main className="payment-shell site-shell">
        <section className="card payment-panel">
          <p className="eyebrow">Thanh toán demo</p>
          <h1>Plus Pro</h1>
          <p className="lead">
            Đây là trang mô phỏng thanh toán để hoàn thiện luồng SaaS trong đồ án.
            Khi triển khai thật có thể nối cổng thanh toán hoặc cập nhật quyền Plus từ admin.
          </p>
          <div className="payment-summary">
            <span>Gói dịch vụ</span>
            <strong>Plus Pro</strong>
            <span>Chi phí</span>
            <strong>$15 / tháng</strong>
          </div>
          <div className="hero-actions">
            <Link className="btn" href="/app">
              Tiếp tục dùng hệ thống
            </Link>
            <Link className="btn-secondary" href="/pricing">
              Quay lại bảng giá
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
