import type { RecipeImage } from './types.js';

const hash = (value: string): number => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
};

const hue = (seed: number, offset: number): number => (seed + offset) % 360;

const encodeSvg = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

export const buildGeneratedFoodImage = (prompt: string, title: string): RecipeImage => {
  const seed = hash(`${prompt}|${title}`);
  const hueA = hue(seed, 18);
  const hueB = hue(seed, 52);
  const hueC = hue(seed, 96);
  const herbHue = hue(seed, 138);
  const garnishHue = hue(seed, 164);

  const plateX = 360 + (seed % 36);
  const plateY = 236 + (seed % 16);
  const garnishX = 420 + (seed % 44);
  const garnishY = 170 + (seed % 30);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' role='img' aria-label='AI generated plating for ${title}'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='hsl(${hueA},55%,82%)'/>
        <stop offset='45%' stop-color='hsl(${hueB},48%,73%)'/>
        <stop offset='100%' stop-color='hsl(${hueC},30%,62%)'/>
      </linearGradient>
      <radialGradient id='plateLight' cx='50%' cy='45%' r='56%'>
        <stop offset='0%' stop-color='rgba(255,255,255,.95)'/>
        <stop offset='70%' stop-color='rgba(245,241,235,.82)'/>
        <stop offset='100%' stop-color='rgba(218,209,194,.82)'/>
      </radialGradient>
    </defs>
    <rect width='1200' height='800' fill='url(#bg)'/>
    <ellipse cx='612' cy='494' rx='360' ry='112' fill='rgba(38,40,36,.14)'/>
    <circle cx='600' cy='370' r='262' fill='url(#plateLight)'/>
    <circle cx='600' cy='370' r='214' fill='rgba(255,255,255,.75)'/>
    <ellipse cx='${plateX}' cy='${plateY}' rx='188' ry='128' fill='hsl(${hueB},48%,58%)' opacity='.75'/>
    <ellipse cx='520' cy='422' rx='190' ry='130' fill='hsl(${hueA},56%,52%)' opacity='.72'/>
    <ellipse cx='620' cy='356' rx='174' ry='118' fill='hsl(${hueC},48%,46%)' opacity='.7'/>
    <ellipse cx='678' cy='434' rx='160' ry='84' fill='hsl(${herbHue},36%,38%)' opacity='.55'/>
    <circle cx='${garnishX}' cy='${garnishY}' r='34' fill='hsl(${garnishHue},62%,44%)' opacity='.78'/>
    <circle cx='${garnishX - 52}' cy='${garnishY + 22}' r='18' fill='hsl(${herbHue},40%,36%)' opacity='.74'/>
    <text x='68' y='726' fill='rgba(255,255,255,.78)' font-family='Inter,Segoe UI,sans-serif' font-size='36' letter-spacing='3'>OUTGROW AI VISUAL</text>
  </svg>`;

  return {
    url: encodeSvg(svg),
    alt: `AI-generated food styling for ${title}`
  };
};
