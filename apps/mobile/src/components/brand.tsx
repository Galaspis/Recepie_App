import { Image, StyleSheet, Text, View } from "react-native";

import { BRAND, Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Approved logo (kort-assets/logo): "KORT" with the leaf in the O and the seasoning bird.
const LOGO = require("@/assets/brand/kort-logo.png");
const LOGO_RATIO = 640 / 216;
const BIRD = require("@/assets/brand/kort-bird.png");
const BIRD_RATIO = 512 / 562;

/**
 * The KORT logo as one unit, so its proportions never change. `width` is the
 * rendered width (the brand guide suggests 160-180 on a phone).
 */
export function Wordmark({ width = 176, withTagline }: { width?: number; withTagline?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel={`${BRAND.latin} ${BRAND.name}`}>
      <Image source={LOGO} style={{ width, height: width / LOGO_RATIO }} resizeMode="contain" accessibilityIgnoresInvertColors />
      {withTagline ? (
        <Text style={[styles.tagline, { color: theme.textSecondary, fontSize: Math.max(13, width * 0.08) }]}>{BRAND.tagline}</Text>
      ) : null}
    </View>
  );
}

/** The bird on its own (splash-like screens, empty states). */
export function Bird({ height = 96 }: { height?: number }) {
  return <Image source={BIRD} style={{ width: height * BIRD_RATIO, height }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  tagline: { fontFamily: Fonts.regular, writingDirection: "rtl", marginTop: 8 },
});
