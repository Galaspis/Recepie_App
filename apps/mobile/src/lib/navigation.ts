import { router, type Href } from "expo-router";

/**
 * Back that never throws: when the screen was opened directly (a shared link,
 * a refresh, a bookmark) there is no history, so go home instead.
 */
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
