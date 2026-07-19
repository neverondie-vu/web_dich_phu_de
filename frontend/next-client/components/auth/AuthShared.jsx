"use client";

import { useEffect, useRef } from "react";

export function GoogleIcon() {
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

export function Waveform() {
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

export function DotTag({ className = "" }) {
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

export function Testimonial({ compact = false }) {
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

export function InputIcon({ type }) {
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

export function EyeIcon({ visible }) {
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

export function ForgotCanvas() {
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
