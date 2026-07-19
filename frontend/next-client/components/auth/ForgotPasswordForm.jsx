"use client";

import Link from "next/link";
import { ForgotCanvas, InputIcon } from "./AuthShared";

export default function ForgotPasswordForm({
  busy,
  email,
  message,
  onEmailChange,
  onSubmit,
  success,
}) {
  return (
    <div className="classic-forgot">
      <ForgotCanvas />
      <main className="page">
        <section className="card">
          <div className="brand-row">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="brand-name">AutoSub</span>
          </div>
          <div className="heading-block">
            <h2>Quên mật khẩu?</h2>
            <p>Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại ngay cho bạn.</p>
          </div>
          {success ? (
            <div className="success-msg visible">
              <div className="check-ring">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p>Liên kết đã được gửi!</p>
              <span>Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn.</span>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="field">
                <label>Email tài khoản</label>
                <div className="input-wrap">
                  <InputIcon type="mail" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    required
                  />
                </div>
                {message && <div className="err-hint visible">{message}</div>}
              </div>
              <button className="btn-reset" disabled={busy}>
                <span className="btn-inner">
                  {busy && <span className="spinner visible" />}
                  <span>{busy ? "Đang gửi..." : "Gửi yêu cầu khôi phục"}</span>
                </span>
              </button>
            </form>
          )}
          <div className="divider" />
          <div className="footer">
            <Link href="/auth/login">← Quay lại đăng nhập</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
