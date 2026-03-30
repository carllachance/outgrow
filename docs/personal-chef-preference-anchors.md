# Personal Chef: Preference Anchors and Pattern Confirmation

## Purpose
Capture a clear direction for Personal Chef so future implementation remains useful, calm, and trust-preserving.

Core principle: **confirm, do not assume**.

## Product note

### 1) Optional meal anchors (examples, not tracking)
Personal Chef may optionally ask for a few meals the user already likes (for example breakfast, lunch, dinner, and snack examples).

This is intended to:
- improve suggestion relevance
- understand taste in a lightweight way
- avoid a heavy up-front setup form

Guardrails:
- meal anchors are optional
- framing should emphasize better suggestions, not logging behavior
- ask for a few concrete examples, not a full preference questionnaire

Tone guidance example:
> You can add a few meals you actually like so suggestions feel more like you.

### 2) Light pattern observation with explicit confirmation
The app may observe lightweight planning signals (for example lunch often serves 1 and dinner often serves 5).

The app must **not** silently convert observed signals into defaults.
It should ask for confirmation before applying a recurring setup.

Example confirmation prompt:
> I’ve noticed you often plan dinner for more people and lunch just for yourself. Want me to treat that as your usual setup?

Design rule:
- infer lightly
- confirm explicitly
- keep it flexible

### 3) Confirmed defaults should reduce friction, never lock behavior
If the user confirms a pattern, Personal Chef can store editable defaults such as:
- lunch usually serves 1
- dinner usually serves 5
- snacks usually serve 1
- lunch is usually solo
- dinner is usually shared

Rules:
- defaults remain editable
- each meal instance remains overridable
- exceptions should stay easy and low-friction

### 4) Keep taste and household/planning patterns separate
The system should model and reason about two distinct pattern families:

1. **Taste patterns** (what kinds of food feel right)
   - savory breakfast
   - quick lunches
   - spicy dinners
   - crunchy snacks

2. **Household/planning patterns** (who meals are planned for and in what context)
   - dinner for family
   - lunch for one
   - weekday meals solo, weekend meals shared
   - snacks mainly for self, kids, or household

Why this separation matters:
- a user can personally prefer one flavor profile while planning meals for a different audience
- planning defaults should not overwrite taste understanding, and taste understanding should not imply serving defaults

### 5) Trust and tone guardrails
To avoid an intrusive or surveillance-like experience:
- do not use tracking-oriented framing
- do not imply certainty from sparse history
- do not auto-apply unconfirmed assumptions
- keep prompts occasional, contextual, and skippable
- prefer calm, plain language over system-like wording

## Lightweight architecture sketch (for future work)
This is a directional sketch only, not a final schema.

```ts
// Canonical reminder: all observed patterns are tentative until confirmed.

type MealOccasion = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type MealPreferenceAnchor = {
  id: string;
  occasion: MealOccasion;
  label: string;              // user phrasing (e.g., "egg tacos")
  notes?: string;             // optional lightweight context
  source: 'user_entered';
  createdAt: string;
};

type PlanningDefault = {
  occasion: MealOccasion;
  serves?: number;
  audience?: 'solo' | 'household' | 'kids' | 'shared';
  confirmedAt: string;
  editable: true;
};

type ObservedPlanningPattern = {
  id: string;
  signal: string;             // compact explanation of what was observed
  confidenceBand: 'low' | 'medium';
  status: 'observed_unconfirmed' | 'confirmed' | 'dismissed';
  firstObservedAt: string;
  lastObservedAt: string;
};

type PersonalChefPreferenceProfile = {
  mealAnchors: MealPreferenceAnchor[];
  planningDefaultsByOccasion: Partial<Record<MealOccasion, PlanningDefault>>;
  observedPlanningPatterns: ObservedPlanningPattern[];
};
```

Modeling constraints:
- no `high` confidence tier for early-stage patterning
- no automatic conversion from `observed_unconfirmed` to `confirmed`
- confirmation events should be explicit user actions
- defaults should be read as "usual" not "required"

## Future PR sequence (implementation stories)

### PR A — Optional meal-anchor capture UI
Scope:
- add optional UI to capture a small number of liked meal examples by occasion
- reinforce non-tracking framing in copy
- support skip/dismiss without penalty

Acceptance highlights:
- no large questionnaire
- anchors are optional and editable
- copy remains calm and plain

Out of scope:
- automatic preference inference
- heavy onboarding expansion

### PR B — Storage/model support for anchors + confirmed planning defaults
Scope:
- add model/storage support for `MealPreferenceAnchor`, `PlanningDefault`, and `ObservedPlanningPattern`
- persist explicit confirmation status and timestamps
- keep schema open for per-occasion serving/audience defaults

Acceptance highlights:
- clear separation between taste anchors and planning defaults
- unconfirmed observations cannot behave as defaults

Out of scope:
- advanced analytics/prediction

### PR C — Lightweight pattern confirmation prompts
Scope:
- introduce occasional prompt flow for observed planning patterns
- support confirm, dismiss, and "not now"
- show plain-language rationale for prompt

Acceptance highlights:
- prompts appear only when there is meaningful observed evidence
- no silent defaulting
- prompt cadence is restrained

Out of scope:
- background auto-application of patterns

### PR D — Use confirmed defaults in planning UX
Scope:
- apply confirmed defaults to meal planning and serving suggestions
- keep each planned meal fully overridable
- expose simple edit path for defaults

Acceptance highlights:
- defaults reduce repetitive entry
- overrides remain easy and immediate
- changing defaults does not rewrite historical meals silently

Out of scope:
- broad automation that removes per-meal control

## Intentionally deferred (this note does not implement)
- full feature implementation
- automatic pattern inference engine
- silent default assignment
- expanded onboarding questionnaire
- any tracking-like behavior or surveillance framing
