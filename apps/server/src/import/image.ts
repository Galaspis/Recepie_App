import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

const client = new Anthropic();

/**
 * A photo for recipes that arrived without one (hand-written recipes, posts
 * with no thumbnail). Asks Claude for a short English search phrase for the
 * dish, then takes the best Unsplash match. Returns null when nothing fits or
 * no Unsplash key is configured.
 */
export async function findStockImage(recipe: {
  title: string;
  description: string | null;
  category: string;
  cuisine: string | null;
}): Promise<{ url: string; credit: string } | null> {
  if (!env.unsplashKey) return null;

  const response = await client.messages.create({
    model: env.claudeModel,
    max_tokens: 60,
    system:
      "You turn a Hebrew recipe title into a 2-4 word English photo search phrase for a stock-photo site: the dish name plus one visual hint, e.g. 'baked salmon honey glaze', 'shakshuka skillet', 'chocolate cake slice'. Reply with the phrase only.",
    messages: [
      {
        role: "user",
        content: `Title: ${recipe.title}\nCategory: ${recipe.category}\nCuisine: ${recipe.cuisine ?? "unknown"}\nDescription: ${recipe.description ?? ""}`,
      },
    ],
  });
  const query = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text.trim())
    .join(" ")
    .replace(/["'\n]/g, "")
    .slice(0, 80);
  if (!query) return null;

  const url = `https://api.unsplash.com/search/photos?per_page=5&orientation=landscape&content_filter=high&query=${encodeURIComponent(query + " food")}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${env.unsplashKey}`, "Accept-Version": "v1" } });
  if (!res.ok) {
    console.warn("[unsplash] search failed:", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const data = (await res.json()) as { results?: { urls?: { regular?: string }; user?: { name?: string }; links?: { download_location?: string } }[] };
  const hit = data.results?.[0];
  if (!hit?.urls?.regular) return null;
  // Unsplash asks API users to register a "download" when an image is used.
  if (hit.links?.download_location)
    fetch(hit.links.download_location, { headers: { Authorization: `Client-ID ${env.unsplashKey}` } }).catch(() => undefined);
  return { url: `${hit.urls.regular}&w=1200`, credit: hit.user?.name ?? "Unsplash" };
}
