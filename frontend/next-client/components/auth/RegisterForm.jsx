"use client";

import Link from "next/link";
import {
  DotTag,
  EyeIcon,
  GoogleIcon,
  InputIcon,
  Testimonial,
  Waveform,
} from "./AuthShared";

export default function RegisterForm({
  busy,
  confirmPassword,
  email,
  message,
  onConfirmPasswordChange,
  onEmailChange,
  onGoogle,
  onPasswordChange,
  onShowPasswordToggle,
  onSubmit,
  onUsernameChange,
  password,
  showPassword,
  strength,
  strengthClass,
  success,
  username,
}) {
  return (
    <div className="classic-auth classic-register">
      <main className="page">
        <section className="left">
          <div className="card">
            {success ? (
              <div className="success-msg visible">
                <div className="check-ring">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p>Đăng ký thành công!</p>
                <span>Chào mừng bạn đến với AutoSub. Đang chuyển hướng...</span>
              </div>
            ) : (
              <>
                <span className="brand">AutoSub</span>
                <h2>Tạo tài khoản mới</h2>
                <p className="sub">Bắt đầu hành trình sáng tạo của bạn</p>

                <form onSubmit={onSubmit}>
                  <div className="field">
                    <label>Tên đăng nhập</label>
                    <div className="input-wrap">
                      <InputIcon />
                      <input value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="Nhập username..." required />
                    </div>
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <div className="input-wrap">
                      <InputIcon type="mail" />
                      <input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="email@example.com" required />
                    </div>
                  </div>
                  <div className="field">
                    <label>Mật khẩu</label>
                    <div className="input-wrap">
                      <InputIcon type="lock" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        required
                      />
                      <button className="eye-btn" type="button" onClick={onShowPasswordToggle}>
                        <EyeIcon visible={showPassword} />
                      </button>
                    </div>
                    <div className="strength-bar">
                      {[0, 1, 2, 3].map((item) => (
                        <span key={item} className={item < strength ? strengthClass : ""} />
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Xác nhận mật khẩu</label>
                    <div className="input-wrap">
                      <InputIcon type="lock" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => onConfirmPasswordChange(event.target.value)}
                        placeholder="Nhập lại mật khẩu..."
                        required
                      />
                    </div>
                  </div>
                  {message && <p className="auth-error">{message}</p>}
                  <button className="btn-register" disabled={busy}>
                    {busy ? "Đang xử lý..." : "Đăng Ký Ngay"}
                  </button>
                </form>

                <div className="or-row">
                  <hr />
                  <span>hoặc</span>
                  <hr />
                </div>
                <div className="socials">
                  <button className="soc-btn" onClick={onGoogle} disabled={busy} aria-label="Google" type="button">
                    <GoogleIcon />
                  </button>
                </div>
                <div className="footer">
                  Đã có tài khoản? <Link href="/auth/login">Đăng nhập</Link>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="right">
          <Waveform />
          <img className="boy-img" src="/assets/images/register-boy.jpg" alt="AutoSub boy" />
          <DotTag className="tag-create" />
          <Testimonial compact />
        </section>
      </main>
    </div>
  );
}
