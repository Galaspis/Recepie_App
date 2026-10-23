import type { SourcePlatform } from "@recipe/shared";

/** Builds an embeddable player URL for the source post, when the platform offers one. */
export function embedUrl(
  url: string | null,
  platform: SourcePlatform,
): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    switch (platform) {
      case "instagram": {
        const m = u.pathname.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
        return m
          ? `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed/`
          : null;
      }
      case "facebook":
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
      case "youtube": {
        const id =
          u.hostname === "youtu.be"
            ? u.pathname.slice(1)
            : (u.searchParams.get("v") ??
              u.pathname.match(/\/shorts\/([^/]+)/)?.[1]);
        return id ? `https://www.youtube.com/embed/${id}?playsinline=1` : null;
      }
      case "tiktok": {
        const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
        return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export const PLATFORM_LABEL: Record<SourcePlatform, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  tiktok: "טיקטוק",
  youtube: "יוטיוב",
  web: "אתר",
  manual: "ידני",
};

/** True when the URL points at our own copy of the video (plays directly). */
export function isStoredVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    /\.(mp4|webm|mov)(\?|$)/i.test(url) ||
    url.includes("/storage/v1/object/public/recipe-videos/")
  );
}
