import { ttsLanguages, ttsVoices } from "../../constants/workspace";

export function TTSPanel({
  createSubtitleVoice,
  reduceOriginalVoice,
  setReduceOriginalVoice,
  setTtsLanguage,
  setTtsVoice,
  ttsAudioUrl,
  ttsLanguage,
  ttsLoading,
  ttsModeLabel,
  ttsVoice,
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/8 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-black uppercase leading-none tracking-[0.12em] text-cyan-200">Tạo giọng đọc</p>
        </div>
        <button className="shrink-0 rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-bold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60" disabled={ttsLoading} onClick={() => createSubtitleVoice("full")} type="button">
          {ttsLoading ? "Đang tạo..." : "Tạo toàn bộ"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Ngôn ngữ
          <select className="rounded-lg border-white/10 bg-[#050810] text-xs normal-case tracking-normal text-slate-100" value={ttsLanguage} onChange={(event) => setTtsLanguage(event.target.value)}>
            {ttsLanguages.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Giọng gốc
          <select className="rounded-lg border-white/10 bg-[#050810] text-xs normal-case tracking-normal text-slate-100" value={ttsVoice} onChange={(event) => setTtsVoice(event.target.value)}>
            {ttsVoices.map((voice) => (
              <option key={voice.value} value={voice.value}>{voice.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#050810]/55 px-3 py-2 text-sm font-bold leading-5 text-cyan-100">
        <input className="tts-reduce-checkbox h-4 w-4 shrink-0 accent-cyan-300" type="checkbox" checked={reduceOriginalVoice} onChange={(event) => setReduceOriginalVoice(event.target.checked)} />
        <span className="block min-w-0 max-w-full break-words text-center">Giảm lời gốc, giữ nhạc nền thử nghiệm</span>
      </label>
      {ttsAudioUrl && (
        <div className="grid gap-2 rounded-lg border border-white/10 bg-[#050810]/70 p-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300">{ttsModeLabel || "Audio mới nhất"}</span>
            <a className="text-xs font-bold text-cyan-200 hover:text-white" download href={ttsAudioUrl} target="_blank">Tải audio</a>
          </div>
          <audio className="w-full" controls src={ttsAudioUrl} />
        </div>
      )}
    </div>
  );
}
