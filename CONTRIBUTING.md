# Contributing

Two-person project built during a one-week hackathon (April 21–26, 2026). Workflow is lightweight.

## Team

- **Bashar Aldarwish** — artistic direction, prompts, maqam content, performance.
- **Amay Ayach** — engineering, scene rendering, server, tooling, integration.

## Workflow

- `main` is the working branch. Short-lived feature branches for anything that might break `main`.
- Commit messages follow Conventional Commits where possible (`feat:`, `fix:`, `docs:`, `chore:`). Not enforced by a hook — pragma over dogma.
- One open PR at a time is the norm, reviewed by whoever isn't the author. PR template lives at `.github/pull_request_template.md`.
- No tests this week. `pnpm typecheck` and a manual smoke test are the gate.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Client: http://localhost:5173 · Server: http://localhost:8787

## Things to not commit

- `.env` (contains `ANTHROPIC_API_KEY`)
- `docs/capture-session.json`, `docs/capture-cache.json` (runtime-generated)
- `node_modules`, `dist`

`.gitignore` already covers these; gitleaks pre-commit is configured.

## Prompts and schemas

- `shared/schemas.ts` is the single source of truth. Prompt docs mirror the enums for humans; the code wins on any divergence.
- `prompts/*.md` are Bashar's to author. `TODO: Bashar` markers indicate where.

## Reporting a concern

Open an issue; if it's time-sensitive, message the other person directly — this is a small project.
