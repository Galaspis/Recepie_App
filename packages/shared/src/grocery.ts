/**
 * Everything the app and the server need to agree on about a shopping item:
 * how a typed line splits into name / quantity / unit, which supermarket
 * section it belongs to, and which emoji stands for it. Pure functions, no
 * dependencies, so the same code runs in the browser and on the server.
 */
import { AISLES, type Aisle } from "./aisles";

export const AISLE_EMOJI: Record<string, string> = {
  "ירקות ופירות": "🥬",
  "בשר ועוף": "🍗",
  דגים: "🐟",
  "מוצרי חלב וביצים": "🥚",
  מאפייה: "🥖",
  "יבשים ודגנים": "🌾",
  "שימורים ורטבים": "🥫",
  תבלינים: "🧂",
  קפואים: "🧊",
  משקאות: "🧃",
  "חטיפים ומתוקים": "🍬",
  "בית וניקיון": "🧻",
  אחר: "🛒",
};

// ---------------------------------------------------------------------------
// Parsing a typed line: "15 מלפפון", "מלפפון 15", "2 ק"ג עגבניות", "פלפל צהוב x3"
// ---------------------------------------------------------------------------
export interface ParsedShoppingLine {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/** Typed unit → the way it is shown. Only these words count as units; any other word is part of the name. */
const UNIT_ALIASES: Record<string, string> = {
  קג: 'ק"ג',
  קילו: 'ק"ג',
  קילוגרם: 'ק"ג',
  kg: 'ק"ג',
  גרם: "גרם",
  גר: "גרם",
  g: "גרם",
  gr: "גרם",
  כוס: "כוס",
  כוסות: "כוסות",
  כף: "כף",
  כפות: "כפות",
  כפית: "כפית",
  כפיות: "כפיות",
  יח: "יח׳",
  יחי: "יח׳",
  יחידה: "יח׳",
  יחידות: "יח׳",
  חבילה: "חבילה",
  חבילות: "חבילות",
  חב: "חבילה",
  ליטר: "ליטר",
  ליטרים: "ליטר",
  l: "ליטר",
  מל: 'מ"ל',
  ml: 'מ"ל',
  שקית: "שקית",
  שקיות: "שקיות",
  קופסה: "קופסה",
  קופסא: "קופסה",
  קופסאות: "קופסאות",
  בקבוק: "בקבוק",
  בקבוקים: "בקבוקים",
  צרור: "צרור",
  צרורות: "צרורות",
  שן: "שן",
  שיני: "שיני",
  שיניים: "שיניים",
  פרוסה: "פרוסה",
  פרוסות: "פרוסות",
  מארז: "מארז",
  מארזים: "מארזים",
  קרטון: "קרטון",
  קרטונים: "קרטונים",
  פחית: "פחית",
  פחיות: "פחיות",
  גביע: "גביע",
  גביעים: "גביעים",
  שישייה: "שישייה",
  שישיה: "שישייה",
  זוג: "זוג",
  מנה: "מנה",
  מנות: "מנות",
};

const QUANTITY_WORDS: Record<string, number> = {
  חצי: 0.5,
  רבע: 0.25,
  שליש: 0.333,
  אחד: 1,
  אחת: 1,
  שניים: 2,
  שתיים: 2,
  שני: 2,
  שתי: 2,
  שלושה: 3,
  שלוש: 3,
  ארבעה: 4,
  ארבע: 4,
  חמישה: 5,
  חמש: 5,
  שישה: 6,
  שש: 6,
  שבעה: 7,
  שבע: 7,
  שמונה: 8,
  תשעה: 9,
  תשע: 9,
  עשרה: 10,
  עשר: 10,
  תריסר: 12,
};

const UNICODE_FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 0.333, "⅔": 0.666 };

function normalizeToken(token: string): string {
  return token.replace(/[״׳'"`.]/g, "").toLowerCase();
}

function unitOf(token: string): string | null {
  return UNIT_ALIASES[normalizeToken(token)] ?? null;
}

/** "2", "2.5", "2,5", "1/2", "½", "1½", "חצי", "x3", "×3" → number, or null when the token is not a quantity. */
function quantityOf(token: string): number | null {
  const t = token.replace(/^[x×*]/i, "").replace(/[x×*]$/i, "");
  if (!t) return null;
  if (QUANTITY_WORDS[t] !== undefined) return QUANTITY_WORDS[t]!;
  const mixed = t.match(/^(\d+)?([¼½¾⅓⅔])$/);
  if (mixed) return (mixed[1] ? parseInt(mixed[1], 10) : 0) + UNICODE_FRACTIONS[mixed[2]!]!;
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac && Number(frac[2]) > 0) return Math.round((Number(frac[1]) / Number(frac[2])) * 1000) / 1000;
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return parseFloat(t.replace(",", "."));
  return null;
}

/**
 * Splits one typed line into name / quantity / unit. The number may come first
 * ("15 מלפפון", "2 ק"ג עגבניות") or last ("מלפפון 15", "עגבניות 2 ק"ג", "פלפל x3").
 * A word is treated as a unit only when it is a known unit, so "פלפל צהוב" stays
 * one name and "15 פלפל צהוב" is 15 of "פלפל צהוב".
 */
export function parseShoppingLine(line: string): ParsedShoppingLine {
  let text = line
    .trim()
    .replace(/^[-•*·]\s*/, "")
    .replace(/[.。]+$/, "")
    // "2ק"ג" → "2 ק"ג", "1½" stays as one token (handled by quantityOf)
    .replace(/(\d)([^\d\s.,/%¼½¾⅓⅔x×])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { name: "", quantity: null, unit: null };

  const tokens = text.split(" ");
  const empty = { name: text, quantity: null, unit: null };
  if (tokens.length < 2) return empty;

  // Quantity first: "15 מלפפון", "2 ק"ג עגבניות", "חצי קילו בשר", "x3 פלפל"
  const leadQty = quantityOf(tokens[0]!);
  if (leadQty !== null) {
    let rest = tokens.slice(1);
    let unit: string | null = null;
    if (rest.length >= 2 && unitOf(rest[0]!)) {
      unit = unitOf(rest[0]!);
      rest = rest.slice(1);
    }
    return { name: rest.join(" "), quantity: leadQty, unit };
  }

  // Quantity last: "מלפפון 15", "עגבניות 2 ק"ג", "פלפל צהוב x3"
  const last = tokens[tokens.length - 1]!;
  const beforeLast = tokens[tokens.length - 2]!;
  if (tokens.length >= 3 && unitOf(last) && quantityOf(beforeLast) !== null) {
    return { name: tokens.slice(0, -2).join(" "), quantity: quantityOf(beforeLast), unit: unitOf(last) };
  }
  const tailQty = quantityOf(last);
  if (tailQty !== null && !/%$/.test(last)) {
    return { name: tokens.slice(0, -1).join(" "), quantity: tailQty, unit: null };
  }
  return empty;
}

// ---------------------------------------------------------------------------
// What is it and where is it sold. First match wins, so specific phrases
// ("פלפל שחור", "רוטב עגבניות", "אפונה קפואה") come before the general word.
// ---------------------------------------------------------------------------
/** Hebrew letters are not \w, so \b never works; this matches a whole word instead. */
const word = (w: string) => new RegExp(`(?:^|[^\\u0590-\\u05FF])(?:${w})(?:[^\\u0590-\\u05FF]|$)`);

const FROZEN = /קפוא|קפואה|קפואים|קפואות|גליד|ארטיק|קרח(?!ון)|בצק עלים|בצק פילו|מלאווח|ג'חנון/;

const RULES: { re: RegExp; aisle: Aisle; emoji: string }[] = [
  // frozen anything first
  { re: /גליד|ארטיק/, aisle: "קפואים", emoji: "🍨" },
  { re: FROZEN, aisle: "קפואים", emoji: "🧊" },

  // seeds and spices that contain a vegetable word ("פלפל שחור", "שום גרוס")
  { re: /שומשום|פשתן|צ'יה|גרעיני חמני|גרעיני דלעת|גרעינים/, aisle: "יבשים ודגנים", emoji: "🥜" },
  { re: /פלפל שחור|פלפל לבן|פלפל גרוס|פלפל אנגלי|פלפל קאיין|פלפל סצ'ואן/, aisle: "תבלינים", emoji: "🧂" },
  { re: /צ'ילי יבש|פלפל חריף יבש|שאטה|חריף גרוס/, aisle: "תבלינים", emoji: "🌶️" },
  { re: /פפריק|כמון|כורכום|קינמון|זעתר|סומאק|קארי|ציפורן|אגוז מוסקט|כוסברה טחונה|שום גרוס|אבקת שום|אבקת בצל|חוואיג|בהרט|ראס אל חנות|עלי דפנה|זרעי|שומר טחון|ג'ינג'ר טחון|תבלין|תבליני|תערובת תבלינים|אבקת מרק|מרק עוף אבקה|מלח/, aisle: "תבלינים", emoji: "🧂" },
  { re: word("הל"), aisle: "תבלינים", emoji: "🧂" },
  { re: /וניל|תמצית|אבקת אפי|סודה לשתי|שמרים|ג'לטין|אינסטנט פודינג|אבקת קקאו|קקאו/, aisle: "יבשים ודגנים", emoji: "🧁" },

  // sauces, spreads, jars, cans
  { re: /רוטב עגבניות|רסק עגבניות|פסטה רוטב|עגבניות מרוסקות|עגבניות משומרות|עגבניות קופסה|פסאטה|חלב קוקוס|קרם קוקוס|שום טחון|שום כתוש|שום קצוץ/, aisle: "שימורים ורטבים", emoji: "🥫" },
  { re: /תירס שימור|תירס קופס|תירס בקופס|אפונה שימור|שימורי|שימורים|קופסת|טונה|סרדינ/, aisle: "שימורים ורטבים", emoji: "🥫" },
  { re: /מלפפון חמוץ|מלפפונים חמוצים|חמוצים/, aisle: "שימורים ורטבים", emoji: "🥒" },
  { re: /כרוב כבוש|זיתים|זית ירוק|זית שחור|זית מגולע/, aisle: "שימורים ורטבים", emoji: "🫒" },
  { re: /דבש/, aisle: "שימורים ורטבים", emoji: "🍯" },
  { re: /חמאת בוטנים|ממרח|נוטלה|ריבה|קונפיטור|טחינה גולמית|טחינה/, aisle: "שימורים ורטבים", emoji: "🫙" },
  { re: /קטשופ|מיונז|חרדל|סויה|טריאקי|סריראצ|צ'ילי מתוק|רוטב|חומץ|סילאן|מייפל|פסטו|סלסה|חומוס מוכן|סלט מוכן|טהיני|חרוסת|עמבה|סחוג|חריף/, aisle: "שימורים ורטבים", emoji: "🥫" },

  // things with a colour or a fruit in the name that are not what they sound like
  { re: /שעועית ירוקה|שעועית צהובה|לוביה ירוקה|אפונה טרי|אפונה בתרמיל/, aisle: "ירקות ופירות", emoji: "🫛" },
  { re: /תמר|צימוק|חמוצי|משמש מיוב|פירות יבשים|שזיפים מיובשים/, aisle: "יבשים ודגנים", emoji: "🍇" },

  // dairy and eggs
  { re: /ביצ/, aisle: "מוצרי חלב וביצים", emoji: "🥚" },
  { re: /גבינה צהובה|גבינה צהוב|עמק|גאודה|מוצרל|פרמזן|פטה|בולגרית|צפתית|קממבר|צ'דר|גבינת עיזים|גבינה כחולה|רוקפור|גבינת כבשים|גבינ/, aisle: "מוצרי חלב וביצים", emoji: "🧀" },
  { re: word("ברי"), aisle: "מוצרי חלב וביצים", emoji: "🧀" },
  { re: /קוטג|לאבנה|ריקוטה|מסקרפונה|שמנת|יוגורט|קפיר|אשל|דנונה|מעדן|פודינג|חלב|משקה שקדים|משקה שיבולת|משקה סויה/, aisle: "מוצרי חלב וביצים", emoji: "🥛" },
  { re: /חמאה|מרגרינ/, aisle: "מוצרי חלב וביצים", emoji: "🧈" },
  { re: /טופו|סייטן|טמפה/, aisle: "מוצרי חלב וביצים", emoji: "🥡" },

  // meat
  { re: /חזה עוף|שניצל|פרגית|כרעיים|שוקיים|כנפיים|עוף|הודו|פסטרמה|כבד/, aisle: "בשר ועוף", emoji: "🍗" },
  { re: /בשר|בקר|טחון|אנטריקוט|סינטה|פילה בקר|צלעות|אסאדו|שייטל|כתף|קבב|המבורגר|קציצות|נקניק|סלמי|טלה|כבש|שווארמה|מרגז|חזיר|בייקון/, aisle: "בשר ועוף", emoji: "🥩" },

  // fish ("דג" but not "דגנים")
  { re: /שרימפס|פירות ים|קלמרי|מולים|סרטן|לובסטר/, aisle: "דגים", emoji: "🦐" },
  { re: /סלמון|דג(?!נ)|אמנון|מושט|לברק|דניס|בורי|פורל|הרינג|מטיאס|בקלה|נסיכה|סושי/, aisle: "דגים", emoji: "🐟" },
  { re: word("בס"), aisle: "דגים", emoji: "🐟" },

  // bakery (bread crumbs are dry goods; "בייגלה" is a snack)
  { re: /פירורי לחם|פנקו/, aisle: "יבשים ודגנים", emoji: "🌾" },
  { re: /קרואסון|בורקס|מאפה|עוגה|עוגת|בראוניז|מאפין|דונאט|סופגני|רוגלך/, aisle: "מאפייה", emoji: "🥐" },
  { re: /לחם|פיתה|פיתות|חלה|חלות|לחמני|בגט|ג'בטה|טורטי|טוסט|בייגל(?!ה)|פיצה/, aisle: "מאפייה", emoji: "🍞" },

  // drinks (before produce, so "מיץ תפוזים" is a drink)
  { re: /יין|בירה|ערק|וודק|ויסקי|ג'ין|רום|טקילה|שמפני|קאווה|פרוסקו|ליקר|אלכוהול/, aisle: "משקאות", emoji: "🍷" },
  { re: /קפה|אספרסו|קפסול|נס קפה/, aisle: "משקאות", emoji: "☕" },
  { re: /חליט|תה ירוק|תה שחור|קמומיל/, aisle: "משקאות", emoji: "🍵" },
  { re: word("תה"), aisle: "משקאות", emoji: "🍵" },
  { re: /מיץ|משקה|סודה|קולה|ספרייט|פאנטה|פריגת|לימונדה|אנרגיה|אייס טי|מים מינרלים|נביעות|עין גדי|טוניק|שתייה|שתיה/, aisle: "משקאות", emoji: "🧃" },
  { re: word("מים"), aisle: "משקאות", emoji: "💧" },

  // produce: herbs first, then specific vegetables, then the rest
  { re: /בצל ירוק|עירית|שום ירוק/, aisle: "ירקות ופירות", emoji: "🌱" },
  { re: /פטרוזיליה|כוסברה|שמיר|בזיליקום|נענע|לואיזה|טימין|רוזמרין|אורגנו|מרווה|עשבי תיבול|עשב|ג'ינג'ר|לימונית|מליסה/, aisle: "ירקות ופירות", emoji: "🌿" },
  { re: /פלפל חריף|צ'ילי|צילי|חריפים|ג'לפניו/, aisle: "ירקות ופירות", emoji: "🌶️" },
  { re: /פלפל/, aisle: "ירקות ופירות", emoji: "🫑" },
  { re: /בצל/, aisle: "ירקות ופירות", emoji: "🧅" },
  { re: /שום/, aisle: "ירקות ופירות", emoji: "🧄" },
  { re: /גזר/, aisle: "ירקות ופירות", emoji: "🥕" },
  { re: /עגבני/, aisle: "ירקות ופירות", emoji: "🍅" },
  { re: /מלפפון/, aisle: "ירקות ופירות", emoji: "🥒" },
  { re: /תפוח אדמה|תפו"א|תפוא|תפוחי אדמה|בטטה/, aisle: "ירקות ופירות", emoji: "🥔" },
  { re: /חציל/, aisle: "ירקות ופירות", emoji: "🍆" },
  { re: /אבוקדו/, aisle: "ירקות ופירות", emoji: "🥑" },
  { re: /ברוקולי|כרובית|כרוב|קולורבי/, aisle: "ירקות ופירות", emoji: "🥦" },
  { re: /תירס/, aisle: "ירקות ופירות", emoji: "🌽" },
  { re: /פטרי|שמפיניון|פורטובלו|שיטאקי/, aisle: "ירקות ופירות", emoji: "🍄" },
  { re: /דלעת|דלורית/, aisle: "ירקות ופירות", emoji: "🎃" },
  { re: /חסה|תרד|קייל|רוקט|מנגולד|עלים|עלי\s|סלרי|כרישה|בוק צ'וי|ארוגולה|רגלה/, aisle: "ירקות ופירות", emoji: "🥬" },
  { re: /לימון|ליים/, aisle: "ירקות ופירות", emoji: "🍋" },
  { re: /תפוז|קלמנטי|מנדרינ|אשכולית|פומל/, aisle: "ירקות ופירות", emoji: "🍊" },
  { re: /תפוח/, aisle: "ירקות ופירות", emoji: "🍎" },
  { re: /בננ/, aisle: "ירקות ופירות", emoji: "🍌" },
  { re: /תות/, aisle: "ירקות ופירות", emoji: "🍓" },
  { re: /ענב/, aisle: "ירקות ופירות", emoji: "🍇" },
  { re: /אבטיח/, aisle: "ירקות ופירות", emoji: "🍉" },
  { re: /מלון/, aisle: "ירקות ופירות", emoji: "🍈" },
  { re: /אפרסק|נקטרינ|משמש|שזיף/, aisle: "ירקות ופירות", emoji: "🍑" },
  { re: /אגס/, aisle: "ירקות ופירות", emoji: "🍐" },
  { re: /מנגו/, aisle: "ירקות ופירות", emoji: "🥭" },
  { re: /אננס/, aisle: "ירקות ופירות", emoji: "🍍" },
  { re: /קיווי/, aisle: "ירקות ופירות", emoji: "🥝" },
  { re: /רימון|אוכמני|פטל|דובדבן|ליצ'י|פסיפלורה|תאנ|פפאיה|גויאב|שסק|פירות/, aisle: "ירקות ופירות", emoji: "🍒" },
  { re: /קוקוס/, aisle: "ירקות ופירות", emoji: "🥥" },
  { re: /קישוא|זוקיני|שומר|סלק|צנון|צנונית|לפת|ארטישוק|אספרגוס|במיה|שורש|ירק|ירקות|סלט/, aisle: "ירקות ופירות", emoji: "🥒" },

  // dry goods and grains
  { re: /אורז|ריזוטו|ארבוריו/, aisle: "יבשים ודגנים", emoji: "🍚" },
  { re: /פסט|ספגטי|אטרי|נודלס|פנה|רביולי|לזני|פטוצ'יני|מקרוני|פוזילי|פתיתים|פתיתי/, aisle: "יבשים ודגנים", emoji: "🍝" },
  { re: /קמח|סולת|קוסקוס|בורגול|שיבולת שועל|קוואקר|קינואה|גריסים|כוסמת|פריקה|דגני בוקר|דגנים|קורנפלקס|גרנולה|מיוזלי|קורנפלור|עמילן|שקדי מרק|פירורי/, aisle: "יבשים ודגנים", emoji: "🌾" },
  { re: /סוכר(?!י)|אבקת סוכר|סטיביה|ממתיק/, aisle: "יבשים ודגנים", emoji: "🍬" },
  { re: /שוקולד מריר|שוקולד לאפי|שבבי שוקולד|שוקולד צ'יפס|שוקולד לבן|שוקולד חלב לאפי/, aisle: "יבשים ודגנים", emoji: "🍫" },
  { re: /חומוס|עדש|שעועית|אפונ|פול|לוביה|קטני|גרגרי/, aisle: "יבשים ודגנים", emoji: "🫘" },
  { re: /אגוז|שקד|פקאן|קשיו|בוטן|פיסטוק|צנובר|גרעינ|לוז|מקדמיה|חמניה/, aisle: "יבשים ודגנים", emoji: "🥜" },
  { re: /שמן/, aisle: "יבשים ודגנים", emoji: "🫙" },

  // snacks and sweets
  { re: /במבה|ביסלי|אפרופו|דוריטוס|צ'יפס|תפוצ'יפס|פופקורן|קרקר|בייגלה|פרעצל|חטיף|נשנוש/, aisle: "חטיפים ומתוקים", emoji: "🍿" },
  { re: /שוקולד|פרלין|קינדר|טופי|מילקה|עלית/, aisle: "חטיפים ומתוקים", emoji: "🍫" },
  { re: /סוכרי|ממתק|מסטיק|לקק|גומי|מרשמלו|וופל|ביסקוויט|עוגי|פתי בר|לוטוס|אוראו|חלווה/, aisle: "חטיפים ומתוקים", emoji: "🍬" },

  // household (not food at all)
  { re: /נייר טואלט|טישו|ממחט|נייר סופג|מגבת נייר|נייר אפי|נייר כסף|ניילון נצמד|שקיות אשפה|שקיות ניילון|כוסות חד|צלחות חד|סכו"ם חד/, aisle: "בית וניקיון", emoji: "🧻" },
  { re: /מטרנה|סימילאק|תמ"ל|נוטרילון|בקבוק לתינוק|דייסה/, aisle: "בית וניקיון", emoji: "🍼" },
  { re: /חיתול|מגבונים|מגבוני/, aisle: "בית וניקיון", emoji: "👶" },
  { re: /סבון|שמפו|מרכך|משחת שיניים|מברשת שיניים|דאודורנט|תער|קרם ידיים|קרם גוף|קרם פנים/, aisle: "בית וניקיון", emoji: "🧴" },
  { re: /אבקת כביסה|ג'ל כביסה|מרכך כביסה|נוזל כלים|סבון כלים|טבליות למדיח|אקונומיקה|מנקה|חומר ניקוי|מטלית|ספוג|סקוטש|כפפות|מגב|מטאטא/, aisle: "בית וניקיון", emoji: "🧽" },
  { re: /גפרור|מצית/, aisle: "בית וניקיון", emoji: "🕯️" },
  { re: word("נר|נרות"), aisle: "בית וניקיון", emoji: "🕯️" },
  { re: /סוללה|סוללות|נורה|נורת/, aisle: "בית וניקיון", emoji: "🔋" },
  { re: /מזון לכלב|אוכל לכלב|כלב/, aisle: "בית וניקיון", emoji: "🐶" },
  { re: /מזון לחתול|אוכל לחתול|חתול|חול לחתול/, aisle: "בית וניקיון", emoji: "🐱" },
];

export interface GroceryGuess {
  aisle: Aisle;
  emoji: string;
  /** false when no keyword matched; the server may then ask the model. */
  confident: boolean;
}

/**
 * Final letters change in the plural ("מלפפון" → "מלפפונים"), so both the
 * keywords and the name are matched with final letters folded to their regular form.
 */
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const unfinal = (text: string) => text.replace(/[ךםןףץ]/g, (c) => FINALS[c]!);
const COMPILED = RULES.map((rule) => ({ ...rule, re: new RegExp(unfinal(rule.re.source), rule.re.flags) }));

/** Best guess for a name typed by hand (or an ingredient the model left vague). */
export function classifyGrocery(name: string): GroceryGuess {
  const n = unfinal(name.trim());
  for (const rule of COMPILED) if (rule.re.test(n)) return { aisle: rule.aisle, emoji: rule.emoji, confident: true };
  return { aisle: "אחר", emoji: AISLE_EMOJI["אחר"]!, confident: false };
}

/** Emoji for an ingredient or shopping item: a stored one, then by name, then by aisle, then a basket. */
export function itemEmoji(name: string, aisle?: string | null, stored?: string | null): string {
  if (stored) return stored;
  const guess = classifyGrocery(name);
  if (guess.confident) return guess.emoji;
  if (aisle && AISLE_EMOJI[aisle]) return AISLE_EMOJI[aisle]!;
  return "🛒";
}

/** Best-guess supermarket section for an item typed by hand. */
export function guessAisle(name: string): Aisle {
  return classifyGrocery(name).aisle;
}

export function isKnownAisle(value: string | null | undefined): value is Aisle {
  return Boolean(value) && (AISLES as readonly string[]).includes(value as string);
}

// ---------------------------------------------------------------------------
// Shopping lists
// ---------------------------------------------------------------------------
export type ShoppingListStatus = "open" | "done";

export interface ShoppingListRow {
  id: string;
  household_id: string;
  title: string | null;
  status: ShoppingListStatus;
  created_at: string;
  done_at: string | null;
}

/** A list with how much is in it (what the lists endpoint returns). */
export interface ShoppingListSummary extends ShoppingListRow {
  total: number;
  checked: number;
  unavailable: number;
}

/** "19.10.26" for the day the list was shopped (done) or created (open). */
export function formatListDate(list: Pick<ShoppingListRow, "created_at" | "done_at">): string {
  const d = new Date(list.done_at ?? list.created_at);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

/** The name shown for a list: its title when the family gave it one, else its date. */
export function shoppingListLabel(list: Pick<ShoppingListRow, "title" | "created_at" | "done_at">): string {
  return list.title?.trim() || formatListDate(list);
}
