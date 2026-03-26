import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import {
  createRecipeSuggestionContext,
  suggestRecipeFromPromptWithContext,
  type RecipeSuggestionFeedback
} from '../domain/meal-planning/aiRecipeSuggestion';
import { InMemoryMealPlanningService } from '../domain/meal-planning/service';
import type { PantryItem, PantryStatus, Recipe } from '../domain/meal-planning/types';

const nowIso = '2026-03-26T12:00:00.000Z';
const todayDate = '2026-03-26';

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
    { id: 'ing-1', rawText: '2 each chicken thighs', itemKey: 'chicken_thigh', displayName: 'Chicken thighs', quantity: 2, unit: 'each', optional: false },
    { id: 'ing-2', rawText: '2 tbsp olive oil', itemKey: 'olive_oil', displayName: 'Olive oil', quantity: 2, unit: 'tbsp', optional: false },
    { id: 'ing-3', rawText: '1 each bell pepper', itemKey: 'capsicum', displayName: 'Bell pepper', quantity: 1, unit: 'each', optional: false },
    { id: 'ing-4', rawText: '1 each lemon', itemKey: 'lemon', displayName: 'Lemon', quantity: 1, unit: 'each', optional: true }
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

const quickPrompts = [
  'High-protein dinner that is quick for a weeknight',
  'Vegetarian pantry dinner in 30 minutes',
  'Comforting but light dinner with leftovers'
];

export const MealPlannerScreen = () => {
  const service = useMemo(() => {
    const next = new InMemoryMealPlanningService();
    next.saveRecipe(starterRecipe);
    return next;
  }, []);

  const [recipe, setRecipe] = useState(starterRecipe);
  const [prompt, setPrompt] = useState(quickPrompts[0]);
  const [planDate, setPlanDate] = useState('2026-03-27');
  const [servings, setServings] = useState(2);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(defaultPantry);
  const [actionMessage, setActionMessage] = useState('');
  const [lastShoppingExplanation, setLastShoppingExplanation] = useState<string[]>([]);
  const [suggestionContext, setSuggestionContext] = useState(() => createRecipeSuggestionContext(prompt));

  const updatePantryStatus = (itemKey: string, status: PantryStatus) => {
    setPantryItems((current) => current.map((item) => (item.itemKey === itemKey ? { ...item, status, updatedAt: nowIso } : item)));
  };

  const refreshShopping = () => {
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
    return shopping.items.length;
  };

  const handleSuggestRecipe = (feedback: RecipeSuggestionFeedback = 'neutral') => {
    if (!prompt.trim()) {
      setActionMessage('Share what you need tonight so we can draft a recipe.');
      return;
    }

    const suggested = suggestRecipeFromPromptWithContext({
      prompt,
      context: suggestionContext,
      feedback: feedback === 'neutral' ? undefined : { type: feedback, recipe },
      nowIso
    });

    const savedDraft = service.saveRecipe(suggested.recipe);
    setSuggestionContext(suggested.context);
    setRecipe(savedDraft);
    setServings(savedDraft.servingsDefault || servings);

    if (feedback === 'not_for_me') {
      setActionMessage(`Got it. Steering away from that style. New draft: ${savedDraft.title}.`);
      return;
    }

    if (feedback === 'more_like_this') {
      setActionMessage(`Nice. Pulling closer to what you liked without duplicating it: ${savedDraft.title}.`);
      return;
    }

    setActionMessage(`Draft ready: ${savedDraft.title}. You can keep iterating, add it to plan, shop, or keep it in recipes.`);
  };

  const handleKeepRecipe = () => {
    if (recipe.status === 'saved') {
      setActionMessage(`Already in recipes as v${recipe.version}.`);
      return;
    }

    const next = service.updateRecipe({
      recipeId: recipe.id,
      baseVersion: recipe.version,
      patch: { notes: [{ id: 'note-1', kind: 'system', text: 'Kept from planner screen.' }], status: 'saved' }
    });
    setRecipe(next);
    setActionMessage(`Recipe kept in your library as v${next.version}.`);
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

  const handleUseTonight = () => {
    const tonightMeal = service.addToPlan({
      id: `meal-${crypto.randomUUID()}`,
      recipeId: recipe.id,
      date: todayDate,
      mealType: 'dinner',
      servings,
      shoppingMode: 'include_missing_only',
      notes: 'Use tonight from AI planner',
      nowIso
    });

    setPlanDate(todayDate);
    setActionMessage(`Tonight is set: ${tonightMeal.sourceSnapshot.recipeTitle} added for ${todayDate}.`);
  };

  const handleRecalculateShopping = () => {
    const count = refreshShopping();
    setActionMessage(`Shopping list refreshed with ${count} items.`);
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
        <p className="muted">Prompt first, then move the draft into tonight, your plan, shopping, or recipe library.</p>
      </header>

      <Card title="What do you need tonight?">
        <label>
          Tell the chef what you need
          <textarea
            rows={3}
            value={prompt}
            onChange={(event) => {
              const nextPrompt = event.target.value;
              setPrompt(nextPrompt);
              setSuggestionContext(createRecipeSuggestionContext(nextPrompt));
            }}
            placeholder="Example: vegetarian dinner with pantry staples, 30 minutes max"
          />
        </label>
        <div className="meal-actions">
          {quickPrompts.map((example) => (
            <button key={example} type="button" onClick={() => { setPrompt(example); setSuggestionContext(createRecipeSuggestionContext(example)); }}>{example}</button>
          ))}
        </div>
        <div className="meal-actions">
          <button type="button" onClick={() => handleSuggestRecipe('neutral')}>Suggest recipe</button>
        </div>
      </Card>

      <Card title={recipe.title}>
        <p className="muted">{recipe.description}</p>
        <p className="muted">{recipe.totalTimeMin} min • {recipe.servingsDefault} servings • {recipe.status} • v{recipe.version}</p>
        <p className="muted">Source: {recipe.source?.label || 'Unknown source'}</p>
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
            <button type="button" onClick={handleUseTonight}>Use tonight</button>
            <button type="button" onClick={handleAddToPlan}>Add to plan</button>
            <button type="button" onClick={() => handleSuggestRecipe('neutral')}>Suggest another</button>
            <button type="button" onClick={() => handleSuggestRecipe('more_like_this')}>More like this</button>
            <button type="button" onClick={() => handleSuggestRecipe('not_for_me')}>Not for me</button>
            <button type="button" onClick={handleKeepRecipe}>Keep recipe</button>
            <button type="button" onClick={handleRecipeCard}>Print / share</button>
            <button type="button" onClick={handleRecalculateShopping}>Refresh shopping</button>
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
          <p className="muted">Use “Refresh shopping” after adding a meal to update explainable shopping output.</p>
        ) : (
          <ul className="explanation-list">
            {lastShoppingExplanation.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </Card>
    </section>
  );
};
