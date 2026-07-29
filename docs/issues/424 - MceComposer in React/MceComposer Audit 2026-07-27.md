# MCE Composer audit — Generated 2026-07-27 - Updated 2026-07-29


## Improvement opportunities

### Establish an editor-session module

`MceComposer` currently coordinates route parsing, loading, chunk batches, history, persistence, cache ownership, generation, and rendering. Move lifecycle and cancellation rules behind a dedicated editor-session interface that exposes explicit session states. This would make route changes, stale async results, saves, generation, and retries testable without rendering the whole page.

### Establish a chunk-identity module

Table ID, version, status, cache keys, and action targeting are represented differently across the composer, actions, and `MceData`. A single stable chunk reference with validation would prevent version ambiguity and give all dependent code one identity contract.

### Consolidate preview settings validation

Selection, storage, language compatibility, dimensions, and PDF/typesetting errors are split between effects and utilities. A validated preview-settings state/module would ensure only language-compatible stylesheet selections reach the panel and typesetter.

### Make `MceData` invariants explicit

`MceData` contains coordinated arrays for chunks, order, witnesses, sigla, marginal-foliation indexes, and groups. Place mutations behind invariant-preserving operations and test the invariants directly after every mutation. This is more durable than relying on each caller to maintain cross-array consistency.
