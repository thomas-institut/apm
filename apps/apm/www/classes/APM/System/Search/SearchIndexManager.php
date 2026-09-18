<?php

namespace APM\System\Search;

use APM\System\Document\PageInfo;
use APM\System\Search\Exception\SearchManagerException;

interface SearchIndexManager
{
    /**
     * Indexes the transcription of a column in the search engine.
     *
     * @param PageInfo $pageInfo
     * @param int $col
     * @param string $docTitle
     * @param string $transcriptionText
     * @param string $langCode
     * @param string $transcriberName
     * @param string $timeFrom
     * @return void
     * @throws SearchManagerException
     */
    public function indexTranscription(PageInfo $pageInfo, int $col,
                                       string   $docTitle, string $transcriptionText, string $langCode,
                                       string   $transcriberName, string $timeFrom) : void;


    /**
     * @param int $tableId
     * @param string $chunk
     * @param string $title
     * @param string $langCode
     * @param string $editionText
     * @param string $editorName
     * @param string $timeFrom
     * @return void
     * @throws SearchManagerException
     */
    public function indexEdition(int $tableId, string $chunk, string $title, string $langCode,
                                 string $editionText, string $editorName,  string $timeFrom): void;

    /**
     * Returns an array with the names of the people who have indexed transcriptions in
     * the system.
     *
     * @return string[]
     */
    public function getTranscriberNames(): array;

    /**
     * Returns an array with the names of the people who have editions in
     * the system.
     *
     * @return string[]
     */
    public function getEditors(): array;

    /**
     * Returns an array with the titles of all documents transcribed in
     * the system.
     *
     * @return string[]
     */
    public function getTranscribedDocuments() : array;

    /**
     * Returns an array with the titles of all the editions in the
     * system.
     *
     * @return string[]
     */
    public function getEditionTitles() : array;


    /**
     * Resets the search index.
     *
     * After running this method, the search index will be empty.
     *
     * @param IndexType $indexType
     * @return void
     */
    public function resetIndex(IndexType $indexType) : void;


    /**
     * Deletes a transcription from the search index if it matches the given docId, pageNumber, column and timeFrom
     *
     * If timeFrom is null, the transcription will be deleted regardless of the timeFrom field.
     *
     * No error is thrown if the transcription does not exist in the search index.
     *
     * @param int $docId
     * @param int $pageNumber
     * @param int $column
     * @param string|null $timeFrom
     * @return void
     */
    public function deleteTranscriptionFromIndex(int $docId, int $pageNumber, int $column, ?string $timeFrom = null) : void;

    /**
     * Deletes an edition from the search index if it matches the given tableId and timeFrom
     *
     * If timeFrom is null, the edition will be deleted regardless of the timeFrom field
     *
     * No error is thrown if the edition does not exist in the search index.
 *
     * @param int $tableId
     * @param string|null $timeFrom
     * @return void
     */
    public function deleteEditionFromIndex(int $tableId, ?string $timeFrom = null) : void;


    /**
     * Updates an edition in the search index.
     *
     * Queries the system for the latest version of the edition and updates the index if the edition has been modified
     * since the last update. If the edition is not found in the search index, it creates a new entry.
     *
     * If $forceUpdate is true, the edition is updated even if there are no changes in the system.
     *
     * @param int $tableId
     * @param bool $forceUpdate
     * @return void
     */
    public function updateEditionInIndex(int $tableId, bool $forceUpdate = false) : void;


    /**
     * Updates an edition in the search index.
     *
     * Checks the system for the latest version of the edition and update the index if the transcription has been
     * modified since the last update. If the transcription is not found in the search index, it creates a new entry.
     *
     * If $forceUpdate is true, the transcription is updated even if there are no changes in the system.
     *
     * @param int $docId
     * @param int $pageNumber
     * @param int $column
     * @param bool $forceUpdate
     * @return void
     */
    public function updateTranscriptionInIndex(int $docId, int $pageNumber, int $column, bool $forceUpdate = false) : void;


    /**
     * Compares the index with the system and updates the index if necessary.
     *
     * Performs up to $updateCountLimit updates. If $updateCountLimit is 0, all updates are performed.
     *
     * @param IndexType $indexType
     * @param int $updateCountLimit
     * @return UpdateIndexResult
     */
    public function updateIndex(IndexType $indexType, int $updateCountLimit = 0): UpdateIndexResult;

}