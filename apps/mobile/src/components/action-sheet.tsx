import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, type IconName } from "@/components/ui";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export interface SheetAction {
  label: string;
  icon?: IconName;
  emoji?: string;
  /** Background of the icon tile; the danger colour also tints the label. */
  color?: string;
  run: () => void;
}

/**
 * Bottom sheet with a title and a column of actions (the same look as the
 * recipe page's "⋯" menu). Extra content can go in children, above the actions.
 */
export function ActionSheet({
  visible,
  title,
  subtitle,
  actions = [],
  onClose,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions?: SheetAction[];
  onClose: () => void;
}>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + Spacing.lg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {title ? (
            <AppText variant="subheading" numberOfLines={2} style={{ textAlign: "center" }}>
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="caption" color="textSecondary" style={{ textAlign: "center" }}>
              {subtitle}
            </AppText>
          ) : null}
          {children}
          {actions.map((item) => {
            const danger = item.color === theme.danger;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  setTimeout(item.run, 150);
                }}
                style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.elevated : "transparent" }]}
              >
                <View style={[styles.icon, { backgroundColor: item.color ?? theme.elevated }]}>
                  {item.emoji ? (
                    <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                  ) : (
                    <Ionicons name={item.icon ?? "ellipse-outline"} size={20} color={item.color ? "#fff" : theme.text} />
                  )}
                </View>
                <AppText variant="bodyBold" style={danger ? { color: theme.danger } : undefined}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
          <Button title="ביטול" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: 4,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  grabber: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: Spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
