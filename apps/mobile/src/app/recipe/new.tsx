import { router } from "expo-router";
import {} from "react-native";

import { RecipeForm } from "@/components/recipe-form";
import { Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { keys, useSaveRecipe } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { dialog } from "@/lib/dialog";

export default function NewRecipeScreen() {
  const save = useSaveRecipe();
  const queryClient = useQueryClient();
  return (
    <Screen>
      <RecipeForm
        saving={save.isPending}
        onSave={(input) =>
          save.mutate(
            { input },
            {
              onSuccess: (row) => {
                if (!row.image_url)
                  api
                    .findImage(row.id)
                    .then(() =>
                      queryClient.invalidateQueries({ queryKey: keys.recipes }),
                    )
                    .catch(() => undefined);
                router.replace({
                  pathname: "/recipe/[id]",
                  params: { id: row.id },
                });
              },
              onError: (e) => dialog.alert("השמירה נכשלה", e.message),
            },
          )
        }
      />
    </Screen>
  );
}
