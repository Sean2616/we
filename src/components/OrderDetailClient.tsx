"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  QrCode,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Order } from "@/lib/types";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderDetailClient({
  initialOrder,
}: {
  initialOrder: Order;
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleConfirmPayment() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/pay`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memverifikasi pembayaran");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setPaying(false);
    }
  }

  async function copyText(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 bg-grid-pattern py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Katalog
        </Link>

        <div className="rounded-3xl bg-zinc-900/85 border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Status Banner */}
          <div
            className={`px-6 py-5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 ${
              order.status === "paid"
                ? "bg-emerald-500/10"
                : "bg-amber-500/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {order.status === "paid" ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <Clock className="w-7 h-7 text-amber-400" />
              )}
              <div>
                <div className="font-mono text-xs text-zinc-400">{order.id}</div>
                <h1 className="font-bold text-lg text-white">
                  {order.status === "paid"
                    ? "Pembayaran Lunas • Akun Terkirim"
                    : "Menunggu Pembayaran"}
                </h1>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.status === "paid"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {order.status === "paid" ? "SELESAI" : "PENDING"}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Order Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 block">Produk</span>
                <span className="font-semibold text-white text-sm">
                  {order.productName}
                </span>
                <span className="text-zinc-400 block">{order.duration}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block">Total Bayar</span>
                <span className="font-extrabold text-indigo-400 text-base">
                  {formatRupiah(order.totalPrice)}
                </span>
                <span className="text-zinc-400 block">
                  {order.quantity} akun × {formatRupiah(order.unitPrice)}
                </span>
              </div>
              <div className="pt-3 border-t border-zinc-800/80">
                <span className="text-zinc-500 block">Pembeli</span>
                <span className="text-zinc-200 font-medium">
                  {order.customerName}
                </span>
                <span className="text-zinc-400 block">{order.customerEmail}</span>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 text-right">
                <span className="text-zinc-500 block">Metode Pembayaran</span>
                <span className="text-zinc-200 font-semibold">
                  {order.paymentMethod}
                </span>
                <span className="text-zinc-400 block">{order.customerWhatsapp}</span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Pending Payment Section */}
            {order.status === "pending" && (
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6 text-center space-y-4">
                <div className="w-44 h-44 mx-auto rounded-2xl bg-white p-3 flex flex-col items-center justify-center text-zinc-900 shadow-lg">
                  <QrCode className="w-28 h-28 text-zinc-900" />
                  <span className="text-[10px] font-bold tracking-widest mt-1">
                    {order.paymentMethod} AUTO-PAY
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Scan QRIS / Transfer sebesar{" "}
                    <span className="text-indigo-400">
                      {formatRupiah(order.totalPrice)}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Mode demo/sandbox aktif: klik tombol di bawah untuk mensimulasikan
                    pembayaran sukses & memicu pengiriman akun otomatis dari stok.
                  </p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={paying}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20 disabled:opacity-60 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi & Mengirim Akun...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Konfirmasi Pembayaran (Auto Kirim Akun)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Paid & Delivered Accounts Section */}
            {order.status === "paid" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <KeyRound className="w-4 h-4" />
                  Detail Akun Premium Anda ({order.deliveredItems.length})
                </div>

                {order.deliveredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-zinc-950 border border-emerald-500/30 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                        Akun #{idx + 1}
                      </span>
                      <button
                        onClick={() => copyText(item.credentials, idx)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition cursor-pointer"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Salin
                          </>
                        )}
                      </button>
                    </div>

                    <div className="font-mono text-xs sm:text-sm bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white break-all select-all">
                      {item.credentials}
                    </div>

                    {item.note && (
                      <p className="text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">Catatan:</span>{" "}
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-2 text-xs text-zinc-400 pt-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  Simpan nomor invoice <strong className="text-white">{order.id}</strong>{" "}
                  untuk membuka ulang detail akun ini kapan saja melalui menu Lacak
                  Pesanan.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
