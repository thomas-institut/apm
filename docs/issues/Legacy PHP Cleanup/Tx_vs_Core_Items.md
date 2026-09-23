# Tx vs Core Items

## Question to GPT-5.6-Terra

> The classes in `apps/apm/www/classes/APM/Core/Item/Item.php` and `apps/apm/www/classes/APM/System/Transcription/TxText/Item.php` seem to refer to the same kind of thing. Analyze
their usage and explain to me how they differ and whether their being distinct is necessary or desirable.

*26 Aug 2026*

### Conclusion

They are **not two interchangeable versions of one domain class**, although they encode largely the same transcription semantics. They belong to separate layers:

- `APM\System\Transcription\TxText\Item` is the **legacy, persistence/editor model**. It is a mutable record-like base class with database identity and layout fields (`id`, `columnElementId`, `seq`), integer type codes, and storage-shaped fields (`text`, `alt_text`, `extra_info`, `length`, `target`). Its many subclasses (`Text`, `Sic`, `Addition`, etc.) are constructed from editor/API arrays and database rows, compared for diffs, and written back by `ApmTranscriptionManager`.
- `APM\Core\Item\Item` is the newer **abstract transcription domain model**. It has no persistence identity or sequence; it defines rendering/tokenization-relevant behavior (`getPlainText`, `getNormalizedText`), common position/flow and editorial-note state. Its concrete forms are deliberately coarser: `TextualItem` carries combinations of formatting, normalization, clarity, deletion, language, hand, etc.; `Mark` and a few specialised marks represent non-textual items.

### Evidence from usage

- `ApmTranscriptionManager` still builds `TxText` subclasses from database rows and incoming editor arrays, then persists their public fields to the item table. It also uses `ItemArray` and `TxText\Item::isItemDataEqual()` to calculate edit scripts when updating an element: `apps/apm/www/classes/APM/System/Transcription/ApmTranscriptionManager.php`.
- The legacy model is transformed at the read boundary for newer consumers. `ItemStreamItemFactory` maps each `TxText\Item` integer type to a `Core\Item\TextualItem` or `Core\Item\Mark`, including contextual adjustments based on the containing column element: `apps/apm/www/classes/APM/System/Transcription/ItemStreamItemFactory.php`.
- `DatabaseItemStream` performs that transformation; the result drives `TranscriptionWitness` tokenization and `WitnessPageFormatter` rendering: `apps/apm/www/classes/APM/System/Transcription/DatabaseItemStream.php`, `apps/apm/www/classes/APM/Core/Witness/TranscriptionWitness.php`, and `apps/apm/www/classes/APM/Api/ItemStreamFormatter/WitnessPageFormatter.php`.

### Is the distinction necessary?

**Currently, yes.** Removing either class outright would break a live boundary:

- The legacy hierarchy is still required by editing, diffing, historical/versioned database reads, and database writes.
- The Core hierarchy is required by the newer witness, tokenization, and rendering abstractions, which should not depend on database IDs, integer storage codes, or legacy public-field conventions.

They cannot simply be made one inheritance hierarchy without forcing persistence concerns into Core or rewriting the editor/persistence path.

### Is it desirable?

**The boundary is desirable; maintaining two parallel semantic models indefinitely is not.** `ItemStreamItemFactory` is an appropriate anti-corruption adapter: it prevents legacy database representation from leaking into the newer Core APIs. However, the model meanings are duplicated in type codes, subclasses, fields, validation, and mapping logic, so changes to an item feature risk divergence.

The preferable direction is therefore:

1. Keep the classes distinct while the legacy editor/persistence workflow remains active.
2. Make their roles clearer in naming/documentation (for example, legacy persisted item versus Core transcription item).
3. Treat the conversion factory as the single supported compatibility boundary and test every mapping.
4. In a future migration, move the editing/persistence workflow to a repository/mapper around Core items; only then can `TxText\Item` and its subclasses be retired safely.

No code was changed.