import { makeBackendUrl } from "../../lib/api";

export const mediaProfiles = {
  video: {
    label: "Video",
    title: "Tải video",
    description: "MP4 có âm thanh rõ, phù hợp để tạo phụ đề và render hardsub.",
    accept: "video/mp4,.mp4",
    extensions: [".mp4"],
    endpoint: "/api/upload",
    emptyText: "Kéo thả hoặc chọn video MP4",
  },
  audio: {
    label: "Audio",
    title: "Tải âm thanh",
    description: "MP3, WAV, M4A để tạo và xuất phụ đề SRT.",
    accept: "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a",
    extensions: [".mp3", ".wav", ".m4a"],
    endpoint: "/api/upload-audio",
    emptyText: "Kéo thả hoặc chọn audio",
  },
};

const statusMeta = {
  queued: ["Đang chờ", "border-amber-400/25 bg-amber-400/10 text-amber-200"],
  waiting: ["Đang chờ", "border-amber-400/25 bg-amber-400/10 text-amber-200"],
  processing: ["Đang xử lý", "border-sky-400/25 bg-sky-400/10 text-sky-200"],
  transcribed: ["Đã tạo phụ đề", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
  burning: ["Đang ép video", "border-blue-400/25 bg-blue-400/10 text-blue-200"],
  completed: ["Hoàn thành", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
  failed: ["Thất bại", "border-rose-400/25 bg-rose-400/10 text-rose-200"],
  saved: ["Đã lưu", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
};

export function statusLabel(status) {
  return statusMeta[String(status || "").toLowerCase()] || [status || "Đang chờ", statusMeta.waiting[1]];
}

export function Icon({ name, className = "h-5 w-5" }) {
  const common = { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
  const paths = {
    audio: "M9 19V6l12-2v13M9 19c0 1.105-1.79 2-4 2s-4-.895-4-2 1.79-2 4-2 4 .895 4 2Zm12-2c0 1.105-1.79 2-4 2s-4-.895-4-2 1.79-2 4-2 4 .895 4 2Z",
    archive: "M20 7H4m16 0-1 12H5L4 7m16 0-2-4H6L4 7m5 5h6",
    check: "M5 13l4 4L19 7",
    clock: "M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    close: "M6 18 18 6M6 6l12 12",
    download: "M12 3v12m0 0 4-4m-4 4-4-4M4 21h16",
    history: "M3 12a9 9 0 1 0 3-6.7M3 5v6h6m3-3v5l4 2",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    play: "M8 5v14l11-7L8 5Z",
    next: "M5 5l7 7-7 7M13 5l7 7-7 7",
    subtitle: "M4 5h16v14H4V5Zm3 9h5m2 0h3M7 11h10",
    upload: "M12 16V4m0 0 4 4m-4-4-4 4M4 20h16",
    video: "M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z",
  };

  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={paths[name] || paths.info} />
    </svg>
  );
}

export function QueueItem({ item }) {
  const [label, classes] = statusLabel(item.status);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-100">
            <Icon name={item.mediaType === "audio" ? "audio" : "video"} className="h-4 w-4 text-cyan-300" />
            <span className="truncate text-sm font-semibold">{item.filename}</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {mediaProfiles[item.mediaType]?.label || "Tệp"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${classes}`}>
          {label}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#050810]">
        <div
          className={`h-full ${
            item.status === "completed"
              ? "w-full bg-emerald-400"
              : item.status === "failed"
                ? "w-full bg-rose-400"
                : "w-1/3 bg-linear-to-r from-cyan-400 to-blue-500"
          }`}
        />
      </div>
    </div>
  );
}

export function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-10000 flex w-90 max-w-[calc(100vw-32px)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className={`rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-xl ${
            toast.type === "error"
              ? "border-rose-400/25 bg-rose-500/15 text-rose-50"
              : toast.type === "success"
                ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-50"
                : "border-cyan-400/25 bg-cyan-500/15 text-cyan-50"
          }`}
          key={toast.id}
        >
          <p className="text-sm font-bold">{toast.title}</p>
          {toast.body && <p className="mt-1 text-xs leading-5 text-slate-300">{toast.body}</p>}
        </div>
      ))}
    </div>
  );
}

export function WorkspaceActionBar({
  currentFileName,
  currentMediaType,
  currentStatus,
  finalVideoUrl,
  loading,
  message,
  subtitlesCount,
  waitingForUserAction,
  onBurnVideo,
  onContinueQueue,
  onExportSrt,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0f172a]/88 p-3 shadow-2xl shadow-black/25 backdrop-blur-xl xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`studio-status-dot h-2.5 w-2.5 rounded-full ${loading ? "bg-cyan-300 shadow-cyan-300/60" : "bg-emerald-300 shadow-emerald-300/60"}`} />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{currentStatus}</span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-400">{currentMediaType === "audio" ? "Audio to SRT" : "Video to SRT/MP4"}</span>
        </div>
        <h2 className="mt-1.5 truncate text-xl font-black tracking-tight text-white xl:text-2xl">{currentFileName}</h2>
        <p className="mt-1.5 max-w-4xl text-xs leading-5 text-slate-400">{message}</p>
      </div>

      <div className="flex flex-wrap gap-2 xl:justify-end">
        {waitingForUserAction && (
          <button className="flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110" onClick={onContinueQueue} type="button">
            <Icon name="next" className="h-4 w-4" />
            Tệp tiếp theo
          </button>
        )}
        {false && <button disabled={!subtitlesCount} onClick={onExportSrt} className="flex items-center gap-2 rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10 disabled:hidden" type="button">
          <Icon name="download" className="h-4 w-4" />
          Xuất SRT
        </button>}
        {currentMediaType === "video" && !finalVideoUrl && (
          <button disabled={!subtitlesCount || loading} onClick={onBurnVideo} className="flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:hidden" type="button">
            <Icon name="video" className="h-4 w-4" />
            Ép video
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkflowSteps({ activeStepIndex, steps }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-[#0f172a]/72 p-2 sm:grid-cols-4">
      {steps.map(([step, title, detail], index) => (
        <div
          className={`rounded-md border p-2.5 text-left transition ${
            index <= activeStepIndex
              ? "border-cyan-300/25 bg-cyan-300/10"
              : "border-white/10 bg-[#050810]/65"
          }`}
          key={step}
        >
          <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${index <= activeStepIndex ? "text-cyan-200" : "text-slate-500"}`}>{step}</p>
          <p className="mt-1 text-xs font-bold text-white">{title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
        </div>
      ))}
    </div>
  );
}

export function HistoryList({ history, message, onRefresh }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#050810]/65 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Lịch sử xử lý</p>
          <p className="mt-1 text-xs text-slate-500">Theo dõi job đang chạy và kết quả đã hoàn thành.</p>
        </div>
        <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/5" onClick={onRefresh} type="button">
          Làm mới
        </button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        {message ? (
          <p className="py-12 text-center text-sm text-slate-500">{message}</p>
        ) : history.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có lịch sử xử lý.</p>
        ) : (
          history.map((item, index) => {
            const [label, classes] = statusLabel(item.status);
            return (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4" key={`${item.job_id}-${item.action}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white">{item.action}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${classes}`}>{label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.message || "Không có mô tả chi tiết."}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                  <span className="truncate font-mono">{item.job_id}</span>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "N/A"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ArchiveModal({ archive, archiveMessage, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-9999 grid place-items-center bg-[#050810]/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-cyan-400/15 bg-[#0b1437] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div>
            <h2 className="text-xl font-black text-white">Kho lưu trữ dự án</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Các dự án hoàn thành được lưu tối đa 20 ngày để tối ưu dung lượng.</p>
          </div>
          <button className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </div>
        <div className="custom-scrollbar max-h-[70vh] space-y-3 overflow-y-auto p-5">
          {archiveMessage ? (
            <p className="py-10 text-center text-sm text-slate-500">{archiveMessage}</p>
          ) : archive.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Kho đang trống.</p>
          ) : (
            archive.map((job) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4" key={job.job_id}>
                <div className="min-w-0">
                  <p className="truncate pr-4 text-sm font-bold text-white">{job.filename}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{job.created_at}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-white/5" href={makeBackendUrl(`/api/download_srt/${job.job_id}`)} target="_blank">
                    SRT
                  </a>
                  {job.media_type === "audio" ? (
                    <a className="rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 hover:brightness-110" href={makeBackendUrl(`/api/original/${job.job_id}`)} target="_blank">
                      Tệp gốc
                    </a>
                  ) : (
                    <a className="rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 hover:brightness-110" href={makeBackendUrl(`/api/download/${job.job_id}`)} target="_blank">
                      MP4
                    </a>
                  )}
                  <button
                    className="rounded-lg border border-rose-300/25 bg-rose-400/12 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-400/20"
                    onClick={() => {
                      if (window.confirm("Xóa dự án này khỏi kho lưu trữ?")) {
                        onDelete?.(job.job_id);
                      }
                    }}
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
