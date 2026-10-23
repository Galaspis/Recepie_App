import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";
import { q } from "../db.js";
import { saveMedia } from "../storage.js";
import { fetchSource } from "./source.js";

/**
 * Keeps our own copy of the downloaded reel so it plays inside the app even
 * when Instagram/Facebook refuse to embed. Returns the public URL.
 */
export async function storeVideo(videoPath: string, recipeId: string): Promise<string | null> {
  try {
    const bytes = await readFile(videoPath);
    if (bytes.length > 50 * 1024 * 1024) {
      console.warn("[storage] video too large to store:", bytes.length);
      return null;
    }
    return await saveMedia("recipe-videos", `${recipeId}/video.mp4`, bytes);
  } catch (err) {
    console.warn("[storage] video read failed:", (err as Error).message);
    return null;
  }
}

/** For recipes imported before videos were stored: download now and attach. */
export async function fetchAndStoreVideo(recipe: { id: string; source_url: string | null }): Promise<string> {
  if (!recipe.source_url) throw new Error("למתכון הזה אין קישור מקור");
  const workDir = path.resolve(env.tmpDir, `video-${recipe.id}`);
  try {
    const source = await fetchSource(recipe.source_url, workDir);
    if (!source.videoPath) throw new Error("לא הצלחתי להוריד את הסרטון מהקישור. ייתכן שהפוסט פרטי או שנדרשת התחברות.");
    const url = await storeVideo(source.videoPath, recipe.id);
    if (!url) throw new Error("שמירת הסרטון נכשלה");
    await q("update recipes set video_url = $1 where id = $2", [url, recipe.id]);
    return url;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
