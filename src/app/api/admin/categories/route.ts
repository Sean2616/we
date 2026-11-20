import { NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/default-data";
import { readDatabase, verifyAdminRequest, writeDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string };
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const db = await readDatabase();
    const list = Array.isArray(db.categories) && db.categories.length > 0
      ? [...db.categories]
      : [...DEFAULT_CATEGORIES];

    const exists = list.some((c) => c.toLowerCase() === name.toLowerCase());
    if (exists) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada.` },
        { status: 409 }
      );
    }

    list.push(name);
    db.categories = list;
    db.lastSyncedAt = new Date().toISOString();
    await writeDatabase(db);

    return NextResponse.json({
      ok: true,
      categories: db.categories,
      message: `Kategori "${name}" berhasil ditambahkan!`,
    });
  } catch (error) {
    console.error("[API /admin/categories POST]", error);
    return NextResponse.json(
      { error: "Gagal menambah kategori" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const name = (searchParams.get("name") || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Parameter nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const db = await readDatabase();
    const list = Array.isArray(db.categories) && db.categories.length > 0
      ? [...db.categories]
      : [...DEFAULT_CATEGORIES];

    db.categories = list.filter((c) => c.toLowerCase() !== name.toLowerCase());
    db.lastSyncedAt = new Date().toISOString();
    await writeDatabase(db);

    return NextResponse.json({
      ok: true,
      categories: db.categories,
      message: `Kategori "${name}" berhasil dihapus.`,
    });
  } catch (error) {
    console.error("[API /admin/categories DELETE]", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}
