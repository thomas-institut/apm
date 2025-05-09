<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
use APM\System\Cache\CacheKey;
use APM\System\Lemmatizer;
use APM\System\SystemManager;
use Http\Client\Exception;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Typesense\Client;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;
use Typesense\Exceptions\TypesenseClientError;

class ApiSearch extends ApiController
{

    const string CLASS_NAME = 'Search';

    /**
     * searches in a Typesense index and returns an api response to js
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws KeyNotInCacheException
     */
    public function search(Request  $request, Response $response): Response
    {


        // Name of the index that should be queried and informative variables for the API response
        // Informative variables for the API response
        $status = 'OK';
        $now = TimeString::now();

        // Get user's input
        $postParams = $request->getParsedBody();
        $corpus = $postParams['corpus'];
        $searchedPhrase = $this->removeSpaces(strtolower($postParams['searched_phrase'])); // Lower-case and without additional blanks
        $title = $postParams['title'];
        $creator = $postParams['creator'];
        $keywordDistance = $postParams['keywordDistance'];
        $lemmatize = filter_var($postParams['lemmatize'], FILTER_VALIDATE_BOOLEAN);
        $lang = $postParams['lang'] ?? 'detect';

        // Check if it as a new query or a query for more pages of a running query
        $queryPage = $postParams['queryPage'] ?? 1;

        // Name of the index to query
        $indexName = $this->getIndexName($corpus, $lang);

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $indexName);

        // Log query
        $this->logger->debug("Input parameters", [ 'text' => $searchedPhrase, 'keywordDistance' => $keywordDistance, 'lang' => $lang, 'lemmatize' => $lemmatize]);

        // Instantiate Typesense client
        // Load authentication data from config-file
        $config = $this->systemManager->getConfig();
        $this->logger->debug('CONFIG ' . $config[ApmConfigParameter::TYPESENSE_HOST]);

        $client = $this->systemManager->getTypesenseClient();

        // If wished, lemmatize searched keywords
        if ($lemmatize) {
            $tokensForQuery = $this->getLemmata($searchedPhrase, $lang);
            $lemmata = $tokensForQuery;
        }
        else {
            $tokensForQuery = explode(" ", $searchedPhrase);
            $tokensForQuery = $this->sortTokensForQuery($tokensForQuery);
            $lemmata = [''];

            foreach ($tokensForQuery as $ignored) {
                $lemmata[] = '';
            }
        }

        // Query index
        try {
            $query = $this->makeSingleTokenTypesenseSearchQuery($client, $indexName, $lang,  $title, $creator, $tokensForQuery[0], $lemmatize, $corpus, $queryPage, $tokensForQuery);
        } catch (Exception|TypesenseClientError $e) {
            $status = "Typesense query problem";
            return $this->responseWithJson($response,
                [
                    'searched_phrase' => $searchedPhrase,
                    'queried_token' => $tokensForQuery,
                    'matches' => [],
                    'serverTime' => $now,
                    'status' => $status,
                    // Pass the error message to JS
                    'errorData' => $e->getMessage()
                ]);
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'index' => $indexName,
            'searched_phrase' => $searchedPhrase,
            'lemmatize' => $lemmatize,
            'lemmata' => $lemmata,
            'lang' => $lang,
            'corpus' => $corpus,
            'keywordDistance' => $keywordDistance,
            'tokensForQuery' => $tokensForQuery,
            'query' => $query['hits'],
            'queryPage' => $query['page'],
            'queryFinished' => $query['finished'],
            'serverTime' => $now,
            'status' => $status]);
    }

    /**
     * returns the lemmata for all the words in a given phrase, gets them either from cache or runs the lemmatizer and caches them
     * @param string $searchedPhrase
     * @param string $lang
     * @return array
     * @throws KeyNotInCacheException
     */
    private function getLemmata (string $searchedPhrase, string $lang): array {

        // Lemmatization can be slow, so we cache it as much as possible
        $cache = $this->systemManager->getSystemDataCache();
        $searchTokens = explode(' ', $searchedPhrase);
        $tokensToLemmatize = [];
        $tokensForQuery = [];

        foreach($searchTokens as $token) { // Try to get lemmata
            $cacheKey = $this->getLemmaCacheKey($token);
            if ($cache->isInCache($cacheKey)) {
                $lemma = explode(" ", $cache->get($cacheKey));
                foreach ($lemma as $complexLemmaPart) {
                    $tokensForQuery[] = $complexLemmaPart;
                }
                $this->logger->debug("Lemma for queried token '$token' already cached with cache key $cacheKey!");
            } else {
                $tokensToLemmatize[] = $token;
            }
        }
        if (count($tokensToLemmatize) > 0) { // Get lemmata from lemmatizer
            $this->logger->debug(count($tokensToLemmatize) . " token(s) not in cache, need to run lemmatizer", $tokensToLemmatize);
            $phrase = implode(' ', $tokensToLemmatize);
            $tokensAndLemmata = Lemmatizer::runLemmatizer($lang, $phrase);
            $lemmata = $tokensAndLemmata['lemmata'];
            foreach ($lemmata as $i => $lemma) {
                $cacheKey = $this->getLemmaCacheKey($tokensToLemmatize[$i]);
                $cache->set($cacheKey, $lemma);
                $this->logger->debug("Cached lemma '$lemma' for token '$tokensToLemmatize[$i]' with cache key '$cacheKey'");

                $lemma = explode(" ", $lemma); // check if it is a complex lemma, e.g. article + noun in arabic/hebrew
                foreach ($lemma as $complexLemmaPart) {
                    $tokensForQuery[] = $complexLemmaPart;
                }
            }
        }

        foreach ($tokensForQuery as $i => $token) {
            if ($token === "") {
                unset($tokensForQuery[$i]);
            }
        }

        usort($tokensForQuery, function($a, $b) {
            return strlen($b) - strlen($a);
        });

        return array_values($tokensForQuery);
    }

    /**
     * gets the name of a transcriptions- or editions-index relative to a given language
     * @param string $corpus
     * @param string $lang
     * @return string
     */
    private function getIndexName(string $corpus, string $lang): string
    {
        if ($lang != 'jrb') {
            $index_name = $corpus . '_' . $lang;
        }
        else {
            $index_name = $corpus . '_he';
        }

        return $index_name;
    }

    /**
     * returns the cache key for a given word
     * @param string $word
     * @return string
     */
    private  function getLemmaCacheKey(string $word): string
    {
        return CacheKey::ApiSearchLemma . $word;
    }

    /**
     * removes all spaces from a given string that are not single spaces between words
     * @param string $searchedPhrase
     * @return string
     */
    private function removeSpaces (string $searchedPhrase): string
    {
        $searchedPhrase = trim($searchedPhrase);
        // Reduce multiple spaces following each other anywhere in the keyword to one single space
        return preg_replace('!\s+!', ' ', $searchedPhrase);
    }

    /**
     * sorts an array of strings by length and moves words suffixes beginning with '*' to the end of the array
     * @param array $tokensForQuery
     * @return array
     */
    private function sortTokensForQuery (array $tokensForQuery): array
    {

        $suffixes = [];

        foreach ($tokensForQuery as $i=>$token) {
            if (str_contains($token, "*")) {
                $suffixes[] = $token;
                unset($tokensForQuery[$i]);
            }
        }

        usort($tokensForQuery, function($a, $b) {
            return strlen($b) - strlen($a);
        });

        if (count($tokensForQuery) === 0) {
            $tokensForQuery[] = "*";
        }

        return array_values(array_merge($tokensForQuery, $suffixes));
    }

    /**
     * make a single token query for a specific Typesense index
     * @param Client $client
     * @param string $index_name
     * @param string $lang
     * @param string $title
     * @param string $creator
     * @param string $token
     * @param bool $lemmatize
     * @param string $corpus
     * @param int $page
     * @param array $numSearchedTokens
     * @return array
     * @throws Exception
     * @throws TypesenseClientError
     */
    private function makeSingleTokenTypesenseSearchQuery (Client $client, string $index_name, string $lang, string $title, string $creator, string $token, bool $lemmatize, string $corpus, int $page, array $numSearchedTokens): array
    {

        $this->logger->debug("Making typesense query", [ 'index' => $index_name, 'token' => $token, 'title' => $title, 'creator' => $creator]);

        $config = $this->systemManager->getConfig();

        // Check "lemmatize" (boolean) and corpus to determine the target of the query
        if ($lemmatize) {
            if ($corpus === 'transcriptions') {
                $area_of_query = 'transcription_lemmata';
                $sortingSchema = "title:asc, seq:asc, column:asc";
            }
            else {
                $area_of_query = 'edition_lemmata';
                $sortingSchema = "title:asc, chunk:asc, table_id:asc";

            }
        }
        else {
            if ($corpus === 'transcriptions') {
                $area_of_query = 'transcription_tokens';
                $sortingSchema = "title:asc, seq:asc, column:asc";
            }
            else {
                $area_of_query = 'edition_tokens';
                $sortingSchema = "title:asc, chunk:asc, table_id:asc";
            }
        }

        // adjust page size for the typesense query depending on the search token and the number of total tokens in the searched phrase
        if ($token === '*') {
            $pageSize = 30;
        } else if (count($numSearchedTokens) > 2) {
            $pageSize = 20;
        } else if (count($numSearchedTokens) > 1) {
            $pageSize = 10;
        } else {
            $pageSize = $config[ApmConfigParameter::TYPESENSE_PAGESIZE];
        }

        $searchParameters = [
            'q' => $token,
            'query_by' => $area_of_query,
            'filter_by' => "lang:=$lang",
            "sort_by" => $sortingSchema,
            'num_typos' => 0,
            'prefix' => true,
            'infix' => 'off',
            'page' => $page,
            'limit' => $pageSize
        ];
        
        if ($creator !== '') {
            $searchParameters['filter_by'] = $searchParameters['filter_by'] . " && creator:=$creator";
        }

        if ($title !== '') {
            $searchParameters['filter_by'] = $searchParameters['filter_by'] . " && title:=$title";
        }

        $queryFinished = true;

        $this->logger->debug("getting typesense matches page no. " . $page);


        $start = microtime(true);
        $query = $client->collections[$index_name]->documents->search($searchParameters);
        $hits = $query['hits'];

        $this->logger->debug(sprintf("TS query with %d hits done in %.2f ms",
            count($query['hits']), 1000*(microtime(true) - $start)));

        
        $this->logger->debug("got " . count($hits) . " matching items from typesense matches page no. " . $page);

        if (count($hits) !== 0) {
            $queryFinished = false;
        }

        return ['hits' => $hits, 'page' => $page, 'finished' => $queryFinished];
    }

    /**
     * returns all creators or titles stored in the transcriptions or edition indices
     * @param Client $client
     * @param string $queryKey , can be 'transcription' or 'transcriber' or 'editor' or 'edition'
     * @param LoggerInterface|null $logger
     * @return array
     */
    static private function getAllEntriesFromIndex (Client $client, string $queryKey, ?LoggerInterface $logger): array
    {

        if ($logger === null) {
            $logger = new NullLogger();
        }
        // Get names of target indices
        if ($queryKey === 'transcription' or $queryKey === 'transcriber') {
            $index_names = ['transcriptions_la', 'transcriptions_ar', 'transcriptions_he'];
        }
        else {
            $index_names = ['editions_la', 'editions_ar', 'editions_he'];
        }

        // Get keys to query
        if ($queryKey === 'transcriber' or $queryKey === 'editor') {
            $queryKey = 'creator';
        }
        else {
            $queryKey = 'title';
        }

        // Array to return
        $values = [];

        // Make a match_all query

        foreach ($index_names as $index_name) {

            $query=['hits' => [1]];
            $hits = [];
            $page=1;

            // collect all documents from the index
            while (count($query['hits']) !== 0) {
                $searchParameters = [
                    'q' => '*',
                    'page' => $page,
                    'limit' => 250
                ];

                try {
                    $query = $client->collections[$index_name]->documents->search($searchParameters);
                } catch (Exception|TypesenseClientError $e) {
                    $logger->error("Search Exception: " . $e->getMessage(), [ 'index' => $index_name]);
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
     * updates the data cache for transcribers and transcription titles or editors and edition titles
     * @param SystemManager $systemManager
     * @param string $whichIndex
     * @param LoggerInterface|null $logger
     * @return bool
     */
    static public function updateDataCache (SystemManager $systemManager, string $whichIndex, ?LoggerInterface $logger): bool
    {

        $cache = $systemManager->getSystemDataCache();
        $client = $systemManager->getTypesenseClient();

        if ($whichIndex === 'transcriptions')
        {
            $transcriptions = self::getAllEntriesFromIndex($client, 'transcription', $logger);
            $transcribers = self::getAllEntriesFromIndex($client, 'transcriber', $logger);
            $cache->set(CacheKey::ApiSearchTranscriptions, serialize($transcriptions));
            $cache->set(CacheKey::ApiSearchTranscribers, serialize($transcribers));

        }
        else if ($whichIndex === 'editions') {
            $editions = self::getAllEntriesFromIndex($client, 'edition', $logger);
            $editors = self::getAllEntriesFromIndex($client, 'editor', $logger);
            $cache->set(CacheKey::ApiSearchEditions, serialize($editions));
            $cache->set(CacheKey::ApiSearchEditors, serialize($editors));
        }

        return true;
    }

    /**
     * returns all transcription titles from the cache or the corresponding indices
     * @param Request $request
     * @param Response $response
     * @return Response
     *
     */
    public function getTranscriptionTitles(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchTranscriptions, 'transcription');
    }

    /**
     * returns all transcriber names from the cache or the corresponding indices
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getTranscribers(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchTranscribers, 'transcriber');
    }

    /**
     * returns all edition titles from the cache or the corresponding indices
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getEditionTitles(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchEditions, 'edition');
    }

    /**
     * returns all editor names from the cache or the corresponding indices
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getEditors(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchEditors, 'editor');
    }

    /**
     * returns data from cache or the corresponding indices for given cache and query-keys
     * @param Request $request
     * @param Response $response
     * @param string $cacheKey
     * @param string $queryKey
     * @return Response
     */
    private function getDataFromCacheOrIndex(Request $request, Response $response, string $cacheKey, string $queryKey): Response
    {
        $cache = $this->systemManager->getSystemDataCache();
        $client = $this->systemManager->getTypesenseClient();
        $status = 'OK';
        $now = TimeString::now();

        // Get data from cache, if data is not cached, get data from the Typesense index and set the cache
        try {
            $data = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            // Get a list of all items
            $data = self::getAllEntriesFromIndex($client, $queryKey, $this->logger);
            if (count($data) !== 0) {
                // Set cache if there's some data
                // (if there are no items, it's probably because the index hasn't been populated yet)
                $cache->set($cacheKey, serialize($data));
            }
        }

        // Api Response
        $responseData = [
            strtolower($cacheKey) => $data,
            'serverTime' => $now,
            'status' => $status
        ];

        return $this->responseWithJson($response, $responseData);
    }

}