import { Platform } from "react-native";

declare global {
  // Injected into index.html by the server when the web build is served from it.
  var __ENV__: Record<string, string | undefined> | undefined;
}

/**
 * Public config. Native builds and `expo start` inline EXPO_PUBLIC_* at build
 * time; the deployed web app gets them injected at request time by the server,
 * so one web bundle works on any domain.
 */
function read(key: string, buildTimeValue: string | undefined): string | undefined {
  const injected = Platform.OS === "web" ? globalThis.__ENV__ : undefined;
  if (injected) return injected[key] || undefined;
  return buildTimeValue || undefined;
}

export const env = {
  apiUrl:
    read("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL) ??
    (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "http://localhost:8787"),
};
