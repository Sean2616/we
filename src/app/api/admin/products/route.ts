import { NextResponse } from "next/server";
import {
  makeId,
  readDatabase,
  verifyAdminRequest,
  writeDatabase,
} from "@/lib/storage";
import { ProductCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string | null;
      name?: string;
      category?: ProductCategory;
      duration?: string;
      price?: number;
      originalPrice?: number | null;
      badge?: string;
      description?: string;
      features?: string[] | string;
      accentColor?: string;
      icon?: string;
    };

    const db = await readDatabase();
    const now = new Date().toISOString();

    const features = Array.isArray(body.features)
      ? body.features.map((f) => String(f).trim()).filter(Boolean)
      : String(body.features || "")
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);

    const existingIdx = body.id
      ? db.products.findIndex((p) => p.id === body.id)
      : -1;

    let savedId = "";

    if (existingIdx >= 0) {
      const existing = db.products[existingIdx];
      savedId = existing.id;
      db.products[existingIdx] = {
        ...existing,
        name: String(body.name || existing.name).trim(),
        category: body.category || existing.category,
        duration: String(body.duration || existing.duration).trim(),
        price: Number(body.price) || existing.price,
        originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
        badge: body.badge ? String(body.badge).trim() : undefined,
        description: String(body.description ?? existing.description).trim(),
        features: features.length ? features : existing.features,
        accentColor: String(body.accentColor || existing.accentColor).trim(),
        icon: String(body.icon || existing.icon).trim().slice(0, 3).toUpperCase(),
        updatedAt: now,
      };
    } else {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Nama produk wajib diisi." },
          { status: 400 }
        );
      }
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      savedId = makeId("prod");
      db.products.push({
        id: savedId,
        name,
        slug,
        category: body.category || "Streaming",
        duration: String(body.duration || "1 Bulan").trim(),
        price: Number(body.price) || 25000,
        originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
        badge: body.badge ? String(body.badge).trim() : undefined,
        description: String(body.description || "").trim(),
        features: features.length
          ? features
          : ["Garansi Full Durasi", "Auto Kirim 24/7"],
        accentColor: String(body.accentColor || "#6366F1").trim(),
        icon:
          String(body.icon || name.slice(0, 2))
            .trim()
            .slice(0, 3)
            .toUpperCase() || "PR",
        stock: [],
        updatedAt: now,
      });
    }

    db.lastSyncedAt = now;
    await writeDatabase(db);

    return NextResponse.json({
      ok: true,
      savedId,
      products: db.products,
    });
  } catch (error) {
    console.error("[API /admin/products POST]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan produk" },
      { status: 500 }
    );
  }
}
