import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RecipeCard } from "@/components/recipe-card";
import { AppText, EmptyState, Loading, Screen } from "@/components/ui";
import { Spacing } from "@/constants/theme";
import { useRecipes } from "@/lib/queries";

/** "הרשימה שלי": the recipes the family marked with a heart. */
export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useRecipes();
  const favorites = useMemo(
    () => (data ?? []).filter((r) => r.is_favorite),
    [data],
  );

  return (
    <Screen>
      <FlatList
        data={favorites}
        keyExtractor={(r) => r.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.sm + 4 }}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + Spacing.md },
        ]}
        ListHeaderComponent={
          <View style={{ marginBottom: Spacing.md }}>
            <AppText variant="display">הרשימה שלי</AppText>
            <AppText color="textSecondary">
              {favorites.length
                ? `${favorites.length} מתכונים שסימנתם בלב`
                : "המתכונים שתסמנו בלב יופיעו כאן"}
            </AppText>
          </View>
        }
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        ItemSeparatorComponent={() => (
          <View style={{ height: Spacing.sm + 4 }} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <Loading />
          ) : (
            <EmptyState
              emoji="❤️"
              title="עדיין ריק כאן"
              subtitle="פותחים מתכון ולוחצים על הלב כדי לשמור אותו לרשימה שלכם"
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, paddingBottom: 100, flexGrow: 1 },
});
