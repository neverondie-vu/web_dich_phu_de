import { apiFetch } from "../../../lib/api";
import { toSrt } from "../../../utils/workspace";

export function updateSubtitleText(setSubtitles, index, value) {
  setSubtitles((items) =>
    items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, text: value } : item,
    ),
  );
}

export function exportSrtFile({ currentJobId, showToast, subtitles }) {
  if (!subtitles.length) {
    showToast(
      "ChÆ°a cÃ³ phá»¥ Ä‘á» Ä‘á»ƒ xuáº¥t",
      "HÃ£y xá»­ lÃ½ tá»‡p trÆ°á»›c khi táº£i file SRT.",
      "error",
    );
    return;
  }
  const { filename, content } = toSrt(subtitles, currentJobId);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(
    "ÄÃ£ xuáº¥t file SRT",
    `${filename} Ä‘Ã£ Ä‘Æ°á»£c táº¡o tá»« ná»™i dung Ä‘ang hiá»ƒn thá»‹.`,
    "success",
  );
}

export async function saveSubtitlesToBackend({
  currentJobId,
  loadHistory,
  subtitlesRef,
}) {
  if (!currentJobId || subtitlesRef.current.length === 0) return;

  await apiFetch(`/api/subtitles/${currentJobId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subtitles: subtitlesRef.current }),
  });
  await loadHistory();
}

