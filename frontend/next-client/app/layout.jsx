import "./globals.css";

export const metadata = {
  title: "AutoSub",
  description: "AutoSub SaaS subtitle generator"
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
