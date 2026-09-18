<?php

namespace APM\System\Search;

use APM\System\Cache\CacheKey;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\PageInfo;
use APM\System\Lemmatizer;
use APM\System\Search\Exception\SearchManagerException;
use Http\Client\Exception;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAwareTrait;
use Typesense\Client;
use Typesense\Exceptions\TypesenseClientError;

class TypesenseSearchIndexManager implements SearchIndexManager, LoggerAwareInterface, CacheAware
{

    use LoggerAwareTrait;
    use SimpleCacheAwareTrait;

    const string TranscriptionIndexPrefix = 'transcriptions';
    const string EditionIndexPrefix = 'editions';


    const array LanguageCodes = ['ar', 'he', 'la'];

    public function __construct(
        private readonly Client $typesenseClient,
        SystemMainDataCache     $dataCache,
        LoggerInterface         $logger)
    {
        $this->logger = $logger;
        $this->setCache($dataCache);
    }

    private function getTypesenseClient(): Client
    {
        return $this->typesenseClient;
    }

    private function getIndexNameForLanguage(string $prefix, string $langCode): string
    {
        if ($langCode === 'jrb') {
            $langCode = 'he';
        }
        return "{$prefix}_$langCode";
    }

    /**
     * @inheritDoc
     */
    public function indexTranscription(PageInfo $pageInfo, int $col,
                                       string   $docTitle, string $transcriptionText, string $langCode,
                                       string   $transcriberName, string $timeFrom): void
    {
        $indexName = $this->getIndexNameForLanguage(self::TranscriptionIndexPrefix, $langCode);


        // encode transcript for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $transcription_clean = $this->encodeForLemmatization($transcriptionText);

        // tokenization and lemmatization
        // test existence of transcript and tokenize/lemmatize existing transcripts in python
        if (strlen($transcription_clean) > 3) {

            $tokens_and_lemmata = Lemmatizer::runLemmatizer($langCode, $transcription_clean);

            // get tokenized and lemmatized transcript
            $transcription_tokenized = $tokens_and_lemmata['tokens'];
            $transcription_lemmatized = $tokens_and_lemmata['lemmata'];
        } else {
            $transcription_tokenized = [];
            $transcription_lemmatized = [];
            $this->logger->debug("Transcript is too short for lemmatization...");
        }
        if (count($transcription_tokenized) !== count($transcription_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
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
                'transcription_tokens' => $transcription_tokenized,
                'transcription_lemmata' => $transcription_lemmatized,
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
        $indexName = $this->getIndexNameForLanguage(self::EditionIndexPrefix, $langCode);

        // encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $cleanText = $this->encodeForLemmatization($editionText);

        // tokenization and lemmatization
        // test existence of text and tokenize/lemmatize existing texts
        if (strlen($cleanText) > 3) {
            $tokensAndLemmata = Lemmatizer::runLemmatizer($langCode, $cleanText);
            // Get tokenized and lemmatized transcript
            $editionTokenized = $tokensAndLemmata['tokens'];
            $edition_lemmatized = $tokensAndLemmata['lemmata'];
        } else {
            $editionTokenized = [];
            $edition_lemmatized = [];
            $this->logger->debug("Text is too short for lemmatization...");
        }
        if (count($editionTokenized) !== count($edition_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        try {
            $this->getTypesenseClient()->collections[$indexName]->documents->create([
                'table_id' => (string)$tableId,
                'chunk' => $chunk,
                'creator' => $editorName,
                'title' => $title,
                'lang' => $langCode,
                'edition_tokens' => $editionTokenized,
                'edition_lemmata' => $edition_lemmatized,
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
            $this->getDataCache()->set($cacheKey, serialize($strings));
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

    public function deleteEditionFromIndex(int $tableId, ?string $timeFrom = null): void
    {
        // TODO: Implement deleteEditionFromIndex() method.
    }

    public function updateEditionInIndex(int $tableId, bool $forceUpdate = false): void
    {
        // TODO: Implement updateEditionInIndex() method.
    }

    public function deleteTranscriptionFromIndex(int $docId, int $pageNumber, int $column, ?string $timeFrom = null): void
    {
        // TODO: Implement deleteTranscriptionFromIndex() method.
    }

    public function updateTranscriptionInIndex(int $docId, int $pageNumber, int $column, bool $forceUpdate = false): void
    {
        // TODO: Implement updateTranscriptionInIndex() method.
    }

    public function updateIndex(IndexType $indexType, int $updateCountLimit = 0): UpdateIndexResult
    {
        return new UpdateIndexResult(0, 0);
    }
}