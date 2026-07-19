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

export default function LoginForm({
  busy,
  email,
  message,
  onEmailChange,
  onGoogle,
  onPasswordChange,
  onShowPasswordToggle,
  onSubmit,
  password,
  showPassword,
}) {
  return (
    <div className="classic-auth classic-login">
      <main className="page">
        <section className="left">
          <Waveform />
          <img className="girl-img" src="/assets/images/login-girl.jpg" alt="AutoSub girl" />
          <DotTag className="tag-transcribe" />
          <Testimonial />
        </section>

        <Link href="/" className="btn-back-home">
          <span>←</span>
          <span>Quay lại</span>
        </Link>

        <section className="right">
          <div className="card">
            <span className="brand">AutoSub</span>
            <h2>Chào mừng trở lại</h2>

            <form onSubmit={onSubmit}>
              <div className="field">
                <label>Email hoặc Tên đăng nhập</label>
                <div className="input-wrap">
                  <InputIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="Nhập thông tin..."
                    required
                  />
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
                    required
                  />
                  <button className="eye-btn" type="button" onClick={onShowPasswordToggle}>
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
              {message && <p className="auth-error">{message}</p>}
              <button type="submit" className="btn-login" disabled={busy}>
                {busy ? "Đang đăng nhập..." : "Đăng Nhập"}
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
              Chưa có tài khoản? <Link href="/auth/register">Tạo tài khoản</Link>
              <Link href="/forgot-password" className="forgot">
                Quên mật khẩu?
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
