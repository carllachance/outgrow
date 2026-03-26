# Outgrow MVP

Mobile-first foundation for the Outgrow app (privacy-first adaptive nutrition support).

## Run locally

```bash
npm install
npm run dev -- --host
```

Then open the printed local network URL on your phone.

## Routes

- `/onboarding`
- `/today`
- `/growth`
- `/journal`
- `/privacy`
- `/kind-words`
- `/profile`

## Notes

- Data persists in `localStorage` for MVP.
- AI-like support surfaces are mocked for quick iteration.
- Existing `internal/agent-playground` remains untouched for internal testing.
- Safety doctrine and tier behavior are documented in `docs/OUTGROW_SAFETY_POLICY.md`.
- Runtime safety mode and capability flags are defined in `docs/outgrow_safety_runtime_policy.json` and mirrored in `src/data/safetyRuntimePolicy.ts`.
- Agent behavior constraints are captured in `docs/OUTGROW_AGENT_INSTRUCTIONS.md` and operationalized in `src/data/agentInstructionPrompt.ts`.
