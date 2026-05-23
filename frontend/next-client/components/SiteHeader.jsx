"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/about", label: "Giới thiệu" },
  { href: "/features", label: "Tính năng" },
  { href: "/pricing", label: "Bảng giá" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        setIsAdmin(snapshot.exists() && snapshot.data().role === "admin");
      } catch {
        setIsAdmin(false);
      }
    });
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <header className="site-header site-shell">
      <Link className="brand" href="/">
        <span className="brand-mark">▶</span>
        <span>
          Auto<span className="brand-accent">Sub</span>
        </span>
      </Link>

      <nav className="main-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        {user ? (
          <>
            <Link className="btn-secondary" href="/app">
              Công cụ
            </Link>
            {isAdmin && (
              <Link className="btn-secondary" href="/admin">
                Admin
              </Link>
            )}
            <button className="btn-ghost" onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link className="btn-ghost" href="/auth/login">
              Đăng nhập
            </Link>
            <Link className="btn" href="/auth/register">
              Bắt đầu
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
