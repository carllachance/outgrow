import {
  createMealPlanEntry,
  deriveShoppingList,
  explainShoppingItem,
  generateRecipeCard
} from './derivations.js';
import type {
  MealPlanEntry,
  PantryItem,
  Recipe,
  RecipeCardView,
  ShoppingExplanation,
  ShoppingList,
  ShoppingListItem
} from './types.js';

export interface RecalculateShoppingResult {
  shoppingList: ShoppingList;
  items: ShoppingListItem[];
  explanations: ShoppingExplanation[];
}

export interface MealPlanningServiceContract {
  saveRecipe(recipe: Recipe): Recipe;
  updateRecipe(input: { recipeId: string; baseVersion: number; patch: Partial<Omit<Recipe, 'id' | 'version' | 'createdAt' | 'updatedAt'>> }): Recipe;
  getRecipe(recipeId: string): Recipe | undefined;
  addToPlan(input: {
    id: string;
    recipeId: string;
    date: string;
    mealType: MealPlanEntry['mealType'];
    servings?: number;
    leftoversIntent?: MealPlanEntry['leftoversIntent'];
    notes?: string;
    shoppingMode?: MealPlanEntry['shoppingMode'];
    nowIso?: string;
  }): MealPlanEntry;
  recalculateShopping(input: {
    shoppingListId: string;
    scope: ShoppingList['scope'];
    pantryItems?: PantryItem[];
    stapleItemKeys?: string[];
    nowIso?: string;
  }): RecalculateShoppingResult;
  generateRecipeCard(input: { recipeId: string; plannedDate?: string; mealType?: MealPlanEntry['mealType'] }): RecipeCardView;
}

export class InMemoryMealPlanningService implements MealPlanningServiceContract {
  private readonly recipes = new Map<string, Recipe>();
  private readonly plans = new Map<string, MealPlanEntry>();

  saveRecipe(recipe: Recipe): Recipe {
    const existing = this.recipes.get(recipe.id);
    const nowIso = new Date().toISOString();

    const nextRecipe: Recipe = existing
      ? {
          ...recipe,
          version: existing.version + 1,
          createdAt: existing.createdAt,
          updatedAt: nowIso
        }
      : {
          ...recipe,
          version: recipe.version || 1,
          createdAt: recipe.createdAt || nowIso,
          updatedAt: nowIso
        };

    this.recipes.set(nextRecipe.id, nextRecipe);
    return nextRecipe;
  }

  updateRecipe(input: { recipeId: string; baseVersion: number; patch: Partial<Omit<Recipe, 'id' | 'version' | 'createdAt' | 'updatedAt'>> }): Recipe {
    const existing = this.recipes.get(input.recipeId);
    if (!existing) {
      throw new Error(`Cannot update unknown recipe: ${input.recipeId}`);
    }

    if (existing.version !== input.baseVersion) {
      throw new Error(`Snapshot conflict for recipe ${input.recipeId}: expected v${input.baseVersion}, found v${existing.version}`);
    }

    const nowIso = new Date().toISOString();
    const updated: Recipe = {
      ...existing,
      ...input.patch,
      id: existing.id,
      version: existing.version + 1,
      createdAt: existing.createdAt,
      updatedAt: nowIso
    };

    this.recipes.set(updated.id, updated);
    return updated;
  }

  getRecipe(recipeId: string): Recipe | undefined {
    return this.recipes.get(recipeId);
  }

  addToPlan(input: {
    id: string;
    recipeId: string;
    date: string;
    mealType: MealPlanEntry['mealType'];
    servings?: number;
    leftoversIntent?: MealPlanEntry['leftoversIntent'];
    notes?: string;
    shoppingMode?: MealPlanEntry['shoppingMode'];
    nowIso?: string;
  }): MealPlanEntry {
    const recipe = this.recipes.get(input.recipeId);
    if (!recipe) {
      throw new Error(`Cannot plan unknown recipe: ${input.recipeId}`);
    }

    const plan = createMealPlanEntry({
      id: input.id,
      recipe,
      date: input.date,
      mealType: input.mealType,
      servings: input.servings,
      leftoversIntent: input.leftoversIntent,
      notes: input.notes,
      shoppingMode: input.shoppingMode,
      nowIso: input.nowIso
    });

    this.plans.set(plan.id, plan);
    return plan;
  }

  recalculateShopping(input: {
    shoppingListId: string;
    scope: ShoppingList['scope'];
    pantryItems?: PantryItem[];
    stapleItemKeys?: string[];
    nowIso?: string;
  }): RecalculateShoppingResult {
    const recipeById = Object.fromEntries(this.recipes.entries());
    const plannedMeals = Array.from(this.plans.values());

    const { shoppingList, items } = deriveShoppingList({
      shoppingListId: input.shoppingListId,
      scope: input.scope,
      plannedMeals,
      recipeById,
      pantryItems: input.pantryItems,
      stapleItemKeys: input.stapleItemKeys,
      nowIso: input.nowIso
    });

    return {
      shoppingList,
      items,
      explanations: items.map((item) => explainShoppingItem(item, input.pantryItems))
    };
  }

  generateRecipeCard(input: { recipeId: string; plannedDate?: string; mealType?: MealPlanEntry['mealType'] }): RecipeCardView {
    const recipe = this.recipes.get(input.recipeId);
    if (!recipe) {
      throw new Error(`Cannot create recipe card for unknown recipe: ${input.recipeId}`);
    }

    return generateRecipeCard(recipe, {
      plannedDate: input.plannedDate,
      mealType: input.mealType
    });
  }
}
