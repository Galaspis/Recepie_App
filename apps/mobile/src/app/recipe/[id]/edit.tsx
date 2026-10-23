import { useLocalSearchParams } from "expo-router";
import {} from "react-native";

import { RecipeForm } from "@/components/recipe-form";
import { Loading, Screen } from "@/components/ui";
import { goBack } from "@/lib/navigation";
import { useRecipe, useSaveRecipe } from "@/lib/queries";
import { dialog } from "@/lib/dialog";

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe } = useRecipe(id);
  const save = useSaveRecipe();
  if (!recipe) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  return (
    <Screen>
      <RecipeForm
        initial={recipe}
        saving={save.isPending}
        onSave={(input) =>
          save.mutate(
            { id: recipe.id, input },
            {
              onSuccess: () => goBack(),
              onError: (e) => dialog.alert("השמירה נכשלה", e.message),
            },
          )
        }
      />
    </Screen>
  );
}
