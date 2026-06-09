# Unit Test Proposal: `MceDataEditionGenerator`

**Target file:** `apps/apm/www/js/MceData/MceDataEditionGenerator.ts`  
**Status:** Proposal only (no implementation in this document)

## Goal

Define a focused unit-test set for `MceDataEditionGenerator` that validates:
- chunk orchestration and merging behavior in `generate()`
- error handling and delegation in `regenerateSingleChunkEdition()`
- index translation logic in `getSingleChunkIncludeInAutoFoliationArray()`
- foliation-state carry-over logic in `mergeFoliationChanges()`
- caching hooks (`singleChunkEditionGetter`/`singleChunkEditionSaver`)

---

## Test setup strategy

Use `vitest` with minimal typed fixtures and stubs:
- stub `ctDataGetter`
- stub `singleChunkEditionGetter`
- spy/stub `singleChunkEditionSaver`
- mock `CtDataEditionGenerator` to return deterministic single-chunk editions (or throw)
- optional spy on `MceData.getDefaultChunkOrder` for default-order behavior

Keep test data very small (2–3 chunks, 1–2 witnesses) to isolate behavior.

---

## Proposed test cases

## 1) Constructor defaults

1. **uses NullLogger when logger is omitted**
   - Arrange: instantiate with only `ctDataGetter`.
   - Assert: instance has a logger and generation does not fail due to missing logger.

2. **uses no-op saver/getter defaults when omitted**
   - Arrange: instantiate with only `ctDataGetter`.
   - Assert: `generate()` runs without requiring explicit cache callbacks.

---

## 2) `getSingleChunkIncludeInAutoFoliationArray()`

3. **maps global witness indices to chunk-local witness positions**
   - Example: global include `[3, 5]`, chunk witness indices `[1, 3, 5]`.
   - Assert result is `[1, 2]`.

4. **filters out include witnesses not present in chunk**
   - Example: global include `[9]`, chunk witness indices `[1, 3, 5]`.
   - Assert result is `[]`.

5. **initializes undefined includeInAutoMarginalFoliation to empty list behavior**
   - Arrange: `mceData.includeInAutoMarginalFoliation = undefined`.
   - Assert method returns `[]` and does not throw.

6. **preserves duplicates if present in source include list (current behavior)**
   - Example: global include `[3, 3]`, chunk witness indices `[3]`.
   - Assert result is `[0, 0]` (documents existing semantics).

---

## 3) `mergeFoliationChanges()`

7. **returns current changes directly when previous is empty**
   - Assert output equals current array content.

8. **carries over last previous change for witnesses missing in current**
   - Previous has multiple entries for witness A; current has none for A.
   - Assert merged includes only the latest previous entry for A.

9. **prefers current witness changes over previous for same witness**
   - Previous has witness A; current also has witness A.
   - Assert no carried-over previous entry for A appears before current block.

10. **handles multiple witnesses with mixed overlap correctly**
   - Some witnesses overlap, some do not.
   - Assert merge contains last previous for non-overlap + all current entries.

11. **deduplicates witness processing by witnessIndex (via uniq) without losing current ordering**
   - Previous/current contain repeated witness indices.
   - Assert merged output follows algorithm: carry-over subset first, then `...current` in original order.

---

## 4) `regenerateSingleChunkEdition()`

12. **throws when chunk index does not exist**
   - Arrange: request missing chunk index.
   - Assert rejected with `Attempt to regenerate non-existent chunk X`.

13. **calls ctDataGetter with (mceData, chunkIndex)**
   - Assert invocation count and arguments.

14. **injects computed includeInAutoMarginalFoliation into returned CtData before generation**
   - Use include list + chunk witnessIndices mapping.
   - Assert mocked `CtDataEditionGenerator` receives ctData with mapped include array.

15. **passes currentFoliationChanges to CtDataEditionGenerator as lastFoliationChanges**
   - Assert constructor options include exact provided foliation array.

16. **returns generated single chunk edition from CtDataEditionGenerator**
   - Mock `generateEdition()` to return known object.
   - Assert same object/value is returned.

17. **wraps and rethrows generation errors with chunk/table context**
   - Mock `generateEdition()` throwing error.
   - Assert rejection message starts with `Error generating edition for table id ...`.

---

## 5) `generate()` multi-chunk orchestration

18. **initializes edition metadata/info for multi-chunk output**
   - Assert `edition.info.singleChunk=false`, `source='multiChunk'`, `editionId` matches input, `metadata.infoText` set.

19. **copies sigla groups and witnesses from mceData into edition**
   - Assert witnesses count/sigla/title mapping and siglaGroup cloning.

20. **uses cached single-chunk edition when getter returns one**
   - Arrange: getter returns edition for chunk 0.
   - Assert `regenerateSingleChunkEdition` not called for that chunk.

21. **saves regenerated single-chunk edition when cache miss occurs**
   - Arrange: getter returns `null`.
   - Assert saver called with `(mceData, chunkIndex, generatedEdition)`.

22. **sets output language from first processed chunk only**
   - First chunk `lang='la'`, second `lang='ar'`.
   - Assert final `edition.lang === 'la'`.

23. **shifts mainText editionWitnessTokenIndex by cumulative chunk length**
   - Create token indices in each chunk.
   - Assert second chunk token indices are offset by first chunk emitted token count.

24. **inserts paragraph break token between non-final chunks with break='paragraph'**
   - Assert one paragraph-end token inserted between chunks, not after last chunk.

25. **inserts normal glue token between non-final chunks with break=''**
   - Assert one glue token inserted between chunks, not after last chunk.

26. **does not insert extra token for break='page' and break='section' (current TODO behavior)**
   - Assert no additional boundary token added for these break types.

27. **merges apparatuses by index and creates missing apparatus slots lazily**
   - First time an apparatus index appears, output apparatus is created with same type.
   - Assert entries appended to correct apparatus index.

28. **shifts apparatus entry from/to offsets using currentMainTextIndexShift**
   - Assert second chunk apparatus entry positions are offset by emitted main-text shift.

29. **maps subEntry witness indices through chunk witnessIndices to global witness index**
   - Arrange local witness index in chunk apparatus witnessData.
   - Assert mapped to corresponding global witness index in final edition.

30. **filters out apparatus entries with zero subEntries**
   - Arrange one entry with empty subEntries.
   - Assert it is not added to final apparatus.

31. **updates foliation carry-over between chunk iterations via mergeFoliationChanges**
   - Use distinct foliation changes per chunk.
   - Assert merge input/output sequence affects next chunk generation call.

32. **computes default chunk order when mceData.chunkOrder is undefined**
   - Spy on `MceData.getDefaultChunkOrder`.
   - Assert it is called and resulting order is used.

---

## Suggested fixture helpers (for eventual implementation)

- `buildMceData(overrides)` – minimal valid `MceDataInterface`
- `buildSingleChunkEdition({ lang, mainTextLen, apparatuses, foliationChanges })`
- `mkMainTextToken(index)` with explicit `editionWitnessTokenIndex`
- `mkAppEntry({ from, to, subEntries })`

These keep tests readable and reduce brittle inline objects.

---

## Prioritization (if implementing incrementally)

**High priority (must-have):** 12, 14, 17, 20–25, 28–30, 32  
**Medium priority:** 3–5, 8–10, 15–16, 27, 31  
**Low priority / behavior-locking:** 6, 11, 26

---

## Expected outcome

This suite should give strong confidence in core merge/index/caching behavior and quickly detect regressions in multi-chunk edition generation logic, especially around boundary token insertion, apparatus offsetting, and foliation propagation.