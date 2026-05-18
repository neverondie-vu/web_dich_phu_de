// ==========================================
// 1. CẤU HÌNH FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDTYgLmLa5iFw9sNAbVKTi8xFObJR4Ed3g",
  authDomain: "autosub-a03c4.firebaseapp.com",
  projectId: "autosub-a03c4",
  storageBucket: "autosub-a03c4.firebasestorage.app",
  messagingSenderId: "440199919147",
  appId: "1:440199919147:web:fea3c01cd60650bb579c6e",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const BACKEND_URL = "http://127.0.0.1:8000";

// ==========================================
// 2. BẢO MẬT & PHÂN QUYỀN TRANG ADMIN
// ==========================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../auth/login.html"; // Trở về trang đăng nhập nếu chưa login
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      showToast("Truy cập bị từ chối! Chỉ Admin mới được vào trang này.");
      window.location.href = "../index.html"; // Đuổi về trang chủ nếu là user thường
      return;
    }

    // Đã xác thực Admin -> Gọi tất cả các hàm tải dữ liệu
    loadAdminStats();
    loadSystemLogs();
    loadUserList();
  } catch (error) {
    console.error("Lỗi xác thực quyền:", error);
  }
});

// ==========================================
// 3. TẢI THỐNG KÊ TỪ BACKEND (TAB DASHBOARD)
// ==========================================
async function loadAdminStats() {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/stats`);
    if (!response.ok) throw new Error("Không thể kết nối Backend");
    const data = await response.json();

    // Gắn số liệu vào HTML
    const totalVideosEl = document.getElementById("totalVideos");
    if (totalVideosEl) totalVideosEl.innerText = data.summary.total_videos || 0;

    // Vẽ biểu đồ Chart.js
    const ctx = document.getElementById("dailyChart");
    if (ctx) {
      const labels = data.daily.map((item) => item.date);
      const counts = data.daily.map((item) => item.count);

      new Chart(ctx.getContext("2d"), {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Số lượng Video",
              data: counts,
              borderColor: "#22d3ee", // Cyan 400
              backgroundColor: "rgba(34, 211, 238, 0.1)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: "#94a3b8" },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
          },
        },
      });
    }
  } catch (error) {
    console.error("Lỗi tải API Thống kê:", error);
  }
}

// ==========================================
// 4. TẢI CẢNH BÁO LỖI (TAB DASHBOARD)
// ==========================================
async function loadSystemLogs() {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/logs`);
    const data = await response.json();

    const container = document.getElementById("systemLogsList");
    if (!container) return;

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = `
                <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex justify-center items-center gap-2 mt-4">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span>Hệ thống hoạt động ổn định</span>
                </div>
            `;
      return;
    }

    container.innerHTML = data.logs
      .map((log) => {
        return `
                <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex justify-between items-center hover:bg-red-500/20 transition cursor-default">
                    <span class="truncate pr-4 font-medium" title="${log.message}">⚠️ ${log.message}</span> 
                    <span class="text-[10px] whitespace-nowrap opacity-70">${log.time}</span>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi tải Log:", error);
  }
}

// ==========================================
// 5. TẢI VÀ TÌM KIẾM NGƯỜI DÙNG
// ==========================================
let globalUsers = [];

async function loadUserList() {
  try {
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();

    const totalUsersEl = document.getElementById("totalUsers");
    if (totalUsersEl) totalUsersEl.innerText = snapshot.size;

    globalUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderUsers(globalUsers);
  } catch (error) {
    console.error("Lỗi tải danh sách User:", error);
    document.getElementById("userListAdmin").innerHTML =
      `<p class="text-red-400 text-sm py-4 text-center">Lỗi tải dữ liệu.</p>`;
  }
}

function renderUsers(usersList) {
  const container = document.getElementById("userListAdmin");
  if (usersList.length === 0) {
    container.innerHTML = `<p class="text-center text-slate-500 py-10">Không tìm thấy tài khoản nào phù hợp.</p>`;
    return;
  }

  container.innerHTML = usersList
    .map((u) => {
      let date = "N/A";
      if (u.createdAt) {
        date = u.createdAt.toDate
          ? u.createdAt.toDate().toLocaleDateString("vi-VN")
          : new Date(u.createdAt).toLocaleDateString("vi-VN");
      }

      const roleBadge =
        u.role === "admin"
          ? `<span class="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg ml-2">ADMIN</span>`
          : "";
      const plusBadge = u.is_plus
        ? `<span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/30">PLUS ✨</span>`
        : `<span class="px-3 py-1 bg-slate-700/50 text-slate-400 text-xs rounded-xl">FREE</span>`;

      return `
            <div class="group relative flex flex-col sm:flex-row justify-between items-center p-4 bg-[#0b1220]/50 rounded-2xl border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.03] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 mb-4 overflow-hidden">
                
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                
                <div class="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0 pl-1 sm:pl-2">
                    <div class="relative">
                        <div class="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-300 font-bold text-lg border border-cyan-400/20 ring-2 ring-transparent group-hover:ring-cyan-500/30 transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)]">
                            ${(u.username || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                    </div>
                    
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2.5">
                            <p class="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">${u.username || "Chưa cập nhật tên"}</p>
                            ${u.role === "admin" ? `<span class="px-2 py-[2px] bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 text-[9px] font-extrabold tracking-widest rounded-md border border-red-500/20 shadow-sm">ADMIN</span>` : ""}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <p class="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">${u.email}</p>
                            <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                            <p class="text-[11px] text-slate-500">Tham gia: ${date}</p>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-end pr-1 sm:pr-2">
                    ${plusBadge}
                    
                    <div class="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div> 

                    <div class="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onclick="openEditModal('${u.id}', '${u.email}', '${u.role || "user"}', ${u.is_plus || false})" 
                                class="p-2.5 bg-white/5 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 rounded-xl border border-transparent transition-all duration-200 shadow-sm" 
                                title="Chỉnh sửa">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>

                        <button onclick="deleteUser('${u.id}', '${u.email}')" 
                                class="p-2.5 bg-white/5 text-slate-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 rounded-xl border border-transparent transition-all duration-200 shadow-sm" 
                                title="Xóa người dùng">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

window.filterUsers = function () {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filteredUsers = globalUsers.filter((u) => {
    const emailMatch = u.email && u.email.toLowerCase().includes(keyword);
    const nameMatch = u.username && u.username.toLowerCase().includes(keyword);
    return emailMatch || nameMatch;
  });
  renderUsers(filteredUsers);
};

// ==========================================
// 6. XỬ LÝ MODAL CHỈNH SỬA TÀI KHOẢN
// ==========================================
window.openEditModal = function (id, email, role, isPlus) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editUserEmail").innerText = email;
  document.getElementById("editUserRole").value = role;
  document.getElementById("editUserPlan").value = isPlus ? "true" : "false";

  const modal = document.getElementById("editUserModal");
  const content = document.getElementById("editUserModalContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    content.classList.remove("scale-95");
  }, 10);
};

window.closeEditModal = function () {
  const modal = document.getElementById("editUserModal");
  const content = document.getElementById("editUserModalContent");
  modal.classList.add("opacity-0");
  content.classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
};

window.saveUserChanges = async function () {
  const id = document.getElementById("editUserId").value;
  const role = document.getElementById("editUserRole").value;
  const isPlus = document.getElementById("editUserPlan").value === "true";

  try {
    await db.collection("users").doc(id).update({
      role: role,
      is_plus: isPlus,
    });

    showToast("🎉 Cập nhật tài khoản thành công!");
    closeEditModal();
    loadUserList();
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    showToast("Cập nhật thất bại. Vui lòng thử lại!");
  }
};
// ==========================================
// 7. XÓA NGƯỜI DÙNG (DÙNG CUSTOM MODAL)
// ==========================================
window.deleteUser = function (userId, email) {
  // Đổ dữ liệu vào Modal Xóa
  document.getElementById("deleteUserId").value = userId;
  document.getElementById("deleteUserEmail").innerText = email;

  // Hiển thị Modal Xóa với hiệu ứng Fade-in
  const modal = document.getElementById("deleteUserModal");
  const content = document.getElementById("deleteUserModalContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    content.classList.remove("scale-95");
  }, 10);
};

window.closeDeleteModal = function () {
  // Ẩn Modal Xóa
  const modal = document.getElementById("deleteUserModal");
  const content = document.getElementById("deleteUserModalContent");
  modal.classList.add("opacity-0");
  content.classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
};

window.confirmDeleteUser = async function () {
  const userId = document.getElementById("deleteUserId").value;

  try {
    // Xóa document trên Firestore
    await db.collection("users").doc(userId).delete();

    // Hiện thông báo góc màn hình (Toast)
    showToast("Đã xóa người dùng thành công", "success");

    // Đóng modal và tải lại danh sách
    closeDeleteModal();
    loadUserList();
  } catch (error) {
    console.error("Lỗi khi xóa:", error);
    showToast(
      "Không thể xóa người dùng. Vui lòng kiểm tra quyền Firestore.",
      "error",
    );
  }
};
// ==========================================
// 8. HỆ THỐNG THÔNG BÁO (TOAST NOTIFICATION)
// ==========================================
window.showToast = function (message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  // Tạo một thẻ div mới
  const toast = document.createElement("div");

  // Cài đặt màu và icon dựa trên loại thông báo (success hoặc error)
  const bgColor =
    type === "success"
      ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_5px_20px_rgba(34,197,94,0.15)]"
      : "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_5px_20px_rgba(239,68,68,0.15)]";

  const icon =
    type === "success"
      ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
      : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  // Gắn class Tailwind (Thêm hiệu ứng trượt từ phải sang và mờ dần)
  toast.className = `flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md transform transition-all duration-300 translate-x-[120%] opacity-0 pointer-events-auto ${bgColor}`;
  toast.innerHTML = `${icon} <span class="font-medium text-sm tracking-wide">${message}</span>`;

  // Nhét thẻ vào khung chứa
  container.appendChild(toast);

  // Kích hoạt hiệu ứng trượt vào (Sau 10 mili-giây)
  setTimeout(() => {
    toast.classList.remove("translate-x-[120%]", "opacity-0");
  }, 10);

  // Tự động trượt ra và biến mất sau 3 giây
  setTimeout(() => {
    toast.classList.add("translate-x-[120%]", "opacity-0");
    setTimeout(() => toast.remove(), 300); // Đợi animation chạy xong rồi xóa hẳn khỏi DOM
  }, 3000);
};
// ==========================================
// 9. THÊM NGƯỜI DÙNG MỚI (TẠO TÀI KHOẢN)
// ==========================================

// Khởi tạo một Firebase App phụ để tạo User không bị văng phiên đăng nhập của Admin
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

window.openAddModal = function () {
  // Xóa sạch dữ liệu cũ trong form khi mở lên
  document.getElementById("newUserName").value = "";
  document.getElementById("newUserEmail").value = "";
  document.getElementById("newUserPassword").value = "";
  document.getElementById("newUserRole").value = "user";
  document.getElementById("newUserPlan").value = "false";

  const modal = document.getElementById("addUserModal");
  const content = document.getElementById("addUserModalContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    content.classList.remove("scale-95");
  }, 10);
};

window.closeAddModal = function () {
  const modal = document.getElementById("addUserModal");
  const content = document.getElementById("addUserModalContent");
  modal.classList.add("opacity-0");
  content.classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
};

window.createNewUser = async function () {
  const name = document.getElementById("newUserName").value.trim();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value;
  const role = document.getElementById("newUserRole").value;
  const isPlus = document.getElementById("newUserPlan").value === "true";

  // Validate (Kiểm tra dữ liệu)
  if (!email || !password) {
    showToast("Vui lòng nhập đầy đủ Email và Mật khẩu!", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Mật khẩu phải từ 6 ký tự trở lên!", "error");
    return;
  }

  try {
    // 1. Dùng App phụ tạo tài khoản trên Firebase Auth
    const userCredential = await secondaryApp
      .auth()
      .createUserWithEmailAndPassword(email, password);
    const newUserId = userCredential.user.uid;

    // 2. Đăng xuất app phụ ngay lập tức (Bảo mật)
    await secondaryApp.auth().signOut();

    // 3. Lưu thông tin User mới vào Firestore Database
    await db.collection("users").doc(newUserId).set({
      email: email,
      username: name,
      role: role,
      is_plus: isPlus,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Báo thành công, đóng form và tải lại danh sách
    showToast("Đã tạo tài khoản người dùng mới thành công!", "success");
    closeAddModal();
    loadUserList();
  } catch (error) {
    console.error("Lỗi tạo user:", error);
    if (error.code === "auth/email-already-in-use") {
      showToast("Email này đã được đăng ký từ trước!", "error");
    } else {
      showToast("Lỗi khi tạo tài khoản: " + error.message, "error");
    }
  }
};
// ==========================================
// 10. QUẢN LÝ TIẾN TRÌNH (VIDEO JOBS)
// ==========================================
async function loadVideoJobs() {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/jobs`); // API này bạn cần viết ở Backend
    const data = await response.json();

    const container = document.getElementById("jobListTable");
    if (!container) return;

    if (!data.jobs || data.jobs.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 italic">Hiện không có tiến trình nào đang chạy.</td></tr>`;
      return;
    }

    container.innerHTML = data.jobs
      .map((job) => {
        // Định nghĩa Badge cho từng trạng thái
        let statusBadge = "";
        switch (job.status) {
          case "processing":
            statusBadge = `<span class="flex items-center gap-2 text-cyan-400 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Processing</span>`;
            break;
          case "completed":
            statusBadge = `<span class="flex items-center gap-2 text-green-400 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Completed</span>`;
            break;
          case "failed":
            statusBadge = `<span class="flex items-center gap-2 text-red-400 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Failed</span>`;
            break;
          default:
            statusBadge = `<span class="flex items-center gap-2 text-slate-400 font-medium"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Pending</span>`;
        }

        return `
                <tr class="hover:bg-white/[0.01] transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">${job.filename}</span>
                            <span class="text-[10px] text-slate-500 uppercase mt-0.5">${job.file_type || "MP4"}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-400">${job.user_email || "N/A"}</td>
                    <td class="px-6 py-4 text-xs">${statusBadge}</td>
                    <td class="px-6 py-4 text-xs text-slate-500">${new Date(job.created_at).toLocaleDateString("vi-VN")}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="deleteJob('${job.id}')" class="p-2 text-slate-500 hover:text-red-400 transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi tải danh sách Job:", error);
  }
}
// ==========================================
// 11. QUẢN LÝ CẤU HÌNH HỆ THỐNG
// ==========================================
window.saveSystemConfig = async function () {
  // Thu thập dữ liệu từ các ô nhập liệu
  const whisperModel = document.getElementById("config-whisper-model").value;

  // Tạo hiệu ứng Loading trên nút bấm (Tùy chọn)
  const btn = event.currentTarget;
  const originalText = btn.innerText;
  btn.innerText = "Đang lưu...";
  btn.disabled = true;

  try {
    const response = await fetch(`${BACKEND_URL}/admin/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whisper_model: whisperModel,
        // Thêm các tham số khác ở đây
      }),
    });

    if (response.ok) {
      showToast("Cấu hình hệ thống đã được cập nhật!", "success");
    } else {
      throw new Error("Lỗi từ server");
    }
  } catch (error) {
    console.error("Lỗi lưu cấu hình:", error);
    showToast("Không thể kết nối server để lưu cấu hình.", "error");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
};
// ==========================================
// 12. QUẢN LÝ BẢO MẬT & LOGS (DỮ LIỆU THỰC)
// ==========================================

// Hàm tải nhật ký từ Server
async function loadAdminLogs() {
  const container = document.getElementById("auditLogsContainer");
  if (!container) return;

  try {
    const response = await fetch(`${BACKEND_URL}/admin/audit-logs`);
    const data = await response.json();

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = `<p class="text-slate-600 text-center py-20">Chưa có hoạt động nào được ghi nhận.</p>`;
      return;
    }

    container.innerHTML = data.logs
      .map((log) => {
        // Logic đổi màu icon dựa trên hành động
        const isDanger =
          log.action.toLowerCase().includes("delete") ||
          log.action.toLowerCase().includes("remove");
        const iconColor = isDanger
          ? "text-red-400 bg-red-400/10"
          : "text-cyan-400 bg-cyan-400/10";

        return `
                <div class="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                    <div class="p-2.5 rounded-xl ${iconColor}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20c4.42 0 8-3.582 8-8V7a2 2 0 00-2-2H6a2 2 0 00-2 2v4a10.003 10.003 0 002.613 6.643"></path></svg>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <p class="text-sm text-slate-200 leading-relaxed font-medium">${log.description}</p>
                            <span class="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-1 rounded-md ml-3">${log.time}</span>
                        </div>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">IP: ${log.ip}</span>
                            <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span class="text-[10px] text-slate-500 italic">${log.user_agent}</span>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Lỗi tải Audit Logs:", error);
    container.innerHTML = `<p class="text-red-400 text-center py-20">Lỗi kết nối Server Log.</p>`;
  }
}

// Hàm chặn IP thực tế
async function addBlacklistIP() {
  const ipInput = document.getElementById("ip-blacklist-input");
  const ip = ipInput.value.trim();

  if (!ip) {
    showToast("Vui lòng nhập địa chỉ IP", "error");
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: ip }),
    });

    if (response.ok) {
      showToast(`Đã chặn IP ${ip} thành công!`, "success");
      ipInput.value = "";
      loadAdminLogs(); // Tải lại log để thấy hành động chặn
    }
  } catch (error) {
    showToast("Lỗi khi gửi yêu cầu chặn IP", "error");
  }
}

// Hàm Bật/Tắt chế độ bảo trì
async function toggleMaintenance() {
  const toggle = document.getElementById("maintenance-toggle");
  const isEnabled = toggle.checked;

  try {
    const response = await fetch(`${BACKEND_URL}/admin/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isEnabled }),
    });

    if (response.ok) {
      showToast(
        isEnabled ? "Đã bật chế độ bảo trì!" : "Đã tắt chế độ bảo trì!",
        "success",
      );
    } else {
      throw new Error("Server error");
    }
  } catch (error) {
    // NẾU LỖI: Gạt nút ngược lại ngay lập tức
    toggle.checked = !isEnabled;
    showToast("Lỗi cập nhật trạng thái server", "error");
  }
}
async function syncMaintenanceStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/admin/system-status`);
    const data = await response.json();

    const toggle = document.getElementById("maintenance-toggle");
    if (toggle) {
      // Cập nhật trạng thái nút gạt dựa trên dữ liệu từ Server
      toggle.checked = data.maintenance_mode;
      console.log("Hệ thống đang bảo trì:", data.maintenance_mode);
    }
  } catch (error) {
    console.error("Không thể đồng bộ trạng thái bảo trì:", error);
  }
}

// Gọi hàm này trong sự kiện khởi tạo trang
auth.onAuthStateChanged((user) => {
  if (user) {
    // ... các code cũ của bạn ...
    syncMaintenanceStatus(); // Đồng bộ nút gạt ngay khi đăng nhập xong
  }
});
