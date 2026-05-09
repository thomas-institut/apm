# API Inventory

Date: 2026-05-04

| Entry Point | Description | Method | Authentication | Uses action | PHP Unit Test | PHP Input Schema | PHP Output Schema | ApiClient Method | TODO |
| ----------- | ----------- | ------ | -------------- | ----------- | ------------- | ---------------- | ----------------- | ---------------- | ---- |
| /api/login | Login | POST | none | no | no | yes | yes | yes |  |
| /api/edition/sources/all | Returns all defined edition sources. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/edition/source/get/{tid} | Returns a single edition source | GET | user token | no | no | TBD | TBD | TBD | change parameter tid to id |
| /api/edition/multi/get/{editionId}[/{timestamp}] | Return a multi-chunk edition by id and, optionally, timestamp | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/edition/multi/save | Saves a multi chunk edition | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/auto | Generates a collation table | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/save | Saves a collation table | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/active/editions | Returns a list of active editions | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/active/forWork/{workId} | Returns a list of active collation tables for a work | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/{tableId}/convertToEdition | Converts a collation table to an edition | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/{tableId}/get[/{timestamp}] | Returns a collation table by id | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/collationTable/{tableId}/versionInfo/{timestamp} | Returns version info for a collation table | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/witness/get/{witnessId}[/{outputType}[/{cache}]] | Returns witness by id with optional output type and cache flag | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/witness/check/updates | Checks for updates of a number of witnesses | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/witness/{witnessId}/to/edition | Creates an edition from a single witness | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/system/languages | Returns a list of all system languages and their names | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/whoami | Returns information about the authenticated API user. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/admin/log | Logs a message from the frontend to the backend's log | POST | user token | no | no | TBD | TBD | TBD | determine if this is still needed, or if it can be removed. |
| /api/person/all/dataForPeoplePage | Returns essential data for all people in the system. Used to populate the people page on the frontend. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/person/{tid}/data/essential | Returns essential data for a person by id. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/person/{tid}/works | Returns a list of works by a person by id. | GET | user token | no | no | TBD | TBD | TBD | change parameter tid to id |
| /api/person/create | Creates a new person entity in the system | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/user/{userTid}/update | Updates a user profile | POST | user token | no | no | TBD | TBD | TBD | change parameter userTid to userId |
| /api/user/create/{personTid} | Makes a user in the system | POST | user token | no | no | TBD | TBD | TBD | change parameter personTid to personId |
| /api/user/{userId}/collationTables | Returns the list of collation tables by a user | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/user/{userId}/multiChunkEditions | Returns the list of multi-chunk editions by a user | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/docs/all | Returns information about all documents in the system. Used to populate the documents page on the frontend. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/doc/getId/{docId} | Returns the entityId of a document from its legacy DB id. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/doc/{docId}/info[/{pageInfoToInclude}] | Returns information about a document with optional page information of different kinds | GET | user token | no | no | TBD | TBD | TBD | Try to get rid of the optional pageInfoToInclude parameter by using a different endpoint for page information. |
| /api/doc/create | Creates a new document entity in the system | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/doc/{id}/addpages | Adds pages to a document | POST | user token | no | no | TBD | TBD | TBD | support adding pages in the middle of the document, not just at the end. |
| /api/{document}/{page}/numcolumns | Gets the number of columns in a page | GET | user token | no | no | TBD | TBD | TBD | Get rid of this endpoint, the number of columns can be found from the page/{pageId}/info endpoint. |
| /api/page/types | Returns the page types defined in the system and their names. | GET | user token | no | no | TBD | TBD | TBD | move to 'api/system/pageTypes' |
| /api/page/{pageId}/update | Update the information of a single page | POST | user token | no | no | TBD | TBD | TBD | remove this endpoint since the bulk update endpoint can do exactly the same thing. |
| /api/page/bulkupdate | Updates the information of multiple pages | POST | user token | yes | no | TBD | TBD | TBD | candidate for a refactor so as to make it the only page update endpoint in the system. May require work in the backend though. |
| /api/{document}/{page}/newcolumn | Adds a new column to a page | GET | user token | no | no | TBD | TBD | TBD | change this endpoint to take a pageId instead of a documentId and a pageNumber.; determine if this endpoint is still needed, adding a column can easily be done with a page update |
| /api/page/{pageId}/info | Get info about a page | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/pages/info | Gets information about a several pages at the same time | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/entity/statementQualificationObjects/data | Returns the entity data for all entities that can be used as qualifications in a statement | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/entity/statementQualificationObjects | Returns the entity ids for all entities that can be used as qualifications in a statement | GET | user token | no | no | TBD | TBD | TBD | merge with the above endpoint since the difference is only whether data or ids is returned. |
| /api/entity/{entityType}/entities | Returns all entities of a given type. | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/entity/{id}/predicateDefinitionsForType | Returns predicate definition for a given entity type | GET | user token | no | no | TBD | TBD | TBD | change parameter id to typeOrEntityId |
| /api/entity/{id}/predicateDefinition | Returns the definition of a predicate | GET | user token | no | no | TBD | TBD | TBD | change parameter id to predicateId |
| /api/entity/{tid}/data | Returns the entity data for an entity | GET | user token | no | no | TBD | TBD | TBD | change parameter tid to entityId |
| /api/entity/statements/edit | Executes a list of statement edition commands | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/entity/nameSearch/{inputString}/{typeList} | Returns matching entities for a given entity type and a search string | GET | user token | no | no | TBD | TBD | TBD | move this to 'api/search', rename to something like 'api/search/entitiesByTypeName' |
| /api/presets/get | Returns a preset | POST | user token | no | no | TBD | TBD | TBD | can't this be a simple GET request? (Issue #321) |
| /api/presets/delete/{id} | Deletes a preset | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/presets/sigla/get | Returns a sigla preset | POST | user token | no | no | TBD | TBD | TBD | can't this be a simple GET request? (Issue #321) |
| /api/presets/sigla/save | Saves a sigla preset | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/presets/act/get | Returns an automatic collation preset | POST | user token | no | no | TBD | TBD | TBD | can't this be a simple GET request? (Issue #321) |
| /api/presets/post | Saves a preset | POST | user token | no | no | TBD | TBD | TBD | this should be renamed to 'api/preset/save' and perhaps merge all other saves into it (Issue #321) |
| /api/images/mark/{size} | Create API image routes | GET | user token | no | no | TBD | TBD | TBD | Find a way to generate images in the frontend and get rid of this (Issue #322) |
| /api/images/nowb/{size} | Returns a no word break image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/illegible/{size}/{length} | Returns an 'illegible' image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/chunkmark/{dareid}/{chunkno}/{lwid}/{segment}/{type}/{dir}/{size} | Returns a chunk mark image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/chaptermark/{work}/{level}/{number}/{type}/{dir}/{size} | Returns a chapter mark image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/linegap/{count}/{size} | Returns a line gap image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/charactergap/{length}/{size} | Returns a character gap image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/images/paragraphmark/{size} | Returns a paragraph mark image | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/search/keyword | Searches for a keyword | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/search/transcriptions | Searches in transcriptions | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/search/transcribers | Returns a list of transcribers | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/search/editions | Returns a list of edition titles | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/search/editors | Returns a list of editors | POST | user token | no | no | TBD | TBD | TBD |  |
| /api/transcriptions/byUser/{userTid}/docPageData | Returns transcribed pages by user | GET | user token | no | no | TBD | TBD | TBD | change parameter userTid to userId, docPageData to something more meaningful |
| /api/transcriptions/{document}/{page}/{column}/get | Returns the transcription for a given document, page and column | GET | user token | no | no | TBD | TBD | TBD | shouldn't this be by pageId and column? |
| /api/transcriptions/{document}/{page}/{column}/get/version/{version} | Returns a transcription by pageId and column and version | GET | user token | no | no | TBD | TBD | TBD | merge with previous route |
| /api/transcriptions/{document}/{page}/{column}/update | Updates/saves a transcription | POST | user token | no | no | TBD | TBD | TBD | change handler name to saveTranscription or something like that, updateElements is not good |
| /api/works/all | Returns all works with transcriptions in the system | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/work/{workId}/old-info | Returns legacy work information | GET | user token | no | no | TBD | TBD | TBD | get rid of this (Issue #323) |
| /api/work/{workId}/data | Get work data | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/work/{workId}/chunk/{chunkNumber}/witnesses | Returns witnesses by work and chunk number | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/work/{workId}/chunk/{chunkNumber}/ctables | Returns collation tables (and editions) by work and chunk number | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/work/{workId}/chunksWithTranscription | Returns chunks with transcription by work | GET | user token | no | no | TBD | TBD | TBD |  |
| /api/works/authors | Returns authors for a work | GET | user token | no | no | TBD | TBD | TBD | is this necessary? What is an author here? |
| /api/typeset/raw | Typesets a document into a PDF | POST | user token | no | no | TBD | TBD | TBD | rename to 'typeset/toPDF' |
