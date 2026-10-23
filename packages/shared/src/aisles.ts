/** Supermarket sections. In its own file so grocery.ts and index.ts can both import it without a cycle. */
export const AISLES = [
  "ירקות ופירות",
  "בשר ועוף",
  "דגים",
  "מוצרי חלב וביצים",
  "מאפייה",
  "יבשים ודגנים",
  "שימורים ורטבים",
  "תבלינים",
  "קפואים",
  "משקאות",
  "חטיפים ומתוקים",
  "בית וניקיון",
  "אחר",
] as const;
export type Aisle = (typeof AISLES)[number];
