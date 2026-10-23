import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "./env.js";

/** One pool for the process. Every query filters by household explicitly (no RLS here). */
export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 8 });

// numeric → number, timestamptz → ISO string (the app compares/sorts strings)
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString()));

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Applies db/schema.sql on boot. Every statement there is idempotent. */
export async function migrate() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = await readFile(path.resolve(here, "../db/schema.sql"), "utf8");
  await pool.query(sql);
}

/** Builds "col1 = $1, col2 = $2" for a partial update; returns null when nothing is allowed. */
export function setClause(patch: Record<string, unknown>, allowed: readonly string[], jsonCols: readonly string[] = []) {
  const cols = Object.keys(patch).filter((k) => allowed.includes(k));
  if (!cols.length) return null;
  const values = cols.map((c) => (jsonCols.includes(c) ? JSON.stringify(patch[c]) : patch[c]));
  return { sql: cols.map((c, i) => `${c} = $${i + 1}`).join(", "), values, next: cols.length + 1 };
}
