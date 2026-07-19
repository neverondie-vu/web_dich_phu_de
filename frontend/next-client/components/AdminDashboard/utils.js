import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "../../lib/firebase";
import { statusLabels } from "./constants";

export function getSecondaryAuth() {
  const name = "autosub-admin-secondary";
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp(firebaseConfig, name);
  return getAuth(app);
}

export function formatDate(value) {
  if (!value) return "N/A";
  const date =
    typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (
    normalized === "completed" ||
    normalized === "transcribed" ||
    normalized === "saved"
  ) {
    return "is-success";
  }
  if (normalized === "failed") return "is-danger";
  if (normalized === "burning" || normalized === "processing") return "is-info";
  return "is-warning";
}

export function statusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  return statusLabels[normalized] || status || "Không rõ";
}
