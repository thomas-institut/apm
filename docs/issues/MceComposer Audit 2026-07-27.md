# MCE Composer audit — 2026-07-27


## Medium-priority findings


### Asynchronous update checking and regeneration lack recovery paths

**Evidence:** `checkForChunkUpdates` (`MceComposer.tsx:669-696`) awaits a `Promise.all` without per-request or aggregate error handling. Manual regeneration (`MceComposer.tsx:703-718`) lacks `try`/`finally` and therefore leaves generation progress set when generation fails.

**Impact:** One version-info failure can reject the whole update check. A generation failure can leave a permanent progress indicator and block retries.

**Recommendation:** Handle failures per chunk where appropriate, surface a retryable error, and always clear generation pending state in `finally`.

**Required regression tests:** Reject one version-info request and one generation fetch; assert visible failure/recovery behavior and cleared progress state.


### Added witnesses can receive an undefined siglum

**Evidence:** `MceData.addChunk` uses `ctData.sigla[ctDataWitnessIndex]` directly (`MceData.ts:434, 458`), while `updateChunk` uses a `W…` fallback (`MceData.ts:285, 308`).

**Impact:** A short or misaligned source sigla array inserts `undefined` into a declared `string[]`, later breaking validation that calls string methods.

**Recommendation:** Apply the existing fallback consistently in `addChunk` and enforce the `string[]` invariant.

**Required regression test:** Add a chunk whose sigla list is shorter than its witnesses and assert a generated fallback siglum.

### Preview settings can restore a stylesheet invalid for the current language

**Evidence:** `PreviewPanel.tsx:52-94` resets a style ID on language change, then restores cached settings keyed only by edition. The cached ID may not exist in the newly selected language's stylesheet set.

**Impact:** The select can hold an invalid value and preview/PDF typesetting can fail.

**Recommendation:** Scope persisted preview settings by language, or validate cached IDs against the available styles before restoring them.

**Required regression test:** Switch languages with an incompatible cached stylesheet and assert a valid fallback is selected.

### Loading active editions fails silently

**Evidence:** `AddChunksPanel.tsx:89-98` logs an error returned by `getActiveEditions` but does not render it.

**Impact:** Users cannot distinguish a failed request from an empty/not-yet-loaded list.

**Recommendation:** Store and display an error with a clear retry action.

**Required regression test:** Return an error string and assert visible error and retry feedback.


### Pending container measurements can be permanently wrong

**Evidence:** `ComponentWithPending.tsx:38-45` measures dimensions only once because its effect depends on a stable ref object.

**Impact:** If the component mounts pending, it can permanently retain spinner dimensions instead of the loaded content dimensions.

**Recommendation:** Re-measure when pending state/content dimensions change, ideally with a resize observer where appropriate.

**Required regression test:** Mount pending, switch to larger content, and assert the wrapper updates to content dimensions.

## Lower-priority and usability findings

- `MainTextPanel.tsx:48-77` stores `chunk_end` tokens but never renders them. The unused `SignpostSplit` import suggests a missing end-of-chunk marker; confirm intended product behavior before treating this as a functional defect.
- `MceComposerSaveButton.tsx:13-34` contains a discarded `changes.join('\n')`, and active save icons lack the tooltip supplied by the disabled state.
- `MoveChunkAction.ts:27-29` constructs a move description before detecting a boundary no-op, producing misleading text such as movement to position zero.
- Several controls are clickable SVGs without button semantics, tab stops, or keyboard handlers: chunk/witness actions, preview navigation and zoom, save, and other panel controls. Keyboard-only users cannot reliably operate them.
- `EditSiglaGroup` styles its non-destructive confirm button as danger/red. This is a small UI inconsistency worth design review.
- `MceComposer.tsx:160-179` performs state updates during rendering for invalid route IDs. It is fragile and does not recover if the route becomes valid without remounting.
- The 32-bit hash used for history signatures and cache keys has a low-probability collision risk for correctness-sensitive saved-state and cached-edition identity.

## Test-suite gaps

The existing suite has meaningful unit coverage for happy-path actions and some panels, but misses important workflows and failure states.

- Root composer tests do not cover first-chunk creation, save success/error/rejection, in-flight save interactions, revert, route-ID changes, malformed IDs, chunk-load failure, Strict Mode, or editor settings behavior.
- No test covers the preview stack: `PreviewPanel`, preview page controls, zoom controls, typesetting utilities, PDF download/type-setting failure, save button, or status page.
- Existing panel tests mock several integrations, leaving real siglum editing, pending marginal-foliation updates, and dialog behavior unexercised together.
- Action tests omit update/action boundary cases, invalid group changes, stale state cleanup, missing sigla, duplicate table versions, and repeated-history paths.
- `SessionPanel` tests do not cover row navigation, saved/current indicators, timed refresh, or `historyVersion` refresh.
- There is no accessibility coverage for keyboard operation and semantic roles of interactive icon controls.

## Improvement opportunities

### Establish an editor-session module

`MceComposer` currently coordinates route parsing, loading, chunk batches, history, persistence, cache ownership, generation, and rendering. Move lifecycle and cancellation rules behind a dedicated editor-session interface that exposes explicit session states. This would make route changes, stale async results, saves, generation, and retries testable without rendering the whole page.

### Establish a chunk-identity module

Table ID, version, status, cache keys, and action targeting are represented differently across the composer, actions, and `MceData`. A single stable chunk reference with validation would prevent version ambiguity and give all dependent code one identity contract.

### Consolidate preview settings validation

Selection, storage, language compatibility, dimensions, and PDF/typesetting errors are split between effects and utilities. A validated preview-settings state/module would ensure only language-compatible stylesheet selections reach the panel and typesetter.

### Make `MceData` invariants explicit

`MceData` contains coordinated arrays for chunks, order, witnesses, sigla, marginal-foliation indexes, and groups. Place mutations behind invariant-preserving operations and test the invariants directly after every mutation. This is more durable than relying on each caller to maintain cross-array consistency.

## Suggested remediation order

1. Fix first-chunk creation, stale deletion state, hook ordering, and `em` spacing.
2. Make saving, regeneration, loading, and route transitions safe against stale asynchronous work and failures.
3. Introduce stable chunk identity and enforce editor-data invariants.
4. Add failure-path, integration, Strict Mode, and accessibility coverage before broadening the editor further.
5. Consider the module boundaries above once the critical behavior is protected by regression tests.