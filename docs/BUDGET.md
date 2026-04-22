# Budget

Token math and dollar estimates for `claude-opus-4-7` under this project's usage pattern. Numbers are targets before real measurement (Day 2–3).

## Per-phrase token math

| Block | Tokens | Notes |
|---|---|---|
| System prefix (cached) | ~3,500 | Thesis + vocabulary + examples + wrongness strategies |
| Per-phrase user turn | ~300 | Serialized `PhraseInput` JSON |
| Structured response (tool_use) | ~250 | `short_semantic` + `full_reinterpretation` |
| Adaptive thinking (variable) | ~500 | Average at effort=medium; not displayed (default `omitted` on Opus 4.7) |

Re-baseline with `client.messages.count_tokens()` against `claude-opus-4-7` once `prompts/system.md` and `prompts/examples.md` are filled in — Opus 4.7 counts tokens slightly differently than 4.6, so assume ~10–15 % headroom on the prefix.

## Opus 4.7 pricing

- Input: $5 / 1 M tokens
- Output: $25 / 1 M tokens
- Cache write: 1.25 × input = $6.25 / 1 M tokens
- Cache read: 0.1 × input = $0.50 / 1 M tokens

## Per-phrase cost (warm cache)

| Component | Tokens | Rate | Cost |
|---|---|---|---|
| Cache read (prefix) | 3,500 | $0.50 / 1 M | $0.00175 |
| User turn (uncached input) | 300 | $5 / 1 M | $0.00150 |
| Response output | 250 | $25 / 1 M | $0.00625 |
| Thinking (output tokens) | 500 | $25 / 1 M | $0.01250 |
| **Total per phrase (warm)** | | | **≈ $0.022** |

First phrase (cold cache): +$0.022 one-time write premium for the prefix (3,500 × $6.25/1M) — so roughly $0.044 on the first phrase, then ~$0.022 on every phrase after, for the 5-minute TTL window.

## Target cache hit ratio

≥ 80 % of prefix tokens served from cache after the first warm phrase. The per-phrase user input is deliberately **not** cached (volatile content in `messages`, not `system`, per prompt-caching best practices — see `docs/prompt-caching.md`).

Silent invalidators to watch for:
- Any `datetime.now()` interpolated into the system prompt
- Non-deterministic key ordering in serialized session memory
- Adding/removing the `emit_phrase_response` tool mid-session (tools render at position 0; changing them invalidates the entire cache)

`buildContext()` is pure and deterministic on stable fields by design; the server's `JSON.stringify` on `PhraseInput` is fine for user-turn purposes because the user turn is never cached.

## Hackathon allocation

- Credit allocated: $563
- Estimated spend at 40 phrases × $0.022 = $0.88 per full demo
- 20 rehearsals + judge demo = ~$20 total
- Comfortable margin; the structured hot path is cheap

## Cold-path caveats

- Cache writes cost 1.25× input; the prefix is ~$0.022 per cold write
- 5-minute TTL means a long pause between rehearsals incurs another cold write. The cost is small; the latency cost (recomputing the cached prefix) is the more interesting variable.
