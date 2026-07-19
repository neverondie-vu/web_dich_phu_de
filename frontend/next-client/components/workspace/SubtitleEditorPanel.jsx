import { makeBackendUrl } from "../../lib/api";
import { HistoryList, Icon } from "./WorkspacePanels";
import { TTSPanel } from "./TTSPanel";

export function SubtitleEditorPanel({
  activePanel,
  createSubtitleVoice,
  currentJobId,
  dubbedVideoUrl,
  finalVideoUrl,
  history,
  historyMessage,
  loadHistory,
  reduceOriginalVoice,
  setReduceOriginalVoice,
  setTtsLanguage,
  setTtsVoice,
  srtUrl,
  subtitles,
  ttsAudioUrl,
  ttsLanguage,
  ttsLoading,
  ttsModeLabel,
  ttsVoice,
  updateSubtitle,
}) {
  return (
    <div className="flex min-h-97.5 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0f172a]/92 shadow-2xl shadow-black/35 backdrop-blur-xl lg:min-h-0">
      {activePanel === "history" ? (
        <HistoryList history={history} message={historyMessage} onRefresh={loadHistory} />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-white/10 bg-[#050810]/72 p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Biên tập phụ đề</p>
              <p className="mt-1 text-xs text-slate-500">Rà soát từng đoạn trước khi xuất hoặc render.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-slate-300">
              {finalVideoUrl ? "Xong" : subtitles.length}
            </span>
          </div>

          <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-3">
            {finalVideoUrl ? (
              <div className="grid justify-items-start gap-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-6 text-left">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-400/20 text-emerald-200">
                  <Icon name="check" className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-black text-white">Dự án hoàn tất</h3>
                  <p className="mt-1 text-sm text-slate-400">Video đã được ép phụ đề. Bạn có thể tải phụ đề, bản lồng tiếng hoặc bản chỉ có phụ đề.</p>
                </div>
                <div className="grid w-full gap-3 pt-2">
                  <a className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-teal-600 via-cyan-600 to-emerald-600 px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-200/20 hover:brightness-110" download href={srtUrl || makeBackendUrl(`/api/download_srt/${currentJobId}`)} target="_blank">
                    <Icon name="download" className="h-4 w-4" />
                    Tải SRT
                  </a>
                  {dubbedVideoUrl ? (
                    <a className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-teal-600 via-cyan-600 to-emerald-600 px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-200/20 hover:brightness-110" download href={dubbedVideoUrl} target="_blank">
                      <Icon name="download" className="h-4 w-4" />
                      Tải video có lồng tiếng
                    </a>
                  ) : (
                    <button className="cursor-not-allowed rounded-lg bg-slate-700/70 px-4 py-3.5 text-center text-sm font-black text-slate-400" disabled type="button">
                      Video lồng tiếng chưa sẵn sàng
                    </button>
                  )}
                  <a className="flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-teal-600 via-cyan-600 to-emerald-600 px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-200/20 hover:brightness-110" download href={finalVideoUrl} target="_blank">
                    <Icon name="download" className="h-4 w-4" />
                    Tải video không lồng tiếng
                  </a>
                </div>
              </div>
            ) : subtitles.length === 0 ? (
              <div className="grid h-full min-h-75 place-items-center rounded-lg border border-dashed border-white/10 bg-[#050810]/45 p-6 text-center text-slate-500">
                <div className="grid max-w-xs justify-items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035]">
                    <Icon name="subtitle" className="h-7 w-7" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Chưa có phụ đề</p>
                  <p className="text-sm leading-6">Sau khi AI xử lý xong, từng câu phụ đề sẽ xuất hiện ở đây để chỉnh sửa nhanh.</p>
                </div>
              </div>
            ) : (
              <>
                {srtUrl && (
                  <a className="flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15" href={srtUrl} target="_blank">
                    <Icon name="download" className="h-4 w-4" />
                    Tải SRT từ máy chủ
                  </a>
                )}
                <TTSPanel
                  createSubtitleVoice={createSubtitleVoice}
                  reduceOriginalVoice={reduceOriginalVoice}
                  setReduceOriginalVoice={setReduceOriginalVoice}
                  setTtsLanguage={setTtsLanguage}
                  setTtsVoice={setTtsVoice}
                  ttsAudioUrl={ttsAudioUrl}
                  ttsLanguage={ttsLanguage}
                  ttsLoading={ttsLoading}
                  ttsModeLabel={ttsModeLabel}
                  ttsVoice={ttsVoice}
                />
                {subtitles.map((sub, index) => (
                  <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2.5 transition hover:border-cyan-300/25 hover:bg-white/5.5" key={`${sub.start}-${index}`}>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className="rounded-md border border-white/10 bg-[#050810] px-2 py-1 font-mono text-[11px] text-cyan-200">
                        {sub.start} - {sub.end}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="rounded-full border border-cyan-300/20 px-2 py-0.5 text-[10px] font-bold leading-4 text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50" disabled={ttsLoading} onClick={() => createSubtitleVoice("segment", index)} type="button">
                          Nghe đoạn
                        </button>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-slate-500">#{index + 1}</span>
                      </div>
                    </div>
                    <textarea className="custom-scrollbar min-h-18 w-full resize-y rounded-lg border-white/10 bg-[#050810]/78 p-3 text-xs leading-5 text-slate-100 focus:border-cyan-300/60" value={sub.text} onChange={(event) => updateSubtitle(index, event.target.value)} />
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
