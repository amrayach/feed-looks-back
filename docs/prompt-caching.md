# Prompt Caching

One-page reference for the real Anthropic path in `server/anthropic-adapter.ts`.

## What is cached

The real path builds the `system` prompt as four static text blocks loaded from disk in a fixed order:

1. `prompts/system.md`
2. `prompts/mutation-vocabulary.md`
3. `prompts/examples.md`
4. `prompts/wrongness-strategies.md`

The fourth and final static block carries `cache_control: { type: 'ephemeral' }`. That placement is intentional: it marks the end of the cacheable prefix while keeping the entire static scaffold in the cached region.

## What is not cached

Per-phrase runtime input is serialized into the `messages` array and stays uncached by design. The phrase payload changes every turn, so caching it would not help and would create accidental invalidators.

## TTL and expected behavior

- Anthropic prompt caching is expected to stay warm for roughly 5 minutes.
- First phrase after a cold start pays the cache-write cost.
- Subsequent phrases should read the cached prefix and only pay full price for the dynamic user turn plus response.

## Known cache invalidators

- Reordering the four prompt files in the `system` array
- Changing the `emit_phrase_response` tool schema mid-session
- Injecting non-deterministic content into the cached prefix
- Editing any of the static prompt files between warm requests
