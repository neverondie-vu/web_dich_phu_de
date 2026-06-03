"use client";

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, makeBackendUrl } from "../lib/api";
import { auth } from "../lib/firebase";

const languages = [
  ["en", "Tiếng Anh", "EN"],
  ["zh", "Tiếng Trung", "ZH"],
  ["ko", "Tiếng Hàn", "KO"],
  ["ja", "Tiếng Nhật", "JA"],
];

const mediaProfiles = {
  video: {
    label: "Video",
    title: "Tải video",
    description: "MP4 có âm thanh rõ, phù hợp để tạo phụ đề và render hardsub.",
    accept: "video/mp4,.mp4",
    extensions: [".mp4"],
    endpoint: "/api/upload",
    emptyText: "Kéo thả hoặc chọn video MP4",
  },
  audio: {
    label: "Audio",
    title: "Tải âm thanh",
    description: "MP3, WAV, M4A để tạo và xuất phụ đề SRT.",
    accept: "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a",
    extensions: [".mp3", ".wav", ".m4a"],
    endpoint: "/api/upload-audio",
    emptyText: "Kéo thả hoặc chọn audio",
  },
};

const statusMeta = {
  queued: ["Đang chờ", "border-amber-400/25 bg-amber-400/10 text-amber-200"],
  waiting: ["Đang chờ", "border-amber-400/25 bg-amber-400/10 text-amber-200"],
  processing: ["Đang xử lý", "border-sky-400/25 bg-sky-400/10 text-sky-200"],
  transcribed: ["Đã tạo phụ đề", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
  burning: ["Đang ép video", "border-blue-400/25 bg-blue-400/10 text-blue-200"],
  completed: ["Hoàn thành", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
  failed: ["Thất bại", "border-rose-400/25 bg-rose-400/10 text-rose-200"],
  saved: ["Đã lưu", "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"],
};

const subtitleColorPresets = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

const subtitleFonts = [
  ["Arial", "Arial"],
  ["Tahoma", "Tahoma"],
  ["Verdana", "Verdana"],
  ["Times New Roman", "Times New Roman"],
  ["Georgia", "Georgia"],
  ["Courier New", "Courier New"],
];

function hexToRgba(hex, opacity) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function toSrt(subtitles, jobId) {
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

function subtitleTimeToSeconds(value) {
  const [hours = 0, minutes = 0, seconds = 0] = String(value || "")
    .replace(",", ".")
    .split(":")
    .map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function fileExtension(name) {
  const index = String(name || "").lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function statusLabel(status) {
  return statusMeta[String(status || "").toLowerCase()] || [status || "Đang chờ", statusMeta.waiting[1]];
}

function Icon({ name, className = "h-5 w-5" }) {
  const common = { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
  const paths = {
    audio: "M9 19V6l12-2v13M9 19c0 1.105-1.79 2-4 2s-4-.895-4-2 1.79-2 4-2 4 .895 4 2Zm12-2c0 1.105-1.79 2-4 2s-4-.895-4-2 1.79-2 4-2 4 .895 4 2Z",
    archive: "M20 7H4m16 0-1 12H5L4 7m16 0-2-4H6L4 7m5 5h6",
    check: "M5 13l4 4L19 7",
    clock: "M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    close: "M6 18 18 6M6 6l12 12",
    download: "M12 3v12m0 0 4-4m-4 4-4-4M4 21h16",
    history: "M3 12a9 9 0 1 0 3-6.7M3 5v6h6m3-3v5l4 2",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    play: "M8 5v14l11-7L8 5Z",
    subtitle: "M4 5h16v14H4V5Zm3 9h5m2 0h3M7 11h10",
    upload: "M12 16V4m0 0 4 4m-4-4-4 4M4 20h16",
    video: "M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z",
  };

  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={paths[name] || paths.info} />
    </svg>
  );
}

function QueueItem({ item }) {
  const [label, classes] = statusLabel(item.status);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-100">
            <Icon name={item.mediaType === "audio" ? "audio" : "video"} className="h-4 w-4 text-cyan-300" />
            <span className="truncate text-sm font-semibold">{item.filename}</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {mediaProfiles[item.mediaType]?.label || "Tệp"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${classes}`}>
          {label}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#050810]">
        <div
          className={`h-full ${
            item.status === "completed"
              ? "w-full bg-emerald-400"
              : item.status === "failed"
                ? "w-full bg-rose-400"
                : "w-1/3 bg-linear-to-r from-cyan-400 to-blue-500"
          }`}
        />
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-10000 flex w-90 max-w-[calc(100vw-32px)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className={`rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-xl ${
            toast.type === "error"
              ? "border-rose-400/25 bg-rose-500/15 text-rose-50"
              : toast.type === "success"
                ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-50"
                : "border-cyan-400/25 bg-cyan-500/15 text-cyan-50"
          }`}
          key={toast.id}
        >
          <p className="text-sm font-bold">{toast.title}</p>
          {toast.body && <p className="mt-1 text-xs leading-5 text-slate-300">{toast.body}</p>}
        </div>
      ))}
    </div>
  );
}

function HistoryList({ history, message, onRefresh }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#050810]/65 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Lịch sử xử lý</p>
          <p className="mt-1 text-xs text-slate-500">Theo dõi job đang chạy và kết quả đã hoàn thành.</p>
        </div>
        <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/5" onClick={onRefresh} type="button">
          Làm mới
        </button>
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        {message ? (
          <p className="py-12 text-center text-sm text-slate-500">{message}</p>
        ) : history.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có lịch sử xử lý.</p>
        ) : (
          history.map((item, index) => {
            const [label, classes] = statusLabel(item.status);
            return (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4" key={`${item.job_id}-${item.action}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-white">{item.action}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${classes}`}>{label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.message || "Không có mô tả chi tiết."}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                  <span className="truncate font-mono">{item.job_id}</span>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "N/A"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function SubtitleWorkspace() {
  const router = useRouter();
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

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
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
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [currentJobId, setCurrentJobId] = useState("");
  const [subtitles, setSubtitles] = useState([]);
  const [message, setMessage] = useState("Sẵn sàng nhận tệp mới.");
  const [loading, setLoading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archive, setArchive] = useState([]);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [historyMessage, setHistoryMessage] = useState("");
  const [activePanel, setActivePanel] = useState("subtitles");
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [srtUrl, setSrtUrl] = useState("");
  const [waitingForUserAction, setWaitingForUserAction] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const profile = mediaProfiles[mediaMode];

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    if (authChecked && !user) router.push("/auth/login");
  }, [authChecked, router, user]);

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
    if (user?.uid) loadHistory();
  }, [user?.uid]);

  useEffect(() => {
    function syncPreviewFullscreen() {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fullscreenElement) setPreviewExpanded(false);
    }

    document.addEventListener("fullscreenchange", syncPreviewFullscreen);
    document.addEventListener("webkitfullscreenchange", syncPreviewFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncPreviewFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncPreviewFullscreen);
    };
  }, []);

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
    await auth.signOut();
    router.push("/");
  }

  async function openPreviewFullscreen() {
    const frame = previewFrameRef.current;
    if (!frame) return;

    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setPreviewExpanded(false);
      return;
    }

    if (previewExpanded) {
      setPreviewExpanded(false);
      return;
    }

    try {
      if (frame.requestFullscreen) {
        await frame.requestFullscreen();
        setPreviewExpanded(true);
      } else if (frame.webkitRequestFullscreen) {
        frame.webkitRequestFullscreen();
        setPreviewExpanded(true);
      } else {
        setPreviewExpanded(true);
      }
    } catch {
      setPreviewExpanded(true);
    }
  }

  function resetSelectedFile() {
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    setSelectedFile(null);
    setThumbnailUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function switchMediaMode(nextMode) {
    if (nextMode === mediaMode) return;
    setMediaMode(nextMode);
    resetSelectedFile();
    setMessage(nextMode === "video" ? "Chế độ video: tạo SRT và có thể ép phụ đề vào MP4." : "Chế độ audio: tạo phụ đề SRT từ MP3, WAV hoặc M4A.");
  }

  function updateQueueItem(id, patch) {
    setQueueItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function createVideoThumbnail(file) {
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    setThumbnailUrl("");

    const fileUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = fileUrl;
    video.muted = true;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadeddata", () => {
      video.currentTime = video.duration > 1 ? 1 : 0.1;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnailUrl(canvas.toDataURL("image/jpeg"));
      URL.revokeObjectURL(fileUrl);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(fileUrl);
    });
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      resetSelectedFile();
      return;
    }

    const extension = fileExtension(file.name);
    if (!profile.extensions.includes(extension)) {
      resetSelectedFile();
      showToast("Định dạng tệp chưa được hỗ trợ", `${profile.label} chỉ chấp nhận: ${profile.extensions.join(", ")}.`, "error");
      return;
    }

    setSelectedFile(file);
    if (mediaMode === "video") createVideoThumbnail(file);
    else setThumbnailUrl("");
  }

  function buildUploadFormData(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("src_language", sourceLanguage);
    if (mediaMode === "video") {
      formData.append("subtitle_position_y", String(posY));
      formData.append("background_opacity", String(opacity));
    }
    if (user?.uid) {
      formData.append("user_id", user.uid);
      if (user.email) formData.append("user_email", user.email);
      formData.append("username", user.displayName || user.email?.split("@")[0] || "");
    }
    return formData;
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
      formData: buildUploadFormData(selectedFile),
      file: selectedFile,
      mediaType: mediaMode,
      endpoint: profile.endpoint,
    };

    queueRef.current.push(task);
    setQueueItems((items) => [{ id: fakeId, filename: selectedFile.name, status: "waiting", mediaType: mediaMode }, ...items]);
    showToast("Đã thêm vào hàng đợi", `${selectedFile.name} sẽ được xử lý theo chế độ ${profile.label}.`, "success");

    formRef.current?.reset();
    resetSelectedFile();

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
    setSrtUrl("");
    setWaitingForUserAction(false);
    setLoading(true);
    setPreviewUrl("");
    setSubtitles([]);
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

  function checkTranscriptionStatus(jobId) {
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

          if (Array.isArray(data.subtitles)) setSubtitles(data.subtitles);
          await loadHistory();

          if (mediaType === "audio") {
            setMessage("Đã tạo phụ đề SRT từ audio. Bạn có thể chỉnh sửa và xuất SRT.");
            showToast("Audio đã xử lý xong", "Phụ đề đã sẵn sàng để chỉnh sửa hoặc tải xuống.", "success");
            busyRef.current = false;
            processNextInQueue();
          } else {
            setWaitingForUserAction(true);
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
          await loadHistory();
          processNextInQueue();
        }
      } catch (error) {
        setMessage(error.message || "Không thể cập nhật trạng thái xử lý.");
      }
    }, 3000);
  }

  function updateSubtitle(index, value) {
    setSubtitles((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, text: value } : item)));
  }

  function exportSrt() {
    if (!subtitles.length) {
      showToast("Chưa có phụ đề để xuất", "Hãy xử lý tệp trước khi tải file SRT.", "error");
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
    showToast("Đã xuất file SRT", `${filename} đã được tạo từ nội dung đang hiển thị.`, "success");
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

  async function burnVideo() {
    if (!currentJobId || subtitles.length === 0 || currentMediaType === "audio") return;

    setLoading(true);
    setWaitingForUserAction(false);
    setMessage("Đang lưu phụ đề và ép phụ đề cứng vào video...");

    try {
      await saveSubtitles();
      const data = await apiFetch("/api/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId,
          subtitles: subtitlesRef.current,
          subtitle_position_y: posY,
          background_opacity: opacity,
          background_color: backgroundColor,
          text_color: textColor,
          font_size: fontSize,
          font_family: fontFamily,
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

  function checkFinalStatus(jobId) {
    if (pollRef.current) window.clearInterval(pollRef.current);

    pollRef.current = window.setInterval(async () => {
      try {
        const data = await apiFetch(`/api/status/${jobId}`);
        setMessage(`Trạng thái render: ${statusLabel(data.status)[0]}`);

        if (data.status === "completed") {
          window.clearInterval(pollRef.current);
          pollRef.current = null;

          const hardsubUrl = makeBackendUrl(`/api/download/${jobId}`);
          setPreviewUrl(hardsubUrl);
          setFinalVideoUrl(hardsubUrl);
          setLoading(false);
          setMessage("Video đã được ép phụ đề thành công.");
          showToast("Video đã hoàn thành", "Bạn có thể xem trước hoặc tải video MP4 đã có phụ đề.", "success");
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
          await loadHistory();
          processNextInQueue();
        }
      } catch (error) {
        setMessage(error.message || "Không thể cập nhật trạng thái render.");
      }
    }, 3000);
  }

  async function continueQueue() {
    setWaitingForUserAction(false);
    busyRef.current = false;
    showToast("Tiếp tục hàng đợi", "Hệ thống sẽ chuyển sang tệp tiếp theo nếu còn trong hàng đợi.", "info");
    await loadHistory();
    processNextInQueue();
  }

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

  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0c1433] text-slate-200">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Đang kiểm tra phiên đăng nhập...</p>
      </main>
    );
  }

  const currentStatus = loading ? "Đang xử lý" : finalVideoUrl ? "Hoàn thành" : subtitles.length ? "Chờ xác nhận" : "Sẵn sàng";
  const currentFileName = activeTaskRef.current?.filename || selectedFile?.name || "Chưa chọn tệp";
  const currentOutput = finalVideoUrl ? "MP4 hardsub" : srtUrl ? "SRT sẵn sàng" : "Chưa có đầu ra";
  const activeStepIndex = finalVideoUrl ? 3 : subtitles.length ? 2 : loading ? 1 : selectedFile || currentJobId ? 0 : -1;
  const previewSubtitle =
    subtitles.find(
      (subtitle) =>
        previewCurrentTime >= subtitleTimeToSeconds(subtitle.start) &&
        previewCurrentTime <= subtitleTimeToSeconds(subtitle.end),
    ) || subtitles[0];
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
      className="min-h-screen overflow-hidden text-slate-100 selection:bg-cyan-500/30"
      style={{
        background:
          "linear-gradient(180deg, #101827 0%, #0b1220 48%, #070b13 100%)",
      }}
    >
      <ToastStack toasts={toasts} />

      <header className="relative z-30 flex h-14 items-center justify-between border-b border-slate-700/60 bg-[#0b1220]/95 px-4 backdrop-blur-xl lg:px-6">
        <Link href="/" className="ml-5 flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Icon name="subtitle" className="h-4 w-4" />
          </span>
          <span className="text-base font-black tracking-tight">
            Auto<span className="text-cyan-300">Sub</span> Studio
          </span>
        </Link>
        <div className="relative" ref={profileMenuRef}>
          <button
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4.5 px-2 py-1.5 text-left shadow-lg shadow-black/20 transition hover:border-cyan-300/20 hover:bg-white/7 focus:border-cyan-300/20 focus:bg-white/7 focus:outline-none"
            onClick={() => setProfileMenuOpen((open) => !open)}
            type="button"
          >
            <span className="flex h-7 w-7 shrink-0 rounded-full bg-linear-to-br from-cyan-200 via-blue-400 to-violet-400 p-px">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#081225] text-[10px] font-black text-cyan-100">
                {user?.photoURL ? <img alt={displayName} className="h-full w-full rounded-full object-cover" src={user.photoURL} /> : initial}
              </span>
            </span>
            <span className="hidden max-w-36 truncate text-xs font-bold text-cyan-100 sm:block">Hi, {displayName}</span>
            <svg className={`h-2.5 w-2.5 text-slate-500 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>

          <div className={`absolute right-0 top-full z-50 mt-2 w-40 origin-top-right rounded-lg border border-white/10 bg-[#07111f]/96 p-1.5 shadow-[0_16px_38px_rgba(0,0,0,0.42)] backdrop-blur-xl transition duration-200 ${profileMenuOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0"}`} role="menu">
            <Link className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10 hover:text-white" href="/" onClick={() => setProfileMenuOpen(false)} role="menuitem">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9 19v-5h6v5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Về trang chủ
            </Link>
            <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-300/10 hover:text-rose-100" onClick={handleLogout} role="menuitem" type="button">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="grid h-[calc(100vh-56px)] grid-cols-1 overflow-hidden p-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
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
                <p className="text-sm font-black text-white">{subtitles.length}</p>
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
                onClick={() => switchMediaMode(key)}
                type="button"
              >
                <Icon name={key === "audio" ? "audio" : "video"} className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          <form ref={formRef} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3" onSubmit={handleSubmit}>
            <label className="group relative flex min-h-36.25 cursor-pointer items-end overflow-hidden rounded-lg border border-dashed border-slate-500/45 bg-[#0f172a]/85 p-4 text-left transition hover:border-cyan-300/55 hover:bg-[#111c2f]">
              <input ref={fileInputRef} accept={profile.accept} className="absolute inset-0 z-20 cursor-pointer opacity-0" required type="file" onChange={handleFileChange} />

              {thumbnailUrl ? (
                <>
                  <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
                  <span className="absolute inset-0 bg-slate-950/45" />
                </>
              ) : null}

              <span className="relative z-10 grid w-full justify-items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-lg shadow-cyan-950/30">
                  <Icon name="upload" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block max-w-67.5 truncate text-xs font-black text-white">{selectedFile?.name || profile.emptyText}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{profile.description}</span>
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">{profile.extensions.join(" ")}</span>
              </span>
            </label>

            <div className="grid gap-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Ngôn ngữ nguồn</label>
              <div className="relative" ref={languageMenuRef}>
                <button
                  aria-expanded={languageMenuOpen}
                  aria-haspopup="listbox"
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#050810] px-3 py-2.5 text-left shadow-inner shadow-black/20 transition hover:border-cyan-300/35 hover:bg-[#081225] focus:border-cyan-300/45 focus:outline-none focus:ring-2 focus:ring-cyan-300/10"
                  onClick={() => setLanguageMenuOpen((open) => !open)}
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
                      onClick={() => {
                        setSourceLanguage(value);
                        setLanguageMenuOpen(false);
                      }}
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

            {mediaMode === "video" && (
              <div className="grid gap-2">
                <div className="grid min-h-18 content-center gap-2 rounded-lg border border-white/10 bg-[#050810]/65 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Vị trí phụ đề</label>
                    <span className="font-mono text-xs text-cyan-200">{posY}px</span>
                  </div>
                  <input max="500" min="5" type="range" value={posY} onChange={(event) => setPosY(Number(event.target.value))} className="p-0 accent-cyan-300" />
                </div>
                <div className="grid min-h-18 content-center gap-2 rounded-lg border border-white/10 bg-[#050810]/65 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Độ mờ nền</label>
                    <span className="font-mono text-xs text-cyan-200">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input max="1" min="0" step="0.05" type="range" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="p-0 accent-cyan-300" />
                </div>
                <details className="subtitle-customization group rounded-lg border border-white/10 bg-[#050810]/65 p-2.5" ref={subtitleCustomizationRef}>
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Tùy chỉnh
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor }} />
                      <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: textColor }} />
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3 border-t border-white/10 pt-3">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold text-slate-400">Cỡ chữ</label>
                        <span className="font-mono text-xs text-cyan-200">{fontSize}px</span>
                      </div>
                      <input className="p-0 accent-cyan-300" max="72" min="12" type="range" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-[11px] font-bold text-slate-400">Kiểu chữ</label>
                      <select className="rounded-lg border-white/10 bg-[#050810] text-xs text-slate-100" value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
                        {subtitleFonts.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold text-slate-400">Màu nền</label>
                        <input className="h-8 w-12 cursor-pointer rounded border-white/10 bg-transparent p-0.5" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subtitleColorPresets.map((color) => (
                          <button aria-label={`Chọn màu nền ${color}`} className="h-6 w-6 rounded-full border border-white/20 transition hover:scale-110" key={`background-${color}`} onClick={() => setBackgroundColor(color)} style={{ backgroundColor: color }} type="button" />
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold text-slate-400">Màu chữ</label>
                        <input className="h-8 w-12 cursor-pointer rounded border-white/10 bg-transparent p-0.5" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subtitleColorPresets.map((color) => (
                          <button aria-label={`Chọn màu chữ ${color}`} className="h-6 w-6 rounded-full border border-white/20 transition hover:scale-110" key={`text-${color}`} onClick={() => setTextColor(color)} style={{ backgroundColor: color }} type="button" />
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

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

        <section className="custom-scrollbar min-h-0 overflow-y-auto rounded-lg bg-[#0a101b]/55 p-3">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0f172a]/88 p-3 shadow-2xl shadow-black/25 backdrop-blur-xl xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`studio-status-dot h-2.5 w-2.5 rounded-full ${loading ? "bg-cyan-300 shadow-cyan-300/60" : "bg-emerald-300 shadow-emerald-300/60"}`} />
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{currentStatus}</span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-400">{currentMediaType === "audio" ? "Audio to SRT" : "Video to SRT/MP4"}</span>
                </div>
                <h2 className="mt-1.5 truncate text-xl font-black tracking-tight text-white xl:text-2xl">{currentFileName}</h2>
                <p className="mt-1.5 max-w-4xl text-xs leading-5 text-slate-400">{message}</p>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {waitingForUserAction && (
                  <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-white/5" onClick={continueQueue} type="button">
                    Tệp tiếp theo
                  </button>
                )}
                <button
                  onClick={() => setActivePanel(activePanel === "history" ? "subtitles" : "history")}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                    activePanel === "history" ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-200 hover:bg-white/5"
                  }`}
                  type="button"
                >
                  <Icon name="history" className="h-4 w-4" />
                  Lịch sử
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/5" onClick={openArchiveModal} type="button">
                  <Icon name="archive" className="h-4 w-4" />
                  Kho lưu trữ
                </button>
                <button disabled={!subtitles.length} onClick={exportSrt} className="flex items-center gap-2 rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10 disabled:hidden" type="button">
                  <Icon name="download" className="h-4 w-4" />
                  Xuất SRT
                </button>
                {currentMediaType === "video" && (
                  <button disabled={!subtitles.length || loading} onClick={burnVideo} className="flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:hidden" type="button">
                    <Icon name="video" className="h-4 w-4" />
                    Ép video
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-[#0f172a]/72 p-2 sm:grid-cols-4">
              {workflowSteps.map(([step, title, detail], index) => (
                <div
                  className={`rounded-md border p-2.5 text-left transition ${
                    index <= activeStepIndex
                      ? "border-cyan-300/25 bg-cyan-300/10"
                      : "border-white/10 bg-[#050810]/65"
                  }`}
                  key={step}
                >
                  <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${index <= activeStepIndex ? "text-cyan-200" : "text-slate-500"}`}>{step}</p>
                  <p className="mt-1 text-xs font-bold text-white">{title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
                </div>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0f172a]/90 shadow-2xl shadow-black/35">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-300/10 text-cyan-200">
                        <Icon name={currentMediaType === "audio" ? "audio" : "video"} className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Preview</p>
                        <p className="text-[11px] text-slate-500">Kiểm tra đầu vào và kết quả render</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-slate-400">{currentOutput}</span>
                  </div>

                  <div className={`subtitle-preview-frame relative aspect-video overflow-hidden bg-black ${previewExpanded ? "subtitle-preview-expanded" : ""}`} ref={previewFrameRef}>
                    {currentMediaType === "audio" ? (
                      <div className="grid h-full content-center p-5 text-left">
                        <div className="grid justify-items-start gap-4">
                          <span className="grid h-12 w-12 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                            <Icon name="audio" className="h-6 w-6" />
                          </span>
                          <div>
                            <h3 className="text-lg font-black text-white">Xử lý audio thành phụ đề SRT</h3>
                            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">Tệp âm thanh được nhận diện giọng nói, tách câu theo thời gian và xuất SRT để tải xuống hoặc chỉnh sửa.</p>
                          </div>
                          <div className="flex h-12 w-full max-w-xl items-end gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
                            {[38, 64, 46, 78, 55, 88, 42, 72, 50, 82, 58, 68, 44, 74, 52, 62].map((height, index) => (
                              <span className="flex-1 rounded-t bg-cyan-300/70" key={index} style={{ height: `${height}%` }} />
                            ))}
                          </div>
                          {previewUrl && <audio controls src={previewUrl} className="w-full max-w-xl" />}
                        </div>
                      </div>
                    ) : previewUrl ? (
                      <>
                        <video
                          controls
                          controlsList="nofullscreen"
                          src={previewUrl}
                          className="h-full w-full object-contain"
                          onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
                        />
                        <button
                          aria-label={previewExpanded ? "Thu nhỏ video" : "Phóng to video và phụ đề"}
                          className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/25 bg-[#050810]/75 text-cyan-100 shadow-lg shadow-black/30 backdrop-blur-sm transition hover:border-cyan-200/60 hover:bg-cyan-300/15 hover:text-white"
                          onClick={openPreviewFullscreen}
                          title={previewExpanded ? "Thu nhỏ video" : "Phóng to video và phụ đề"}
                          type="button"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </button>
                        {!finalVideoUrl && previewSubtitle && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-5 text-center"
                            style={{ bottom: `${posY}px` }}
                          >
                            <span
                              className="max-w-[92%] rounded px-2.5 py-1 text-sm font-semibold leading-5 shadow-md"
                              style={{
                                backgroundColor: hexToRgba(backgroundColor, opacity),
                                color: textColor,
                                fontFamily,
                                fontSize: `${fontSize}px`,
                              }}
                            >
                              {previewSubtitle.text}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="grid h-full content-center p-6 text-left">
                        <div className="grid max-w-md justify-items-start gap-4 text-slate-500">
                          <Icon name="video" className="h-12 w-12" />
                          <div>
                            <h3 className="text-lg font-black text-white">Chưa có video xem trước</h3>
                            <p className="mt-2 text-sm leading-6">Chọn video MP4 ở cột bên trái để bắt đầu tạo phụ đề và xem lại kết quả tại đây.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {loading && (
                      <div className="absolute inset-0 z-20 grid place-items-center bg-[#050810]/90 p-5 backdrop-blur-md">
                        <div className="grid justify-items-center gap-4 text-center">
                          <span className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">AI đang nhận diện giọng nói và xử lý phụ đề</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2 p-2.5 text-left sm:grid-cols-3">
                    <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Job hiện tại</p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-300">{currentJobId || "Chưa có"}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Phân đoạn</p>
                      <p className="mt-1 text-sm font-bold text-white">{subtitles.length} đoạn phụ đề</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#050810]/65 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Đầu ra</p>
                      <p className="mt-1 text-sm font-bold text-white">{currentOutput}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-97.5 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0f172a]/92 shadow-2xl shadow-black/35 backdrop-blur-xl lg:min-h-0">
                {activePanel === "history" ? (
                  <HistoryList history={history} message={historyMessage} onRefresh={loadHistory} />
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#050810]/72 p-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Biên tập phụ đề</p>
                        <p className="mt-1 text-xs text-slate-500">Rà soát từng đoạn trước khi xuất hoặc render.</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-slate-300">
                        {finalVideoUrl ? "Xong" : subtitles.length}
                      </span>
                    </div>

                    <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-3">
                      {finalVideoUrl ? (
                        <div className="grid justify-items-start gap-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-6 text-left">
                          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-400/20 text-emerald-200">
                            <Icon name="check" className="h-7 w-7" />
                          </span>
                          <div>
                            <h3 className="font-black text-white">Dự án hoàn tất</h3>
                            <p className="mt-1 text-sm text-slate-400">Video đã được ép phụ đề cứng thành công.</p>
                          </div>
                          <a className="w-full rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 py-3 text-center text-sm font-black text-slate-950 hover:brightness-110" download href={finalVideoUrl} target="_blank">
                            Tải video MP4
                          </a>
                        </div>
                      ) : subtitles.length === 0 ? (
                        <div className="grid h-full min-h-75 place-items-center rounded-lg border border-dashed border-white/10 bg-[#050810]/45 p-6 text-center text-slate-500">
                          <div className="grid max-w-xs justify-items-center gap-3">
                            <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035]">
                              <Icon name="subtitle" className="h-7 w-7" />
                            </span>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Chưa có phụ đề</p>
                            <p className="text-sm leading-6">Sau khi AI xử lý xong, từng câu phụ đề sẽ xuất hiện ở đây để chỉnh sửa nhanh.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {srtUrl && (
                            <a className="flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15" href={srtUrl} target="_blank">
                              <Icon name="download" className="h-4 w-4" />
                              Tải SRT từ máy chủ
                            </a>
                          )}
                          {subtitles.map((sub, index) => (
                            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2.5 transition hover:border-cyan-300/25 hover:bg-white/5.5" key={`${sub.start}-${index}`}>
                              <div className="mb-2.5 flex items-center justify-between gap-3">
                                <span className="rounded-md border border-white/10 bg-[#050810] px-2 py-1 font-mono text-[11px] text-cyan-200">
                                  {sub.start} - {sub.end}
                                </span>
                                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-500">#{index + 1}</span>
                              </div>
                              <textarea className="custom-scrollbar min-h-18 w-full resize-y rounded-lg border-white/10 bg-[#050810]/78 p-3 text-xs leading-5 text-slate-100 focus:border-cyan-300/60" value={sub.text} onChange={(event) => updateSubtitle(index, event.target.value)} />
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {archiveOpen && (
        <div className="fixed inset-0 z-9999 grid place-items-center bg-[#050810]/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-cyan-400/15 bg-[#0b1437] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <h2 className="text-xl font-black text-white">Kho lưu trữ dự án</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Các dự án hoàn thành được lưu tối đa 20 ngày để tối ưu dung lượng.</p>
              </div>
              <button className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => setArchiveOpen(false)} type="button">
                <Icon name="close" />
              </button>
            </div>

            <div className="custom-scrollbar max-h-[62vh] space-y-3 overflow-y-auto p-6">
              {archiveMessage ? (
                <p className="py-10 text-center text-sm text-slate-500">{archiveMessage}</p>
              ) : archive.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Kho đang trống.</p>
              ) : (
                archive.map((job) => (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4" key={job.job_id}>
                    <div className="min-w-0">
                      <p className="truncate pr-4 text-sm font-bold text-white">{job.filename}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">{job.created_at}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <a className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-white/5" href={makeBackendUrl(`/api/download_srt/${job.job_id}`)} target="_blank">
                        SRT
                      </a>
                      {job.media_type === "audio" ? (
                        <a className="rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 hover:brightness-110" href={makeBackendUrl(`/api/original/${job.job_id}`)} target="_blank">
                          Tệp gốc
                        </a>
                      ) : (
                        <a className="rounded-lg bg-linear-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-black text-slate-950 hover:brightness-110" href={makeBackendUrl(`/api/download/${job.job_id}`)} target="_blank">
                          MP4
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

