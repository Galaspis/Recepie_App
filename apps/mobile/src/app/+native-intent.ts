import { getShareExtensionKey } from "expo-share-intent";

/**
 * The share extension wakes the app through a deep link that Expo Router
 * would otherwise treat as an unknown route. Send it to the home screen;
 * the root layout picks up the shared content and opens the import screen.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/";
    return path;
  } catch {
    return "/";
  }
}
