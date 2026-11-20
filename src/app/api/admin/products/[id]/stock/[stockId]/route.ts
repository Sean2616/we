import { NextResponse } from "next/server";
import { readDatabase, verifyAdminRequest, writeDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; stockId: string }> }
) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, stockId } = await context.params;
    const db = await readDatabase();
    const product = db.products.find((p) => p.id === id);

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    product.stock = product.stock.filter((s) => s.id !== stockId);
    const now = new Date().toISOString();
    product.updatedAt = now;
    db.lastSyncedAt = now;

    await writeDatabase(db);

    return NextResponse.json({ ok: true, products: db.products });
  } catch (error) {
    console.error("[API /admin/products/[id]/stock/[stockId] DELETE]", error);
    return NextResponse.json(
      { error: "Gagal menghapus stok" },
      { status: 500 }
    );
  }
}
