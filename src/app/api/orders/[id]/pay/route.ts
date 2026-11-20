import { NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = await readDatabase();
    const order = db.orders.find((o) => o.id.toLowerCase() === id.toLowerCase());

    if (!order) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan" },
        { status: 404 }
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({
        order,
        message: "Pesanan sudah dibayar dan akun telah dikirim.",
      });
    }

    const product = db.products.find((p) => p.id === order.productId);
    if (!product) {
      return NextResponse.json(
        { error: "Produk untuk pesanan ini sudah tidak tersedia." },
        { status: 404 }
      );
    }

    const availableItems = product.stock.filter((s) => s.status === "available");
    if (availableItems.length < order.quantity) {
      return NextResponse.json(
        {
          error: `Maaf, stok ${product.name} baru saja habis (tersisa ${availableItems.length}). Silakan hubungi admin.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const allocated = availableItems.slice(0, order.quantity);
    for (const item of allocated) {
      item.status = "sold";
      item.orderId = order.id;
      item.soldAt = now;
    }

    order.status = "paid";
    order.paidAt = now;
    order.deliveredItems = allocated.map((item) => ({
      credentials: item.credentials,
      note: item.note,
    }));
    product.updatedAt = now;

    await writeDatabase(db);

    return NextResponse.json({
      order,
      message: "Pembayaran terverifikasi! Akun premium berhasil dikirim otomatis.",
    });
  } catch (error) {
    console.error("[API /orders/[id]/pay POST]", error);
    return NextResponse.json(
      { error: "Gagal memproses pembayaran" },
      { status: 500 }
    );
  }
}
