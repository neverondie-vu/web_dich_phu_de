import Icon from "../Icon";
import { PageTitle } from "../Shared";
import { formatDate } from "../utils";

export default function UsersTab({
  active,
  filteredUsers,
  onCreateOpen,
  onDeleteUser,
  onEditUser,
  onSearchChange,
  search,
  users,
}) {
  return (
    <div className={`admin-tab ${active ? "active" : ""}`}>
      <PageTitle
        title="Quản lý người dùng"
        description="Quản lý vai trò admin/user, trạng thái gói Plus và hồ sơ thành viên."
        action={
          <button className="admin-btn primary" onClick={onCreateOpen} type="button">
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
              onChange={(event) => onSearchChange(event.target.value)}
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
                    {(user.username || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3>{user.username || "Chưa đặt tên"}</h3>
                    <p>{user.email || user.id}</p>
                    <small>Tạo ngày: {formatDate(user.createdAt)}</small>
                  </div>
                </div>
                <div className="admin-row-actions">
                  <span className="admin-pill neutral">{user.role || "user"}</span>
                  <span className={`admin-pill ${user.is_plus ? "premium" : "info"}`}>
                    {user.is_plus ? "Plus" : "Free"}
                  </span>
                  <button
                    className="admin-btn small secondary"
                    onClick={() =>
                      onEditUser({
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
                      onDeleteUser({
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
  );
}
