# Grow Ambiguous Goals: Implementation Stories

These stories translate the product note into incremental behavior work.

## Story 1 — Persist intent separately from starting focus
**As a** user with a broad goal,
**I want** my exact wording preserved,
**so that** I feel understood even if I start narrow.

**Acceptance guidance**
- Save `goal_intent_original` exactly as entered.
- Save `starting_focus` as a separate, editable field.
- Display user phrasing in goal surfaces unless they explicitly edit it.

## Story 2 — Single-step clarification only when needed
**As a** user entering a broad goal,
**I want** at most one lightweight clarification step,
**so that** I can begin quickly.

**Acceptance guidance**
- Clarification is optional and skippable.
- Maximum one step before offering a usable start.
- No branching intake questionnaire.

## Story 3 — Offer interpretations before asking open-ended questions
**As a** user with an ambiguous goal,
**I want** suggested places to start,
**so that** I do not need to explain everything first.

**Acceptance guidance**
- Show 2–4 plausible focus options + “something else”.
- Option labels stay calm and plain (no clinical/coaching tone).
- Selecting an option immediately unlocks next support.

## Story 4 — Clarify context only when it changes support quality
**As a** user,
**I want** context questions only when necessary,
**so that** I am not interrogated.

**Acceptance guidance**
- Ask context only when support depends on time/place/situation.
- Prefer specific context options (e.g., after work, dinner, conversation).
- Skip context prompts when first support can be generated without them.

## Story 5 — Revisit and reframe over time
**As a** user,
**I want** to adjust focus later,
**so that** my plan can evolve as I learn what helps.

**Acceptance guidance**
- Allow focus changes without rewriting original intent.
- Include light periodic check-ins (e.g., keep or shift focus).
- Treat initial focus as provisional, not permanent.

## Story 6 — Trust and tone guardrails in UX copy
**As a** user,
**I want** broad goals to feel acceptable,
**so that** I can start without shame or correction.

**Acceptance guidance**
- Never present “too vague” or equivalent error language.
- No diagnostic, therapeutic, or pseudo-personalized claims.
- Keep language direct, short, and supportive.

## Implementation checklist for future contributors
- Preserve `goal_intent_original` as canonical user phrasing.
- Keep intent and focus as separate product concepts.
- Use one-step clarification patterns by default.
- Prefer offered interpretations to open-text interrogation.
- Begin once support is “supportable enough” (not perfect).
- Keep broad goals revisable over time.

## Intentionally deferred
- Automated semantic parsing/classification beyond lightweight rule triggers.
- Personalized inference from behavior history when data is sparse.
- Expanded domain taxonomy beyond practical starter options.
