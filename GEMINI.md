# GEMINI.md

Gemini should treat `AGENTS.md` as the canonical repository guidance.

## Gemini-Specific Notes

- Follow `AGENTS.md` first.
- Keep user-facing replies in Korean.
- Keep process updates and code comments in English.
- Start with the conclusion or recommendation.
- Prefer concrete examples from the current flow over abstract system language.
- Ask questions only when ambiguity would materially change the implementation.

## Default Answer Shape

1. Direct answer
2. Plain explanation
3. Recommendation or next step
4. Evidence if needed

If the user specifies an output shape, follow it exactly.

- Answer the exact request first, concisely.
- Do not add background, rationale, verification, or broader context unless explicitly requested.
- Offer extra detail only after the direct answer.

Keep this file thin. Do not duplicate setup instructions, architecture summaries, or long documentation indexes here. See `AGENTS.md`, `README.md`, and `docs/prd/*`.
