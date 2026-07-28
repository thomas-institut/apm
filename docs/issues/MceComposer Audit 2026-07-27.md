# MCE Composer audit — 2026-07-27

## Critical findings


## High-priority correctness and resilience findings

### Navigation to another MCE ID can retain the old edition

**Evidence:** The load effect in `MceComposer.tsx:184-231` only fetches data while status is `loadingMce`. Once an edition has loaded, changing the route parameter without unmounting leaves status as `loaded`, so the new ID does not initiate a fresh load.

**Impact:** The previous edition may remain visible and may be regenerated or cached under the newly selected ID.

**Recommendation:** Treat a route-ID change as a new editor session: reset load-specific state, history, caches as appropriate, and begin loading the new ID. Guard asynchronous responses against stale route sessions.

**Required regression test:** Change the mocked route parameter from one valid ID to another while the component remains mounted; assert a second fetch and the newly fetched title and chunks.

### Regeneration can publish an obsolete edition as current

**Evidence:** `MceComposer.tsx:417-434` and `703-718` suppress a new regeneration while `editionGenerationProgress` is set. If generation for state A is in progress and the user edits to B, completing A clears `editionOutOfDate` even though the current state is B.

**Impact:** The preview/main text can show a stale edition as current, with no later trigger to generate B.

**Recommendation:** Associate generation with a data signature/session token. On completion, use the result only if it matches the current signature; otherwise leave the edition marked out of date and queue or perform another generation.

**Required regression test:** Defer generation for A, mutate data to B, resolve A, and assert B is generated or the UI remains explicitly out of date.

### Rejected save promises are not handled

**Evidence:** `handleOnClickSaveButton` only handles a resolved response whose `result` is `Error`; there is no `try`/`catch`/`finally` around `apiMceSave` (`MceComposer.tsx:720-749`).

**Impact:** A network rejection leaves the UI in the saving state, produces an unhandled rejection, and provides no recovery path.

**Recommendation:** Catch rejected requests, show a user-visible error, and clear pending state in `finally` without resetting history.

**Required regression test:** Reject `apiMceSave` and assert the saving state clears, the data remains unsaved, and an error is displayed.

### Chunk identity is ambiguous when one table is included at multiple versions

**Evidence:** `MceData.addChunk` permits the same collation-table ID at different versions, but `MceData.updateChunk` (`MceData.ts:243`) and action checks identify a chunk only by `chunkEditionTableId`. The first matching chunk is selected.

**Impact:** Updating or acting on the second version can silently modify the first version instead.

**Recommendation:** Introduce a stable chunk reference that includes table ID and version, or explicitly disallow duplicate table IDs. Use that identity consistently in data methods, status tracking, actions, and UI callbacks.

**Required regression test:** Add two versions of one table, update the second, and assert only the selected version changes.

### `StateHistory.getMinimalHistory` can retain a stray target state

**Evidence:** `StateHistory.ts:101-113` pushes a matching `toSignature`, resets `currentHistory`, and then unconditionally pushes that same state into the new candidate segment.

**Impact:** With repeated signatures, the selected change path and descriptions can include an erroneous extra state. Existing tests hide the defect because they contain a shorter valid route.

**Recommendation:** Avoid the unconditional push after a completed target match, and add a repeated-signature test that makes the affected path the only candidate.

**Required regression test:** Construct a repeated-signature history whose only valid minimal path crosses the repeat and assert the returned segment starts at the requested source state without an extra leading target state.

## Medium-priority findings

### Chunk loads may be duplicated in React Strict Mode

**Evidence:** The initial MCE load effect contains an ignore cleanup guard (`MceComposer.tsx:184-231`), while the batch chunk-fetch effect (`MceComposer.tsx:235-343`) has none. Its state-based `loading` marker need not be committed before a second strict-mode effect invocation observes the old statuses.

**Impact:** Development and double-invocation scenarios can request the same chunks more than once.

**Recommendation:** Add cleanup/cancellation or request-session tracking to batch loading, and ignore results for obsolete batches.

**Required regression test:** Render in `React.StrictMode` and assert each initial chunk is fetched exactly once.

### Asynchronous update checking and regeneration lack recovery paths

**Evidence:** `checkForChunkUpdates` (`MceComposer.tsx:669-696`) awaits a `Promise.all` without per-request or aggregate error handling. Manual regeneration (`MceComposer.tsx:703-718`) lacks `try`/`finally` and therefore leaves generation progress set when generation fails.

**Impact:** One version-info failure can reject the whole update check. A generation failure can leave a permanent progress indicator and block retries.

**Recommendation:** Handle failures per chunk where appropriate, surface a retryable error, and always clear generation pending state in `finally`.

**Required regression tests:** Reject one version-info request and one generation fetch; assert visible failure/recovery behavior and cleared progress state.

### Error handlers for adding and updating chunks can throw

**Evidence:** `MceComposer.tsx:487-490` and `554-557` cast unknown rejection values to `String` and call `.toString()`. A rejection with `null` or `undefined` throws inside the catch block.

**Impact:** Instead of a meaningful failure result, the action produces an unhandled error.

**Recommendation:** Normalize unknown errors safely, for example with `String(error ?? 'Unknown error')` or a shared error-message helper.

**Required regression test:** Reject `getSingleChunkData` with `undefined` for both flows and assert a stable error result.

### Route IDs accept malformed numeric text

**Evidence:** `MceComposer.tsx:165-173` relies on `parseInt`, accepting values such as `12junk`, `1.5`, and `1e2` as valid IDs.

**Impact:** Malformed routes can load an unintended edition instead of reporting invalid input.

**Recommendation:** Require the complete route value to be a positive safe integer, for example by validating the full string before converting it.

**Required regression test:** Assert malformed numeric-looking IDs show the invalid-ID status and make no API request.

### Single-chunk edition-cache keys can collide

**Evidence:** `MceComposer.tsx:367-373` derives its marginal-foliation part with `.join('')`. Index arrays `[1, 23]` and `[12, 3]` both produce `123`.

**Impact:** A generated single-chunk edition may be reused for a different marginal-foliation selection.

**Recommendation:** Serialize the index array unambiguously, for example with `JSON.stringify` or a delimiter not valid in numeric indexes.

**Required regression test:** Generate/cache both selections and assert distinct keys and results.

### Added witnesses can receive an undefined siglum

**Evidence:** `MceData.addChunk` uses `ctData.sigla[ctDataWitnessIndex]` directly (`MceData.ts:434, 458`), while `updateChunk` uses a `W…` fallback (`MceData.ts:285, 308`).

**Impact:** A short or misaligned source sigla array inserts `undefined` into a declared `string[]`, later breaking validation that calls string methods.

**Recommendation:** Apply the existing fallback consistently in `addChunk` and enforce the `string[]` invariant.

**Required regression test:** Add a chunk whose sigla list is shorter than its witnesses and assert a generated fallback siglum.

### Siglum uniqueness is inconsistently enforced

**Evidence:** Group validation rejects a group siglum that collides with a witness, but `setSiglum` does not reject a witness collision with another witness or a group.

**Impact:** The generated apparatus can contain ambiguous sigla.

**Recommendation:** Decide and document the intended uniqueness invariant, then enforce it uniformly in witness creation, witness editing, and group editing.

**Required regression test:** Attempt witness-to-witness and witness-to-group collisions through actions/UI and assert the chosen invariant.

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

### `MultiToggle` crashes for empty options

**Evidence:** `MultiToggle.tsx:20-24` evaluates `options[0].key` before checking `options.length === 0`.

**Impact:** Any caller that reaches an empty-options state without explicitly passing `selected` crashes.

**Recommendation:** Return early before deriving a default selection.

**Required regression test:** Render `<MultiToggle options={[]} />` and assert it safely renders no UI.

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