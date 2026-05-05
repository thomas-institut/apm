### API Calls Inventory

---

### Part 1: ApmApiClient Methods → Routes → Usage

Each row: **client method** → **API route** → **files calling it**

| ApmApiClient Method | API Route | Called From |
|---|---|---|
| `whoAmI()` | `/api/whoami` | `ApmPage.ts`, `App.tsx` |
| `apiLogin()` | `/api/login` | `Login.tsx` |
| `getPersonEssentialData()` | `/api/person/{id}/data/essential` | `AutomaticCollationTable.ts`, `ChunkPage.ts`, `NewChunkEditionDialog.tsx`, `Chunk.tsx`, `Works.tsx` |
| `getAllPeopleData()` | `/api/person/all/dataForPeoplePage` | *(no direct usage found — `getAllPersonEssentialData` uses same route)* |
| `getAllPersonEssentialData()` | `/api/person/all/dataForPeoplePage` | *(used internally, no direct page-level call found)* |
| `getPersonWorks()` | `/api/person/{id}/works` | `PersonPage.ts`, `NewChunkEditionDialog.tsx` |
| `personCreate()` | `/api/person/create` | *(no usage found in pages/ReactAPM)* |
| `getWorkDataOld()` | `/api/work/{id}/old-info` | `AutomaticCollationTable.ts`, `Work.tsx` |
| `getWorkData()` | `/api/work/{id}/data` | `DocPage.ts`, `ChunkPage.ts`, `Chunk.tsx` |
| `getAllWorksData()` | `/api/works/all` | `Works.tsx` |
| `getAuthors()` | `/api/works/authors` | `NewChunkEditionDialog.tsx` |
| `getWorkChunksWithTranscription()` | `/api/work/{id}/chunksWithTranscription` | *(called via `getChunksInWorkInfo`)* |
| `getChunksInWorkInfo()` | *(composite: calls `getWorkChunksWithTranscription` + `getCollationTablesActiveForWork`)* | `Chunk.tsx` |
| `getWitnessesForChunk()` | `/api/work/{id}/chunk/{n}/witnesses` | `Chunk.tsx` |
| `getCollationTablesForChunk()` | `/api/work/{id}/chunk/{n}/ctables` | `CollationTableInfoDivs.tsx` |
| `getCollationTablesActiveForWork()` | `/api/collationTable/active/forWork/{id}` | *(called via `getChunksInWorkInfo`)* |
| `collationTableAuto()` | `/api/collationTable/auto` | `AutomaticCollationTable.ts` |
| `collationTableConvertToEdition()` | `/api/collationTable/{id}/convertToEdition` | *(no usage found in pages/ReactAPM)* |
| `collationTableVersionInfo()` | `/api/collationTable/{id}/versionInfo/{ts}` | *(called via `getSingleChunkData`)* |
| `getSingleChunkData()` | `/api/collationTable/{id}/get/{ts}` | *(no direct usage found in pages/ReactAPM — likely used in EditionComposer)* |
| `getDocumentInfo()` | `/api/doc/{id}/info` | `Document.tsx` |
| `getPageInfo()` | `/api/page/{id}/info` | `WitnessTable.tsx` |
| `getRealDocId()` | `/api/doc/getId/{id}` | *(no usage found in pages/ReactAPM)* |
| `documentAllDocuments()` | `/api/docs/all` | `Docs.tsx` |
| `createDocument()` | `/api/doc/create` | `Docs.tsx` |
| `savePageSettings()` | `/api/page/{id}/update` | `DocPage.ts` |
| `userUpdateProfile()` | `/api/user/{id}/update` | *(used via `UserProfileEditorDialog.ts`)* |
| `userCreate()` | `/api/user/create/{id}` | *(used via `MakeUserDialog.ts`)* |
| `userMultiChunkEditions()` | `/api/user/{id}/multiChunkEditions` | `Dashboard.tsx` |
| `userCollationTables()` | `/api/user/{id}/collationTables` | `Dashboard.tsx` |
| `userTranscriptions()` | `/api/transcriptions/byUser/{id}/docPageData` | `Dashboard.tsx`, `PersonPage.ts` |
| `checkWitnessUpdates()` | `/api/witness/check/updates` | *(no usage found in pages/ReactAPM — likely EditionComposer)* |
| `getSiglaPresets()` | `/api/presets/sigla/get` | *(no usage found in pages/ReactAPM)* |
| `getAutomaticCollationPresets()` | `/api/presets/act/get` | `ChunkPage.ts` |
| `getPdfDownloadUrl()` | `/api/typeset/raw` | *(no usage found in pages/ReactAPM — likely EditionComposer)* |
| `getAvailablePageTypes()` | `/api/page/types` | `DocPage.ts` |
| `getAvailableLanguages()` | `/api/entity/{tLanguage}/entities` | `Chunk.tsx`, `Docs.tsx` |
| `getAvailableDocumentTypes()` | `/api/entity/{tDocumentType}/entities` | `Chunk.tsx`, `Docs.tsx` |
| `getAvailableImagesSources()` | `/api/entity/{tImageSource}/entities` | `Docs.tsx` |
| `getLegacySystemLanguagesArray()` | `/api/system/languages` | *(no usage found in pages/ReactAPM)* |
| `getEntityData()` | `/api/entity/{tid}/data` | `DocPage.ts`, `PersonPage.ts`, `Document.tsx`, `AdminEntity.tsx`, `Person.tsx` |
| `getEntityType()` | *(uses `getEntityData` internally)* | *(no direct usage found)* |
| `getEntityName()` | *(uses `getEntityData` internally)* | `DocPage.ts`, `ChunkPage.ts`, `EntityLink.tsx`, `GenericStatementEditor.tsx` |
| `getEntityNameFromCache()` | *(cache lookup only)* | `EntityLink.tsx` |
| `getEntityListForType()` | `/api/entity/{type}/entities` | `GenericStatementEditor.tsx`, `TypeData.tsx` |
| `getStatementQualificationObjects()` | `/api/entity/statementQualificationObjects/data` | `DocPage.ts`, `PersonPage.ts` |
| `getPredicateDefinitionsForType()` | `/api/entity/{type}/predicateDefinitionsForType` | `MetadataEditor.tsx`, `AdminEntity.tsx` |
| `getPredicateDefinition()` | `/api/entity/{predicate}/predicateDefinition` | `PredicateData.tsx` |
| `apiEntityStatementsEdit()` | `/api/entity/statements/edit` | `GenericStatementEditor.tsx`, `AdminEntity.tsx` |
| `getEditionSource()` | `/api/edition/source/get/{tid}` | *(no usage found in pages/ReactAPM)* |

---

### Part 2: Direct API Calls Bypassing ApmApiClient

These are places in `pages/`, `ReactAPM/`, and `EditionComposer/` where the API is called directly (via `$.post`, `$.get`, `$.getJSON`, or `fetch`) instead of through `ApmApiClient`.

#### `pages/PageViewer/PageViewer.js` (legacy JS)
| Line | Route | Method | Description |
|---|---|---|---|
| 134 | `apiGetNumColumns()` → `/api/{docId}/{page}/numcolumns` | `$.getJSON` | Get number of columns |
| 185 | `apiAddColumn()` → `/api/{docId}/{page}/newcolumn` | *(url assigned, likely posted)* | Add column |
| 219 | `apiTranscriptionsGetData()` → `/api/transcriptions/{doc}/{page}/{col}/get` | `$.getJSON` | Get transcription data |
| 265 | `apiTranscriptionsUpdateData()` → `/api/transcriptions/{doc}/{page}/{col}/update` | `$.post` | Save transcription |
| 288 | `apiTranscriptionsGetDataWithVersion()` → `/api/transcriptions/{doc}/{page}/{col}/get/version/{v}` | `$.getJSON` | Get versioned transcription |
| 345 | `apiUpdatePageSettings()` → `/api/page/{id}/update` | `$.post` | Update page settings |

#### `pages/DocPage.ts`
| Line | Route | Method | Description |
|---|---|---|---|
| 541 | `apiBulkPageSettings()` → `/api/page/bulkupdate` | `$.post` | Bulk update page settings |

#### `pages/AutomaticCollationTable/AutomaticCollationTable.ts`
| Line | Route | Method | Description |
|---|---|---|---|
| 321 | `apiCollationTable_save()` → `/api/collationTable/save` | `$.post` | Save collation table |

#### `pages/ChunkPage.ts`
| Line | Route | Method | Description |
|---|---|---|---|
| 218 | `apiWitnessGet()` → `/api/witness/get/{id}/html` | URL construction (used in link/fetch) | Get witness HTML |
| 292 | `apiWitnessToEdition()` → `/api/witness/{id}/to/edition` | `$.get` | Convert witness to edition |
| 534 | `apiWitnessGet()` → `/api/witness/get/{id}/full` | URL in `<a>` tag | Admin link to witness data |
| 923 | `apiDeletePreset()` → `/api/presets/delete/{id}` | `$.get` | Delete preset |

#### `pages/common/AutoCollTableSettingsForm.js` (legacy JS)
| Line | Route | Method | Description |
|---|---|---|---|
| 691 | `apiPostPresets()` → `/api/presets/post` | `$.post` | Save preset |
| 735 | `apiPostPresets()` → `/api/presets/post` | `$.post` | Save preset |
| 798 | `apiPostPresets()` → `/api/presets/post` | `$.post` | Save preset |

#### `pages/PersonPage.ts`
| Line | Route | Method | Description |
|---|---|---|---|
| 121 | `apiUserGetMultiChunkEditionInfo()` → `/api/user/{id}/multiChunkEditions` | `apiClient.get(urlGen...)` | Uses client's raw `get()` with manual URL |
| 131 | `apiUserGetCollationTableInfo()` → `/api/user/{id}/collationTables` | `apiClient.get(urlGen...)` | Uses client's raw `get()` with manual URL |

#### `ReactAPM/Pages/Search.tsx`
| Line | Route | Method | Description |
|---|---|---|---|
| 215–218 | `apiSearchTranscriptionTitles()`, `apiSearchTranscribers()`, `apiSearchEditors()`, `apiSearchEditionTitles()` | `fetch` | Fetch creator/title lists |
| 281 | `apiSearchKeyword()` → `/api/search/keyword` | `fetch` (POST) | Execute keyword search |

#### `EditionComposer/EditionComposer.ts`
| Line | Route | Method | Description |
|---|---|---|---|
| 685, 767 | `apiCollationTable_save()` → `/api/collationTable/save` | `$.post` | Save collation table |
| 807 | `apiWitnessGet()` → `/api/witness/get/{id}/standardData` | `$.get` | Get witness standard data |
| 940 | `apiGetPageInfo()` → `/api/pages/info` | `$.post` | Get page info (bulk) |
| 996 | `apiEditionSourcesGetAll()` → `/api/edition/sources/all` | `$.get` | Get all edition sources |
| 1024 | `apiSaveSiglaPreset()` → `/api/presets/sigla/save` | `$.post` | Save sigla preset |

---

### Part 3: API Routes with No ApmApiClient Method

These `urlGen` API methods exist but have **no corresponding wrapper** in `ApmApiClient`:

| urlGen Method | Route | Used Directly? |
|---|---|---|
| `apiAdminLog()` | `/api/admin/log` | Yes (EditionComposer) |
| `apiGetPageInfo()` | `/api/pages/info` | Yes (EditionComposer) |
| `apiTranscriptionsGetData()` | `/api/transcriptions/{doc}/{page}/{col}/get` | Yes (PageViewer) |
| `apiTranscriptionsGetDataWithVersion()` | `/api/transcriptions/{doc}/{page}/{col}/get/version/{v}` | Yes (PageViewer) |
| `apiTranscriptionsUpdateData()` | `/api/transcriptions/{doc}/{page}/{col}/update` | Yes (PageViewer) |
| `apiGetNumColumns()` | `/api/{docId}/{page}/numcolumns` | Yes (PageViewer) |
| `apiAddColumn()` | `/api/{docId}/{page}/newcolumn` | Yes (PageViewer) |
| `apiBulkPageSettings()` | `/api/page/bulkupdate` | Yes (DocPage) |
| `apiAddPages()` | `/api/doc/{docId}/addpages` | Not found |
| `apiCollationTable_save()` | `/api/collationTable/save` | Yes (AutomaticCollationTable, EditionComposer) |
| `apiCollationTable_activeEditions()` | `/api/collationTable/active/editions` | Not found |
| `apiGetMultiChunkEdition()` | `/api/edition/multi/get/{id}` | Not found in pages/ReactAPM |
| `apiSaveMultiChunkEdition()` | `/api/edition/multi/save` | Not found in pages/ReactAPM |
| `apiEditionSourcesGetAll()` | `/api/edition/sources/all` | Yes (EditionComposer) |
| `apiWitnessToEdition()` | `/api/witness/{id}/to/edition` | Yes (ChunkPage) |
| `apiWitnessGet()` | `/api/witness/get/{id}/{output}` | Yes (ChunkPage, EditionComposer) |
| `apiAutomaticEdition()` | `/api/edition/auto` | Not found |
| `apiGetPresets()` | `/api/presets/get` | Not found |
| `apiPostPresets()` | `/api/presets/post` | Yes (AutoCollTableSettingsForm) |
| `apiDeletePreset()` | `/api/presets/delete/{id}` | Yes (ChunkPage) |
| `apiSaveSiglaPreset()` | `/api/presets/sigla/save` | Yes (EditionComposer) |
| `apiSearchKeyword()` | `/api/search/keyword` | Yes (Search.tsx) |
| `apiSearchTranscribers()` | `/api/search/transcribers` | Yes (Search.tsx) |
| `apiSearchTranscriptionTitles()` | `/api/search/transcriptions` | Yes (Search.tsx) |
| `apiSearchEditors()` | `/api/search/editors` | Yes (Search.tsx) |
| `apiSearchEditionTitles()` | `/api/search/editions` | Yes (Search.tsx) |
| `apiPeopleSaveData()` | `/api/person/save` | Not found |
| `apiPeopleGetSchema()` | `/api/person/schema` | Not found |
| `apiPeopleGetNewId()` | `/api/person/newid` | Not found |
| `apiEntityGetSchema()` | `/api/entity/{type}/schema` | Not found |

---

### Summary & Recommendations

**Direct calls to migrate to ApmApiClient** (21 call sites across 7 files):
1. **`PageViewer.js`** — 5 direct jQuery calls (transcription CRUD, columns, page settings). Entire file is legacy JS.
2. **`EditionComposer.ts`** — 5 direct jQuery calls (save CT, witness data, page info, edition sources, sigla presets).
3. **`AutoCollTableSettingsForm.js`** — 3 direct jQuery calls (preset saving). Legacy JS.
4. **`ChunkPage.ts`** — 3 direct calls (witness get, witness-to-edition, delete preset).
5. **`DocPage.ts`** — 1 direct jQuery call (bulk page settings).
6. **`AutomaticCollationTable.ts`** — 1 direct jQuery call (save collation table).
7. **`Search.tsx`** — 6 direct `fetch` calls (all search endpoints). This is React code and should definitely use the client.

**Potentially unused API routes** (no frontend usage found at all):
- `/api/doc/{docId}/addpages`
- `/api/collationTable/active/editions`
- `/api/edition/auto`
- `/api/presets/get`
- `/api/person/save`
- `/api/person/schema`
- `/api/person/newid`
- `/api/entity/{type}/schema`

These may be used elsewhere (e.g., MultiChunkEdition page loaded dynamically, or other non-page JS modules), but they are candidates for removal investigation on the backend.
