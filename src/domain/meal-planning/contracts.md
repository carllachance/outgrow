# Meal Planning Domain Contract

## Canonical object
Recipe is the canonical source object.

## Derived objects
- MealPlanEntry is a scheduled instance of a Recipe.
- ShoppingList and ShoppingListItems are derived from planned meals.
- RecipeCardView is a generated presentation model.

## Key relationships
- Recipe -> MealPlanEntry
- MealPlanEntry -> ShoppingListItem
- Recipe -> RecipeCardView

## Non-goals for V1
- Perfect ingredient ontology
- Advanced pantry quantity depletion
- Rich grocery price optimization
- Full nutrition engine
- Complex substitution engine
- Collaborative household sync

## Required explanations
The system must be able to explain:
- why a shopping item exists
- which meal created it
- whether pantry or staple rules affected it

## Stability rules
- MealPlanEntry stores recipe title and recipe version snapshot.
- Shopping derivation should be deterministic where possible.
- UI should never require re-entering recipe ingredients to create a plan or shopping list.
