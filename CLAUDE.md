# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite dev server with HMR
npm run build       # tsc -b && vite build (type-checks the whole project, then bundles)
npm run preview     # Serve the production build locally
npm run test        # vitest run (single-shot)
npm run test:watch  # vitest in watch mode
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
```

Run a single test file: `npx vitest run src/engine/simulation.test.ts`
Run tests matching a name: `npx vitest run -t "lead time"`

Test discovery is pinned to `src/**/*.test.ts(x)` (see `vitest.config.ts`). Environment is `jsdom`.

## Architecture

This is a client-only SPA that simulates Kanban flow. The architecture is deliberately **Functional Core / Imperative Shell** — treat it as the load-bearing design constraint, not a stylistic preference.

**Full architectural reference lives in `docs/ARCHITECTURE.md`** (gitignored, local-only). Read it before any non-trivial engine, projection, or controller change. The highlights:

- **`src/engine/`** is the pure functional core. `runSimulation(config)` is a deterministic `(Config, Seed) → { events, snapshots, finalState }` function. No DOM, no timers, no side effects. The whole engine must stay that way — if you find yourself reaching for `Date.now()`, `Math.random()`, or anything async inside `engine/`, stop and reconsider. Randomness comes from the seeded PRNG in `engine/random/`.
- **`src/projections/`** derives metrics (lead time, throughput, CFD, aging WIP, flow efficiency, Little's Law) by folding over the event stream. New metrics go here as new projections — **do not** compute metrics inside the engine.
- **`src/worker/`** hosts the Web Worker boundary (`simulation.worker.ts` + Comlink-exposed `api.ts`). Two intended modes: streaming (per-event emission for animated playback) and batch (Monte Carlo / sweeps). The worker is wired into the build (`vite.config.ts` sets `worker.format: "es"`) but `useSimulation` currently calls `runSimulation` directly on the main thread — moving heavy work onto the worker is pending.
- **`src/controller/`** owns the simulation lifecycle: `scheduler.ts` maps virtual sim-time to wall-clock, `playback.ts` drives play/pause/step/scrub, `snapshot-buffer.ts` supports time-travel via snapshot + partial replay.
- **`src/store/`** holds Zustand stores (with `immer` middleware): `simulation-store` (run state + current event index), `config-store` (board config + seed), `ui-store` (UI-only prefs). Stores are the imperative shell — engine code must not import them.
- **`src/hooks/`** are the React adapters (`useSimulation`, `useProjection`, `usePlayback`) that bridge stores/controller to components.
- **`src/components/{board,charts,config,controls,layout}/`** is where UI lives. Most of these are empty scaffolds right now — `App.tsx` is a minimal placeholder.

### Key invariants

- **Determinism**: same config + same seed → identical event stream. Tests rely on this. Never introduce non-deterministic ordering (e.g. `Set` iteration on non-stable keys, unseeded random).
- **Events are the source of truth**: board state at any time is derived by replaying events. Don't add side channels that mutate state outside the event stream.
- **Strategy pattern for policies**: pull / arrival / service-time / WIP rules are pluggable functions in `engine/policies/`. Adding behavior means adding a strategy, not branching inside the process loop.
- **Snapshots are an optimization, not truth**: `engine/snapshot.ts` emits periodic immutable snapshots so the scrubber can jump in O(events-between-snapshots). If you change state shape, update snapshot + `reconstructState` together.

## Conventions

- **Path alias**: `@/*` → `./src/*`. Use it — relative imports across layers are harder to read.
- **TypeScript is strict**, including `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters`. Array/record access returns `T | undefined`; handle it rather than casting.
- **State updates** go through Zustand `immer` middleware — write them as mutations on the draft, not spreads.
- **No backend**. Nothing should reach for `fetch` to an owned server; config sharing is serialized into the URL via `lz-string` in `utils/url-state.ts`.

## Docs (local-only)

`docs/` is gitignored and contains `ARCHITECTURE.md`, `REQUIREMENTS.md`, `TECH_STACK.md`, and `SKILLS.md`. They are the canonical product + architecture reference for this project — consult them before big changes and keep them in sync when the design shifts.
