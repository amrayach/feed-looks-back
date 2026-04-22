# ADR 0003 — Buffered `messages.create` on Day 1; streaming deferred

## Status

Accepted — 2026-04-21

## Context

Streaming Anthropic responses would let us begin applying the `uniform_patch` before the response is fully received — the short, high-signal text fields could land milliseconds before the tail. Over a performance, that could meaningfully reduce perceived latency.

But streaming complicates:

- Partial-JSON repair and validation (we'd need to accumulate, retry, buffer)
- DEGRADED transition logic (half a valid response is still invalid)
- Prompt-cache verification (usage fields arrive at stream end)
- Server-side cache writes (only the full response is the cache value)

On Day 1 none of these complications pay off: the budget is already comfortable on a buffered path with adaptive thinking and effort=medium.

## Decision

Day 1 uses the non-streaming `client.messages.create()` call path. The server waits for the full response, validates, caches, and responds to the client. Streaming is a Day 3+ candidate enhancement, gated on measured latency pressure.

## Consequences

**Accepted:**

- Single, obvious validation point (response received → zod parse → cache)
- Simple DEGRADED transition
- No partial-state bugs to debug at hackathon tempo

**Given up:**

- Some latency that streaming could shave off. Worth it for implementation simplicity this week. Revisit if phrase-to-scene latency becomes the constraint.
