import { useState } from "react";
import { apiFetch, makeBackendUrl } from "../../lib/api";
import { buildAutoSpeakerVoiceConfigs, normalizeSubtitle } from "../../utils/workspace";

export function useTTS({
  currentJobId,
  loadHistory,
  normalizeSubtitleItem = normalizeSubtitle,
  saveSubtitles,
  setMessage,
  showToast,
  subtitlesRef,
}) {
  const [ttsLanguage, setTtsLanguage] = useState("vi");
  const [ttsVoice, setTtsVoice] = useState("vi-namminh-natural");
  const [reduceOriginalVoice, setReduceOriginalVoice] = useState(true);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [ttsModeLabel, setTtsModeLabel] = useState("");

  async function createSubtitleVoice(mode = "segment", index = 0) {
    if (!subtitlesRef.current.length) {
      showToast("Chưa có phụ đề", "Hãy tạo hoặc nhập phụ đề trước khi tạo giọng đọc.", "error");
      return;
    }

    setTtsLoading(true);
    setMessage(mode === "full" ? "Đang tạo giọng đọc cho toàn bộ phụ đề..." : `Đang tạo giọng đọc cho đoạn #${index + 1}...`);

    try {
      await saveSubtitles();
      const speaker = mode === "segment" ? normalizeSubtitleItem(subtitlesRef.current[index]).speaker : "A";
      const voiceConfig = buildAutoSpeakerVoiceConfigs(ttsVoice);
      const activeConfig = voiceConfig[speaker] || voiceConfig.A;
      const defaultConfig = voiceConfig.A;
      const data = await apiFetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId || null,
          subtitles: subtitlesRef.current.map(normalizeSubtitleItem),
          language: ttsLanguage,
          voice: defaultConfig.voice,
          speed: activeConfig.speed,
          pitch: activeConfig.pitch || 0,
          volume: activeConfig.volume || 1,
          speaker,
          voice_config: voiceConfig,
          mode,
          selected_indexes: mode === "segment" ? [index] : [],
        }),
      });
      const audioUrl = makeBackendUrl(data.audio_url);
      setTtsAudioUrl(audioUrl);
      setTtsModeLabel(mode === "full" ? "Toàn bộ phụ đề" : `Đoạn #${index + 1}`);
      setMessage(mode === "full" ? "Đã tạo file giọng đọc hoàn chỉnh." : `Đã tạo giọng đọc cho đoạn #${index + 1}.`);
      showToast("Đã tạo giọng đọc", "Bạn có thể nghe thử hoặc tải file WAV.", "success");
      await loadHistory();
    } catch (error) {
      setMessage(error.message || "Không thể tạo giọng đọc từ phụ đề.");
      showToast("Tạo giọng đọc thất bại", error.message || "Kiểm tra kết nối mạng hoặc cấu hình ElevenLabs.", "error");
    } finally {
      setTtsLoading(false);
    }
  }

  return {
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
  };
}
