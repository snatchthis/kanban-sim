# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite dev server with HMR
npm run build       # tsc -b && vite build (type-checks the whole project, then bundles)
npm run preview     # Serve the production build locally
npm run test        # vitest run (single-shot)
npm run test:watch  # vitest in watch mode
npm run typecheck   # tsc --noEmit
```

Run a single test file: `npx vitest run src/engine/simulation.test.ts`
Run tests matching a name: `npx vitest run -t "lead time"`

Test discovery is pinned to `src/**/*.test.ts(x)` (see `vitest.config.ts`). Environment is `jsdom`.

> **Note:** `npm run lint` is defined in `package.json` but ESLint is not installed (no `eslint` dependency, no config file). Do not rely on it.

## Architecture

This is a client-only SPA that simulates Kanban flow. The architecture is deliberately **Functional Core / Imperative Shell** — treat it as the load-bearing design constraint, not a stylistic preference.

**Full architectural reference lives in `docs/ARCHITECTURE.md`** (gitignored, local-only). Read it before any non-trivial engine, projection, or controller change. The highlights:

- **`src/engine/`** is the pure functional core. `runSimulation(config)` is a deterministic `(Config, Seed) → { events, snapshots, finalState }` function. No DOM, no timers, no side effects. The whole engine must stay that way — if you find yourself reaching for `Date.now()`, `Math.random()`, or anything async inside `engine/`, stop and reconsider. Randomness comes from the seeded PRNG in `engine/random/`.
  - `simulation.ts` — main simulation loop
  - `types.ts` — all domain types (`SimulationEvent`, `BoardState`, `WorkItem`, `Snapshot`, etc.)
  - `state.ts` — immutable board state helpers
  - `event-queue.ts` — priority queue for scheduled events
  - `snapshot.ts` — snapshot creation and `reconstructState` / `reconstructStateAt`
  - `policies/` — pluggable strategy functions: `arrival.ts`, `pull.ts`, `service-time.ts`, `wip.ts`
  - `random/` — seeded PRNG (`prng.ts`) and distribution samplers (`distributions.ts`: exponential, normal, logNormal, uniform)
- **`src/projections/`** derives metrics by folding over the event stream via the `Projection<T>` interface (`{ initial, reduce }`). Each projection is a pure fold — new metrics go here as new projections, **do not** compute metrics inside the engine.
  - `lead-time.ts`, `throughput.ts`, `cfd.ts`, `aging-wip.ts`, `flow-efficiency.ts`, `littles-law.ts` — Kanban flow metrics
  - `item-catalog.ts` — maintains a `Map<string, WorkItemView>` of all items for the board UI
- **`src/worker/`** hosts the Web Worker boundary (`simulation.worker.ts` + Comlink-exposed `api.ts`). `api.ts` exposes `run()` and `runBatch()`. `monte-carlo.ts` provides `runMonteCarlo()` for Monte Carlo sweeps (currently stub percentile computation). The worker is wired into the build (`vite.config.ts` sets `worker.format: "es"`) but `useSimulation` currently calls `runSimulation` directly on the main thread — moving heavy work onto the worker is pending.
- **`src/controller/`** owns the simulation lifecycle:
  - `playback.ts` — `createPlaybackController()` drives play/pause/step/stepBackward/seekTo with configurable speed, mapping sim-time to wall-clock internally. Uses dependency-injected `now()` and `scheduleTick()` for testability.
  - `snapshot-buffer.ts` — ring buffer of snapshots for time-travel via snapshot + partial replay.
- **`src/store/`** holds Zustand stores:
  - `simulation-store.ts` — run state, result, current event index (uses `immer` middleware)
  - `config-store.ts` — board config, seed, with a `defaultBoard` preset (uses `immer` middleware)
  - `ui-store.ts` — UI-only prefs (active tab, playback speed, show metrics) — plain Zustand, no immer
  - Stores are the imperative shell — engine code must not import them.
- **`src/hooks/`** are the React adapters that bridge stores/controller to components:
  - `useSimulation` — runs simulation on main thread, computes board state from nearest snapshot
  - `useProjection` — applies any `Projection<T>` to events up to current event index
  - `usePlayback` — creates and manages a `PlaybackController`, syncs state back to stores
- **`src/utils/`** — shared utilities:
  - `url-state.ts` — config serialization via `lz-string`
  - `export.ts` — CSV (via `papaparse`) and JSON download helpers
  - `presets.ts` — board config presets (`defaultBoard`, `noWipLimits`, `bottleneck`, `highVariability`)
- **`src/components/`** — UI organized by concern:
  - `board/` — fully implemented: `Board`, `Column`, `WorkItemCard` (uses `framer-motion` for layout animations, `lucide-react` for icons)
  - `charts/`, `config/`, `controls/`, `layout/` — empty scaffolds (`.gitkeep` only)
- **`App.tsx`** — working shell with run/reset toolbar, stat strip, board view, and playback transport (step forward/back, seek to start/end).

### Key invariants

- **Determinism**: same config + same seed → identical event stream. Tests rely on this. Never introduce non-deterministic ordering (e.g. `Set` iteration on non-stable keys, unseeded random).
- **Events are the source of truth**: board state at any time is derived by replaying events. Don't add side channels that mutate state outside the event stream.
- **Strategy pattern for policies**: pull / arrival / service-time / WIP rules are pluggable functions in `engine/policies/`. Adding behavior means adding a strategy, not branching inside the process loop.
- **Snapshots are an optimization, not truth**: `engine/snapshot.ts` emits periodic immutable snapshots so the scrubber can jump in O(events-between-snapshots). If you change state shape, update snapshot + `reconstructState` together.

## Key dependencies

- **React 19** + **TypeScript** (strict mode)
- **Zustand 5** (state management, `immer` middleware for simulation/config stores)
- **framer-motion** (board layout animations)
- **lucide-react** (icons)
- **recharts** (charting — not yet used in components)
- **papaparse** (CSV export)
- **lz-string** (URL state compression)
- **seedrandom** (seeded PRNG backing `engine/random/`)
- **comlink** (Web Worker RPC — wired but not yet active)

## Conventions

- **Path alias**: `@/*` → `./src/*`. Use it — relative imports across layers are harder to read.
- **TypeScript is strict**, including `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters`. Array/record access returns `T | undefined`; handle it rather than casting.
- **State updates** in `simulation-store` and `config-store` go through Zustand `immer` middleware — write them as mutations on the draft, not spreads. `ui-store` uses plain `set()` calls.
- **No backend**. Nothing should reach for `fetch` to an owned server; config sharing is serialized into the URL via `lz-string` in `utils/url-state.ts`.

## Docs (local-only)

`docs/` is gitignored and contains `ARCHITECTURE.md`, `REQUIREMENTS.md`, `TECH_STACK.md`, and `SKILLS.md`. They are the canonical product + architecture reference for this project — consult them before big changes and keep them in sync when the design shifts.
