"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

function VideoIcon({ className = "w-6 h-6 text-white" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  async function handleLogout() {
    await signOut(auth);
  }

  if (!user) {
    return (
      <>
        <Link
          href="/auth/login"
          className="relative flex h-9 w-[104px] -translate-x-5 items-center justify-center self-start whitespace-nowrap rounded-md text-sm font-black text-slate-200 transition duration-200 hover:scale-105 hover:text-white focus:scale-105 focus:text-white"
        >
          Sign in
        </Link>
        <div className="relative h-3 w-full" aria-hidden="true">
          <span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-cyan-300/10 via-cyan-300/55 to-blue-400/10" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#081225] px-2 text-[11px] font-black leading-none text-cyan-200">
            Z
          </span>
        </div>
        <Link
          href="/auth/register"
          className="relative flex h-9 w-[128px] translate-x-5 items-center justify-center self-end whitespace-nowrap rounded-md text-sm font-black text-cyan-200 transition duration-200 hover:scale-105 hover:text-white focus:scale-105 focus:text-white"
        >
          Get Started
        </Link>
      </>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const userStatus = isPlus ? "Plus ✨" : "Free";

  return (
    <div className="group relative flex h-full w-full cursor-pointer items-center justify-center">
      <div className="flex max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 transition hover:bg-white/5">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="h-7 w-7 rounded-full border border-cyan-400/30 object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/20 text-[10px] font-bold text-cyan-300">
            {initial}
          </div>
        )}
        <span className="max-w-[92px] truncate text-xs font-semibold text-cyan-300">
          Hi, {displayName}
        </span>
        <svg
          className="w-3 h-3 text-gray-400 group-hover:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div className="invisible absolute right-0 top-full z-50 mt-2 w-60 translate-y-2 scale-95 overflow-hidden rounded-lg border border-cyan-400/12 bg-[#0b1220]/96 p-2 opacity-0 shadow-[0_16px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),transparent_45%)]" />
        <div className="relative mb-2 rounded-md border border-white/8 bg-white/[0.035] px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/75">
            Tài khoản
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white">{displayName}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{user.email}</p>
        </div>
        <div className="relative mb-2 flex items-center justify-between rounded-md border border-white/8 bg-white/[0.035] px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-400">Gói hiện tại</span>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black ${
              isPlus
                ? "bg-yellow-500/10 text-yellow-300 border border-yellow-400/20"
                : "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"
            }`}
          >
            {userStatus}
          </span>
        </div>
        <Link
          href="/app"
          className="group/item relative mb-1 flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left text-xs text-slate-300 transition-all duration-200 hover:border-cyan-400/10 hover:bg-cyan-500/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 transition group-hover/item:scale-105">
            <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block truncate font-bold text-white">Công cụ AutoSub</span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">Subtitle workspace</span>
          </div>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="group/item relative mb-1 flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left text-xs text-red-300 transition-all duration-200 hover:border-red-400/10 hover:bg-red-500/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/10 transition group-hover/item:scale-105">
              <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block truncate font-bold text-white">Trang quản trị</span>
              <span className="mt-0.5 block truncate text-[10px] text-red-400">Admin panel</span>
            </div>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="relative mt-1 flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-xs text-red-300 transition-all duration-200 hover:border-red-400/10 hover:bg-red-500/10"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/10">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="font-bold">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="text-white min-h-screen overflow-x-hidden relative selection:bg-blue-500/30">
      <div className="crescent-moon" />
      <div className="meteor-shower">
        <div className="meteor" />
        <div className="meteor" />
        <div className="meteor" />
      </div>

      <header className="relative z-[9999] flex items-center justify-between px-8 py-6 max-w-7xl mx-auto overflow-visible">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)]">
            <VideoIcon />
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-montserrat">
            Auto<span className="sparkle-ai">Sub</span>
          </span>
        </Link>

        <nav className="nav-links hidden md:flex items-center gap-8 bg-white/5 border border-white/10 px-8 py-3 rounded-full backdrop-blur-md">
          <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium text-gray-300 hover:text-white transition">
            About
          </Link>
          <Link href="/features" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Features
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition">
            Pricing
          </Link>
        </nav>

        <div className="relative z-[9999] flex h-[92px] w-[190px] translate-y-2 items-center overflow-visible rounded-lg border border-cyan-300/20 bg-gradient-to-br from-[#081225]/92 via-[#0b1730]/88 to-[#06101f]/92 p-2.5 shadow-[0_14px_42px_rgba(8,47,73,0.24)] backdrop-blur-sm">
          <div id="auth-group" className="relative isolate flex h-full w-full flex-col items-center justify-center">
            <HomeAuthGroup />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center mt-32 px-4 text-center">
        <div id="hero-section" className="flex flex-col items-center w-full fade-in pb-20">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mb-6 relative z-10">
            <span className="sparkle-ai">AI</span> Subtitle Translation
            <br />
            For Global <span className="sparkle-text">Video Content</span>
          </h1>

          <Link
            href="/app"
            className="get-started-btn btn-hightech relative z-20 mb-10 rounded-full px-10 py-4 text-sm font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              GET STARTED
            </span>
          </Link>

          <p className="text-gray-400 max-w-2xl text-lg mb-10 relative z-10">
            Tự động tạo và dịch phụ đề video bằng công nghệ AI tiên tiến nhất, hỗ trợ hơn
            100 ngôn ngữ với timecode đồng bộ chính xác.
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
