import { useState } from "react";
import { apiFetch } from "../../lib/api";

export function useHistoryArchive(user) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archive, setArchive] = useState([]);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [historyMessage, setHistoryMessage] = useState("");

  async function loadHistory() {
    if (!user?.uid) return;
    setHistoryMessage("Đang tải lịch sử xử lý...");
    try {
      const data = await apiFetch(`/api/history/${user.uid}`);
      setHistory(Array.isArray(data.history) ? data.history : []);
      setHistoryMessage("");
    } catch (error) {
      setHistory([]);
      setHistoryMessage(error.message || "Không tải được lịch sử xử lý.");
    }
  }

  async function openArchiveModal() {
    setArchiveOpen(true);
    setArchiveMessage("Đang tải kho lưu trữ...");

    if (!user?.uid) {
      setArchive([]);
      setArchiveMessage("Bạn cần đăng nhập để xem kho lưu trữ.");
      return;
    }

    try {
      const data = await apiFetch(`/api/archive/${user.uid}`);
      setArchive(Array.isArray(data) ? data : []);
      setArchiveMessage("");
    } catch (error) {
      setArchive([]);
      setArchiveMessage(error.message || "Không kết nối được máy chủ lưu trữ.");
    }
  }

  async function deleteArchivedJob(jobId) {
    if (!user?.uid || !jobId) return;
    setArchiveMessage("");

    try {
      await apiFetch(`/api/archive/${user.uid}/${jobId}`, { method: "DELETE" });
      setArchive((items) => items.filter((item) => item.job_id !== jobId));
    } catch (error) {
      setArchiveMessage(error.message || "KhÃ´ng xÃ³a Ä‘Æ°á»£c dá»± Ã¡n trong kho lÆ°u trá»¯.");
    }
  }

  return {
    archive,
    archiveMessage,
    archiveOpen,
    history,
    historyMessage,
    deleteArchivedJob,
    loadHistory,
    openArchiveModal,
    setArchiveOpen,
  };
}
