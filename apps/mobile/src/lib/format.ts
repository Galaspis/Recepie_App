import { guessAisle, parseShoppingLine, type Ingredient } from "@recipe/shared";

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.5, "½"],
  [0.666, "⅔"],
  [0.75, "¾"],
];

/** 1.5 -> "1½", 0.333 -> "⅓", 2 -> "2", 2.37 -> "2.4" */
export function formatQuantity(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "";
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.05) return String(whole);
  const match = FRACTIONS.find(([f]) => Math.abs(f - frac) < 0.06);
  if (match) return whole > 0 ? `${whole}${match[1]}` : match[1];
  return (Math.round(value * 10) / 10).toString();
}

export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (ing.quantity === null || factor === 1) return ing;
  return { ...ing, quantity: ing.quantity * factor };
}

export function ingredientLine(ing: Ingredient): string {
  const qty = formatQuantity(ing.quantity);
  const parts = [qty, ing.unit, ing.name].filter(Boolean);
  const main = parts.join(" ");
  return ing.note ? `${main} (${ing.note})` : main;
}

export function formatMinutes(min: number | null | undefined): string | null {
  if (!min) return null;
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ש׳ ${m} דק׳` : `${h} ש׳`;
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Fallback when the AI did not fill duration_seconds: "20 דקות", "חצי שעה", "45 שניות". */
export function parseDurationFromText(text: string): number | null {
  const t = text.replace(/[׳״'"]/g, "");
  const hours = t.match(/(\d+(?:[.,]\d+)?)\s*שע/);
  const minutes = t.match(/(\d+(?:[.,]\d+)?)\s*דק/);
  const seconds = t.match(/(\d+)\s*שנ/);
  if (/חצי שעה/.test(t)) return 30 * 60;
  if (/רבע שעה/.test(t)) return 15 * 60;
  let total = 0;
  if (hours) total += parseFloat(hours[1]!.replace(",", ".")) * 3600;
  if (minutes) total += parseFloat(minutes[1]!.replace(",", ".")) * 60;
  if (seconds) total += parseInt(seconds[1]!, 10);
  return total > 0 ? Math.round(total) : null;
}

/**
 * Splits a typed ingredient line ("2 ק"ג עגבניות", "15 מלפפון", "מלפפון 15",
 * "פלפל צהוב") into name / quantity / unit. Only known units count as a unit,
 * so the second word of a two-word name is never mistaken for one.
 */
export function parseIngredientLine(line: string): Ingredient {
  const parsed = parseShoppingLine(line);
  return {
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    note: null,
    group: null,
    aisle: guessAisle(parsed.name),
  };
}
