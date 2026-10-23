import { rm } from "node:fs/promises";
import path from "node:path";
import { detectPlatform, extractFirstUrl, type ImportJobRow, type RecipeContent } from "@recipe/shared";
import { env } from "../env.js";
import { one, q, setClause } from "../db.js";
import { saveMedia } from "../storage.js";
import { extractRecipe } from "./extract.js";
import { findStockImage } from "./image.js";
import { extractAudio, extractFrames, transcribe, type Frame } from "./media.js";
import { fetchSource, type FetchedSource } from "./source.js";
import { storeVideo } from "./video.js";

async function setJob(jobId: string, patch: Partial<ImportJobRow> & { raw?: unknown }) {
  const set = setClause(patch as Record<string, unknown>, ["status", "progress", "error", "recipe_id", "raw"], ["raw"]);
  if (!set) return;
  await q(`update import_jobs set ${set.sql} where id = $${set.next}`, [...set.values, jobId]).catch((err) =>
    console.error("[job] update failed", (err as Error).message));
}

/** The whole shared-link -> saved-recipe flow for one job. Safe to call fire-and-forget. */
export async function runImport(job: ImportJobRow): Promise<void> {
  const workDir = path.resolve(env.tmpDir, job.id);
  try {
    const url = job.source_url ?? extractFirstUrl(job.source_text);
    let source: FetchedSource | null = null;
    let frames: Frame[] = [];
    let transcript: string | null = null;

    if (url) {
      await setJob(job.id, { status: "fetching", progress: "מוריד את הפוסט..." });
      source = await fetchSource(url, workDir);

      transcript = source.transcript ?? null;
      if (source.videoPath) {
        await setJob(job.id, { status: "analyzing", progress: "צופה בסרטון..." });
        const [frameResult, audioPath] = await Promise.all([
          extractFrames(source.videoPath, source.durationSeconds, workDir),
          transcript ? Promise.resolve(null) : extractAudio(source.videoPath, workDir),
        ]);
        frames = frameResult;
        if (!transcript && audioPath) {
          await setJob(job.id, { progress: "מאזין להסבר..." });
          transcript = await transcribe(audioPath);
        }
      }
    }

    await setJob(job.id, { status: "analyzing", progress: "כותב את המתכון..." });

    const hasAnything =
      Boolean(source?.caption) || Boolean(source?.pageText) || Boolean(transcript) || frames.length > 0 || Boolean(job.source_text);
    if (!hasAnything) {
      const social = source?.platform === "facebook" || source?.platform === "instagram";
      if (social) {
        const name = source?.platform === "facebook" ? "פייסבוק" : "אינסטגרם";
        throw new Error(
          `${name} חסם את הקריאה של הפוסט מהשרת (${source?.fetchError ?? "no content"}). ` +
            "פתרון מיידי: העתיקו את הכיתוב של הפוסט והדביקו אותו בשדה הטקסט. " +
            "פתרון קבוע: קובץ cookies של חשבון מחובר בשרת.",
        );
      }
      throw new Error("לא הצלחתי לקרוא תוכן מהקישור. נסו להעתיק את הטקסט של הפוסט ולהדביק אותו ידנית.");
    }

    const content = await extractRecipe({
      sourceUrl: url,
      platform: source?.platform ?? "manual",
      title: source?.title ?? null,
      author: source?.author ?? null,
      caption: source?.caption ?? null,
      transcript,
      pageText: source?.pageText ?? null,
      userText: job.source_text && job.source_text !== url ? job.source_text : null,
      frames,
    });

    const recipeId = await saveRecipe(job, url, source, content);
    if (source?.videoPath) {
      await setJob(job.id, { progress: "שומר את הסרטון..." });
      const stored = await storeVideo(source.videoPath, recipeId);
      if (stored) await q("update recipes set video_url = $1 where id = $2", [stored, recipeId]);
    }
    await setJob(job.id, {
      status: "done",
      progress: null,
      recipe_id: recipeId,
      raw: { caption: source?.caption ?? null, transcript, frameCount: frames.length },
    });
  } catch (err) {
    const message = (err as Error).message || "שגיאה לא ידועה";
    console.error(`[job ${job.id}] failed:`, err);
    await setJob(job.id, { status: "failed", progress: null, error: message });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function saveRecipe(
  job: ImportJobRow,
  url: string | null,
  source: FetchedSource | null,
  content: RecipeContent,
): Promise<string> {
  const platform = source?.platform ?? detectPlatform(url);
  const row: Record<string, unknown> = {
    household_id: job.household_id,
    created_by: job.user_id,
    ...content,
    source_url: url,
    source_platform: platform,
    video_url: source?.videoPath || source?.durationSeconds ? url : null,
    thumbnail_url: source?.thumbnailUrl ?? null,
    author: source?.author ?? null,
    caption: source?.caption ?? null,
  };
  const cols = Object.keys(row);
  const json = ["ingredients", "steps", "nutrition"];
  const data = await one<{ id: string }>(
    `insert into recipes (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    cols.map((c) => (json.includes(c) ? JSON.stringify(row[c]) : row[c])),
  ).catch((err) => { throw new Error(`שמירת המתכון נכשלה: ${(err as Error).message}`); });
  if (!data) throw new Error("שמירת המתכון נכשלה");

  // Social thumbnails are signed URLs that expire; keep our own copy.
  let imageUrl: string | null = null;
  if (source?.thumbnailUrl) imageUrl = await storeThumbnail(source.thumbnailUrl, data.id);
  // No photo at all (blog without one, text paste): pick a stock photo of the dish.
  if (!imageUrl) {
    const found = await findStockImage(content).catch((err) => {
      console.warn("[image] stock lookup failed:", (err as Error).message);
      return null;
    });
    imageUrl = found?.url ?? null;
  }
  if (imageUrl) await q("update recipes set image_url = $1 where id = $2", [imageUrl, data.id]);
  return data.id;
}

async function storeThumbnail(thumbnailUrl: string, recipeId: string): Promise<string | null> {
  try {
    const res = await fetch(thumbnailUrl, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return await saveMedia("recipe-images", `${recipeId}/cover.${ext}`, bytes);
  } catch (err) {
    console.warn("[storage] thumbnail fetch failed", (err as Error).message);
    return null;
  }
}
