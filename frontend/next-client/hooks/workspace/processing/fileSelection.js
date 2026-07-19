export function resetSelectedFile({
  fileInputRef,
  setSelectedFile,
  setThumbnailUrl,
  thumbnailUrl,
}) {
  if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
  setSelectedFile(null);
  setThumbnailUrl("");
  if (fileInputRef.current) fileInputRef.current.value = "";
}

export function createVideoThumbnail({ file, setThumbnailUrl, thumbnailUrl }) {
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

export function buildUploadFormData({
  file,
  mediaMode,
  opacity,
  sourceLanguage,
  subtitlePositionY,
  user,
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("src_language", sourceLanguage);
  if (mediaMode === "video") {
    formData.append("subtitle_position_y", String(subtitlePositionY));
    formData.append("background_opacity", String(opacity));
  }
  if (user?.uid) {
    formData.append("user_id", user.uid);
    if (user.email) formData.append("user_email", user.email);
    formData.append("username", user.displayName || user.email?.split("@")[0] || "");
  }
  return formData;
}

