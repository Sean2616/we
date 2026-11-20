"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Order, PaymentMethod, ProductCategory, PublicProduct } from "@/lib/types";

interface StorefrontClientProps {
  initialProducts: PublicProduct[];
  initialStats: {
    totalProducts: number;
    totalAvailableStock: number;
    totalCompletedOrders: number;
  };
  initialLastSyncedAt: string | null;
  storeName: string;
  whatsappAdmin: string;
}

const CATEGORIES: Array<"Semua" | ProductCategory> = [
  "Semua",
  "Streaming",
  "Music",
  "Design",
  "AI & Productivity",
  "Editing",
  "Other",
];

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; desc: string }> = [
  { id: "QRIS", label: "QRIS (Semua E-Wallet & Bank)", desc: "Proses otomatis 1 detik" },
  { id: "DANA", label: "DANA", desc: "Transfer saldo DANA" },
  { id: "OVO", label: "OVO", desc: "Transfer saldo OVO" },
  { id: "GoPay", label: "GoPay", desc: "Transfer saldo GoPay" },
  { id: "BCA", label: "Transfer BCA", desc: "Verifikasi instan" },
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StorefrontClient({
  initialProducts,
  initialStats,
  initialLastSyncedAt,
  storeName,
  whatsappAdmin,
}: StorefrontClientProps) {
  const router = useRouter();

  const [products, setProducts] = useState<PublicProduct[]>(initialProducts);
  const [stats, setStats] = useState(initialStats);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | ProductCategory>("Semua");

  // Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Order Tracker Modal State
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerResults, setTrackerResults] = useState<Order[] | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "Semua" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  async function refreshStock() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setStats(data.stats);
        setLastSyncedAt(data.lastSyncedAt);
      }
    } finally {
      setRefreshing(false);
    }
  }

  function openCheckout(product: PublicProduct) {
    setSelectedProduct(product);
    setQuantity(1);
    setCheckoutError(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
          customerName,
          customerEmail,
          customerWhatsapp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Gagal membuat pesanan");
        return;
      }

      router.push(`/order/${data.order.id}`);
    } catch {
      setCheckoutError("Koneksi bermasalah. Silakan coba lagi.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackerQuery.trim()) return;

    setTrackerLoading(true);
    setTrackerError(null);
    try {
      const res = await fetch(
        `/api/orders?q=${encodeURIComponent(trackerQuery.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setTrackerError(data.error || "Gagal mencari pesanan");
        setTrackerResults(null);
        return;
      }
      setTrackerResults(data.orders || []);
    } catch {
      setTrackerError("Terjadi kesalahan jaringan.");
    } finally {
      setTrackerLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 bg-grid-pattern relative overflow-x-hidden">
      {/* Subtle Top Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-indigo-600/15 blur-[130px] rounded-full" />

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-none">
                {storeName}
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Delivery Online 24/7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={refreshStock}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
              title="Refresh stok terbaru"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Stok</span>
            </button>

            <button
              onClick={() => {
                setTrackerOpen(true);
                setTrackerResults(null);
                setTrackerError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Lacak Pesanan
            </button>

            <a
              href={`https://wa.me/${whatsappAdmin}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition"
            >
              Bantuan WA
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 relative z-10">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Stok Real-Time Tersinkronisasi Otomatis • Pengiriman Detik Itu Juga
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Auto Order Aplikasi Premium{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Instan & Bergaransi
            </span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Pilih aplikasi favoritmu, bayar via QRIS atau E-Wallet, dan detail akun
            premium langsung tampil otomatis di layar dalam hitungan detik tanpa antre
            admin.
          </p>

          {/* Stats Strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 max-w-xl mx-auto">
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-3.5 backdrop-blur">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {stats.totalProducts}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Layanan Tersedia
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-3.5 backdrop-blur">
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                {stats.totalAvailableStock}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Stok Siap Kirim
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-3.5 backdrop-blur">
              <div className="text-xl sm:text-2xl font-bold text-indigo-400">
                {stats.totalCompletedOrders + 128}
              </div>
              <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Order Terkirim
              </div>
            </div>
          </div>

          {lastSyncedAt && (
            <p className="text-[11px] text-zinc-500 mt-4 flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3" />
              Sinkronisasi stok terakhir:{" "}
              {new Date(lastSyncedAt).toLocaleString("id-ID")}
            </p>
          )}
        </section>

        {/* Search & Category Filter */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                      : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Netflix, Spotify, Canva..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </section>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-zinc-800/80 bg-zinc-900/40">
            <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium">Produk tidak ditemukan</p>
            <p className="text-xs text-zinc-500 mt-1">
              Coba kata kunci atau kategori lain.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const outOfStock = product.stockCount <= 0;
              const lowStock = product.stockCount > 0 && product.stockCount <= 2;
              const discountPct =
                product.originalPrice && product.originalPrice > product.price
                  ? Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100
                    )
                  : null;

              return (
                <div
                  key={product.id}
                  className="group relative rounded-3xl bg-zinc-900/75 border border-zinc-800/90 hover:border-zinc-700 p-5 flex flex-col justify-between transition duration-200 hover:-translate-y-0.5 shadow-xl shadow-black/20 overflow-hidden"
                >
                  {/* Accent Top Bar */}
                  <div
                    className="absolute top-0 inset-x-0 h-1 opacity-80"
                    style={{ backgroundColor: product.accentColor }}
                  />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shadow-lg shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${product.accentColor}, #18181b)`,
                          }}
                        >
                          {product.icon}
                        </div>
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                            {product.category}
                          </span>
                          <h3 className="font-bold text-base text-white leading-snug">
                            {product.name}
                          </h3>
                          <span className="text-xs text-zinc-400">
                            Durasi: {product.duration}
                          </span>
                        </div>
                      </div>

                      {product.badge && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      {product.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-1.5 mb-5">
                      {product.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-xs text-zinc-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer / Price & CTA */}
                  <div className="pt-4 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-extrabold text-white">
                            {formatRupiah(product.price)}
                          </span>
                          {discountPct && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {product.originalPrice && (
                          <span className="text-xs text-zinc-500 line-through">
                            {formatRupiah(product.originalPrice)}
                          </span>
                        )}
                      </div>

                      {/* Stock Indicator */}
                      <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                          outOfStock
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : lowStock
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                        }`}
                      >
                        {outOfStock
                          ? "Stok Habis"
                          : `Stok: ${product.stockCount}`}
                      </div>
                    </div>

                    <button
                      disabled={outOfStock}
                      onClick={() => openCheckout(product)}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                        outOfStock
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {outOfStock ? "Stok Sedang Kosong" : "Beli Otomatis"}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Trust Badges */}
        <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">Kirim Otomatis 24/7</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Begitu pembayaran terkonfirmasi, akun langsung tampil otomatis tanpa
                menunggu admin.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">Garansi Full Durasi</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Semua akun dicek sebelum masuk stok dan dilindungi garansi penggantian
                bila terkendala.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">Pembayaran Lengkap</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Mendukung QRIS all-payment, DANA, OVO, GoPay, dan transfer bank lokal.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {storeName}. Powered by Next.js + Local Stock Sync
        Server.
      </footer>

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  Checkout Auto Order
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedProduct.name} • {selectedProduct.duration}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCheckoutSubmit}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {checkoutError}
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-xs font-semibold text-white">Jumlah Akun</div>
                  <div className="text-[11px] text-zinc-400">
                    Stok tersedia: {selectedProduct.stockCount}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(selectedProduct.stockCount, q + 1))
                    }
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    No. WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Email (untuk arsip & lacak invoice)
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? "bg-indigo-500/15 border-indigo-500 text-white"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="text-xs font-bold">{pm.label}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {pm.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400">Total Pembayaran</div>
                  <div className="text-lg font-extrabold text-white">
                    {formatRupiah(selectedProduct.price * quantity)}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 transition disabled:opacity-60 cursor-pointer"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Buat Invoice
                      <Zap className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Tracker Modal */}
      {trackerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Lacak Pesanan</h3>
              <button
                onClick={() => setTrackerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleTrackOrder} className="flex gap-2 mb-4">
                <input
                  type="text"
                  required
                  value={trackerQuery}
                  onChange={(e) => setTrackerQuery(e.target.value)}
                  placeholder="No. Invoice (INV-...) atau Email"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={trackerLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
                >
                  {trackerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Cari"
                  )}
                </button>
              </form>

              {trackerError && (
                <p className="text-xs text-rose-400 mb-3">{trackerError}</p>
              )}

              {trackerResults && trackerResults.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6">
                  Pesanan tidak ditemukan. Pastikan nomor invoice atau email benar.
                </p>
              )}

              {trackerResults && trackerResults.length > 0 && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {trackerResults.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => router.push(`/order/${order.id}`)}
                      className="w-full p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {order.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {order.status === "paid" ? "LUNAS" : "MENUNGGU BAYAR"}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {order.productName} × {order.quantity}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {formatRupiah(order.totalPrice)} •{" "}
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
