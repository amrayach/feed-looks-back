---
name: latency-budget
description: Per-stage latency instrumentation and target budgets for the per-phrase hot path
---

Day 1 target: ≤ 2 s from phrase boundary to visible scene mutation. Three measured stages:

1. **Boundary → server receive** (browser → Express). Target ≤ 80 ms on a local host. Measured by `Date.now()` on the client at dispatch vs. `Date.now()` on the server at `app.post('/api/phrase')` entry; diff logged per request.
2. **Server receive → server respond** (adapter). Target ≤ 1200 ms. Measured by `adapterStart`/`adapterEnd` around `callOpus(input)` in `server/index.ts`. On mock, ~5 ms. On real, Opus 4.7 adaptive + effort=medium on warm prompt cache.
3. **Server respond → scene visible** (browser). Target ≤ 400 ms. Measured from fetch resolution to the end of the `smoothing_ms` lerp. This is the `UniformMutator` window.

Logging convention: a single `[phrase]` line per request, written to stderr with fields `idx`, `maqam`, `hash`, `shader`, `label`, `total`, `(tag)` — see `server/index.ts:logPhrase()`. Client-side stage times go to `console.info` with the `[perf]` tag, one line per phrase, same pipe. Do not introduce a second logger.

Budget discipline: if a stage exceeds target, the fix is in the code path, not in raising the budget. The `≤ 2 s` end-to-end is load-bearing on the piece's legibility — pausing too long breaks the rhythmic link between phrase and response.
