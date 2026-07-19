import { apiFetch, makeBackendUrl } from "../../../lib/api";
import { normalizeSubtitle } from "../../../utils/workspace";
import { makeFreshBackendUrl } from "./jobHelpers";

export async function resumeSavedProcessingJob(context) {
  const {
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
  } = context;
    const savedJob = readActiveJob();
    if (!savedJob?.jobId || pollRef.current || busyRef.current) return;

    try {
      const data = await apiFetch(`/api/status/${savedJob.jobId}`);
      const mediaType = data.media_type || savedJob.mediaType || "video";
      const filename = data.filename || savedJob.filename || "Đang xử lý";

      activeTaskRef.current = { id: savedJob.jobId, filename, mediaType };
      busyRef.current = data.status === "processing" || data.status === "burning";
      setCurrentJobId(savedJob.jobId);
      setCurrentMediaType(mediaType);
      setFinalVideoUrl("");
      setDubbedVideoUrl("");
      setSrtUrl(makeBackendUrl(`/api/download_srt/${savedJob.jobId}`));
      setActivePanel("subtitles");
      setQueueItems((items) => (
        items.some((item) => item.id === savedJob.jobId)
          ? items
          : [{ id: savedJob.jobId, filename, status: data.status, mediaType }, ...items]
      ));

      if (Array.isArray(data.subtitles)) setSubtitles(data.subtitles.map(normalizeSubtitle));

      if (mediaType === "video") {
        setPreviewUrl(makeBackendUrl(`/api/original/${savedJob.jobId}`));
      } else if (mediaType === "audio") {
        setPreviewUrl(makeBackendUrl(`/api/original/${savedJob.jobId}`));
      }

      if (data.status === "processing" || data.status === "queued" || data.status === "waiting") {
        setLoading(true);
        setWaitingForUserAction(false);
        setMessage(`Đang tiếp tục theo dõi job: ${filename}`);
        saveActiveJob({ ...savedJob, stage: "transcribing", status: data.status });
        checkTranscriptionStatus(savedJob.jobId);
        return;
      }

      if (data.status === "transcribed") {
        busyRef.current = true;
        setLoading(false);
        setWaitingForUserAction(mediaType === "video");
        setMessage("Đã khôi phục job đã tạo phụ đề. Bạn có thể rà soát, xuất SRT hoặc ép video.");
        saveActiveJob({ ...savedJob, stage: "review", status: data.status });
        return;
      }

      if (data.status === "burning") {
        setLoading(true);
        setWaitingForUserAction(false);
        setMessage("Đang tiếp tục theo dõi render video...");
        saveActiveJob({ ...savedJob, stage: "burning", status: data.status });
        checkFinalStatus(savedJob.jobId);
        return;
      }

      if (data.status === "completed") {
        setLoading(false);
        setWaitingForUserAction(false);
        if (data.has_hardsub) {
          const hardsubUrl = makeFreshBackendUrl(`/api/download/${savedJob.jobId}`);
          setPreviewUrl(hardsubUrl);
          setFinalVideoUrl(hardsubUrl);
          setDubbedVideoUrl(data.has_dubbed ? makeFreshBackendUrl(`/api/download_dubbed/${savedJob.jobId}`) : "");
          setMessage("Đã khôi phục dự án đã render xong.");
          saveActiveJob({ ...savedJob, stage: "completed", status: data.status });
        } else {
          setMessage("Đã khôi phục job đã xử lý xong phụ đề.");
        }
        return;
      }

      if (data.status === "failed") {
        setLoading(false);
        setWaitingForUserAction(false);
        setMessage("Job trước đó đã thất bại. Bạn có thể tải tệp mới để xử lý lại.");
        clearActiveJob();
      }
    } catch {
      clearActiveJob();
    }
}
