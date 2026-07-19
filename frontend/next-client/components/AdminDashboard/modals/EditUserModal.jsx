export default function EditUserModal({
  editUser,
  onCancel,
  onChange,
  onSubmit,
}) {
  if (!editUser) return null;

  return (
    <div className="admin-modal-backdrop">
      <form className="admin-modal" onSubmit={onSubmit}>
        <h3>Chỉnh sửa tài khoản</h3>
        <p className="admin-modal-note">{editUser.email}</p>

        <label className="admin-field">
          <span>Phân quyền</span>
          <select
            onChange={(event) =>
              onChange((value) => ({
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
              onChange((value) => ({
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
          <button className="admin-btn secondary" onClick={onCancel} type="button">
            Hủy
          </button>
          <button className="admin-btn primary" type="submit">
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}
