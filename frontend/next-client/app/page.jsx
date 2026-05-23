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
        <div
          id="auth-slider"
          className="pointer-events-none absolute z-0 h-[34px] w-[130px] bg-white rounded-full transition-all duration-300 ease-out left-[100px]"
        />
        <Link
          href="/auth/login"
          className="relative z-20 w-[100px] whitespace-nowrap text-sm font-semibold text-gray-400 flex items-center justify-center"
        >
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className="relative z-20 w-[130px] whitespace-nowrap text-sm font-bold text-cyan-400 flex items-center justify-center"
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
    <div className="group relative flex items-center justify-center w-full h-full cursor-pointer">
      <div className="flex items-center gap-2 px-3 py-1 hover:bg-white/5 rounded-full transition">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-7 h-7 rounded-full border border-cyan-400/30 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 text-[10px] font-bold border border-cyan-400/20">
            {initial}
          </div>
        )}
        <span className="text-cyan-300 text-xs font-semibold truncate max-w-[80px]">
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

      <div className="absolute top-full right-0 mt-3 w-64 bg-gradient-to-br from-[#0b1220]/95 via-[#111827]/95 to-[#0f172a]/95 backdrop-blur-2xl border border-cyan-400/10 rounded-2xl shadow-[0_10px_50px_rgba(0,255,255,0.12)] p-2 opacity-0 invisible translate-y-3 scale-95 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out z-50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.12),transparent_40%)] pointer-events-none" />
        <div className="relative px-4 py-3 border-b border-white/5 mb-2">
          <p className="text-[10px] text-cyan-400/70 uppercase font-bold tracking-[0.25em]">
            Tài khoản
          </p>
          <p className="text-xs text-white truncate font-semibold mt-1">{user.email}</p>
        </div>
        <div className="relative px-4 py-3 mb-3 bg-white/[0.04] border border-white/5 rounded-xl flex justify-between items-center hover:bg-white/[0.06] transition">
          <span className="text-[10px] text-gray-400 font-medium">Gói hiện tại</span>
          <span
            className={`text-[11px] font-bold px-2 py-1 rounded-full ${
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
          className="group/item flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-cyan-500/10 rounded-xl transition-all duration-200 mb-1 text-left border border-transparent hover:border-cyan-400/10"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover/item:scale-110 transition">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white">Công cụ AutoSub</span>
            <span className="text-[10px] text-gray-500">Subtitle AI Dashboard</span>
          </div>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="group/item flex items-center gap-3 px-4 py-3 text-xs text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 mb-1 text-left border border-transparent hover:border-red-400/10"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/item:scale-110 transition">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white">Trang Quản Trị</span>
              <span className="text-[10px] text-red-400">Admin Panel</span>
            </div>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-transparent hover:border-red-400/10 mt-1"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <span className="font-semibold">Đăng xuất</span>
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

        <div className="relative flex items-center bg-black/40 border border-white/20 rounded-full p-1 backdrop-blur-sm w-[240px] h-[44px] overflow-visible z-[9999]">
          <div id="auth-group" className="relative flex items-center w-full h-full">
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
          <p className="text-gray-400 max-w-2xl text-lg mb-10 relative z-10">
            Tự động tạo và dịch phụ đề video bằng công nghệ AI tiên tiến nhất, hỗ trợ hơn
            100 ngôn ngữ với timecode đồng bộ chính xác.
          </p>

          <Link
            href="/app"
            className="get-started-btn btn-hightech z-20 px-10 py-4 rounded-full font-bold text-sm relative"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              GET STARTED
            </span>
          </Link>

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
