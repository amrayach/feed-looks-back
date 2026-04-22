# Architecture

## Signal chain

```
  guitarist ──► microphone ──► AudioContext ──► feature extraction ──► phrase detector
                                                                          │
                                                                          ▼
                                                        [PHRASE BOUNDARY EVENT]
                                                                          │
                                                                          ▼
                                           browser: buildContext() → SHA-256 hash
                                                                          │
                                                            POST /api/phrase
                                                                          ▼
                                                   server: zod validate input
                                                                          │
                                                        cache hit? ──yes──┐
                                                              │no         │
                                                              ▼           │
                                                   adapter.callOpus()     │
                                                 (mock OR Anthropic SDK)  │
                                                              │           │
                                                              ▼           │
                                                   zod validate output ◄──┘
                                                              │
                                                              ▼
                                                       cache + session log
                                                              │
                                                      HTTP 200 JSON
                                                              │
                                                              ▼
                                   browser: HUD update → MUTATING → TRANSITIONING
                                                              │
                                                              ▼
                                    swap ShaderMaterial? update uniform_patch?
                                                              │
                                                              ▼
                                          400ms lerp (UniformMutator.update)
                                                              │
                                                              ▼
                                                     TRANSITIONING → IDLE
                                                              │
                                                              ▼
                                                    update SemanticHud DOM
```

On any failure (network, zod, SDK, timeout) the machine goes `→ DEGRADED`. The renderer keeps animating from last-valid uniforms. The HUD shows a holding message. The next successful validated phrase transitions `DEGRADED → LISTENING`.

## Three-layer timing budget

| Layer | Owner | Day 1 target | Notes |
|---|---|---|---|
| Phrase boundary → server receive | Browser → Express | ≤ 80 ms | Local network; HTTP keep-alive |
| Server receive → server respond | Server adapter | ≤ 1200 ms | Mock: ~5ms. Real: Opus 4.7 adaptive + effort=medium on warm cache |
| Server respond → scene visible | Browser | ≤ 400 ms | Uniform lerp window |
| **Total phrase → scene** | | **≤ 1680 ms** | Leaves ~320 ms headroom under the 2 s budget |

Cache hit shortcut: if the phrase hash matches an existing cache entry, the server skips the adapter entirely and responds in ~5–20 ms.

## State machine

```
              IDLE ──phrase_boundary──► LISTENING ◄──────────────────────┐
                                         │                                │
                             response_valid_short                         │
                                         │                                │
                                         ▼                                │
                                      MUTATING                            │
                                         │                                │
                              response_valid_full                         │
                                         │                                │
                                         ▼                                │
                                   TRANSITIONING                         │
                                         │                                │
                               smoothing_complete                         │
                                         │                                │
                                         ▼                                │
                                        IDLE                              │
                                                                          │
                                   failure (any state)                    │
                                           │                              │
                                           ▼                              │
                                       DEGRADED ──response_valid_short────┘
```

`escalation_level` is monotonically non-decreasing across a session, enforced in `src/state/session.ts` (not in the schema).

## Responsibility split

| Concern | Browser | Server |
|---|---|---|
| Audio capture + phrase detection (Day 2+) | ✅ | |
| Keyboard mock (Day 1) | ✅ | |
| Scene rendering (Three.js) | ✅ | |
| Uniform mutation lerp | ✅ | |
| HUD DOM | ✅ | |
| State machine | ✅ | |
| Session memory | ✅ | |
| `buildContext()` + phrase_hash | ✅ | |
| zod validation of input before network | ✅ | |
| `ANTHROPIC_API_KEY` custody | | ✅ |
| Anthropic SDK calls | | ✅ |
| Mock adapter path | | ✅ |
| Phrase-hash cache (persistent) | | ✅ |
| Capture-session log | | ✅ |
| zod validation of response | | ✅ |
| Structured logging | | ✅ |

## File entry points

- `server/index.ts` — Express app, port 8787
- `src/main.ts` — Vite client entry, picks mode from runtime_mode
- `src/modes/performance.ts` — live mode bootstrap
- `src/modes/capture.ts` — capture replay mode
- `shared/schemas.ts` — single source of truth for all contracts
