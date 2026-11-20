import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto"} — Auto Order Aplikasi Premium 24/7`,
  description:
    "Platform auto order aplikasi premium legal & bergaransi. Pengiriman akun otomatis 24/7 dengan QRIS GoPay Merchant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased dot-bg text-zinc-900">
        {children}
      </body>
    </html>
  );
}
