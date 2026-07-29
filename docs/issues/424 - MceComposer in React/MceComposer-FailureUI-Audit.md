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

#### 1) Global error pages over-classify failures as bugs

- Evidence:
  - Route and load error pages always include “This may be a bug, please report it.”
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:1153-1167`
- Why this is a problem:
  - Route parse errors, invalid IDs, chunk fetch failures, and transport/server failures are not necessarily software defects.
  - This encourages incorrect bug filing and reduces diagnostic quality.
- Impact:
  - User confusion; noisy issue tracker; harder triage.

#### 2) Action exceptions are funneled into a “bug found” channel too aggressively

- Evidence:
  - `reportActionBug` sets `foundBug=true` and a bug description for action failures:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:559-563`
  - Many action handlers call `reportActionBug(...)` when `history.do(...)` throws:
    - delete/move/break/siglum/group/title/update/add paths around `:588-855`.
  - Bug UI explicitly asks user to report software bug on GitHub:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:1249-1298`
- Why this is a problem:
  - Not all thrown failures here are guaranteed product defects (e.g., stale state, remote fetch dependency errors, invariant mismatches from external data).
- Impact:
  - “Everything is a bug” anti-pattern; poor failure taxonomy.

#### 3) Guarded actions can silently no-op with no immediate user feedback

- Evidence:
  - Edit lock guard returns only booleans/strings (`startMceDataEdit`, `isMceDataEditBlocked`, `getMceDataEditError`) and many callers just return:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:565-586`
  - Silent early-return examples:
    - Revert: `:875-886`
    - Session go-to / clear-history callback guards: `:1131-1147`
    - Undo/redo onClick guard returns: `:1269-1288`
    - Save button click guard only warns in console: `:990-993`
- Why this is a problem:
  - User clicks can appear ignored when saving/editing is in progress.
- Impact:
  - Poor UX trust; users retry actions unnecessarily.

#### 4) Chunk load errors are stored but rendered as generic status text

- Evidence:
  - Chunk fetch failures populate `CtDataStatus.errorMsg` and state `'error'`:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:364-436`
  - In `ChunksPanel`, non-`loaded` state is shown as warning text `${ctDataState}...`, not explicit error details:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel.tsx:164-167`
  - `errorMsg` from status is not shown in chunk row message branch.
- Why this is a problem:
  - Users lose actionable detail (network/server/version mismatch message).
- Impact:
  - Harder recovery and support.

#### 5) `checkForChunkUpdates` failure path has no UI feedback and can leave pending state stuck

- Evidence:
  - Parent function has no `try/catch`; errors from `collationTableVersionInfo` bubble:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/MceComposer.tsx:888-915`
  - Child handler sets pending true, awaits callback, then clears pending only on success:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel.tsx:255-263`
- Why this is a problem:
  - On throw, `checkingForUpdates` may remain `true`; user gets spinner without clear failure message.
- Impact:
  - Potential “stuck loading” perception.

#### 6) Several sub-panel async handlers do not `try/finally` pending cleanup

- Evidence:
  - `ChunksPanel`: update/delete/set-break handlers set pending, await callback, clear pending afterward without catch/finally:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel.tsx:193-223`, `:242-253`
  - `AddChunksPanel`: similar pattern for `onClickAddButton` and `onClickLoadEditions`:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel.tsx:60-80`, `:90-102`
  - `PreviewPanel`: refresh/download handlers set pending and clear afterward, but refresh path has no catch:
    - `apps/apm/www/js/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel.tsx:131-142`, `:160-176`
- Why this is a problem:
  - Thrown callback/operation errors can bypass cleanup and leave UI in pending mode.
- Impact:
  - Stale spinner, blocked controls, missing terminal error state.

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