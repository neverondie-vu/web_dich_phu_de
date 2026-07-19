"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthGuard } from "../hooks/workspace/useAuthGuard";
import { apiFetch, makeBackendUrl } from "../lib/api";


const steps = [
  ["downloading", "Tải video", "Lấy video nguồn và kiểm tra dữ liệu"],
  ["transcribing", "Dịch phụ đề", "Whisper nhận diện, AI dịch sang tiếng Việt"],
  ["rewriting", "Viết kịch bản", "Gemini tạo lời kể mới theo ngữ cảnh"],
  ["rendering", "Tạo giọng & render", "AI đọc, ghép âm thanh và phụ đề"],
  ["completed", "Hoàn tất", "Video sản phẩm đã sẵn sàng"],
];

const progressByStatus = { queued: 3, downloading: 16, transcribing: 42, rewriting: 65, rendering: 84, completed: 100, failed: 100 };

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    back: "M15 19l-7-7 7-7M8 12h12",
    link: "M10 13a5 5 0 007.07 0l2-2a5 5 0 00-7.07-7.07l-1.15 1.15M14 11a5 5 0 00-7.07 0l-2 2A5 5 0 0012 20.07l1.15-1.15",
    spark: "M12 3l1.4 5.6L18 10l-5.6 1.4L11 17l-1.4-5.6L4 10l5.6-1.4L12 3z",
    check: "M5 13l4 4L19 7",
    download: "M12 3v12m0 0l-4-4m4 4l4-4M5 20h14",
    replay: "M4 10a8 8 0 111 6m-1 4v-4h4",
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

export default function AutoLinkStudio() {
  const router = useRouter();
  const { authChecked, user } = useAuthGuard(router);
  const pollRef = useRef(null);
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("zh");
  const [tone, setTone] = useState("Tự nhiên, rõ ràng");
  const [voice, setVoice] = useState("edge:vi-VN-HoaiMyNeural");
  const [rights, setRights] = useState(false);
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const progress = progressByStatus[job?.status] || 0;
  const activeIndex = useMemo(() => Math.max(0, steps.findIndex(([status]) => status === job?.status)), [job?.status]);
  const finalUrl = job?.video_url ? makeBackendUrl(job.video_url) : job?.hardsub_url ? makeBackendUrl(job.hardsub_url) : "";

  function stopPolling() {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }

  async function readStatus(id) {
    try {
      const data = await apiFetch(`/api/automation/status/${id}`);
      setJob(data);
      if (data.status === "completed" || data.status === "failed") {
        stopPolling();
        if (data.status === "failed") setError(data.message || "Không thể hoàn tất video.");
        else localStorage.removeItem(`autosub-auto-job:${user?.uid || "guest"}`);
      }
    } catch (statusError) {
      setError(statusError.message);
      stopPolling();
    }
  }

  function beginPolling(id) {
    stopPolling();
    readStatus(id);
    pollRef.current = window.setInterval(() => readStatus(id), 3500);
  }

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (!user?.uid) return;
    const saved = localStorage.getItem(`autosub-auto-job:${user.uid}`);
    if (saved) {
      setJobId(saved);
      beginPolling(saved);
    }
  }, [user?.uid]);

  async function startAutomation(event) {
    event.preventDefault();
    if (!rights) return setError("Bạn cần xác nhận quyền sử dụng video nguồn.");
    setError("");
    setSubmitting(true);
    setJob({ status: "queued", filename: "Đang khởi tạo…" });
    try {
      const data = await apiFetch("/api/automation/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          src_language: language,
          tone,
          voice,
          reduce_original_voice: true,
          rights_confirmed: true,
          user_id: user.uid,
          user_email: user.email,
          username: user.displayName || user.email?.split("@")[0],
        }),
      });
      setJobId(data.job_id);
      localStorage.setItem(`autosub-auto-job:${user.uid}`, data.job_id);
      beginPolling(data.job_id);
    } catch (startError) {
      setJob(null);
      setError(startError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    stopPolling();
    if (user?.uid) localStorage.removeItem(`autosub-auto-job:${user.uid}`);
    setJobId("");
    setJob(null);
    setError("");
    setUrl("");
  }

  if (!authChecked || !user) return <main className="grid min-h-screen place-items-center bg-[#070b14] text-sm font-bold text-cyan-200">Đang mở Auto Studio…</main>;

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.14),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(139,92,246,.16),transparent_28%)]" />
      <header className="relative z-30 border-b border-white/8 bg-[#080d17]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4"><Link href="/app" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/30 hover:text-cyan-200"><Icon name="back" /></Link><div><p className="text-base font-black">Auto<span className="text-cyan-300">Sub</span> <span className="text-violet-300">One-click Studio</span></p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Link vào · Video hoàn thiện ra</p></div></div>
          <div className="flex items-center gap-2">{job?.status === "completed" && <Link className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-300/15" href={`/link-studio/editor/${jobId}`}>Chỉnh sửa video</Link>}<div className="hidden items-center gap-2 text-xs font-bold text-emerald-200 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" /> Pipeline sẵn sàng</div></div>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-violet-200"><Icon name="spark" className="h-3.5 w-3.5" /> Tự động từ đầu đến cuối</span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Dán một đường link.<br /><span className="bg-linear-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">Nhận một video hoàn chỉnh.</span></h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400">Hệ thống tự tải video, nhận diện và dịch lời thoại, viết lại kịch bản, tạo giọng đọc AI, ghép phụ đề rồi render file MP4.</p></div>

        {!job ? (
          <form className="mx-auto mt-9 max-w-3xl rounded-3xl border border-white/10 bg-[#0b111d]/92 p-5 shadow-2xl shadow-black/35 sm:p-7" onSubmit={startAutomation}>
            <label className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">Liên kết video nguồn</label>
            <div className="relative mt-2"><Icon name="link" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input autoFocus className="h-14 w-full rounded-xl border border-white/10 bg-[#050811] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/5" onChange={(e) => setUrl(e.target.value)} placeholder="Dán link Bilibili, YouTube hoặc Vimeo…" required type="url" value={url} /></div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngôn ngữ gốc<select className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#050811] px-3 text-xs font-bold normal-case tracking-normal text-slate-200 outline-none" onChange={(e) => setLanguage(e.target.value)} value={language}><option value="zh">中文 · Trung</option><option value="en">English · Anh</option><option value="ja">日本語 · Nhật</option><option value="ko">한국어 · Hàn</option><option value="vi">Tiếng Việt</option></select></label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phong cách kịch bản<select className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#050811] px-3 text-xs font-bold normal-case tracking-normal text-slate-200 outline-none" onChange={(e) => setTone(e.target.value)} value={tone}><option>Tự nhiên, rõ ràng</option><option>Năng động, hài hước</option><option>Chuyên gia, súc tích</option><option>Kể chuyện, giàu cảm xúc</option></select></label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giọng đọc AI<select className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#050811] px-3 text-xs font-bold normal-case tracking-normal text-slate-200 outline-none" onChange={(e) => setVoice(e.target.value)} value={voice}><option value="edge:vi-VN-HoaiMyNeural">Hoài My · Nữ</option><option value="edge:vi-VN-NamMinhNeural">Nam Minh · Nam</option></select></label>
            </div>

            <label className="mt-5 flex cursor-pointer gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3"><input checked={rights} className="mt-0.5 h-4 w-4 accent-amber-300" onChange={(e) => setRights(e.target.checked)} type="checkbox" /><span className="text-[11px] leading-5 text-amber-100/75">Tôi sở hữu hoặc được phép tải, chỉnh sửa và xuất bản video nguồn này.</span></label>
            {error && <p className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/6 px-3 py-2.5 text-xs text-rose-200">{error}</p>}
            <button className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 via-blue-400 to-violet-400 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 disabled:cursor-wait disabled:opacity-60" disabled={submitting} type="submit"><Icon name="spark" className="h-4 w-4" />{submitting ? "Đang tạo tiến trình…" : "Tạo video hoàn chỉnh"}</button>
          </form>
        ) : (
          <section className="mx-auto mt-9 max-w-4xl rounded-3xl border border-white/10 bg-[#0b111d]/92 p-5 shadow-2xl shadow-black/35 sm:p-7">
            {job.status === "completed" ? (
              <div><div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/25"><Icon name="check" className="h-7 w-7" /></span><h2 className="mt-4 text-2xl font-black">Video của bạn đã hoàn tất</h2><p className="mt-1 truncate text-sm text-slate-400">{job.filename}</p></div><video className="mt-6 aspect-video w-full rounded-2xl border border-white/10 bg-black" controls src={finalUrl} /><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><a className="flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 text-sm font-black text-slate-950" download href={finalUrl}><Icon name="download" className="h-4 w-4" /> Tải video thành phẩm</a><button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-bold text-slate-300 hover:bg-white/5" onClick={reset} type="button"><Icon name="replay" className="h-4 w-4" /> Tạo video khác</button></div></div>
            ) : (
              <div><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">Đang sản xuất video</p><h2 className="mt-1 max-w-xl truncate text-xl font-black">{job.filename || "Video mới"}</h2></div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs font-black text-cyan-200">{progress}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/7"><div className={`h-full rounded-full bg-linear-to-r ${job.status === "failed" ? "from-rose-400 to-orange-400" : "from-cyan-300 via-blue-400 to-violet-400"} transition-all duration-700`} style={{ width: `${progress}%` }} /></div><div className="mt-6 grid gap-2">{steps.map(([status, title, note], index) => { const done = activeIndex > index || job.status === "completed"; const active = status === job.status; return <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${active ? "border-cyan-300/25 bg-cyan-300/7" : "border-white/7 bg-white/[.02]"}`} key={status}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${done ? "bg-emerald-300 text-slate-950" : active ? "bg-cyan-300 text-slate-950 animate-pulse" : "bg-white/6 text-slate-600"}`}>{done ? <Icon name="check" className="h-4 w-4" /> : index + 1}</span><span><span className={`block text-sm font-black ${active || done ? "text-white" : "text-slate-500"}`}>{title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{active && job.message ? job.message : note}</span></span></div>; })}</div>{job.status === "failed" && <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/7 p-3 text-xs leading-5 text-rose-200"><p className="font-black">Không thể hoàn tất video</p><p className="mt-1">{error || job.message}</p><button className="mt-3 rounded-lg bg-rose-300 px-3 py-2 font-black text-slate-950" onClick={reset} type="button">Thử video khác</button></div>}<p className="mt-5 text-center text-[11px] text-slate-600">Bạn có thể rời trang. Tiến trình {jobId.slice(0, 8)} sẽ tự tiếp tục trên máy chủ.</p></div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
