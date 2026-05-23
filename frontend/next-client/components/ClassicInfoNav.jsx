import Link from "next/link";

const contactLinks = [
  {
    href: "mailto:Neverondie@gmail.com",
    className: "gmail",
    label: "Gửi Gmail",
    icon: (
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    ),
  },
  {
    href: "https://www.facebook.com/khuya.nang.73/about?locale=vi_VN",
    className: "facebook",
    label: "Facebook",
    icon: (
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.53 11.16 6.4 12.98 6.4c.86 0 1.76.15 1.76.15V8.5h-1c-.98 0-1.28.61-1.28 1.23V12h2.39l-.38 3h-2.01v6.8C18.56 20.87 22 16.84 22 12z" />
    ),
  },
  {
    href: "https://zalo.me/0388122528",
    className: "zalo",
    label: "Nhắn Zalo",
    icon: <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />,
  },
];

export default function ClassicInfoNav({ active = "" }) {
  return (
    <nav className="classic-nav">
      <div className="inner">
        <Link href="/" className="logo-link">
          <div className="logo">AutoSub</div>
        </Link>
        <ul>
          <li>
            <Link href="/" className={active === "home" ? "active" : ""}>
              Trang Chủ
            </Link>
          </li>
          <li>
            <Link href="/about" className={active === "about" ? "active" : ""}>
              Giới Thiệu
            </Link>
          </li>
          <li>
            <Link href="/features" className={active === "features" ? "active" : ""}>
              Tính Năng
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={active === "pricing" ? "active" : ""}>
              Bảng Giá
            </Link>
          </li>
          <li className="dropdown">
            <span className="contact-trigger">
              Liên Hệ <span className="chevron">▼</span>
            </span>
            <div className="dropdown-content">
              {contactLinks.map((item) => (
                <a key={item.href} href={item.href} className={item.className} target="_blank">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    {item.icon}
                  </svg>
                  {item.label}
                </a>
              ))}
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}
