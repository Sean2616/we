import fs from "fs/promises";
import path from "path";
import { DEFAULT_DATABASE } from "./default-data";
import { Product, PublicProduct, StoreDatabase } from "./types";

const REDIS_KEY = "premstore:database:v1";
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "store.json");

// Global in-memory fallback (used when running on read-only FS without Redis configured)
const globalForStore = globalThis as unknown as {
  __premstoreMemoryDb?: StoreDatabase;
};

function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

export function getStorageMode(): "upstash-redis" | "local-json" | "memory" {
  if (getRedisConfig()) return "upstash-redis";
  if (process.env.VERCEL) return "memory";
  return "local-json";
}

function cloneDefault(): StoreDatabase {
  return JSON.parse(JSON.stringify(DEFAULT_DATABASE)) as StoreDatabase;
}

export async function readDatabase(): Promise<StoreDatabase> {
  const redis = getRedisConfig();

  if (redis) {
    try {
      const res = await fetch(`${redis.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
        headers: {
          Authorization: `Bearer ${redis.token}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { result: string | null };
        if (data.result) {
          return JSON.parse(data.result) as StoreDatabase;
        }
        const initial = cloneDefault();
        await writeDatabase(initial);
        return initial;
      }
    } catch (err) {
      console.error("[Storage] Redis read failed, falling back:", err);
    }
  }

  // Try local JSON file (for local development)
  if (!process.env.VERCEL) {
    try {
      const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
      return JSON.parse(raw) as StoreDatabase;
    } catch {
      const initial = cloneDefault();
      await writeDatabase(initial);
      return initial;
    }
  }

  // Fallback to in-memory (Vercel without Redis)
  if (!globalForStore.__premstoreMemoryDb) {
    globalForStore.__premstoreMemoryDb = cloneDefault();
  }
  return globalForStore.__premstoreMemoryDb;
}

export async function writeDatabase(db: StoreDatabase): Promise<void> {
  const redis = getRedisConfig();

  if (redis) {
    const res = await fetch(`${redis.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redis.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(db),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Redis write failed: ${res.status} ${text}`);
    }
    return;
  }

  if (!process.env.VERCEL) {
    await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return;
  }

  globalForStore.__premstoreMemoryDb = db;
}

export function toPublicProduct(product: Product): PublicProduct {
  const stockCount = product.stock.filter((s) => s.status === "available").length;
  const soldCount = product.stock.filter((s) => s.status === "sold").length;
  const { stock: _hidden, ...rest } = product;
  return {
    ...rest,
    stockCount,
    soldCount,
  };
}

export function verifySyncApiKey(request: Request): boolean {
  const expected = process.env.SYNC_API_KEY || "premstore-secret-sync-key-2026";
  const provided =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return Boolean(expected) && provided === expected;
}
