import Link from "next/link";
import { navGroups } from "./constants";
import Icon from "./Icon";

export default function AdminSidebar({ activeTab, onLogout, onTabChange }) {
  return (
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
                className={`admin-nav-btn ${activeTab === id ? "active" : ""}`}
                key={id}
                onClick={() => onTabChange(id)}
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
          onClick={onLogout}
          type="button"
        >
          <Icon name="logout" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
