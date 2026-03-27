import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import {
  createRecipeSuggestionContext,
  suggestRecipeFromPromptWithContext,
  type RecipeSuggestionFeedback
} from '../domain/meal-planning/aiRecipeSuggestion';
import { InMemoryMealPlanningService } from '../domain/meal-planning/service';
import type { PantryItem, PantryStatus, Recipe, RecipeFeedbackReason } from '../domain/meal-planning/types';
import {
  buildGeneratedFoodImage,
  selectRecipeHeroImage
} from '../domain/meal-planning/recipeImagery';
import { useAppStore } from '../state/useAppStore';
import {
  buildGrowthIntentNarrative,
  buildRecommendationPrompt,
  supportTone
} from '../state/growthIntent';

const nowIso = '2026-03-26T12:00:00.000Z';
const todayDate = '2026-03-26';

const starterRecipe: Recipe = {
  id: 'recipe-weeknight-sheet-pan',
  title: 'Citrus Sheet Pan Chicken',
  description: 'Bright and calm: one tray, one dressing, and reliable leftovers for tomorrow.',
  image: buildGeneratedFoodImage('citrus sheet pan chicken with vegetables', 'Citrus Sheet Pan Chicken'),
  source: { type: 'ai_generated', label: 'Outgrow editorial kitchen' },
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
  'I need a quick dinner I can repeat on busy nights',
  'Build a vegetarian dinner from pantry basics in 30 minutes',
  'Give me a calm, comforting dinner with next-day leftovers'
];

const rejectionReasons: Array<{ id: RecipeFeedbackReason; label: string }> = [
  { id: 'too_heavy', label: 'Too heavy' },
  { id: 'too_fussy', label: 'Too fussy' },
  { id: 'too_many_ingredients', label: 'Too many ingredients' },
  { id: 'wrong_flavor', label: 'Wrong flavor' },
  { id: 'too_slow', label: 'Too slow' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'wrong_protein', label: 'Avoid this protein' },
  { id: 'wrong_cuisine', label: 'Don’t want this cuisine' }
];

const STARTER_MEMORY_STORAGE_KEY = 'outgrow-meal-planner-starter-memory-v1';

interface StarterSuggestionMemory {
  recentInitialSuggestionSignatures: string[];
  recentInitialClusterSignatures: string[];
}

interface WeeklyShortlistCandidate {
  id: string;
  recipeId: string;
  recipeTitle: string;
  recipeVersion: number;
  servings: number;
  addedAt: string;
}

const readStarterSuggestionMemory = (): StarterSuggestionMemory => {
  if (typeof window === 'undefined') {
    return { recentInitialSuggestionSignatures: [], recentInitialClusterSignatures: [] };
  }

  try {
    const raw = window.localStorage.getItem(STARTER_MEMORY_STORAGE_KEY);
    if (!raw) return { recentInitialSuggestionSignatures: [], recentInitialClusterSignatures: [] };
    const parsed = JSON.parse(raw) as Partial<StarterSuggestionMemory>;
    return {
      recentInitialSuggestionSignatures: Array.isArray(parsed.recentInitialSuggestionSignatures) ? parsed.recentInitialSuggestionSignatures : [],
      recentInitialClusterSignatures: Array.isArray(parsed.recentInitialClusterSignatures) ? parsed.recentInitialClusterSignatures : []
    };
  } catch (_error) {
    return { recentInitialSuggestionSignatures: [], recentInitialClusterSignatures: [] };
  }
};

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
  const [weeklyShortlist, setWeeklyShortlist] = useState<WeeklyShortlistCandidate[]>([]);
  const [shortlistAssignmentById, setShortlistAssignmentById] = useState<Record<string, string>>({});
  const [plannedRecipeIds, setPlannedRecipeIds] = useState<string[]>([]);
  const [plannedRecipeDateById, setPlannedRecipeDateById] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState('');
  const [showRejectionReasons, setShowRejectionReasons] = useState(true);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<RecipeFeedbackReason[]>([]);
  const [temporaryIngredientExclusions, setTemporaryIngredientExclusions] = useState<string[]>([]);
  const [lastAvoidedIngredient, setLastAvoidedIngredient] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [lastShoppingExplanation, setLastShoppingExplanation] = useState<string[]>([]);
  const [suggestionContext, setSuggestionContext] = useState(() => {
    const starterMemory = readStarterSuggestionMemory();
    return createRecipeSuggestionContext(prompt, starterMemory);
  });
  const weeklySuccessText = buildGrowthIntentNarrative(state.onboarding);
  const supportStyle = supportTone(state.onboarding);
  const foodRules = state.foodRules;
  const supportAwareQuickPrompts = supportStyle === 'simple'
    ? quickPrompts.slice(0, 2)
    : supportStyle === 'teach'
      ? [...quickPrompts, 'Give me one repeatable dinner template for this week']
      : quickPrompts;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STARTER_MEMORY_STORAGE_KEY, JSON.stringify({
      recentInitialSuggestionSignatures: suggestionContext.recentInitialSuggestionSignatures,
      recentInitialClusterSignatures: suggestionContext.recentInitialClusterSignatures
    }));
  }, [suggestionContext.recentInitialSuggestionSignatures, suggestionContext.recentInitialClusterSignatures]);

  useEffect(() => {
    if (supportStyle === 'simple') {
      setShowRejectionReasons(false);
      setSelectedRejectionReasons([]);
      return;
    }
    setShowRejectionReasons(true);
  }, [supportStyle]);

  const updatePantryStatus = (itemKey: string, status: PantryStatus) => {
    setPantryItems((current) => current.map((item) => (item.itemKey === itemKey ? { ...item, status, updatedAt: nowIso } : item)));
  };

  const refreshShopping = () => {
    const shopping = service.recalculateShopping({
      shoppingListId: 'shopping-week-1',
      scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
      pantryItems,
      stapleItemKeys: ['salt', 'pepper', 'olive_oil'],
      foodRules: mergedFoodRules,
      nowIso
    });

    const lines = shopping.explanations.map((explanation) => {
      const meals = explanation.becauseMeals.map((meal) => meal.recipeTitle).join(', ');
      return `${explanation.displayName}: ${explanation.finalPurchaseState} (from ${meals}; pantry ${explanation.pantryImpact.pantryStatus})`;
    });

    setLastShoppingExplanation(lines);
    return shopping.items.length;
  };

  const mergedFoodRules = useMemo(() => ({
    ...foodRules,
    ingredientExclusions: Array.from(new Set([
      ...foodRules.ingredientExclusions.map((value) => value.trim()).filter(Boolean),
      ...temporaryIngredientExclusions
    ]))
  }), [foodRules, temporaryIngredientExclusions]);

  const primaryProtein = recipe.ingredients[0]?.displayName || 'this protein';
  const normalizedPrimaryProtein = primaryProtein.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const handleSuggestRecipe = (feedback: RecipeSuggestionFeedback = 'neutral', reasons: RecipeFeedbackReason[] = []) => {
    if (!prompt.trim()) {
      setActionMessage('Tell me what you need tonight, and I’ll draft something.');
      return;
    }
    const recommendationPrompt = buildRecommendationPrompt(prompt, state.onboarding);

    const suggested = suggestRecipeFromPromptWithContext({
      prompt: recommendationPrompt,
      context: suggestionContext,
      weeklySuccessText,
      foodRules: mergedFoodRules,
      feedback: feedback === 'neutral' ? undefined : { type: feedback, recipe, reasons },
      nowIso
    });

    const savedDraft = service.saveRecipe(suggested.recipe);
    setSuggestionContext(suggested.context);
    setRecipe(savedDraft);
    setHeroImageFailed(false);
    setServings(savedDraft.servingsDefault || servings);

    const steeringNote = suggested.context.lastSteeringSignals?.[0]
      ? ` Why this fits: ${suggested.context.lastSteeringSignals[0].replace(/\.$/, '')}.`
      : '';
    setShowRejectionReasons(true);
    setSelectedRejectionReasons([]);

    if (feedback === 'not_for_me') {
      const toneLine = supportStyle === 'simple' ? 'Kept simple for tonight.' : 'Kept it manageable for tonight.';
      setActionMessage(`Got it — here’s another option: ${savedDraft.title}. ${toneLine}${steeringNote}`);
      return;
    }

    if (feedback === 'more_like_this') {
      const toneLine = supportStyle === 'teach' ? 'Kept a repeatable structure.' : 'Kept close to what already works.';
      setActionMessage(`Great — here’s one closer to what you liked: ${savedDraft.title}. ${toneLine}${steeringNote}`);
      return;
    }

    setActionMessage(`Draft ready: ${savedDraft.title}. Based on what you asked for.${steeringNote}`);
  };

  const handleHideThisRecipe = () => {
    setSelectedRejectionReasons([]);
    handleSuggestRecipe('not_for_me', []);
    setActionMessage('Recipe hidden. Showing another option.');
  };

  const handleAvoidProtein = (scope: 'week' | 'persistent' = 'week') => {
    if (!normalizedPrimaryProtein) return;
    setTemporaryIngredientExclusions((current) => Array.from(new Set([...current, normalizedPrimaryProtein])));
    setLastAvoidedIngredient(normalizedPrimaryProtein);
    if (scope === 'persistent') {
      updateFoodRules({
        ingredientExclusions: Array.from(new Set([...foodRules.ingredientExclusions, normalizedPrimaryProtein]))
      });
    }
    setSelectedRejectionReasons((current) => Array.from(new Set([...current, 'wrong_protein'])));
    handleSuggestRecipe('not_for_me', ['wrong_protein']);
    setActionMessage(`Avoiding ${normalizedPrimaryProtein} for now. Undo if you want to keep seeing it.`);
  };

  const handleUndoAvoid = () => {
    if (!lastAvoidedIngredient) return;
    setTemporaryIngredientExclusions((current) => current.filter((value) => value !== lastAvoidedIngredient));
    updateFoodRules({
      ingredientExclusions: foodRules.ingredientExclusions.filter((value) => value.trim().toLowerCase() !== lastAvoidedIngredient)
    });
    setActionMessage(`Undid avoid rule for ${lastAvoidedIngredient}.`);
    setLastAvoidedIngredient(null);
  };

  const handleKeepRecipe = () => {
    if (recipe.status === 'saved') {
      setActionMessage(`Already saved as v${recipe.version}.`);
      return;
    }

    const next = service.updateRecipe({
      recipeId: recipe.id,
      baseVersion: recipe.version,
      patch: { notes: [{ id: 'note-1', kind: 'system', text: 'Kept from planner screen.' }], status: 'saved' }
    });
    setRecipe(next);
    setActionMessage(`Saved to your recipes as v${next.version}.`);
  };

  const handleSavedStateChip = () => {
    if (recipe.status === 'saved') {
      const next = service.updateRecipe({
        recipeId: recipe.id,
        baseVersion: recipe.version,
        patch: { status: 'draft' }
      });
      setRecipe(next);
      setActionMessage(`Moved to draft: ${next.title}`);
      return;
    }

    const next = service.updateRecipe({
      recipeId: recipe.id,
      baseVersion: recipe.version,
      patch: { status: 'saved' }
    });
    setRecipe(next);
    setActionMessage(`Saved to your recipes: ${next.title}.`);
  };

  const handleShortlistRecipe = () => {
    const existing = weeklyShortlist.find((candidate) => candidate.recipeId === recipe.id);
    if (existing) {
      setActionMessage(`${recipe.title} is already in this week’s shortlist.`);
      return;
    }

    const candidate: WeeklyShortlistCandidate = {
      id: `shortlist-${crypto.randomUUID()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeVersion: recipe.version,
      servings,
      addedAt: nowIso
    };

    const defaultAssignmentDate = planDate || todayDate;
    setWeeklyShortlist((current) => [...current, candidate]);
    setShortlistAssignmentById((current) => ({ ...current, [candidate.id]: defaultAssignmentDate }));
    setActionMessage(`Shortlisted for this week: ${recipe.title}. Assign a day when you’re ready.`);
  };

  const handleShortlistStateChip = () => {
    const recipeCandidates = weeklyShortlist.filter((candidate) => candidate.recipeId === recipe.id);
    if (recipeCandidates.length) {
      const candidateIds = new Set(recipeCandidates.map((candidate) => candidate.id));
      setWeeklyShortlist((current) => current.filter((candidate) => !candidateIds.has(candidate.id)));
      setShortlistAssignmentById((current) => {
        const next = { ...current };
        recipeCandidates.forEach((candidate) => {
          delete next[candidate.id];
        });
        return next;
      });
      setActionMessage(`Removed ${recipe.title} from this week’s shortlist.`);
      return;
    }

    handleShortlistRecipe();
  };

  const handleUseTonight = () => {
    const tonightMeal = service.addToPlan({
      id: `meal-${crypto.randomUUID()}`,
      recipeId: recipe.id,
      date: todayDate,
      mealType: 'dinner',
      servings,
      shoppingMode: 'include_missing_only',
      notes: 'Use tonight from meal planner',
      nowIso
    });

    setPlanDate(todayDate);
    setPlannedRecipeIds((current) => (current.includes(recipe.id) ? current : [...current, recipe.id]));
    setPlannedRecipeDateById((current) => ({ ...current, [recipe.id]: todayDate }));
    setActionMessage(`Tonight is set: ${tonightMeal.sourceSnapshot.recipeTitle} for ${todayDate}.`);
  };

  const handleAssignShortlistedMeal = (candidate: WeeklyShortlistCandidate) => {
    const assignedDate = shortlistAssignmentById[candidate.id] || planDate || todayDate;
    const plan = service.addToPlan({
      id: `meal-${crypto.randomUUID()}`,
      recipeId: candidate.recipeId,
      date: assignedDate,
      mealType: 'dinner',
      servings: candidate.servings,
      shoppingMode: 'include_missing_only',
      notes: 'Planned from weekly shortlist',
      nowIso
    });

    setWeeklyShortlist((current) => current.filter((item) => item.id !== candidate.id));
    setShortlistAssignmentById((current) => {
      const next = { ...current };
      delete next[candidate.id];
      return next;
    });
    setPlanDate(plan.date);
    setPlannedRecipeIds((current) => (current.includes(candidate.recipeId) ? current : [...current, candidate.recipeId]));
    setPlannedRecipeDateById((current) => ({ ...current, [candidate.recipeId]: plan.date }));
    setActionMessage(`Planned from shortlist: ${candidate.recipeTitle} on ${plan.date}.`);
  };

  const handleRemoveShortlistedMeal = (candidateId: string) => {
    setWeeklyShortlist((current) => current.filter((item) => item.id !== candidateId));
    setShortlistAssignmentById((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
    setActionMessage('Removed from this week’s shortlist.');
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

  const heroImage = selectRecipeHeroImage(recipe, heroImageFailed);
  const imageUrl = heroImage.image?.url?.trim();
  const hasRecipeImage = Boolean(imageUrl);
  const imageAlt = heroImage.image?.alt?.trim() || `${recipe.title} photo`;
  const weekDates = useMemo(() => {
    const start = new Date('2026-03-27T00:00:00.000Z');
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    });
  }, []);
  const isCurrentRecipeShortlisted = weeklyShortlist.some((candidate) => candidate.recipeId === recipe.id);
  const isCurrentRecipePlanned = plannedRecipeIds.includes(recipe.id);
  const plannedDateForRecipe = plannedRecipeDateById[recipe.id];
  const handleOpenPlannedContext = () => {
    if (!isCurrentRecipePlanned) {
      setActionMessage('Not planned yet. Use tonight or assign a day.');
      return;
    }
    if (plannedDateForRecipe) {
      setPlanDate(plannedDateForRecipe);
    }
    setActionMessage(plannedDateForRecipe
      ? `Planned on ${plannedDateForRecipe}. Day is selected below.`
      : 'This recipe is in your plan. Use the date picker below to update it.');
  };
  const shortRationale = (suggestionContext.lastSteeringSignals?.[0] || recipe.description || 'Simple and satisfying for tonight.')
    .replace(/\.$/, '');
  const displayRationale = shortRationale.toLowerCase().startsWith('why this fits')
    ? shortRationale
    : `Why this fits: ${shortRationale}`;
  const summaryBadges = [
    recipe.status === 'saved' ? 'Saved' : 'Draft',
    isCurrentRecipePlanned
      ? `Planned ${plannedDateForRecipe || ''}`.trim()
      : isCurrentRecipeShortlisted
        ? 'Shortlisted'
        : 'Not planned'
  ];
  const compactMeta = `${recipe.totalTimeMin ? `${recipe.totalTimeMin} min` : 'Flexible time'} · ${servings} servings · ${heroImage.source === 'source_photo' ? 'Photo' : heroImage.source === 'ai_food_photo' ? 'AI food preview' : 'Preview fallback'}`;
  const dynamicRejectionReasons = rejectionReasons.map((reason) => (
    reason.id === 'wrong_protein'
      ? { ...reason, label: `Avoid ${normalizedPrimaryProtein || 'this protein'}` }
      : reason
  ));

  return (
    <section className="screen meal-planner-screen">
      <header className="planner-header">
        <div className="planner-brand">
          <img src="/assets/logo/outgrow-mark.svg" alt="Meals section mark" className="planner-brand-mark" />
          <p className="planner-section-label">Meals</p>
        </div>
        <button type="button" className="planner-settings" aria-label="Planner settings">⚙</button>
      </header>

      <section className="planner-intro">
        <h2 className="planner-title">Plan one good meal.</h2>
        <p className="planner-subtitle">
          {supportStyle === 'teach'
            ? 'Context-aware editorial guidance, tuned to what actually works for you.'
            : supportStyle === 'simple'
              ? 'A calm recommendation built for tonight&apos;s real constraints.'
              : 'One thoughtful suggestion grounded in your pantry, time, and week.'}
        </p>
        <div className="planner-prompt-wrap">
          <textarea
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="planner-prompt-input"
            placeholder="Example: 25 minutes, low cleanup, and enough for tomorrow lunch."
            aria-label="Tell the chef what you need"
          />
          <button type="button" onClick={() => handleSuggestRecipe('neutral')} className="planner-sparkle-button" aria-label="Suggest recipe">
            ✨
          </button>
        </div>
        <div className="planner-chip-row" aria-label="Prompt suggestions">
          {supportAwareQuickPrompts.map((example) => (
            <button key={example} type="button" className="planner-chip" onClick={() => { setPrompt(example); }}>{example}</button>
          ))}
        </div>
      </section>

      <article className={`planner-featured-card ${hasRecipeImage ? 'planner-featured-card-with-image' : 'planner-featured-card-no-image'}`}>
        <div className="planner-recipe-sticky-header">
          <div className={`planner-recipe-media planner-recipe-media-compact ${hasRecipeImage ? 'planner-recipe-media-with-image' : 'planner-recipe-media-no-image'}`}>
            {hasRecipeImage ? (
              <img className="planner-recipe-image" src={imageUrl} alt={imageAlt} onError={() => setHeroImageFailed(true)} />
            ) : (
              <div className="planner-image-fallback-copy">Preview unavailable</div>
            )}
            {heroImage.label ? (
              <div className="planner-image-meta">
                <span>{heroImage.label}</span>
              </div>
            ) : null}
          </div>
          <div className="planner-recipe-header-copy">
            <h3 className="planner-recipe-title serif">{recipe.title}</h3>
            <p className="planner-rationale-line">{displayRationale}</p>
            <p className="planner-recipe-meta-inline">{compactMeta}</p>
            <div className="planner-info-badges planner-info-badges-compact" aria-label="Recipe status summary">
              {summaryBadges.slice(0, 2).map((badge) => (
                <span key={badge} className="planner-info-badge planner-info-badge-active">{badge}</span>
              ))}
            </div>
          </div>
          <div className="planner-primary-actions planner-primary-actions-sticky">
            <button type="button" onClick={handleUseTonight} className="planner-cta-main">Use tonight</button>
            <button type="button" onClick={handleShortlistStateChip} className="planner-cta-secondary">
              {isCurrentRecipeShortlisted ? 'Unshortlist' : 'Shortlist'}
            </button>
            <button type="button" onClick={handleSavedStateChip}>
              {recipe.status === 'saved' ? 'Move to draft' : 'Save recipe'}
            </button>
            <button type="button" onClick={handleOpenPlannedContext}>
              {isCurrentRecipePlanned ? 'View planned day' : 'Set a day'}
            </button>
          </div>
        </div>
        <div className="planner-recipe-scroll-content">
          {recipe.description ? <p className="planner-recipe-description">{recipe.description}</p> : null}
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
        <p className="planner-source-note">Visual: {heroImage.source === 'source_photo' ? 'Source photo' : heroImage.source === 'ai_food_photo' ? 'AI-generated realistic food' : 'Honest fallback tile'} • Source: {recipe.source?.label || 'Unknown source'} • v{recipe.version}</p>
        <div className="planner-secondary-actions">
          <button type="button" onClick={() => handleSuggestRecipe('neutral')}>Suggest another</button>
          <button type="button" onClick={() => handleSuggestRecipe('more_like_this')}>More like this</button>
          {supportStyle === 'simple' ? null : (
            <button type="button" onClick={() => setShowRejectionReasons((current) => !current)}>{showRejectionReasons ? 'Hide not-for-me reasons' : 'Not for me'}</button>
          )}
          <button type="button" onClick={handleKeepRecipe}>Keep recipe</button>
          <button type="button" onClick={handleRecipeCard}>Print or share</button>
          <button type="button" onClick={handleRecalculateShopping}>Refresh shopping</button>
        </div>
        {showRejectionReasons ? (
          <div className="stack compact">
            <p className="muted">Recommendation tuning (soft):</p>
            <div className="planner-chip-row">
              <button type="button" className="planner-chip" onClick={handleHideThisRecipe}>Hide this recipe</button>
              {dynamicRejectionReasons.map((reason) => {
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
            <p className="muted">Preferences (operational):</p>
            <div className="planner-chip-row">
              <button type="button" className="planner-chip" onClick={() => handleAvoidProtein('week')}>
                Avoid {normalizedPrimaryProtein || 'this protein'} this week
              </button>
              <button type="button" className="planner-chip" onClick={() => handleAvoidProtein('persistent')}>
                Don’t show {normalizedPrimaryProtein || 'this protein'} going forward
              </button>
              <button type="button" className="planner-chip" onClick={() => handleSuggestRecipe('not_for_me', ['wrong_cuisine'])}>
                Not in the mood for seafood
              </button>
              {lastAvoidedIngredient ? (
                <button type="button" className="planner-chip planner-chip-action" onClick={handleUndoAvoid}>Undo avoid</button>
              ) : null}
            </div>
          </div>
        ) : null}
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
        </div>
        {actionMessage ? <p className="generated-output-copy">{actionMessage}</p> : null}
      </article>

      <Card title="This week’s shortlist">
        <p className="muted">Save a few options, then assign a day.</p>
        {!weeklyShortlist.length ? (
          <p className="muted">No shortlisted recipes yet. Use “Shortlist” on anything you want to keep in play.</p>
        ) : (
          <ul className="planner-shortlist-list">
            {weeklyShortlist.map((candidate) => (
              <li key={candidate.id} className="planner-shortlist-row">
                <div>
                  <p className="planner-shortlist-title">{candidate.recipeTitle}</p>
                  <p className="muted">v{candidate.recipeVersion} • {candidate.servings} servings • unscheduled</p>
                </div>
                <div className="planner-shortlist-controls">
                  <select
                    aria-label={`Assign ${candidate.recipeTitle} to day`}
                    value={shortlistAssignmentById[candidate.id] || planDate}
                    onChange={(event) => setShortlistAssignmentById((current) => ({ ...current, [candidate.id]: event.target.value }))}
                  >
                    {weekDates.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleAssignShortlistedMeal(candidate)}>Assign to day</button>
                  <button type="button" onClick={() => handleRemoveShortlistedMeal(candidate.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Kitchen rules">
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
          Defaults (comma separated)
          <input
            type="text"
            value={foodRules.standingOrders.join(', ')}
            onChange={(event) => updateFoodRules({ standingOrders: event.target.value.split(',') })}
            placeholder="e.g. high protein, one-pan, pantry-first"
          />
        </label>
        <label>
          Ingredient exclusions
          <input
            type="text"
            value={foodRules.ingredientExclusions.join(', ')}
            onChange={(event) => updateFoodRules({ ingredientExclusions: event.target.value.split(',') })}
            placeholder="e.g. gluten, mushrooms"
          />
        </label>
        <label>
          Allergies
          <input
            type="text"
            value={foodRules.allergies.join(', ')}
            onChange={(event) => updateFoodRules({ allergies: event.target.value.split(',') })}
            placeholder="e.g. asparagus, shrimp"
          />
        </label>
        <p className="muted">Exclusions and allergies are always enforced. Defaults are used unless you ask otherwise.</p>
      </Card>

      <Card title="Pantry essentials">
        <p className="muted">Adjust pantry status to improve shopping suggestions.</p>
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

      <Card title="Shopping notes">
        {!lastShoppingExplanation.length ? (
          <p className="muted">Use “Refresh shopping” after you plan a meal.</p>
        ) : (
          <ul className="explanation-list">
            {lastShoppingExplanation.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </Card>
    </section>
  );
};
