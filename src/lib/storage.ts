import fs from "fs/promises";
import path from "path";
import { DEFAULT_CATEGORIES, DEFAULT_DATABASE } from "./default-data";
import { Product, PublicProduct, StoreDatabase } from "./types";

const REDIS_KEY = "premstore:database:v1";
const GIST_FILENAME = "premstore-db.json";
const LOCAL_DB_PATH = path.join(process.cwd(), "data", "store.json");

// Global in-memory fallback (used when running on Vercel without external storage configured)
const globalForStore = globalThis as unknown as {
  __premstoreMemoryDb?: StoreDatabase;
};

function getGistConfig() {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  const gistId = (process.env.GITHUB_GIST_ID || "").trim();
  if (token && gistId) {
    return { token, gistId };
  }
  return null;
}

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

export function getStorageMode():
  | "github-gist"
  | "upstash-redis"
  | "local-json"
  | "memory" {
  if (getGistConfig()) return "github-gist";
  if (getRedisConfig()) return "upstash-redis";
  if (process.env.VERCEL) return "memory";
  return "local-json";
}

function cloneDefault(): StoreDatabase {
  return JSON.parse(JSON.stringify(DEFAULT_DATABASE)) as StoreDatabase;
}

function isValidDatabase(obj: unknown): obj is StoreDatabase {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Array.isArray((obj as StoreDatabase).products) &&
    Array.isArray((obj as StoreDatabase).orders)
  );
}

export async function readDatabase(): Promise<StoreDatabase> {
  // 1. GitHub Gist (100% Gratis, tanpa kartu kredit)
  const gist = getGistConfig();
  if (gist) {
    try {
      const res = await fetch(
        `https://api.github.com/gists/${encodeURIComponent(gist.gistId)}`,
        {
          headers: {
            Authorization: `Bearer ${gist.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          files?: Record<string, { content?: string }>;
        };
        const file =
          data.files?.[GIST_FILENAME] ||
          (data.files ? Object.values(data.files)[0] : undefined);

        if (file?.content) {
          try {
            const parsed = JSON.parse(file.content);
            if (isValidDatabase(parsed)) {
              return parsed;
            }
          } catch {
            // File was empty or placeholder "{}" — seed initial data below
          }
        }

        const initial = cloneDefault();
        await writeDatabase(initial);
        return initial;
      }
    } catch (err) {
      console.error("[Storage] GitHub Gist read failed, falling back:", err);
    }
  }

  // 2. Upstash Redis / Vercel KV (Opsional)
  const redis = getRedisConfig();
  if (redis) {
    try {
      const res = await fetch(
        `${redis.url}/get/${encodeURIComponent(REDIS_KEY)}`,
        {
          headers: {
            Authorization: `Bearer ${redis.token}`,
          },
          cache: "no-store",
        }
      );
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

  // 3. Local JSON file (for local development)
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

  // 4. Fallback to in-memory (Vercel without storage configured)
  if (!globalForStore.__premstoreMemoryDb) {
    globalForStore.__premstoreMemoryDb = cloneDefault();
  }
  return globalForStore.__premstoreMemoryDb;
}

export async function writeDatabase(db: StoreDatabase): Promise<void> {
  // 1. GitHub Gist (100% Gratis)
  const gist = getGistConfig();
  if (gist) {
    const res = await fetch(
      `https://api.github.com/gists/${encodeURIComponent(gist.gistId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${gist.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(db, null, 2),
            },
          },
        }),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub Gist write failed: ${res.status} ${text}`);
    }
    return;
  }

  // 2. Upstash Redis / Vercel KV
  const redis = getRedisConfig();
  if (redis) {
    const res = await fetch(
      `${redis.url}/set/${encodeURIComponent(REDIS_KEY)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redis.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(db),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Redis write failed: ${res.status} ${text}`);
    }
    return;
  }

  // 3. Local JSON file
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

export function verifyAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin-premstore-2026";
  const provided =
    request.headers.get("x-admin-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return Boolean(expected) && provided === expected;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function getResolvedCategories(db: StoreDatabase): string[] {
  const base =
    Array.isArray(db.categories) && db.categories.length > 0
      ? [...db.categories]
      : [...DEFAULT_CATEGORIES];
  const seen = new Set(base.map((c) => c.toLowerCase()));
  for (const prod of db.products) {
    const cat = (prod.category || "").trim();
    if (cat && !seen.has(cat.toLowerCase())) {
      base.push(cat);
      seen.add(cat.toLowerCase());
    }
  }
  return base;
}
