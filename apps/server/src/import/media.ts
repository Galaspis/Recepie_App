import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";
import { run } from "./shell.js";

export interface Frame {
  /** JPEG, base64 encoded. */
  base64: string;
  atSeconds: number;
}

/**
 * Samples frames across the video so Claude can read on-screen text
 * (ingredient overlays are extremely common in recipe reels).
 */
export async function extractFrames(videoPath: string, durationSeconds: number | null, workDir: string): Promise<Frame[]> {
  const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : 60;
  // ~1 frame every 4s, capped so a long video doesn't flood the prompt.
  const count = Math.min(16, Math.max(4, Math.round(duration / 4)));
  const interval = duration / count;
  const pattern = path.join(workDir, "frame_%03d.jpg");

  const result = await run(
    env.ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      videoPath,
      "-vf",
      `fps=1/${interval.toFixed(3)},scale='min(768,iw)':-2`,
      "-frames:v",
      String(count),
      "-q:v",
      "4",
      pattern,
    ],
    { timeoutMs: 120_000 },
  );
  if (result.code !== 0) {
    console.warn("[ffmpeg] frame extraction failed:", result.stderr.slice(0, 500));
    return [];
  }

  const files = (await readdir(workDir)).filter((f) => f.startsWith("frame_")).sort();
  const frames: Frame[] = [];
  for (const [i, file] of files.entries()) {
    const buf = await readFile(path.join(workDir, file));
    frames.push({ base64: buf.toString("base64"), atSeconds: Math.round(i * interval) });
  }
  return frames;
}

/** Extracts a compressed mono audio track for transcription. Returns null when the video has no audio. */
export async function extractAudio(videoPath: string, workDir: string): Promise<string | null> {
  const out = path.join(workDir, "audio.m4a");
  const result = await run(
    env.ffmpegPath,
    ["-hide_banner", "-loglevel", "error", "-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", out],
    { timeoutMs: 120_000 },
  );
  if (result.code !== 0) {
    console.warn("[ffmpeg] audio extraction failed:", result.stderr.slice(0, 300));
    return null;
  }
  return out;
}

/**
 * Optional speech-to-text. Uses OpenAI Whisper when OPENAI_API_KEY is set;
 * otherwise the import relies on the caption and on-screen text only.
 */
export async function transcribe(audioPath: string): Promise<string | null> {
  if (!env.openaiApiKey) return null;
  const form = new FormData();
  const bytes = await readFile(audioPath);
  form.append("file", new Blob([bytes], { type: "audio/m4a" }), "audio.m4a");
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.openaiApiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.warn("[whisper] failed:", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const text = (await res.text()).trim();
  return text || null;
}
