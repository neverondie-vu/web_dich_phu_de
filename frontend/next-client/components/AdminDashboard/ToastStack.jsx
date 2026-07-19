export default function ToastStack({ toasts }) {
  return (
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
  );
}
