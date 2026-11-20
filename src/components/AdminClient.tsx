"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import { Order, Product, ProductCategory } from "@/lib/types";

const CATEGORIES: ProductCategory[] = [
  "Streaming",
  "Music",
  "Design",
  "AI & Productivity",
  "Editing",
  "Other",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

interface AdminStats {
  totalProducts: number;
  totalAvailableStock: number;
  totalOrders: number;
  paidOrdersCount: number;
  totalRevenue: number;
}

export default function AdminClient({ storeName }: { storeName: string }) {
  const [adminKey, setAdminKey] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalAvailableStock: 0,
    totalOrders: 0,
    paidOrdersCount: 0,
    totalRevenue: 0,
  });
  const [storageMode, setStorageMode] = useState<string>("local-json");
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<"stock" | "orders">("stock");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Product Form State
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState<ProductCategory>("Streaming");
  const [pDuration, setPDuration] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pOriginalPrice, setPOriginalPrice] = useState("");
  const [pBadge, setPBadge] = useState("");
  const [pIcon, setPIcon] = useState("");
  const [pAccent, setPAccent] = useState("#6366F1");
  const [pDesc, setPDesc] = useState("");
  const [pFeatures, setPFeatures] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Bulk Stock Form State
  const [bulkLines, setBulkLines] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  function showToast(text: string, type: "ok" | "err" = "ok") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  function hydrateEditor(prod: Product | null) {
    if (!prod) {
      setPName("");
      setPCategory("Streaming");
      setPDuration("1 Bulan");
      setPPrice("");
      setPOriginalPrice("");
      setPBadge("");
      setPIcon("");
      setPAccent("#6366F1");
      setPDesc("");
      setPFeatures("Garansi Full Durasi\nAuto Kirim 24/7");
      return;
    }
    setPName(prod.name);
    setPCategory(prod.category);
    setPDuration(prod.duration);
    setPPrice(String(prod.price));
    setPOriginalPrice(prod.originalPrice ? String(prod.originalPrice) : "");
    setPBadge(prod.badge || "");
    setPIcon(prod.icon);
    setPAccent(prod.accentColor);
    setPDesc(prod.description);
    setPFeatures(prod.features.join("\n"));
  }

  async function fetchAdminState(key: string, keepSelection = true) {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/state", {
        headers: { "x-admin-key": key },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Gagal login" };
      }

      setProducts(data.products || []);
      setOrders(data.orders || []);
      setStats(data.stats);
      setStorageMode(data.storageMode);

      if (keepSelection && selectedId) {
        const found = (data.products as Product[]).find((p) => p.id === selectedId);
        if (found) {
          hydrateEditor(found);
        } else if (data.products.length > 0) {
          setSelectedId(data.products[0].id);
          hydrateEditor(data.products[0]);
        } else {
          setSelectedId(null);
          hydrateEditor(null);
        }
      } else if (data.products.length > 0) {
        setSelectedId(data.products[0].id);
        hydrateEditor(data.products[0]);
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "Koneksi gagal." };
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("premstore_admin_key");
    if (saved) {
      setAdminKey(saved);
      fetchAdminState(saved, false).then((r) => {
        if (r.ok) {
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem("premstore_admin_key");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const res = await fetchAdminState(inputPassword.trim(), false);
    setAuthLoading(false);
    if (!res.ok) {
      setAuthError(res.error || "Password salah.");
      return;
    }
    setAdminKey(inputPassword.trim());
    sessionStorage.setItem("premstore_admin_key", inputPassword.trim());
    setAuthenticated(true);
    setInputPassword("");
  }

  function handleLogout() {
    sessionStorage.removeItem("premstore_admin_key");
    setAdminKey("");
    setAuthenticated(false);
  }

  function selectProduct(prod: Product) {
    setSelectedId(prod.id);
    hydrateEditor(prod);
  }

  function startNewProduct() {
    setSelectedId(null);
    hydrateEditor(null);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          id: selectedId,
          name: pName,
          category: pCategory,
          duration: pDuration,
          price: Number(pPrice),
          originalPrice: pOriginalPrice ? Number(pOriginalPrice) : null,
          badge: pBadge,
          icon: pIcon,
          accentColor: pAccent,
          description: pDesc,
          features: pFeatures,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menyimpan produk", "err");
        return;
      }

      setSelectedId(data.savedId);
      await fetchAdminState(adminKey, false);
      const savedProd = (data.products as Product[]).find(
        (p) => p.id === data.savedId
      );
      if (savedProd) {
        setSelectedId(savedProd.id);
        hydrateEditor(savedProd);
      }
      showToast("Produk berhasil disimpan ke server!");
    } catch {
      showToast("Terjadi kesalahan jaringan", "err");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct() {
    if (!selectedId) return;
    if (!confirm("Hapus produk ini beserta seluruh stoknya?")) return;

    const res = await fetch(`/api/admin/products/${encodeURIComponent(selectedId)}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    if (!res.ok) {
      showToast("Gagal menghapus produk", "err");
      return;
    }
    setSelectedId(null);
    await fetchAdminState(adminKey, false);
    showToast("Produk berhasil dihapus.");
  }

  async function handleAddBulkStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setAddingStock(true);
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(selectedId)}/stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({ lines: bulkLines, note: bulkNote }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menambah stok", "err");
        return;
      }
      setBulkLines("");
      await fetchAdminState(adminKey, true);
      showToast(`${data.addedCount} stok akun berhasil ditambahkan!`);
    } finally {
      setAddingStock(false);
    }
  }

  async function handleDeleteStock(stockId: string) {
    if (!selectedId) return;
    const res = await fetch(
      `/api/admin/products/${encodeURIComponent(selectedId)}/stock/${encodeURIComponent(
        stockId
      )}`,
      {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      }
    );
    if (!res.ok) {
      showToast("Gagal menghapus stok", "err");
      return;
    }
    await fetchAdminState(adminKey, true);
    showToast("Stok dihapus.");
  }

  async function handleManualConfirmOrder(orderId: string) {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Gagal memproses order", "err");
      return;
    }
    await fetchAdminState(adminKey, true);
    showToast(`Order ${orderId} ditandai LUNAS & akun dikirim otomatis!`);
  }

  // LOGIN SCREEN
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 bg-grid-pattern flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-zinc-900/90 border border-zinc-800 p-7 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Panel — {storeName}</h1>
          <p className="text-xs text-zinc-400 mt-1 mb-6">
            Kelola produk, stok akun otomatis, dan pesanan langsung dari Vercel.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                ADMIN_PASSWORD
              </label>
              <input
                type="password"
                required
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Masukkan password admin..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Masuk Dashboard Admin
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <Link href="/" className="hover:text-zinc-300 inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Toko
            </Link>
            <span>Full Serverless Vercel</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 bg-grid-pattern pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-white leading-tight">
                Admin Dashboard — {storeName}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>
                  Storage:{" "}
                  <strong className="text-zinc-200">
                    {storageMode === "github-gist"
                      ? "GitHub Gist (Gratis & Permanen)"
                      : storageMode === "upstash-redis"
                      ? "Upstash Redis (Permanen)"
                      : storageMode === "local-json"
                      ? "Local JSON (Dev)"
                      : "In-Memory (Sementara)"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAdminState(adminKey, true)}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300"
            >
              Lihat Toko
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-semibold text-rose-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Warning if running on Vercel without persistent storage */}
        {storageMode === "memory" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian — Storage Sementara Aktif di Vercel:</strong>{" "}
              Agar stok & pesanan tersimpan permanen <strong>100% GRATIS tanpa kartu kredit</strong>,
              tambahkan <code>GITHUB_TOKEN</code> dan <code>GITHUB_GIST_ID</code> di
              Vercel Environment Variables (lihat panduan di README.md), lalu Redeploy.
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
              toast.type === "ok"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Total Produk</div>
            <div className="text-2xl font-extrabold text-white mt-1">
              {stats.totalProducts}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Stok Siap Kirim</div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {stats.totalAvailableStock}
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Order Lunas / Total</div>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">
              {stats.paidOrdersCount}{" "}
              <span className="text-sm font-medium text-zinc-500">
                / {stats.totalOrders}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-400">Total Omzet</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {formatRupiah(stats.totalRevenue)}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("stock")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "stock"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Package className="w-4 h-4" />
            Kelola Produk & Stok
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "orders"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Riwayat Order ({orders.length})
          </button>
        </div>

        {/* TAB 1: PRODUCTS & STOCK */}
        {activeTab === "stock" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Sidebar: Product List */}
            <div className="lg:col-span-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-white">Daftar Produk</h2>
                <button
                  onClick={startNewProduct}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Produk Baru
                </button>
              </div>

              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {products.map((prod) => {
                  const avail = prod.stock.filter(
                    (s) => s.status === "available"
                  ).length;
                  const active = prod.id === selectedId;
                  return (
                    <button
                      key={prod.id}
                      onClick={() => selectProduct(prod)}
                      className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer ${
                        active
                          ? "bg-indigo-500/15 border-indigo-500"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate">
                          {prod.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            avail > 0
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          Stok: {avail}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                        <span>
                          {prod.category} • {prod.duration}
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {formatRupiah(prod.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content: Editor & Bulk Stock */}
            <div className="lg:col-span-8 space-y-5">
              {/* Product Form */}
              <form
                onSubmit={handleSaveProduct}
                className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-sm text-white">
                    {selectedProduct
                      ? `Edit Produk: ${selectedProduct.name}`
                      : "Tambah Produk Baru"}
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={handleDeleteProduct}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingProduct ? "Menyimpan..." : "Simpan Produk"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Nama Produk
                    </label>
                    <input
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Netflix Premium 4K"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Kategori
                    </label>
                    <select
                      value={pCategory}
                      onChange={(e) =>
                        setPCategory(e.target.value as ProductCategory)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Durasi
                    </label>
                    <input
                      required
                      value={pDuration}
                      onChange={(e) => setPDuration(e.target.value)}
                      placeholder="1 Bulan (1P1U)"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Harga Jual (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      placeholder="35000"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Harga Coret (Opsional)
                    </label>
                    <input
                      type="number"
                      value={pOriginalPrice}
                      onChange={(e) => setPOriginalPrice(e.target.value)}
                      placeholder="54000"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Badge (Opsional)
                    </label>
                    <input
                      value={pBadge}
                      onChange={(e) => setPBadge(e.target.value)}
                      placeholder="Terlaris / Instant"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Kode Ikon (2-3 huruf)
                    </label>
                    <input
                      maxLength={3}
                      value={pIcon}
                      onChange={(e) => setPIcon(e.target.value)}
                      placeholder="NF"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Warna Aksen (Hex)
                    </label>
                    <input
                      value={pAccent}
                      onChange={(e) => setPAccent(e.target.value)}
                      placeholder="#E50914"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Deskripsi Singkat
                  </label>
                  <input
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Akun legal bergaransi penuh..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Fitur Unggulan (1 baris = 1 fitur)
                  </label>
                  <textarea
                    rows={3}
                    value={pFeatures}
                    onChange={(e) => setPFeatures(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </form>

              {/* Stock Manager */}
              {selectedProduct && (
                <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4">
                  <div>
                    <h2 className="font-bold text-sm text-white">
                      Stok Akun Otomatis — {selectedProduct.name}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Paste banyak akun sekaligus (1 baris = 1 stok akun yang akan
                      dikirim otomatis ke pembeli).
                    </p>
                  </div>

                  <form onSubmit={handleAddBulkStock} className="space-y-3">
                    <textarea
                      rows={4}
                      required
                      value={bulkLines}
                      onChange={(e) => setBulkLines(e.target.value)}
                      placeholder={
                        "akun1@mail.com | Pass123 | Profile 1 PIN 1234\nakun2@mail.com | Pass456 | Profile 2 PIN 5678"
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        value={bulkNote}
                        onChange={(e) => setBulkNote(e.target.value)}
                        placeholder="Catatan untuk pembeli (opsional, misal: Jangan ubah password)"
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={addingStock}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Plus className="w-4 h-4" />
                        {addingStock ? "Menambahkan..." : "Tambah Stok"}
                      </button>
                    </div>
                  </form>

                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Kredensial Akun</th>
                          <th className="py-2 pr-3">Catatan / Order</th>
                          <th className="py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {[...selectedProduct.stock]
                          .sort((a, b) => (a.status === "available" ? -1 : 1))
                          .map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 pr-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === "available"
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-amber-500/15 text-amber-300"
                                  }`}
                                >
                                  {item.status === "available"
                                    ? "READY"
                                    : "TERJUAL"}
                                </span>
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-200 break-all">
                                {item.credentials}
                              </td>
                              <td className="py-2.5 pr-3 text-zinc-400">
                                {item.orderId && (
                                  <div className="font-mono text-[11px] text-indigo-400 font-semibold">
                                    {item.orderId}
                                  </div>
                                )}
                                <div>{item.note || "-"}</div>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => handleDeleteStock(item.id)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                                  title="Hapus stok"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        {selectedProduct.stock.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-8 text-center text-zinc-500"
                            >
                              Stok kosong. Paste daftar akun pada form di atas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === "orders" && (
          <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 overflow-x-auto">
            <h2 className="font-bold text-sm text-white mb-4">
              Semua Pesanan Masuk
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                  <th className="py-2.5 pr-3">Invoice</th>
                  <th className="py-2.5 pr-3">Pembeli</th>
                  <th className="py-2.5 pr-3">Produk</th>
                  <th className="py-2.5 pr-3">Total</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-3">Akun Terkirim / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                      <Link href={`/order/${order.id}`} className="hover:underline">
                        {order.id}
                      </Link>
                      <div className="text-[10px] font-sans font-normal text-zinc-500">
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-white">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {order.customerEmail} • {order.customerWhatsapp}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="text-zinc-200 font-medium">
                        {order.productName} × {order.quantity}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {order.paymentMethod}
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-bold text-white whitespace-nowrap">
                      {formatRupiah(order.totalPrice)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {order.status === "paid" ? "LUNAS" : "PENDING"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {order.status === "paid" ? (
                        <div className="font-mono text-[11px] text-zinc-300 space-y-1">
                          {order.deliveredItems.map((d, i) => (
                            <div key={i} className="break-all">
                              {d.credentials}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleManualConfirmOrder(order.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Konfirmasi & Kirim Akun
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500">
                      Belum ada pesanan masuk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
