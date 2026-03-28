## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /opt/codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /opt/codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.

## Locked Product Decisions

These decisions are settled unless a task explicitly says they are in scope for revision.
Do not reinterpret, soften, replace, or “improve” them during unrelated work.

### Onboarding and goal framing
- Onboarding step one must be broad, not meal-specific.
- The product must support adjacent categories around a goal, including meals, movement, sleep, reminders, snacks, and routines.
- Goal entry should feel like the beginning of a tailored framework, not a generic form field.
- User goals must remain easy to revisit and revise from the profile/top-level goal surface.
- If user goal phrasing is unclear or awkward, the system may offer an optional clearer rewrite, but must preserve intent and voice.
- The product should support goals that are very small or narrow in scope, including a single habit, meal pattern, or reminder type.

### Framework philosophy
- After goal entry, the product may offer help staying on track or building a realistic framework.
- Framework-building must be optional.
- Initial frameworks must be minimal, bespoke, and scaffolded over time.
- Do not over-architect first-run planning.
- The system should help shape realistic next steps without sounding managerial or prescriptive.

### AI behavior and trust
- Do not show placeholder AI output, filler suggestions, or generic “helpful” commentary when there is no concrete value to add.
- Hide AI-generated assistance entirely when there is not enough context to make it useful.
- Suggestions should arrive as if they are the natural next helpful field on the page, not as a theatrical AI intervention.
- No fake intelligence. Do not imply pattern knowledge, personalization, or learned behavior when the system does not yet have enough basis for that.
- Human review and being in the loop are value, not friction.

### Tone and language
- Copy should feel calm, plain, supportive, and human.
- Avoid system-sounding or therapist-sounding labels and helper text.
- Avoid overly authored, poetic, or self-conscious phrasing.
- Preserve concise warmth over “crafted” product copy.
- Preserve approved terminology once established.

### UX behavior
- Only surface support when there is a meaningful action, insight, or input to offer.
- Avoid duplicative headings, repeated labels, and stacked explanation where a single clear action will do.
- The interface should not narrow the user’s stated goal into a more specific domain unless the user does that themselves.

## Banned Moves

These are common failure modes and are not allowed unless a task explicitly requires them.

- Do not narrow broad goal-setting back to meals.
- Do not rewrite approved broad framing into generic nutrition or wellness language.
- Do not add AI/helper text just to fill space.
- Do not show placeholder suggestions, fake insights, or speculative personalization.
- Do not imply the system knows the user’s patterns when there is not enough history.
- Do not rename approved concepts, labels, or flows without explicit instruction.
- Do not rewrite nearby screens for “consistency” during a scoped task.
- Do not make adjacent style or copy edits outside the requested scope.
- Do not introduce system-like labels such as “anchor step,” “supportive options,” “surfaced message,” or similar implementation-flavored wording.
- Do not add explanatory chrome where a direct action or single line of context is enough.
- Do not over-architect onboarding or force users into a large framework before value is clear.
- Do not replace user wording with sanitized system wording unless presenting it as an explicit optional suggestion.

## Sensitive Surface Rule

Some surfaces are especially prone to drift and should be treated as high-sensitivity:
- onboarding copy and flow
- top-level product framing
- goal-setting language
- AI-assistance presentation
- trust/safety language
- tone-critical helper text

When editing a high-sensitivity surface:
- make the smallest viable change
- preserve surrounding approved copy unless explicitly asked otherwise
- do not perform opportunistic cleanup
- do not replace product decisions with generic UX conventions

## Canonical Content Rule

When copy, labels, prompts, or product language become approved, move them into canonical content/constants files.

Do not rewrite canonical content inline from random components.
Do not alter canonical copy unless the task explicitly targets that content source.

Prefer:
- central content constants
- design tokens
- enumerated labels
- shared helper copy definitions

This reduces unrequested drift and makes approved language auditable.

## PR / Summary Contract

Every implementation summary must use this structure:

### Changed
- exact requested changes made

### Intentionally unchanged
- nearby surfaces that were reviewed but left alone

### Non-requested edits made
- list every edit outside the explicit request
- write "None" if none were made

### Why non-requested edits were strictly necessary
- required justification for each non-requested edit
- write "N/A" if none were made

### Locked decisions checked
- list the specific locked decisions reviewed before editing

### Banned moves avoided
- confirm the relevant banned moves that were not violated

A summary that omits scope accounting is incomplete.

See docs/decisions.md for the dated product decision register and rationale.
