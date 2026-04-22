# ADR 0004 — pnpm + exact-pinned dependencies

## Status

Accepted — 2026-04-21

## Context

A hackathon under time pressure is a bad time for a transitive-dependency update to quietly change behavior. But it's also a bad time to spend hours resolving a peer-dep conflict after an innocent `pnpm install`. The dependency set is small and well-chosen; the risk is not dependency conflict but undetected drift.

## Decision

- **Package manager**: `pnpm` (fast, content-addressable, enforced lockfile).
- **Versions**: all dependencies and devDependencies exact-pinned (no `^` or `~`) in `package.json`. The lockfile makes this belt-and-suspenders, but the redundancy is intentional — a reviewer can see the pin in `package.json` without opening the lockfile.
- **Rationale for specific pins** (see handoff §8 for the full table): Vite 5.4.x because the `vite-plugin-glsl` ecosystem was more stable there than on Vite 6 at the time of pinning; three.js `0.169.0` exact because breaking changes between minors are common; `@anthropic-ai/sdk` `0.32.1` exact because prompt-caching API semantics can shift; zod 3.x (4.x would break the schema file).

## Consequences

**Accepted:**

- Reproducible builds across `Bashar` and `Amay`'s machines
- No silent dep-tree drift during the performance week
- CI installs are deterministic

**Given up:**

- Patch-level security fixes require explicit version bumps. For a 1-week project this is fine.
