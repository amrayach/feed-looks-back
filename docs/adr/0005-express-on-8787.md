# ADR 0005 — Local Express server on port 8787

## Status

Accepted — 2026-04-21

## Context

We need a local server process to:

- Hold `ANTHROPIC_API_KEY` (never ship to the client — the browser must not see the key)
- Route `POST /api/phrase` through the adapter (mock or real)
- Own the persistent phrase-hash cache and the capture-session log
- Serve a health endpoint so the client can verify its environment

Node's built-in `http` module is the minimum viable; Express is the minimum ergonomic.

Port 3000 is the obvious default but collides with React DevTools, Next.js default, and a dozen other common tools developers will already have running during a hackathon.

## Decision

- **Framework**: Express 4.21.x.
- **Port**: 8787 (Vite's proxy in `vite.config.ts` forwards `/api/*` to `http://localhost:8787`).
- **Responsibilities**: key custody, adapter routing, cache, health, capture-session log I/O. No rendering logic, no prompt authoring logic, no audio logic.

## Consequences

**Accepted:**

- The key never leaves the local process. The browser calls only `/api/*`; the server owns the SDK.
- Port collisions with other dev servers are unlikely
- Cache and capture-session files live next to the server, not shipped to the client bundle
- A clean boundary between "things that run in the browser" and "things that hold secrets or own durable state"

**Given up:**

- One more process to manage. `concurrently` in the `dev` script handles this.
