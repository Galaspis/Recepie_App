import { Linking, Platform, StyleSheet, View } from "react-native";

import { AppText, Button, Card, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/providers/auth";

/**
 * Shown only when the server does not recognise us. Normally the gallab login page
 * appears before the app loads, so this is a fallback for an expired session or an
 * account that is not in the family allowlist.
 */
export default function NoAccessScreen() {
  const { refresh } = useAuth();
  const openLogin = () => {
    const url = "https://auth.gallab.top/?redirect_uri=" + encodeURIComponent("https://kort.gallab.top/");
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = url;
    else Linking.openURL(url);
  };
  return (
    <Screen>
      <View style={styles.wrap}>
        <Card style={styles.card}>
          <AppText variant="title">קורט</AppText>
          <AppText color="textSecondary">
            צריך להתחבר עם חשבון הגוגל של המשפחה כדי לראות את המתכונים.
          </AppText>
          <Button title="התחברות" icon="log-in-outline" onPress={openLogin} />
          <Button title="כבר התחברתי, נסו שוב" variant="ghost" onPress={() => refresh()} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: Spacing.md },
  card: { padding: Spacing.lg, gap: Spacing.md },
});
