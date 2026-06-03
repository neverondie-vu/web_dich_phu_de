"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { auth, db } from "../lib/firebase";

function VideoIcon({ className = "w-6 h-6 text-white" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function HomeAuthGroup() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        setIsPlus(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        const data = snapshot.exists() ? snapshot.data() : {};
        setIsAdmin(data.role === "admin");
        setIsPlus(Boolean(data.is_plus));
      } catch {
        setIsAdmin(false);
        setIsPlus(false);
      }
    });
  }, []);

  useEffect(() => {
    function closeMenu(event) {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.type === "mousedown" && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await signOut(auth);
  }

  if (!user) {
    return (
      <div className="auth-z-frame flex w-48 flex-col gap-1.5 py-1">
        <svg className="auth-z-stroke" aria-hidden="true" fill="none" viewBox="0 0 208 48">
          <path className="auth-z-line" d="M5 7H97C104 7 108 11 108 18V24C108 31 113 35 121 35H203" />
          <path className="auth-z-light" d="M5 7H97C104 7 108 11 108 18V24C108 31 113 35 121 35H203" />
        </svg>
        <Link
          href="/auth/login"
          className="self-start rounded-lg px-3 py-1.5 text-sm font-extrabold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:bg-white/8 hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,0.16)] focus:-translate-y-0.5 focus:bg-white/8 focus:text-white focus:outline-none focus:shadow-[0_0_16px_rgba(255,255,255,0.16)]"
        >
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className="self-end rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3.5 py-1.5 text-sm font-extrabold text-cyan-100 transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-cyan-200/60 hover:bg-cyan-300/18 hover:text-white hover:shadow-[0_0_18px_rgba(34,211,238,0.3)] focus:-translate-y-0.5 focus:scale-105 focus:border-cyan-200/60 focus:bg-cyan-300/18 focus:text-white focus:outline-none focus:shadow-[0_0_18px_rgba(34,211,238,0.3)]"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const userStatus = isPlus ? "Plus" : "Free";
  const avatar = user.photoURL ? (
    <img src={user.photoURL} alt={displayName} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span>{initial}</span>
  );

  return (
    <div ref={menuRef} className="relative flex h-full w-full items-center justify-center">
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex max-w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition duration-200 hover:bg-white/7 focus:bg-white/7 focus:outline-none"
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 rounded-full bg-linear-to-br from-cyan-200 via-blue-400 to-violet-400 p-px shadow-md shadow-cyan-950/50">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#081225] text-xs font-black text-cyan-100">
            {avatar}
          </span>
        </span>
        <span className="max-w-23 truncate text-xs font-bold text-cyan-200">Hi, {displayName}</span>
        <svg className={`h-2.5 w-2.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`absolute left-1/2 top-full z-50 mt-2.5 w-68 -translate-x-1/2 origin-top overflow-hidden rounded-lg border border-cyan-300/15 bg-[#07111f]/96 shadow-[0_18px_48px_rgba(0,0,0,0.52)] backdrop-blur-2xl transition duration-200 ${menuOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0"}`}
        role="menu"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(34,211,238,0.11),transparent_42%,rgba(59,130,246,0.06))]" />
        <div className="relative flex items-start gap-2.5 border-b border-white/10 p-3">
          <span className="flex h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-cyan-200 via-blue-400 to-violet-400 p-px shadow-lg shadow-cyan-950/60">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#081225] text-sm font-black text-cyan-100">
              {avatar}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{displayName}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{user.email}</p>
            <div className="mt-1.5 flex gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${isPlus ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"}`}>{userStatus}</span>
              {isAdmin && <span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-rose-200">Admin</span>}
            </div>
          </div>
        </div>

        <div className="relative p-1.5">
          <p className="px-2 pb-1 pt-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Truy cập nhanh</p>
          <Link href="/app" className="group/item flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 transition hover:border-cyan-300/15 hover:bg-cyan-300/8" onClick={() => setMenuOpen(false)} role="menuitem">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">Công cụ AutoSub</span><span className="mt-0.5 block text-[10px] text-slate-500">Tạo và biên tập phụ đề AI</span></span>
            <span className="text-sm text-slate-600 transition group-hover/item:text-cyan-200">›</span>
          </Link>
          {isAdmin && (
            <Link href="/admin" className="group/item mt-0.5 flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 transition hover:border-rose-300/15 hover:bg-rose-300/8" onClick={() => setMenuOpen(false)} role="menuitem">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rose-300/15 bg-rose-300/10 text-rose-200">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white">Trang quản trị</span><span className="mt-0.5 block text-[10px] text-slate-500">Quản lý hệ thống AutoSub</span></span>
              <span className="text-sm text-slate-600 transition group-hover/item:text-rose-200">›</span>
            </Link>
          )}
        </div>

        <div className="relative border-t border-white/10 p-1.5">
          <button className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-2 text-left transition hover:border-rose-300/15 hover:bg-rose-300/8" onClick={handleLogout} role="menuitem" type="button">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rose-300/15 bg-rose-300/10 text-rose-200">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </span>
            <span className="text-xs font-bold text-rose-200">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="text-white min-h-screen overflow-clip relative selection:bg-blue-500/30">
      <div className="crescent-moon" />
      <div className="meteor-shower">
        <div className="meteor" />
        <div className="meteor" />
        <div className="meteor" />
      </div>

      <header className="relative z-9999 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center overflow-visible px-8 py-6">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            <VideoIcon />
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-montserrat">
            Auto<span className="sparkle-ai">Sub</span>
          </span>
        </Link>

        <nav className="nav-links relative hidden items-center gap-12 overflow-hidden rounded-full border border-cyan-300/25 bg-white/[0.035] px-7 py-1 shadow-[0_0_18px_rgba(34,211,238,0.08)] md:flex">
          <span className="nav-orbit-light" aria-hidden="true" />
          <Link
            href="/"
            className="border-b border-transparent px-1 py-2 text-base font-medium text-gray-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="border-b border-transparent px-1 py-2 text-base font-medium text-gray-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            About
          </Link>
          <Link
            href="/features"
            className="border-b border-transparent px-1 py-2 text-base font-medium text-gray-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="border-b border-transparent px-1 py-2 text-base font-medium text-gray-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            Pricing
          </Link>
        </nav>

        <div className="relative z-9999 flex items-center justify-self-end overflow-visible">
          <div
            id="auth-group"
            className="relative isolate flex h-full w-full flex-col items-center justify-center"
          >
            <HomeAuthGroup />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center mt-32 px-4 text-center">
        <div
          id="hero-section"
          className="flex flex-col items-center w-full fade-in pb-20"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mb-6 relative z-10">
            <span className="sparkle-ai">AI</span> Subtitle Translation
            <br />
            For Global <span className="sparkle-text">Video Content</span>
          </h1>

          <Link
            href="/app"
            className="get-started-btn btn-hightech relative z-20 mb-10 rounded-full px-12 py-5 text-base font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              GET STARTED
            </span>
          </Link>

          <p className="text-gray-400 max-w-2xl text-lg mb-10 relative z-10">
            Tự động tạo và dịch phụ đề video bằng công nghệ AI tiên tiến nhất,
            tốc độ xử lí nhanh chóng, hỗ trợ nhiều ngôn ngữ với timecode đồng bộ
            chính xác.
          </p>

          <div className="spacecraft-container">
            <div className="spacecraft large-ship-left">
              <div className="module main-hull" />
              <div className="module habitat-section" />
              <div className="module engine-pod engine-pod-left thruster-glow" />
              <div className="module engine-pod engine-pod-right thruster-glow" />
              <div className="panel plating plating-1" />
              <div className="panel plating plating-2" />
              <div className="panel window window-1" />
              <div className="panel window window-2" />
              <div className="panel grid-mesh grid-left" />
              <div className="panel grid-mesh grid-right" />
            </div>
            <div className="spacecraft small-ship-right">
              <div className="hull main-body" />
              <div className="wing wing-top" />
              <div className="wing wing-bottom" />
              <div className="wing tail-fin" />
              <div className="wing wing-detail-top" />
              <div className="wing wing-detail-bottom" />
              <div className="cockpit glass" />
              <div className="engine-port thruster-glow-blue" />
              <div className="wing detail plating-1" />
              <div className="wing detail plating-2" />
            </div>
          </div>

          <div className="solar-system pointer-events-none z-0">
            <div className="sun" />
            <div className="orbit orbit-mercury">
              <div className="planet-wrap">
                <div className="planet mercury" />
              </div>
            </div>
            <div className="orbit orbit-mars">
              <div className="planet-wrap">
                <div className="planet mars" />
              </div>
            </div>
            <div className="orbit orbit-jupiter">
              <div className="planet-wrap">
                <div className="planet jupiter" />
              </div>
            </div>
            <div className="orbit orbit-saturn">
              <div className="planet-wrap saturn-wrap">
                <div className="planet saturn" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
