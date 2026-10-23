import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AISLES, classifyGrocery, type Aisle } from "@recipe/shared";
import { z } from "zod";
import { q } from "./db.js";
import { env } from "./env.js";

/**
 * Supermarket section + emoji for shopping items. Keywords decide most of it
 * for free (packages/shared/src/grocery.ts); whatever they do not recognise is
 * sent to Claude in one small batch, so "קוטג' 5%" or "מטרנה" still get a
 * sensible aisle and icon.
 */
const client = new Anthropic();

const Classified = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      aisle: z.enum(AISLES),
      emoji: z.string().describe("אימוג'י אחד שמייצג את המוצר"),
    }),
  ),
});

const SYSTEM = `You classify grocery items for a Hebrew family shopping app. For each item name return the supermarket section it is bought in (exactly one of: ${AISLES.join(" | ")}) and ONE emoji that best pictures the product (a single emoji character, no text). Household goods, toiletries, baby and pet products belong to "בית וניקיון". Snacks, chocolate bars and candy belong to "חטיפים ומתוקים". Use "אחר" only when nothing fits. Return every item you were given, with the name unchanged.`;

const ONE_EMOJI = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*$/u;

/** Asks the model for the items the keyword table did not recognise. Never throws: on any failure returns an empty map. */
export async function classifyWithClaude(names: string[]): Promise<Map<string, { aisle: Aisle; emoji: string }>> {
  const out = new Map<string, { aisle: Aisle; emoji: string }>();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 80);
  if (!unique.length || !process.env.ANTHROPIC_API_KEY) return out;
  try {
    const response = await client.messages.parse({
      model: env.claudeModel,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: unique.map((n) => `- ${n}`).join("\n") }],
      output_config: { format: zodOutputFormat(Classified) },
    });
    for (const item of response.parsed_output?.items ?? []) {
      const emoji = ONE_EMOJI.test(item.emoji.trim()) ? item.emoji.trim() : null;
      if (!emoji) continue;
      out.set(item.name.trim(), { aisle: item.aisle, emoji });
    }
  } catch (err) {
    console.warn("[grocery] classification failed:", (err as Error).message);
  }
  return out;
}

interface ItemMeta {
  id: string;
  name: string;
  aisle: string | null;
  emoji: string | null;
}

/**
 * Fills aisle and emoji for the given items: keywords first, Claude for the rest.
 * Keeps an aisle the recipe model already chose (anything but "אחר").
 */
export async function enrichShoppingItems(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const rows = await q<ItemMeta>("select id, name, aisle, emoji from shopping_items where id = any($1::uuid[])", [ids]);
  const unknown: ItemMeta[] = [];
  for (const row of rows) {
    const guess = classifyGrocery(row.name);
    const aisle = row.aisle && row.aisle !== "אחר" ? row.aisle : guess.confident ? guess.aisle : row.aisle;
    const emoji = row.emoji ?? (guess.confident ? guess.emoji : null);
    if (aisle !== row.aisle || emoji !== row.emoji) {
      await q("update shopping_items set aisle = $1, emoji = $2 where id = $3", [aisle, emoji, row.id]);
    }
    if (!emoji || !aisle || aisle === "אחר") unknown.push({ ...row, aisle, emoji });
  }
  if (!unknown.length) return;
  const answers = await classifyWithClaude(unknown.map((r) => r.name));
  for (const row of unknown) {
    const a = answers.get(row.name.trim());
    if (!a) continue;
    const aisle = row.aisle && row.aisle !== "אחר" ? row.aisle : a.aisle;
    await q("update shopping_items set aisle = $1, emoji = coalesce(emoji, $2) where id = $3", [aisle, a.emoji, row.id]);
  }
}

/** On boot: items saved before emojis existed get one (keywords, then one model call for the rest). */
export async function backfillShoppingMeta(): Promise<void> {
  const rows = await q<{ id: string }>("select id from shopping_items where emoji is null limit 200");
  if (!rows.length) return;
  console.log(`[grocery] classifying ${rows.length} shopping item(s) without an icon`);
  await enrichShoppingItems(rows.map((r) => r.id));
}
