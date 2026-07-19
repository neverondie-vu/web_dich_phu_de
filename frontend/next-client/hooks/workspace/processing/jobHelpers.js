import { makeBackendUrl } from "../../../lib/api";

export function subtitlePositionPixels(posY, previewVideoSize) {
  const videoHeight =
    previewVideoSize?.height > 100 ? previewVideoSize.height : 720;
  return Math.max(5, Math.min(500, Math.round((posY / 100) * videoHeight)));
}

export function makeFreshBackendUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${makeBackendUrl(path)}${separator}v=${Date.now()}`;
}

