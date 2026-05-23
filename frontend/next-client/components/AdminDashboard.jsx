"use client";

import { getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, makeBackendUrl } from "../lib/api";
import { auth, db, firebaseConfig } from "../lib/firebase";

const navGroups = [
  {
    label: "Hệ thống",
    items: [
      ["dashboard", "Tổng quan", "dashboard"],
      ["users", "Người dùng", "users"],
      ["content", "Tiến trình & phụ đề", "content"],
    ],
  },
  {
    label: "Vận hành",
    items: [
      ["settings", "Cấu hình AI", "settings"],
      ["security", "Bảo mật & logs", "security"],
    ],
  },
];

const statusLabels = {
  completed: "Hoàn thành",
  transcribed: "Đã tạo phụ đề",
  failed: "Lỗi",
  burning: "Đang ép video",
  processing: "Đang xử lý",
  queued: "Đang chờ",
  saved: "Đã lưu",
};

function getSecondaryAuth() {
  const name = "autosub-admin-secondary";
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp(firebaseConfig, name);
  return getAuth(app);
}

function formatDate(value) {
  if (!value) return "N/A";
  const date =
    typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusClass(status) {
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

function statusLabel(status) {
  const normalized = String(status || "").toLowerCase();
  return statusLabels[normalized] || status || "Không rõ";
}

function Icon({ name }) {
  const paths = {
    dashboard: (
      <>
        <path d="M3 13h8V3H3v10Z" />
        <path d="M13 21h8V11h-8v10Z" />
        <path d="M13 9h8V3h-8v6Z" />
        <path d="M3 21h8v-6H3v6Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    content: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.13.36.33.7.6 1 .29.27.67.4 1.1.4H21a2 2 0 0 1 0 4h-.09c-.43 0-.81.13-1.1.4-.27.3-.47.64-.6 1Z" />
      </>
    ),
    security: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 1-15.4 6.36L3 16" />
        <path d="M3 16h5v5" />
        <path d="M3 12A9 9 0 0 1 18.4 5.64L21 8" />
        <path d="M21 8h-5V3" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    alert: (
      <>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      className="admin-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function PageTitle({ title, description, action }) {
  return (
    <div className="admin-page-head">
      <div>
        <p className="admin-eyebrow">AutoSub Admin</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function DailyChart({ daily }) {
  const items = Array.isArray(daily) ? daily : [];
  const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));

  if (items.length === 0) {
    return (
      <div className="admin-empty admin-chart-empty">
        Chưa có dữ liệu trong 7 ngày gần nhất.
      </div>
    );
  }

  return (
    <div className="admin-chart">
      {items.map((item) => {
        const count = Number(item.count) || 0;
        const height = Math.max(8, Math.round((count / max) * 100));
        return (
          <div className="admin-chart-item" key={item.date}>
            <div className="admin-chart-track">
              <span
                className="admin-chart-bar"
                style={{ height: `${height}%` }}
              />
            </div>
            <strong>{count}</strong>
            <span>{String(item.date).slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "cyan" }) {
  return (
    <article className={`admin-kpi tone-${tone}`}>
      <span className="admin-kpi-dot" />
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [allowed, setAllowed] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [stats, setStats] = useState({
    summary: { total_videos: 0, week_videos: 0 },
    daily: [],
  });
  const [logs, setLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [whisperModel, setWhisperModel] = useState("small");
  const [toasts, setToasts] = useState([]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      `${user.username || ""} ${user.email || ""}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [search, users]);

  const totals = useMemo(() => {
    const activeStatuses = new Set(["queued", "processing", "burning"]);
    const failedJobs = jobs.filter(
      (job) => String(job.status || "").toLowerCase() === "failed",
    ).length;
    const activeJobs = jobs.filter((job) =>
      activeStatuses.has(String(job.status || "").toLowerCase()),
    ).length;
    const plusUsers = users.filter((user) => Boolean(user.is_plus)).length;
    const admins = users.filter((user) => user.role === "admin").length;

    return {
      activeJobs,
      admins,
      failedJobs,
      plusUsers,
      totalJobs: stats.summary?.total_videos || jobs.length,
      weekJobs: stats.summary?.week_videos || 0,
    };
  }, [jobs, stats.summary, users]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRedirecting(true);
        router.replace("/auth/login");
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        setAllowed(snapshot.exists() && snapshot.data().role === "admin");
      } catch {
        setAllowed(false);
      }
    });
  }, [router]);

  async function handleLogout() {
    setRedirecting(true);
    await signOut(auth);
    router.replace("/auth/login");
  }

  useEffect(() => {
    if (allowed) loadAll();
  }, [allowed]);

  function showToast(text, type = "success") {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, text, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3200);
  }

  async function loadAll() {
    setMessage("");
    const results = await Promise.allSettled([
      loadStats(),
      loadJobs(),
      loadUsers(),
      loadSecurity(),
    ]);
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      const text =
        failed.reason?.message || "Không tải được một phần dữ liệu quản trị.";
      setMessage(text);
      showToast(text, "error");
    }
  }

  async function loadStats() {
    const [statsData, logsData] = await Promise.all([
      apiFetch("/admin/stats"),
      apiFetch("/admin/logs"),
    ]);
    setStats(
      statsData?.summary
        ? statsData
        : { summary: { total_videos: 0, week_videos: 0 }, daily: [] },
    );
    setLogs(logsData.logs || []);
  }

  async function loadJobs() {
    const data = await apiFetch("/admin/jobs");
    setJobs(data.jobs || []);
  }

  async function loadUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    data.sort((a, b) => {
      const left =
        typeof a.createdAt?.toMillis === "function"
          ? a.createdAt.toMillis()
          : 0;
      const right =
        typeof b.createdAt?.toMillis === "function"
          ? b.createdAt.toMillis()
          : 0;
      return right - left;
    });
    setUsers(data);
  }

  async function loadSecurity() {
    const [status, blacklistData, auditData] = await Promise.all([
      apiFetch("/admin/system-status"),
      apiFetch("/admin/blacklist"),
      apiFetch("/admin/audit-logs"),
    ]);
    setMaintenance(Boolean(status.maintenance_mode));
    setWhisperModel(status.whisper_model || "small");
    setBlacklist(blacklistData.ips || []);
    setAuditLogs(auditData.logs || []);
  }

  async function saveConfig(event) {
    event.preventDefault();

    try {
      const result = await apiFetch("/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whisper_model: whisperModel }),
      });
      showToast(result.message || "Đã lưu cấu hình hệ thống.");
    } catch (error) {
      showToast(error.message || "Không lưu được cấu hình.", "error");
    }
  }

  async function toggleMaintenance(nextStatus = !maintenance) {
    try {
      const result = await apiFetch("/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setMaintenance(Boolean(result.maintenance_mode));
      showToast(
        Boolean(result.maintenance_mode)
          ? "Đã bật chế độ bảo trì."
          : "Đã tắt chế độ bảo trì.",
      );
    } catch (error) {
      showToast(error.message || "Không cập nhật được bảo trì.", "error");
    }
  }

  async function addIp(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ip = String(form.get("ip") || "").trim();
    if (!ip) return;

    try {
      const result = await apiFetch("/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      setBlacklist(result.ips || []);
      event.currentTarget.reset();
      showToast("Đã thêm IP vào danh sách chặn.");
    } catch (error) {
      showToast(error.message || "Không chặn được IP.", "error");
    }
  }

  async function removeIp(ip) {
    try {
      const result = await apiFetch(
        `/admin/blacklist/${encodeURIComponent(ip)}`,
        { method: "DELETE" },
      );
      setBlacklist(result.ips || []);
      showToast("Đã gỡ IP khỏi danh sách chặn.");
    } catch (error) {
      showToast(error.message || "Không gỡ được IP.", "error");
    }
  }

  async function createUser(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const username = String(form.get("username") || "").trim();
    const role = String(form.get("role") || "user");
    const isPlus = form.get("is_plus") === "true";
    const secondaryAuth = getSecondaryAuth();

    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      await setDoc(doc(db, "users", credential.user.uid), {
        email,
        username,
        role,
        is_plus: isPlus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await signOut(secondaryAuth);
      setAddOpen(false);
      await loadUsers();
      showToast("Đã tạo người dùng mới.");
    } catch (error) {
      showToast(error.message || "Không tạo được người dùng.", "error");
    }
  }

  async function saveUserChanges(event) {
    event.preventDefault();
    if (!editUser) return;

    try {
      await updateDoc(doc(db, "users", editUser.id), {
        role: editUser.role,
        is_plus: editUser.is_plus,
        updatedAt: serverTimestamp(),
      });
      setEditUser(null);
      await loadUsers();
      showToast("Đã lưu thay đổi tài khoản.");
    } catch (error) {
      showToast(error.message || "Không lưu được tài khoản.", "error");
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;

    try {
      await deleteDoc(doc(db, "users", deleteTarget.id));
      setDeleteTarget(null);
      await loadUsers();
      showToast("Đã xóa hồ sơ người dùng khỏi Firestore.");
    } catch (error) {
      showToast(error.message || "Không xóa được người dùng.", "error");
    }
  }

  if (allowed === null || redirecting) {
    return (
      <main className="classic-admin admin-center">
        <section className="admin-access-card">
          <span className="admin-loader" />
          <h1>
            {redirecting
              ? "Đang chuyển đến trang đăng nhập"
              : "Đang kiểm tra quyền quản trị"}
          </h1>
          <p>
            {redirecting
              ? "Phiên quản trị đã kết thúc."
              : "Hệ thống đang xác thực phiên đăng nhập Firebase của bạn."}
          </p>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="classic-admin admin-center">
        <section className="admin-access-card">
          <Icon name="security" />
          <h1>Không có quyền truy cập</h1>
          <p>
            Bạn cần đăng nhập bằng tài khoản có vai trò admin trong Firestore.
          </p>
          <Link className="admin-btn primary" href="/auth/login">
            Đăng nhập lại
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="classic-admin admin-layout">
      <aside className="admin-aside">
        <div className="admin-brand-block">
          <Link href="/" className="admin-brand">
            AutoSub
          </Link>
          <p>Admin Console</p>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([id, label, icon]) => (
                <button
                  className={`admin-nav-btn ${tab === id ? "active" : ""}`}
                  key={id}
                  onClick={() => setTab(id)}
                  type="button"
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-aside-footer">
          <Link className="admin-btn quiet" href="/">
            <Icon name="home" />
            Về website
          </Link>
          <button
            className="admin-btn danger ghost"
            onClick={handleLogout}
            type="button"
          >
            <Icon name="logout" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="admin-main-panel">
        <div className="admin-content">
          {message && <div className="admin-alert danger">{message}</div>}

          <div className={`admin-tab ${tab === "dashboard" ? "active" : ""}`}>
            <PageTitle
              title="Tổng quan hệ thống"
              description="Theo dõi người dùng, job xử lý và cảnh báo vận hành trong một màn hình."
              action={
                <button
                  className="admin-btn secondary"
                  onClick={loadAll}
                  type="button"
                >
                  <Icon name="refresh" />
                  Làm mới dữ liệu
                </button>
              }
            />

            <div className="admin-stats-grid">
              <MetricCard
                label="Người dùng"
                value={users.length}
                detail={`${totals.plusUsers} tài khoản Plus`}
              />
              <MetricCard
                label="Job đã xử lý"
                value={totals.totalJobs}
                detail={`${totals.weekJobs} job trong 7 ngày`}
                tone="green"
              />
              <MetricCard
                label="Đang chạy"
                value={totals.activeJobs}
                detail="Job trong hàng đợi xử lý"
                tone="blue"
              />
              <MetricCard
                label="Cảnh báo lỗi"
                value={totals.failedJobs}
                detail="Job cần kiểm tra lại"
                tone="red"
              />
            </div>

            <div className="admin-grid dashboard-grid">
              <section className="admin-card span-2">
                <div className="admin-card-header">
                  <div>
                    <h2>Lưu lượng xử lý 7 ngày</h2>
                    <p>Số job video/audio được tạo theo ngày.</p>
                  </div>
                </div>
                <DailyChart daily={stats.daily} />
              </section>

              <section className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Cảnh báo hệ thống</h2>
                    <p>Các job lỗi mới nhất từ backend.</p>
                  </div>
                </div>
                <div className="admin-log-list compact">
                  {logs.length === 0 ? (
                    <div className="admin-empty">Không có lỗi mới.</div>
                  ) : (
                    logs.map((log, index) => (
                      <article
                        className="admin-log-card danger"
                        key={`${log.time}-${index}`}
                      >
                        <strong>{log.level}</strong>
                        <p>{log.message}</p>
                        <span>{log.time}</span>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className={`admin-tab ${tab === "users" ? "active" : ""}`}>
            <PageTitle
              title="Quản lý người dùng"
              description="Quản lý vai trò admin/user, trạng thái gói Plus và hồ sơ thành viên."
              action={
                <button
                  className="admin-btn primary"
                  onClick={() => setAddOpen(true)}
                  type="button"
                >
                  <Icon name="plus" />
                  Tạo tài khoản
                </button>
              }
            />

            <section className="admin-card">
              <div className="admin-toolbar">
                <label className="admin-search">
                  <Icon name="search" />
                  <input
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm theo tên hoặc email..."
                    value={search}
                  />
                </label>
                <p>
                  {filteredUsers.length} / {users.length} người dùng
                </p>
              </div>

              <div className="admin-list">
                {filteredUsers.length === 0 ? (
                  <div className="admin-empty">
                    Không tìm thấy người dùng phù hợp.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <article className="admin-user-row" key={user.id}>
                      <div className="admin-user-main">
                        <span className="admin-avatar">
                          {(user.username || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div>
                          <h3>{user.username || "Chưa đặt tên"}</h3>
                          <p>{user.email || user.id}</p>
                          <small>Tạo ngày: {formatDate(user.createdAt)}</small>
                        </div>
                      </div>
                      <div className="admin-row-actions">
                        <span className="admin-pill neutral">
                          {user.role || "user"}
                        </span>
                        <span
                          className={`admin-pill ${user.is_plus ? "premium" : "info"}`}
                        >
                          {user.is_plus ? "Plus" : "Free"}
                        </span>
                        <button
                          className="admin-btn small secondary"
                          onClick={() =>
                            setEditUser({
                              id: user.id,
                              email: user.email || user.id,
                              role: user.role || "user",
                              is_plus: Boolean(user.is_plus),
                            })
                          }
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          className="admin-btn small danger"
                          onClick={() =>
                            setDeleteTarget({
                              id: user.id,
                              email: user.email || user.id,
                            })
                          }
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className={`admin-tab ${tab === "content" ? "active" : ""}`}>
            <PageTitle
              title="Tiến trình & phụ đề"
              description="Theo dõi toàn bộ job xử lý video/audio, trạng thái và tệp đầu ra."
              action={
                <button
                  className="admin-btn secondary"
                  onClick={loadJobs}
                  type="button"
                >
                  <Icon name="refresh" />
                  Tải lại
                </button>
              }
            />

            <section className="admin-card no-padding">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tệp xử lý</th>
                      <th>Người dùng</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Đầu ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan="5">
                          <div className="admin-empty">Chưa có job xử lý.</div>
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => {
                        const canDownloadSrt =
                          Boolean(job.has_srt) ||
                          ["completed", "transcribed"].includes(job.status);
                        const canDownloadVideo =
                          job.has_hardsub && job.media_type !== "audio";
                        return (
                          <tr key={job.id}>
                            <td>
                              <strong>{job.filename}</strong>
                              <span>
                                {job.file_type || job.media_type || "Tệp"}
                              </span>
                            </td>
                            <td>{job.user_email}</td>
                            <td>
                              <span
                                className={`admin-status ${statusClass(job.status)}`}
                              >
                                {statusLabel(job.status)}
                              </span>
                            </td>
                            <td>{formatDate(job.created_at)}</td>
                            <td>
                              <div className="admin-output-actions">
                                {canDownloadSrt ? (
                                  <a
                                    className="admin-btn tiny secondary"
                                    href={makeBackendUrl(
                                      `/api/download_srt/${job.id}`,
                                    )}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    SRT
                                  </a>
                                ) : null}
                                {canDownloadVideo ? (
                                  <a
                                    className="admin-btn tiny primary"
                                    href={makeBackendUrl(
                                      `/api/download/${job.id}`,
                                    )}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    MP4
                                  </a>
                                ) : null}
                                {!canDownloadSrt && !canDownloadVideo ? (
                                  <span className="admin-muted">
                                    Đang xử lý
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className={`admin-tab ${tab === "settings" ? "active" : ""}`}>
            <PageTitle
              title="Cấu hình AI"
              description="Thiết lập model xử lý giọng nói và các giới hạn vận hành của máy chủ."
            />

            <form onSubmit={saveConfig}>
              <div className="admin-grid">
                <section className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h2>AI Engine</h2>
                      <p>Chọn model Whisper phù hợp hiệu năng máy.</p>
                    </div>
                  </div>
                  <div className="admin-form-stack">
                    <label className="admin-field">
                      <span>Whisper model</span>
                      <select
                        onChange={(event) =>
                          setWhisperModel(event.target.value)
                        }
                        value={whisperModel}
                      >
                        <option value="base">
                          Whisper Base - nhanh, chính xác vừa
                        </option>
                        <option value="small">Whisper Small - cân bằng</option>
                        <option value="medium">
                          Whisper Medium - chính xác cao
                        </option>
                        <option value="large-v3">
                          Whisper Large v3 - tốt nhất, tốn tài nguyên
                        </option>
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Dịch phụ đề</span>
                      <select defaultValue="nllb">
                        <option value="nllb">Meta NLLB-200</option>
                        <option value="google">Google Translate API</option>
                        <option value="gpt">OpenAI GPT</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h2>Máy chủ & lưu trữ</h2>
                      <p>
                        Các thông số vận hành dùng cho báo cáo và cấu hình nội
                        bộ.
                      </p>
                    </div>
                  </div>
                  <div className="admin-form-stack">
                    <label className="admin-field">
                      <span>Dung lượng lưu trữ tối đa (GB)</span>
                      <input defaultValue="100" min="1" type="number" />
                    </label>
                    <label className="admin-field">
                      <span>Tự động xóa file cũ sau (ngày)</span>
                      <input defaultValue="20" min="1" type="number" />
                    </label>
                  </div>
                </section>
              </div>
              <div className="admin-form-actions">
                <button className="admin-btn primary" type="submit">
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>

          <div className={`admin-tab ${tab === "security" ? "active" : ""}`}>
            <PageTitle
              title="Bảo mật & nhật ký"
              description="Kiểm soát chế độ bảo trì, IP bị chặn và nhật ký xử lý từ backend."
              action={
                <button
                  className="admin-btn secondary"
                  onClick={loadSecurity}
                  type="button"
                >
                  <Icon name="refresh" />
                  Làm mới
                </button>
              }
            />

            <div className="admin-security-grid">
              <div className="admin-stack">
                <section className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h2>Trạng thái hệ thống</h2>
                      <p>Bật/tắt bảo trì trên toàn backend.</p>
                    </div>
                  </div>
                  <div className="admin-maintenance-row">
                    <div>
                      <strong>
                        {maintenance ? "Đang bảo trì" : "Đang hoạt động"}
                      </strong>
                      <span>
                        {maintenance
                          ? "Người dùng tạm thời bị chặn thao tác."
                          : "API đang phục vụ bình thường."}
                      </span>
                    </div>
                    <label className="admin-switch">
                      <input
                        checked={maintenance}
                        onChange={(event) =>
                          toggleMaintenance(event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span />
                    </label>
                  </div>
                </section>

                <form className="admin-card" onSubmit={addIp}>
                  <div className="admin-card-header">
                    <div>
                      <h2>Danh sách chặn IP</h2>
                      <p>Chặn các địa chỉ truy cập bất thường.</p>
                    </div>
                  </div>
                  <div className="admin-form-stack">
                    <label className="admin-field">
                      <span>Địa chỉ IP</span>
                      <input name="ip" placeholder="Ví dụ: 192.168.1.10" />
                    </label>
                    <button className="admin-btn danger" type="submit">
                      Thêm vào danh sách chặn
                    </button>
                  </div>
                  <div className="admin-ip-list">
                    {blacklist.length === 0 ? (
                      <div className="admin-empty compact">
                        Chưa có IP bị chặn.
                      </div>
                    ) : (
                      blacklist.map((ip) => (
                        <div className="admin-ip-row" key={ip}>
                          <span>{ip}</span>
                          <button onClick={() => removeIp(ip)} type="button">
                            Gỡ
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </form>
              </div>

              <section className="admin-card admin-audit-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Nhật ký xử lý</h2>
                    <p>50 sự kiện gần nhất từ backend.</p>
                  </div>
                </div>
                <div className="admin-log-list">
                  {auditLogs.length === 0 ? (
                    <div className="admin-empty">
                      Chưa có nhật ký từ server.
                    </div>
                  ) : (
                    auditLogs.map((log, index) => (
                      <article
                        className="admin-log-card"
                        key={`${log.time}-${index}`}
                      >
                        <div>
                          <strong>{log.action}</strong>
                          <span>{log.time}</span>
                        </div>
                        <p>{log.description}</p>
                        <small>{log.user_agent}</small>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {editUser && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={saveUserChanges}>
            <h3>Chỉnh sửa tài khoản</h3>
            <p className="admin-modal-note">{editUser.email}</p>

            <label className="admin-field">
              <span>Phân quyền</span>
              <select
                onChange={(event) =>
                  setEditUser((value) => ({
                    ...value,
                    role: event.target.value,
                  }))
                }
                value={editUser.role}
              >
                <option value="user">Người dùng</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Gói cước</span>
              <select
                onChange={(event) =>
                  setEditUser((value) => ({
                    ...value,
                    is_plus: event.target.value === "true",
                  }))
                }
                value={String(editUser.is_plus)}
              >
                <option value="false">Gói Free</option>
                <option value="true">Gói Plus</option>
              </select>
            </label>
            <div className="admin-modal-actions">
              <button
                className="admin-btn secondary"
                onClick={() => setEditUser(null)}
                type="button"
              >
                Hủy
              </button>
              <button className="admin-btn primary" type="submit">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal danger-modal">
            <Icon name="alert" />
            <h3>Xác nhận xóa</h3>
            <p>
              Bạn có chắc chắn muốn xóa hồ sơ tài khoản này khỏi Firestore
              không?
            </p>
            <p className="admin-delete-target">{deleteTarget.email}</p>
            <div className="admin-modal-actions">
              <button
                className="admin-btn secondary"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="admin-btn danger"
                onClick={deleteUser}
                type="button"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={createUser}>
            <h3>Tạo tài khoản mới</h3>
            <div className="admin-form-stack">
              <label className="admin-field">
                <span>Tên người dùng</span>
                <input name="username" placeholder="Ví dụ: Nguyễn Văn A" />
              </label>
              <label className="admin-field">
                <span>Email đăng nhập *</span>
                <input
                  name="email"
                  placeholder="email@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="admin-field">
                <span>Mật khẩu *</span>
                <input
                  minLength={6}
                  name="password"
                  placeholder="Ít nhất 6 ký tự"
                  required
                  type="password"
                />
              </label>
              <div className="admin-two-cols">
                <label className="admin-field">
                  <span>Phân quyền</span>
                  <select defaultValue="user" name="role">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>Gói cước</span>
                  <select defaultValue="false" name="is_plus">
                    <option value="false">Free</option>
                    <option value="true">Plus</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                className="admin-btn secondary"
                onClick={() => setAddOpen(false)}
                type="button"
              >
                Hủy
              </button>
              <button className="admin-btn primary" type="submit">
                Tạo tài khoản
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-toast-stack">
        {toasts.map((toast) => (
          <div
            className={`admin-toast ${toast.type === "error" ? "danger" : "success"}`}
            key={toast.id}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </main>
  );
}
