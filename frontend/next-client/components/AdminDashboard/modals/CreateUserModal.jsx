export default function CreateUserModal({ isOpen, onCancel, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-backdrop">
      <form className="admin-modal" onSubmit={onSubmit}>
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
          <button className="admin-btn secondary" onClick={onCancel} type="button">
            Hủy
          </button>
          <button className="admin-btn primary" type="submit">
            Tạo tài khoản
          </button>
        </div>
      </form>
    </div>
  );
}
