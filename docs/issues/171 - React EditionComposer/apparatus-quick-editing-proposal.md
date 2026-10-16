# Apparatus Quick Editing in the React EditionComposer — Proposal

Status: proposal, revision 4 (incorporates the phase-1 benchmark results, see §6.1; revision 3 incorporated the
answers to the open questions of revisions 1 and 2, see §10)
Scope: `ReactAPM/Pages/EditionComposer/ApparatusPanel/*`, `SubEntry.tsx`, `MainTextPanel/*`, `EditionComposer.tsx`,
`Edition/EditionGenerator/CtDataEditionGenerator.ts`, `toolbox/Memoizer.ts`, `ReactAPM/ToolBox/StateHistory`.

Language-specific rendering of apparatus entries is out of scope; the proposal only assumes that the viewer
will keep rendering entries / sub-entries as separate components.

---

## 1. Goals

Provide abbreviated UI flows for the most frequent apparatus edits, as an alternative to the full entry
editor of the vanilla `EditionComposer/ApparatusPanel.ts`:

1. **Enable / disable a sub-entry**: a toggle icon shown when hovering a sub-entry.
2. **Add a one-word variant / omission / addition**: a `+` icon shown when hovering the last sub-entry of
   an entry; clicking opens a compact inline form (type dropdown, small text input, witness selector).
3. **Reorder sub-entries**: backward / forward arrows shown when hovering a sub-entry.
4. **Add a variant / omission / addition from the main text**: the same compact form, opened from a
   token selection in the `MainTextPanel` (apparatus mode), targeting a chosen apparatus or the currently
   visible one. This is offered **in addition to** the vanilla flow (select text → choose apparatus → full
   entry editor in the corresponding panel), which is kept.

Identical sub-entries are rejected: a quick add never creates a sub-entry equal to one already in the entry
(§5.2).

The only sub-entry types are `variant`, `omission` and `addition` (there is no "deletion").

Each of these actions must feel instantaneous (target: < 50 ms from click to updated apparatus) even
for large editions, and must go through the existing undo/redo `StateHistory`.

---

## 2. Analysis of the current code

### 2.1 Vanilla `ApparatusPanel.ts` (1846 lines)

- Double click on a lemma → `_loadEntryIntoEntryForm()` → `buildEntryToEdit()` clones the
  `ApparatusEntry` from the current `Edition` and stores the collation table (CT) range in
  `entry.metadata.ctGroup` (taken from the generated entry, or recomputed with
  `CtData.getCtIndexForEditionWitnessTokenIndex()`).
- The form edits a working copy (`editedEntry`): enable checkbox per sub-entry, move up/down
  (`genOnClickMoveUpDownButton`, which rewrites `position = i` for all sub-entries), add/delete custom
  sub-entry (`addNewCustomSubEntry`, new sub-entry gets `position = subEntries.length`), text editor,
  witness data editor, keyword toggle, lemma/pre-lemma/post-lemma/separator, tags.
- On "Update" (`genOnClickUpdateApparatusButton`) the **whole entry** is converted to a
  `CustomApparatusEntryInterface`:
  - auto sub-entries → `{type: 'auto', hash: subEntry.hashString(), enabled, position, tags}`
  - user sub-entries → `{type: 'fullCustom', fmtText, witnessData, keyword, enabled, position, tags}`
  and written with `CtData.updateCustomApparatuses(ctData, apparatusType, entry)`, which replaces (or
  adds, or removes if equal to default) the custom entry identified by `from-to` CT columns.
  Then `onCtDataChange(ctData)` triggers a full edition regeneration in the composer.

Key takeaway: **the only write primitive is "replace the custom entry for CT range X in apparatus T"**.
Automatic sub-entries are identified by their hash, full custom sub-entries have no identity other than
their place in the custom entry. Ordering is expressed through `position` on *every* sub-entry.
Any quick action can therefore be expressed as: *take the displayed `ApparatusEntry`, transform it, convert
it back to a custom entry, call `updateCustomApparatuses`.* This keeps CtData semantics 100% compatible
with the vanilla editor.

Minor issues spotted while reading (worth fixing when the code is extracted):
- `buildEntryToEdit()`: when `to === -1`, `ctIndexTo` is taken from `metadata.ctGroup.from` instead of
  `.to`.
- Entries created from custom-only entries in `CtDataEditionGenerator.mergeCustomApparatusEntries()` and
  `getCustomApparatuses()` do **not** get `metadata.ctGroup`, so the CT range must be recomputed from the
  main text. The generator should always stamp `metadata.ctGroup` (it has the CT `from`/`to` at hand).

### 2.2 React `ApparatusPanel.tsx` / `ApparatusViewer.tsx` / `SubEntry.tsx`

- `ApparatusPanel` only adds a toolbar (line-number toggle) and delegates to `ApparatusViewer`.
- `ApparatusViewer` groups entries by line/CT range on every render and computes
  `apparatus.entries.indexOf(entry)` inside the loop (O(n²) per render). Keys are array indices.
  It supports hover (→ main text highlight) and lemma selection; no editing.
- `SubEntry` is a pure renderer (keyword, `FmtTextRenderer`, sigla); disabled sub-entries already get a
  `disabled` class.
- Nothing is memoized (`React.memo`, `useMemo`), so any composer state change (including hovering!)
  re-renders the full apparatus.

### 2.3 Data flow in `EditionComposer.tsx`

```
user action ─► runHistoryAction(action)
                 ├─ action.execute(state): deepCopy(state) + CtData mutation        O(|ctData|)
                 ├─ StateHistory.do(): hashString(JSON.stringify(state))            O(|ctData|)
                 └─ setDisplayedHistoryState(state)
                       └─ new CtDataEditionGenerator({ctData}).generateEdition()    full
                             ├─ generateMainText(baseWitnessTokens)
                             ├─ CriticalApparatusGenerator.generateCriticalApparatusFromCtData()
                             ├─ calcCtIndexToMainTextMap()
                             ├─ mergeCustomApparatusEntries(CRITICUS …)   (mutates generated app!)
                             ├─ MarginalFoliationGenerator.generateMarginaliaApparatus()
                             ├─ mergeCustomApparatusEntries(MARGINALIA …)
                             ├─ getCustomApparatuses()
                             └─ sortEntries + orderSubEntries for every apparatus
               ─► React re-renders MainTextPanel, every ApparatusPanel, PreviewPanel …
```

So there are **three** cost centres for a tiny sub-entry change, not one:

1. **Edition generation** – the critical apparatus generator walks every column group of the collation
   table, every witness; this is the dominant cost for large editions.
2. **State copying and signing** – `deepCopy` (JSON round trip) and `JSON.stringify` + FNV hash of the whole
   CtData (witness tokens, full-tx items, …) per action. For big tables this is several MB of string
   work per click.
3. **React re-rendering** – a brand new `Edition` object means every panel re-renders everything.

Also, `runHistoryAction` ignores calls while another action is in progress, so rapid clicks (e.g. pressing
the move arrow three times) are silently dropped if the pipeline is slow.

Fixing only (1) will not be enough; the proposal addresses all three.

The phase-1 measurements (§6.1) quantify these cost centres: the automatic critical apparatus accounts for
about 90% of edition generation, and `deepCopy` + signature together cost as much as generation for a
medium edition and more than it for a large one (~365 ms vs ~300 ms at 24 MB).

---

## 3. Proposal overview

| Layer | Change |
|---|---|
| Domain operations | Pure functions for quick edits on top of a shared `ApparatusEntry ⇄ CustomApparatusEntry` converter (extracted from the vanilla panel). |
| History actions | Small `StateTransformAction`s wrapping those operations, using **structural sharing** instead of `deepCopy`. |
| Edition generation | A staged, memoized `IncrementalCtDataEditionGenerator` that reuses main text and automatic apparatuses when only `customApparatuses` changed, and reuses unchanged entries/apparatuses by reference. |
| History signature | Per-slice cached hashes (WeakMap keyed by object reference) instead of hashing the full state. |
| React | `React.memo` components per entry and sub-entry relying on stable object identity; hover controls in CSS. |

The pieces can be delivered incrementally (see §8). The UI and domain layers work on top of the full
generator; the three performance reductions (structural sharing, incremental generation, slice-hashed
signatures) are only expected to meet the target together (§6.1), so they form a single milestone.

---

## 4. UI design

### 4.1 Component structure (one component per file)

```
ApparatusPanel.tsx            (existing; gets canEdit + onApparatusEdit callbacks)
└─ ApparatusViewer.tsx        (existing; computes ranges with useMemo)
   └─ ApparatusEntryView.tsx  (new, React.memo) lemma + sub-entries of one entry
      ├─ SubEntry.tsx         (existing renderer, unchanged API)
      ├─ SubEntryQuickControls.tsx (new) toggle / backward / forward icons
      ├─ AddSubEntryButton.tsx     (new) "+" icon
      └─ QuickSubEntryForm.tsx     (new) compact inline form
         └─ WitnessSelector.tsx    (new, or reuse an existing multi-select if available)
```

`ApparatusEntryView` receives the `ApparatusEntry` object, its index, `sigla`, `canEdit`,
selection/hover flags and a single stable `onEdit(op: QuickApparatusEdit)` callback
(created with `useCallback` in the composer). No JSX-producing props.

### 4.2 Hover controls

- Each sub-entry is wrapped in `<span className="sub-entry-wrapper">`; the controls are rendered always
  (when `canEdit`) but hidden via CSS (`.sub-entry-wrapper:hover .sub-entry-controls {visibility: visible}`).
  Using CSS instead of `onMouseEnter` state avoids re-renders on hover and keeps hover cost at zero.
- Controls are small absolutely-positioned icons above the sub-entry (react-bootstrap-icons:
  `Eye`/`EyeSlash`, `ChevronLeft`/`ChevronRight` or `ArrowLeftShort`/`ArrowRightShort`, `PlusLg`), so the
  apparatus text does not reflow when they appear.
- Directions are logical ("backward"/"forward" in the sub-entry list); for RTL languages
  (`getTextDirectionForLang`) icons are mirrored so that "forward" always points to the reading direction.
- The backward arrow is not shown on the first sub-entry, forward not on the last.
- Disabled sub-entries are **always** rendered in the apparatus panel, greyed out (`disabled` class), so they
  can be re-enabled with the same toggle icon. There is no option to hide them in the editor. (The preview
  and typesetting keep ignoring them, as today.)
- The disabled style must stay visually distinct from the hover/selection highlighting, and the
  backward/forward arrows also apply to disabled sub-entries (their position is kept when re-enabled).
- Keyboard: when a lemma is selected, shortcuts can operate on a "focused sub-entry"
  (e.g. `Space` toggle, `Alt+←/→` move, `+` add). Optional, phase 2.

### 4.3 Quick add form

- `+` icon appears when hovering the last sub-entry (and, for entries with no enabled sub-entries,
  after the lemma).
- Clicking replaces the icon with an inline form inside the entry:
  `[type ▾] [text____] [witnesses ▾] ✓ ✗`
  - type: `variant` (default), `omission` (text input disabled), `addition`. These are the only three
    types; no new `SubEntryType` or CtData schema change is needed.
  - text: plain text input converted to `FmtText` (`fromString`-style helper); one word is the typical case
    but nothing prevents more.
  - witnesses: compact dropdown with checkboxes listing sigla in `witnessOrder`, followed by the sigla
    groups defined in CtData (`siglaGroups: {siglum, witnesses}[]`).
    - Only **hand 0** is supported: every selected witness produces `{witnessIndex, hand: 0}` with no
      location. Hands and locations remain available only in the full editor.
    - Checking a group checks all its witnesses; a group checkbox is shown checked when all its witnesses are
      checked and indeterminate when only some are. Unchecking a group unchecks its witnesses.
    - Groups are a selection shortcut only: the stored `witnessData` always lists individual witnesses.
      The group siglum is produced at render time by `ApparatusUtil.getSiglaData()`, exactly as for any
      other sub-entry, so the result is consistent with the rest of the apparatus and stays correct if a
      group is later edited.
    - Witnesses excluded from the automatic apparatus are still listed (a user may want to cite them
      manually).
  - `Enter` confirms, `Esc` cancels, clicking outside cancels; confirm disabled until at least one witness
    is selected and (for variant/addition) the text is not empty.
- The result is a `fullCustom` sub-entry appended at the end (`position = subEntries.length`), exactly as
  `addNewCustomSubEntry()` does in the vanilla panel.
- Form state is local to `QuickSubEntryForm`; only the confirmed result goes to the composer.
- `QuickSubEntryForm` is independent of where it is shown: it receives `sigla`, `siglaGroups`,
  `witnessOrder`, `lang` and `onConfirm(data: QuickSubEntryData)` / `onCancel()`, so the same component is
  used in the apparatus panel and in the main text panel (§4.4).

### 4.4 Adding entries from the main text panel

`MainTextPanel` already supports an `apparatus` mode in which the user can select a token range by dragging
(`MainTextViewer` → `onSelectionChange(range: MainTextTokenRange)`).

#### 4.4.1 Vanilla behaviour to preserve

In `EditionComposer/MainTextPanel.ts`, apparatus mode shows an "add entry" dropdown with one item per
apparatus. Choosing one calls `editApparatusEntry(appIndex, selection.from, selection.to)`; the vanilla
`EditionComposer.editApparatusEntry()` then calls `ApparatusPanel.editApparatusEntry(from, to, true)` on
the corresponding panel (which loads the existing entry for that main text range, or a new empty one, and
appends a new custom sub-entry) and switches to that apparatus tab. The React panel must offer the same
flow; it becomes available as soon as the full entry editor is ported to the React `ApparatusPanel`.

#### 4.4.2 Target apparatus menu

In apparatus mode the `MainTextPanelToolbar` shows an **"Add to"** select, modelled on the existing
"Highlight App." select of view mode:

```
Add to: [Visible Tab ▾]      options: Visible Tab | criticus | marginalia | …  (edition.apparatuses)
```

- New type `ApparatusTargetSelection = 'active' | number` (apparatus index), next to
  `ApparatusHighlightSelection` in `MainTextPanelToolbar.tsx`; default `'active'`.
- `'active'` resolves to the `activeApparatusIndex` already computed in `EditionComposer.tsx` from
  `activeTabPanelTwo` and passed to `MainTextPanel`. If the visible tab is not an apparatus
  (`activeApparatusIndex === null`), the add actions are disabled with a tooltip ("No apparatus visible:
  choose a specific apparatus"). It is never resolved silently to another apparatus.
- The selection is panel UI state (`useState` in `MainTextPanel`), like `apparatusHighlightSelection`. It
  may be persisted with the other view options later.
- The resolved target is shown in the add controls (e.g. `+ criticus`) so the user always knows where the
  entry goes, especially with `'active'`.

#### 4.4.3 Actions on a selection

When a non-empty token range is selected in apparatus mode (and `canEdit`), a small floating toolbar is
shown next to the selection (react-bootstrap `Overlay` anchored to the last selected token, same mechanism
as `MainTextApparatusPopover`) with two buttons:

- **Quick add** (`+`): opens `QuickSubEntryForm` in the popover (§4.3) for the resolved target apparatus.
- **Edit entry** (pencil): the vanilla flow (§4.4.1). The composer switches panel two to the target
  apparatus tab (`activeTabPanelTwo` = `apparatus-<type>`) and asks that `ApparatusPanel` to open the
  full editor for the range with a new custom sub-entry. Until the full editor exists, this button is
  hidden.

Since the target is chosen in the toolbar, the vanilla per-apparatus dropdown is not needed. With
`'active'` the full editor opens in the tab the user is already looking at, so no tab switch happens.
The quick form does not switch tabs either. After confirmation the new or updated entry is selected in the
target apparatus panel (if it is the visible one, the user sees the result immediately).

#### 4.4.4 Quick add on confirm

On confirm the composer:
  1. converts the main text range to a CT range: main text token → `editionWitnessTokenIndex` →
     `CtData.getCtIndexForEditionWitnessTokenIndex()` for `from` and `to` (shared helper
     `getCtRangeForMainTextRange()` in the module of §5.1);
  2. if the target apparatus already has an entry for exactly that CT range, it behaves like `addSubEntry`
     on that entry (§5.2), including the identical sub-entry check;
  3. otherwise it creates a new custom entry `{from, to, lemma: 'auto', preLemma: '', postLemma: '',
     separator: '', subEntries: [newSubEntry]}` (same defaults the vanilla editor uses for a new entry) and
     writes it with the same immutable `updateCustomApparatuses` path.
- Partially overlapping ranges are not merged: as in the vanilla editor, a different CT range is a
  different entry. The form header shows the selected text and its line number so the user sees the lemma.
- After confirmation the new entry is selected in the apparatus panel (selection by CT range, §7) and the
  main text selection is cleared.
- Rendering a popover over the main text must not re-render the whole text: the overlay is a sibling of the
  token list, and `MainTextViewer` tokens are memoized (same principles as §6.5).

### 4.5 Interaction with the full editor

The quick controls do not replace the full entry editor that will eventually be ported from the vanilla
panel (double click on the lemma). Both use the same domain operations (§5) so they stay consistent.

---

## 5. Domain operations and history actions

### 5.1 Shared converter (extracted from the vanilla panel)

New module `Edition/ApparatusEntryCustomization.ts` (pure, unit-testable):

```ts
export interface CtRange { from: number; to: number; }

/** Converts a displayed entry into the CtData custom entry that reproduces it. */
export function customEntryFromApparatusEntry(entry: ApparatusEntry, ctRange: CtRange): CustomApparatusEntryInterface;

/** CT range of an entry: metadata.ctGroup if present, otherwise recomputed from the main text. */
export function getCtRangeForEntry(ctData: CtDataInterface, mainText: MainTextToken[], entry: ApparatusEntry): CtRange;
```

`customEntryFromApparatusEntry` is the body of `genOnClickUpdateApparatusButton()` (lemma type handling,
auto → hash, user → fullCustom). The vanilla panel should be refactored to call it so there is a single
implementation.

### 5.2 Quick operations

```ts
export type QuickApparatusEdit =
  | { kind: 'toggleSubEntry'; apparatusIndex: number; entryIndex: number; subEntryIndex: number }
  | { kind: 'moveSubEntry'; apparatusIndex: number; entryIndex: number; subEntryIndex: number; direction: 'backward' | 'forward' }
  | { kind: 'addSubEntry'; apparatusIndex: number; entryIndex: number; subEntry: QuickSubEntryData }
  | { kind: 'addSubEntryToRange'; apparatusType: string; mainTextRange: MainTextTokenRange; subEntry: QuickSubEntryData };

export interface QuickSubEntryData {
  type: 'variant' | 'omission' | 'addition';
  text: string;       // ignored for omission
  witnesses: number[]; // witness indices, always hand 0; groups already expanded by the form
}
```

Each operation is a pure function `ApparatusEntry → ApparatusEntry`:
- toggle: flip `enabled` of the sub-entry.
- move: swap with neighbour, then rewrite `position = i` for **all** sub-entries (same as vanilla; necessary
  because `ApparatusEntry.orderSubEntries()` orders by position and puts non-positioned auto sub-entries
  first).
- add: append a `USER`-source sub-entry with `position = subEntries.length` and
  `witnessData = witnesses.map(w => ({witnessIndex: w, hand: 0}))`.
- addSubEntryToRange: resolve the CT range (§4.4); if an entry exists for it, same as add; otherwise build
  a new entry containing only the new sub-entry.

**Identical sub-entries are rejected.** A new sub-entry is identical to an existing sub-entry of the target
entry when all of the following hold:

- same effective type: auto `variant` or `fullCustom` with keyword `''` ≡ variant; `omission` or keyword
  `omission` ≡ omission; `addition` or keyword `addition` ≡ addition;
- same text (ignored for omissions), compared as plain text after whitespace normalization
  (`FmtText` → plain text, trim, collapse spaces), and with the language's normalizers if needed;
- same witness set, ignoring order: `{witnessIndex, hand}` pairs (the quick form produces hand 0 only, but
  existing sub-entries may cite other hands, and those are then different).

The comparison is against **all** sub-entries of the entry, automatic and custom, enabled and disabled.

```ts
/** Returns the index of a sub-entry identical to `data` in `entry`, or -1. */
export function findIdenticalSubEntry(entry: ApparatusEntry, data: QuickSubEntryData, lang: string): number;
```

- `QuickSubEntryForm` receives the target entry (or `null` for a new range), calls
  `findIdenticalSubEntry` while the user types, disables confirm and shows an inline message:
  "Identical to an existing sub-entry". If the match is disabled the message is "Identical to a disabled
  sub-entry" with a one-click **Enable it** link that sends a `toggleSubEntry` instead.
- The `addSubEntry` / `addSubEntryToRange` operations also check and return an error result instead of a new
  entry (defence in depth, e.g. keyboard shortcuts or stale UI). The composer then shows the error and
  records no history action.
- Sub-entries that differ only in witnesses (same type and text) are **not** identical and are accepted.
  The form may show a hint ("Same reading exists for A B: add witnesses there instead") but does not block.

Ordering semantics are kept as in the vanilla editor: a move rewrites the positions of all sub-entries of
the entry, and automatic sub-entries that appear later (after collation changes) go first. This is
acceptable because ordering is normally done only once the collation is finalized; the UI does not need to
warn about it.

Then: `ctRange = getCtRangeForEntry(...)`, `custom = customEntryFromApparatusEntry(newEntry, ctRange)`,
`ctData = CtData.updateCustomApparatuses(ctData, apparatus.type, custom)`.

Optional normalization (phase 2): drop auto sub-entry customizations that equal the default (enabled and
natural position) so that "disable then enable" leaves no residue in CtData and the state signature
returns to the original (which `StateHistory.do()` then detects as an effective undo).

### 5.3 History action

`ReactAPM/Pages/EditionComposer/Actions/QuickApparatusEditAction.ts`, implementing
`StateTransformAction<EditionComposerHistoryState>`. Because the operation is defined in terms of the
*displayed* entry, the action needs the current edition; it receives the entry (already resolved by the
composer from the current `Edition`) and the apparatus type, and only touches CtData:

```ts
new QuickApparatusEditAction({apparatusType, ctRange, newEntry, description})
```

The description feeds the Session panel (e.g. "Disable sub-entry 'om. AB' in 12 lemma").

Identity: the target entry is identified by `(apparatusType, ctRange)` and the sub-entry by index in the
displayed entry at the time of the click. Since actions are applied synchronously against the state the
user sees, that is safe.

---

## 6. Responsiveness

### 6.1 Measurements (phase 1, done)

The instrumentation is in place:

- `js/toolbox/PerfMeasure.ts`: dev-only measurement points (`perfMeasure`, `perfMeasureAsync`,
  `perfBegin`/`perfEnd`) recorded as `performance.measure` entries and readable with `getPerfRecords()` /
  `getPerfSummary()`; console logging is enabled with `localStorage['apm.perf'] = '1'`. Production builds
  pass through with no cost.
- Measurement points: `util.deepCopy`, `history.action.execute`, `history.signature`, `edition.generate`
  and its stages (`mainText`, `autoCriticalApparatus`, `ctIndexToMainTextMap`, `mergeCustomCriticus`,
  `autoMarginalia`, `mergeCustomMarginalia`, `customApparatuses`, `sortAndOrder`), and
  `composer.action.total` (from `runHistoryAction` to the effect after the render commit).
- Benchmark: `test/js/benchmark/EditionPipeline.bench.ts` against the deterministic synthetic fixtures of
  `test/js/benchmark/LargeCtDataFixture.ts`, run with `npm run bench` (from `apps/apm/www`).

Results per single custom sub-entry toggle (synthetic fixtures, developer machine):

| Size | `deepCopy` | signature | `generateEdition` | whole pipeline |
|---|---|---|---|---|
| Small (0.8 MB) | ~8 ms | ~4 ms | ~16 ms | ~23 ms |
| Medium (5.4 MB) | ~48 ms | ~29 ms | ~80–130 ms | ~113 ms |
| Large (24 MB) | ~223 ms | ~142 ms | ~300 ms | ~650 ms |

Per-stage breakdown of `generateEdition`: the **automatic critical apparatus is ~90%** of the time;
`mainText`, `sortAndOrder`, `mergeCustomCriticus` and the remaining stages are each a few ms or less.
React commit time is not part of the benchmark; it is only covered by `composer.action.total` in the
running app.

Conclusions:

1. **Stage A must cache the automatic critical apparatus** (§6.3). Everything else in generation is
   already cheap, so an incremental generator is only worth it if it skips
   `CriticalApparatusGenerator.generateCriticalApparatusFromCtData()` when its inputs are unchanged.
2. **State copy and signature are first-class costs.** Together they are ~77 ms (medium) and ~365 ms
   (large), as much as or more than generation. Even a perfectly memoized generator would leave the large
   edition at ~365 ms, so structural sharing (§6.2) and slice-hashed signatures (§6.4) are required.
3. **All three reductions are needed to reach the < 50 ms target** (§1). With structural sharing (copy ≈
   O(change)), slice-hashed signatures (≈ O(change)) and a Stage A cache hit, a sub-entry edit costs Stage B
   for one apparatus plus the React commit, which is projected to stay in the few-ms range even at 24 MB.

The fixtures are synthetic; the benchmark should be re-run on a real large edition when one is available,
and is kept to catch regressions.

### 6.2 Structural sharing in actions (required)

Structural sharing is a required reduction in its own right, not only a prerequisite for cheap memoization:
`deepCopy` alone measures ~223 ms per action at 24 MB (§6.1), several times the whole target budget.

Today every action does `deepCopy(state)`, so after an action **every** sub-object of CtData is a new
reference and the memoizer would need `deepEqual` over the whole CtData — as expensive as the current
`JSON.stringify`. Instead:

- Actions copy only the path they change:
  `{...state, ctData: {...ctData, customApparatuses: replaceAt(ctData.customApparatuses, i, {...app, entries: newEntries})}}`.
- `CtData.updateCustomApparatuses` currently mutates its argument; add an immutable variant
  (`CtData.withUpdatedCustomApparatusEntry`) that returns new arrays only along the changed path and leaves
  all other entries/apparatuses/witnesses as the same references.
- States in history must be treated as immutable (optionally `Object.freeze` in dev builds to catch
  mutations). The initial state is still deep-copied once.

With this, `Object.is` on CtData slices is a correct and O(1) change detector, also across undo/redo
(older states keep their original references).

### 6.3 Staged, memoized edition generator

New class `IncrementalCtDataEditionGenerator` (kept alongside `CtDataEditionGenerator`, which stays the
reference implementation for tests and for non-interactive callers). It owns several `Memoizer`s and lives
for the lifetime of a loaded edition (e.g. `useRef` in `EditionComposer`, reset on version/table change).

```
Stage A  "base"      input: {witnesses, collationMatrix, groupedColumns, editionWitnessIndex,
                             witnessOrder, lang, excludeFromAutoCriticalApparatus,
                             includeInAutoMarginalFoliation}               (Object.is per field)
                     output: autoCriticalApparatus (the ~90% cost), baseWitnessTokens, mainText,
                             ctIndexToMainTextMap, autoMarginaliaApparatus, foliationChanges

Stage B  "merge"     per apparatus type; input: {stageA result, customApparatus of that type}
                     output: merged, sorted Apparatus with ordered sub-entries

Stage C  "entry"     (optional, inside B) per custom entry; keyed by CT range;
                     input: {auto entry, custom entry}  output: merged ApparatusEntry

Stage D  "edition"   assemble Edition: sigla, witnesses, siglaGroups, info, metadata (cheap, always)
```

Stage A's primary payload is the **automatic critical apparatus**: it is ~90% of generation time (§6.1),
while main text, map, marginalia and sorting are each a few ms. Stage A is worth having only because it
skips `CriticalApparatusGenerator.generateCriticalApparatusFromCtData()`; caching only the main text or the
sort step would save almost nothing.

- A sub-entry toggle changes one `customApparatuses` element → Stage A is a cache hit (the heavy part),
  Stage B reruns only for the affected apparatus type; other apparatuses are returned **by reference**.
- Stage C (needs a small keyed variant of `Memoizer`, e.g. `KeyedMemoizer<K, I, O>` holding a `Map<K, …>`
  and evicting keys not seen in the last run) makes the rerun of B proportional to the number of
  customized entries rather than the number of entries, and — more importantly — returns unchanged
  `ApparatusEntry` objects by reference so React can skip them.
- Changing sigla or title only reruns Stage D; changing `excludeFromAutoCriticalApparatus` reruns A.
  The equality inputs for Stage A must be listed explicitly; a test should assert that every
  `CtDataInterface` field is classified either as a Stage A input, a Stage B input or a Stage D input, so
  a newly added field cannot silently be ignored.

**Mutation pitfall:** `mergeCustomApparatusEntries()` and
`applyCustomAutoSubEntriesToGeneratedSubEntries()` mutate the generated apparatus and its sub-entries in
place, and `sortEntries()` sorts in place. If Stage A output is memoized these mutations would corrupt the
cache (e.g. a sub-entry disabled once would stay disabled after undo). Since the cached automatic critical
apparatus is exactly what these functions mutate, the merge code must be rewritten to be non-mutating
(clone the touched entry / sub-entries, build new arrays) before Stage A is enabled; it is a good change
anyway.
A test should run generation twice with different custom data on the same generator and compare with
`CtDataEditionGenerator` output.

Correctness check during development: in dev builds, optionally run the full generator in an idle
callback and `deepEqual` its output with the incremental one, logging differences.

### 6.4 Cheaper history signatures (required)

The full-state signature measures ~142 ms per action at 24 MB (§6.1), so this is required to reach the
target, not an optional refinement.

`StateHistory.getStateSignature()` hashes `JSON.stringify(state)`. With structural sharing it can compute
a signature as a hash of per-slice signatures, caching each slice signature in a `WeakMap<object, string>`
(e.g. per witness, per custom apparatus, per scalar group). Unchanged slices are free, so the cost of an
action becomes proportional to what changed. It can be implemented as a `signatureFunction` passed to the
`StateHistory` constructor (defaulting to the current full hash) so the generic class stays generic.

### 6.5 React rendering

- `ApparatusEntryView`, `SubEntry`, and `ApparatusPanel` wrapped in `React.memo`; props are stable
  references (entry object, `sigla` array from CtData, callbacks via `useCallback`).
- `ApparatusViewer`: compute entry ranges and an `entry → index` map with `useMemo` keyed on
  `[apparatus, lineNumberMap, useLineNumbers]` (removes the O(n²) `indexOf`).
- Use keys derived from the CT range (`${ctFrom}-${ctTo}`) for entries and from
  `hashString()`/position for sub-entries instead of array indices, so inserting/moving does not remount
  siblings.
- Hover highlighting (`hoveredEntryIndices`, `selectedLemmaIndex`) should be passed as per-entry booleans
  so only the two affected entries re-render on hover.
- `MainTextPanel` receives `edition.mainText` which, thanks to Stage A, keeps its reference; only parts that
  depend on `apparatuses` need recomputing.

### 6.6 Last-resort fallback: optimistic update

Not planned. With structural sharing, slice-hashed signatures and the Stage A cache in place, the
incremental path is projected to be well under the < 50 ms target even at 24 MB (§6.1), so this is kept only
as a fallback in case measurements on real editions contradict that projection.

If measurements show that even the incremental path is too slow for the largest editions, the composer can
apply the quick operation directly to the displayed `Edition` (replace one `ApparatusEntry` in one
`Apparatus`, everything else by reference) and schedule the regeneration with `startTransition`. Since
the quick operations are defined as `ApparatusEntry → ApparatusEntry`, the optimistic result equals what
regeneration produces for toggle/move/add. It is not recommended because it introduces two sources of
truth; the three reductions above should make it unnecessary.

### 6.7 Rapid clicks

Instead of dropping actions while one is in progress, quick actions can be queued (a simple promise chain
in the composer). With the fast path this is mostly moot, but it avoids lost clicks.

---

## 7. Composer wiring

- `EditionComposer` holds `generatorRef = useRef<IncrementalCtDataEditionGenerator>()`;
  `setDisplayedHistoryState` calls `generatorRef.current.generateEdition(state.ctData)`.
- New handler `applyQuickApparatusEdit(op: QuickApparatusEdit)`:
  resolves the entry from the current `edition.apparatuses[op.apparatusIndex].entries[op.entryIndex]`,
  applies the pure operation, builds `QuickApparatusEditAction`, calls `runHistoryAction`.
- `ApparatusPanel` gets `canEdit` and `onQuickEdit` props; selection of the edited lemma is preserved
  (entry index may change after adding an entry from a new range — select by CT range, not index).
- `MainTextPanel` gets `canEdit`, `siglaGroups`, `witnessOrder` and the same `onQuickEdit` callback; it
  emits `addSubEntryToRange` operations with the apparatus type resolved from the "Add to" selection
  (`'active'` → `activeApparatusIndex`, already passed today).
- `MainTextPanel` also gets `onEditApparatusEntry(apparatusIndex, mainTextRange)` for the vanilla flow; the
  composer switches `activeTabPanelTwo` to the target apparatus tab and passes an "open editor for range"
  request to that `ApparatusPanel` (a prop such as `entryEditRequest: {range, addCustom: true, nonce}`
  rather than an imperative ref, so it stays declarative).
- `QuickSubEntryForm` in the main text receives the existing target entry for the range (looked up by CT
  range in the target apparatus) so it can run the identical sub-entry check.
- `siglaGroups` and `sigla` are passed from `ctData` by reference so memoized children are not invalidated.

---

## 8. Implementation phases

1. **Instrumentation** and baseline numbers — **done**; results and conclusions in §6.1.
2. **Domain layer**: extract `customEntryFromApparatusEntry` / `getCtRangeForEntry` (+ fix the
   `ctGroup.to` bug, stamp `metadata.ctGroup` on all generated entries), quick operations,
   `QuickApparatusEditAction`. Unit tests against CtData fixtures; refactor vanilla panel to use the
   converter.
3. **UI** — **done**: `ApparatusEntryView`, `SubEntryQuickControls`, `AddSubEntryButton`, `QuickSubEntryForm`,
   `WitnessSelector` (with sigla groups); memoization and keys in the viewer; disabled sub-entries greyed.
   At this point the feature works, using the full generator.
3b. **Main text quick add** — **done** (including the "Edit entry" button, which opens the full editor through an
   `entryEditRequest` prop): "Add to" target select (Visible Tab / specific apparatus) in
   `MainTextPanelToolbar`, selection overlay with the quick add button in `MainTextPanel`,
   `addSubEntryToRange` operation and `getCtRangeForMainTextRange()`. The "Edit entry" button (vanilla
   flow) is added when the full entry editor is ported to the React `ApparatusPanel`.

Phases 2, 3 and 3b are unchanged and can land first on top of the full generator; they are functionally
complete without phase 4, only slower on large editions.

4. **Responsiveness milestone (required)**. The measurements (§6.1) show that copy, signature and
   generation each exceed the < 50 ms budget on large editions, so the three reductions must ship together
   to reach the target; any one alone leaves the large edition at hundreds of ms:
   - 4a. **Structural sharing** in actions and immutable `CtData` custom-apparatus update (§6.2).
   - 4b. **Incremental generator** Stage A + B with non-mutating merge, Stage A caching the automatic
     critical apparatus (§6.3); equivalence tests vs. `CtDataEditionGenerator`.
   - 4c. **History signature** with cached slice hashes (§6.4).

   4a is a prerequisite for 4b and 4c (`Object.is` change detection and `WeakMap` slice caching both rely
   on shared references). The milestone is validated by re-running `npm run bench` and checking
   `composer.action.total` in the running app.
5. **Optional tail**, only if measurements after phase 4 call for it: Stage C (entry-level keyed memo,
   §6.3), action queue for rapid clicks (§6.7), keyboard shortcuts (§4.2), and as a last resort
   optimistic updates (§6.6). Stage C is optional because Stage B reruns only the affected apparatus and
   the measured cost of merging custom entries and sorting is a few ms even at 24 MB.

Phase 4 also speeds up every other composer action (sigla, witness order, title …).

## 9. Testing

- Vitest unit tests (mirroring source paths under `test/js`):
  - converter round trip: `generate → entry → customEntryFromApparatusEntry → updateCustomApparatuses →
    generate` yields the same entry;
  - toggle/move/add operations, including first/last boundaries and entries without prior customization;
  - `addSubEntryToRange`: existing entry for the range vs. new entry, ranges spanning several tokens;
  - `findIdenticalSubEntry`: auto vs. custom equivalence (variant ≡ keyword `''`, omission, addition),
    whitespace normalization, witness order independence, different hands not identical, disabled
    sub-entries matched; `addSubEntry` returns an error and leaves CtData untouched on a duplicate;
  - witness data produced by the form is always hand 0; group selection expands to the group's witnesses
    and renders with the group siglum;
  - incremental generator equals full generator after sequences of random quick edits, undo/redo, and
    non-apparatus changes (sigla, excluded witnesses);
  - memo hits: Stage A not recomputed after a sub-entry change (spy), unchanged apparatuses returned by
    reference;
  - action immutability: previous state objects unchanged after an action (`Object.freeze` in tests).
- Component tests (`ApparatusViewer.test.tsx` style): controls hidden when `!canEdit`, callbacks fired with
  the right `QuickApparatusEdit`, disabled sub-entries rendered with the `disabled` class, quick form
  validation (including the identical sub-entry message and the "Enable it" link), group checkbox states
  (checked / indeterminate) and `Enter`/`Esc` handling; main text selection overlay shown only for a
  selection in `apparatus` mode; "Add to" select resolving `'active'` to the visible apparatus and
  disabling the add actions when no apparatus tab is visible; "Edit entry" calls
  `onEditApparatusEntry` with the resolved apparatus and range.

## 10. Decisions

Answers to the open questions of revisions 1 and 2:

1. **Sub-entry types**: there is no "deletion"; the quick form offers `variant`, `omission` and `addition`
   only. No schema change (§4.3).
2. **Witness selection**: hand 0 only, no locations; sigla groups are offered as a selection shortcut
   (§4.3).
3. **Adding from the main text**: in scope, via a token selection in `MainTextPanel` (§4.4, phase 3b).
4. **Ordering semantics**: unchanged from the vanilla editor; ordering is normally done after the
   collation is finalized (§5.2).
5. **Disabled sub-entries**: always visible and greyed out in the apparatus panel, no hide toggle (§4.2).
6. **Target apparatus in the main text**: a toolbar menu like the highlight menu, offering "Visible Tab"
   (default) or a specific apparatus (§4.4.2).
7. **Vanilla main text flow kept**: select text → choose apparatus → full entry editor in that panel is still
   offered, next to the quick add (§4.4.1, §4.4.3).
8. **Identical sub-entries are rejected**, both in the form and in the domain operation (§5.2).

Revision 4 (2026-10-16): the phase-1 measurements (§6.1) validated the responsiveness strategy of §6 and set
the phase priorities in §8 (structural sharing, incremental generation and slice-hashed signatures as one
required milestone; Stage C, action queue and optimistic updates optional). No scope or decision above was
reversed.
