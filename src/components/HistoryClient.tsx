"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  History,
  KeyRound,
  Loader2,
  Search,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { Order } from "@/lib/types";

const LOCAL_ORDERS_KEY = "premstore_my_orders";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HistoryClient({ storeName }: { storeName: string }) {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [searchedLabel, setSearchedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Otomatis muat riwayat pembelian yang tersimpan di perangkat ini
  useEffect(() => {
    async function loadLocalOrders() {
      try {
        const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
        const savedIds: string[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(savedIds) && savedIds.length > 0) {
          setLoading(true);
          const res = await fetch(
            `/api/orders?ids=${encodeURIComponent(savedIds.join(","))}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders || []);
            setSearchedLabel("Riwayat pembelian di perangkat ini");
          }
        }
      } catch {
        // abaikan error localStorage
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    }
    loadLocalOrders();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mencari riwayat pesanan.");
        return;
      }
      const found: Order[] = data.orders || [];
      setOrders(found);
      setSearchedLabel(`Hasil pencarian untuk "${q}"`);

      // Simpan ID yang ditemukan ke perangkat agar kunjungan berikutnya langsung muncul
      if (found.length > 0) {
        try {
          const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
          const existing: string[] = raw ? JSON.parse(raw) : [];
          const merged = Array.from(
            new Set([...found.map((o) => o.id), ...existing])
          ).slice(0, 30);
          localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCredential(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen dot-bg text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f6f1e7]/95 backdrop-blur border-b-2 border-zinc-900">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="brutal-btn bg-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Katalog
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAAE2B] border-2 border-zinc-900 flex items-center justify-center">
              <Zap className="w-4 h-4 text-zinc-900 fill-zinc-900" />
            </div>
            <span className="font-black text-sm text-zinc-900">{storeName}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Search Hero Card */}
        <section className="brutal-card rounded-2xl bg-[#8BD3DD] p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 leading-tight">
                Riwayat Pembelian & Akun Saya
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-800 mt-1">
                Masukkan <strong>Email</strong>, <strong>No. WhatsApp</strong>, atau{" "}
                <strong>Nomor Invoice</strong> untuk melihat semua data akun premium
                yang pernah Anda beli.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email, No. WA (0812...), atau INV-..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl brutal-input text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="brutal-btn bg-[#FAAE2B] px-5 py-2.5 rounded-xl text-zinc-900 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Cari Riwayat
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-[#FCA5A5] border-2 border-zinc-900 text-zinc-900 text-xs font-bold">
              {error}
            </div>
          )}
        </section>

        {/* Results Section */}
        <section className="space-y-4">
          {searchedLabel && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-zinc-700">
                {searchedLabel} ({orders.length})
              </span>
            </div>
          )}

          {loading && !initialLoaded ? (
            <div className="brutal-card rounded-2xl bg-white p-10 text-center">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-zinc-900 mb-2" />
              <p className="text-xs font-bold text-zinc-600">
                Memuat riwayat pembelian Anda...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="brutal-card rounded-2xl bg-white p-8 sm:p-10 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto" />
              <div>
                <h2 className="font-black text-base text-zinc-900">
                  {searchedLabel
                    ? "Belum Ada Pembelian Ditemukan"
                    : "Belum Ada Riwayat di Perangkat Ini"}
                </h2>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                  {searchedLabel
                    ? "Pastikan email, nomor WhatsApp, atau nomor invoice sama persis dengan yang digunakan saat checkout."
                    : "Jika Anda pernah membeli lewat HP/browser lain, masukkan Email atau No. WhatsApp Anda pada kolom pencarian di atas."}
                </p>
              </div>
              <Link
                href="/"
                className="brutal-btn bg-[#FAAE2B] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-zinc-900"
              >
                Lihat Katalog Produk
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isPaid = order.status === "paid";
                const payable = order.payableAmount ?? order.totalPrice;

                return (
                  <div
                    key={order.id}
                    className="brutal-card rounded-2xl bg-white overflow-hidden"
                  >
                    {/* Card Header */}
                    <div
                      className={`px-4 py-3 border-b-2 border-zinc-900 flex flex-wrap items-center justify-between gap-2 ${
                        isPaid ? "bg-[#A7F3D0]" : "bg-[#FDE68A]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isPaid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-zinc-900 shrink-0" />
                        )}
                        <span className="font-mono text-xs font-black text-zinc-900">
                          {order.id}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-white border-2 border-zinc-900 text-zinc-900">
                        {isPaid ? "LUNAS • AKUN READY" : "MENUNGGU BAYAR"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-sm sm:text-base text-zinc-900">
                            {order.productName} × {order.quantity}
                          </h3>
                          <p className="font-mono text-[11px] text-zinc-600 mt-0.5">
                            Durasi: {order.duration} •{" "}
                            {new Date(order.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-black text-sm sm:text-base text-zinc-900">
                            {formatRupiah(payable)}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500">
                            QRIS Otomatis
                          </div>
                        </div>
                      </div>

                      {/* Jika LUNAS: Tampilkan Data Akun yang Dibeli */}
                      {isPaid && order.deliveredItems.length > 0 && (
                        <div className="space-y-2.5 pt-2 border-t-2 border-dashed border-zinc-300">
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                            <KeyRound className="w-3.5 h-3.5" />
                            Data Akun Premium Anda ({order.deliveredItems.length}):
                          </div>

                          {order.deliveredItems.map((item, idx) => {
                            const cKey = `${order.id}-${idx}`;
                            return (
                              <div
                                key={cKey}
                                className="rounded-xl bg-[#f6f1e7] border-2 border-zinc-900 p-3 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] font-black uppercase text-zinc-600">
                                    Akun #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyCredential(item.credentials, cKey)
                                    }
                                    className="brutal-btn bg-white inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-900 cursor-pointer"
                                  >
                                    {copiedKey === cKey ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-700" />
                                        Disalin
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        Salin
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="font-mono text-xs bg-white border-2 border-zinc-900 rounded-lg p-2.5 font-bold text-zinc-900 break-all select-all">
                                  {item.credentials}
                                </div>
                                {item.note && (
                                  <p className="text-[11px] text-zinc-700">
                                    <strong>Catatan:</strong> {item.note}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer Action */}
                      <div className="flex items-center justify-end pt-1">
                        <Link
                          href={`/order/${order.id}`}
                          className={`brutal-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-zinc-900 ${
                            isPaid ? "bg-white" : "bg-[#FAAE2B]"
                          }`}
                        >
                          {isPaid ? "Buka Detail Invoice" : "Lanjut Bayar QRIS"}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
