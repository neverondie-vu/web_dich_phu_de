"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Waveform() {
  return (
    <svg className="waveform" viewBox="0 0 900 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <g stroke="#1e88e5" strokeWidth="1.5" fill="none" opacity=".7">
        <polyline points="0,60 30,45 45,75 60,30 75,80 90,50 105,65 120,40 140,70 160,55 180,35 200,68 220,50 240,72 260,42 280,60 300,38 320,65 340,45 360,72 380,55 400,35 420,60 440,50 460,30 480,68 500,45 520,70 540,40 560,60 580,48 600,72 620,52 640,38 660,65 680,50 700,30 720,68 740,52 760,72 780,42 800,60 820,38 840,65 860,48 880,60 900,55" />
      </g>
      <g stroke="#00cfff" strokeWidth="1" fill="none" opacity=".4">
        <polyline points="0,65 20,50 40,78 60,40 80,70 100,55 120,68 140,42 170,72 200,50 230,38 260,65 290,52 320,70 350,45 380,65 410,55 440,30 470,65 500,48 530,68 560,42 590,60 620,50 650,72 680,40 710,60 740,48 770,72 800,45 830,60 860,50 890,65 900,55" />
      </g>
    </svg>
  );
}

function DotTag({ className = "" }) {
  return (
    <div className={`tag ${className}`}>
      <div className="tag-icon teal">
        <div className="dot-bar">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      AI Transcribe
    </div>
  );
}

function Testimonial({ compact = false }) {
  return (
    <div className="testimonial">
      <span className="quote-mark">"</span>
      <p>
        {compact
          ? "AutoSub giúp tôi tạo phụ đề chuyên nghiệp chỉ trong vài phút!"
          : "AutoSub giúp tôi tiết kiệm 90% thời gian làm phụ đề và tập trung vào sáng tạo nội dung!"}
      </p>
      <div className="trust-row">
        <div className="avatars">
          <img src="https://i.pravatar.cc/40?u=a1" alt="" />
          <img src="https://i.pravatar.cc/40?u=a2" alt="" />
          <img src="https://i.pravatar.cc/40?u=a3" alt="" />
          <img src="https://i.pravatar.cc/40?u=a4" alt="" />
        </div>
        <span className="trust-text">10.000+ người dùng tin tưởng</span>
      </div>
    </div>
  );
}

function InputIcon({ type }) {
  if (type === "mail") {
    return (
      <svg className="left-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 7 10-7" />
      </svg>
    );
  }

  if (type === "lock") {
    return (
      <svg className="left-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  return (
    <svg className="left-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ForgotCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    let animationId = 0;
    const particles = [];
    const stars = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function makeParticle(full) {
      return {
        x: Math.random() * width,
        y: full ? Math.random() * height : height + 6,
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.45 + 0.1),
        alpha: Math.random() * 0.5 + 0.1,
        hue: Math.random() < 0.7 ? 190 : 220,
      };
    }

    function makeStar() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
        base: Math.random() * 0.3 + 0.05,
        hue: Math.random() < 0.6 ? 190 : 220,
      };
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      frame += 0.016;
      const grid = 64;

      for (let x = 0; x < width; x += grid) {
        ctx.strokeStyle = `rgba(6,182,212,${0.025 + 0.01 * Math.sin(frame * 0.3 + x * 0.01)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += grid) {
        ctx.strokeStyle = `rgba(6,182,212,${0.025 + 0.01 * Math.sin(frame * 0.3 + y * 0.01)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      stars.forEach((star) => {
        star.phase += star.speed;
        const alpha = star.base + star.base * Math.sin(star.phase);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${star.hue},80%,75%,${alpha})`;
        ctx.fill();
      });

      particles.forEach((particle, index) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue},85%,70%,${particle.alpha})`;
        ctx.fill();
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.y < -6 || particle.x < -6 || particle.x > width + 6) {
          particles[index] = makeParticle(false);
        }
      });

      animationId = window.requestAnimationFrame(draw);
    }

    resize();
    for (let i = 0; i < 90; i += 1) particles.push(makeParticle(true));
    for (let i = 0; i < 55; i += 1) stars.push(makeStar());
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="forgot-bg-canvas" />;
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  async function redirectAfterLogin(user) {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (snapshot.exists() && snapshot.data().role === "admin") {
      router.push("/admin");
      return;
    }
    router.push("/");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", credential.user.uid), {
          username,
          email,
          role: "user",
          is_plus: false,
          createdAt: serverTimestamp(),
        });
        setSuccess(true);
        window.setTimeout(() => router.push("/"), 1800);
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await redirectAfterLogin(credential.user);
      }
    } catch (error) {
      setMessage(error.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const snapshot = await getDoc(userRef);
      await setDoc(
        userRef,
        {
          username: result.user.displayName || "",
          email: result.user.email || "",
          photoURL: result.user.photoURL || "",
          lastLogin: serverTimestamp(),
          ...(snapshot.exists()
            ? {}
            : {
                role: "user",
                is_plus: false,
                createdAt: serverTimestamp(),
              }),
        },
        { merge: true },
      );
      await redirectAfterLogin(result.user);
    } catch (error) {
      setMessage(error.message || "Đăng nhập Google thất bại.");
    } finally {
      setBusy(false);
    }
  }

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const strengthClass = strength <= 1 ? "weak" : strength <= 2 ? "medium" : "strong";

  if (mode === "forgot") {
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
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Email tài khoản</label>
                  <div className="input-wrap">
                    <InputIcon type="mail" />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
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

  if (mode === "register") {
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

                  <form onSubmit={handleSubmit}>
                    <div className="field">
                      <label>Tên đăng nhập</label>
                      <div className="input-wrap">
                        <InputIcon />
                        <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập username..." required />
                      </div>
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <div className="input-wrap">
                        <InputIcon type="mail" />
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" required />
                      </div>
                    </div>
                    <div className="field">
                      <label>Mật khẩu</label>
                      <div className="input-wrap">
                        <InputIcon type="lock" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          required
                        />
                        <button className="eye-btn" type="button" onClick={() => setShowPassword((value) => !value)}>
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
                          onChange={(event) => setConfirmPassword(event.target.value)}
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
                    <button className="soc-btn" onClick={handleGoogle} disabled={busy} aria-label="Google">
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

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email hoặc Tên đăng nhập</label>
                <div className="input-wrap">
                  <InputIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button className="eye-btn" type="button" onClick={() => setShowPassword((value) => !value)}>
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
              <button className="soc-btn" onClick={handleGoogle} disabled={busy} aria-label="Google">
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
