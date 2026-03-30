# Grow Product Note: Handling Ambiguous Goals

## Core rule
Ambiguous goals are valid starting points. Grow should help make them supportable without treating ambiguity like bad input.

## 1) Accept the goal first
When a user enters broad phrasing (for example, “I want to feel better” or “I need to be more present”), Grow should:
- accept the input as valid
- preserve the user’s original wording as the primary goal intent
- avoid signals that the user answered incorrectly
- avoid requiring immediate precision before continuing

**Product requirement:** the original user phrasing is the durable growth intent, even when the app later identifies a narrower starting focus.

## 2) Clarify gently, only when useful
Clarification exists to improve usefulness, not to force categorization.

Good lightweight prompts:
- “What would that look like in real life?”
- “Is this mostly about meals, sleep, energy, routines, being more present, or something else?”
- “Is there one part of this you want to start with?”
- “Where does this show up most right now?”

Clarification should be:
- optional
- action- or context-grounded
- short (single-step whenever possible)
- non-clinical and non-diagnostic

If a plausible start is already clear enough, skip clarification and move forward.

## 3) Keep broad intent separate from starting focus
Grow should preserve the distinction between:
- **Growth intent (broad):** the user’s real goal in their own words
- **Starting focus (narrow):** where the user wants to begin now

Examples:
- Intent: “I want to feel better.” → Starting focus: meals
- Intent: “I need to be more present.” → Starting focus: after work
- Intent: “I want healthier habits.” → Starting focus: lunch or routine

This lets the product stay emotionally accurate while still being operationally useful.

## 4) Practical ambiguity types
Use lightweight ambiguity types to choose better follow-up.

### Outcome-vague
Example: “I want to feel better.”
Helpful follow-up: offer likely domains (meals, sleep, routine) and ask where to start.

### Domain-vague
Example: “I want healthier habits.”
Helpful follow-up: offer adjacent domains (meals, movement, sleep, routine) and let the user pick one.

### Context-vague
Example: “I want to be more present.”
Helpful follow-up: ask where this shows up (after work, dinner, conversation, mornings).

### Action-vague
Example: “I need to get back on track.”
Helpful follow-up: ask for the smallest restart surface (routine, lunch, sleep) instead of asking for full planning.

## 5) Target supportable enough, not perfect clarity
Grow does not need a perfect statement before helping. It needs enough signal to produce:
- 1–3 plausible focus areas
- one useful immediate support
- a reasonable first starting point

The product should confidently begin from partial understanding.

## 6) Prefer offered interpretations over demanded explanations
Default pattern: propose plausible starts, then let the user select or edit.

Example framing:
- “You said you want healthier habits. A few places we could start: meals, sleep, movement, routine.”
- “You said you want to be more present. That might mean after work, at dinner, in conversation, or something else.”

This should feel like practical help, not taxonomy enforcement.

## 7) Let meaning sharpen over time
Ambiguous goals should be revisitable. Grow should support:
- changing focus areas
- reframing later while preserving original intent
- light check-ins (for example: “Still the right place to start?” / “Keep this focus or shift a little?”)

Initial framing is a starting point, not a permanent contract.

## 8) Tone and trust guardrails
- Never imply the user gave a bad answer.
- Never label input as “too vague.”
- Avoid therapeutic, clinical, or coaching-heavy language.
- Do not force a large category tree.
- Preserve user voice.
- Make broad starts feel normal and welcome.

## 9) Implementation guidance (product behavior)

### Trigger clarification when
- no reasonable focus options can be inferred from the text
- the same broad intent could map to very different supports
- choosing a starting focus changes what the next screen does

### Skip clarification when
- the goal already implies a usable first step
- the user selects one offered focus immediately
- adding questions would delay action without improving support quality

### Seed plausible focus areas directly when
- there are clear adjacent interpretations and low downside
- user intent is broad but common (“feel better,” “healthier habits,” “back on track”)
- the app can offer 2–4 options plus “something else” in one step

### Ask for context when
- time/place context is needed to make support concrete
- behavior type is clear but situation is not (e.g., “be more present”)

### Keep clarification to one light step
- one prompt + structured options + optional free text
- avoid multi-screen intake branching
- continue as soon as one supportable focus is selected

## 10) Example mappings (ambiguous goal → usable starts)
- “I want to feel better.” → meals / sleep / routine
- “I need to be more present.” → after work / dinner / conversation
- “I want healthier habits.” → meals / movement / routine
- “I need to get back on track.” → routine / lunch / sleep

## Explicitly deferred (not in scope)
- Full NLP classifier for goal parsing
- Model-backed goal interpretation
- Large taxonomy of goal categories
- Heavy questionnaire/intake flow
- Therapeutic or diagnostic framing
