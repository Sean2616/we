import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto"} — Auto Order Aplikasi Premium 24/7`,
  description:
    "Platform auto order aplikasi premium legal & bergaransi. Pengiriman akun otomatis 24/7 dengan stok real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
