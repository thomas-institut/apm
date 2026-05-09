
### API Routes: Backend Data Structures vs. Frontend TypeScript Interfaces

---

### Legend

- **Data serving method**: How the PHP handler builds the response — `exportObject` (class with `getExportObject()`), `get_object_vars` (plain class → array), `DataSchema class` (dedicated PHP response class), `ad-hoc array` (inline array literal), `raw data` (pass-through from manager/cache)
- **TS interface**: The TypeScript interface in `src/www/js/Api/DataSchema` or `ApmApiClient.ts`
- **Status**: ✅ = matches, ⚠️ = minor inconsistency, ❌ = significant mismatch or missing

---

### Route-by-Route Analysis

#### System / Auth

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/login` | `Authenticator::apiLogin` | ad-hoc `{status, message, token, ttl}` | None | ❌ No TS interface | No PHP DataSchema class either |
| `GET /api/whoami` | `ApiSystem::whoAmI` | `UserData.getExportObject()` + ad-hoc fields (`name`, `email`, `isRoot`, `manageUsers`, `tidString`) | None in DataSchema | ❌ No TS interface | Hybrid: exportObject with extra fields bolted on. No PHP class for this response shape |
| `GET /api/system/languages` | `ApiSystem::getSystemLanguages` | raw config array | `LanguageInfo` / `LanguageInfoObject` | ⚠️ | TS interface has `totalWitnesses`, `validWitnesses`, `normalizerData` which may not be in the config array |

#### People

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/person/{tid}/data/essential` | `ApiPeople::getPersonEssentialData` | `PersonEssentialData.getExportObject()` | `PersonEssentialData` in `ApiPeople.ts` | ✅ Match | PHP class has same fields as TS interface |
| `GET /api/person/all/dataForPeoplePage` | `ApiPeople::getAllPeopleDataForPeoplePage` | ad-hoc array `{tid, name, sortName, dateOfBirth, dateOfDeath, isUser, mergedInto}` | `AllPeopleDataForPeoplePageItem` in `ApiPeople.ts` | ✅ Match | No PHP DataSchema class, but TS interface matches the ad-hoc structure |
| `GET /api/person/{tid}/works` | `ApiPeople::getWorksByPerson` | ad-hoc `{tid, works}` where works = `ExportableObject::getArrayExportObject(WorkData[])` | `ApiPersonWorksResponse` in `ApiPerson.ts` | ✅ Match | `WorkData.getExportObject()` matches `ApiPersonWorksWorkData` |
| `POST /api/person/create` | `ApiPeople::personCreate` | raw int (newPersonId) | None | ❌ No TS interface | Returns bare integer |

#### Users

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/user/{userTid}/update` | `ApiUsers::userUpdateProfile` | status response only | None needed | — | |
| `POST /api/user/create/{personTid}` | `ApiUsers::userCreate` | status response only | None needed | — | |
| `GET /api/user/{userId}/collationTables` | `ApiUsers::userCollationTables` | ad-hoc `{tableInfo: [...], workInfo: {...}}` | `ApiUserCollationTables` in `ApiUserCollationTables.ts` | ⚠️ | PHP `workInfo` entries include `author_name` (snake_case) — TS `WorkInfo` has `author_name` too, so it matches, but naming is inconsistent with project conventions |
| `GET /api/user/{userId}/multiChunkEditions` | `ApiUsers::userMultiChunkEditions` | raw from `MultiChunkEditionManager` | `ApiUserMultiChunkEdition` in `ApiUserMultiChunkEdition.ts` | ⚠️ | No PHP DataSchema class; depends on what manager returns |
| `GET /api/transcriptions/byUser/{userTid}/docPageData` | `ApiUsers::getTranscribedPages` | ad-hoc `{docIds, docInfoArray, pageInfoArray}` where docInfoArray contains `DocInfo` objects (via `get_object_vars` implicitly through json_encode) and pageInfoArray contains `PageInfo` objects | `ApiUserTranscriptions` in `ApiUserTranscriptions.ts` | ⚠️ | `UserTranscriptionsDocInfo` has `pageIds` field added dynamically in PHP. `LegacyPageInfo` matches `PageInfo` PHP class fields |

#### Documents & Pages

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/docs/all` | `ApiDocuments::allDocumentsData` → `SiteDocuments::getAllDocumentsData` | ad-hoc array per doc: `{numPages, numTranscribedPages, transcribers, docInfo (legacy), id}` | `DocumentData` in `ApiDocuments.ts` | ⚠️ | TS `DocumentData.docInfo` expects `{id, title, doc_type, lang}` — PHP `getLegacyDocInfo` returns `{id, tid, title, lang, doc_type, image_source, image_source_data, deep_zoom}` — extra fields in PHP. Also PHP adds `id` at top level which TS doesn't have |
| `GET /api/doc/{docId}/info` | `ApiDocuments::getDocumentInfo` | `get_object_vars(DocInfo)` + optional `pageInfoArray` of `get_object_vars(PageInfo)` | `DocInfo` in `ApiDocuments.ts` | ✅ Match | PHP `DocInfo` fields match TS `DocInfo`. Note: PHP has deprecated `tid` field not in TS |
| `GET /api/doc/getId/{docId}` | `ApiDocuments::getDocId` | ad-hoc `{givenDocId, docId}` | None | ❌ No TS interface | |
| `POST /api/doc/create` | `ApiDocuments::createDocument` | raw int (newDocId) | None | ❌ No TS interface | Returns bare integer |
| `GET /api/page/{pageId}/info` | `ApiDocuments::getPageInfo` | `get_object_vars(PageInfo)` | `PageInfo` in `ApiDocuments.ts` | ✅ Match | PHP `PageInfo` fields match TS `PageInfo` |
| `GET /api/page/types` | `ApiDocuments::getPageTypes` | raw from system | None in DataSchema | ❌ No TS interface | |
| `POST /api/page/{pageId}/update` | `ApiDocuments::updatePageSettings` | status response | None needed | — | |
| `POST /api/page/bulkupdate` | `ApiDocuments::updatePageSettingsBulk` | status response | None needed | — | |
| `GET /api/{doc}/{page}/numcolumns` | `ApiDocuments::getNumColumns` | raw int | None | — | Simple value |
| `GET /api/{doc}/{page}/newcolumn` | `ApiDocuments::addNewColumn` | raw int (numColumns) | None | — | Simple value |
| `POST /api/pages/info` | `ApiDocuments::getPageInfoBulk` | ad-hoc array `[{id, docId, pageNumber, seq, numCols, foliation}]` | None | ❌ No TS interface | Also note: field names differ from `PageInfo` (e.g., `seq` vs `sequence`) |

#### Works

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/works/all` | `ApiWorks::allWorksData` → `SiteWorks::getAllWorksData` | ad-hoc keyed by workId: `{workId, isValid, entityId, authorId, title, shortTitle, chunks: [{n, tx, ed, ct}]}` | `ApiWorksAll` in `ApiWorks.ts` | ✅ Match | TS matches the ad-hoc structure. No `enabled` field in PHP (unlike `WorkData`). No PHP DataSchema class |
| `GET /api/work/{workId}/old-info` | `ApiWorks::getWorkInfoOld` | ad-hoc `{id, tid, dare_id, author_tid, title, short_title, enabled, author_name}` | None in DataSchema | ❌ No TS interface | Legacy snake_case naming |
| `GET /api/work/{workId}/data` | `ApiWorks::getWorkData` | `WorkData.getExportObject()` | `WorkData` in `ApiWorks.ts` | ✅ Match | PHP `WorkData` fields match TS `WorkData` |
| `GET /api/work/{workId}/chunksWithTranscription` | `ApiWorks::getChunksWithTranscription` | ad-hoc `{workId, chunks}` | `ApiChunksWithTranscription` in `ApiWorks.ts` | ✅ Match | |
| `GET /api/works/authors` | `ApiWorks::getAuthorList` | raw from `WorkManager::getAuthors()` | None | ❌ No TS interface | |

#### Witnesses

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/work/{workId}/chunk/{n}/witnesses` | `ApiWitness::getWitnessesForChunk` | raw from `TranscriptionManager` | `WitnessInfo` in `WitnessInfo.ts` | ⚠️ | No PHP DataSchema class; depends on what manager returns |
| `GET /api/work/{workId}/chunk/{n}/ctables` | `ApiWitness::getCollationTablesForChunk` | ad-hoc array `[{workId, chunkNumber, tableId, authorId, lastSave, title, type}]` | `ChunkCollationTableInfo` in `ApiWorks.ts` | ✅ Match | |
| `GET /api/witness/get/{id}[/{output}]` | `ApiWitness::getWitness` → `getFullTxWitness` | ad-hoc: witness data + bolted-on fields (`standardData`, `witnessId`, `segments`, `html`, `apiStatus`, `cached`, etc.) | None in DataSchema | ❌ No TS interface | Complex ad-hoc structure, varies by outputType |
| `POST /api/witness/check/updates` | `ApiWitness::checkWitnessUpdates` | **PHP DataSchema class** `WitnessUpdateData` containing `WitnessUpdateInfo[]` | `WitnessUpdateData` / `WitnessUpdateInfo` in `WitnessUpdates.ts` | ⚠️ | TS has `justUpdated` field not in PHP class. PHP `WitnessUpdateInfo` lacks `justUpdated` |
| `GET /api/witness/{id}/to/edition` | `ApiCollationTable::convertWitnessToEdition` | ad-hoc `{status, witnessId, lang, tableId}` | None | ❌ No TS interface | |

#### Collation Tables

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/collationTable/auto` | `ApiCollationTable::auto` | **PHP DataSchema class** `ApiCollationTable_auto` | `ApiCollationTableAuto` in `ApiCollationTable.ts` | ⚠️ | TS has `collationTableCacheId` not in PHP class. PHP `people` is `array`, TS is `PeopleInfoObject` with `name` field not served by PHP (PHP only has `fullName`, `shortName`) |
| `POST /api/collationTable/save` | `ApiCollationTable::save` | ad-hoc `{status, tableId, versionInfo}` | None | ❌ No TS interface | |
| `GET /api/collationTable/active/forWork/{id}` | `ApiCollationTable::activeForWork` | raw from `CollationTableManager` | None in DataSchema | ❌ No TS interface | |
| `POST /api/collationTable/{id}/convertToEdition` | `ApiCollationTable::convertToEdition` | ad-hoc `{status, tableId, url}` | `ApiCollationTableConvertToEdition` in `ApiCollationTable.ts` | ✅ Match | |
| `GET /api/collationTable/{id}/get[/{ts}]` | `ApiCollationTable::get` | ad-hoc `{ctData, ctInfo, timeStamp, versions, authorTid, versionId, isLatestVersion, docInfo}` | `SingleChunkApiData` in `ApiCollationTable.ts` | ⚠️ | TS `ctInfo` is typed as `CtInfo[]` but PHP returns a single object. TS has `versionId` but PHP field name matches. `docInfo` structure matches `DocInfoInSingleChunkApiData` |
| `GET /api/collationTable/{id}/versionInfo/{ts}` | `ApiCollationTable::versionInfo` | **PHP DataSchema class** `ApiCollationTable_versionInfo` | `ApiCollationTableVersionInfo` in `ApiCollationTable.ts` | ✅ Match | Both PHP and TS have same fields |
| `GET /api/collationTable/active/editions` | `ApiCollationTable::activeEditions` | ad-hoc array with `lastVersion` added | `ApiCollationTableInfo` in `ApiCollationTable.ts` | ⚠️ | Not used in frontend currently |

#### Entity

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/entity/{tid}/data` | `ApiEntity::getEntityData` | raw `EntityData` from entity system (implements `JsonSerializable`) | `EntityDataInterface` in `ApiEntity.ts` | ✅ Match | |
| `GET /api/entity/{type}/entities` | `ApiEntity::getEntitiesForType` | raw int array (entity IDs) | None | — | Simple array of ints |
| `GET /api/entity/statementQualificationObjects/data` | `ApiEntity::getValidQualificationObjects` | raw from entity system | None | ❌ No TS interface | |
| `GET /api/entity/{id}/predicateDefinitionsForType` | `ApiEntity::getPredicateDefinitionsForType` | ad-hoc `{type, predicatesAllowedAsSubject, predicatesAllowedAsObject, predicateDefinitions, qualificationDefinitions}` | `PredicateDefinitionsForType` in `ApiEntity.ts` | ✅ Match | |
| `GET /api/entity/{id}/predicateDefinition` | `ApiEntity::getPredicateDefinition` | raw from entity system | `PredicateDefinitionInterface` in `ApiEntity.ts` | ✅ Match | |
| `POST /api/entity/statements/edit` | `ApiEntity::statementEdition` | ad-hoc `{success, errorCode, errorMessage, timestamp, commandResults}` | `StatementEditResponse` in `ApiEntity.ts` | ⚠️ | PHP returns `timestamp` (int), TS types it as `string?`. PHP `commandResults` items have varying shapes; TS `StatementEditResult` expects `statementId` always present but PHP cancel results have it, create results have `newStatementId` instead |

#### Presets

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/presets/act/get` | `ApiPresets::getAutomaticCollationPresets` | ad-hoc `{presets: [{userId, userName, presetId, title, data}]}` | `ApiAutomaticCollationTablePreset` in `ApiPresets.ts` | ✅ Match | |
| `POST /api/presets/sigla/get` | `ApiPresets::getSiglaPresets` | ad-hoc `{presets: [{userId, userName, presetId, title, data}]}` | `ApiSiglaPreset` in `ApiPresets.ts` | ⚠️ | PHP includes `userName` but TS `ApiSiglaPreset` does not have `userName` |
| `POST /api/presets/sigla/save` | `ApiPresets::saveSiglaPreset` | ad-hoc `{presetId}` | None | — | Simple response |
| `POST /api/presets/post` | `ApiPresets::savePreset` | ad-hoc `{presetId}` | None | — | Simple response |
| `GET /api/presets/delete/{id}` | `ApiPresets::deletePreset` | ad-hoc `{presetId}` | None | — | Simple response |

#### Search

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/search/keyword` | `ApiSearch::search` | ad-hoc `{index, searched_phrase, lemmatize, lemmata, lang, corpus, keywordDistance, tokensForQuery, query, queryPage, queryFinished, serverTime, status}` | None | ❌ No TS interface | Complex response, no PHP DataSchema class |
| `GET /api/search/transcriptions` | `ApiSearch::getTranscriptionTitles` | ad-hoc `{transcriptions: string[], serverTime, status}` | None | ❌ No TS interface | |
| `GET /api/search/transcribers` | `ApiSearch::getTranscribers` | ad-hoc `{transcribers: string[], serverTime, status}` | None | ❌ No TS interface | |
| `GET /api/search/editions` | `ApiSearch::getEditionTitles` | ad-hoc `{editions: string[], serverTime, status}` | None | ❌ No TS interface | |
| `GET /api/search/editors` | `ApiSearch::getEditors` | ad-hoc `{editors: string[], serverTime, status}` | None | ❌ No TS interface | |

#### Edition Sources

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/edition/sources/all` | `ApiEditionSources::getAllSources` | raw from manager | None | ❌ No TS interface | |
| `GET /api/edition/source/get/{tid}` | `ApiEditionSources::getSourceByTid` | raw from manager | None | ❌ No TS interface | |

#### Transcriptions

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/transcriptions/{doc}/{page}/{col}/get` | `ApiElements::getElementsByDocPageCol` | ad-hoc `{elements, ednotes, people, info: {col, docId, pageId, lang, numCols, versions, thisVersion}}` | None | ❌ No TS interface | Complex legacy structure |
| `POST /api/transcriptions/{doc}/{page}/{col}/update` | `ApiElements::updateElementsByDocPageCol` | status/error response | None needed | — | |

#### Typesetting

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `GET /api/typeset/raw` | `ApiTypesetPdf::generatePDF` | ad-hoc `{url}` or `{errorMsg}` | `PdfUrlResponse` in `ApiPdfUrlResponse.ts` | ⚠️ | TS expects `{url: string|null, errorMsg?: string}`, PHP returns `{url: ...}` on success or `{errorMsg: ...}` on error — not always both fields present |

#### Admin

| Route | Handler | Data Method | TS Interface | Status | Notes |
|---|---|---|---|---|---|
| `POST /api/admin/log` | `ApiLog::frontEndLog` | status response | None needed | — | |

---

### Duplicate Interfaces

| Interface Name | Location 1 | Location 2 | Notes |
|---|---|---|---|
| `DocInfo` | `ApiDocuments.ts` (line 24) | `WitnessInfo.ts` (line 34) | **Different shapes!** `WitnessInfo.ts` version has `tid` field; `ApiDocuments.ts` version does not. Both are exported. This is a real conflict. |
| `DocInfoData` | `Document.tsx` (line 15) | — | Local component interface wrapping `DocInfo` + `EntityData`, not a duplicate per se |
| `WitnessUpdateData` / `WitnessUpdateInfo` | `WitnessUpdates.ts` | Also in `ApiCollationTable.ts` (not duplicated, but `justUpdated` field in TS not in PHP) | |

---

### Summary of Issues

#### Routes with NO TS interface at all (need new interfaces in `DataSchema/`)
1. `/api/login` — needs `ApiLoginResponse`
2. `/api/whoami` — needs `ApiWhoAmI`
3. `/api/work/{id}/old-info` — needs `ApiWorkInfoOld` (or deprecate route)
4. `/api/works/authors` — needs `ApiAuthorList`
5. `/api/witness/get/{id}/{output}` — needs `ApiWitnessData`
6. `/api/witness/{id}/to/edition` — needs `ApiWitnessToEdition`
7. `/api/collationTable/save` — needs `ApiCollationTableSaveResponse`
8. `/api/collationTable/active/forWork/{id}` — needs interface
9. `/api/entity/statementQualificationObjects/data` — needs interface
10. `/api/search/keyword` — needs `ApiSearchKeywordResponse`
11. `/api/search/transcriptions`, `/transcribers`, `/editions`, `/editors` — needs `ApiSearchStringArrayResponse`
12. `/api/edition/sources/all` and `/get/{tid}` — needs `ApiEditionSource`
13. `/api/transcriptions/{doc}/{page}/{col}/get` — needs `ApiTranscriptionData`
14. `/api/pages/info` (bulk) — needs `ApiPageInfoBulkItem`
15. `/api/doc/getId/{docId}` — needs `ApiDocIdResponse`
16. `/api/page/types` — needs interface

#### Routes with NO PHP DataSchema class (need structured PHP classes)
Almost all routes use ad-hoc arrays or `get_object_vars()`. Only 3 routes have proper PHP DataSchema classes:
- `/api/collationTable/auto` → `ApiCollationTable_auto`
- `/api/collationTable/{id}/versionInfo/{ts}` → `ApiCollationTable_versionInfo`
- `/api/witness/check/updates` → `WitnessUpdateData` / `WitnessUpdateInfo`

All other routes need PHP DataSchema classes created.

#### Inconsistencies between PHP and TS
1. **`/api/collationTable/auto`**: TS `ApiCollationTableAuto` has `collationTableCacheId` not in PHP. TS `AutoCTablePersonInfo` has `name` field not served by PHP.
2. **`/api/witness/check/updates`**: TS `WitnessUpdateInfo` has `justUpdated: boolean` not in PHP `WitnessUpdateInfo`.
3. **`/api/collationTable/{id}/get`**: TS `SingleChunkApiData.ctInfo` typed as `CtInfo[]` but PHP returns single object.
4. **`/api/entity/statements/edit`**: TS `timestamp` typed as `string?` but PHP returns `int`. TS `StatementEditResult` expects `statementId` but PHP create results return `newStatementId`.
5. **`/api/presets/sigla/get`**: PHP returns `userName` in preset items, TS `ApiSiglaPreset` lacks `userName`.
6. **`/api/docs/all`**: PHP `getLegacyDocInfo` returns more fields than TS `DocumentData.docInfo` expects.
7. **`DocInfo` duplicate**: Two different `DocInfo` interfaces in `ApiDocuments.ts` and `WitnessInfo.ts` with different shapes.
8. **`/api/typeset/raw`**: PHP doesn't always return both `url` and `errorMsg` fields together.

#### Naming inconsistencies
- PHP `ApiCollationTable_auto` and `ApiCollationTable_versionInfo` use snake_case class names — should be PascalCase
- Some PHP responses use snake_case keys (`author_name`, `dare_id`, `short_title`, `doc_type`) while others use camelCase
- `/api/work/{id}/old-info` response is entirely snake_case legacy format

