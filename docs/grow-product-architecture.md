# Grow product architecture

## Direction

Grow uses a universal framework with selective domain depth:

- The framework is broad enough to support many kinds of personal change.
- Tooling depth is intentionally selective.
- Food is the first deep domain, while movement, sleep, routines, and presence are supported through lightweight framework primitives.

## Core model primitives

The architecture should stay anchored to stable entities:

1. Growth intent
2. Focus area
3. Support item
4. Daily moment
5. Reflection
6. Pattern
7. Experiment

These primitives provide a shared structure across domains while allowing product depth to vary by domain maturity.

## Product loop

The core interaction loop should remain:

1. Capture growth intent in the user’s words.
2. Clarify lightly where needed.
3. Build a small support framework.
4. Capture real daily moments.
5. Infer patterns carefully and provisionally.
6. Adapt supports over time.

## v1 depth policy

- Keep food workflows deep and practical.
- Support adjacent non-food goals through shared framework objects before creating dedicated domain modules.
- Suppress low-value AI output when signal is weak.
- Preserve user voice and avoid replacing user language with product jargon.

## Implementation status

Universal growth framework types live in `src/domain/growth/types.ts` and are the baseline model for cross-domain expansion.
