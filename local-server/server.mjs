import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.LOCAL_SERVER_PORT || 4000);
const DB_PATH = path.join(__dirname, "stock-db.json");
const CONFIG_PATH = path.join(__dirname, "config.json");
const HTML_PATH = path.join(__dirname, "public", "index.html");

const DEFAULT_CONFIG = {
  remoteUrl: "http://localhost:3000",
  apiKey: "premstore-secret-sync-key-2026",
  autoSync: true,
};

function createDefaultDb() {
  const now = new Date().toISOString();
  return {
    lastSyncedAt: null,
    orders: [],
    products: [
      {
        id: "prod-netflix-1p1u",
        name: "Netflix Premium 4K",
        slug: "netflix-premium-4k",
        category: "Streaming",
        duration: "1 Bulan (1P1U)",
        price: 35000,
        originalPrice: 54000,
        badge: "Terlaris",
        description:
          "Akun Netflix Ultra HD 4K legal, 1 Profile 1 User dengan PIN pribadi. Garansi penuh selama masa aktif.",
        features: [
          "Resolusi Ultra HD 4K + HDR",
          "1 Profile 1 User (Private PIN)",
          "Support Smart TV, HP, Laptop",
          "Garansi Full 30 Hari",
        ],
        accentColor: "#E50914",
        icon: "NF",
        updatedAt: now,
        stock: [
          {
            id: "stk-nf-1",
            credentials: "nf.ultra01@premstore.id | PassNF#2026 | Profile 1 (PIN: 4411)",
            note: "Jangan ubah email/password utama",
            status: "available",
            addedAt: now,
          },
          {
            id: "stk-nf-2",
            credentials: "nf.ultra02@premstore.id | PassNF#2026 | Profile 2 (PIN: 8822)",
            note: "Jangan ubah email/password utama",
            status: "available",
            addedAt: now,
          },
          {
            id: "stk-nf-3",
            credentials: "nf.ultra03@premstore.id | PassNF#2026 | Profile 3 (PIN: 9933)",
            note: "Jangan ubah email/password utama",
            status: "available",
            addedAt: now,
          },
        ],
      },
      {
        id: "prod-spotify-indiv",
        name: "Spotify Premium Individual",
        slug: "spotify-premium-individual",
        category: "Music",
        duration: "1 Bulan",
        price: 22000,
        originalPrice: 54990,
        badge: "Instant",
        description:
          "Dengarkan musik bebas iklan, kualitas audio Very High, dan download offline tanpa batas.",
        features: [
          "Bebas Iklan 100%",
          "Download Lagu Offline",
          "Audio Quality Very High",
          "Akun Private Full Garansi",
        ],
        accentColor: "#1DB954",
        icon: "SP",
        updatedAt: now,
        stock: [
          {
            id: "stk-sp-1",
            credentials: "sp.music01@premstore.id | SpotPrem#881",
            note: "Bisa langsung login di aplikasi Spotify",
            status: "available",
            addedAt: now,
          },
          {
            id: "stk-sp-2",
            credentials: "sp.music02@premstore.id | SpotPrem#882",
            note: "Bisa langsung login di aplikasi Spotify",
            status: "available",
            addedAt: now,
          },
        ],
      },
      {
        id: "prod-canva-pro",
        name: "Canva Pro Education / Team",
        slug: "canva-pro-team",
        category: "Design",
        duration: "1 Bulan",
        price: 15000,
        originalPrice: 95000,
        badge: "Hemat 84%",
        description:
          "Akses jutaan template premium, Magic Studio AI, Background Remover, dan Brand Kit tanpa watermark.",
        features: [
          "All Premium Templates & Fonts",
          "Background Remover & Magic Resize",
          "Invite Link / Akun Siap Pakai",
          "Garansi Anti Backfree",
        ],
        accentColor: "#00C4CC",
        icon: "CV",
        updatedAt: now,
        stock: [
          {
            id: "stk-cv-1",
            credentials: "https://canva.com/brand/join?token=DEMO-CANVA-PRO-001",
            note: "Klik link invite sambil login akun Canva Anda",
            status: "available",
            addedAt: now,
          },
          {
            id: "stk-cv-2",
            credentials: "https://canva.com/brand/join?token=DEMO-CANVA-PRO-002",
            note: "Klik link invite sambil login akun Canva Anda",
            status: "available",
            addedAt: now,
          },
        ],
      },
    ],
  };
}

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
}

async function writeConfig(cfg) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    const initial = createDefaultDb();
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

async function pushToRemote(db, cfg) {
  const baseUrl = (cfg.remoteUrl || "").replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Target URL belum diatur.");
  }

  const res = await fetch(`${baseUrl}/api/sync/stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey || "",
    },
    body: JSON.stringify({
      mode: "merge",
      products: db.products,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Remote error ${res.status}`);
  }

  db.lastSyncedAt = data.syncedAt || new Date().toISOString();
  await writeDb(db);
  return data;
}

async function pullFromRemote(db, cfg) {
  const baseUrl = (cfg.remoteUrl || "").replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Target URL belum diatur.");
  }

  const res = await fetch(`${baseUrl}/api/sync/stock`, {
    method: "GET",
    headers: {
      "x-api-key": cfg.apiKey || "",
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Remote error ${res.status}`);
  }

  if (Array.isArray(data.products)) {
    db.products = data.products;
  }
  if (Array.isArray(data.orders)) {
    db.orders = data.orders;
  }
  db.lastSyncedAt = new Date().toISOString();
  await writeDb(db);
  return data;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf-8");
  return text ? JSON.parse(text) : {};
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method || "GET";

  try {
    // Serve Dashboard UI
    if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      const html = await fs.readFile(HTML_PATH, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    // GET state
    if (method === "GET" && pathname === "/local-api/state") {
      const [config, db] = await Promise.all([readConfig(), readDb()]);
      return sendJson(res, 200, { config, db });
    }

    // Save config
    if (method === "POST" && pathname === "/local-api/config") {
      const body = await parseBody(req);
      const current = await readConfig();
      const updated = {
        remoteUrl: String(body.remoteUrl ?? current.remoteUrl).trim().replace(/\/$/, ""),
        apiKey: String(body.apiKey ?? current.apiKey).trim(),
        autoSync: Boolean(body.autoSync),
      };
      await writeConfig(updated);
      return sendJson(res, 200, { ok: true, config: updated });
    }

    // Create or update product
    if (method === "POST" && pathname === "/local-api/products") {
      const body = await parseBody(req);
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
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

      if (existingIdx >= 0) {
        const existing = db.products[existingIdx];
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
          return sendJson(res, 400, { error: "Nama produk wajib diisi." });
        }
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        db.products.push({
          id: makeId("prod"),
          name,
          slug,
          category: body.category || "Streaming",
          duration: String(body.duration || "1 Bulan").trim(),
          price: Number(body.price) || 25000,
          originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
          badge: body.badge ? String(body.badge).trim() : undefined,
          description: String(body.description || "").trim(),
          features: features.length ? features : ["Garansi Full Durasi", "Auto Kirim 24/7"],
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

      await writeDb(db);
      let syncResult = null;
      if (cfg.autoSync) {
        try {
          syncResult = await pushToRemote(db, cfg);
        } catch (err) {
          syncResult = { ok: false, error: err.message };
        }
      }
      return sendJson(res, 200, { ok: true, db, syncResult });
    }

    // Delete product
    const prodDeleteMatch = pathname.match(/^\/local-api\/products\/([^/]+)$/);
    if (method === "DELETE" && prodDeleteMatch) {
      const prodId = decodeURIComponent(prodDeleteMatch[1]);
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
      db.products = db.products.filter((p) => p.id !== prodId);
      await writeDb(db);
      let syncResult = null;
      if (cfg.autoSync) {
        try {
          syncResult = await pushToRemote(db, cfg);
        } catch (err) {
          syncResult = { ok: false, error: err.message };
        }
      }
      return sendJson(res, 200, { ok: true, db, syncResult });
    }

    // Bulk add stock to product
    const stockAddMatch = pathname.match(/^\/local-api\/products\/([^/]+)\/stock$/);
    if (method === "POST" && stockAddMatch) {
      const prodId = decodeURIComponent(stockAddMatch[1]);
      const body = await parseBody(req);
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
      const product = db.products.find((p) => p.id === prodId);
      if (!product) {
        return sendJson(res, 404, { error: "Produk tidak ditemukan." });
      }

      const lines = String(body.lines || "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const note = String(body.note || "").trim();

      if (lines.length === 0) {
        return sendJson(res, 400, { error: "Masukkan minimal 1 baris data akun." });
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
      await writeDb(db);

      let syncResult = null;
      if (cfg.autoSync) {
        try {
          syncResult = await pushToRemote(db, cfg);
        } catch (err) {
          syncResult = { ok: false, error: err.message };
        }
      }

      return sendJson(res, 200, {
        ok: true,
        addedCount: lines.length,
        db,
        syncResult,
      });
    }

    // Delete individual stock item
    const stockDeleteMatch = pathname.match(
      /^\/local-api\/products\/([^/]+)\/stock\/([^/]+)$/
    );
    if (method === "DELETE" && stockDeleteMatch) {
      const prodId = decodeURIComponent(stockDeleteMatch[1]);
      const stockId = decodeURIComponent(stockDeleteMatch[2]);
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
      const product = db.products.find((p) => p.id === prodId);
      if (!product) {
        return sendJson(res, 404, { error: "Produk tidak ditemukan." });
      }

      product.stock = product.stock.filter((s) => s.id !== stockId);
      product.updatedAt = new Date().toISOString();
      await writeDb(db);

      let syncResult = null;
      if (cfg.autoSync) {
        try {
          syncResult = await pushToRemote(db, cfg);
        } catch (err) {
          syncResult = { ok: false, error: err.message };
        }
      }
      return sendJson(res, 200, { ok: true, db, syncResult });
    }

    // Manual Push to Vercel
    if (method === "POST" && pathname === "/local-api/sync/push") {
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
      const result = await pushToRemote(db, cfg);
      return sendJson(res, 200, { ok: true, result, db });
    }

    // Manual Pull from Vercel
    if (method === "POST" && pathname === "/local-api/sync/pull") {
      const [db, cfg] = await Promise.all([readDb(), readConfig()]);
      const result = await pullFromRemote(db, cfg);
      return sendJson(res, 200, { ok: true, result, db });
    }

    sendJson(res, 404, { error: "Endpoint tidak ditemukan" });
  } catch (err) {
    console.error("[Local Server Error]", err);
    sendJson(res, 500, { error: err.message || "Internal server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n=======================================================`);
  console.log(`  Local Stock Manager Server berjalan!`);
  console.log(`  Buka Dashboard: http://localhost:${PORT}`);
  console.log(`=======================================================\n`);
});
