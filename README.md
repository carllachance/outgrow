# Grow

Grow is an early product for people who want to outgrow patterns that are no longer working.

It starts with one question: **“What do you want to outgrow?”**
From there, the product helps each person define what success looks like and build gentle structure around it.

Food support is a major part of the experience today (meal logging, planning, practical recipe support), but food is not the whole identity. Grow is also being shaped to support routines, movement, sleep rhythm, reminders, and day-to-day follow-through.

## What this is

A mobile-first MVP exploring calm, goal-first support for real-life change.

In this repo you’ll find:
- onboarding centered on user-defined goals
- daily support and reflection surfaces
- meal logging and meal planning flows
- privacy and safety foundations

## Core idea

Many products start with a preset model of improvement.
Grow starts with what the user actually wants to change, in their own words.

From there, the product helps turn that into a realistic framework that can be revisited and revised over time.

## How the product works

1. **Start with user language**  
   Onboarding begins broad, not meal-only.

2. **Clarify when needed**  
   If a goal is ambiguous, Grow can ask one light follow-up question.

3. **Shape practical support**  
   The product suggests relevant support areas (for example meals, routines, movement, sleep) based on stated intent.

4. **Guide today without overreaching**  
   The Today surface keeps support practical: one honest next step, context-aware suggestions, and low-pressure momentum.

5. **Keep plans editable**  
   Users can revisit goals, refine wording, and adjust support over time instead of being locked into rigid setup.

## Why it is different

- **User-defined success** over preset definitions of improvement.
- **Support that fits real life** over all-or-nothing plans.
- **Calm, transparent support** over pushy automation.
- **Food as a major pathway** without reducing the product to meal planning.

## Current focus

Current product work is focused on:
- making onboarding broad, clear, and trustworthy
- improving daily follow-through surfaces
- strengthening meal support as a major current pathway
- preserving transparency and user control in support behavior

## Design principles

- Start from what the user actually said.
- Keep early frameworks minimal and realistic.
- Offer support when it adds value; stay quiet when it doesn’t.
- Make revision easy (goals and plans are expected to evolve).
- Avoid false certainty.

## What exists now (implemented)

- Mobile-first app shell with route-based screens (`/onboarding`, `/today`, `/growth`, `/meals`, `/planner`, `/journal`, `/privacy`, `/kind-words`, `/profile`).
- Goal-first onboarding with optional clarification and suggested support areas.
- Daily support surfaces with editable “today success” framing.
- Meal logging and planner workflows with practical recipe support.
- Journal/reflection history and detail views.
- Local-first persistence via `localStorage`.
- Clear safety guidance and practical in-app safety settings.

## What is in progress / partially explored

- Refining how non-food support surfaces appear alongside meal support.
- Improving how lightweight frameworks appear over time.
- Tightening when support appears so it only shows up when context is sufficient.
- Continuing to refine public-facing language and hierarchy.

## Product direction (emerging)

Grow is intended to become a real, trusted product for change that feels:
- calm
- bespoke
- non-invasive
- transparent

Grow is evolving into a broader support product where food remains a strong current pathway, but not the whole frame.

## Run locally

```bash
npm install
npm run dev -- --host
```

Then open the printed local network URL on your phone.

## Test

```bash
npm test
```

## Notes

- This is an early-stage codebase and product narrative in active refinement.
- Some support surfaces are intentionally mocked while trust boundaries and constraints are hardened.
- Internal playground tooling under `internal/agent-playground` remains available for isolated prompt/testing workflows.
- Safety references:
  - `docs/OUTGROW_SAFETY_POLICY.md`
  - `docs/outgrow_safety_runtime_policy.json`
  - `docs/OUTGROW_AGENT_INSTRUCTIONS.md`
