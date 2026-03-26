import type {
  MealPlanEntry,
  PantryItem,
  PantryStatus,
  Recipe,
  RecipeCardView,
  RecipeIngredient,
  ShoppingExplanation,
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemSource
} from './types.js';

interface CreateMealPlanEntryInput {
  id: string;
  recipe: Recipe;
  date: string;
  mealType: MealPlanEntry['mealType'];
  servings?: number;
  leftoversIntent?: MealPlanEntry['leftoversIntent'];
  notes?: string;
  shoppingMode?: MealPlanEntry['shoppingMode'];
  nowIso?: string;
}

interface DeriveShoppingListInput {
  shoppingListId: string;
  scope: ShoppingList['scope'];
  plannedMeals: MealPlanEntry[];
  recipeById: Record<string, Recipe>;
  pantryItems?: PantryItem[];
  stapleItemKeys?: string[];
  nowIso?: string;
}

const DEFAULT_STAPLES = new Set(['salt', 'pepper', 'oil', 'olive_oil', 'water']);
const INGREDIENT_ALIASES: Record<string, string> = {
  scallion: 'green_onion',
  scallions: 'green_onion',
  green_onions: 'green_onion',
  spring_onion: 'green_onion',
  spring_onions: 'green_onion',
  garbanzo_beans: 'chickpeas',
  garbanzo: 'chickpeas',
  chickpea: 'chickpeas',
  cilantro: 'coriander_leaf',
  coriander_leaves: 'coriander_leaf',
  bell_peppers: 'bell_pepper',
  capsicum: 'bell_pepper'
};

const roundQuantity = (value: number): number => Math.round(value * 100) / 100;

const normalizeItemKey = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeIngredientAlias = (itemKey: string): string => {
  const normalized = normalizeItemKey(itemKey);
  return INGREDIENT_ALIASES[normalized] ?? normalized;
};

const derivePantryStatus = (itemKey: string, pantryByKey: Map<string, PantryItem>): { pantryStatus: PantryStatus; stapleAssumed: boolean } => {
  const pantryMatch = pantryByKey.get(itemKey);
  if (pantryMatch) {
    return {
      pantryStatus: pantryMatch.status,
      stapleAssumed: Boolean(pantryMatch.staple)
    };
  }

  if (DEFAULT_STAPLES.has(itemKey)) {
    return {
      pantryStatus: 'on_hand',
      stapleAssumed: true
    };
  }

  return {
    pantryStatus: 'not_on_hand',
    stapleAssumed: false
  };
};

export const scaleRecipeIngredients = (recipe: Recipe, targetServings?: number): RecipeIngredient[] => {
  if (!targetServings || !recipe.servingsDefault || recipe.servingsDefault <= 0) {
    return recipe.ingredients;
  }

  const scaleFactor = targetServings / recipe.servingsDefault;
  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity === null ? null : roundQuantity(ingredient.quantity * scaleFactor)
  }));
};

export const createMealPlanEntry = ({
  id,
  recipe,
  date,
  mealType,
  servings,
  leftoversIntent = 'none',
  notes,
  shoppingMode = 'include_missing_only',
  nowIso = new Date().toISOString()
}: CreateMealPlanEntryInput): MealPlanEntry => ({
  id,
  recipeId: recipe.id,
  date,
  mealType,
  servings,
  leftoversIntent,
  status: 'planned',
  notes,
  shoppingMode,
  sourceSnapshot: {
    recipeTitle: recipe.title,
    recipeVersion: recipe.version
  },
  createdAt: nowIso,
  updatedAt: nowIso
});

export const deriveShoppingList = ({
  shoppingListId,
  scope,
  plannedMeals,
  recipeById,
  pantryItems = [],
  stapleItemKeys = [],
  nowIso = new Date().toISOString()
}: DeriveShoppingListInput): { shoppingList: ShoppingList; items: ShoppingListItem[] } => {
  const pantryByKey = new Map<string, PantryItem>(
    pantryItems.map((item) => [normalizeIngredientAlias(item.itemKey), item])
  );

  for (const stapleItemKey of stapleItemKeys) {
    const key = normalizeIngredientAlias(stapleItemKey);
    if (!pantryByKey.has(key)) {
      pantryByKey.set(key, {
        id: `staple:${key}`,
        itemKey: key,
        displayName: stapleItemKey,
        status: 'on_hand',
        staple: true,
        updatedAt: nowIso
      });
    }
  }

  const aggregate = new Map<string, ShoppingListItem>();

  for (const meal of plannedMeals) {
    if (meal.status === 'skipped') {
      continue;
    }

    const recipe = recipeById[meal.recipeId];
    if (!recipe) {
      continue;
    }

    const scaledIngredients = scaleRecipeIngredients(recipe, meal.servings);

    for (const ingredient of scaledIngredients) {
      const itemKey = normalizeIngredientAlias(ingredient.itemKey || ingredient.displayName);
      if (!itemKey) {
        continue;
      }

      const existing = aggregate.get(itemKey);
      const source: ShoppingListItemSource = {
        mealId: meal.id,
        recipeId: recipe.id,
        recipeTitle: meal.sourceSnapshot.recipeTitle,
        quantity: ingredient.quantity ?? undefined,
        unit: ingredient.unit ?? undefined
      };

      if (!existing) {
        const pantryMeta = derivePantryStatus(itemKey, pantryByKey);
        const includeMissingOnly = meal.shoppingMode === 'include_missing_only';
        const pantrySuppressed = includeMissingOnly && pantryMeta.pantryStatus === 'on_hand';

        aggregate.set(itemKey, {
          id: `shop-item:${itemKey}`,
          itemKey,
          displayName: ingredient.displayName,
          normalizedQuantity: ingredient.quantity ?? undefined,
          normalizedUnit: ingredient.unit ?? undefined,
          sources: [source],
          pantryStatus: pantryMeta.pantryStatus,
          purchaseState: pantrySuppressed ? 'already_have' : ingredient.optional ? 'optional' : 'needed',
          checked: pantrySuppressed,
          optional: ingredient.optional || pantrySuppressed
        });
        continue;
      }

      existing.sources.push(source);

      if (
        ingredient.quantity !== null &&
        existing.normalizedQuantity !== undefined &&
        existing.normalizedUnit === ingredient.unit
      ) {
        existing.normalizedQuantity = roundQuantity(existing.normalizedQuantity + ingredient.quantity);
      } else if (ingredient.quantity !== null && existing.normalizedQuantity === undefined) {
        existing.normalizedQuantity = ingredient.quantity;
      }

      existing.optional = existing.optional && ingredient.optional;
      if (!existing.optional && existing.purchaseState === 'optional') {
        existing.purchaseState = 'needed';
      }
    }
  }

  const items = Array.from(aggregate.values());

  const shoppingList: ShoppingList = {
    id: shoppingListId,
    scope,
    itemIds: items.map((item) => item.id),
    generatedFromMealIds: plannedMeals.map((meal) => meal.id),
    updatedAt: nowIso
  };

  return { shoppingList, items };
};

export const explainShoppingItem = (
  item: ShoppingListItem,
  pantryItems: PantryItem[] = []
): ShoppingExplanation => {
  const pantryByKey = new Map(pantryItems.map((entry) => [normalizeIngredientAlias(entry.itemKey), entry]));
  const pantryItem = pantryByKey.get(item.itemKey);
  const stapleAssumed = pantryItem?.staple ?? DEFAULT_STAPLES.has(item.itemKey);

  const pantryEffect: ShoppingExplanation['pantryImpact']['effect'] =
    item.purchaseState === 'already_have'
      ? 'suppressed'
      : item.purchaseState === 'optional'
        ? 'downgraded'
        : 'added';

  return {
    itemKey: item.itemKey,
    displayName: item.displayName,
    becauseMeals: item.sources.map((source) => ({
      mealId: source.mealId,
      recipeTitle: source.recipeTitle,
      quantity: source.quantity,
      unit: source.unit
    })),
    pantryImpact: {
      pantryStatus: item.pantryStatus,
      stapleAssumed,
      effect: pantryEffect
    },
    finalPurchaseState: item.purchaseState
  };
};

export const generateRecipeCard = (recipe: Recipe, context?: { plannedDate?: string; mealType?: MealPlanEntry['mealType'] }): RecipeCardView => {
  const subtitleParts = [
    recipe.totalTimeMin ? `${recipe.totalTimeMin} min` : undefined,
    context?.plannedDate ? `Planned ${context.plannedDate}` : undefined,
    context?.mealType ? context.mealType : undefined
  ].filter(Boolean);

  return {
    id: `recipe-card:${recipe.id}:${recipe.version}`,
    recipeId: recipe.id,
    title: recipe.title,
    subtitle: subtitleParts.length ? subtitleParts.join(' • ') : undefined,
    ingredientsDisplay: recipe.ingredients.map((ingredient) => ingredient.rawText),
    instructionsDisplay: recipe.instructions
      .sort((a, b) => a.step - b.step)
      .map((instruction) => `${instruction.step}. ${instruction.text}`),
    notesDisplay: recipe.notes?.map((note) => note.text),
    footer: {
      sourceLabel: recipe.source?.label,
      savedInApp: recipe.status === 'saved'
    }
  };
};
