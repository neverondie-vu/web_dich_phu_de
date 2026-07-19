import { apiFetch } from "../../lib/api";
import { fileExtension } from "../../utils/workspace";
import {
  buildUploadFormData,
  createVideoThumbnail,
  resetSelectedFile,
} from "./processing/fileSelection";
import { subtitlePositionPixels } from "./processing/jobHelpers";
import {
  exportSrtFile,
  saveSubtitlesToBackend,
  updateSubtitleText,
} from "./processing/subtitleActions";
import {
  startFinalStatusPolling,
  startTranscriptionStatusPolling,
} from "./processing/jobPolling";
import { burnCurrentVideo } from "./processing/burnVideo";
import { resumeSavedProcessingJob } from "./processing/resumeSavedJob";

export function useProcessingQueue({
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
  previewUrl,
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
  posY,
  previewVideoSize,
  previewToVideoFontSize,
}) {
  const currentSubtitlePositionY = () =>
    subtitlePositionPixels(posY, previewVideoSize);
  const currentSubtitlePositionPercent = () => posY;
  const currentSubtitleFontSize = () =>
    previewToVideoFontSize ? previewToVideoFontSize(fontSize) : fontSize;

  const clearSelectedFile = () =>
    resetSelectedFile({
      fileInputRef,
      setSelectedFile,
      setThumbnailUrl,
      thumbnailUrl,
    });

  function switchMediaMode(nextMode) {
    if (nextMode === mediaMode) return;
    setMediaMode(nextMode);
    clearSelectedFile();
    setMessage(nextMode === "video" ? "Chế độ video: tạo SRT và có thể ép phụ đề vào MP4." : "Chế độ audio: tạo phụ đề SRT từ MP3, WAV hoặc M4A.");
  }

  function updateQueueItem(id, patch) {
    setQueueItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      clearSelectedFile();
      return;
    }

    const extension = fileExtension(file.name);
    if (!profile.extensions.includes(extension)) {
      clearSelectedFile();
      showToast("Định dạng tệp chưa được hỗ trợ", `${profile.label} chỉ chấp nhận: ${profile.extensions.join(", ")}.`, "error");
      return;
    }

    setSelectedFile(file);
    if (mediaMode === "video") createVideoThumbnail({ file, setThumbnailUrl, thumbnailUrl });
    else setThumbnailUrl("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      showToast("Chưa có tệp đầu vào", `Vui lòng chọn một tệp ${profile.label.toLowerCase()} trước khi xử lý.`, "error");
      return;
    }

    const fakeId = `queue_${Date.now()}`;
    const task = {
      id: fakeId,
      filename: selectedFile.name,
      formData: buildUploadFormData({
        file: selectedFile,
        mediaMode,
        opacity,
        sourceLanguage,
        subtitlePositionY: currentSubtitlePositionY(),
        user,
      }),
      file: selectedFile,
      mediaType: mediaMode,
      endpoint: profile.endpoint,
    };

    queueRef.current.push(task);
    setQueueItems((items) => [{ id: fakeId, filename: selectedFile.name, status: "waiting", mediaType: mediaMode }, ...items]);
    showToast("Đã thêm vào hàng đợi", `${selectedFile.name} sẽ được xử lý theo chế độ ${profile.label}.`, "success");

    formRef.current?.reset();
    clearSelectedFile();

    if (!busyRef.current) processNextInQueue();
  }

  async function processNextInQueue() {
    if (busyRef.current) return;

    const task = queueRef.current.shift();
    if (!task) {
      setMessage("Hệ thống đang rảnh. Bạn có thể tải tệp mới lên.");
      return;
    }

    busyRef.current = true;
    activeTaskRef.current = task;
    setCurrentMediaType(task.mediaType);
    setFinalVideoUrl("");
    setDubbedVideoUrl("");
    setSrtUrl("");
    setWaitingForUserAction(false);
    setLoading(true);
    setPreviewUrl("");
    setSubtitles([]);
    setTtsAudioUrl("");
    setTtsModeLabel("");
    setCurrentJobId("");
    setActivePanel("subtitles");
    setMessage(`Đang tải và phân tích ${task.mediaType === "audio" ? "audio" : "video"}: ${task.filename}`);
    updateQueueItem(task.id, { status: "processing" });

    try {
      const data = await apiFetch(task.endpoint, { method: "POST", body: task.formData });

      if (!data.job_id) throw new Error("Backend không trả về mã job xử lý.");

      setCurrentJobId(data.job_id);
      updateQueueItem(task.id, { id: data.job_id, status: "processing" });
      activeTaskRef.current = { ...task, id: data.job_id };
      saveActiveJob({
        jobId: data.job_id,
        filename: task.filename,
        mediaType: task.mediaType,
        stage: "transcribing",
      });
      await loadHistory();
      checkTranscriptionStatus(data.job_id);
    } catch (error) {
      updateQueueItem(task.id, { status: "failed" });
      setLoading(false);
      setMessage(error.message || "Không thể tải tệp lên hệ thống.");
      showToast("Upload thất bại", error.message || "Vui lòng kiểm tra lại tệp và kết nối backend.", "error");
      busyRef.current = false;
      await loadHistory();
      processNextInQueue();
    }
  }

  async function resumeSavedJob() {
    await resumeSavedProcessingJob({
      activeTaskRef,
      busyRef,
      checkFinalStatus,
      checkTranscriptionStatus,
      clearActiveJob,
      pollRef,
      readActiveJob,
      saveActiveJob,
      setActivePanel,
      setCurrentJobId,
      setCurrentMediaType,
      setDubbedVideoUrl,
      setFinalVideoUrl,
      setLoading,
      setMessage,
      setPreviewUrl,
      setQueueItems,
      setSrtUrl,
      setSubtitles,
      setWaitingForUserAction,
    });
  }


  function checkTranscriptionStatus(jobId) {
    startTranscriptionStatusPolling(jobId, {
      activeTaskRef,
      busyRef,
      clearActiveJob,
      loadHistory,
      pollRef,
      previewUrl,
      processNextInQueue,
      saveActiveJob,
      setLoading,
      setMessage,
      setPreviewUrl,
      setSrtUrl,
      setSubtitles,
      setWaitingForUserAction,
      showToast,
      statusLabel,
      updateQueueItem,
    });
  }


  function updateSubtitle(index, value) {
    updateSubtitleText(setSubtitles, index, value);
  }

  function exportSrt() {
    exportSrtFile({ currentJobId, showToast, subtitles });
  }

  async function saveSubtitles() {
    await saveSubtitlesToBackend({ currentJobId, loadHistory, subtitlesRef });
  }

  async function burnVideo() {
    await burnCurrentVideo({
      activeTaskRef,
      backgroundColor,
      checkFinalStatus,
      currentJobId,
      currentMediaType,
      currentSubtitlePositionPercent,
      currentSubtitlePositionY,
      currentSubtitleFontSize,
      fontFamily,
      fontSize,
      loadHistory,
      opacity,
      reduceOriginalVoice,
      saveActiveJob,
      saveSubtitles,
      setLoading,
      setMessage,
      setWaitingForUserAction,
      showToast,
      subtitles,
      subtitlesRef,
      textColor,
      ttsLanguage,
      ttsVoice,
    });
  }


  function checkFinalStatus(jobId) {
    startFinalStatusPolling(jobId, {
      activeTaskRef,
      busyRef,
      clearActiveJob,
      currentMediaType,
      loadHistory,
      pollRef,
      processNextInQueue,
      saveActiveJob,
      setDubbedVideoUrl,
      setFinalVideoUrl,
      setLoading,
      setMessage,
      setPreviewUrl,
      showToast,
      statusLabel,
    });
  }


  async function continueQueue() {
    setWaitingForUserAction(false);
    busyRef.current = false;
    showToast("Tiếp tục hàng đợi", "Hệ thống sẽ chuyển sang tệp tiếp theo nếu còn trong hàng đợi.", "info");
    await loadHistory();
    processNextInQueue();
  }

  return {
    burnVideo,
    continueQueue,
    exportSrt,
    handleFileChange,
    handleSubmit,
    resumeSavedJob,
    saveSubtitles,
    switchMediaMode,
    updateSubtitle,
  };
}
