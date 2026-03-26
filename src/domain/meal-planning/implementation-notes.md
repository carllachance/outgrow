# Meal Planning V1 Implementation Notes

## What was implemented
- Typed core domain models for Recipe, MealPlanEntry, ShoppingList(+items), PantryItem, and RecipeCardView.
- Pure derivation helpers:
  - `createMealPlanEntry`
  - `scaleRecipeIngredients`
  - `deriveShoppingList`
  - `generateRecipeCard`
  - `explainShoppingItem`
- Minimal service contract (`MealPlanningServiceContract`) and in-memory implementation for low-friction app wiring:
  - Save recipe
  - Update recipe with snapshot-aware version checks
  - Add to plan
  - Recalculate shopping
  - Generate recipe card
- Lightweight ingredient alias normalization (e.g., scallions -> green onion, capsicum -> bell pepper).
- Basic planner UI with:
  - recipe screen showing four key actions (`Cook tonight`, `Add to plan`, `Save`, `Print / share`)
  - pantry management controls with staple defaults
  - shopping explanation panel

## Simplifications in V1
- Ingredient normalization is intentionally lightweight (`itemKey` normalization only).
- Quantity aggregation only sums when units match exactly.
- Pantry quantity depletion over time is out of scope.
- Staple behavior defaults to a small deterministic set, with optional overrides.

## Follow-up review answers
1. **Recipe to plan to shopping to card flow:** yes, via one canonical `Recipe` and derived plan/shopping/card outputs.
2. **Shopping explainability:** yes, item explanations include source meals and pantry impact.
3. **Business logic isolation:** yes, all behavior is in domain/service files, no UI coupling.
4. **Normalization simplifications:** documented above and in contract non-goals.
5. **Smallest useful next step:** add lightweight unit conversion (e.g., tbsp/tsp) for better aggregate quantities.

## Proposed Phase 2 (max 5)
1. Add a tiny unit conversion table for common cooking units.
2. Add optional per-household staple profiles.
3. Add `moveMeal` and `markMealStatus` helpers for schedule edits.
4. Add a recipe version changelog summary for planned meal diffs.
5. Add printable card formatting presets (single recipe / batch cook).
