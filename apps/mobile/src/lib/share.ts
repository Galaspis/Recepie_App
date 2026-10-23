import * as Clipboard from "expo-clipboard";
import type { RecipeRow, ShoppingItemRow } from "@recipe/shared";
import { Linking, Platform, Share } from "react-native";

import { AISLE_EMOJI } from "@/constants/theme";
import { dialog } from "./dialog";
import { formatQuantity } from "./format";

export function recipeToText(recipe: RecipeRow): string {
  return [
    `🍳 *${recipe.title}*`,
    recipe.description ?? "",
    recipe.servings ? `${formatQuantity(recipe.servings)} מנות` : "",
    "",
    "*מצרכים*",
    ...recipe.ingredients.map(
      (i) =>
        `• ${[formatQuantity(i.quantity), i.unit, i.name].filter(Boolean).join(" ")}${i.note ? ` (${i.note})` : ""}`,
    ),
    "",
    "*הכנה*",
    ...recipe.steps.map((s, i) => `${i + 1}. ${s.text}`),
    recipe.source_url ? `\nמקור: ${recipe.source_url}` : "",
    "\nנשלח מקורט 🧡",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function shoppingToText(items: ShoppingItemRow[]): string {
  const open = items.filter((i) => !i.checked && !i.unavailable);
  const byAisle = new Map<string, ShoppingItemRow[]>();
  for (const item of open) {
    const key = item.aisle ?? "אחר";
    byAisle.set(key, [...(byAisle.get(key) ?? []), item]);
  }
  const lines = ["🛒 *רשימת קניות*"];
  for (const [aisle, list] of byAisle) {
    lines.push("", `${AISLE_EMOJI[aisle] ?? "•"} *${aisle}*`);
    for (const i of list)
      lines.push(
        `☐ ${[formatQuantity(i.quantity), i.unit, i.name].filter(Boolean).join(" ")}`,
      );
  }
  lines.push("", "נשלח מקורט 🧡");
  return lines.join("\n");
}

/** Opens WhatsApp with the text ready to send (the user picks the contact). */
export function shareToWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (Platform.OS === "web") window.open(url, "_blank");
  else Linking.openURL(url);
}

/**
 * The system share sheet. Browsers without one (or a cancelled sheet) never
 * throw at the caller: we fall back to copying the text.
 */
export async function shareText(text: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share({ text });
        return;
      }
      await Clipboard.setStringAsync(text);
      dialog.alert(
        "הטקסט הועתק",
        "הדביקו אותו בוואטסאפ, במייל או בכל מקום אחר.",
      );
      return;
    }
    await Share.share({ message: text });
  } catch (err) {
    // Cancelling the sheet rejects with AbortError; that's not an error for the user.
    if ((err as Error)?.name === "AbortError") return;
    try {
      await Clipboard.setStringAsync(text);
      dialog.alert("הטקסט הועתק", "השיתוף לא נתמך כאן, אז העתקנו את הטקסט.");
    } catch {
      dialog.alert("לא הצליח לשתף", (err as Error).message);
    }
  }
}
