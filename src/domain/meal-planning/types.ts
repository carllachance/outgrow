export type RecipeStatus = 'draft' | 'saved' | 'archived' | 'rejected';
export type MealStatus = 'planned' | 'cooked' | 'skipped' | 'moved';
export type ShoppingMode = 'include_all' | 'include_missing_only';
export type PantryStatus = 'on_hand' | 'low' | 'unknown' | 'not_on_hand';

export interface RecipeIngredient {
  id: string;
  rawText: string;
  itemKey: string;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  group?: string;
}

export interface RecipeStep {
  step: number;
  text: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  source?: {
    type: 'web' | 'manual' | 'imported' | 'shared' | 'generated' | 'ai_generated';
    label?: string;
    url?: string;
  };
  status: RecipeStatus;
  version: number;
  servingsDefault?: number;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  tags: string[];
  notes?: Array<{
    id: string;
    kind: 'user' | 'system';
    text: string;
  }>;
  history?: {
    timesCooked: number;
    lastCookedAt?: string;
    likedByHousehold?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
  leftoversIntent?: 'none' | 'planned' | 'explicit_repurpose';
  status: MealStatus;
  notes?: string;
  shoppingMode: ShoppingMode;
  sourceSnapshot: {
    recipeTitle: string;
    recipeVersion: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItemSource {
  mealId: string;
  recipeId: string;
  recipeTitle: string;
  quantity?: number;
  unit?: string;
}

export interface ShoppingListItem {
  id: string;
  itemKey: string;
  displayName: string;
  normalizedQuantity?: number;
  normalizedUnit?: string;
  grocerySection?: string;
  sources: ShoppingListItemSource[];
  pantryStatus: PantryStatus;
  purchaseState: 'needed' | 'optional' | 'already_have';
  checked: boolean;
  optional: boolean;
}

export interface ShoppingList {
  id: string;
  scope: {
    type: 'day' | 'week';
    startDate: string;
    endDate: string;
  };
  itemIds: string[];
  generatedFromMealIds: string[];
  updatedAt: string;
}

export interface PantryItem {
  id: string;
  itemKey: string;
  displayName: string;
  quantity?: number;
  unit?: string;
  location?: 'pantry' | 'fridge' | 'freezer';
  status: PantryStatus;
  staple?: boolean;
  updatedAt: string;
}

export interface RecipeCardView {
  id: string;
  recipeId: string;
  title: string;
  subtitle?: string;
  ingredientsDisplay: string[];
  instructionsDisplay: string[];
  notesDisplay?: string[];
  footer?: {
    sourceLabel?: string;
    savedInApp?: boolean;
  };
}

export interface ShoppingExplanation {
  itemKey: string;
  displayName: string;
  becauseMeals: Array<{
    mealId: string;
    recipeTitle: string;
    quantity?: number;
    unit?: string;
  }>;
  pantryImpact: {
    pantryStatus: PantryStatus;
    stapleAssumed?: boolean;
    effect: 'added' | 'downgraded' | 'suppressed';
  };
  finalPurchaseState: ShoppingListItem['purchaseState'];
}


export interface RecipeSuggestionSessionContext {
  promptSignature: string;
  iterations: number;
  recentSuggestionSignatures: string[];
  sessionRecentSuggestionSignatures: string[];
  sessionRecentTitleSignatures: string[];
  sessionRecentPatternSignatures: string[];
  sessionCoverage: RecipeSuggestionCoverageSnapshot;
  rejectedSignatures: string[];
  positiveExampleSignatures: string[];
  preferredTokens: string[];
  avoidedTokens: string[];
  recentSuggestedRecipeIds: string[];
  rejectedRecipeIds: string[];
  preferredRecipeIds: string[];
  feedbackEvents: RecipeFeedbackEvent[];
  lastSteeringSignals?: string[];
}

export interface RecipeSuggestionCoverageSnapshot {
  proteinsShown: string[];
  cuisinesShown: string[];
  methodsShown: string[];
  formatsShown: string[];
  effortBucketsShown: string[];
  richnessBucketsShown: string[];
  patternSignaturesShown: string[];
}

export type RecipeFeedbackKind = 'prefer' | 'reject';

export type RecipeFeedbackReason =
  | 'too_heavy'
  | 'too_fussy'
  | 'too_many_ingredients'
  | 'wrong_flavor'
  | 'too_slow'
  | 'too_expensive'
  | 'wrong_protein'
  | 'wrong_cuisine';

export interface RecipeFeedbackEvent {
  id: string;
  recipeId: string;
  kind: RecipeFeedbackKind;
  reasons: RecipeFeedbackReason[];
  createdAt: string;
}

export interface FoodRules {
  dietaryDefaults: Array<'gluten_free' | 'vegetarian' | 'dairy_light'>;
  standingOrders: string[];
  ingredientExclusions: string[];
  allergies: string[];
}
