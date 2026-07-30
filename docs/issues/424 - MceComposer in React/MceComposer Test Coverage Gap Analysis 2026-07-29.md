### Scope

- Target test area: `apps/apm/www/test/js/ReactAPM/Pages/MceComposer`.
- Target implementation area: `apps/apm/www/js/ReactAPM/Pages/MceComposer`.
- Constraint followed: analysis/report only, no production or test code changes.

### Current Coverage Snapshot

Coverage is already good for several core behaviors:

- Root composer flow has strong coverage for:
  - add/update chunk error formatting,
  - regeneration progress and stale-generation replacement,
  - chunk batch loading + `React.StrictMode` fetch de-duplication,
  - route switch reload,
  - edit locking (concurrent edit + while-saving),
  - save rejection UI,
  - unload warning behavior,
  - operational-vs-bug error classification.
- `ChunksPanel` has meaningful coverage for:
  - delete confirmation/cancel,
  - moved-row highlight lifecycle,
  - check-for-updates timing and failure message path.
- `AddChunksPanel`, `EditSiglaGroup`, and `SessionPanel` each cover their primary happy paths.

### Main Gaps (Prioritized) and How to Fill


#### 2) Root `MceComposer` load/save matrix is still incomplete

Current root tests cover save rejection and save-time locking, but not full save/load outcome matrix.

Why this matters:

- Load/save lifecycle is the page’s critical reliability path.

How to fill:

- Add root tests for:
  - initial `apiMceGetData` rejection (error page content + status state),
  - chunk-fetch hard failure during initial load (transition to global error state),
  - successful save path (save error cleared, unsaved indicator reset, saved-signature update),
  - route-id invalid/undefined handling assertions (final rendered status message).

#### 3) `MainTextPanel` is effectively under-tested

`MainTextPanel.test.tsx` has only one scenario.

Why this matters:

- Rendering logic has multiple visible branches and token-type handling that can regress silently.

How to fill:

- Add tests for:
  - `edition === null` branch (`No main text to show yet`),
  - out-of-date banner with `Regenerate` button vs `Regenerating...` text,
  - paragraph split/styling via `paragraph_end.style`,
  - chunk marker rendering for mixed token sequences.

#### 4) `WitnessesPanel` integration depth is shallow

In `WitnessesPanel.test.tsx`, heavy mocks verify callback wiring but skip key in-panel edit flows.

Why this matters:

- Witness/sigla operations are cross-dependent and easy to break at UI integration points.

How to fill:

- Add tests for:
  - add/edit sigla-group modal open flow and confirm callback payload,
  - “no witnesses defined” branch,
  - pending state UI while siglum/marginal-foliation updates are in flight,
  - behavior when delete/edit callbacks are omitted.

#### 5) `SessionPanel` tests cover button visibility but miss row behavior/state markers

Current `SessionPanel` suite is mostly limited to clear-history visibility/click behavior.

Why this matters:

- Session navigation correctness depends on row click handlers and marker rendering (`current`, `saved`, `redo`).

How to fill:

- Add tests for:
  - clicking status/signature/description cells calls `onGoTo` with expected index,
  - saved marker and current marker rendering,
  - redo-row muted styling when history cursor is not at latest,
  - timestamp fallback (`—`) when `executionTimestamp` is absent,
  - refresh behavior triggered by `historyVersion` updates.

#### 6) Async failure cleanup branches in sub-panels are not consistently exercised

Several handlers rely on async callbacks and pending flags; existing tests only partially cover failure cleanup.

Why this matters:

- These are common “stuck pending” regression points.

How to fill:

- Add focused failure-path tests for:
  - `AddChunksPanel` add/load failures ensuring pending always clears,
  - `ChunksPanel` update/delete/set-break failure cleanup,
  - `WitnessesPanel` siglum/marginal callbacks that reject/throw.

### Suggested Execution Order for New Tests

1. Preview/typesetting workflow (`PreviewPanel`) and root load/save matrix.
2. `MainTextPanel` and `SessionPanel` branch coverage.
3. `WitnessesPanel` integration-depth scenarios.
4. Async failure-cleanup tests across sub-panels.

This order maximizes risk reduction first (user-visible failures + critical lifecycle), then closes medium-risk branch gaps.