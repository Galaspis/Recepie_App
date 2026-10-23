import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, type RecipeContent, type RecipeRow } from "@recipe/shared";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Button, Chip, Field, Row } from "@/components/ui";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import { dialog } from "@/lib/dialog";
import {
  ingredientLine,
  parseDurationFromText,
  parseIngredientLine,
} from "@/lib/format";
import { uploadRecipeImage, useRecipes, type RecipeInput } from "@/lib/queries";

interface Props {
  initial?: RecipeRow;
  saving: boolean;
  onSave: (input: Partial<RecipeInput>) => void;
}

/**
 * One form for both "new" and "edit". Ingredients and steps are typed as
 * free text, one per line; on save the server parses them into structure
 * and fills category/tags/aisles/timers. If the server is down we parse
 * locally so saving always works.
 */
export function RecipeForm({ initial, saving, onSave }: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState(
    initial?.servings ? String(initial.servings) : "",
  );
  const [prep, setPrep] = useState(
    initial?.prep_minutes ? String(initial.prep_minutes) : "",
  );
  const [cook, setCook] = useState(
    initial?.cook_minutes ? String(initial.cook_minutes) : "",
  );
  const [category, setCategoryState] = useState<string>(
    initial?.category ?? "מנה עיקרית",
  );
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState(initial?.tags.join(", ") ?? "");
  const { data: allRecipes } = useRecipes();
  // Built-in categories plus whatever the family already uses.
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    for (const r of allRecipes ?? []) if (r.category) set.add(r.category);
    set.add(category);
    return [...set];
  }, [allRecipes, category]);
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRecipes ?? [])
      for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t]) => t);
  }, [allRecipes]);
  const userTags = useMemo(
    () => [
      ...new Set(
        tagsText
          .split(/[,\n،]/)
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      ),
    ],
    [tagsText],
  );
  function setCategory(value: string) {
    setCategoryState(value);
    setCategoryTouched(true);
  }
  function toggleTag(tag: string) {
    const next = userTags.includes(tag)
      ? userTags.filter((t) => t !== tag)
      : [...userTags, tag];
    setTagsText(next.join(", "));
  }
  const [ingredientsText, setIngredientsText] = useState(
    initial?.ingredients.map(ingredientLine).join("\n") ?? "",
  );
  const [stepsText, setStepsText] = useState(
    initial?.steps.map((s) => s.text).join("\n") ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [imageUri, setImageUri] = useState<string | null>(
    initial?.image_url ?? null,
  );
  // Smart parsing is on for new recipes; when editing we keep the user's words unless they ask.
  const [smart, setSmart] = useState(!initial);
  const [busy, setBusy] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  async function submit() {
    if (!title.trim()) return dialog.alert("רגע", "למתכון צריך שם");
    if (!ingredientsText.trim() || !stepsText.trim())
      return dialog.alert("רגע", "צריך לפחות מצרך אחד ושלב אחד");
    setBusy(true);
    try {
      const num = (v: string) =>
        v.trim() ? Number(v.replace(",", ".")) || null : null;
      let content: Partial<RecipeContent> | null = null;
      if (smart) {
        try {
          content = await api.enrich({
            title: title.trim(),
            description: description.trim() || null,
            servings: num(servings),
            ingredientsText,
            stepsText,
          });
        } catch (err) {
          console.warn(
            "enrich failed, falling back to local parse",
            (err as Error).message,
          );
        }
      }
      if (!content) {
        content = {
          ingredients: ingredientsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map(parseIngredientLine),
          steps: stepsText
            .split("\n")
            .map((l) => l.trim().replace(/^\d+[.)]\s*/, ""))
            .filter(Boolean)
            .map((text) => ({
              text,
              duration_seconds: parseDurationFromText(text),
              group: null,
            })),
          tags: initial?.tags ?? [],
          difficulty: initial?.difficulty ?? "בינוני",
          cuisine: initial?.cuisine ?? null,
          warnings: [],
          confidence: "high",
          original_language: "he",
        };
      }

      let image_url = initial?.image_url ?? null;
      if (imageUri && imageUri !== initial?.image_url)
        image_url = await uploadRecipeImage(imageUri);
      if (!imageUri) image_url = null;

      onSave({
        ...content,
        title: title.trim(),
        description: description.trim() || content.description || null,
        servings: num(servings),
        prep_minutes: num(prep) ?? content.prep_minutes ?? null,
        cook_minutes: num(cook) ?? content.cook_minutes ?? null,
        category:
          categoryTouched || initial || !content.category
            ? category
            : content.category,
        tags: userTags.length || initial ? userTags : (content.tags ?? []),
        notes: notes.trim() || null,
        image_url,
      });
    } catch (err) {
      dialog.alert("לא הצליח", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={pickImage}
          style={[styles.imagePicker, { backgroundColor: theme.elevated }]}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={{ alignItems: "center", gap: 4 }}>
              <Ionicons
                name="camera-outline"
                size={32}
                color={theme.textSecondary}
              />
              <AppText variant="caption" color="textSecondary">
                הוספת תמונה
              </AppText>
            </View>
          )}
          {imageUri ? (
            <Pressable
              onPress={() => setImageUri(null)}
              style={[styles.removeImage, { backgroundColor: theme.overlay }]}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </Pressable>

        <Field
          label="שם המתכון"
          value={title}
          onChangeText={setTitle}
          placeholder="למשל: שקשוקה של סבתא"
        />
        <Field
          label="תיאור קצר (לא חובה)"
          value={description}
          onChangeText={setDescription}
        />

        <Row style={{ gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field
              label="מנות"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholder="4"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="הכנה (דק׳)"
              value={prep}
              onChangeText={setPrep}
              keyboardType="numeric"
              placeholder="15"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="בישול (דק׳)"
              value={cook}
              onChangeText={setCook}
              keyboardType="numeric"
              placeholder="30"
            />
          </View>
        </Row>

        <View style={{ gap: Spacing.xs }}>
          <AppText variant="label" color="textSecondary">
            קטגוריה
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.xs }}
          >
            {categoryOptions.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
            <Chip
              label="+ קטגוריה חדשה"
              icon="add"
              tone="accent"
              onPress={() => setNewCategory(newCategory === null ? "" : null)}
            />
          </ScrollView>
          {newCategory !== null ? (
            <Row style={{ gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  value={newCategory}
                  onChangeText={setNewCategory}
                  placeholder="למשל: דגים, עוף, שבת"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newCategory.trim()) setCategory(newCategory.trim());
                    setNewCategory(null);
                  }}
                />
              </View>
              <Button
                title="הוספה"
                variant="secondary"
                disabled={!newCategory.trim()}
                onPress={() => {
                  setCategory(newCategory.trim());
                  setNewCategory(null);
                }}
              />
            </Row>
          ) : null}
        </View>

        <View style={{ gap: Spacing.xs }}>
          <Field
            label="תגיות (מופרדות בפסיק)"
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="למשל: טבעוני, מהיר, לילדים"
          />
          {tagSuggestions.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.xs }}
            >
              {tagSuggestions.map((t) => (
                <Chip
                  key={t}
                  label={`#${t}`}
                  selected={userTags.includes(t)}
                  onPress={() => toggleTag(t)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        <Field
          label="מצרכים (אחד בכל שורה)"
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          placeholder={"2 כוסות קמח\n3 ביצים\nמלח לפי הטעם"}
        />
        <Field
          label="אופן ההכנה (שלב בכל שורה)"
          value={stepsText}
          onChangeText={setStepsText}
          multiline
          placeholder={
            "מחממים תנור ל-180 מעלות\nמערבבים את כל המצרכים\nאופים 25 דקות"
          }
          style={{ minHeight: 160 }}
        />
        <Field
          label="הערות שלי (לא חובה)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 80 }}
        />

        <Pressable
          onPress={() => setSmart((s) => !s)}
          style={[
            styles.smartRow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name={smart ? "checkbox" : "square-outline"}
            size={24}
            color={smart ? theme.primary : theme.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <AppText variant="label">סידור חכם</AppText>
            <AppText variant="caption" color="textSecondary">
              מפרק מצרכים לכמות ויחידה, מוסיף טיימרים לשלבים, תגיות ומחלקות
              בסופר
            </AppText>
          </View>
        </Pressable>

        <Button
          title={initial ? "שמירת שינויים" : "שמירת המתכון"}
          size="lg"
          loading={busy || saving}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
  imagePicker: {
    height: 170,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  removeImage: {
    position: "absolute",
    top: 8,
    end: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  smartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
    padding: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
