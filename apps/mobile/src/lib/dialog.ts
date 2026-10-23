import { Alert, Platform } from "react-native";

/**
 * React Native's Alert does nothing on the web, so every dialog in the app
 * goes through here: native alerts on iOS/Android, browser dialogs on web.
 */
export const dialog = {
  alert(title: string, message?: string): void {
    if (Platform.OS === "web") {
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }
    Alert.alert(title, message);
  },

  /** Asks for one line of text. Resolves null when cancelled (or where no prompt exists). */
  prompt(title: string, initial = ""): Promise<string | null> {
    if (Platform.OS === "web") {
      return Promise.resolve(window.prompt(title, initial));
    }
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      return new Promise((resolve) => {
        Alert.prompt(
          title,
          undefined,
          [
            { text: "ביטול", style: "cancel", onPress: () => resolve(null) },
            { text: "אישור", onPress: (text?: string) => resolve(text ?? null) },
          ],
          "plain-text",
          initial,
        );
      });
    }
    return Promise.resolve(null);
  },

  confirm(
    title: string,
    message?: string,
    options: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    } = {},
  ): Promise<boolean> {
    const {
      confirmText = "אישור",
      cancelText = "ביטול",
      destructive = false,
    } = options;
    if (Platform.OS === "web") {
      return Promise.resolve(
        window.confirm(message ? `${title}\n\n${message}` : title),
      );
    }
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: "cancel", onPress: () => resolve(false) },
          {
            text: confirmText,
            style: destructive ? "destructive" : "default",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  },
};
