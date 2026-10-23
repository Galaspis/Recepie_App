// Quick check of the shared shopping-line parser and the aisle/emoji keywords:  npx tsx scripts/grocery-check.ts
import { classifyGrocery, parseShoppingLine } from "@recipe/shared";

const cases: [string, { name: string; quantity: number | null; unit: string | null }][] = [
  ["פלפל צהוב", { name: "פלפל צהוב", quantity: null, unit: null }],
  ["15 מלפפון", { name: "מלפפון", quantity: 15, unit: null }],
  ["מלפפון 15", { name: "מלפפון", quantity: 15, unit: null }],
  ["15 פלפל צהוב", { name: "פלפל צהוב", quantity: 15, unit: null }],
  ["פלפל צהוב 3", { name: "פלפל צהוב", quantity: 3, unit: null }],
  ['2 ק"ג עגבניות', { name: "עגבניות", quantity: 2, unit: 'ק"ג' }],
  ['עגבניות 2 ק"ג', { name: "עגבניות", quantity: 2, unit: 'ק"ג' }],
  ["חצי קילו בשר טחון", { name: "בשר טחון", quantity: 0.5, unit: 'ק"ג' }],
  ["2 חבילות פתיתים", { name: "פתיתים", quantity: 2, unit: "חבילות" }],
  ["בצל לבן", { name: "בצל לבן", quantity: null, unit: null }],
  ["כרוב לבן x3", { name: "כרוב לבן", quantity: 3, unit: null }],
  ["x3 כרוב לבן", { name: "כרוב לבן", quantity: 3, unit: null }],
  ["קוטג' 5%", { name: "קוטג' 5%", quantity: null, unit: null }],
  ["חלב 3%", { name: "חלב 3%", quantity: null, unit: null }],
  ["שני מלפפונים", { name: "מלפפונים", quantity: 2, unit: null }],
  ["1½ כוס קמח", { name: "קמח", quantity: 1.5, unit: "כוס" }],
  ["2ק\"ג תפוחי אדמה", { name: "תפוחי אדמה", quantity: 2, unit: 'ק"ג' }],
  ["- 3 ביצים", { name: "ביצים", quantity: 3, unit: null }],
  ["1/2 כפית מלח", { name: "מלח", quantity: 0.5, unit: "כפית" }],
  ["מים", { name: "מים", quantity: null, unit: null }],
];

let failed = 0;
for (const [input, want] of cases) {
  const got = parseShoppingLine(input);
  const ok = got.name === want.name && got.quantity === want.quantity && got.unit === want.unit;
  if (!ok) failed++;
  console.log(ok ? "ok  " : "FAIL", JSON.stringify(input), "->", JSON.stringify(got), ok ? "" : "want " + JSON.stringify(want));
}

console.log("\n--- aisles / emoji");
for (const n of ["פלפל צהוב", "פלפל שחור", "רוטב עגבניות", "אפונה קפואה", "קוטג' 5%", "נייר טואלט", "במבה", "שוקולד מריר", "חזה עוף", "סלמון", "לחם", "פירורי לחם", "מטרנה", "ג'ינג'ר", "שעועית ירוקה", "שמן זית", "זיתים", "חלב", "ביצים", "קפה", "מיץ תפוזים", "אבקת אפייה", "טחינה", "מלפפון חמוץ", "שום", "גבינה צהובה", "אורז", "בננה", "חומוס", "סוללות", "דלעת", "עגבניות שרי", "כוסברה", "דגני בוקר", "שעועית לבנה", "שעועית צהובה", "בייגלה", "שוקולד עלית", "שומשום", "פירות יבשים", "שום טחון", "קרואסון", "הל", "תה", "סוכריות", "יין לבן", "בצל לבן", "כרוב לבן", "קרם קוקוס", "חלב קוקוס", "פלפלים ממולאים", "אבקת כביסה", "גרעיני דלעת", "תירס קפוא", "לחמניות", "פסטרמה", "עוגיות", "מלפפונים", "פילה סלמון", "לימונים", "רימונים", "מלונים", "לחמים", "אגוזים"]) {
  const c = classifyGrocery(n);
  console.log(c.confident ? "   " : " ? ", n.padEnd(16), c.aisle.padEnd(18), c.emoji);
}
process.exit(failed ? 1 : 0);
