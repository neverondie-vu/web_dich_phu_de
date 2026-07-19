"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { languages } from "../constants/workspace";
import { useActiveJob } from "../hooks/workspace/useActiveJob";
import { useAuthGuard } from "../hooks/workspace/useAuthGuard";
import { useHistoryArchive } from "../hooks/workspace/useHistoryArchive";
import { useProcessingQueue } from "../hooks/workspace/useProcessingQueue";
import { useTTS } from "../hooks/workspace/useTTS";
import { useVideoPreview } from "../hooks/workspace/useVideoPreview";
import { apiFetch } from "../lib/api";
import { subtitleTimeToSeconds } from "../utils/workspace";
import { PreviewPanel } from "./workspace/PreviewPanel";
import { SubtitleEditorPanel } from "./workspace/SubtitleEditorPanel";
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { ArchiveModal, ToastStack, WorkflowSteps, WorkspaceActionBar, mediaProfiles, statusLabel } from "./workspace/WorkspacePanels";
import { WorkspaceSidebar } from "./workspace/WorkspaceSidebar";

export default function SubtitleWorkspace() {
  const router = useRouter();
  const { authChecked, handleLogout: signOutUser, user } = useAuthGuard(router);
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const activeTaskRef = useRef(null);
  const subtitlesRef = useRef([]);
  const pollRef = useRef(null);
  const profileMenuRef = useRef(null);
  const previewFrameRef = useRef(null);
  const subtitleCustomizationRef = useRef(null);
  const languageMenuRef = useRef(null);

  const [mediaMode, setMediaMode] = useState("video");
  const [currentMediaType, setCurrentMediaType] = useState("video");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [posY, setPosY] = useState(20);
  const [opacity, setOpacity] = useState(0.8);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [queueItems, setQueueItems] = useState([]);
  const [currentJobId, setCurrentJobId] = useState("");
  const [subtitles, setSubtitles] = useState([]);
  const [message, setMessage] = useState("Sẵn sàng nhận tệp mới.");
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState("subtitles");
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState("");
  const [srtUrl, setSrtUrl] = useState("");
  const [waitingForUserAction, setWaitingForUserAction] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const profile = mediaProfiles[mediaMode];
  const { clearActiveJob, readActiveJob, saveActiveJob } = useActiveJob(user);
  const { archive, archiveMessage, archiveOpen, deleteArchivedJob, history, historyMessage, loadHistory, openArchiveModal, setArchiveOpen } = useHistoryArchive(user);
  const {
    openPreviewFullscreen,
    previewCurrentTime,
    previewExpanded,
    previewVideoSize,
    previewVideoBoxStyle,
    previewToVideoFontSize,
    setPreviewCurrentTime,
    setPreviewVideoSize,
  } = useVideoPreview(previewFrameRef, previewUrl);
  const {
    createSubtitleVoice,
    reduceOriginalVoice,
    setReduceOriginalVoice,
    setTtsAudioUrl,
    setTtsLanguage,
    setTtsModeLabel,
    setTtsVoice,
    ttsAudioUrl,
    ttsLanguage,
    ttsLoading,
    ttsModeLabel,
    ttsVoice,
  } = useTTS({
    currentJobId,
    loadHistory,
    saveSubtitles,
    setMessage,
    showToast,
    subtitlesRef,
  });
  const {
    burnVideo,
    continueQueue,
    exportSrt,
    handleFileChange,
    handleSubmit,
    resumeSavedJob,
    switchMediaMode,
    updateSubtitle,
  } = useProcessingQueue({
    activeTaskRef,
    backgroundColor,
    busyRef,
    clearActiveJob,
    currentJobId,
    currentMediaType,
    fileInputRef,
    finalVideoUrl,
    fontFamily,
    fontSize,
    formRef,
    loadHistory,
    mediaMode,
    opacity,
    pollRef,
    posY,
    previewUrl,
    previewVideoSize,
    previewToVideoFontSize,
    profile,
    queueRef,
    readActiveJob,
    reduceOriginalVoice,
    saveActiveJob,
    selectedFile,
    setActivePanel,
    setCurrentJobId,
    setCurrentMediaType,
    setDubbedVideoUrl,
    setFinalVideoUrl,
    setLoading,
    setMediaMode,
    setMessage,
    setPreviewUrl,
    setQueueItems,
    setSelectedFile,
    setSrtUrl,
    setSubtitles,
    setThumbnailUrl,
    setTtsAudioUrl,
    setTtsModeLabel,
    setWaitingForUserAction,
    showToast,
    sourceLanguage,
    statusLabel,
    subtitles,
    subtitlesRef,
    textColor,
    thumbnailUrl,
    ttsLanguage,
    ttsVoice,
    user,
  });

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    function closeProfileMenu(event) {
      if (event.key === "Escape") setProfileMenuOpen(false);
      if (event.type === "mousedown" && !profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeProfileMenu);
    document.addEventListener("keydown", closeProfileMenu);
    return () => {
      document.removeEventListener("mousedown", closeProfileMenu);
      document.removeEventListener("keydown", closeProfileMenu);
    };
  }, []);

  useEffect(() => {
    function closeSubtitleCustomization(event) {
      const details = subtitleCustomizationRef.current;
      if (!details?.open) return;
      if (event.key === "Escape" || (event.type === "mousedown" && !details.contains(event.target))) {
        details.open = false;
      }
    }

    document.addEventListener("mousedown", closeSubtitleCustomization);
    document.addEventListener("keydown", closeSubtitleCustomization);
    return () => {
      document.removeEventListener("mousedown", closeSubtitleCustomization);
      document.removeEventListener("keydown", closeSubtitleCustomization);
    };
  }, []);

  useEffect(() => {
    function closeLanguageMenu(event) {
      if (event.key === "Escape") setLanguageMenuOpen(false);
      if (event.type === "mousedown" && !languageMenuRef.current?.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeLanguageMenu);
    document.addEventListener("keydown", closeLanguageMenu);
    return () => {
      document.removeEventListener("mousedown", closeLanguageMenu);
      document.removeEventListener("keydown", closeLanguageMenu);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    loadHistory();
    resumeSavedJob();
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, thumbnailUrl]);

  function showToast(title, body = "", type = "info") {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, title, body, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4200);
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
    await signOutUser();
  }
  async function saveSubtitles() {
    if (!currentJobId || subtitlesRef.current.length === 0) return;

    await apiFetch(`/api/subtitles/${currentJobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitles: subtitlesRef.current }),
    });
    await loadHistory();
  }


  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0c1433] text-slate-200">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Đang kiểm tra phiên đăng nhập...</p>
      </main>
    );
  }

  const currentStatus = loading ? "Đang xử lý" : finalVideoUrl ? "Hoàn thành" : subtitles.length ? "Chờ xác nhận" : "Sẵn sàng";
  const currentFileName = activeTaskRef.current?.filename || selectedFile?.name || "Chưa chọn tệp";
  const currentOutput = finalVideoUrl ? "MP4 hardsub" : ttsAudioUrl ? "Audio lồng tiếng" : srtUrl ? "SRT sẵn sàng" : "Chưa có đầu ra";
  const activeStepIndex = finalVideoUrl ? 3 : subtitles.length ? 2 : loading ? 1 : selectedFile || currentJobId ? 0 : -1;
  const previewSubtitle =
    subtitles.find(
      (subtitle) =>
        previewCurrentTime >= subtitleTimeToSeconds(subtitle.start) &&
        previewCurrentTime <= subtitleTimeToSeconds(subtitle.end),
    ) || subtitles[0];
  const hasEditableVideoPreview = currentMediaType === "video" && Boolean(previewUrl) && !finalVideoUrl && !loading;
  const workflowSteps = [
    ["01", "Tải tệp", selectedFile || currentJobId ? "Đã nhận đầu vào" : "Chờ tệp mới"],
    ["02", "Nhận diện", loading ? "AI đang chạy" : subtitles.length ? "Đã tạo phụ đề" : "Sẵn sàng"],
    ["03", "Rà soát", subtitles.length ? `${subtitles.length} đoạn phụ đề` : "Chưa có nội dung"],
    ["04", "Xuất bản", currentOutput],
  ];
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const selectedLanguage = languages.find(([value]) => value === sourceLanguage) || languages[0];

  return (
    <div
      className="workspace-shell min-h-screen overflow-hidden text-slate-100 selection:bg-cyan-500/30"
      style={{
        background:
          "linear-gradient(180deg, #101827 0%, #0b1220 48%, #070b13 100%)",
      }}
    >
      <ToastStack toasts={toasts} />

      <WorkspaceHeader
        displayName={displayName}
        initial={initial}
        onCloseProfileMenu={() => setProfileMenuOpen(false)}
        onLogout={handleLogout}
        onOpenArchive={openArchiveModal}
        onOpenHistory={() => setActivePanel("history")}
        onToggleProfileMenu={() => setProfileMenuOpen((open) => !open)}
        profileMenuOpen={profileMenuOpen}
        profileMenuRef={profileMenuRef}
        user={user}
      />

      <main className="grid h-[calc(100vh-56px)] grid-cols-1 overflow-hidden p-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        <WorkspaceSidebar
          currentMediaType={currentMediaType}
          fileInputRef={fileInputRef}
          formRef={formRef}
          languageMenuOpen={languageMenuOpen}
          languageMenuRef={languageMenuRef}
          languages={languages}
          mediaMode={mediaMode}
          onFileChange={handleFileChange}
          onLanguageMenuToggle={() => setLanguageMenuOpen((open) => !open)}
          onLanguageSelect={(value) => {
            setSourceLanguage(value);
            setLanguageMenuOpen(false);
          }}
          onMediaModeChange={switchMediaMode}
          onSubmit={handleSubmit}
          profile={profile}
          queueItems={queueItems}
          selectedFile={selectedFile}
          selectedLanguage={selectedLanguage}
          sourceLanguage={sourceLanguage}
          subtitlesCount={subtitles.length}
          thumbnailUrl={thumbnailUrl}
        />

        <section className="custom-scrollbar min-h-0 overflow-y-auto rounded-lg bg-[#0a101b]/55 p-3">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <WorkspaceActionBar
              currentFileName={currentFileName}
              currentMediaType={currentMediaType}
              currentStatus={currentStatus}
              finalVideoUrl={finalVideoUrl}
              loading={loading}
              message={message}
              onBurnVideo={burnVideo}
              onContinueQueue={continueQueue}
              onExportSrt={exportSrt}
              subtitlesCount={subtitles.length}
              waitingForUserAction={waitingForUserAction}
            />

            <WorkflowSteps activeStepIndex={activeStepIndex} steps={workflowSteps} />

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="flex min-w-0 flex-col gap-3">
                <PreviewPanel
                  backgroundColor={backgroundColor}
                  currentJobId={currentJobId}
                  currentMediaType={currentMediaType}
                  currentOutput={currentOutput}
                  finalVideoUrl={finalVideoUrl}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  hasEditableVideoPreview={hasEditableVideoPreview}
                  loading={loading}
                  onOpenPreviewFullscreen={openPreviewFullscreen}
                  opacity={opacity}
                  posY={posY}
                  previewExpanded={previewExpanded}
                  previewFrameRef={previewFrameRef}
                  previewSubtitle={previewSubtitle}
                  previewUrl={previewUrl}
                  previewVideoBoxStyle={previewVideoBoxStyle}
                  setBackgroundColor={setBackgroundColor}
                  setFontFamily={setFontFamily}
                  setFontSize={setFontSize}
                  setOpacity={setOpacity}
                  setPosY={setPosY}
                  setPreviewCurrentTime={setPreviewCurrentTime}
                  setPreviewVideoSize={setPreviewVideoSize}
                  setTextColor={setTextColor}
                  subtitleCustomizationRef={subtitleCustomizationRef}
                  subtitlesCount={subtitles.length}
                  textColor={textColor}
                />
              </div>

              <SubtitleEditorPanel
                activePanel={activePanel}
                createSubtitleVoice={createSubtitleVoice}
                currentJobId={currentJobId}
                dubbedVideoUrl={dubbedVideoUrl}
                finalVideoUrl={finalVideoUrl}
                history={history}
                historyMessage={historyMessage}
                loadHistory={loadHistory}
                reduceOriginalVoice={reduceOriginalVoice}
                setReduceOriginalVoice={setReduceOriginalVoice}
                setTtsLanguage={setTtsLanguage}
                setTtsVoice={setTtsVoice}
                srtUrl={srtUrl}
                subtitles={subtitles}
                ttsAudioUrl={ttsAudioUrl}
                ttsLanguage={ttsLanguage}
                ttsLoading={ttsLoading}
                ttsModeLabel={ttsModeLabel}
                ttsVoice={ttsVoice}
                updateSubtitle={updateSubtitle}
              />
            </div>
          </div>
        </section>
      </main>

      {archiveOpen && <ArchiveModal archive={archive} archiveMessage={archiveMessage} onClose={() => setArchiveOpen(false)} onDelete={deleteArchivedJob} />}
    </div>
  );
}
