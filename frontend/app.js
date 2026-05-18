// ==========================================
// 1. CẤU HÌNH & KHỞI TẠO FIREBASE
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
const googleProvider = new firebase.auth.GoogleAuthProvider();

// --- BIẾN TOÀN CỤC ---
let currentSubtitles = [];
let currentJobId = null;
let currentTaskVideoFile = null;
const BACKEND_URL = "http://127.0.0.1:8000";

// ==========================================
// 2. ĐĂNG KÝ (FIX LỖI NOT DEFINED & THÊM HIỆU ỨNG)
// ==========================================
const registerForm = document.getElementById("registerForm"); // Lấy ID ngay khi load

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Lấy các phần tử giao diện để xử lý ẩn/hiện
    const statusMsg = document.getElementById("statusMsg");
    const regTitle = document.getElementById("regTitle");
    const regSub = document.getElementById("regSub");
    const btn = registerForm.querySelector("button");

    const email = registerForm["email"].value;
    const password = registerForm["password"].value;
    const username = registerForm["username"].value;

    try {
      btn.innerText = "Đang xử lý...";
      btn.disabled = true;

      // Tạo tài khoản trên Firebase
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      // Lưu thông tin vào Firestore
      await db.collection("users").doc(cred.user.uid).set({
        username: username,
        email: email,
        is_plus: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // --- HIỆU ỨNG THÀNH CÔNG GIỐNG CODE BẠN GỬI ---
      registerForm.style.display = "none"; // Ẩn form
      if (regTitle) regTitle.style.display = "none"; // Ẩn tiêu đề
      if (regSub) regSub.style.display = "none"; // Ẩn mô tả

      if (statusMsg) {
        statusMsg.style.display = "block"; // Hiện vòng tròn tích xanh
      }

      // Đợi 2 giây rồi chuyển hướng về trang chủ
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Lỗi đăng ký: " + error.message);
      btn.innerText = "Đăng Ký Ngay";
      btn.disabled = false;
    }
  });
}
// ==========================================
// 3. ĐĂNG NHẬP BẰNG EMAIL/MẬT KHẨU
// ==========================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm["email"].value;
    const password = loginForm["password"].value;

    try {
      // 1. Đăng nhập qua Firebase Auth
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Lấy thông tin user từ Firestore để kiểm tra quyền
      const userDoc = await db.collection("users").doc(user.uid).get();

      alert("Đăng nhập thành công!");

      // 3. Phân luồng chuyển hướng
      if (userDoc.exists && userDoc.data().role === "admin") {
        window.location.href = "../admin/admin.html"; // Nếu là Admin -> Vào trang quản trị
      } else {
        window.location.href = "../index.html"; // Nếu là User -> Vào trang chủ
      }
    } catch (error) {
      console.error(error);
      alert("Sai tài khoản hoặc mật khẩu!");
    }
  });
}

// ==========================================
// 4. GOOGLE LOGIN
// ==========================================
const googleBtn = document.getElementById("google-btn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      // 1. Mở popup đăng nhập Google
      const result = await auth.signInWithPopup(googleProvider);
      const user = result.user;

      // 2. Lưu hoặc cập nhật thông tin user vào Firestore
      await db
        .collection("users")
        .doc(user.uid)
        .set(
          {
            username: user.displayName,
            email: user.email,
            photoURL: user.photoURL || "",
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      // 3. Lấy lại dữ liệu để kiểm tra xem có được cấp quyền Admin không
      const userDoc = await db.collection("users").doc(user.uid).get();

      // 4. Phân luồng chuyển hướng
      if (userDoc.exists && userDoc.data().role === "admin") {
        window.location.href = "../admin/admin.html"; // Admin
      } else {
        window.location.href = "../index.html"; // User thường
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Đăng nhập Google thất bại!");
    }
  });
}

// ==========================================
// 5. GET STARTED LOGIC
// ==========================================
function initGetStartedButtons() {
  const buttons = document.querySelectorAll(".get-started-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const heroSection = document.getElementById("hero-section");
      const appToolSection = document.getElementById("app-tool");

      if (!auth.currentUser) {
        window.location.href = "login.html";
        return;
      }

      heroSection?.classList.add("hidden");
      appToolSection?.classList.remove("hidden");
      appToolSection?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/// ==========================================
// 6. AUTH STATE & DROPDOWN MENU
// ==========================================
auth.onAuthStateChanged(async (user) => {
  const authGroup = document.getElementById("auth-group");
  const heroSection = document.getElementById("hero-section");
  const appToolSection = document.getElementById("app-tool");

  if (user) {
    let userStatus = "Free";
    let isAdmin = false; // Biến kiểm tra quyền Admin

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        // Kiểm tra gói Plus
        if (userDoc.data().is_plus) {
          userStatus = "Plus ✨";
        }
        // Kiểm tra quyền Admin
        if (userDoc.data().role === "admin") {
          isAdmin = true;
        }
      }
    } catch (e) {
      console.error("Lỗi lấy thông tin gói/quyền:", e);
    }

    if (authGroup) {
      authGroup.innerHTML = `
        <div class="group relative flex items-center justify-center w-full h-full cursor-pointer">
          <div class="flex items-center gap-2 px-3 py-1 hover:bg-white/5 rounded-full transition">
            ${
              user.photoURL
                ? `<img src="${user.photoURL}" class="w-7 h-7 rounded-full border border-cyan-400/30 object-cover" />`
                : `<div class="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 text-[10px] font-bold border border-cyan-400/20">
                  ${(user.displayName || user.email).charAt(0).toUpperCase()}
                </div>`
            }
            <span class="text-cyan-300 text-xs font-semibold truncate max-w-[80px]">
              Hi, ${user.displayName || user.email.split("@")[0]}
            </span>
            <svg class="w-3 h-3 text-gray-400 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>

          <div class="absolute top-full right-0 mt-3 w-64 bg-gradient-to-br from-[#0b1220]/95 via-[#111827]/95 to-[#0f172a]/95 backdrop-blur-2xl border border-cyan-400/10 rounded-2xl shadow-[0_10px_50px_rgba(0,255,255,0.12)] p-2 opacity-0 invisible translate-y-3 scale-95 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out z-50 overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.12),transparent_40%)] pointer-events-none"></div>
            
            <div class="relative px-4 py-3 border-b border-white/5 mb-2">
              <p class="text-[10px] text-cyan-400/70 uppercase font-bold tracking-[0.25em]">Tài khoản</p>
              <p class="text-xs text-white truncate font-semibold mt-1">${user.email}</p>
            </div>
            
            <div class="relative px-4 py-3 mb-3 bg-white/[0.04] border border-white/5 rounded-xl flex justify-between items-center hover:bg-white/[0.06] transition">
              <span class="text-[10px] text-gray-400 font-medium">Gói hiện tại</span>
              <span class="text-[11px] font-bold px-2 py-1 rounded-full ${userStatus.includes("Plus") ? "bg-yellow-500/10 text-yellow-300 border border-yellow-400/20" : "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"}">${userStatus}</span>
            </div>

            <a href="app.html" class="group/item flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-cyan-500/10 rounded-xl transition-all duration-200 mb-1 text-left border border-transparent hover:border-cyan-400/10">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover/item:scale-110 transition">
                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <div class="flex flex-col">
                <span class="font-semibold text-white">Công cụ AutoSub</span>
                <span class="text-[10px] text-gray-500">Subtitle AI Dashboard</span>
              </div>
            </a>

            ${
              isAdmin
                ? `
            <a href="admin/admin.html" class="group/item flex items-center gap-3 px-4 py-3 text-xs text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 mb-1 text-left border border-transparent hover:border-red-400/10">
              <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover/item:scale-110 transition">
                <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div class="flex flex-col">
                <span class="font-semibold text-white">Trang Quản Trị</span>
                <span class="text-[10px] text-red-400">Admin Panel</span>
              </div>
            </a>
            `
                : ""
            }

            <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-transparent hover:border-red-400/10 mt-1">
              <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </div>
              <span class="font-semibold">Đăng xuất</span>
            </button>
          </div>
        </div>
      `;

      // Kích hoạt các nút khác trên trang nếu có
      setTimeout(() => {
        if (typeof initGetStartedButtons === "function") {
          initGetStartedButtons();
        }
      }, 100);
    }

    // Nếu đã thêm nút admin rời bên ngoài HTML, code này vẫn sẽ mở nút đó lên
    const adminBtnHTML = document.getElementById("adminBtn");
    if (adminBtnHTML && isAdmin) {
      adminBtnHTML.classList.remove("hidden");
      adminBtnHTML.classList.add("inline-flex", "items-center", "gap-2");
    }

    if (heroSection && appToolSection) {
      heroSection.classList.add("hidden");
      appToolSection.classList.remove("hidden");
    }
  } else {
    if (heroSection && appToolSection) {
      heroSection.classList.remove("hidden");
      appToolSection.classList.add("hidden");
    }

    const currentPage = window.location.pathname;
    if (currentPage.includes("app.html")) {
      window.location.href = "index.html";
    }
  }
});
// ==========================================
// 7. LOGOUT
// ==========================================
async function logout() {
  if (!confirm("Bạn muốn đăng xuất?")) return;
  try {
    await auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error(error);
  }
}
window.logout = logout;

// ==========================================
// 8. KHỞI TẠO CÁC SỰ KIỆN GIAO DIỆN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initGetStartedButtons();

  // Tạo Thumbnail khi chọn video
  const videoInput = document.getElementById("videoFile");
  const uploadDefaultUI = document.getElementById("uploadDefaultUI");
  const uploadThumbnailUI = document.getElementById("uploadThumbnailUI");
  const videoThumbnail = document.getElementById("videoThumbnail");
  const fileNameOverlay = document.getElementById("fileNameOverlay");
  const nameDisplay = document.getElementById("fileNameDisplay");

  if (videoInput) {
    videoInput.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        const file = this.files[0];

        // Cập nhật tên file
        if (fileNameOverlay) fileNameOverlay.textContent = file.name;

        // Tạo URL giả lập để đọc video
        const fileURL = URL.createObjectURL(file);

        // Tạo thẻ video ảo để lấy khung hình
        const video = document.createElement("video");
        video.src = fileURL;
        video.muted = true;
        video.crossOrigin = "anonymous";

        // Khi video load xong metadata
        video.addEventListener("loadeddata", () => {
          // Tua đến giây thứ 1 (tránh bị lấy màn hình đen xì ở giây 0)
          video.currentTime = video.duration > 1 ? 1 : 0.1;
        });

        // Khi tua xong, vẽ lên canvas và ép ra ảnh
        video.addEventListener("seeked", () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Xuất ra dạng ảnh base64
          const thumbnailUrl = canvas.toDataURL("image/jpeg");

          // Gắn vào thẻ img trên giao diện
          if (videoThumbnail) videoThumbnail.src = thumbnailUrl;

          // Ẩn UI cũ, hiện UI Thumbnail
          if (uploadDefaultUI) uploadDefaultUI.classList.add("hidden");
          if (uploadThumbnailUI) uploadThumbnailUI.classList.remove("hidden");

          // Xóa URL giả lập để giải phóng bộ nhớ
          URL.revokeObjectURL(fileURL);
        });

        // Nếu lỗi không đọc được video
        video.addEventListener("error", () => {
          if (nameDisplay) {
            nameDisplay.textContent = file.name;
            nameDisplay.classList.add("text-cyan-400");
          }
        });
      } else {
        // Hủy chọn -> Trả về giao diện mặc định
        if (uploadDefaultUI) uploadDefaultUI.classList.remove("hidden");
        if (uploadThumbnailUI) uploadThumbnailUI.classList.add("hidden");
        if (nameDisplay) {
          nameDisplay.textContent = "Click để chọn hoặc kéo thả";
          nameDisplay.classList.remove("text-cyan-400");
        }
      }
    });
  }
});

// ==========================================
// 9. BIẾN QUẢN LÝ HÀNG ĐỢI (MỚI)
// ==========================================
let globalQueue = [];
let isSystemBusy = false;

// CHÈN HÀM NÀY VÀO ĐÂY ĐỂ TRÁNH LỖI "NOT DEFINED"
function addToQueue(filename, jobId, statusType) {
  const queue = document.getElementById("videoQueue");
  if (!queue) return;

  const emptyMsg = queue.querySelector("p.italic");
  if (emptyMsg) queue.innerHTML = "";

  let item = document.getElementById(`queue-${jobId}`);
  if (!item) {
    item = document.createElement("div");
    item.id = `queue-${jobId}`;
    item.className =
      "p-4 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-3 transition-all";
    queue.prepend(item);
  }

  let statusBadge =
    statusType === "waiting"
      ? `<span class="text-[9px] font-bold px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-400/20">Waiting</span>`
      : `<span class="text-[9px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-400/20">Processing</span>`;

  if (statusType !== "waiting") item.classList.add("animate-pulse");

  item.innerHTML = `
    <div class="flex justify-between items-center">
      <span class="text-xs font-medium truncate max-w-[150px] text-cyan-100">${filename}</span>
      ${statusBadge}
    </div>
    <div class="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
      <div class="bg-gradient-to-r from-cyan-400 to-blue-500 h-full w-1/3"></div>
    </div>`;
}

// ==========================================
// 10. UPLOAD VÀ VÀO HÀNG ĐỢI
// ==========================================
const uploadForm = document.getElementById("uploadForm");
const statusText = document.getElementById("statusText");
const submitBtn = document.getElementById("submitBtn");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("videoFile").files[0];
    if (!fileInput) return alert("Vui lòng chọn video!");

    const formData = new FormData();
    formData.append("file", fileInput);
    formData.append(
      "src_language",
      document.getElementById("srcLanguage").value,
    );
    formData.append(
      "subtitle_position_y",
      document.getElementById("posY").value,
    );
    formData.append(
      "background_opacity",
      document.getElementById("opacity").value,
    );
    if (auth.currentUser) formData.append("user_id", auth.currentUser.uid);

    // Tạo ID giao diện giả cho Hàng đợi
    const fakeJobId = "queue_" + Date.now();
    addToQueue(fileInput.name, fakeJobId, "waiting");

    // Đẩy vào hàng chờ
    globalQueue.push({
      formData: formData,
      fileName: fileInput.name,
      fakeId: fakeJobId,
      videoFile: fileInput, // Lưu lại file gốc để preview
    });

    // Reset lại ô Upload để chọn video khác
    document.getElementById("uploadForm").reset();
    document.getElementById("fileNameDisplay").textContent =
      "Click để chọn hoặc kéo thả";
    if (document.getElementById("uploadThumbnailUI")) {
      document.getElementById("uploadThumbnailUI").classList.add("hidden");
      document.getElementById("uploadDefaultUI").classList.remove("hidden");
    }

    // Nếu hệ thống đang rảnh, kích hoạt chạy luôn
    if (!isSystemBusy) {
      processNextInQueue();
    } else {
      alert(
        `Đã thêm "${fileInput.name}" vào hàng đợi. Sẽ tự động phân tích sau khi video trước xử lý xong!`,
      );
    }
  });
}

// ==========================================
// 11. HÀM CHẠY HÀNG ĐỢI TUẦN TỰ
// ==========================================
async function processNextInQueue() {
  if (globalQueue.length === 0) {
    isSystemBusy = false;
    if (statusText)
      statusText.textContent = "Hệ thống rảnh rỗi. Sẵn sàng nhận video mới.";
    return;
  }

  isSystemBusy = true;
  const task = globalQueue.shift();
  document.getElementById(`queue-${task.fakeId}`)?.remove();

  // --- PHẦN CẬP NHẬT MỚI: HIỆN TRẠNG THÁI CHỜ TRÊN VIDEO ---
  const previewVideo = document.getElementById("previewVideo");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const statusLabel = document.getElementById("statusText");

  if (loadingOverlay) {
    loadingOverlay.classList.remove("hidden"); // Hiện màn hình xoay
    // Cập nhật dòng chữ trong overlay (nếu bạn có thẻ span thông báo trong đó)
    const overlayText = loadingOverlay.querySelector("span:last-child");
    if (overlayText) overlayText.textContent = "AI đang phân tích âm thanh...";
  }

  if (previewVideo) {
    previewVideo.src = ""; // Xóa video cũ/gốc để tránh gây nhầm lẫn
    previewVideo.poster = ""; // Xóa ảnh bìa nếu có
  }

  if (statusLabel) statusLabel.textContent = `Đang xử lý: ${task.fileName}...`;
  // -------------------------------------------------------

  try {
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: task.formData,
    });
    const data = await res.json();

    if (data.job_id) {
      currentJobId = data.job_id;
      addToQueue(task.fileName, data.job_id, "processing");

      // Vẫn giữ lại File để dùng sau khi AI xong giai đoạn 1
      currentTaskVideoFile = task.videoFile;

      checkStatus(data.job_id);
    }
  } catch (err) {
    isSystemBusy = false;
    if (loadingOverlay) loadingOverlay.classList.add("hidden");
    processNextInQueue();
  }
}
// ==========================================
// 12. KIỂM TRA TRẠNG THÁI AI (GIAI ĐOẠN 1)
// ==========================================
async function checkStatus(job_id) {
  const timer = setInterval(async () => {
    const res = await fetch(`${BACKEND_URL}/api/status/${job_id}`);
    const data = await res.json();

    if (data.status === "transcribed" || data.status === "completed") {
      clearInterval(timer);
      updateQueueStatus(job_id, "completed");

      // --- PHẦN CẬP NHẬT MỚI: HIỆN VIDEO KHI AI XONG ---
      const loadingOverlay = document.getElementById("loadingOverlay");
      const previewVideo = document.getElementById("previewVideo");

      if (loadingOverlay) loadingOverlay.classList.add("hidden"); // Tắt màn hình xoay

      if (previewVideo && currentTaskVideoFile) {
        previewVideo.src = URL.createObjectURL(currentTaskVideoFile); // Hiện video gốc để bắt đầu sửa
      }
      // ------------------------------------------------

      if (data.subtitles) {
        currentSubtitles = data.subtitles;
        renderSubtitleEditor(data.subtitles);
        document.getElementById("burnVideoBtn")?.classList.remove("hidden");
      }
    }
  }, 3000);
}

// ==========================================
// 13. ÉP VIDEO & XỬ LÝ SAU KHI ÉP XONG
// ==========================================
const burnVideoBtn = document.getElementById("burnVideoBtn");
if (burnVideoBtn) {
  burnVideoBtn.addEventListener("click", async () => {
    if (!currentJobId) return;
    if (statusText) statusText.textContent = "Đang ép phụ đề cứng vào video...";

    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) loadingOverlay.classList.remove("hidden");

    try {
      const response = await fetch(`${BACKEND_URL}/api/burn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: currentJobId,
          subtitles: currentSubtitles,
        }),
      });
      const data = await response.json();
      if (data.job_id) checkFinalStatus(data.job_id);
    } catch (error) {
      console.error(error);
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  });
}

// Kiểm tra khi đang ép video
async function checkFinalStatus(job_id) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status/${job_id}`);
      const data = await res.json();

      if (data.status === "completed") {
        clearInterval(interval);

        const loadingOverlay = document.getElementById("loadingOverlay");
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        if (statusText)
          statusText.textContent =
            "✅ Đã ép xong! Bạn có thể xem lại hoặc tải xuống.";

        // 1. CẬP NHẬT TRÌNH PHÁT VIDEO BẰNG VIDEO ĐÃ ÉP
        const previewVideo = document.getElementById("previewVideo");
        const hardsubUrl = `${BACKEND_URL}/api/download/${job_id}`;
        if (previewVideo) {
          previewVideo.src = hardsubUrl;
          previewVideo.play();
        }

        // 2. XÓA SẠCH PHÂN ĐOẠN PHỤ ĐỀ CŨ VÀ HIỂN THỊ NÚT TẢI
        const listContainer = document.getElementById("subtitleList");
        if (listContainer) {
          listContainer.innerHTML = `
              <div class="flex flex-col items-center justify-center p-8 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-center gap-4">
                 <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                 </div>
                 <div>
                    <h3 class="text-cyan-400 font-bold uppercase tracking-widest mb-1">Dự án hoàn tất</h3>
                    <p class="text-xs text-slate-400">Video đã được ép cứng phụ đề thành công.</p>
                 </div>
                 <a href="${hardsubUrl}" download target="_blank" class="w-full text-center bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all">
                    ↓ TẢI VIDEO XUỐNG
                 </a>
              </div>
            `;
          document.getElementById("subCount").textContent = "Hoàn thành";
        }

        // Ẩn nút Ép và SRT đi
        document.getElementById("exportSrtBtn")?.classList.add("hidden");
        document.getElementById("burnVideoBtn")?.classList.add("hidden");

        // 3. MỞ KHÓA HỆ THỐNG VÀ CHẠY TIẾP VIDEO TRONG HÀNG ĐỢI
        processNextInQueue();
      } else if (data.status === "failed") {
        clearInterval(interval);
        const loadingOverlay = document.getElementById("loadingOverlay");
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        processNextInQueue(); // Lỗi cũng chạy tiếp cái sau
      }
    } catch (error) {
      console.error(error);
    }
  }, 3000);
}

// ==========================================
// 14. CÁC HÀM GIAO DIỆN & TIỆN ÍCH HỖ TRỢ (FIXED)
// ==========================================

// Hàm nạp danh sách phụ đề vào Editor cho người dùng sửa
function renderSubtitleEditor(subtitles) {
  const listContainer = document.getElementById("subtitleList");
  const subCount = document.getElementById("subCount");
  if (!listContainer) return;

  listContainer.innerHTML = "";
  subCount.textContent = `${subtitles.length} segments`;

  subtitles.forEach((sub, index) => {
    const item = document.createElement("div");
    item.className =
      "p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyan-500/30 transition-all group";
    item.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <span class="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
          ${sub.start} ➔ ${sub.end}
        </span>
        <span class="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">#${index + 1}</span>
      </div>
      <textarea 
        class="w-full bg-slate-950/50 border border-white/5 rounded-xl p-3 text-xs text-slate-300 focus:text-white focus:border-cyan-500/50 outline-none transition-all resize-none overflow-hidden custom-scrollbar"
        rows="2"
        oninput="this.style.height = '';this.style.height = this.scrollHeight + 'px'; updateSubText(${index}, this.value)"
      >${sub.text}</textarea>
    `;
    listContainer.appendChild(item);
  });
}

// Cập nhật text phụ đề khi người dùng gõ
window.updateSubText = (index, newText) => {
  if (currentSubtitles[index]) {
    currentSubtitles[index].text = newText;
  }
};

// Cập nhật trạng thái trong Hàng đợi UI
function updateQueueStatus(jobId, status) {
  const item = document.getElementById(`queue-${jobId}`);
  if (!item) return;

  if (status === "completed") {
    item.classList.remove("animate-pulse");
    item.innerHTML = `
      <div class="flex justify-between items-center text-green-400">
        <span class="text-xs font-bold uppercase"> Hoàn tất</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      </div>`;
    setTimeout(() => {
      item.style.opacity = "0.5";
    }, 2000);
  } else if (status === "failed") {
    item.classList.remove("animate-pulse");
    item.innerHTML = `<span class="text-xs text-red-400 font-bold uppercase">! Thất bại</span>`;
  }
}

// Hàm xuất file SRT nếu người dùng cần
const exportSrtBtn = document.getElementById("exportSrtBtn");
if (exportSrtBtn) {
  exportSrtBtn.addEventListener("click", () => {
    if (!currentSubtitles.length) return;
    let srtContent = "";
    currentSubtitles.forEach((sub, i) => {
      srtContent += `${i + 1}\n${sub.start.replace(".", ",")} --> ${sub.end.replace(".", ",")}\n${sub.text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitle_${currentJobId || "export"}.srt`;
    a.click();
  });
}

// --- LOGIC KHO LƯU TRỮ ---

window.openArchiveModal = function () {
  document.getElementById("archiveModal").classList.remove("hidden");
  loadArchiveData();
};

window.closeArchiveModal = function () {
  document.getElementById("archiveModal").classList.add("hidden");
};

async function loadArchiveData() {
  const container = document.getElementById("archiveList");
  container.innerHTML = `<p class="text-xs text-center text-slate-500 py-10">Đang lục lại kho lưu trữ...</p>`;

  if (!auth.currentUser) {
    container.innerHTML = `<p class="text-xs text-center text-red-400">Bạn cần đăng nhập!</p>`;
    return;
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/archive/${auth.currentUser.uid}`,
    );
    const jobs = await res.json();

    if (jobs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 opacity-30">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          <p class="text-xs font-bold uppercase tracking-widest">Kho đang trống</p>
        </div>`;
      return;
    }

    container.innerHTML = jobs
      .map(
        (job) => `
      <div class="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
        <div class="min-w-0">
          <p class="text-sm font-bold text-white truncate pr-4">${job.filename}</p>
          <p class="text-[10px] text-slate-500 mt-1 font-mono">${job.created_at}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <a href="${BACKEND_URL}/api/download_srt/${job.job_id}" target="_blank" class="px-4 py-2 bg-slate-800 text-cyan-400 text-[9px] font-black uppercase rounded-xl border border-cyan-500/20 hover:bg-slate-700 transition">SRT</a>
          <a href="${BACKEND_URL}/api/download/${job.job_id}" target="_blank" class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:scale-105 transition shadow-lg shadow-cyan-500/20">MP4</a>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    container.innerHTML = `<p class="text-xs text-center text-red-400">Lỗi kết nối máy chủ!</p>`;
  }
}
