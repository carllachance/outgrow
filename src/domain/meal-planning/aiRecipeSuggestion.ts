import { normalizeIngredientAlias } from './derivations.js';
import type { Recipe, RecipeIngredient } from './types.js';

const titleCase = (value: string): string => value.split(' ').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');

export const tokenizePrompt = (prompt: string): string[] => (
  prompt
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 2)
);

export const hasAnyToken = (tokens: string[], options: string[]): boolean => options.some((option) => tokens.includes(option));

interface IngredientTemplate {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

const createIngredient = (template: IngredientTemplate, index: number): RecipeIngredient => {
  const unitLabel = template.quantity === 1 ? template.unit : template.unit;
  return {
    id: `ing-${index + 1}`,
    rawText: `${template.quantity} ${unitLabel} ${template.name}`,
    itemKey: normalizeIngredientAlias(template.name),
    displayName: titleCase(template.name),
    quantity: template.quantity,
    unit: template.unit,
    optional: Boolean(template.optional)
  };
};

export const suggestRecipeFromPrompt = (prompt: string, nowIso = new Date().toISOString()): Recipe => {
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

  const templates: IngredientTemplate[] = [
    { name: baseProtein, quantity: 2, unit: 'cup' },
    { name: 'olive oil', quantity: 1, unit: 'tbsp' },
    { name: 'garlic', quantity: 1, unit: 'tbsp' },
    { name: wantsComfort ? 'greek yogurt' : 'lemon', quantity: 1, unit: 'cup', optional: true },
    { name: wantsSpicy ? 'chili flakes' : 'paprika', quantity: 1, unit: 'tbsp', optional: true },
    { name: 'broccoli', quantity: 1, unit: 'cup' },
    { name: 'rice', quantity: 1, unit: 'cup' }
  ];

  return {
    id: `recipe-${crypto.randomUUID()}`,
    title: `${flavor} ${baseTitle}`,
    description: `AI suggestion based on: "${prompt.trim()}"`,
    source: { type: 'ai_generated', label: 'Outgrow AI planner' },
    status: 'draft',
    version: 1,
    servingsDefault: 2,
    prepTimeMin: totalTimeMin - cookTimeMin,
    cookTimeMin,
    totalTimeMin,
    ingredients: templates.map(createIngredient),
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
