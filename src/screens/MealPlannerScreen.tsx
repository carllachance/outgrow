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

const tokenizePrompt = (prompt: string) => (
  prompt
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 2)
);

const hasAnyToken = (tokens: string[], options: string[]) => options.some((option) => tokens.includes(option));

const normalizeItemKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const suggestRecipeFromPrompt = (prompt: string): Recipe => {
  const tokens = tokenizePrompt(prompt);
  const wantsVegetarian = hasAnyToken(tokens, ['vegetarian', 'veggie', 'plant', 'meatless']);
  const wantsQuick = hasAnyToken(tokens, ['quick', 'fast', 'easy', 'simple', 'busy']);
  const wantsComfort = hasAnyToken(tokens, ['comfort', 'cozy', 'creamy']);
  const wantsSpicy = hasAnyToken(tokens, ['spicy', 'hot', 'chili']);

  const baseProtein = wantsVegetarian ? 'chickpeas' : 'chicken breast';
  const baseTitle = wantsVegetarian ? 'Veggie Bowl' : 'Protein Bowl';
  const flavor = wantsComfort ? 'Creamy Herb' : wantsSpicy ? 'Spicy Lime' : 'Lemon Garlic';
  const totalTimeMin = wantsQuick ? 25 : 40;
  const cookTimeMin = wantsQuick ? 18 : 30;

  const ingredientNames = [
    baseProtein,
    'olive oil',
    'garlic',
    wantsComfort ? 'greek yogurt' : 'lemon',
    wantsSpicy ? 'chili flakes' : 'paprika',
    'broccoli',
    'rice'
  ];

  return {
    id: `recipe-${crypto.randomUUID()}`,
    title: `${flavor} ${baseTitle}`,
    description: `AI suggestion based on: "${prompt.trim()}"`,
    source: { type: 'manual', label: 'Outgrow AI planner' },
    status: 'draft',
    version: 1,
    servingsDefault: 2,
    prepTimeMin: totalTimeMin - cookTimeMin,
    cookTimeMin,
    totalTimeMin,
    ingredients: ingredientNames.map((name, index) => ({
      id: `ing-${index + 1}`,
      rawText: index === 0 ? `2 cups ${name}` : `1 ${index < 2 ? 'tbsp' : 'cup'} ${name}`,
      itemKey: normalizeItemKey(name),
      displayName: name
        .split(' ')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' '),
      quantity: index === 0 ? 2 : 1,
      unit: index < 2 ? 'tbsp' : 'cup',
      optional: index >= 3
    })),
    instructions: [
      { step: 1, text: 'Prep produce, protein, and aromatics.' },
      { step: 2, text: 'Cook the base grain while roasting or sautéing vegetables.' },
      { step: 3, text: `Season and cook ${baseProtein} until tender.` },
      { step: 4, text: `Finish with ${flavor.toLowerCase()} sauce and serve warm.` }
    ],
    tags: [wantsVegetarian ? 'vegetarian' : 'protein-forward', wantsQuick ? 'quick' : 'batch-cook'],
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

export const MealPlannerScreen = () => {
  const service = useMemo(() => {
    const next = new InMemoryMealPlanningService();
    next.saveRecipe(starterRecipe);
    return next;
  }, []);

  const [recipe, setRecipe] = useState(starterRecipe);
  const [prompt, setPrompt] = useState('High-protein dinner that is quick for a weeknight');
  const [planDate, setPlanDate] = useState('2026-03-27');
  const [servings, setServings] = useState(2);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(defaultPantry);
  const [actionMessage, setActionMessage] = useState('');
  const [lastShoppingExplanation, setLastShoppingExplanation] = useState<string[]>([]);

  const updatePantryStatus = (itemKey: string, status: PantryStatus) => {
    setPantryItems((current) => current.map((item) => (item.itemKey === itemKey ? { ...item, status, updatedAt: nowIso } : item)));
  };

  const handleSuggestRecipe = () => {
    if (!prompt.trim()) {
      setActionMessage('Add what you are craving so AI can suggest a recipe.');
      return;
    }

    const suggested = suggestRecipeFromPrompt(prompt);
    const saved = service.saveRecipe(suggested);
    setRecipe(saved);
    setServings(saved.servingsDefault || servings);
    setActionMessage(`Suggested recipe ready: ${saved.title}. You can now add it to plan, shop, or print.`);
  };

  const handleSave = () => {
    const next = service.updateRecipe({
      recipeId: recipe.id,
      baseVersion: recipe.version,
      patch: { notes: [{ id: 'note-1', kind: 'system', text: 'Saved from planner screen.' }], status: 'saved' }
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
        <p className="muted">Chat with AI for a recipe, then push ingredients into planning and shopping.</p>
      </header>

      <Card title="Ask AI for a recipe">
        <label>
          What are you in the mood for?
          <textarea
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: vegetarian dinner with pantry staples, 30 minutes max"
          />
        </label>
        <div className="meal-actions">
          <button type="button" onClick={handleSuggestRecipe}>Suggest recipe</button>
        </div>
      </Card>

      <Card title={recipe.title}>
        <p className="muted">{recipe.description}</p>
        <p className="muted">{recipe.totalTimeMin} min • {recipe.servingsDefault} servings • v{recipe.version}</p>
        <div className="stack compact">
          <p className="muted">Ingredients</p>
          <ul className="explanation-list">
            {recipe.ingredients.map((ingredient) => <li key={ingredient.id}>{ingredient.rawText}</li>)}
          </ul>
        </div>
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
          <p className="muted">Run “Cook tonight” after adding a suggested recipe to refresh shopping explanations.</p>
        ) : (
          <ul className="explanation-list">
            {lastShoppingExplanation.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </Card>
    </section>
  );
};
