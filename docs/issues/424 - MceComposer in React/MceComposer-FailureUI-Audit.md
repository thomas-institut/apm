### Scope

- Target: `../../../apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx` and related MceComposer sub-components.
- Goal: identify failure-reporting UX gaps, misclassified failures (especially “bug” vs expected operational failures), and places where actions should be prevented when failure is predictable.
- Constraint followed: no production code changes; audit report only.

### Executive Summary

- The composer already handles some failures with visible feedback (notably save errors, add-chunk errors, and PDF-generation failure), but coverage is inconsistent.
- Several user actions can fail with no direct visual feedback in the triggering panel (silent no-op or indirect feedback only).
- Some failures that are likely operational (network/server/timeouts/permission/data drift) are framed as “bug found” or “this may be a bug”, which can mislead users and inflate bug reports.
- Multiple async handlers in sub-panels do not protect pending-state cleanup with `try/finally`; when parent callbacks throw, UI can remain stuck in pending state.
- A few actions are UI-disabled only visually (CSS class) but still clickable; they rely on parent guards and can fail silently instead of being fully non-executable.

### Findings





#### 7) Preview refresh failure has no user-visible error message

- Evidence:
  - `handleClickOnRefresh` awaits `doTypeset()` and always flips `previewUpToDate` true at end; no `catch` branch.
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:131-142`
  - `doTypeset()` can fail during font loading/typesetting calls.
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:103-129`
- Why this is a problem:
  - User gets no explicit refresh failure reason and may see contradictory state transitions.
- Impact:
  - Low diagnosability, repeated retries.

#### 8) PDF failure feedback is present but too generic

- Evidence:
  - Download flow catches errors and sets `setPdfDownloadError('Error')`.
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:171-174`
  - UI message shown is fixed: “PDF generation failed”.
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:207-209`
- Why this is a problem:
  - Server-provided reason is discarded, reducing supportability.
- Impact:
  - Hard to distinguish transient network failures from server validation/runtime failures.

#### 9) Save button component has inconsistent local saving state behavior

- Evidence:
  - In `MceComposerSaveButton`, click handler sets local `saving` to `false`, awaits save callback, then sets it to `true`:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposerSaveButton.tsx:18-26`
  - Popover `show={saving}` uses this local state:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposerSaveButton.tsx:30`
- Why this matters for failure UX:
  - Local state naming/flow is inverted and can make save-feedback timing non-obvious; feedback correctness relies mostly on parent `saveError` and parent pending wrapper.
- Impact:
  - Increased risk of confusing save affordance behavior.

#### 10) Some controls are visually disabled but still clickable (rely on parent guard)

- Evidence:
  - Undo/redo icons get `'disabled'` class but still have active onClick handlers:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:1269-1288`
  - Revert icon similarly toggles class yet still calls handler:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:1293-1295`
  - Chunk move arrows similarly rely on CSS class while click remains wired:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel.tsx:330-353`
- Why this is a problem:
  - “Disabled-looking” controls should typically be non-interactive or explicitly explain why unavailable.
- Impact:
  - Perceived broken buttons / silent clicks.

### Positive Patterns Already Present

- Save flow surfaces backend and thrown errors to user (`saveError`):
  - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:988-1022`
- Add-chunk flow returns user-readable errors and displays them:
  - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:627-677`
  - `apps/apm/www/js/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel.tsx:73-79`, `:155`
- PDF flow at least indicates failure state in UI:
  - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:171-174`, `:207-209`

### Recommendations

#### A) Introduce failure taxonomy and consistent messaging

- Distinguish at least:
  - `operational` (network, timeout, upstream unavailable)
  - `validation/user-action` (invalid input, unavailable operation)
  - `conflict/state` (stale version/edit lock)
  - `unexpected/internal` (true bug/invariant break)
- Only show bug-report CTA for `unexpected/internal` class.
- Replace “This may be a bug” default copy on generic error pages with neutral recovery text plus technical detail.

#### B) Add explicit “action blocked” feedback

- When guard conditions block action (`saving`, `edit in progress`, not loaded), show immediate inline/toast message (or shared toolbar notice), not console-only.
- Prefer disabling controls semantically (e.g., button disabled behavior) when preconditions fail, and provide tooltip reason.

#### C) Make async UI handlers exception-safe

- Wrap sub-panel async handlers in `try/catch/finally`:
  - always clear pending in `finally`
  - show contextual error message in `catch`
- Apply to:
  - `ChunksPanel` delete/update/move/set-break/check-updates
  - `AddChunksPanel` add/load
  - `PreviewPanel` refresh/download

#### D) Surface chunk load and update-check errors where they occur

- In `ChunksPanel`, show `ctDataStatus.errorMsg` when `ctDataState === 'error'` instead of generic `${state}...`.
- In `checkForChunkUpdates`, expose fetch failures to UI and keep prior data visible.

#### E) Improve detail level of existing error feedback

- PDF failures: show sanitized server/network reason (not just “Error”).
- Preview refresh failures: show clear message and keep “Out of date” state coherent.

#### F) Normalize action return contracts

- Current callbacks mix `boolean`, `true|string`, thrown exceptions, and side-channel bug flags.
- Standardize to one pattern (e.g., discriminated result object) so child panels can always render meaningful feedback consistently.

### Suggested Prioritization

1. **High**: exception-safe pending cleanup (`try/finally`) in all async handlers to prevent stuck UI.
2. **High**: stop classifying most failures as bugs by default (global pages + `reportActionBug` usage policy).
3. **High**: add immediate user feedback for blocked/no-op actions.
4. **Medium**: show concrete chunk and update-check failure reasons in `ChunksPanel`.
5. **Medium**: improve PDF/preview error detail quality.
6. **Medium**: unify callback result contracts across panels.

### Notes

- This audit is intentionally static/read-only and based on current code inspection.
- No code changes were made.