import { useEffect, useState } from "react";

export function useVideoPreview(previewFrameRef, previewUrl) {
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewVideoSize, setPreviewVideoSize] = useState({ width: 16, height: 9 });
  const [previewFrameSize, setPreviewFrameSize] = useState({ width: 0, height: 0 });
  const [previewExpanded, setPreviewExpanded] = useState(false);

  function previewVideoBoxMetrics() {
    const frameWidth = previewFrameSize.width || 0;
    const frameHeight = previewFrameSize.height || 0;
    const videoWidth = previewVideoSize.width || 16;
    const videoHeight = previewVideoSize.height || 9;

    if (!frameWidth || !frameHeight || !videoWidth || !videoHeight) {
      return {
        height: frameHeight,
        left: 0,
        scale: 1,
        top: 0,
        width: frameWidth,
      };
    }

    const frameRatio = frameWidth / frameHeight;
    const videoRatio = videoWidth / videoHeight;
    let width = frameWidth;
    let height = frameHeight;

    if (frameRatio > videoRatio) {
      height = frameHeight;
      width = height * videoRatio;
    } else {
      width = frameWidth;
      height = width / videoRatio;
    }

    return {
      height,
      left: (frameWidth - width) / 2,
      scale: height / videoHeight,
      top: (frameHeight - height) / 2,
      width,
    };
  }

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
    const frame = previewFrameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return undefined;

    const updateFrameSize = () => {
      setPreviewFrameSize({
        width: frame.clientWidth,
        height: frame.clientHeight,
      });
    };
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);
    updateFrameSize();

    return () => observer.disconnect();
  }, [previewFrameRef, previewUrl, previewExpanded]);

  function previewVideoBoxStyle() {
    const metrics = previewVideoBoxMetrics();

    if (!metrics.width || !metrics.height) {
      return { inset: 0 };
    }

    return {
      height: `${metrics.height}px`,
      left: `${metrics.left}px`,
      top: `${metrics.top}px`,
      width: `${metrics.width}px`,
    };
  }

  function previewToVideoFontSize(fontSize) {
    const scale = previewVideoBoxMetrics().scale || 1;
    return Math.max(12, Math.round(fontSize / scale));
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

  return {
    openPreviewFullscreen,
    previewCurrentTime,
    previewExpanded,
    previewVideoSize,
    previewVideoBoxStyle,
    previewToVideoFontSize,
    setPreviewCurrentTime,
    setPreviewVideoSize,
  };
}
