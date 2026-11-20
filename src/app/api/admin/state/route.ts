import { NextResponse } from "next/server";
import { getStorageMode, readDatabase, verifyAdminRequest } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json(
      { error: "Password admin salah atau tidak valid." },
      { status: 401 }
    );
  }

  try {
    const db = await readDatabase();
    const totalAvailableStock = db.products.reduce(
      (sum, p) => sum + p.stock.filter((s) => s.status === "available").length,
      0
    );
    const paidOrders = db.orders.filter((o) => o.status === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    return NextResponse.json({
      ok: true,
      storageMode: getStorageMode(),
      products: db.products,
      orders: db.orders,
      stats: {
        totalProducts: db.products.length,
        totalAvailableStock,
        totalOrders: db.orders.length,
        paidOrdersCount: paidOrders.length,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("[API /admin/state GET]", error);
    return NextResponse.json(
      { error: "Gagal memuat data admin" },
      { status: 500 }
    );
  }
}
