import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { InMemoryMealPlanningService } from '../domain/meal-planning/service';
import type { PantryItem, PantryStatus, Recipe } from '../domain/meal-planning/types';

const nowIso = '2026-03-26T12:00:00.000Z';

const starterRecipe: Recipe = {
  id: 'recipe-weeknight-sheet-pan',
  title: 'Sheet Pan Chicken & Veg',
  description: 'Fast cleanup dinner for low-energy weeknights.',
  source: { type: 'manual', label: 'Outgrow test kitchen' },
  status: 'saved',
  version: 1,
  servingsDefault: 2,
  prepTimeMin: 10,
  cookTimeMin: 25,
  totalTimeMin: 35,
  ingredients: [
    { id: 'ing-1', rawText: '2 chicken thighs', itemKey: 'chicken_thigh', displayName: 'Chicken thighs', quantity: 2, unit: 'each', optional: false },
    { id: 'ing-2', rawText: '2 tbsp olive oil', itemKey: 'olive_oil', displayName: 'Olive oil', quantity: 2, unit: 'tbsp', optional: false },
    { id: 'ing-3', rawText: '1 bell pepper, sliced', itemKey: 'capsicum', displayName: 'Bell pepper', quantity: 1, unit: 'each', optional: false },
    { id: 'ing-4', rawText: '1 lemon (optional)', itemKey: 'lemon', displayName: 'Lemon', quantity: 1, unit: 'each', optional: true }
  ],
  instructions: [
    { step: 1, text: 'Heat oven to 425°F and prep sheet pan.' },
    { step: 2, text: 'Toss ingredients with oil and seasoning.' },
    { step: 3, text: 'Roast until chicken is cooked through.' }
  ],
  tags: ['weeknight', 'sheet-pan'],
  createdAt: nowIso,
  updatedAt: nowIso
};

const defaultPantry = [
  { id: 'pantry-salt', itemKey: 'salt', displayName: 'Salt', status: 'on_hand', staple: true, updatedAt: nowIso },
  { id: 'pantry-pepper', itemKey: 'pepper', displayName: 'Pepper', status: 'on_hand', staple: true, updatedAt: nowIso },
  { id: 'pantry-oil', itemKey: 'olive_oil', displayName: 'Olive oil', status: 'low', staple: true, updatedAt: nowIso }
] satisfies PantryItem[];

export const MealPlannerScreen = () => {
  const service = useMemo(() => {
    const next = new InMemoryMealPlanningService();
    next.saveRecipe(starterRecipe);
    return next;
  }, []);

  const [recipe, setRecipe] = useState(starterRecipe);
  const [planDate, setPlanDate] = useState('2026-03-27');
  const [servings, setServings] = useState(2);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(defaultPantry);
  const [actionMessage, setActionMessage] = useState('');
  const [lastShoppingExplanation, setLastShoppingExplanation] = useState<string[]>([]);

  const updatePantryStatus = (itemKey: string, status: PantryStatus) => {
    setPantryItems((current) => current.map((item) => (item.itemKey === itemKey ? { ...item, status, updatedAt: nowIso } : item)));
  };

  const handleSave = () => {
    const next = service.updateRecipe({
      recipeId: recipe.id,
      baseVersion: recipe.version,
      patch: { notes: [{ id: 'note-1', kind: 'system', text: 'Saved from planner screen.' }] }
    });
    setRecipe(next);
    setActionMessage(`Saved recipe snapshot v${next.version}.`);
  };

  const handleAddToPlan = () => {
    const plan = service.addToPlan({
      id: `meal-${crypto.randomUUID()}`,
      recipeId: recipe.id,
      date: planDate,
      mealType: 'dinner',
      servings,
      shoppingMode: 'include_missing_only',
      nowIso
    });
    setActionMessage(`Added to plan for ${plan.date} (${plan.mealType}).`);
  };

  const handleRecalculateShopping = () => {
    const shopping = service.recalculateShopping({
      shoppingListId: 'shopping-week-1',
      scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
      pantryItems,
      stapleItemKeys: ['salt', 'pepper', 'olive_oil'],
      nowIso
    });

    const lines = shopping.explanations.map((explanation) => {
      const meals = explanation.becauseMeals.map((meal) => meal.recipeTitle).join(', ');
      return `${explanation.displayName}: ${explanation.finalPurchaseState} (from ${meals}; pantry ${explanation.pantryImpact.pantryStatus})`;
    });

    setLastShoppingExplanation(lines);
    setActionMessage(`Shopping list refreshed with ${shopping.items.length} items.`);
  };

  const handleRecipeCard = () => {
    const card = service.generateRecipeCard({
      recipeId: recipe.id,
      plannedDate: planDate,
      mealType: 'dinner'
    });
    setActionMessage(`Recipe card ready: ${card.title}${card.subtitle ? ` — ${card.subtitle}` : ''}.`);
  };

  return (
    <section className="screen">
      <header>
        <h1>Meal planner</h1>
        <p className="muted">Save once, plan once, and keep shopping explainable.</p>
      </header>

      <Card title={recipe.title}>
        <p className="muted">{recipe.description}</p>
        <label>
          Plan date
          <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} />
        </label>
        <label>
          Servings
          <input type="number" min={1} value={servings} onChange={(event) => setServings(Number(event.target.value || 1))} />
        </label>
        <div className="stack compact">
          <p className="muted">Quick actions</p>
          <div className="meal-actions">
            <button type="button" onClick={handleRecalculateShopping}>Cook tonight</button>
            <button type="button" onClick={handleAddToPlan}>Add to plan</button>
            <button type="button" onClick={handleSave}>Save</button>
            <button type="button" onClick={handleRecipeCard}>Print / share</button>
          </div>
        </div>
        {actionMessage ? <p className="generated-output-copy">{actionMessage}</p> : null}
      </Card>

      <Card title="Pantry + staples">
        <p className="muted">Default staples are pre-loaded. Adjust status to influence shopping.</p>
        <div className="stack compact">
          {pantryItems.map((item) => (
            <label key={item.id}>
              {item.displayName}
              <select value={item.status} onChange={(event) => updatePantryStatus(item.itemKey, event.target.value as PantryStatus)}>
                <option value="on_hand">On hand</option>
                <option value="low">Low</option>
                <option value="unknown">Unknown</option>
                <option value="not_on_hand">Not on hand</option>
              </select>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Why items are on the list">
        {!lastShoppingExplanation.length ? (
          <p className="muted">Run “Cook tonight” to refresh shopping explanations.</p>
        ) : (
          <ul className="explanation-list">
            {lastShoppingExplanation.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </Card>
    </section>
  );
};
