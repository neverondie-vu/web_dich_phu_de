import { ttsVoices } from "../constants/workspace";

export function resolveTtsVoicePreset(value) {
  return ttsVoices.find((voice) => voice.value === value) || ttsVoices[0];
}

export function buildAutoSpeakerVoiceConfigs(voicePresetValue) {
  const preset = resolveTtsVoicePreset(voicePresetValue);
  return {
    A: {
      voice: preset.voice,
      speed: Math.max(0.5, Math.min(1.8, preset.speed * 0.96)),
      pitch: Math.max(-12, Math.min(12, preset.pitch - 0.4)),
      volume: preset.volume,
    },
    B: {
      voice: preset.voice,
      speed: Math.max(0.5, Math.min(1.8, preset.speed * 1.02)),
      pitch: Math.max(-12, Math.min(12, preset.pitch + 1.0)),
      volume: preset.volume,
    },
  };
}

export function hexToRgba(hex, opacity) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function toSrt(subtitles, jobId) {
  return {
    filename: `subtitle_${jobId || "export"}.srt`,
    content: subtitles
      .map((sub, index) => {
        const start = String(sub.start || "").replace(".", ",");
        const end = String(sub.end || "").replace(".", ",");
        return `${index + 1}\n${start} --> ${end}\n${sub.text || ""}`;
      })
      .join("\n\n"),
  };
}

export function subtitleTimeToSeconds(value) {
  const [hours = 0, minutes = 0, seconds = 0] = String(value || "")
    .replace(",", ".")
    .split(":")
    .map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

export function fileExtension(name) {
  const index = String(name || "").lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function normalizeSubtitle(item) {
  return { ...item, speaker: item?.speaker === "B" ? "B" : "A" };
}
