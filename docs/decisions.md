# Product Decision Register

This file records settled product decisions that should not be casually re-opened during implementation.

### 2026-03-28 — Broad goal framing in onboarding
Onboarding must not frame the user’s goals too narrowly around meals.
The first goal-setting step should support meals, movement, sleep, reminders, snacks, routines, and similarly small daily-life goals.

Reason:
The product is about helping users outgrow friction in day-to-day life, not only meal planning.

Implications:
- Step-one prompt must remain broad.
- Example content may include meals, but the framing cannot collapse to meals only.
- Follow-up scaffolding should adapt to the type of goal entered.

### 2026-03-28 — Frameworks are optional and minimal at first
After goal entry, the product may offer help staying on track or building a realistic framework.
This support must be optional.
Initial frameworks should be light, bespoke, and scaffolded slowly over time.

Reason:
Users should not be forced into heavy planning before trust and relevance are established.

Implications:
- No rigid first-run architecture.
- No overwhelming setup flow.
- Start with a small, realistic support structure.

### 2026-03-28 — No placeholder AI guidance
AI support should only appear when it has concrete value.
Do not render filler suggestions, speculative insights, or empty “support” states.

Reason:
Placeholder AI erodes trust and makes the product feel artificial.

Implications:
- Hide unsupported suggestions.
- Avoid generic motivational or predictive language.
- Do not claim the system understands patterns it has not observed.

### 2026-03-28 — Preserve user voice
When clarifying user-entered goals, preserve intent and voice.
Optional rewrites may improve clarity, but should never overwrite the user’s phrasing by default.

Reason:
The product should support the user, not replace their framing with system wording.

Implications:
- Offer optional edits, not silent rewrites.
- Avoid sanitizing natural phrasing into generic product language.

### 2026-03-28 — Tone should be calm and plain
Product copy should be warm, direct, restrained, and human.
Avoid implementation-flavored labels, synthetic encouragement, or overly written copy.

Reason:
The interface should feel trustworthy and quiet, not performed.

Implications:
- Prefer plain labels.
- Avoid terms like “anchor step,” “supportive options,” “surfaced message,” and similar system-y phrasing.
- Reduce stacked explanation where a single clear prompt or action works.
