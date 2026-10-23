import { useEffect, useState } from "react";
import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** True when running as an installed app (home-screen, no browser UI). */
export function isStandalone(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

/**
 * Chrome (Android/desktop) tells us when Kort can be installed as a real app;
 * `install()` opens its prompt. Null means Chrome offered nothing (yet).
 */
export function useInstallPrompt() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    canInstall: Boolean(deferred),
    installed: isStandalone(),
    install: async () => {
      if (!deferred) return "unavailable" as const;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") deferred = null;
      listeners.forEach((l) => l());
      return outcome;
    },
  };
}
