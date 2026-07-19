import Link from "next/link";
import { Icon } from "./WorkspacePanels";

export function WorkspaceHeader({
  displayName,
  initial,
  user,
  profileMenuRef,
  profileMenuOpen,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onOpenArchive,
  onOpenHistory,
  onLogout,
}) {
  function handleMenuAction(action) {
    onCloseProfileMenu();
    action?.();
  }

  return (
    <header className="relative z-30 flex h-14 items-center justify-between border-b border-slate-700/60 bg-[#0b1220]/95 px-4 backdrop-blur-xl lg:px-6">
      <Link href="/" className="ml-5 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20">
          <Icon name="subtitle" className="h-4 w-4" />
        </span>
        <span className="text-base font-black tracking-tight">
          Auto<span className="text-cyan-300">Sub</span> Studio
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link className="hidden items-center gap-2 rounded-lg border border-violet-300/20 bg-violet-300/8 px-3 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/35 hover:bg-violet-300/12 sm:flex" href="/link-studio">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.07 0l2-2a5 5 0 00-7.07-7.07l-1.15 1.15M14 11a5 5 0 00-7.07 0l-2 2A5 5 0 0012 20.07l1.15-1.15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          Link Studio
        </Link>
      <div className="relative" ref={profileMenuRef}>
        <button
          aria-expanded={profileMenuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4.5 px-2 py-1.5 text-left shadow-lg shadow-black/20 transition hover:border-cyan-300/20 hover:bg-white/7 focus:border-cyan-300/20 focus:bg-white/7 focus:outline-none"
          onClick={onToggleProfileMenu}
          type="button"
        >
          <span className="flex h-7 w-7 shrink-0 rounded-full bg-linear-to-br from-cyan-200 via-blue-400 to-violet-400 p-px">
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#081225] text-[10px] font-black text-cyan-100">
              {user?.photoURL ? <img alt={displayName} className="h-full w-full rounded-full object-cover" src={user.photoURL} /> : initial}
            </span>
          </span>
          <span className="hidden max-w-36 truncate text-xs font-bold text-cyan-100 sm:block">Hi, {displayName}</span>
          <svg className={`h-2.5 w-2.5 text-slate-500 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>

        <div className={`absolute right-0 top-full z-50 mt-2 w-44 origin-top-right rounded-lg border border-white/10 bg-[#07111f]/96 p-1.5 shadow-[0_16px_38px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-200 ${profileMenuOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0"}`} role="menu">
          <Link className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold leading-5 text-white transition hover:bg-cyan-300/10" href="/" onClick={onCloseProfileMenu} role="menuitem">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9 19v-5h6v5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Về trang chủ
          </Link>
          <Link className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold leading-5 text-violet-200 transition hover:bg-violet-300/10" href="/link-studio" onClick={onCloseProfileMenu} role="menuitem">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.07 0l2-2a5 5 0 00-7.07-7.07l-1.15 1.15M14 11a5 5 0 00-7.07 0l-2 2A5 5 0 0012 20.07l1.15-1.15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            Link Studio
          </Link>
          <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold leading-5 text-white transition hover:bg-cyan-300/10" onClick={() => handleMenuAction(onOpenHistory)} role="menuitem" type="button">
            <Icon name="history" className="h-4 w-4" />
            Lịch sử
          </button>
          <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold leading-5 text-white transition hover:bg-cyan-300/10" onClick={() => handleMenuAction(onOpenArchive)} role="menuitem" type="button">
            <Icon name="archive" className="h-4 w-4" />
            Kho lưu trữ
          </button>
          <div className="my-1 h-px bg-white/10" />
          <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-300/10 hover:text-rose-100" onClick={onLogout} role="menuitem" type="button">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </div>
      </div>
    </header>
  );
}
