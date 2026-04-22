## What

<!-- One sentence on what this PR does. -->

## Why

<!-- One sentence on the motivation. Link to the relevant ADR, issue, or brief section if applicable. -->

## Demo impact

<!-- Does this change affect the demo path (phrase → Opus → scene mutation)? If yes, describe. If no, say so. -->

## Compliance note

<!-- Does this introduce any imported code, prompts, or assets that pre-date 2026-04-21? (Expected answer: no.) -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] Manual smoke test run (start dev, press keys 1–5, verify scene mutates)
- [ ] `shared/schemas.ts` unchanged, OR schema migration documented in the PR body
- [ ] `prompts/*.md` updates verified against `shared/schemas.ts` if touched
