import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import {
  createRecipeSuggestionContext,
  suggestRecipeFromPromptWithContext,
  type RecipeSuggestionFeedback
} from '../domain/meal-planning/aiRecipeSuggestion';
import { InMemoryMealPlanningService } from '../domain/meal-planning/service';
import type { PantryItem, PantryStatus, Recipe, RecipeFeedbackReason } from '../domain/meal-planning/types';
import { useAppStore } from '../state/useAppStore';

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

const rejectionReasons: Array<{ id: RecipeFeedbackReason; label: string }> = [
  { id: 'too_heavy', label: 'Too heavy' },
  { id: 'too_fussy', label: 'Too fussy' },
  { id: 'too_many_ingredients', label: 'Too many ingredients' },
  { id: 'wrong_flavor', label: 'Wrong flavor' },
  { id: 'too_slow', label: 'Too slow' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'wrong_protein', label: 'Don’t want this protein' },
  { id: 'wrong_cuisine', label: 'Don’t want this cuisine' }
];

export const MealPlannerScreen = () => {
  const { state, updateFoodRules } = useAppStore();
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
  const [showRejectionReasons, setShowRejectionReasons] = useState(true);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<RecipeFeedbackReason[]>([]);
  const [lastShoppingExplanation, setLastShoppingExplanation] = useState<string[]>([]);
  const [suggestionContext, setSuggestionContext] = useState(() => createRecipeSuggestionContext(prompt));
  const weeklySuccessText = state.onboarding.weeklyLens;
  const foodRules = state.foodRules;

  const updatePantryStatus = (itemKey: string, status: PantryStatus) => {
    setPantryItems((current) => current.map((item) => (item.itemKey === itemKey ? { ...item, status, updatedAt: nowIso } : item)));
  };

  const refreshShopping = () => {
    const shopping = service.recalculateShopping({
      shoppingListId: 'shopping-week-1',
      scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
      pantryItems,
      stapleItemKeys: ['salt', 'pepper', 'olive_oil'],
      foodRules,
      nowIso
    });

    const lines = shopping.explanations.map((explanation) => {
      const meals = explanation.becauseMeals.map((meal) => meal.recipeTitle).join(', ');
      return `${explanation.displayName}: ${explanation.finalPurchaseState} (from ${meals}; pantry ${explanation.pantryImpact.pantryStatus})`;
    });

    setLastShoppingExplanation(lines);
    return shopping.items.length;
  };

  const handleSuggestRecipe = (feedback: RecipeSuggestionFeedback = 'neutral', reasons: RecipeFeedbackReason[] = []) => {
    if (!prompt.trim()) {
      setActionMessage('Share what you need tonight so we can draft a recipe.');
      return;
    }

    const suggested = suggestRecipeFromPromptWithContext({
      prompt,
      context: suggestionContext,
      weeklySuccessText,
      foodRules,
      feedback: feedback === 'neutral' ? undefined : { type: feedback, recipe, reasons },
      nowIso
    });

    const savedDraft = service.saveRecipe(suggested.recipe);
    setSuggestionContext(suggested.context);
    setRecipe(savedDraft);
    setServings(savedDraft.servingsDefault || servings);

    const steeringNote = suggested.context.lastSteeringSignals?.[0] ? ` ${suggested.context.lastSteeringSignals[0]}` : '';
    setShowRejectionReasons(true);
    setSelectedRejectionReasons([]);

    if (feedback === 'not_for_me') {
      setActionMessage(`Got it. Steering away from that style. New draft: ${savedDraft.title}.${steeringNote}`);
      return;
    }

    if (feedback === 'more_like_this') {
      setActionMessage(`Nice. Pulling closer to what you liked without duplicating it: ${savedDraft.title}.${steeringNote}`);
      return;
    }

    setActionMessage(`Draft ready: ${savedDraft.title}.${steeringNote} You can keep iterating, add it to plan, shop, or keep it in recipes.`);
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
    <section className="screen meal-planner-screen">
      <header className="planner-header">
        <div className="planner-brand">
          <img src="/assets/logo/outgrow-mark.svg" alt="Harvest style mark" className="planner-brand-mark" />
          <h1 className="planner-brand-name">Harvest</h1>
        </div>
        <button type="button" className="planner-settings" aria-label="Planner settings">⚙</button>
      </header>

      <section className="planner-intro">
        <h2 className="planner-title">What do you need tonight?</h2>
        <p className="planner-subtitle">Let&apos;s find something nourishing.</p>
        <div className="planner-prompt-wrap">
          <textarea
            rows={2}
            value={prompt}
            onChange={(event) => {
              const nextPrompt = event.target.value;
              setPrompt(nextPrompt);
              setSuggestionContext(createRecipeSuggestionContext(nextPrompt));
            }}
            className="planner-prompt-input"
            placeholder="I have salmon and spinach..."
            aria-label="Tell the chef what you need"
          />
          <button type="button" onClick={() => handleSuggestRecipe('neutral')} className="planner-sparkle-button" aria-label="Suggest recipe">
            ✨
          </button>
        </div>
        <div className="planner-chip-row" aria-label="Prompt suggestions">
          {quickPrompts.map((example) => (
            <button key={example} type="button" className="planner-chip" onClick={() => { setPrompt(example); setSuggestionContext(createRecipeSuggestionContext(example)); }}>{example}</button>
          ))}
        </div>
      </section>

      <article className="planner-featured-card">
        <div className="planner-recipe-image" role="img" aria-label="Roasted sheet pan chicken">
          <div className="planner-image-meta">
            <span>{recipe.totalTimeMin} min</span>
            <span>{servings} servings</span>
          </div>
        </div>
        <h3 className="planner-recipe-title serif">{recipe.title}</h3>
        <p className="planner-recipe-description">{recipe.description}</p>
        <p className="planner-source-note">Source: {recipe.source?.label || 'Unknown source'} • v{recipe.version}</p>
        <div className="planner-ingredients-card">
          <p className="planner-ingredients-label">Ingredients on hand</p>
          <div className="planner-inline-chips">
            {recipe.ingredients.slice(0, 2).map((ingredient) => (
              <span key={ingredient.id} className="planner-inline-chip">{ingredient.displayName}</span>
            ))}
            {recipe.ingredients.slice(2).map((ingredient) => (
              <span key={ingredient.id} className="planner-inline-chip planner-inline-chip-buy">+ Buy {ingredient.displayName}</span>
            ))}
          </div>
        </div>
        <div className="planner-primary-actions">
          <button type="button" onClick={handleUseTonight} className="planner-cta-main">Use tonight</button>
          <button type="button" onClick={handleAddToPlan} className="planner-cta-secondary">Add to plan</button>
        </div>
        <div className="planner-secondary-actions">
          <button type="button" onClick={() => handleSuggestRecipe('neutral')}>Suggest another</button>
          <button type="button" onClick={() => handleSuggestRecipe('more_like_this')}>More like this</button>
          <button type="button" onClick={() => setShowRejectionReasons((current) => !current)}>{showRejectionReasons ? 'Hide not-for-me reasons' : 'Not for me'}</button>
          <button type="button" onClick={handleKeepRecipe}>Keep recipe</button>
          <button type="button" onClick={handleRecipeCard}>Print / share</button>
          <button type="button" onClick={handleRecalculateShopping}>Refresh shopping</button>
        </div>
        {showRejectionReasons ? (
          <div className="stack compact">
            <p className="muted">What should we avoid?</p>
            <div className="planner-chip-row">
              {rejectionReasons.map((reason) => {
                const isSelected = selectedRejectionReasons.includes(reason.id);
                return (
                  <button
                    key={reason.id}
                    type="button"
                    className={`planner-chip ${isSelected ? 'planner-chip-selected' : ''}`}
                    onClick={() => setSelectedRejectionReasons((current) => (
                      current.includes(reason.id)
                        ? current.filter((item) => item !== reason.id)
                        : [...current, reason.id]
                    ))}
                  >
                    {isSelected ? `✓ ${reason.label}` : reason.label}
                  </button>
                );
              })}
              <button
                type="button"
                className="planner-chip planner-chip-action"
                onClick={() => handleSuggestRecipe('not_for_me', selectedRejectionReasons)}
              >
                Suggest something else
              </button>
            </div>
          </div>
        ) : null}
        <label>
          Plan date
          <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} />
        </label>
        <label>
          Servings
          <input type="number" min={1} value={servings} onChange={(event) => setServings(Number(event.target.value || 1))} />
        </label>
        <div className="stack compact">
          <p className="muted">Ingredients</p>
          <ul className="explanation-list">
            {recipe.ingredients.map((ingredient) => <li key={ingredient.id}>{ingredient.rawText}</li>)}
          </ul>
        </div>
        {actionMessage ? <p className="generated-output-copy">{actionMessage}</p> : null}
      </article>

      <Card title="Your Kitchen Rules">
        <label>
          Dietary defaults
          <div className="meal-actions">
            <button type="button" onClick={() => updateFoodRules({ dietaryDefaults: foodRules.dietaryDefaults.includes('gluten_free') ? foodRules.dietaryDefaults.filter((rule) => rule !== 'gluten_free') : [...foodRules.dietaryDefaults, 'gluten_free'] })}>
              {foodRules.dietaryDefaults.includes('gluten_free') ? '✓ Gluten-free default' : 'Gluten-free default'}
            </button>
            <button type="button" onClick={() => updateFoodRules({ dietaryDefaults: foodRules.dietaryDefaults.includes('vegetarian') ? foodRules.dietaryDefaults.filter((rule) => rule !== 'vegetarian') : [...foodRules.dietaryDefaults, 'vegetarian'] })}>
              {foodRules.dietaryDefaults.includes('vegetarian') ? '✓ Vegetarian default' : 'Vegetarian default'}
            </button>
            <button type="button" onClick={() => updateFoodRules({ dietaryDefaults: foodRules.dietaryDefaults.includes('dairy_light') ? foodRules.dietaryDefaults.filter((rule) => rule !== 'dairy_light') : [...foodRules.dietaryDefaults, 'dairy_light'] })}>
              {foodRules.dietaryDefaults.includes('dairy_light') ? '✓ Dairy-light default' : 'Dairy-light default'}
            </button>
          </div>
        </label>
        <label>
          Standing orders (comma separated)
          <input
            type="text"
            value={foodRules.standingOrders.join(', ')}
            onChange={(event) => updateFoodRules({ standingOrders: event.target.value.split(',') })}
            placeholder="ex: high protein, one-pan, pantry-first"
          />
        </label>
        <label>
          Ingredient exclusions (hard)
          <input
            type="text"
            value={foodRules.ingredientExclusions.join(', ')}
            onChange={(event) => updateFoodRules({ ingredientExclusions: event.target.value.split(',') })}
            placeholder="ex: gluten, mushrooms"
          />
        </label>
        <label>
          Allergies (hard)
          <input
            type="text"
            value={foodRules.allergies.join(', ')}
            onChange={(event) => updateFoodRules({ allergies: event.target.value.split(',') })}
            placeholder="ex: asparagus, shrimp"
          />
        </label>
        <p className="muted">Hard rules are always enforced in suggestions and shopping. Standing orders remain defaults unless your prompt or explicit feedback asks otherwise.</p>
      </Card>

      <Card title="Pantry Essentials">
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

      <Card title="Curator’s Note">
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
