import { Icon, QueueItem, mediaProfiles } from "./WorkspacePanels";

export function WorkspaceSidebar({
  currentMediaType,
  fileInputRef,
  formRef,
  languageMenuOpen,
  languageMenuRef,
  languages,
  mediaMode,
  onFileChange,
  onLanguageMenuToggle,
  onLanguageSelect,
  onMediaModeChange,
  onSubmit,
  profile,
  queueItems,
  selectedFile,
  selectedLanguage,
  sourceLanguage,
  subtitlesCount,
  thumbnailUrl,
}) {
  return (
    <aside className="custom-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-700/60 bg-[#0b1220]/96 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Thiết lập đầu vào</p>
        <h1 className="mt-1 text-lg font-black tracking-tight text-white">Xử lý phụ đề</h1>
        <p className="mt-1 text-xs leading-5 text-slate-400">Tải tệp, chọn ngôn ngữ nguồn và đưa job vào hàng đợi AI.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-white/10 bg-[#050810]/70 p-2">
            <p className="text-sm font-black text-white">{queueItems.length}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Queue</p>
          </div>
          <div className="rounded-md border border-white/10 bg-[#050810]/70 p-2">
            <p className="text-sm font-black text-white">{subtitlesCount}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Đoạn</p>
          </div>
          <div className="rounded-md border border-white/10 bg-[#050810]/70 p-2">
            <p className="text-sm font-black text-white">{currentMediaType === "audio" ? "SRT" : "MP4"}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Đầu ra</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-[#050810]/75 p-1">
        {Object.entries(mediaProfiles).map(([key, item]) => (
          <button
            className={`flex min-h-9 items-center justify-center gap-2 rounded-md text-xs font-black transition ${
              mediaMode === key ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
            key={key}
            onClick={() => onMediaModeChange(key)}
            type="button"
          >
            <Icon name={key === "audio" ? "audio" : "video"} className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      <form ref={formRef} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3" onSubmit={onSubmit}>
        <label className="group relative flex min-h-36.25 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-500/45 bg-[#0f172a]/85 p-4 text-center transition hover:border-cyan-300/55 hover:bg-[#111c2f]">
          <input ref={fileInputRef} accept={profile.accept} className="absolute inset-0 z-20 cursor-pointer opacity-0" required type="file" onChange={onFileChange} />

          {thumbnailUrl ? (
            <>
              <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
              <span className="absolute inset-0 bg-slate-950/45" />
            </>
          ) : null}

          <span className="relative z-10 grid w-full justify-items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/30">
                <Icon name="upload" className="h-4 w-4" />
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">{profile.extensions.join(" ")}</span>
            </span>
            <span>
              <span className="block max-w-67.5 truncate text-xs font-black text-white">{selectedFile?.name || profile.emptyText}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{profile.description}</span>
            </span>
          </span>
        </label>

        <div className="grid gap-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Ngôn ngữ nguồn</label>
          <div className="relative" ref={languageMenuRef}>
            <button
              aria-expanded={languageMenuOpen}
              aria-haspopup="listbox"
              className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#050810] px-3 py-2.5 text-left shadow-inner shadow-black/20 transition hover:border-cyan-300/35 hover:bg-[#081225] focus:border-cyan-300/45 focus:outline-none focus:ring-2 focus:ring-cyan-300/10"
              onClick={onLanguageMenuToggle}
              type="button"
            >
              <span className="grid h-7 w-8 shrink-0 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-[10px] font-black tracking-wide text-cyan-200">{selectedLanguage[2]}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">{selectedLanguage[1]}</span>
              <svg className={`h-3.5 w-3.5 text-slate-500 transition-transform ${languageMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </button>

            <div className={`absolute inset-x-0 top-full z-40 mt-1.5 origin-top overflow-hidden rounded-lg border border-white/10 bg-[#07111f]/98 p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-200 ${languageMenuOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0"}`} role="listbox">
              {languages.map(([value, label, code]) => (
                <button
                  aria-selected={sourceLanguage === value}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition ${sourceLanguage === value ? "bg-cyan-300/12 text-cyan-100" : "text-slate-300 hover:bg-white/6 hover:text-white"}`}
                  key={value}
                  onClick={() => onLanguageSelect(value)}
                  role="option"
                  type="button"
                >
                  <span className="grid h-6 w-8 place-items-center rounded border border-cyan-300/15 bg-cyan-300/8 text-[10px] font-black tracking-wide text-cyan-200">{code}</span>
                  <span className="flex-1 text-xs font-bold">{label}</span>
                  {sourceLanguage === value && <Icon name="check" className="h-3.5 w-3.5 text-cyan-200" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="studio-process-button group relative flex min-h-12 items-center justify-center gap-2.5 overflow-hidden rounded-lg px-4 py-3 text-sm font-black tracking-wide text-cyan-950 transition duration-300 hover:-translate-y-0.5 focus:-translate-y-0.5 focus:outline-none" type="submit">
          <span className="studio-process-shine" aria-hidden="true" />
          <Icon name="play" className="relative z-10 h-4.5 w-4.5 transition duration-300 group-hover:scale-110" />
          <span className="relative z-10">Bắt đầu xử lý</span>
        </button>
      </form>

      <div className="grid min-h-37.5 flex-1 gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Hàng đợi</p>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">{queueItems.length} job</span>
        </div>
        <div className="custom-scrollbar min-h-0 space-y-3 overflow-y-auto pr-1">
          {queueItems.length === 0 ? (
            <div className="grid min-h-20 content-center rounded-lg border border-dashed border-white/10 bg-[#050810]/55 p-4 text-left text-xs text-slate-500">
              Chưa có tệp trong hàng đợi
            </div>
          ) : (
            queueItems.map((item) => <QueueItem key={item.id} item={item} />)
          )}
        </div>
      </div>
    </aside>
  );
}
