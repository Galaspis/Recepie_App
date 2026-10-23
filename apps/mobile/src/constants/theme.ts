import { Platform } from "react-native";

export const BRAND = {
  name: "קורט",
  latin: "Kort",
  tagline: "קצת מזה. קצת מזה.",
  subtitle: "מתכונים טובים לאנשים שאוהבים לבשל",
} as const;

export type Theme = typeof light;

// Brand palette: terracotta, olive, near-black, beige, cream.
const light = {
  background: "#F9F2E6",
  card: "#FFFFFF",
  elevated: "#F2EADF",
  beige: "#D8C6AE",
  text: "#2B2B2B",
  textSecondary: "#6F6359",
  textMuted: "#A2958A",
  primary: "#C7522F",
  primaryDark: "#A8431F",
  onPrimary: "#FFFFFF",
  primarySoft: "#FBE6DF",
  accent: "#6B7F3F",
  accentSoft: "#E8ECDC",
  warning: "#B9801C",
  warningSoft: "#FBEFD4",
  danger: "#C73A3A",
  border: "#EADFD2",
  overlay: "rgba(30,26,23,0.55)",
  shadow: "#3A2415",
};

const dark: Theme = {
  background: "#171311",
  card: "#221C19",
  elevated: "#2D2622",
  beige: "#4A3F35",
  text: "#F6EFE6",
  textSecondary: "#BDAE9F",
  textMuted: "#857768",
  primary: "#E9633F",
  primaryDark: "#D14F2C",
  onPrimary: "#1B0E07",
  primarySoft: "#43271D",
  accent: "#9AAA6C",
  accentSoft: "#2A3120",
  warning: "#E0A83F",
  warningSoft: "#3E3119",
  danger: "#E56262",
  border: "#3B312B",
  overlay: "rgba(0,0,0,0.6)",
  shadow: "#000000",
};

export const Colors = { light, dark };
export type ThemeColor = keyof Theme;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Heebo is loaded in the root layout; these names match the loaded faces. */
export const Fonts = {
  regular: "Heebo_400Regular",
  medium: "Heebo_500Medium",
  bold: "Heebo_700Bold",
  black: "Heebo_800ExtraBold",
} as const;

export const Shadows = {
  card: Platform.select({
    web: { boxShadow: "0 6px 18px rgba(58,36,21,0.08)" },
    default: {
      shadowColor: "#3A2415",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  }) as object,
  floating: Platform.select({
    web: { boxShadow: "0 10px 24px rgba(214,74,43,0.32)" },
    default: {
      shadowColor: "#D64A2B",
      shadowOpacity: 0.32,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  }) as object,
};

/** Emoji accents for the built-in categories and aisles. */
export const CATEGORY_EMOJI: Record<string, string> = {
  "ארוחת בוקר": "🍳",
  "מנה עיקרית": "🍲",
  תוספות: "🥔",
  סלטים: "🥗",
  מרקים: "🍜",
  "מאפים ולחמים": "🥖",
  קינוחים: "🍰",
  חטיפים: "🥨",
  משקאות: "🥤",
  "רטבים ומטבלים": "🥣",
  דגים: "🐟",
  עוף: "🍗",
  בשר: "🥩",
  פסטה: "🍝",
  אחר: "🍽️",
};

/** Section icons come from the shared grocery table so the server and the app agree. */
export { AISLE_EMOJI } from "@recipe/shared";
