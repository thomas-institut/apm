<?php

namespace APM\System\Search;

use APM\System\Document\PageInfo;
use APM\System\Search\Exception\SearchManagerException;

interface SearchManagerInterface
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
     * Returns an array with the names of the people who have transcriptions in
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
}