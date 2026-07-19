export const navGroups = [
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

export const statusLabels = {
  completed: "Hoàn thành",
  transcribed: "Đã tạo phụ đề",
  failed: "Lỗi",
  burning: "Đang ép video",
  processing: "Đang xử lý",
  queued: "Đang chờ",
  saved: "Đã lưu",
};
