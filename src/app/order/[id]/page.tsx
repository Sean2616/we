import Link from "next/link";
import QRCode from "qrcode";
import { readDatabase } from "@/lib/storage";
import OrderDetailClient from "@/components/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDatabase();
  const order = db.orders.find((o) => o.id.toLowerCase() === id.toLowerCase());

  if (!order) {
    return (
      <div className="min-h-screen dot-bg text-zinc-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white brutal-card p-8 text-center">
          <h1 className="text-xl font-black text-zinc-900 mb-2">
            Invoice Tidak Ditemukan
          </h1>
          <p className="text-xs text-zinc-600 mb-6">
            Nomor invoice <span className="font-mono font-bold text-zinc-900">{id}</span> tidak
            terdaftar di sistem.
          </p>
          <Link
            href="/"
            className="brutal-btn inline-block px-5 py-2.5 rounded-xl bg-[#FAAE2B] text-zinc-900 text-sm font-black"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  let qrDataUrl: string | null = null;
  if (order.qrisPayload) {
    try {
      qrDataUrl = await QRCode.toDataURL(order.qrisPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#09090b",
          light: "#ffffff",
        },
      });
    } catch (err) {
      console.error("[QRCode render error]", err);
    }
  }

  const hasLiveQris = Boolean(
    (db.settings?.qrisStaticString || process.env.QRIS_STATIC_STRING || "").trim()
  );
  const demoAllowed =
    db.settings?.enableDemoConfirm !== undefined
      ? db.settings.enableDemoConfirm
      : !hasLiveQris;

  return (
    <OrderDetailClient
      initialOrder={order}
      qrDataUrl={qrDataUrl}
      demoAllowed={demoAllowed}
    />
  );
}
