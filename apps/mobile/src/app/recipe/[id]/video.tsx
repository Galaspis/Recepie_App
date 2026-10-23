import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";

import { AppText, Button, Card, Loading, Row, Screen } from "@/components/ui";
import { VideoEmbed } from "@/components/video-embed";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import { dialog } from "@/lib/dialog";
import { keys, useRecipe } from "@/lib/queries";
import { embedUrl, isStoredVideo, PLATFORM_LABEL } from "@/lib/video";

export default function VideoScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe } = useRecipe(id);
  const fetchVideo = useMutation({
    mutationFn: () => api.fetchVideo(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.recipe(id!) });
      queryClient.invalidateQueries({ queryKey: keys.recipes });
    },
    onError: (e) => dialog.alert("לא הצליח", e.message),
  });

  if (!recipe) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  const stored = isStoredVideo(recipe.video_url);
  const source = recipe.source_url ?? recipe.video_url;
  const url = stored
    ? recipe.video_url!
    : embedUrl(source, recipe.source_platform);

  return (
    <Screen>
      {url ? <VideoEmbed url={url} /> : null}
      <View style={styles.footer}>
        <AppText
          variant="caption"
          color="textSecondary"
          style={{ textAlign: "center" }}
        >
          {recipe.title}
        </AppText>
        {!stored ? (
          <Card
            flat
            style={[
              styles.hint,
              {
                backgroundColor: theme.primarySoft,
                borderColor: theme.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="cloud-download-outline"
              size={22}
              color={theme.primary}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">הסרטון לא מתנגן?</AppText>
              <AppText variant="caption" color="textSecondary">
                אינסטגרם ופייסבוק לא תמיד מאפשרים להציג סרטונים מחוץ לאפליקציה
                שלהם. קורט יכול לשמור עותק של הסרטון כדי שיתנגן כאן תמיד.
              </AppText>
            </View>
          </Card>
        ) : null}
        <Row style={{ gap: Spacing.sm }}>
          {!stored ? (
            <Button
              title="שמירת הסרטון בקורט"
              icon="cloud-download-outline"
              style={{ flex: 1 }}
              loading={fetchVideo.isPending}
              onPress={() => fetchVideo.mutate()}
            />
          ) : null}
          {source ? (
            <Button
              title={`פתיחה ב${PLATFORM_LABEL[recipe.source_platform]}`}
              icon="open-outline"
              variant={stored ? "secondary" : "outline"}
              style={{ flex: 1 }}
              onPress={() => Linking.openURL(source)}
            />
          ) : null}
        </Row>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { padding: Spacing.md, gap: Spacing.md },
  hint: {
    flexDirection: "row",
    gap: Spacing.sm + 4,
    padding: Spacing.sm + 4,
    alignItems: "center",
  },
});
