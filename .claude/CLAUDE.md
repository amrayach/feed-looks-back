# CLAUDE.md — The Feed Looks Back

Project-scoped instructions for Claude Code. Read `docs/turn1-handoff.md` for the full handoff; this file is the short operating manual.

## What this project is

Live-performance piece: guitarist plays Arabic maqam, Claude Opus 4.7 responds **once per phrase** with structured JSON that mutates a Three.js scene. The gap between what is played and what the feed returns is the artwork. Deadline Sunday **2026-04-26 8pm EST**. Team: Bashar Aldarwish, Amay Ayach. Hardware target: AMD Vega integrated, **512 MB VRAM** — GPU budget is tight.

## Locked decisions — do not re-debate

These were settled in Turn 1 after spec review. If work conflicts with them, the work is wrong.

1. **Local TypeScript owns timing.** One buffered Opus request per phrase. No tool-calling on the hot path; no agentic loops.
2. **JSON only on the per-phrase hot path.** No Opus-authored GLSL or code this week.
3. **Pre-compiled shader enum only.** 15 `ShaderMaterial` instances (5 maqams × 3 stages). Opus picks from the enum.
4. **Buffered mode on Day 1.** `client.messages.create()`. Streaming deferred.
5. **Capture mode is first-class** — implemented from Day 1.
6. **Day 1 uses mock server responses.** SDK imported but gated behind `USE_REAL_API=true` (default `false`). No outbound API calls unless explicitly enabled.
7. **zod is the authority on validity.** `jsonrepair` only fixes malformed JSON syntax; it never coerces semantics.
8. **DEGRADED state on any parse/validation/SDK failure.** Never freeze the scene. Recover on the next successful validated phrase.
9. **`shared/schemas.ts` is the source of truth** for every enum and contract. Never duplicate enums in code; prompt docs mirror them for humans only.
10. **Prompt caching required.** Real-API path places `cache_control: { type: "ephemeral" }` on the final static system block. Per-phrase input rides in `messages` uncached.
11. **At most one post-processing pass** on Day 1 — VRAM ceiling.
12. **Server on port 8787** (not 3000 — avoids React devtool collisions).

## Code conventions

- **TypeScript strict mode**. Imports use aliases: `@/*` → `src/*`, `@shared/*` → `shared/*`. No deep relative paths (`../../../`).
- **Prefer editing existing files** — the directory layout is fixed. New files only when a new module genuinely lands.
- **Exact-pinned deps only** (no `^`/`~`). Bumping a version is a deliberate decision, not a side effect.
- **Failing-open on uniform_patch**: Three.js silently ignores unknown uniforms. Do not validate uniform keys against a whitelist — that would defeat the intentional drift.
- **`copy_fragment` is the single HUD-text field name** in both the output and the digest. Don't introduce a second name.
- **No comments explaining _what_.** Well-named identifiers already do that. Comments only for non-obvious _why_ (a constraint, invariant, workaround).

## Runtime modes — one-line mental model

| Mode | Server behavior | Client behavior |
|---|---|---|
| `live` | Serve from cache if present, else adapter (mock/real). Appends a session-log entry on every successful phrase. | Keyboard mock (keys 1–5). |
| `capture` | Serve from cache only. 404 on miss → client shows "cache miss" and DEGRADED. | Boots performance mode, then fetches `/api/capture-session` and replays keydowns by timestamp. |
| `degraded_recovery` | Same as `live` but marks meta accordingly. | Only set by the state machine on failure paths. |

Mode selection: URL `?mode=…` overrides `VITE_RUNTIME_MODE`, which overrides the default `live`. Server mode comes from `RUNTIME_MODE` env only.

## When you edit

- **Shaders**: `skeleton.vert/frag` serves 14 of 15 variants via uniform-driven palette/stage mutation. Only `saba_stage0` has its own pair. If you add a dedicated variant pair, update the selector in `src/scene/programs.ts:72` — do not add it silently.
- **State machine**: `src/state/machine.ts` is the only legal mutator of `State`. Never set `_state` from a handler. Valid transitions are a whitelist; unknown events are no-ops by design.
- **Contracts**: any schema change goes in `shared/schemas.ts` first; `shared/types.ts` re-exports via `z.infer`. Grep for old field names before renaming to catch stale references in prompts and docs.
- **Prompts**: `prompts/*.md` are loaded in a fixed order by `server/anthropic-adapter.ts:loadSystemBlocks()`. The final block carries `cache_control`. Reordering changes the cached prefix boundary.

## Skill policy (established Turn 1, refined Turn 2)

**Skip for structural work** — the architecture is locked:
- `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:test-driven-development`
- `superpowers:using-git-worktrees`, `superpowers:subagent-driven-development`
- `claude-mem:make-plan`

**Invoke when relevant**:
- `claude-api` — before touching the Anthropic SDK call path (prompt caching, tool-forcing, adaptive thinking).
- `superpowers:verification-before-completion` — gates every turn close.
- `superpowers:systematic-debugging` — install/build/runtime failures (Turn 3 onward).
- `threejs-fundamentals` — before writing non-trivial shader or scene code.

**Always announce**: `Using [skill] to [purpose]` when activating.

## Knowledge graph

The project uses the **code-review-graph** MCP. For code exploration prefer graph tools (`semantic_search_nodes`, `query_graph`, `get_impact_radius`) over Grep. Fall back to file scanning only when the graph lacks what you need. The graph auto-updates on writes (hook-driven); it will be seeded after `git init` lands in Turn 3.

## Verification before closing a turn

Before reporting a turn complete:

1. **Greps for enum drift** — zero hits on old field names (`label_text`, `emoji`, `narrative_frame`, `json-repair`).
2. **Import check** — every `@/…` / `@shared/…` resolves to a real file.
3. **Schema symmetry** — `copy_fragment` in both `ShortSemanticOutputSchema` and `LastValidOutputDigestSchema` (exactly 2 occurrences in `shared/schemas.ts`).
4. **Turn handoff doc** — write `docs/turn{N}-handoff.md` mirroring Turn 1's structure so the next session can pick up cold.

## Known caveats (carry-through from Turn 1)

- `@types/express@5.0.0` paired with `express@4.21.1` — type drift possible in middleware; pin kept per spec.
- `vite/client` type reference lives in `src/main.ts` only; don't add it to `tsconfig` types.
- `jsonrepair` import form is `import { jsonrepair } from 'jsonrepair'`.
- `capture` npm script uses inline `RUNTIME_MODE=capture VITE_RUNTIME_MODE=capture` — Linux/macOS only. Needs `cross-env` for Windows.
- `docs/capture-session.json` and `docs/capture-cache.json` are gitignored; both are writes only from the server.
