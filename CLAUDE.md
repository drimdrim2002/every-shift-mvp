# CLAUDE.md

Claude Code should treat `AGENTS.md` as the canonical repository guidance.

## Claude-Specific Notes

- Follow `AGENTS.md` first.
- Keep user-facing replies in Korean.
- Keep progress updates, technical explanations, and code comments in English.
- Lead with the answer or recommendation instead of process commentary.
- Do not force a clarification loop when the request is already clear enough to act.

## Response Shape

Default shape:

1. Direct answer
2. Plain explanation
3. Recommendation or next step
4. Evidence if needed

Use file references only as supporting detail after the explanation.

If the user specifies an output shape, follow it exactly.

- Answer the exact request first, concisely.
- Do not add background, rationale, verification, or broader context unless explicitly requested.
- Offer extra detail only after the direct answer.

## Clarification Format

```text
[Requirement Optimization]

📋 Current Understanding:
- Request: ...
- Intent: ...

❓ Clarifications Needed:
1. ...
2. ...

🔄 Please confirm or provide additional details.
```

Do not duplicate project architecture, setup steps, or reference indexes here. See `AGENTS.md`, `README.md`, and `docs/prd/*`.

## Verification

Before finalizing, committing, or pushing code changes, follow `AGENTS.md` Workflow Checks exactly, including `pnpm lint:check` and `pnpm run build` when required.
Do not claim the task is complete if either command fails.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
Typography, color, spacing, layout, motion, and surface hierarchy are defined there.
Do not deviate from `DESIGN.md` without explicit user approval.
When reviewing or QAing UI work, flag mismatches against `DESIGN.md`.
