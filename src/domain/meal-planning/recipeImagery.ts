import type { Recipe, RecipeImage } from './types.js';

const encodePrompt = (value: string): string => encodeURIComponent(value.trim().replace(/\s+/g, ' '));

const encodeSvg = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const titleCase = (value: string): string => value.split(' ').map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');

export type RecipeHeroImageSource = 'source_photo' | 'ai_food_photo' | 'fallback_illustration' | 'none';

export interface RecipeHeroImageSelection {
  source: RecipeHeroImageSource;
  image?: RecipeImage;
  label?: string;
}

export const buildGeneratedFoodImage = (prompt: string, title: string): RecipeImage => {
  const realisticPrompt = [
    'Realistic overhead food photograph',
    title,
    prompt,
    'natural kitchen lighting',
    'simple ceramic plate',
    'believable editorial food photography',
    'not abstract art',
    'not illustration',
    'not surreal'
  ].join(', ');

  return {
    url: `https://image.pollinations.ai/prompt/${encodePrompt(realisticPrompt)}?width=1200&height=800&model=flux&nologo=true`,
    alt: `AI-generated realistic food photo of ${title}`,
    kind: 'ai_generated_realistic_food'
  };
};

export const buildIngredientIllustrationTile = (title: string, ingredients: string[] = []): RecipeImage => {
  const ingredientLine = ingredients.length
    ? ingredients.slice(0, 3).map(titleCase).join(' • ')
    : 'Simple ingredient preview';

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' role='img' aria-label='Ingredient illustration for ${title}'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#f3efe4'/>
        <stop offset='100%' stop-color='#e8e0d0'/>
      </linearGradient>
    </defs>
    <rect width='1200' height='800' fill='url(#bg)'/>
    <rect x='120' y='130' width='960' height='540' rx='36' fill='rgba(255,255,255,0.78)' stroke='rgba(140,122,86,0.22)'/>
    <text x='160' y='245' fill='#4b3d25' font-family='Inter,Segoe UI,sans-serif' font-size='36' font-weight='600'>Image coming soon</text>
    <text x='160' y='305' fill='#63533a' font-family='Inter,Segoe UI,sans-serif' font-size='28'>${title}</text>
    <text x='160' y='365' fill='#7a6849' font-family='Inter,Segoe UI,sans-serif' font-size='24'>${ingredientLine}</text>
    <g transform='translate(160,430)'>
      <rect x='0' y='0' width='150' height='120' rx='22' fill='#dfd3bb'/>
      <rect x='180' y='0' width='150' height='120' rx='22' fill='#d8cfbf'/>
      <rect x='360' y='0' width='150' height='120' rx='22' fill='#e2d8c2'/>
    </g>
  </svg>`;

  return {
    url: encodeSvg(svg),
    alt: `Ingredient illustration preview for ${title}`,
    kind: 'placeholder',
    placeholder: true
  };
};

export const selectRecipeHeroImage = (recipe: Recipe, hasImageError = false): RecipeHeroImageSelection => {
  const image = recipe.image;
  if (!image || hasImageError) {
    const fallback = buildIngredientIllustrationTile(recipe.title, recipe.ingredients.map((item) => item.displayName));
    return { source: 'fallback_illustration', image: fallback, label: 'Image generating…' };
  }

  if (image.kind === 'source_photo' || recipe.source?.type === 'web' || recipe.source?.type === 'imported' || recipe.source?.type === 'shared' || recipe.source?.type === 'manual') {
    return { source: 'source_photo', image };
  }

  if (image.kind === 'ai_generated_realistic_food') {
    return { source: 'ai_food_photo', image, label: 'AI food preview' };
  }

  if (image.placeholder) {
    return { source: 'fallback_illustration', image, label: 'Preview unavailable' };
  }

  const fallback = buildIngredientIllustrationTile(recipe.title, recipe.ingredients.map((item) => item.displayName));
  return { source: 'fallback_illustration', image: fallback, label: 'Preview unavailable' };
};
