import { subtitleColorPresets, subtitleFonts } from "../../constants/workspace";
import { hexToRgba } from "../../utils/workspace";
import { Icon } from "./WorkspacePanels";

export function PreviewPanel({
  backgroundColor,
  currentJobId,
  currentMediaType,
  currentOutput,
  finalVideoUrl,
  fontFamily,
  fontSize,
  hasEditableVideoPreview,
  loading,
  onOpenPreviewFullscreen,
  opacity,
  posY,
  previewExpanded,
  previewFrameRef,
  previewSubtitle,
  previewUrl,
  previewVideoBoxStyle,
  setBackgroundColor,
  setFontFamily,
  setFontSize,
  setOpacity,
  setPosY,
  setPreviewCurrentTime,
  setPreviewVideoSize,
  setTextColor,
  subtitleCustomizationRef,
  subtitlesCount,
  textColor,
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0f172a]/90 shadow-2xl shadow-black/35">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-300/10 text-cyan-200">
            <Icon name={currentMediaType === "audio" ? "audio" : "video"} className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Preview</p>
            <p className="text-[11px] text-slate-500">Kiểm tra đầu vào và kết quả render</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-slate-400">{currentOutput}</span>
      </div>

      <div className={`subtitle-preview-frame relative aspect-video overflow-hidden bg-black ${previewExpanded ? "subtitle-preview-expanded" : ""}`} ref={previewFrameRef}>
        {currentMediaType === "audio" ? (
          <div className="grid h-full content-center p-5 text-left">
            <div className="grid justify-items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <Icon name="audio" className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-white">Xử lý audio thành phụ đề SRT</h3>
                <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">Tệp âm thanh được nhận diện giọng nói, tách câu theo thời gian và xuất SRT để tải xuống hoặc chỉnh sửa.</p>
              </div>
              <div className="flex h-12 w-full max-w-xl items-end gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
                {[38, 64, 46, 78, 55, 88, 42, 72, 50, 82, 58, 68, 44, 74, 52, 62].map((height, index) => (
                  <span className="flex-1 rounded-t bg-cyan-300/70" key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              {previewUrl && <audio controls src={previewUrl} className="w-full max-w-xl" />}
            </div>
          </div>
        ) : previewUrl ? (
          <>
            <video
              controls
              controlsList="nofullscreen"
              src={previewUrl}
              className="h-full w-full object-contain"
              onLoadedMetadata={(event) => {
                setPreviewVideoSize({
                  width: event.currentTarget.videoWidth || 16,
                  height: event.currentTarget.videoHeight || 9,
                });
              }}
              onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
            />
            <button
              aria-label={previewExpanded ? "Thu nhỏ video" : "Phóng to video và phụ đề"}
              className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/25 bg-[#050810]/75 text-cyan-100 shadow-lg shadow-black/30 backdrop-blur-sm transition hover:border-cyan-200/60 hover:bg-cyan-300/15 hover:text-white"
              onClick={onOpenPreviewFullscreen}
              title={previewExpanded ? "Thu nhỏ video" : "Phóng to video và phụ đề"}
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>
            {!finalVideoUrl && previewSubtitle && (
              <div
                className="pointer-events-none absolute z-10"
                style={previewVideoBoxStyle()}
              >
                <div
                  className="absolute inset-x-0 flex justify-center px-5 text-center"
                  style={{ bottom: `${posY}%` }}
                >
                  <span
                    className="max-w-[92%] rounded px-2.5 py-1 text-sm font-semibold leading-5 shadow-md"
                    style={{
                      backgroundColor: hexToRgba(backgroundColor, opacity),
                      color: textColor,
                      fontFamily,
                      fontSize: `${fontSize}px`,
                    }}
                  >
                    {previewSubtitle.text}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid h-full content-center p-6 text-left">
            <div className="grid max-w-md justify-items-start gap-4 text-slate-500">
              <Icon name="video" className="h-12 w-12" />
              <div>
                <h3 className="text-lg font-black text-white">Chưa có video xem trước</h3>
                <p className="mt-2 text-sm leading-6">Chọn video MP4 ở cột bên trái để bắt đầu tạo phụ đề và xem lại kết quả tại đây.</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#050810]/90 p-5 backdrop-blur-md">
            <div className="grid justify-items-center gap-4 text-center">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">AI đang nhận diện giọng nói và xử lý phụ đề</span>
            </div>
          </div>
        )}
      </div>

      {hasEditableVideoPreview && (
        <div className="grid gap-2 border-t border-white/10 p-2.5 text-left">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid min-h-18 content-center gap-2 rounded-lg border border-white/10 bg-[#050810]/65 p-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Vị trí phụ đề</label>
                <span className="font-mono text-xs text-cyan-200">{posY}%</span>
              </div>
              <input max="45" min="2" type="range" value={posY} onChange={(event) => setPosY(Number(event.target.value))} className="p-0 accent-cyan-300" />
            </div>
            <div className="grid min-h-18 content-center gap-2 rounded-lg border border-white/10 bg-[#050810]/65 p-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Độ mờ nền</label>
                <span className="font-mono text-xs text-cyan-200">{Math.round(opacity * 100)}%</span>
              </div>
              <input max="1" min="0" step="0.05" type="range" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="p-0 accent-cyan-300" />
            </div>
          </div>

          <details className="subtitle-customization group rounded-lg border border-white/10 bg-[#050810]/65 p-2.5" ref={subtitleCustomizationRef}>
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Tùy chỉnh
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor }} />
                <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: textColor }} />
              </span>
            </summary>
            <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-bold text-slate-400">Cỡ chữ</label>
                  <span className="font-mono text-xs text-cyan-200">{fontSize}px</span>
                </div>
                <input className="p-0 accent-cyan-300" max="72" min="12" type="range" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
              </div>
              <div className="grid gap-2">
                <label className="text-[11px] font-bold text-slate-400">Kiểu chữ</label>
                <select className="rounded-lg border-white/10 bg-[#050810] text-xs text-slate-100" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                  {subtitleFonts.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-bold text-slate-400">Màu nền</label>
                  <input className="h-8 w-12 cursor-pointer rounded border-white/10 bg-transparent p-0.5" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subtitleColorPresets.map((color) => (
                    <button aria-label={`Chọn màu nền ${color}`} className="h-6 w-6 rounded-full border border-white/20 transition hover:scale-110" key={`preview-background-${color}`} onClick={() => setBackgroundColor(color)} style={{ backgroundColor: color }} type="button" />
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-bold text-slate-400">Màu chữ</label>
                  <input className="h-8 w-12 cursor-pointer rounded border-white/10 bg-transparent p-0.5" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subtitleColorPresets.map((color) => (
                    <button aria-label={`Chọn màu chữ ${color}`} className="h-6 w-6 rounded-full border border-white/20 transition hover:scale-110" key={`preview-text-${color}`} onClick={() => setTextColor(color)} style={{ backgroundColor: color }} type="button" />
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="grid gap-2 p-2.5 text-left sm:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Job hiện tại</p>
          <p className="mt-1 truncate font-mono text-xs text-slate-300">{currentJobId || "Chưa có"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Phân đoạn</p>
          <p className="mt-1 text-sm font-bold text-white">{subtitlesCount} đoạn phụ đề</p>
        </div>
        <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Đầu ra</p>
          <p className="mt-1 text-sm font-bold text-white">{currentOutput}</p>
        </div>
      </div>
    </div>
  );
}
