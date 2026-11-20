import { NextResponse } from "next/server";
import { getStorageMode, readDatabase, toPublicProduct } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await readDatabase();
    const products = db.products.map(toPublicProduct);
    const totalAvailableStock = products.reduce((sum, p) => sum + p.stockCount, 0);
    const totalCompletedOrders = db.orders.filter((o) => o.status === "paid").length;

    return NextResponse.json({
      products,
      stats: {
        totalProducts: products.length,
        totalAvailableStock,
        totalCompletedOrders,
      },
      lastSyncedAt: db.lastSyncedAt,
      storageMode: getStorageMode(),
    });
  } catch (error) {
    console.error("[API /products GET]", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar produk" },
      { status: 500 }
    );
  }
}
