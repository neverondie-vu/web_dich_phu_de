"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useAuthGuard } from "../hooks/workspace/useAuthGuard";
import { apiFetch, makeBackendUrl } from "../lib/api";

const tools = [
  { id: "translate", icon: "文", title: "Dịch phụ đề", note: "Giữ timecode SRT/VTT" },
  { id: "rewrite", icon: "✦", title: "Viết lại kịch bản", note: "Cấu trúc và lời kể mới" },
  { id: "commentary", icon: "◎", title: "Thêm phân tích", note: "Nhận xét và giải thích riêng" },
  { id: "visual-plan", icon: "▦", title: "Lên cảnh minh họa", note: "Shot list cho hình tự tạo" },
];

function parseVideoUrl(value) {
  const raw = value.trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return { error: "Liên kết chưa đúng định dạng." };
  }

  if (!["http:", "https:"].includes(url.protocol)) return { error: "Chỉ hỗ trợ liên kết http hoặc https." };
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "b23.tv") {
    return { error: "Hãy dán link Bilibili đầy đủ có mã BV (không dùng link rút gọn b23.tv)." };
  }
  if (host.endsWith("bilibili.com")) {
    const bvid = `${url.pathname}${url.search}`.match(/BV[a-zA-Z0-9]+/i)?.[0];
    const aid = url.pathname.match(/av(\d+)/i)?.[1];
    if (!bvid && !aid) return { error: "Không tìm thấy mã video Bilibili trong liên kết." };
    const query = bvid ? `bvid=${bvid}` : `aid=${aid}`;
    return {
      provider: "Bilibili",
      embedUrl: `https://player.bilibili.com/player.html?${query}&page=1&high_quality=1&danmaku=0`,
      originalUrl: url.toString(),
    };
  }

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const id = host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v") || url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    if (!id) return { error: "Không tìm thấy mã video YouTube trong liên kết." };
    return { provider: "YouTube", embedUrl: `https://www.youtube.com/embed/${id}`, originalUrl: url.toString() };
  }

  if (host.endsWith("vimeo.com")) {
    const id = url.pathname.match(/\/(\d+)/)?.[1];
    if (!id) return { error: "Không tìm thấy mã video Vimeo trong liên kết." };
    return { provider: "Vimeo", embedUrl: `https://player.vimeo.com/video/${id}`, originalUrl: url.toString() };
  }

  if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(url.toString())) {
    return { provider: "Video trực tiếp", directUrl: url.toString(), originalUrl: url.toString() };
  }

  return { error: "Hiện hỗ trợ Bilibili, YouTube, Vimeo và link video MP4/WebM trực tiếp." };
}

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    back: "M15 19l-7-7 7-7M8 12h12",
    link: "M10 13a5 5 0 007.07 0l2-2a5 5 0 00-7.07-7.07l-1.15 1.15M14 11a5 5 0 00-7.07 0l-2 2A5 5 0 0012 20.07l1.15-1.15",
    play: "M8 5v14l11-7z",
    spark: "M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z",
    sound: "M11 5L6 9H3v6h3l5 4V5zm4 4a4 4 0 010 6m2.5-8.5a8 8 0 010 11",
    image: "M4 5h16v14H4V5zm0 10l4-4 3 3 2-2 7 7M15 9h.01",
    check: "M5 13l4 4L19 7",
    download: "M12 3v12m0 0l-4-4m4 4l4-4M5 20h14",
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

export default function LinkStudio() {
  const router = useRouter();
  const { authChecked, user } = useAuthGuard(router);
  const fileRef = useRef(null);
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [activeTool, setActiveTool] = useState("translate");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Tiếng Việt");
  const [tone, setTone] = useState("Tự nhiên, rõ ràng");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [voice, setVoice] = useState("edge:vi-VN-HoaiMyNeural");
  const [thumbnailTitle, setThumbnailTitle] = useState("");
  const [thumbnailDirection, setThumbnailDirection] = useState("Chủ thể rõ nét, màu xanh tím điện ảnh, tiêu đề lớn dễ đọc");
  const [referenceImage, setReferenceImage] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const activeToolInfo = useMemo(() => tools.find((item) => item.id === activeTool), [activeTool]);

  function loadVideo(nextUrl = url) {
    const parsed = parseVideoUrl(nextUrl);
    if (!parsed || parsed.error) {
      setVideo(null);
      setUrlError(parsed?.error || "Hãy nhập liên kết video.");
      return;
    }
    setVideo(parsed);
    setUrlError("");
    setNotice(`Đã mở video từ ${parsed.provider}.`);
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData("text").trim();
    if (!pasted) return;
    setUrl(pasted);
    window.setTimeout(() => loadVideo(pasted), 0);
  }

  async function runTextTool() {
    if (!sourceText.trim()) return setNotice("Hãy dán phụ đề hoặc transcript trước.");
    if (!rightsConfirmed) return setNotice("Bạn cần xác nhận quyền sử dụng nội dung trước khi xử lý.");
    setLoading(true);
    setNotice(`${activeToolInfo.title} đang xử lý…`);
    try {
      const data = await apiFetch("/api/creative/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_text: sourceText, action: activeTool, target_language: targetLanguage, tone, rights_confirmed: true }),
      });
      setResult(data.result);
      setNotice("Đã tạo nội dung. Bạn có thể chỉnh trực tiếp trước khi tạo giọng đọc.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createVoice() {
    const text = (result || sourceText).trim();
    if (!text) return setNotice("Chưa có kịch bản để tạo giọng đọc.");
    setLoading(true);
    setNotice("Đang tạo giọng đọc AI…");
    try {
      const data = await apiFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "vi", voice, mode: "full", subtitles: [{ start: "00:00:00.000", end: "00:10:00.000", text, speaker: "A" }] }),
      });
      setAudioUrl(makeBackendUrl(data.audio_url));
      setNotice("Giọng đọc đã sẵn sàng.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReferenceImage(file) {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) return setNotice("Ảnh tham chiếu cần nhỏ hơn 6 MB.");
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function createThumbnail() {
    if (!thumbnailTitle.trim()) return setNotice("Hãy nhập tiêu đề cho ảnh bìa.");
    if (!rightsConfirmed) return setNotice("Bạn cần xác nhận quyền sử dụng ảnh/nội dung tham chiếu.");
    setLoading(true);
    setNotice("Gemini đang thiết kế ảnh bìa…");
    try {
      const data = await apiFetch("/api/creative/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: thumbnailTitle, direction: thumbnailDirection, reference_image: referenceImage || null, rights_confirmed: true }),
      });
      setThumbnail(data.image);
      setNotice("Ảnh bìa mới đã sẵn sàng.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked || !user) {
    return <main className="grid min-h-screen place-items-center bg-[#070b14] text-sm font-bold text-cyan-200">Đang mở Link Studio…</main>;
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(139,92,246,.14),transparent_28%)]" />
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#080d17]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-400 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/app" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200"><Icon name="back" /></Link>
            <div><p className="text-base font-black tracking-tight">Auto<span className="text-cyan-300">Sub</span> <span className="text-violet-300">Link Studio</span></p><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Create an original version</p></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/7 px-3 py-1.5 text-[11px] font-bold text-emerald-200 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" /> Gemini + AI Voice</div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-400 gap-4 p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(390px,.75fr)] lg:p-6">
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-2xl shadow-black/25">
            <div className="mb-3 flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">01 · Video nguồn</p><h1 className="mt-1 text-xl font-black">Dán link và xem ngay</h1></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-slate-400">Bilibili · YouTube · Vimeo · MP4</span></div>
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); loadVideo(); }}>
              <div className="relative flex-1"><Icon name="link" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input aria-label="Link video" className="h-12 w-full rounded-xl border border-white/10 bg-[#050811] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/5" onChange={(event) => setUrl(event.target.value)} onPaste={handlePaste} placeholder="https://www.bilibili.com/video/BV..." value={url} /></div>
              <button className="flex h-12 items-center gap-2 rounded-xl bg-linear-to-r from-cyan-300 to-blue-400 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/20" type="submit"><Icon name="play" className="h-4 w-4" /> Mở video</button>
            </form>
            {urlError && <p className="mt-2 text-xs font-medium text-rose-300">{urlError}</p>}
          </div>

          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#02040a] shadow-2xl shadow-black/40">
            {video?.embedUrl && <iframe allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full" referrerPolicy="strict-origin-when-cross-origin" src={video.embedUrl} title={`${video.provider} video`} />}
            {video?.directUrl && <video className="h-full w-full" controls src={video.directUrl} />}
            {!video && <div className="absolute inset-0 grid place-items-center"><div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/7 text-cyan-200"><Icon name="play" className="h-7 w-7" /></span><p className="mt-4 text-sm font-bold text-slate-300">Video sẽ xuất hiện ở đây</p><p className="mt-1 text-xs text-slate-600">Dán link để tải trình phát ngay lập tức</p></div></div>}
            {video && <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">{video.provider}</div>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
            <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">02 · Nội dung</p><h2 className="mt-1 text-lg font-black">Phụ đề hoặc transcript</h2></div><span className="text-xs text-slate-500">{sourceText.length.toLocaleString("vi-VN")} ký tự</span></div>
            <textarea className="min-h-52 w-full resize-y rounded-xl border border-white/10 bg-[#050811] p-4 font-mono text-sm leading-6 text-slate-200 outline-none placeholder:font-sans placeholder:text-slate-600 focus:border-violet-300/35" onChange={(event) => setSourceText(event.target.value)} placeholder="Dán nội dung SRT, VTT hoặc transcript của video tại đây…" value={sourceText} />
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Trình phát nhúng không tự sao chép phụ đề của nền tảng. Hãy dùng transcript của bạn hoặc nội dung bạn được phép xử lý.</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b111d]/95 p-4 shadow-2xl shadow-black/25">
            <p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">03 · Biên tập sáng tạo</p>
            <div className="mt-3 grid grid-cols-2 gap-2">{tools.map((item) => <button className={`rounded-xl border p-3 text-left transition ${activeTool === item.id ? "border-violet-300/35 bg-violet-300/10 shadow-lg shadow-violet-950/20" : "border-white/8 bg-white/[.025] hover:border-white/15 hover:bg-white/5"}`} key={item.id} onClick={() => setActiveTool(item.id)} type="button"><span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-black ${activeTool === item.id ? "bg-violet-300 text-slate-950" : "bg-white/7 text-slate-300"}`}>{item.icon}</span><span className="mt-2 block text-xs font-black text-white">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{item.note}</span></button>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngôn ngữ<select className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#050811] px-2 text-xs font-bold normal-case tracking-normal text-slate-200 outline-none" onChange={(e) => setTargetLanguage(e.target.value)} value={targetLanguage}><option>Tiếng Việt</option><option>English</option><option>中文</option><option>日本語</option><option>한국어</option></select></label><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giọng văn<select className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#050811] px-2 text-xs font-bold normal-case tracking-normal text-slate-200 outline-none" onChange={(e) => setTone(e.target.value)} value={tone}><option>Tự nhiên, rõ ràng</option><option>Năng động, hài hước</option><option>Chuyên gia, súc tích</option><option>Kể chuyện, giàu cảm xúc</option></select></label></div>
            <button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-400 to-fuchsia-400 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" disabled={loading} onClick={runTextTool} type="button"><Icon name="spark" className="h-4 w-4" /> {loading ? "AI đang xử lý…" : activeToolInfo.title}</button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b111d]/95 p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">04 · Bản thảo mới</p><h2 className="mt-1 text-base font-black">Kết quả có thể chỉnh sửa</h2></div><button className="text-[11px] font-bold text-slate-500 hover:text-white" onClick={() => navigator.clipboard?.writeText(result)} type="button">Sao chép</button></div>
            <textarea className="mt-3 min-h-44 w-full resize-y rounded-xl border border-white/10 bg-[#050811] p-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/30" onChange={(e) => setResult(e.target.value)} placeholder="Kết quả AI sẽ xuất hiện tại đây…" value={result} />
            <div className="mt-3 flex gap-2"><select aria-label="Giọng đọc" className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#050811] px-2 text-xs font-bold text-slate-200 outline-none" onChange={(e) => setVoice(e.target.value)} value={voice}><option value="edge:vi-VN-HoaiMyNeural">Hoài My · Nữ</option><option value="edge:vi-VN-NamMinhNeural">Nam Minh · Nam</option></select><button className="flex h-10 items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-200 hover:bg-cyan-300/15" disabled={loading} onClick={createVoice} type="button"><Icon name="sound" className="h-4 w-4" /> Tạo giọng AI</button></div>
            {audioUrl && <audio className="mt-3 h-9 w-full" controls src={audioUrl} />}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b111d]/95 p-4">
            <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-fuchsia-300/10 text-fuchsia-200"><Icon name="image" className="h-4 w-4" /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">05 · Ảnh bìa Gemini</p><p className="mt-0.5 text-xs text-slate-500">Thiết kế mới theo tỷ lệ 16:9</p></div></div>
            <input className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-[#050811] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-300/30" onChange={(e) => setThumbnailTitle(e.target.value)} placeholder="Tiêu đề trên ảnh bìa" value={thumbnailTitle} />
            <textarea className="mt-2 min-h-20 w-full resize-none rounded-lg border border-white/10 bg-[#050811] p-3 text-xs leading-5 text-slate-300 outline-none focus:border-fuchsia-300/30" onChange={(e) => setThumbnailDirection(e.target.value)} value={thumbnailDirection} />
            <input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleReferenceImage(e.target.files?.[0])} ref={fileRef} type="file" />
            <div className="mt-2 grid grid-cols-2 gap-2"><button className="h-10 rounded-lg border border-white/10 bg-white/4 text-xs font-bold text-slate-300 hover:bg-white/7" onClick={() => fileRef.current?.click()} type="button">{referenceImage ? "✓ Đã chọn ảnh" : "+ Ảnh tham chiếu"}</button><button className="h-10 rounded-lg bg-linear-to-r from-fuchsia-400 to-violet-400 text-xs font-black text-slate-950 disabled:opacity-60" disabled={loading} onClick={createThumbnail} type="button">Thiết kế bằng Gemini</button></div>
            {thumbnail && <div className="relative mt-3 overflow-hidden rounded-xl border border-white/10"><img alt="Ảnh bìa do Gemini thiết kế" className="aspect-video w-full object-cover" src={thumbnail} /><a className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-black/70 text-white backdrop-blur hover:bg-black" download="autosub-thumbnail.png" href={thumbnail} title="Tải ảnh bìa"><Icon name="download" className="h-4 w-4" /></a></div>}
          </div>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3"><input checked={rightsConfirmed} className="mt-0.5 h-4 w-4 accent-amber-300" onChange={(e) => setRightsConfirmed(e.target.checked)} type="checkbox" /><span className="text-[11px] leading-5 text-amber-100/75">Tôi sở hữu hoặc được phép sử dụng video, transcript và ảnh tham chiếu; phiên bản xuất bản sẽ dùng lời kể, giọng đọc và hình ảnh nguyên bản.</span></label>
          {notice && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/6 px-3 py-2.5 text-xs leading-5 text-cyan-100">{notice}</div>}
        </aside>
      </div>
    </main>
  );
}
