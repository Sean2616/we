import { NextResponse } from "next/server";
import {
  makeId,
  readDatabase,
  verifyAdminRequest,
  writeDatabase,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { lines?: string; note?: string };
    const db = await readDatabase();
    const product = db.products.find((p) => p.id === id);

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    const lines = String(body.lines || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const note = String(body.note || "").trim();

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Masukkan minimal 1 baris kredensial akun." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    for (const line of lines) {
      product.stock.push({
        id: makeId("stk"),
        credentials: line,
        note: note || undefined,
        status: "available",
        addedAt: now,
      });
    }
    product.updatedAt = now;
    db.lastSyncedAt = now;

    await writeDatabase(db);

    return NextResponse.json({
      ok: true,
      addedCount: lines.length,
      products: db.products,
    });
  } catch (error) {
    console.error("[API /admin/products/[id]/stock POST]", error);
    return NextResponse.json(
      { error: "Gagal menambah stok" },
      { status: 500 }
    );
  }
}
