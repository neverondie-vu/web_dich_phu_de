import { apiFetch, makeBackendUrl } from "../../../lib/api";
import { normalizeSubtitle } from "../../../utils/workspace";
import { makeFreshBackendUrl } from "./jobHelpers";

export function startTranscriptionStatusPolling(jobId, context) {
  const {
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
  } = context;
    if (pollRef.current) window.clearInterval(pollRef.current);

    pollRef.current = window.setInterval(async () => {
      try {
        const data = await apiFetch(`/api/status/${jobId}`);
        const mediaType = data.media_type || activeTaskRef.current?.mediaType || "video";
        setMessage(`Trạng thái xử lý: ${statusLabel(data.status)[0]}`);

        if (data.status === "transcribed" || data.status === "completed") {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
          updateQueueItem(jobId, { status: "completed" });
          setLoading(false);
          setSrtUrl(makeBackendUrl(`/api/download_srt/${jobId}`));

          const activeFile = activeTaskRef.current?.file;
          if (activeFile) {
            if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(activeFile));
          }

          if (Array.isArray(data.subtitles)) setSubtitles(data.subtitles.map(normalizeSubtitle));
          await loadHistory();

          if (mediaType === "audio") {
            saveActiveJob({ jobId, filename: data.filename || activeTaskRef.current?.filename, mediaType, stage: "completed", status: data.status });
            setMessage("Đã tạo phụ đề SRT từ audio. Bạn có thể chỉnh sửa và xuất SRT.");
            showToast("Audio đã xử lý xong", "Phụ đề đã sẵn sàng để chỉnh sửa hoặc tải xuống.", "success");
            busyRef.current = false;
            processNextInQueue();
          } else {
            setWaitingForUserAction(true);
            saveActiveJob({ jobId, filename: data.filename || activeTaskRef.current?.filename, mediaType, stage: "review", status: data.status });
            setMessage("Đã tạo phụ đề. Hãy rà soát, xuất SRT hoặc ép phụ đề vào video.");
            showToast("Video đã có phụ đề", "Kiểm tra nội dung trước khi xuất SRT hoặc render MP4.", "success");
          }
        }

        if (data.status === "failed") {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
          updateQueueItem(jobId, { status: "failed" });
          setLoading(false);
          setMessage("Quá trình xử lý thất bại. Vui lòng thử lại với tệp khác.");
          showToast("Xử lý thất bại", "Backend trả về trạng thái lỗi cho job hiện tại.", "error");
          busyRef.current = false;
          clearActiveJob();
          await loadHistory();
          processNextInQueue();
        }
      } catch (error) {
        setMessage(error.message || "Không thể cập nhật trạng thái xử lý.");
      }
    }, 3000);
}

export function startFinalStatusPolling(jobId, context) {
  const {
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
  } = context;
    if (pollRef.current) window.clearInterval(pollRef.current);

    pollRef.current = window.setInterval(async () => {
      try {
        const data = await apiFetch(`/api/status/${jobId}`);
        setMessage(`Trạng thái render: ${statusLabel(data.status)[0]}`);

        if (data.status === "completed") {
          window.clearInterval(pollRef.current);
          pollRef.current = null;

          const hardsubUrl = makeFreshBackendUrl(`/api/download/${jobId}`);
          const dubbedUrl = data.has_dubbed ? makeFreshBackendUrl(`/api/download_dubbed/${jobId}`) : "";
          setPreviewUrl(hardsubUrl);
          setFinalVideoUrl(hardsubUrl);
          setDubbedVideoUrl(dubbedUrl);
          setLoading(false);
          setMessage("Video đã được ép phụ đề thành công.");
          showToast("Video đã hoàn thành", "Bạn có thể xem trước hoặc tải video MP4 đã có phụ đề.", "success");
          saveActiveJob({ jobId, filename: data.filename || activeTaskRef.current?.filename, mediaType: data.media_type || currentMediaType, stage: "completed", status: data.status });
          busyRef.current = false;
          await loadHistory();
          processNextInQueue();
        }

        if (data.status === "failed") {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
          setLoading(false);
          setMessage("Render video thất bại.");
          showToast("Render video thất bại", "Backend không tạo được video đầu ra.", "error");
          busyRef.current = false;
          clearActiveJob();
          await loadHistory();
          processNextInQueue();
        }
      } catch (error) {
        setMessage(error.message || "Không thể cập nhật trạng thái render.");
      }
    }, 3000);
}
