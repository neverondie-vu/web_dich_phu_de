"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthGuard } from "../hooks/workspace/useAuthGuard";
import { apiFetch, makeBackendUrl } from "../lib/api";
import { normalizeSubtitle, subtitleTimeToSeconds } from "../utils/workspace";


const fonts = ["Arial", "Tahoma", "Verdana", "Times New Roman", "Georgia", "Courier New"];
const colors = ["#ffffff", "#fef08a", "#67e8f9", "#f9a8d4", "#c4b5fd", "#86efac"];

function Icon({ name, className = "h-4 w-4" }) {
  const paths = {
    back: "M15 19l-7-7 7-7M8 12h12",
    save: "M5 4h12l2 2v14H5V4zm3 0v5h8V4M8 20v-7h8v7",
    play: "M8 5v14l11-7z",
    download: "M12 3v12m0 0l-4-4m4 4l4-4M5 20h14",
    plus: "M12 5v14M5 12h14",
    trash: "M5 7h14M9 7V4h6v3m-8 0l1 13h8l1-13",
    captions: "M4 6h16v12H4V6zm3 5h3m4 0h3M7 14h3m4 0h3",
  };
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function toTimestamp(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function rgba(hex, opacity) {
  const value = hex.replace("#", "");
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${opacity})`;
}

export default function AutoVideoEditor() {
  const params = useParams();
  const jobId = String(params.jobId || "");
  const router = useRouter();
  const { authChecked, user } = useAuthGuard(router);
  const videoRef = useRef(null);
  const pollRef = useRef(null);
  const [subtitles, setSubtitles] = useState([]);
  const [filename, setFilename] = useState("Video tự động");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tab, setTab] = useState("subtitle");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#ffffff");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [opacity, setOpacity] = useState(0.78);
  const [position, setPosition] = useState(8);
  const [voice, setVoice] = useState("edge:vi-VN-HoaiMyNeural");
  const [reduceOriginalVoice, setReduceOriginalVoice] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [message, setMessage] = useState("Đang tải dự án…");
  const [outputUrl, setOutputUrl] = useState("");
  const [showOutput, setShowOutput] = useState(false);

  const originalUrl = makeBackendUrl(`/api/original/${jobId}`);
  const previewUrl = showOutput && outputUrl ? outputUrl : originalUrl;
  const activeIndex = useMemo(() => {
    const found = subtitles.findIndex((item) => currentTime >= subtitleTimeToSeconds(item.start) && currentTime <= subtitleTimeToSeconds(item.end));
    return found >= 0 ? found : selectedIndex;
  }, [currentTime, selectedIndex, subtitles]);
  const activeSubtitle = subtitles[activeIndex];
  const safeDuration = duration || 1;
  const timelineWidth = Math.max(1200, duration * 18);

  useEffect(() => {
    if (!user?.uid || !jobId) return;
    loadProject();
    return () => pollRef.current && window.clearInterval(pollRef.current);
  }, [user?.uid, jobId]);

  async function loadProject() {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/status/${jobId}`);
      setFilename(data.filename || "Video tự động");
      setSubtitles((data.subtitles || []).map(normalizeSubtitle));
      if (data.has_dubbed) setOutputUrl(makeBackendUrl(`/api/download_dubbed/${jobId}?v=${Date.now()}`));
      setMessage(data.subtitles?.length ? `${data.subtitles.length} đoạn phụ đề sẵn sàng chỉnh sửa.` : "Video chưa có dữ liệu phụ đề.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateSubtitle(index, patch) {
    setSubtitles((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function seekTo(index) {
    const time = subtitleTimeToSeconds(subtitles[index]?.start);
    setSelectedIndex(index);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  }

  function addSubtitle() {
    const start = currentTime;
    const next = { start: toTimestamp(start), end: toTimestamp(start + 2.5), text: "Phụ đề mới", speaker: "A" };
    setSubtitles((items) => [...items, next].sort((a, b) => subtitleTimeToSeconds(a.start) - subtitleTimeToSeconds(b.start)));
    setMessage("Đã thêm một đoạn phụ đề tại vị trí con trỏ.");
  }

  function removeSubtitle(index) {
    setSubtitles((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setSelectedIndex((value) => Math.max(0, Math.min(value, subtitles.length - 2)));
  }

  async function saveSubtitles() {
    if (!subtitles.length) throw new Error("Dự án cần ít nhất một đoạn phụ đề.");
    await apiFetch(`/api/subtitles/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitles }),
    });
    setMessage("Đã lưu nội dung và timecode phụ đề.");
  }

  async function handleSave() {
    setLoading(true);
    try {
      await saveSubtitles();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function renderVideo() {
    setRendering(true);
    setShowOutput(false);
    try {
      await saveSubtitles();
      await apiFetch("/api/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          subtitles,
          subtitle_position_y: 20,
          subtitle_position_percent: position,
          background_opacity: opacity,
          background_color: backgroundColor,
          text_color: textColor,
          font_size: fontSize,
          font_family: fontFamily,
          tts_language: "vi",
          tts_voice: voice,
          reduce_original_voice: reduceOriginalVoice,
        }),
      });
      setMessage("Đang render lại video, phụ đề và giọng đọc…");
      pollRef.current = window.setInterval(checkRenderStatus, 3500);
    } catch (error) {
      setRendering(false);
      setMessage(error.message);
    }
  }

  async function checkRenderStatus() {
    try {
      const data = await apiFetch(`/api/status/${jobId}`);
      if (data.status === "failed") {
        window.clearInterval(pollRef.current);
        setRendering(false);
        setMessage("Render thất bại. Vui lòng kiểm tra log backend.");
      }
      if (data.status === "completed") {
        window.clearInterval(pollRef.current);
        setRendering(false);
        const url = makeBackendUrl(`${data.has_dubbed ? "/api/download_dubbed/" : "/api/download/"}${jobId}?v=${Date.now()}`);
        setOutputUrl(url);
        setShowOutput(true);
        setMessage("Video mới đã render hoàn tất.");
      }
    } catch (error) {
      window.clearInterval(pollRef.current);
      setRendering(false);
      setMessage(error.message);
    }
  }

  if (!authChecked || !user) return <main className="grid min-h-screen place-items-center bg-[#080b12] text-cyan-200">Đang mở Auto Editor…</main>;

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#080b12] text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d121c] px-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-3"><Link className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white" href="/link-studio"><Icon name="back" /></Link><div className="min-w-0"><p className="truncate text-sm font-black">{filename}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AutoSub Editor · {jobId.slice(0, 8)}</p></div></div>
        <div className="flex items-center gap-2"><button className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 hover:bg-white/5 sm:flex" disabled={loading || rendering} onClick={handleSave} type="button"><Icon name="save" /> Lưu</button><button className="flex h-9 items-center gap-2 rounded-lg bg-linear-to-r from-cyan-300 to-violet-400 px-4 text-xs font-black text-slate-950 disabled:opacity-50" disabled={loading || rendering || !subtitles.length} onClick={renderVideo} type="button"><Icon name="play" /> {rendering ? "Đang xuất…" : "Xuất video"}</button></div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col border-r border-white/8">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-[#05070c] p-4">
            <div className="relative aspect-video max-h-full w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl shadow-black/50">
              <video key={previewUrl} className="h-full w-full object-contain" controls onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} ref={videoRef} src={previewUrl} />
              {!showOutput && activeSubtitle?.text && <div className="pointer-events-none absolute inset-x-4 text-center" style={{ bottom: `${position}%` }}><span className="inline rounded px-2 py-1 leading-relaxed" style={{ background: rgba(backgroundColor, opacity), color: textColor, fontFamily, fontSize: `${Math.max(12, Math.min(42, fontSize))}px` }}>{activeSubtitle.text}</span></div>}
              <div className="absolute right-2 top-2 flex rounded-lg border border-white/10 bg-black/65 p-1 text-[10px] font-black backdrop-blur"><button className={`rounded px-2 py-1 ${!showOutput ? "bg-white text-black" : "text-slate-300"}`} onClick={() => setShowOutput(false)} type="button">Bản chỉnh sửa</button><button className={`rounded px-2 py-1 ${showOutput ? "bg-emerald-300 text-slate-950" : "text-slate-300"}`} disabled={!outputUrl} onClick={() => setShowOutput(true)} type="button">Bản đã xuất</button></div>
            </div>
          </div>

          <div className="h-52 shrink-0 border-t border-white/10 bg-[#0b1019]">
            <div className="flex h-10 items-center justify-between border-b border-white/8 px-3"><div className="flex items-center gap-2 text-xs font-black"><Icon name="captions" className="text-cyan-300" /> Timeline phụ đề</div><button className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/5" onClick={addSubtitle} type="button"><Icon name="plus" className="h-3 w-3" /> Thêm đoạn</button></div>
            <div className="custom-scrollbar h-[calc(100%-40px)] overflow-auto p-3">
              <div className="relative h-28 rounded-lg bg-[#05070c]" style={{ width: `${timelineWidth}px` }}>
                <div className="absolute inset-x-0 top-0 flex h-5 border-b border-white/8 text-[9px] text-slate-600">{Array.from({ length: Math.ceil(duration / 10) + 1 }, (_, index) => <span className="absolute" key={index} style={{ left: `${index * 180}px` }}>{index * 10}s</span>)}</div>
                {duration > 0 && <span className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white" style={{ left: `${(currentTime / safeDuration) * 100}%` }} />}
                {subtitles.map((item, index) => { const start = subtitleTimeToSeconds(item.start); const end = subtitleTimeToSeconds(item.end); return <button className={`absolute top-8 h-14 overflow-hidden rounded-md border px-2 text-left text-[10px] leading-4 ${index === activeIndex ? "border-cyan-200 bg-cyan-400/25 text-white" : "border-cyan-400/15 bg-cyan-400/10 text-cyan-100"}`} key={`${item.start}-${index}`} onClick={() => seekTo(index)} style={{ left: `${(start / safeDuration) * 100}%`, width: `${Math.max(52, ((end - start) / safeDuration) * timelineWidth)}px` }} type="button">{item.text}</button>; })}
              </div>
            </div>
          </div>
        </section>

        <aside className="custom-scrollbar min-h-0 overflow-y-auto bg-[#0d121c]">
          <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-white/10 bg-[#0d121c] p-2">{[["subtitle", "Phụ đề"], ["style", "Kiểu chữ"], ["voice", "Giọng đọc"]].map(([key, label]) => <button className={`rounded-lg px-2 py-2 text-xs font-black ${tab === key ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"}`} key={key} onClick={() => setTab(key)} type="button">{label}</button>)}</div>

          {tab === "subtitle" && <div className="space-y-2 p-3">{subtitles.map((item, index) => <div className={`rounded-xl border p-3 ${index === activeIndex ? "border-cyan-300/30 bg-cyan-300/5" : "border-white/8 bg-white/[.02]"}`} key={`${item.start}-editor-${index}`} onClick={() => seekTo(index)}><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black text-cyan-300">#{String(index + 1).padStart(2, "0")}</span><button className="text-slate-600 hover:text-rose-300" onClick={(e) => { e.stopPropagation(); removeSubtitle(index); }} type="button"><Icon name="trash" /></button></div><div className="grid grid-cols-2 gap-2"><input className="h-8 rounded-md border border-white/8 bg-black/30 px-2 font-mono text-[10px] text-slate-400 outline-none focus:border-cyan-300/30" onChange={(e) => updateSubtitle(index, { start: e.target.value })} value={item.start} /><input className="h-8 rounded-md border border-white/8 bg-black/30 px-2 font-mono text-[10px] text-slate-400 outline-none focus:border-cyan-300/30" onChange={(e) => updateSubtitle(index, { end: e.target.value })} value={item.end} /></div><textarea className="mt-2 min-h-20 w-full resize-y rounded-lg border border-white/8 bg-black/30 p-2 text-sm leading-5 text-slate-100 outline-none focus:border-cyan-300/30" onChange={(e) => updateSubtitle(index, { text: e.target.value })} value={item.text} /></div>)}</div>}

          {tab === "style" && <div className="space-y-5 p-4"><label className="block text-[11px] font-bold text-slate-400">Kiểu chữ<select className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#070a10] px-3 text-sm text-white outline-none" onChange={(e) => setFontFamily(e.target.value)} value={fontFamily}>{fonts.map((font) => <option key={font}>{font}</option>)}</select></label><label className="block text-[11px] font-bold text-slate-400">Cỡ chữ <span className="float-right text-white">{fontSize}px</span><input className="mt-3 w-full accent-cyan-300" max="64" min="12" onChange={(e) => setFontSize(Number(e.target.value))} type="range" value={fontSize} /></label><div><p className="text-[11px] font-bold text-slate-400">Màu chữ</p><div className="mt-2 flex flex-wrap gap-2">{colors.map((color) => <button aria-label={`Màu chữ ${color}`} className={`h-8 w-8 rounded-lg border-2 ${textColor === color ? "border-white" : "border-transparent"}`} key={color} onClick={() => setTextColor(color)} style={{ backgroundColor: color }} type="button" />)}<input className="h-8 w-10 rounded" onChange={(e) => setTextColor(e.target.value)} type="color" value={textColor} /></div></div><div><p className="text-[11px] font-bold text-slate-400">Màu nền</p><div className="mt-2 flex gap-2"><input className="h-10 w-14 rounded" onChange={(e) => setBackgroundColor(e.target.value)} type="color" value={backgroundColor} /><input className="h-10 flex-1 rounded-lg border border-white/10 bg-[#070a10] px-3 font-mono text-xs text-white" onChange={(e) => setBackgroundColor(e.target.value)} value={backgroundColor} /></div></div><label className="block text-[11px] font-bold text-slate-400">Độ trong nền <span className="float-right text-white">{Math.round(opacity * 100)}%</span><input className="mt-3 w-full accent-cyan-300" max="1" min="0" onChange={(e) => setOpacity(Number(e.target.value))} step="0.05" type="range" value={opacity} /></label><label className="block text-[11px] font-bold text-slate-400">Độ cao phụ đề <span className="float-right text-white">{position}%</span><input className="mt-3 w-full accent-violet-300" max="45" min="2" onChange={(e) => setPosition(Number(e.target.value))} type="range" value={position} /></label></div>}

          {tab === "voice" && <div className="space-y-4 p-4"><label className="block text-[11px] font-bold text-slate-400">Giọng đọc tiếng Việt<select className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#070a10] px-3 text-sm text-white outline-none" onChange={(e) => setVoice(e.target.value)} value={voice}><option value="edge:vi-VN-HoaiMyNeural">Hoài My · Nữ</option><option value="edge:vi-VN-NamMinhNeural">Nam Minh · Nam</option></select></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><input checked={reduceOriginalVoice} className="mt-0.5 accent-cyan-300" onChange={(e) => setReduceOriginalVoice(e.target.checked)} type="checkbox" /><span><span className="block text-xs font-black text-white">Giảm âm thanh gốc</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">Giữ nhạc và hiệu ứng nền nhỏ, ưu tiên giọng đọc AI.</span></span></label><div className="rounded-xl border border-violet-300/15 bg-violet-300/5 p-3 text-[11px] leading-5 text-violet-100/70">Khi xuất video, hệ thống sẽ tạo lại toàn bộ giọng đọc theo nội dung phụ đề đã chỉnh và đồng bộ với timeline.</div></div>}

          <div className="sticky bottom-0 border-t border-white/10 bg-[#0d121c]/95 p-3 backdrop-blur"><p className="mb-2 min-h-5 text-[11px] text-slate-400">{loading ? "Đang xử lý…" : message}</p><div className="grid grid-cols-2 gap-2"><button className="h-10 rounded-lg border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5" disabled={loading || rendering} onClick={handleSave} type="button">Lưu thay đổi</button>{outputUrl ? <a className="flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-300 text-xs font-black text-slate-950" download href={outputUrl}><Icon name="download" /> Tải MP4</a> : <button className="h-10 rounded-lg bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-50" disabled={rendering} onClick={renderVideo} type="button">Xuất video</button>}</div></div>
        </aside>
      </div>
    </main>
  );
}
