import Link from "next/link";
import Icon from "./Icon";

export function LoadingAccess({ redirecting }) {
  return (
    <main className="classic-admin admin-center">
      <section className="admin-access-card">
        <span className="admin-loader" />
        <h1>
          {redirecting
            ? "Đang chuyển đến trang đăng nhập"
            : "Đang kiểm tra quyền quản trị"}
        </h1>
        <p>
          {redirecting
            ? "Phiên quản trị đã kết thúc."
            : "Hệ thống đang xác thực phiên đăng nhập Firebase của bạn."}
        </p>
      </section>
    </main>
  );
}

export function DeniedAccess() {
  return (
    <main className="classic-admin admin-center">
      <section className="admin-access-card">
        <Icon name="security" />
        <h1>Không có quyền truy cập</h1>
        <p>
          Bạn cần đăng nhập bằng tài khoản có vai trò admin trong Firestore.
        </p>
        <Link className="admin-btn primary" href="/auth/login">
          Đăng nhập lại
        </Link>
      </section>
    </main>
  );
}
