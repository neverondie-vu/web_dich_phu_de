"use client";

import {
  createUserWithEmailAndPassword,
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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { auth, db } from "../../lib/firebase";
import { DeniedAccess, LoadingAccess } from "./AdminAccess";
import AdminSidebar from "./AdminSidebar";
import CreateUserModal from "./modals/CreateUserModal";
import DeleteUserModal from "./modals/DeleteUserModal";
import EditUserModal from "./modals/EditUserModal";
import ContentTab from "./tabs/ContentTab";
import DashboardTab from "./tabs/DashboardTab";
import SecurityTab from "./tabs/SecurityTab";
import SettingsTab from "./tabs/SettingsTab";
import UsersTab from "./tabs/UsersTab";
import ToastStack from "./ToastStack";
import { getSecondaryAuth } from "./utils";

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
  const [translationProvider, setTranslationProvider] = useState("nllb");
  const [maxStorageGb, setMaxStorageGb] = useState(100);
  const [retentionDays, setRetentionDays] = useState(20);
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

  async function handleLogout() {
    setRedirecting(true);
    await signOut(auth);
    router.replace("/auth/login");
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
        failed.reason?.message ||
        "Không tải được một phần dữ liệu quản trị.";
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
        typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
      const right =
        typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
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
    setTranslationProvider(status.translation_provider || "nllb");
    setMaxStorageGb(String(status.max_storage_gb || 100));
    setRetentionDays(String(status.retention_days || 20));
    setBlacklist(blacklistData.ips || []);
    setAuditLogs(auditData.logs || []);
  }

  async function saveConfig(event) {
    event.preventDefault();

    try {
      const result = await apiFetch("/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whisper_model: whisperModel,
          translation_provider: translationProvider,
          max_storage_gb: Number(maxStorageGb || 100),
          retention_days: Number(retentionDays || 20),
        }),
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
      const result = await apiFetch(`/admin/blacklist/${encodeURIComponent(ip)}`, {
        method: "DELETE",
      });
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
    return <LoadingAccess redirecting={redirecting} />;
  }

  if (!allowed) {
    return <DeniedAccess />;
  }

  return (
    <main className="classic-admin admin-layout">
      <AdminSidebar
        activeTab={tab}
        onLogout={handleLogout}
        onTabChange={setTab}
      />

      <section className="admin-main-panel">
        <div className="admin-content">
          {message && <div className="admin-alert danger">{message}</div>}

          <DashboardTab
            active={tab === "dashboard"}
            logs={logs}
            onRefresh={loadAll}
            stats={stats}
            totals={totals}
            users={users}
          />
          <UsersTab
            active={tab === "users"}
            filteredUsers={filteredUsers}
            onCreateOpen={() => setAddOpen(true)}
            onDeleteUser={setDeleteTarget}
            onEditUser={setEditUser}
            onSearchChange={setSearch}
            search={search}
            users={users}
          />
          <ContentTab
            active={tab === "content"}
            jobs={jobs}
            onRefresh={loadJobs}
          />
          <SettingsTab
            active={tab === "settings"}
            maxStorageGb={maxStorageGb}
            onMaxStorageChange={setMaxStorageGb}
            onRetentionDaysChange={setRetentionDays}
            onSaveConfig={saveConfig}
            onTranslationProviderChange={setTranslationProvider}
            onWhisperModelChange={setWhisperModel}
            retentionDays={retentionDays}
            translationProvider={translationProvider}
            whisperModel={whisperModel}
          />
          <SecurityTab
            active={tab === "security"}
            auditLogs={auditLogs}
            blacklist={blacklist}
            maintenance={maintenance}
            onAddIp={addIp}
            onRefresh={loadSecurity}
            onRemoveIp={removeIp}
            onToggleMaintenance={toggleMaintenance}
          />
        </div>
      </section>

      <EditUserModal
        editUser={editUser}
        onCancel={() => setEditUser(null)}
        onChange={setEditUser}
        onSubmit={saveUserChanges}
      />
      <DeleteUserModal
        deleteTarget={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteUser}
      />
      <CreateUserModal
        isOpen={addOpen}
        onCancel={() => setAddOpen(false)}
        onSubmit={createUser}
      />
      <ToastStack toasts={toasts} />
    </main>
  );
}
