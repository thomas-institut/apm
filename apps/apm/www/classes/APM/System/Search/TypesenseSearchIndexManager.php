<?php

namespace APM\System\Search;

use APM\CollationTable\CollationTableManager;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Cache\CacheKey;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Document\PageInfo;
use APM\System\LanguageManager;
use APM\System\Lemmatizer\LemmatizationResult;
use APM\System\Lemmatizer\LemmatizerInterface;
use APM\System\Search\Exception\SearchManagerException;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\ColumnVersionInfo;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Transcription\TxText\Item;
use APM\System\Work\WorkManager;
use APM\System\Work\WorkNotFoundException;
use Http\Client\Exception;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAwareTrait;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use Typesense\Client;
use Typesense\Exceptions\TypesenseClientError;

class TypesenseSearchIndexManager implements SearchIndexManager, LoggerAwareInterface, CacheAware
{

    use LoggerAwareTrait;
    use SimpleCacheAwareTrait;

    const string TranscriptionIndexPrefix = 'transcriptions';
    const string EditionIndexPrefix = 'editions';


    const array LanguageCodes = ['ar', 'he', 'la'];
    const int StringArrayTtl = 3 * 24 * 3600; // 3 days

    public function __construct(
        private readonly Client $typesenseClient,
        SystemMainDataCache     $dataCache,
        LoggerInterface         $logger,
        private readonly DocumentManager $documentManager,
        private readonly TranscriptionManager $transcriptionManager,
        private readonly ApmEntitySystemInterface $entitySystem,
        private readonly CollationTableManager $collationTableManager,
        private readonly WorkManager $workManager,
        private readonly LemmatizerInterface $lemmatizer,
        private readonly LanguageManager $languageManager,
    )
    {
        $this->logger = $logger;
        $this->setCache($dataCache);
    }

    private function getTypesenseClient(): Client
    {
        return $this->typesenseClient;
    }

    /**
     * @inheritDocdeleteTranscriptionFromIndex(docId: int, pageNumber: int, column: int, [timeFrom: null|string = null]): void
     */
    public function indexTranscription(PageInfo $pageInfo, int $col,
                                       string   $docTitle, string $transcriptionText, string $langCode,
                                       string   $transcriberName, string $timeFrom): void
    {
        $indexName = $this->getIndexName(IndexType::Transcriptions, $langCode);
        $cleanTranscriptionText = $this->encodeForLemmatization($transcriptionText);

        $lemmatizationResult = new LemmatizationResult();

        // tokenization and lemmatization
        if (strlen($cleanTranscriptionText) > 3) {
            $lemmatizationResult = $this->lemmatizer->lemmatize($cleanTranscriptionText, $langCode);
        } else {
            $this->logger->debug("Transcription is too short for lemmatization...");
        }

        try {
            $this->getTypesenseClient()->collections[$indexName]->documents->create([
                'title' => $docTitle,
                'page' => $pageInfo->pageNumber,
                'seq' => $pageInfo->sequence,
                'foliation' => $pageInfo->foliation,
                'column' => (string)$col,
                'pageID' => (string)$pageInfo->pageId,
                'docID' => $pageInfo->docId,
                'lang' => $langCode,
                'creator' => $transcriberName,
                'transcription_tokens' => $lemmatizationResult->tokens,
                'transcription_lemmata' => $lemmatizationResult->lemmata,
                'time_from' => $timeFrom
            ]);
            $this->logger->debug("Indexed transcription in $indexName: Doc $pageInfo->docId ('$docTitle')" .
                ", page no. $pageInfo->pageNumber (seq $pageInfo->sequence, fol. '$pageInfo->foliation', id $pageInfo->pageId), col $col" .
                ", transcriber '$transcriberName', lang '$langCode', timeFrom '$timeFrom'");
        } catch (Exception|TypesenseClientError $e) {
            $this->logger->error("Error creating transcription entry in index $indexName: " . $e->getMessage());
        }
    }

    private function encodeForLemmatization(string $text): string
    {

        $text_clean = str_replace("\n", " ", $text);
        $text_clean = str_replace(' ', ' ', $text_clean);
        $text_clean = str_replace(' ', ' ', $text_clean);
        return str_replace('- ', '', $text_clean);
    }

    /**
     * @inheritDoc
     */
    public function indexEdition(int $tableId, string $chunk, string $title, string $langCode, string $editionText, string $editorName, string $timeFrom): void
    {
        $indexName = $this->getIndexName(IndexType::Editions, $langCode);

        // encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $cleanText = $this->encodeForLemmatization($editionText);

        // tokenization and lemmatization
        // test existence of text and tokenize/lemmatize existing texts
        $lemmatizationResult = new LemmatizationResult();
        if (strlen($cleanText) > 3) {
            $lemmatizationResult = $this->lemmatizer->lemmatize($cleanText, $langCode);
        } else {
            $this->logger->debug("Text is too short for lemmatization...");
        }


        try {
            $this->getTypesenseClient()->collections[$indexName]->documents->create([
                'table_id' => (string)$tableId,
                'chunk' => $chunk,
                'creator' => $editorName,
                'title' => $title,
                'lang' => $langCode,
                'edition_tokens' => $lemmatizationResult->tokens,
                'edition_lemmata' => $lemmatizationResult->lemmata,
                'timeFrom' => $timeFrom
            ]);
        } catch (Exception|TypesenseClientError $e) {
            $message = "Error creating edition entry in index $indexName: " . $e->getMessage();
            $this->logger->error($message);
            throw new SearchManagerException($message);
        }
    }

    /**
     * @inheritDoc
     */
    public function getTranscriberNames(): array
    {
        return $this->getStringArray(CacheKey::ApiSearchTranscribers, 'transcribers');
    }

    private function getStringArray(string $cacheKey, $queryKey): array
    {
        try {
            return unserialize($this->getDataCache()->get($cacheKey));
        } catch (ItemNotInCacheException) {
            // so, let's get it from the index
            $strings = $this->getStringArrayFromIndex($queryKey);
            $this->getDataCache()->set($cacheKey, serialize($strings), self::StringArrayTtl);
            return $strings;
        }
    }

    private function getStringArrayFromIndex(string $queryKey): array
    {
        // Get names of target indices
        if ($queryKey === 'transcriptions' || $queryKey === 'transcribers') {
            $index_names = ['transcriptions_la', 'transcriptions_ar', 'transcriptions_he'];
        } else {
            $index_names = ['editions_la', 'editions_ar', 'editions_he'];
        }

        // Get keys to query
        if ($queryKey === 'transcribers' || $queryKey === 'editors') {
            $queryKey = 'creator';
        } else {
            $queryKey = 'title';
        }

        // Array to return
        $values = [];

        // Make a match_all query

        foreach ($index_names as $index_name) {

            $query = ['hits' => [1]];
            $hits = [];
            $page = 1;

            // collect all documents from the index
            while (count($query['hits']) !== 0) {
                $searchParameters = [
                    'q' => '*',
                    'page' => $page,
                    'limit' => 250
                ];

                try {
                    $query = $this->getTypesenseClient()->collections[$index_name]->documents->search($searchParameters);
                } catch (Exception|TypesenseClientError $e) {
                    $this->logger->error("Search Exception: " . $e->getMessage(), ['index' => $index_name]);
                    return [];
                }

                foreach ($query['hits'] as $hit) {
                    $hits[] = $hit;
                }

                $page++;
            }

            // Append every value of the queried field to the $values-array, if not already done before (no duplicates)
            foreach ($hits as $hit) {
                $value = $hit['document'][$queryKey];
                if (in_array($value, $values) === false) {
                    $values[] = $value;
                }
            }
        }
        return $values;
    }

    /**
     * @inheritDoc
     */
    public function getEditors(): array
    {
        return $this->getStringArray(CacheKey::ApiSearchEditors, 'editors');
    }

    /**
     * @inheritDoc
     */
    public function getTranscribedDocuments(): array
    {
        return $this->getStringArray(CacheKey::ApiSearchTranscriptions, 'transcriptions');
    }

    /**
     * @inheritDoc
     */
    public function getEditionTitles(): array
    {
        return $this->getStringArray(CacheKey::ApiSearchEditions, 'editions');
    }

    private function getIndexPrefix(IndexType $indexType): string
    {
        return match ($indexType) {
            IndexType::Transcriptions => self::TranscriptionIndexPrefix,
            IndexType::Editions => self::EditionIndexPrefix,
        };
    }

    private function getIndexName(IndexType $indexType, string $langCode): string
    {
        if ($langCode === 'jrb') {
            $langCode = 'he';
        }
        return implode('_', [$this->getIndexPrefix($indexType), $langCode]);
    }

    private function getTranscriptionsIndexSchema(string $langCode): array
    {
        return [
            'name' => $this->getIndexName(IndexType::Transcriptions, $langCode),
            'fields' => [
                [
                    'name' => 'title',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'page',
                    'type' => 'int32',
                    'sort' => true
                ],
                [
                    'name' => 'seq',
                    'type' => 'int32',
                    'sort' => true
                ],
                [
                    'name' => 'docID',
                    'type' => 'int32',
                    'sort' => true
                ],
                [
                    'name' => 'foliation',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'pageID',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'column',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'transcription_tokens',
                    'type' => 'string[]',
                ],
                [
                    'name' => 'transcription_lemmata',
                    'type' => 'string[]',
                ],
                [
                    'name' => 'time_from',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'lang',
                    'type' => 'string',
                ],
                [
                    'name' => 'creator',
                    'type' => 'string',
                    'sort' => true
                ]
            ],
            'default_sorting_field' => 'title'
        ];
    }

    private function getEditionsIndexSchema(string $langCode): array
    {
        return [
            'name' => $this->getIndexName(IndexType::Editions, $langCode),
            'fields' => [
                [
                    'name' => 'title',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'table_id',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'chunk',
                    'type' => 'int32',
                    'sort' => true
                ],
                [
                    'name' => 'edition_tokens',
                    'type' => 'string[]',
                ],
                [
                    'name' => 'edition_lemmata',
                    'type' => 'string[]',
                ],
                [
                    'name' => 'timeFrom',
                    'type' => 'string',
                    'sort' => true
                ],
                [
                    'name' => 'lang',
                    'type' => 'string',
                ],
                [
                    'name' => 'creator',
                    'type' => 'string',
                    'sort' => true
                ]
            ],
        ];
    }

    private function getIndexSchema(IndexType $indexType, string $langCode): array
    {
        return match ($indexType) {
            IndexType::Transcriptions => $this->getTranscriptionsIndexSchema($langCode),
            IndexType::Editions => $this->getEditionsIndexSchema($langCode),
        };
    }


    /**
     * @throws Exception
     * @throws TypesenseClientError
     */
    public function resetIndex(IndexType $indexType): void
    {
        $client = $this->getTypesenseClient();

        foreach (self::LanguageCodes as $langCode) {
            $indexName = $this->getIndexName($indexType, $langCode);
            if ($client->collections[$indexName]->exists()) {
                $client->collections[$indexName]->delete();
            }
            $client->collections->create($this->getIndexSchema($indexType, $langCode));
            $this->logger->info("Typesense index '$indexName' created");
        }
    }

    /**
     * @inheritDoc
     * @throws SearchManagerException
     */
    public function deleteEditionFromIndex(int $tableId, ?string $timeFrom = null): void
    {
        $indexedDocuments = $this->findIndexedDocuments(IndexType::Editions, (string)$tableId);
        $this->deleteIndexedDocuments($indexedDocuments, $timeFrom, 'edition', (string)$tableId);
    }

    /**
     * @inheritDoc
     * @param int $tableId
     * @param bool $forceUpdate
     * @throws SearchManagerException
     * @throws WorkNotFoundException
     * @throws EntityDoesNotExistException
     */
    public function updateEditionInIndex(int $tableId, bool $forceUpdate = false): void
    {
        $edition = $this->getEditionData($tableId);
        if ($edition === null) {
            return;
        }

        $indexedDocuments = $this->findIndexedDocuments(IndexType::Editions, (string)$tableId);
        if (!$forceUpdate && $this->hasCurrentDocument($indexedDocuments, $edition['timeFrom'])) {
            return;
        }

        $this->deleteIndexedDocuments($indexedDocuments, null, 'edition', (string)$tableId);
        $this->indexEdition(
            $tableId,
            (string)$edition['chunk'],
            $edition['title'],
            $edition['lang'],
            $edition['text'],
            $edition['editor'],
            $edition['timeFrom']
        );
    }

    /**
     * @inheritDoc
     * @param int $docId
     * @param int $pageNumber
     * @param int $column
     * @param string|null $timeFrom
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws SearchManagerException
     */
    public function deleteTranscriptionFromIndex(int $docId, int $pageNumber, int $column, ?string $timeFrom = null): void
    {
        $pageId = $this->documentManager->getPageIdByDocPage($docId, $pageNumber);
        $indexedDocuments = $this->findIndexedDocuments(IndexType::Transcriptions, (string)$pageId, $column);
        $this->deleteIndexedDocuments($indexedDocuments, $timeFrom, 'transcription', "$docId:$pageNumber:$column");
    }

    /**
     * @inheritDoc
     * @param int $docId
     * @param int $pageNumber
     * @param int $column
     * @param bool $forceUpdate
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws SearchManagerException
     */
    public function updateTranscriptionInIndex(int $docId, int $pageNumber, int $column, bool $forceUpdate = false): void
    {
        $pageId = $this->documentManager->getPageIdByDocPage($docId, $pageNumber);
        $transcription = $this->getTranscriptionData($pageId, $column);
        if ($transcription === null) {
            return;
        }

        $indexedDocuments = $this->findIndexedDocuments(IndexType::Transcriptions, (string)$pageId, $column);
        if (!$forceUpdate && $this->hasCurrentDocument($indexedDocuments, $transcription['timeFrom'])) {
            return;
        }

        $this->deleteIndexedDocuments($indexedDocuments, null, 'transcription', "$docId:$pageNumber:$column");
        $this->indexTranscription(
            $transcription['pageInfo'],
            $column,
            $transcription['title'],
            $transcription['text'],
            $transcription['lang'],
            $transcription['transcriber'],
            $transcription['timeFrom']
        );
    }

    /**
     * @inheritDoc
     * @param IndexType $indexType
     * @param int $updateCountLimit
     * @return UpdateIndexResult
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws SearchManagerException
     * @throws WorkNotFoundException
     */
    public function updateIndex(IndexType $indexType, int $updateCountLimit = 0): UpdateIndexResult
    {
        $updatesNeeded = 0;
        $updatesPerformed = 0;

        foreach ($this->getItemsToUpdate($indexType) as $item) {
            if (!$this->itemNeedsUpdate($indexType, $item)) {
                continue;
            }

            $updatesNeeded++;
            if ($updateCountLimit !== 0 && $updatesPerformed >= $updateCountLimit) {
                continue;
            }

            if ($indexType === IndexType::Transcriptions) {
                $this->updateTranscriptionInIndex($item['docId'], $item['page'], $item['column'], true);
            } else {
                $this->updateEditionInIndex($item['tableId'], true);
            }
            $updatesPerformed++;
        }

        return new UpdateIndexResult($updatesNeeded, $updatesPerformed);
    }

    /**
     * Returns all source items relevant to an index update.
     *
     * @param IndexType $indexType
     * @return array<int, array<string, mixed>>
     * @throws DocumentNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     * @throws PageNotFoundException
     * @throws WorkNotFoundException
     */
    private function getItemsToUpdate(IndexType $indexType): array
    {
        $items = [];
        if ($indexType === IndexType::Editions) {
            foreach ($this->collationTableManager->getTablesInfo() as $tableInfo) {
                if ($tableInfo->type !== 'edition') {
                    continue;
                }

                $edition = $this->getEditionData($tableInfo->id);
                if ($edition !== null) {
                    $items[] = ['tableId' => $tableInfo->id, 'data' => $edition];
                }
            }
            return $items;
        }

        foreach ($this->entitySystem->getAllEntitiesForType(Entity::tDocument) as $docId) {
            foreach ($this->transcriptionManager->getTranscribedPageListByDocId($docId) as $pageNumber) {
                $pageId = $this->documentManager->getPageIdByDocPage($docId, $pageNumber);
                $pageInfo = $this->documentManager->getPageInfo($pageId);
                for ($column = 1; $column <= $pageInfo->numCols; $column++) {
                    $transcription = $this->getTranscriptionData($pageId, $column);
                    if ($transcription !== null) {
                        $items[] = [
                            'docId' => $docId,
                            'page' => $pageNumber,
                            'column' => $column,
                            'data' => $transcription,
                        ];
                    }
                }
            }
        }
        return $items;
    }

    /**
     * Determines whether a source item is absent or outdated in Typesense.
     *
     * @param IndexType $indexType
     * @param array<int, array<string, mixed>> $item
     * @return bool
     * @throws SearchManagerException
     */
    private function itemNeedsUpdate(IndexType $indexType, array $item): bool
    {
        if ($indexType === IndexType::Editions) {
            $identifier = (string)$item['tableId'];
            $indexedDocuments = $this->findIndexedDocuments(IndexType::Editions, $identifier);
            $data = $item['data'];
            return !$this->hasCurrentDocument($indexedDocuments, $data['timeFrom']) ||
                $this->hasEmptyTokensForText($indexedDocuments, $data['text'], 'edition_tokens', 'edition_lemmata');
        }

        $data = $item['data'];
        $indexedDocuments = $this->findIndexedDocuments(IndexType::Transcriptions, (string)$data['pageInfo']->pageId, $item['column']);
        return !$this->hasCurrentDocument($indexedDocuments, $data['timeFrom']) ||
            $this->hasEmptyTokensForText($indexedDocuments, $data['text'], 'transcription_tokens', 'transcription_lemmata');
    }

    /**
     * Finds documents matching an index identity across all language collections.
     *
     * @param IndexType $indexType
     * @param string $identifier
     * @param int|null $column
     * @return array<int, array{index: string, document: array<string, mixed>}>
     * @throws SearchManagerException
     */
    private function findIndexedDocuments(IndexType $indexType, string $identifier, ?int $column = null): array
    {
        $documents = [];
        $query = [
            'q' => $identifier,
            'query_by' => $indexType === IndexType::Transcriptions ? 'pageID' : 'table_id',
            'prefix' => false,
            'num_typos' => 0,
        ];
        if ($indexType === IndexType::Transcriptions) {
            $query['filter_by'] = "column:=$column";
        }

        foreach ($this->getIndexNames($indexType) as $indexName) {
            try {
                $result = $this->getTypesenseClient()->collections[$indexName]->documents->search($query);
            } catch (Exception|TypesenseClientError $e) {
                $message = "Error searching index $indexName: " . $e->getMessage();
                $this->logger->error($message);
                throw new SearchManagerException($message, 0, $e);
            }

            foreach ($result['hits'] ?? [] as $hit) {
                if (isset($hit['document'])) {
                    $documents[] = ['index' => $indexName, 'document' => $hit['document']];
                }
            }
        }

        return $documents;
    }

    /**
     * Deletes matching Typesense documents, optionally restricted by time.
     *
     * @param array<int, array{index: string, document: array<string, mixed>}> $indexedDocuments
     * @param string|null $timeFrom
     * @param string $itemType
     * @param string $identifier
     * @throws SearchManagerException
     */
    private function deleteIndexedDocuments(array $indexedDocuments, ?string $timeFrom, string $itemType, string $identifier): void
    {
        foreach ($indexedDocuments as $indexedDocument) {
            $document = $indexedDocument['document'];
            if ($timeFrom !== null && ($document['time_from'] ?? $document['timeFrom'] ?? null) !== $timeFrom) {
                continue;
            }
            if (!isset($document['id'])) {
                continue;
            }

            try {
                $this->getTypesenseClient()->collections[$indexedDocument['index']]->documents[$document['id']]->delete();
            } catch (Exception|TypesenseClientError $e) {
                $message = "Error deleting $itemType $identifier from index {$indexedDocument['index']}: " . $e->getMessage();
                $this->logger->error($message);
                throw new SearchManagerException($message, 0, $e);
            }
        }
    }

    /**
     * Checks whether at least one indexed document has the requested version.
     *
     * @param array<int, array{index: string, document: array<string, mixed>}> $indexedDocuments
     */
    private function hasCurrentDocument(array $indexedDocuments, string $timeFrom): bool
    {
        foreach ($indexedDocuments as $indexedDocument) {
            $documentTime = $indexedDocument['document']['time_from'] ?? $indexedDocument['document']['timeFrom'] ?? null;
            if ($documentTime === $timeFrom) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks whether an indexed text has missing token or lemma data.
     *
     * @param array<int, array{index: string, document: array<string, mixed>}> $indexedDocuments
     */
    private function hasEmptyTokensForText(array $indexedDocuments, string $text, string $tokensKey, string $lemmataKey): bool
    {
        if (!$this->containsIndexableText($text)) {
            return false;
        }
        foreach ($indexedDocuments as $indexedDocument) {
            $document = $indexedDocument['document'];
            if (($document[$tokensKey] ?? []) === [] || ($document[$lemmataKey] ?? []) === []) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns true when text contains characters handled by the lemmatizer.
     */
    private function containsIndexableText(string $text): bool
    {
        return preg_match('/[a-z]/i', $text) === 1 ||
            preg_match('/\p{Hebrew}/u', $text) === 1 ||
            preg_match('/\p{Arabic}/u', $text) === 1;
    }

    /**
     * Returns the names of the language-specific collections for an index type.
     *
     * @return string[]
     */
    private function getIndexNames(IndexType $indexType): array
    {
        return array_map(
            fn(string $language): string => $this->getIndexName($indexType, $language),
            self::LanguageCodes
        );
    }

    /**
     * Gets the current transcription data for a page column.
     *
     * @param int $pageId
     * @param int $column
     * @return array{pageInfo: PageInfo, title: string, text: string, lang: string, transcriber: string, timeFrom: string}|null
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws EntityDoesNotExistException
     * @throws InvalidTimeStringException
     */
    private function getTranscriptionData(int $pageId, int $column): ?array
    {
        $versions = $this->transcriptionManager->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $column);
        if ($versions === []) {
            return null;
        }

        /** @var ColumnVersionInfo $currentVersion */
        $currentVersion = end($versions);
        $pageInfo = $this->documentManager->getPageInfo($pageId);
        $docInfo = $this->documentManager->getDocInfo($pageInfo->docId);
        $elements = $this->transcriptionManager->getColumnElementsBypageID($pageId, $column);

        return [
            'pageInfo' => $pageInfo,
            'title' => $docInfo->title,
            'text' => $this->getPlainTextFromElements($elements),
            'lang' => $this->languageManager->getLanguageCode($pageInfo->lang),
            'transcriber' => $this->entitySystem->getEntityName($currentVersion->authorTid),
            'timeFrom' => $currentVersion->timeFrom,
        ];
    }

    /**
     * Gets the current edition data for a collation table.
     *
     * @param int $tableId
     * @return array{editor: string, text: string, title: string, chunk: string, lang: string, timeFrom: string}|null
     * @throws WorkNotFoundException
     * @throws EntityDoesNotExistException
     */
    private function getEditionData(int $tableId): ?array
    {
        $ctData = $this->collationTableManager->getCollationTableById($tableId);
        if (($ctData['type'] ?? null) !== 'edition' || ($ctData['archived'] ?? false)) {
            return null;
        }

        $editionWitnessIndex = $ctData['witnessOrder'][0];
        $tokens = $ctData['witnesses'][$editionWitnessIndex]['tokens'];
        $versionInfo = $this->collationTableManager->getCollationTableVersionManager()->getCollationTableVersionInfo($tableId);
        $currentVersion = end($versionInfo);
        $editor = $this->entitySystem->getEntityName($currentVersion->authorTid);

        $text = '';
        foreach ($tokens as $token) {
            if (($token['tokenType'] ?? null) !== 'empty') {
                $text .= ' ' . ($token['text'] ?? '');
            }
        }

        $chunkId = (string)$ctData['chunkId'];
        $chunkParts = explode('-', $chunkId, 2);
        $workId = $chunkParts[0];
        $chunk = $chunkParts[1] ?? '';

        return [
            'editor' => $editor,
            'text' => $text,
            'title' => $this->workManager->getWorkDataByDareId($workId)->title,
            'chunk' => (int)$chunk,
            'lang' => $ctData['lang'],
            'timeFrom' => $currentVersion->timeFrom,
        ];
    }

    /**
     * Converts column elements to the text indexed by Typesense.
     */
    private function getPlainTextFromElements(array $elements): string
    {
        $text = '';
        foreach ($elements as $element) {
            if ($element->type !== Element::LINE) {
                continue;
            }
            foreach ($element->items as $item) {
                switch ($item->type) {
                    case Item::TEXT:
                    case Item::HEADING:
                    case Item::RUBRIC:
                    case Item::BOLD_TEXT:
                    case Item::ITALIC:
                    case Item::MATH_TEXT:
                    case Item::GLIPH:
                    case Item::INITIAL:
                        $text .= $item->theText;
                        break;
                    case Item::NO_WORD_BREAK:
                        $text .= '-';
                        break;
                }
            }
            $text .= "\n";
        }
        return $text;
    }
}