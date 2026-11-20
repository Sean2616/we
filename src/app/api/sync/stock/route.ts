import { NextResponse } from "next/server";
import {
  getStorageMode,
  readDatabase,
  verifySyncApiKey,
  writeDatabase,
} from "@/lib/storage";
import { Product, SyncPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifySyncApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: SYNC_API_KEY tidak valid" },
      { status: 401 }
    );
  }

  try {
    const db = await readDatabase();
    return NextResponse.json({
      ok: true,
      storageMode: getStorageMode(),
      lastSyncedAt: db.lastSyncedAt,
      products: db.products,
      orders: db.orders,
    });
  } catch (error) {
    console.error("[API /sync/stock GET]", error);
    return NextResponse.json(
      { error: "Gagal membaca database untuk sync" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifySyncApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: SYNC_API_KEY tidak valid" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as SyncPayload;
    if (!Array.isArray(body.products)) {
      return NextResponse.json(
        { error: "Payload tidak valid: field 'products' harus berupa array." },
        { status: 400 }
      );
    }

    const db = await readDatabase();
    const now = new Date().toISOString();
    const mode = body.mode || "merge";

    // Preserve already-sold stock items on remote so a local push doesn't accidentally re-sell them
    const remoteSoldMap = new Map<string, { orderId?: string; soldAt?: string }>();
    for (const prod of db.products) {
      for (const item of prod.stock) {
        if (item.status === "sold") {
          remoteSoldMap.set(item.id, {
            orderId: item.orderId,
            soldAt: item.soldAt,
          });
        }
      }
    }

    const sanitizedProducts: Product[] = body.products.map((p) => ({
      ...p,
      updatedAt: now,
      stock: Array.isArray(p.stock)
        ? p.stock.map((item) => {
            const alreadySold = remoteSoldMap.get(item.id);
            if (mode === "merge" && alreadySold) {
              return {
                ...item,
                status: "sold" as const,
                orderId: alreadySold.orderId,
                soldAt: alreadySold.soldAt,
              };
            }
            return item;
          })
        : [],
    }));

    db.products = sanitizedProducts;
    db.lastSyncedAt = now;
    await writeDatabase(db);

    const totalAvailable = db.products.reduce(
      (sum, p) => sum + p.stock.filter((s) => s.status === "available").length,
      0
    );

    const storageMode = getStorageMode();
    return NextResponse.json({
      ok: true,
      message: `Sync berhasil! ${db.products.length} produk & ${totalAvailable} stok aktif diperbarui.`,
      syncedAt: now,
      storageMode,
      warning:
        storageMode === "memory"
          ? "Vercel sedang menggunakan in-memory storage. Tambahkan UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN di Vercel Environment Variables agar stok tersimpan permanen."
          : undefined,
      stats: {
        totalProducts: db.products.length,
        totalAvailableStock: totalAvailable,
        totalOrders: db.orders.length,
      },
    });
  } catch (error) {
    console.error("[API /sync/stock POST]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data sync ke server" },
      { status: 500 }
    );
  }
}
