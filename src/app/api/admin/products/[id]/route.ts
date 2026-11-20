import { NextResponse } from "next/server";
import { readDatabase, verifyAdminRequest, writeDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = await readDatabase();
    db.products = db.products.filter((p) => p.id !== id);
    db.lastSyncedAt = new Date().toISOString();
    await writeDatabase(db);

    return NextResponse.json({ ok: true, products: db.products });
  } catch (error) {
    console.error("[API /admin/products/[id] DELETE]", error);
    return NextResponse.json(
      { error: "Gagal menghapus produk" },
      { status: 500 }
    );
  }
}
