# Meal Planning V1 Implementation Notes

## What was implemented
- Typed core domain models for Recipe, MealPlanEntry, ShoppingList(+items), PantryItem, and RecipeCardView.
- Explicit recipe lifecycle states include `draft` for generated-but-not-kept recipes and `saved` for recipes explicitly kept by the user.
- Pure derivation helpers:
  - `createMealPlanEntry`
  - `scaleRecipeIngredients`
  - `deriveShoppingList`
  - `generateRecipeCard`
  - `explainShoppingItem`
- Prompt interpretation and deterministic AI recipe drafting moved into `aiRecipeSuggestion.ts`:
  - `tokenizePrompt`
  - `hasAnyToken`
  - `suggestRecipeFromPrompt`
- Minimal service contract (`MealPlanningServiceContract`) and in-memory implementation for low-friction app wiring:
  - Save recipe (including persisted drafts)
  - Update recipe with snapshot-aware version checks
  - Add to plan
  - Recalculate shopping
  - Generate recipe card
- Lightweight ingredient alias normalization (e.g., scallions -> green onion, capsicum -> bell pepper), reused by suggestion logic for `itemKey` consistency.
- Planner UI now uses semantically aligned actions:
  - `Use tonight` (creates today dinner plan entry)
  - `Add to plan`
  - `Keep recipe` (draft -> saved)
  - `Print / share`
  - `Refresh shopping`

## Draft + save semantics
- AI suggestions are created as real `Recipe` objects with:
  - `status: draft`
  - `source.type: ai_generated`
  - `source.label: Outgrow AI planner`
- Drafts are persisted immediately to keep planning/shopping friction low.
- User intent to keep a draft is represented explicitly by transitioning `status` from `draft` to `saved`.
- Because drafts are persisted, UI copy avoids implying first-time persistence when the user taps keep.

## Simplifications in V1
- Suggestion logic is intentionally deterministic and token-based (not a general chatbot).
- Ingredient normalization is intentionally lightweight (`itemKey` normalization + alias mapping).
- Quantity aggregation only sums when units match exactly.
- Pantry quantity depletion over time is out of scope.
- Staple behavior defaults to a small deterministic set, with optional overrides.

## Follow-up review answers
1. **Recipe to plan to shopping to card flow:** yes, via one canonical `Recipe` and derived plan/shopping/card outputs.
2. **Shopping explainability:** yes, item explanations include source meals and pantry impact.
3. **Business logic isolation:** yes, prompt interpretation/suggestion moved out of screen and into domain module.
4. **Normalization simplifications:** documented above and in contract non-goals.
5. **Smallest useful next step:** add lightweight unit conversion (e.g., tbsp/tsp) for better aggregate quantities.

## Proposed Phase 2 (max 5)
1. Add a tiny unit conversion table for common cooking units.
2. Add optional per-household staple profiles.
3. Add `moveMeal` and `markMealStatus` helpers for schedule edits.
4. Add a recipe version changelog summary for planned meal diffs.
5. Add printable card formatting presets (single recipe / batch cook).

## Future scaffolding note (Personal Chef)
- Reference: `docs/personal-chef-preference-anchors.md` for the confirmed direction on optional meal anchors, pattern confirmation, editable defaults, and trust/tone guardrails.
- Implementation reminder: confirm observed planning patterns before treating them as defaults.
