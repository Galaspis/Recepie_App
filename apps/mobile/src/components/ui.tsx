import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import {
  Fonts,
  Radius,
  Shadows,
  Spacing,
  type ThemeColor,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
type Variant =
  | "display"
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "bodyBold"
  | "caption"
  | "label";

const textStyles: Record<Variant, TextStyle> = {
  display: { fontSize: 34, lineHeight: 42, fontFamily: Fonts.black },
  title: { fontSize: 28, lineHeight: 36, fontFamily: Fonts.black },
  heading: { fontSize: 22, lineHeight: 30, fontFamily: Fonts.bold },
  subheading: { fontSize: 17, lineHeight: 24, fontFamily: Fonts.bold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: Fonts.regular },
  bodyBold: { fontSize: 16, lineHeight: 24, fontFamily: Fonts.bold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.medium },
  label: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.bold },
};

export function AppText({
  variant = "body",
  color = "text",
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: ThemeColor }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        textStyles[variant],
        { color: theme[color], writingDirection: "rtl" },
        style,
      ]}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Screen({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[{ flex: 1, backgroundColor: theme.background }, style]}
      {...rest}
    />
  );
}

export function Card({ style, flat, ...rest }: ViewProps & { flat?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        !flat && Shadows.card,
        style,
      ]}
      {...rest}
    />
  );
}

export function Row({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center" }, style]}
      {...rest}
    />
  );
}

/** Small icon + value tile, used for time / servings / difficulty. */
export function StatTile({
  icon,
  emoji,
  label,
  value,
  children,
}: {
  icon?: IconName;
  emoji?: string;
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={20} color={theme.primary} />
      ) : null}
      {children ?? (
        <AppText variant="label" numberOfLines={1}>
          {value}
        </AppText>
      )}
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

export function Avatar({
  name,
  size = 40,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const theme = useTheme();
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.primarySoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.bold,
          fontSize: size * 0.42,
          color: theme.primary,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "sm" | "md" | "lg";
}

export function Button({
  title,
  icon,
  variant = "primary",
  loading,
  disabled,
  style,
  size = "md",
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const bg =
    variant === "primary"
      ? theme.primary
      : variant === "secondary"
        ? theme.primarySoft
        : variant === "danger"
          ? theme.danger
          : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? theme.onPrimary
      : variant === "ghost"
        ? theme.textSecondary
        : theme.primary;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === "lg" && styles.buttonLg,
        size === "sm" && styles.buttonSm,
        variant === "outline" && {
          borderWidth: 1.5,
          borderColor: theme.primary,
        },
        variant === "primary" && !isDisabled && Shadows.floating,
        {
          backgroundColor: bg,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === "lg" ? 22 : size === "sm" ? 16 : 18}
              color={fg}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              size === "lg" && { fontSize: 18 },
              size === "sm" && { fontSize: 14 },
              { color: fg },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  color = "text",
  size = 24,
  circle,
  style,
  ...rest
}: Omit<PressableProps, "style"> & {
  icon: IconName;
  color?: ThemeColor;
  size?: number;
  /** Round, elevated background (for buttons floating over images). */
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        circle && [
          styles.iconCircle,
          Shadows.card,
          { backgroundColor: theme.card },
        ],
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
      {...rest}
    >
      <Ionicons name={icon} size={size} color={theme[color]} />
    </Pressable>
  );
}

export function Chip({
  label,
  icon,
  emoji,
  selected,
  onPress,
  tone = "neutral",
}: {
  label: string;
  icon?: IconName;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "neutral" | "accent";
}) {
  const theme = useTheme();
  const bg = selected
    ? theme.primary
    : tone === "accent"
      ? theme.accentSoft
      : theme.card;
  const fg = selected
    ? theme.onPrimary
    : tone === "accent"
      ? theme.accent
      : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {emoji ? <Text style={{ fontSize: 14 }}>{emoji}</Text> : null}
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export function Field({
  label,
  style,
  multiline,
  ...rest
}: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
          multiline && { minHeight: 120, paddingTop: 12 },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function EmptyState({
  icon,
  emoji,
  title,
  subtitle,
  children,
}: PropsWithChildren<{
  icon?: IconName;
  emoji?: string;
  title: string;
  subtitle?: string;
}>) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        {emoji ? (
          <Text style={{ fontSize: 40 }}>{emoji}</Text>
        ) : (
          <Ionicons
            name={icon ?? "sparkles-outline"}
            size={36}
            color={theme.primary}
          />
        )}
      </View>
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          color="textSecondary"
          style={{ textAlign: "center", maxWidth: 300 }}
        >
          {subtitle}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

export function SectionTitle({
  children,
  action,
  emoji,
}: PropsWithChildren<{ action?: ReactNode; emoji?: string }>) {
  return (
    <Row style={{ justifyContent: "space-between", marginBottom: Spacing.sm }}>
      <Row style={{ gap: 6 }}>
        {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
        <AppText variant="heading">{children}</AppText>
      </Row>
      {action}
    </Row>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    minHeight: 48,
  },
  buttonLg: { paddingVertical: 16, minHeight: 58 },
  buttonSm: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  buttonText: { fontSize: 16, fontFamily: Fonts.bold },
  iconButton: { padding: 6, borderRadius: Radius.pill },
  iconCircle: {
    width: 42,
    height: 42,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontFamily: Fonts.medium },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: "right",
    writingDirection: "rtl",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
});
