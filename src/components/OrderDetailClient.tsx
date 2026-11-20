"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  KeyRound,
  Loader2,
  QrCode,
  RefreshCw,
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
  qrDataUrl,
  demoAllowed,
}: {
  initialOrder: Order;
  qrDataUrl: string | null;
  demoAllowed: boolean;
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const payableAmount = order.payableAmount ?? order.totalPrice;

  // Simpan order ID ini di perangkat pembeli agar langsung terlihat di /riwayat
  useEffect(() => {
    try {
      const raw = localStorage.getItem("premstore_my_orders");
      const existing: string[] = raw ? JSON.parse(raw) : [];
      const updated = Array.from(new Set([order.id, ...existing])).slice(0, 30);
      localStorage.setItem("premstore_my_orders", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [order.id]);

  useEffect(() => {
    if (order.status !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.order && data.order.status !== order.status) {
            setOrder(data.order);
          }
        }
      } catch {
        // ignore transient polling error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [order.id, order.status]);

  async function handleCheckStatus() {
    setChecking(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) setOrder(data.order);
      }
    } finally {
      setChecking(false);
    }
  }

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
      // ignore
    }
  }

  async function copyPayableAmount() {
    try {
      await navigator.clipboard.writeText(String(payableAmount));
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen dot-bg text-zinc-900 py-5 sm:py-8 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <Link
            href="/"
            className="brutal-btn bg-white inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog
          </Link>
          <Link
            href="/riwayat"
            className="brutal-btn bg-[#8BD3DD] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900"
          >
            Riwayat Saya
          </Link>
        </div>

        <div className="brutal-card rounded-2xl bg-white overflow-hidden">
          {/* Status Banner */}
          <div
            className={`px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-zinc-900 flex flex-wrap items-center justify-between gap-3 ${
              order.status === "paid" ? "bg-[#A7F3D0]" : "bg-[#FAAE2B]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center">
                {order.status === "paid" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                ) : (
                  <Clock className="w-6 h-6 text-zinc-900" />
                )}
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-zinc-800">
                  {order.id}
                </div>
                <h1 className="font-black text-lg text-zinc-900">
                  {order.status === "paid"
                    ? "Pembayaran Lunas • Akun Terkirim"
                    : "Menunggu Pembayaran QRIS"}
                </h1>
              </div>
            </div>

            <span className="font-mono px-3 py-1 rounded-lg text-xs font-black bg-white border-2 border-zinc-900 text-zinc-900">
              {order.status === "paid" ? "SELESAI" : "PENDING"}
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Order Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 p-4 rounded-xl bg-[#f6f1e7] border-2 border-zinc-900 text-xs">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 block">
                  Produk
                </span>
                <span className="font-black text-zinc-900 text-sm">
                  {order.productName}
                </span>
                <span className="text-zinc-700 block">{order.duration}</span>
              </div>
              <div className="sm:text-right">
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 block">
                  Total Bayar (Tepat)
                </span>
                <span className="font-black text-zinc-900 text-base">
                  {formatRupiah(payableAmount)}
                </span>
                <span className="font-mono text-zinc-700 block">
                  {order.quantity} × {formatRupiah(order.unitPrice)}
                  {order.uniqueCode
                    ? ` (${
                        order.uniqueCode > 0
                          ? `+${order.uniqueCode}`
                          : order.uniqueCode
                      } kode unik)`
                    : ""}
                </span>
              </div>
              <div className="pt-3 border-t-2 border-dashed border-zinc-400">
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 block">
                  Pembeli
                </span>
                <span className="text-zinc-900 font-bold">{order.customerName}</span>
                <span className="text-zinc-700 block break-all">{order.customerEmail}</span>
              </div>
              <div className="pt-3 border-t-2 border-dashed border-zinc-400 sm:text-right">
                <span className="font-mono text-[10px] font-bold uppercase text-zinc-500 block">
                  Metode Pembayaran
                </span>
                <span className="text-zinc-900 font-bold">
                  QRIS (All-Payment)
                </span>
                <span className="text-zinc-700 block">{order.customerWhatsapp}</span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#FCA5A5] border-2 border-zinc-900 text-zinc-900 text-xs font-bold">
                {error}
              </div>
            )}

            {/* Pending Payment Section */}
            {order.status === "pending" && (
              <div className="rounded-2xl bg-[#f6f1e7] border-2 border-zinc-900 p-6 text-center space-y-4">
                {qrDataUrl ? (
                  <div className="space-y-3">
                    <div className="inline-block rounded-2xl bg-white p-3.5 brutal-card-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrDataUrl}
                        alt="QRIS GoPay Merchant Dinamis"
                        className="w-56 h-56 mx-auto"
                      />
                      <div className="font-mono text-[11px] font-black text-zinc-900 tracking-wider mt-1.5">
                        QRIS GOPAY MERCHANT • NOMINAL OTOMATIS
                      </div>
                    </div>

                    <div>
                      <a
                        href={qrDataUrl}
                        download={`QRIS-${order.id}.png`}
                        className="brutal-btn bg-white inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Gambar QRIS
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 mx-auto rounded-2xl bg-white p-3 brutal-card-sm flex flex-col items-center justify-center text-zinc-900">
                    <QrCode className="w-28 h-28 text-zinc-900" />
                    <span className="font-mono text-[10px] font-black mt-1">
                      QRIS BELUM DIATUR
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-black text-zinc-900">
                    Scan QRIS & Bayar Tepat Sebesar:
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FDE68A] border-2 border-zinc-900">
                    <span className="text-xl font-black text-zinc-900 font-mono">
                      {formatRupiah(payableAmount)}
                    </span>
                    <button
                      onClick={copyPayableAmount}
                      className="p-1.5 rounded-lg bg-white border border-zinc-900 text-zinc-900 cursor-pointer"
                      title="Salin nominal tepat"
                    >
                      {copiedAmount ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-700 max-w-md mx-auto">
                    {qrDataUrl
                      ? "Nominal sudah otomatis terisi saat QRIS di-scan (GoPay, DANA, OVO, ShopeePay, BCA, BRI, Mandiri, SeaBank). Halaman ini otomatis mendeteksi pembayaran dalam beberapa detik."
                      : "Admin belum mengisi String QRIS GoPay Merchant di /admin → Pengaturan QRIS & Telegram."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={handleCheckStatus}
                    disabled={checking}
                    className="brutal-btn bg-white px-4 py-2.5 rounded-xl text-zinc-900 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`}
                    />
                    Cek Status Pembayaran
                  </button>

                  {demoAllowed && (
                    <button
                      onClick={handleConfirmPayment}
                      disabled={paying}
                      className="brutal-btn bg-[#A7F3D0] px-5 py-2.5 rounded-xl text-zinc-900 font-black text-xs inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          Simulasi Bayar (Mode Demo)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Paid & Delivered Accounts Section */}
            {order.status === "paid" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-black">
                  <KeyRound className="w-4 h-4" />
                  Detail Akun Premium Anda ({order.deliveredItems.length})
                </div>

                {order.deliveredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#A7F3D0]/50 border-2 border-zinc-900 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-black uppercase text-zinc-900">
                        Akun #{idx + 1}
                      </span>
                      <button
                        onClick={() => copyText(item.credentials, idx)}
                        className="brutal-btn bg-white inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-900 cursor-pointer"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
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

                    <div className="font-mono text-xs sm:text-sm bg-white border-2 border-zinc-900 rounded-xl p-3 text-zinc-900 font-bold break-all select-all">
                      {item.credentials}
                    </div>

                    {item.note && (
                      <p className="text-xs text-zinc-800">
                        <span className="font-black">Catatan:</span> {item.note}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-2 text-xs text-zinc-700 pt-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-900 shrink-0" />
                  Simpan nomor invoice <strong className="font-mono text-zinc-900">{order.id}</strong>{" "}
                  untuk membuka ulang detail akun ini kapan saja lewat menu Lacak Pesanan.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
