import Icon from "../Icon";

export default function DeleteUserModal({ deleteTarget, onCancel, onConfirm }) {
  if (!deleteTarget) return null;

  return (
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
          <button className="admin-btn secondary" onClick={onCancel} type="button">
            Hủy
          </button>
          <button className="admin-btn danger" onClick={onConfirm} type="button">
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
}
