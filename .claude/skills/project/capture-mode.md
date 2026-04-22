---
name: capture-mode
description: Capture-mode recording and deterministic replay semantics for offline demos
---

Capture mode is first-class from Day 1. It exists so the Sunday judge demo can run without live network dependence.

**Keying.** The cache key is `phrase_hash` — SHA-256 of stable `PhraseInput` fields (see `src/llm/prompt-context.ts`; `elapsed_sec`, `state`, and `key_pressed` are excluded so identical content produces identical hashes under replay).

**Record path** (`RUNTIME_MODE=live` on the server). Every successful `/api/phrase` response writes two things:
- `docs/capture-cache.json` — keyed by `phrase_hash`, the full `PhraseResponse`.
- `docs/capture-session.json` — ordered list of `{ phrase_hash, key_pressed, timestamp_iso }` entries. `key_pressed` is the keyboard-mock key that fired the phrase.

Cache writes happen regardless of `USE_REAL_API` — mock responses are first-class capture material. Capture-mode sessions never append to the session log (they replay only).

**Replay path** (`RUNTIME_MODE=capture`, both server and client). Server refuses outbound API calls; cache-miss returns HTTP 404 with `error: 'cache_miss'`. Client boots `src/modes/capture.ts`, which first starts performance mode (attaching the window keydown listener), then fetches `/api/capture-session`, and schedules synthesised `KeyboardEvent('keydown', { key })` on `window` at the original timestamp deltas.

**Failure modes.** Cache miss in capture mode → thrown `PhraseApiError` → `FallbackController.handleFailure` → DEGRADED. HUD shows "cache miss". Next successful cached phrase recovers. The scene never freezes.

**Gitignore.** Both `docs/capture-session.json` and `docs/capture-cache.json` are gitignored; they are writes-only from the server.
