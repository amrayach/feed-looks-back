# The Feed Looks Back

[![CI](https://img.shields.io/badge/CI-pending-lightgrey)](#)

A guitarist plays Arabic maqam. Claude Opus 4.7 responds once per phrase with structured JSON that mutates a Three.js scene — re-rendering culturally situated musical input as attention-economy UI. The gap between what is played and what the system returns is the piece.

## Status

Built during the Built with Claude Opus 4.7 hackathon, April 21–26, 2026. Submission deadline: Sunday April 26, 2026, 8pm EST. Team: Bashar Aldarwish, Amay Ayach.

## Quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev
```

After install:

- Dev server (Express, mock LLM by default): http://localhost:8787
- Dev client (Vite): http://localhost:5173

Set `USE_REAL_API=true` in `.env` to route `/api/phrase` through the Anthropic SDK. Day 1 defaults to mock responses; no outbound API calls occur unless this flag is flipped.

Capture-mode replay:

```bash
pnpm capture
```

## What this repo is

What this repo is. The Feed Looks Back draws on an artistic premise and cultural framework developed by Bashar Aldarwish before this hackathon. Every line of code, every prompt, every schema, every shader, and every asset in this repository was built from scratch between April 21 and April 26, 2026, during the Built with Claude Opus 4.7 hackathon. No prior code, prior prompts, or prior media assets have been imported. The public commit history is the build record.

## Architecture

See `docs/architecture.md` for the full signal chain and state-machine notes.

Key locked decisions:

- Local TypeScript owns timing; one buffered Opus request per phrase; no tool-calling in the hot path.
- JSON only on the per-phrase hot path; no model-authored GLSL or code this week.
- 15 pre-compiled shader variants (5 maqams × 3 escalation stages); Opus picks from enum, cannot invent variants.
- `zod` is the authority on validity; `jsonrepair` may only fix malformed JSON syntax.
- DEGRADED state on any parse/validation/SDK failure; next successful validated phrase recovers to LISTENING.
- Prompt caching required from Day 1 scaffolding.

## Submission deliverables

_Placeholder — deeper content and links land in Turn 2._

- [ ] Demo video
- [ ] Architecture diagram
- [ ] Opus-use writeup
- [ ] Impact narrative
- [ ] Execution/reliability notes

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Bashar Aldarwish and Amay Ayach.
