import { apiFetch } from "../../../lib/api";
import { resolveTtsVoicePreset } from "../../../utils/workspace";

export async function burnCurrentVideo(context) {
  const {
    activeTaskRef,
    backgroundColor,
    checkFinalStatus,
    currentJobId,
    currentMediaType,
    currentSubtitleFontSize,
    currentSubtitlePositionPercent,
    currentSubtitlePositionY,
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
  } = context;
    if (!currentJobId || subtitles.length === 0 || currentMediaType === "audio") return;

    setLoading(true);
    setWaitingForUserAction(false);
    setMessage("Đang lưu phụ đề và ép phụ đề cứng vào video...");
    saveActiveJob({
      jobId: currentJobId,
      filename: activeTaskRef.current?.filename,
      mediaType: currentMediaType,
      stage: "burning",
      status: "burning",
    });

    try {
      await saveSubtitles();
      const activeVoicePreset = resolveTtsVoicePreset(ttsVoice);
      const data = await apiFetch("/api/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId,
          subtitles: subtitlesRef.current,
          subtitle_position_y: currentSubtitlePositionY(),
          subtitle_position_percent: currentSubtitlePositionPercent(),
          background_opacity: opacity,
          background_color: backgroundColor,
          text_color: textColor,
          font_size: currentSubtitleFontSize ? currentSubtitleFontSize() : fontSize,
          font_family: fontFamily,
          tts_language: ttsLanguage,
          tts_voice: activeVoicePreset.voice,
          tts_speed: activeVoicePreset.speed,
          tts_pitch: activeVoicePreset.pitch,
          tts_volume: activeVoicePreset.volume,
          reduce_original_voice: reduceOriginalVoice,
        }),
      });

      await loadHistory();
      checkFinalStatus(data.job_id || currentJobId);
    } catch (error) {
      setLoading(false);
      setWaitingForUserAction(true);
      setMessage(error.message || "Không thể ép phụ đề vào video.");
      showToast("Ép video thất bại", error.message || "Vui lòng kiểm tra FFmpeg và thử lại.", "error");
    }
}
