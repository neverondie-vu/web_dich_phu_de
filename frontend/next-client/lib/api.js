import { auth } from "./firebase";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (path.startsWith("/admin")) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Phiên quản trị chưa sẵn sàng hoặc đã hết hạn. Vui lòng đăng nhập lại.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.detail || data.message || "Yêu cầu thất bại."
        : data || "Yêu cầu thất bại.";
    throw new Error(message);
  }

  return data;
}

export function makeBackendUrl(path) {
  return `${BACKEND_URL}${path}`;
}
