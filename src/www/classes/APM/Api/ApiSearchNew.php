<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
use APM\System\Cache\CacheKey;
use APM\System\Lemmatizer;
use APM\System\SystemManager;
use APM\ToolBox\HttpStatus;
use Http\Client\Exception;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Typesense\Client;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;
use Typesense\Exceptions\ConfigError;
use Typesense\Exceptions\TypesenseClientError;

class ApiSearchNew extends ApiController
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

        // Name of the index, that should be queried and informative variables for the API response
        // Informative variables for the API response
        $status = 'OK';
        $now = TimeString::now();

        // Get all user input!
        $corpus = $_POST['corpus'];
        $searched_phrase = $this->removeBlanks(strtolower($_POST['searched_phrase'])); // Lower-case and without additional blanks
        $title = $_POST['title'];
        $creator = $_POST['creator'];
        $keywordDistance = $_POST['keywordDistance'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);
        $lang = $_POST['lang'] ?? 'detect';

        // Check if it as a new query or a query for more pages of a running query
        $queryPage = $_POST['queryPage'] ?? 1;

        // Name of the index to query
        $index_name = $this->getIndexName($corpus, $lang);

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $index_name);

        // Log query
        $this->logger->debug("Input parameters", [ 'text' => $searched_phrase, 'keywordDistance' => $keywordDistance, 'lang' => $lang, 'lemmatize' => $lemmatize]);

        // Instantiate Typesense client
        // Load authentication data from config-file
        $config = $this->systemManager->getConfig();
        $this->logger->debug('CONFIG ' . $config[ApmConfigParameter::TYPESENSE_HOST]);

        $client = $this->instantiateTypesenseClient($config);
        if ($client === false) {
            $status = 'Connecting to Typesense server failed.';
            return $this->responseWithJson($response,
                ['searched_phrase' => $searched_phrase,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }


        // If wished, lemmatize searched keywords
        if ($lemmatize) {
            $tokensForQuery = $this->getLemmata($searched_phrase, $lang);
            $lemmata = $tokensForQuery;
        }
        else {
            $tokensForQuery = explode(" ", $searched_phrase);
            $tokensForQuery = $this->sortTokensForQuery($tokensForQuery);
            $lemmata = [''];

            foreach ($tokensForQuery as $token) {
                $lemmata[] = '';
            }
        }

        // Query index
        try {
            $query = $this->makeSingleTokenTypesenseSearchQuery($client, $index_name, $lang,  $title, $creator, $tokensForQuery[0], $lemmatize, $corpus, $queryPage, $tokensForQuery);
        } catch (Exception|TypesenseClientError $e) {
            $status = "Typesense query problem";
            return $this->responseWithJson($response,
                [
                    'searched_phrase' => $searched_phrase,
                    'queried_token' => $tokensForQuery,
                    'matches' => [],
                    'serverTime' => $now,
                    'status' => $status,
                    // Pass the error message to JS
                    'errorData' => $e->getMessage()
                ]);
        }

        /*if ($tokensForQuery[0] === '*') {
            unset($tokensForQuery[0]);
            $tokensForQuery = array_values($tokensForQuery);
        }

        // Count tokens
        $numTokens = count($tokensForQuery);


        // Get all information about the matched entries, including passages with the matched token as lists of tokens
        $data = $this->collectData($query, $tokensForQuery[0], $tokensForQuery, $lemmata, $keywordDistance, $lemmatize, $corpus);

        // Until now, there was no check, if the queried keywords are close enough to each other, depending on the keywordDistance value
        // If there is more than one token in the searched phrase, now  all columns and passages, which do not match all tokens in the desired way,
        // get filtered out
        for ($i=0; $i<$numTokens; $i++) {
            $data = $this->filterData($data, $tokensForQuery[$i], $lemmata[$i], $lemmatize);
        }

        // REMOVE DUPLICATE PASSAGES
        $data = $this->removePassageDuplicates($data); // check search for "in summa dicatur"

        // Crop data if there are more than 999 passages matched
        $num_passages_total = $this->getnumPassages($data);
        $max_passages = 999;
        $cropped = false;
        $num_passages_cropped = $num_passages_total;

        if ($num_passages_total>$max_passages) {
            $data = $this->cropData($data, $max_passages);
            $num_passages_cropped = $this->getNumPassages($data);
            $cropped = true;
        }*/

        // ApiResponse
        return $this->responseWithJson($response, [
            'index' => $index_name,
            'searched_phrase' => $searched_phrase,
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
     * removes overlapping passages which contain exactly the same matched tokens
     * @param array $data
     * @return array
     */
    private function removePassageDuplicates (array $data): array
    {

        // remove passages that include exactly the same matched tokens, only with different borders
        foreach ($data as $i=>$match) {
            $data[$i]['matched_token_positions'] = array_intersect_key($match['matched_token_positions'], array_unique(array_map('serialize', $match['matched_token_positions'])));
            $data[$i]['matched_token_positions'] = $this->removeSubsetArrays($data[$i]['matched_token_positions']);

            foreach ($data[$i]['passage_tokenized'] as $j => $val) {
                if (!array_key_exists($j, $data[$i]['matched_token_positions'])) {
                    unset($data[$i]['passage_tokenized'][$j]);
                    unset($data[$i]['passage_lemmatized'][$j]);
                    unset($data[$i]['passage_coordinates'][$j]);
                    unset($data[$i]['matched_token_positions'][$j]);
                    unset($data[$i]['positions'][$j]);
                    $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                }
            }

            $data[$i]['passage_tokenized'] = array_values($data[$i]['passage_tokenized']);
            $data[$i]['passage_lemmatized'] = array_values($data[$i]['passage_lemmatized']);
            $data[$i]['passage_coordinates'] = array_values($data[$i]['passage_coordinates']);
            $data[$i]['matched_token_positions'] = array_values($data[$i]['matched_token_positions']);
            $data[$i]['positions'] = array_values($data[$i]['positions']);
        }

        return array_values($data);
    }

    /**
     * removes every array A from an array B, that is a subset of another array C in the array B
     * @param array $array
     * @return array
     */
    private function removeSubsetArrays(array $array): array
    {
        $result = [];

        // iterate over input array
        foreach ($array as $currentIndex => $current) {
            $isSubset = false;

            foreach ($array as $existingIndex => $existing) {

                if ($currentIndex != $existingIndex && empty(array_diff($current, $existing))) {
                    $isSubset = true;
                    break;
                }
            }

            if (!$isSubset) {
                $result[$currentIndex] = $current;
            }
        }

        return $result;
    }

    /**
     * returns the lemmata for all the words in a given phrase, gets them either from cache or runs the lemmatizer and caches them
     * @param string $searched_phrase
     * @param string $lang
     * @return array
     * @throws KeyNotInCacheException
     */
    private function getLemmata (string $searched_phrase, string $lang): array {

        // Lemmatization can be slow, so we cache it as much as possible
        $cache = $this->systemManager->getSystemDataCache();
        $searchTokens = explode(' ', $searched_phrase);
        $tokensToLemmatize = [];

        foreach($searchTokens as $token) { // Try to get lemmata from cache
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
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $phrase);
            $lemmata = $tokens_and_lemmata['lemmata'];
            foreach ($lemmata as $i => $lemma) {
                $cacheKey = $this->getLemmaCacheKey($tokensToLemmatize[$i]);
                $cache->set($cacheKey, $lemma);
                $this->logger->debug("Cached lemma '$lemma' for token '$tokensToLemmatize[$i]' with cache key '$cacheKey'");

                $lemma = explode(" ", $lemma); // check if it is a complex lemma, e. g. article + noun in arabic/hebrew
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
     * counts the matched passages stored in an array of matched items, e. g. transcriptions or editions
     * @param array $data
     * @return int
     */
    private function getNumPassages(array $data): int
    {

        $num_passages_total = 0;
        foreach ($data as $matched_item) {
            $num_passages_total = $num_passages_total + $matched_item['num_passages'];
        }

        return $num_passages_total;
    }

    /**
     * crops the matched data to a given number of passages
     * @param array $data
     * @param int $max_passages
     * @return array
     */
    private function cropData (array $data, int $max_passages): array
    {

        $num_passages_cropped = 0;
        foreach ($data as $i=>$matched_column) {
            if ($num_passages_cropped > $max_passages) {
                $data = array_slice($data, $i);
                break;
            }
            $num_passages_cropped = $num_passages_cropped + $matched_column['num_passages'];
        }

        return  $data;
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
     * removes all blanks from a given string, that are not single blanks between words
     * @param string $searched_phrase
     * @return array|string|null
     */
    private function removeBlanks (string $searched_phrase): array|string|null
    {

        // Reduce multiple blanks following each other anywhere in the keyword to one single blank
        $searched_phrase = preg_replace('!\s+!', ' ', $searched_phrase);

        // Remove blank at the end of the keyword
        if (substr($searched_phrase, -1) == " ") {
            $searched_phrase = substr($searched_phrase, 0, -1);
        }

        // Remove blank at the beginning of the keyword
        if (substr($searched_phrase, 0, 1) == " ") {
            $searched_phrase = substr($searched_phrase, 1);
        }

        return $searched_phrase;
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
     * @return array
     * @throws TypesenseClientError
     * @throws Exception
     */
    private function makeSingleTokenTypesenseSearchQuery (Client $client, string $index_name, string $lang, string $title, string $creator, string $token, bool $lemmatize, string $corpus, int $page=1, array $numSearchedTokens): array
    {

        $this->logger->debug("Making typesense query", [ 'index' => $index_name, 'token' => $token, 'title' => $title, 'creator' => $creator]);

        $config = $this->systemManager->getConfig();

        // Check lemmatize (boolean) and corpus to determine the target of the query
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

        // adjust pagesize for typesense query depending on the search token and the number of total tokens in the searched phrase
        if ($token === '*') {
            $pagesize = 30;
        } else if (count($numSearchedTokens) > 2) {
            $pagesize = 20;
        } else if (count($numSearchedTokens) > 1) {
            $pagesize = 10;
        } else {
            $pagesize = $config[ApmConfigParameter::TYPESENSE_PAGESIZE];
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
            'limit' => $pagesize
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
     * collects all information about the matches in a given Typesense query
     * @param array $query
     * @param string $token
     * @param array $tokens_for_query
     * @param array $lemmata
     * @param int $keywordDistance
     * @param bool $lemmatize
     * @param string $corpus
     * @return array
     */
    private function collectData (array $query, string $token, array $tokens_for_query, array $lemmata, int $keywordDistance, bool $lemmatize, string $corpus): array
    {

        // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
        $filter = $this->getFilterType($token);
        $token = str_replace("*", "", $token);

        // Variable to collect all relevant data in
        $data = [];

        // Get number of matched columns
        $num_matches = count($query);

        // If there are any matched columns, collect them all in an ordered and nested array of columns
        if ($num_matches !== 0) {
            for ($i = 0; $i<$num_matches; $i++) {

                if ($corpus === 'transcriptions') {
                    $page = $query[$i]['document']['page'];
                    $seq = $query[$i]['document']['seq'];
                    $foliation = $query[$i]['document']['foliation'];
                    $column = $query[$i]['document']['column'];
                    $docID = $query[$i]['document']['docID'];
                    $pageID = $query[$i]['document']['pageID'];
                    $typesenseID = $query[$i]['document']['id'];
                    $text_tokenized = $query[$i]['document']['transcription_tokens'];
                    $text_lemmatized = $query[$i]['document']['transcription_lemmata'];
                }
                else {
                    $table_id = $query[$i]['document']['table_id'];
                    $chunk = $query[$i]['document']['chunk'];
                    $typesenseID = $query[$i]['document']['id'];
                    $text_tokenized = $query[$i]['document']['edition_tokens'];
                    $text_lemmatized = $query[$i]['document']['edition_lemmata'];
                }

                $title = $query[$i]['document']['title'];
                $creator = $query[$i]['document']['creator'];

                // Get all lower-case and upper-case token positions (lemmatized or unlemmatized) in the current column (measured in words)
                if ($lemmatize) {
                    $pos_lower = $this->getPositions($text_lemmatized, $lemmata[0], $filter);
                    $pos_upper = $this->getPositions($text_lemmatized, ucfirst($lemmata[0]), $filter);
                } else {
                    $pos_lower = $this->getPositions($text_tokenized, $token, $filter);
                    $pos_upper = $this->getPositions($text_tokenized, ucfirst($token), $filter);
                }

                // Merge positions to one ordered array without duplicates
                $pos_all = array_unique(array_merge($pos_lower, $pos_upper));
                sort($pos_all);

                // Arrays to store matched passages and tokens in them as well as passage-coordinates and matched tokens
                $passage_tokenized = [];
                $passage_lemmatized = [];
                $passage_coordinates = [];
                $tokens_matched = [];

                // Get all passages, which contain the matched token, as a list of tokens (and lemmata)
                foreach ($pos_all as $pos) {

                    // Get tokenized and lemmatized passage and passage coordinates (measured in tokens, relative to the column)
                    $passage_data = $this->getPassage($text_tokenized, $pos, $keywordDistance);
                    $passage_tokenized[] = $passage_data['passage'];

                    if ($lemmatize) {
                        $passage_data = $this->getPassage($text_lemmatized, $pos, $keywordDistance);
                        $passage_lemmatized[] = $passage_data['passage'];
                    }

                    $passage_coordinates[] = [$passage_data['start'], $passage_data['end']];

                    // Collect all matched tokens contained in the current passage in an array – will be used for highlighting keywords in js
                    $tokens_matched[] = $text_tokenized[$pos];
                }

                // Remove duplicates from the tokens_matched array – also adjust the keys
                $tokens_matched = array_values(array_unique($tokens_matched));

                // Get number of matched passages in the matched column
                $num_passages = count($passage_tokenized);

                $matched_token_positions = [];

                for ($j=0; $j<$num_passages, $j++;) {
                    $matched_token_positions[] = [];
                }

                // Collect data
                if ($corpus === 'transcriptions') {
                    $data[] = [
                        'title' => $title,
                        'page' => $page,
                        'seq' => $seq,
                        'positions' => $pos_all,
                        'foliation' => $foliation,
                        'column' => $column,
                        'creator' => $creator,
                        'pageID' => $pageID,
                        'typesenseID' => $typesenseID,
                        'docID' => $docID,
                        'text_tokenized' => $text_tokenized,
                        'text_lemmatized' => $text_lemmatized,
                        'tokens_for_query' => $tokens_for_query,
                        'lemmata' => $lemmata,
                        'filters' => [],
                        'tokens_matched' => $tokens_matched,
                        'num_passages' => $num_passages,
                        'passage_coordinates' => $passage_coordinates,
                        'passage_tokenized' => $passage_tokenized,
                        'passage_lemmatized' => $passage_lemmatized,
                        'lemmatize' => $lemmatize,
                        'matched_token_positions' => $matched_token_positions
                    ];
                }
                else {
                    $data[] = [
                        'title' => $title,
                        'positions' => $pos_all,
                        'chunk' => $chunk,
                        'creator' => $creator,
                        'table_id' => $table_id,
                        'typesenseID' => $typesenseID,
                        'text_tokenized' => $text_tokenized,
                        'text_lemmatized' => $text_lemmatized,
                        'tokens_for_query' => $tokens_for_query,
                        'lemmata' => $lemmata,
                        'filters' => [],
                        'tokens_matched' => $tokens_matched,
                        'num_passages' => $num_passages,
                        'passage_coordinates' => $passage_coordinates,
                        'passage_tokenized' => $passage_tokenized,
                        'passage_lemmatized' => $passage_lemmatized,
                        'lemmatize' => $lemmatize,
                        'matched_token_positions' => $matched_token_positions
                    ];
                }

            }

            // Bring information in alphabetical and numerical order
            array_multisort($data);
        }

        return $data;
    }

    /**
     * filter out items from the collected matches, which do not also match a given token
     * @param array $data
     * @param string $token_plain
     * @param string $lemma
     * @param bool $lemmatize
     * @return array
     */
    private function filterData (array $data, string $token_plain, string $lemma, bool $lemmatize): array
    {

        if ($lemmatize) { // lemmatization requested

            // Remove all passages from $data, which do not match the additional keyword
            foreach ($data as $i => $match) {
                foreach ($match['passage_lemmatized'] as $j => $passage) {

                    $noMatch = true;

                    foreach ($passage as $k => $token) {

                        // Add matched tokens to tokens_matched array and make it unique
                        if ((str_contains($token, " " . $lemma . " ") or $token === $lemma) and strlen($lemma) > 1) { // filter out matches of single character lemmata like articles
                            $data[$i]['tokens_matched'][] = $match['passage_tokenized'][$j][$k];
                            $data[$i]['tokens_matched'] = array_unique($data[$i]['tokens_matched']);
                            $data[$i]['matched_token_positions'][$j][] = $data[$i]['passage_coordinates'][$j][0] + $k;
                            $noMatch = false;
                        }
                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data and adjust the num_passages in $data
                    if ($noMatch) {
                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['passage_coordinates'][$j]);
                        unset($data[$i]['positions'][$j]);
                        unset($data[$i]['matched_token_positions'][$j]);
                        $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                    }
                }
            }
        }

        else { // No lemmatization requested

            // Get filter type and clear keyword from asterisks
            $filter = $this->getFilterType($token_plain);
            $token_plain= str_replace("*", "", $token_plain);

            // Add matching tokens (depending on filter type) to the tokens_matched array in data
            foreach ($data as $i => $match) {

                $data[$i]['filters'][] = $filter;

                foreach ($match['passage_tokenized'] as $j => $passage) {

                    $num_matched_tokens = count($data[$i]['tokens_matched']);

                    foreach ($passage as $k => $token) {

                        if ($this->isMatching($token, $token_plain, $filter)) {
                            $data[$i]['tokens_matched'][] = $passage[$k];
                            $data[$i]['matched_token_positions'][$j][] = $data[$i]['passage_coordinates'][$j][0] + $k;
                        }
                    }

                    // If there was no matching token in a passage, remove it
                    if ($num_matched_tokens === count($data[$i]['tokens_matched'])) {

                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['passage_coordinates'][$j]);
                        unset($data[$i]['matched_token_positions'][$j]);
                        unset($data[$i]['positions'][$j]);
                        $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                    }
                    else { // Make tokens_matched array unique
                        $data[$i]['tokens_matched'] = array_unique($data[$i]['tokens_matched']);
                    }
                }
            }
        }

        // Unset all columns, which do not anymore have any passage_tokenized
        foreach ($data as $i=>$match) {
            if ($match['passage_tokenized'] === []) {
                unset ($data[$i]);
            }

            // Reset the keys of the remaining arrays
            else {
                $data[$i]['passage_tokenized'] = array_values($match['passage_tokenized']);
                $data[$i]['passage_lemmatized'] = array_values($match['passage_lemmatized']);
                $data[$i]['tokens_matched'] = array_values($match['tokens_matched']);
                $data[$i]['passage_coordinates'] = array_values($match['passage_coordinates']);
                $data[$i]['matched_token_positions'] = array_values($match['matched_token_positions']);
                $data[$i]['positions'] = array_values($match['positions']);

            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    /**
     * checks if a given string matches another one in one of four different filter modes
     * @param string $token
     * @param string $needle
     * @param string $filter
     * @return bool
     */
    private function isMatching (string $token, string $needle, string $filter): bool
    {

        $needleForLemmataCheck = " " . $needle . " ";

        if ($filter === 'match_full') {
            if ($token === $needle or $token === ucfirst($needle) or
                str_contains($token, $needleForLemmataCheck)) {
                return true;
            }
            else {
                return false;
            }
        }
        elseif ($filter === 'match_prefix') {

            if (strpos($token, $needle) === 0 or strpos($token, ucfirst($needle)) === 0) {
                return true;
            }
            else {
                return false;
            }
        }
        elseif ($filter === 'match_suffix') {

            if (strpos($token, $needle) !== false and strpos($token, $needle) == strlen($token)-strlen($needle)) {
                return true;
            }
            else {
                return false;
            }
        }
        elseif ($filter === 'match_body') {

            if (strpos($token, $needle) !== false and strpos($token, $needle) != 0
                and strpos($token, $needle) !== strlen($token)-strlen($needle)) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    /**
     * calculates the desired filter type based on the asterisk positions contained in a token
     * @param string $token
     * @return string
     */
    private function getFilterType (string $token): string
    {

        if (substr_count($token, '*') !== 0) {
            $num_chars = strlen($token);
            if (($token[0] === '*') and $token[$num_chars-1] !== '*') {
                $filter = 'match_suffix';
            }
            elseif (($token[0] === '*') and $token[$num_chars-1] === '*') {
                $filter = 'match_body';
            }
            elseif ($token[$num_chars-1] === '*') {
                $filter = 'match_prefix';
            }
        }
        else {
            $filter = 'match_full';
        }

        return $filter;
    }

    /**
     * calculates all numerical positions of a given token (word or lemma) in a text
     * @param array $transcript
     * @param string $token
     * @param string $filter
     * @return array
     */
    private function getPositions (array $text, string $token, string $filter): array
    {

        // Array, which will be returned
        $positions = [];

        // Check every token in the text (which may be lemmatized), if it matches the queried token
        for ($i=0; $i<count($text); $i++) {

            $current_token = $text[$i];

            // Depending on the filter algorithm, append all positions of the queried token in the text to the positions array
            if ($current_token !== null && $this->isMatching($current_token, $token, $filter)) {
                $positions[] = $i;
            }
        }

        return $positions;
    }

    /**
     * cuts out a passage from a text based on the numerical position of a token and a given keyword distance
     * @param array $transcript
     * @param int $pos
     * @param int $keywordDistance
     * @return array
     */
    private function getPassage (array $text, int $pos, int $keywordDistance): array
    {

        // Store the token at the given position into an array and use this array in the next steps to collect the passage in it
        $passage = [$text[$pos]];

        // Variables to store passage borders in
        $passage_start = 0;
        $passage_end = 0;

        // Get total number of tokens in the transcript (could be lemmatized)
        $num_tokens = count($text);

        // Get a list of all preceding and all succeeding tokens of the token at pos and count these tokens
        $prec_tokens = array_slice($text, 0, $pos);
        $suc_tokens = array_slice($text, $pos+1, $num_tokens);
        $num_prec_tokens = count($prec_tokens);
        $num_suc_tokens = count($suc_tokens);

        // Add as many preceding tokens to the passage-array, as the total number of preceding tokens and the keywordDistance size allow
        for ($i=0; $i<$keywordDistance and $i<$num_prec_tokens; $i++) {
            array_unshift($passage, array_reverse($prec_tokens)[$i]);
            $passage_start = $pos - $i - 1;
        }

        // Add as many succeeding words to the passage-array, as the total number of succeeding tokens and the keywordDistance size allow
        for ($i=0; $i<$keywordDistance and $i<$num_suc_tokens; $i++) {
            $passage[] = $suc_tokens[$i];
            $passage_end = $pos + $i + 1;
        }

        // If first token of the passage is punctuation, remove it
        if (empty($passage[0]) or strpos(".,:;- –]/", $passage[0]) !== false) {
            array_shift($passage);
            $passage_start = $passage_start + 1;
        }

        return ['passage' => $passage, 'start' => $passage_start, 'end' => $passage_end];
    }

    /**
     * returns all creators or titles stored in the transcriptions or editions indices
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
     * @param Client $client
     * @param string $whichIndex
     * @return bool
     */
    static public function updateDataCache (SystemManager $systemManager, Client $client, string $whichIndex, ?LoggerInterface $logger): bool
    {

        $cache = $systemManager->getSystemDataCache();

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
     * returns all transcriber names from the cache or the corresponding  indices
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
        $config = $this->systemManager->getConfig();
        $status = 'OK';
        $now = TimeString::now();

        // Get data from cache, if data is not cached, get data from open search index and set the cache
        try {
            $data = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $client = $this->instantiateTypesenseClient($config);
            if ($client === false) {
                return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
            }

            // Get a list of all items
            $data = self::getAllEntriesFromIndex($client, $queryKey, $this->logger);
            if (count($data) !== 0) {
                // Set cache if there's some data
                // (if there are no items it's probably because the index hasn't been populated yet)
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

    /**
     * instantiates and returns a Typesense client
     * @param array $config
     * @return false|Client
     */
    public function instantiateTypesenseClient(array $config): Client|false
    {
       return self::getTypesenseClient($config, $this->logger);
    }

    /**
     * instantiates and returns a typesense client via a static function
     * @param array $config
     * @param LoggerInterface|null $logger
     * @return false|Client
     */
    static public function getTypesenseClient(array $config, ?LoggerInterface $logger = null): Client|false
    {
        if ($logger === null) {
            $logger = new NullLogger();
        }
        try {
            return new Client(
                [
                    'api_key' => $config[ApmConfigParameter::TYPESENSE_KEY],
                    'nodes' => [
                        [
                            'host' => $config[ApmConfigParameter::TYPESENSE_HOST], // For Typesense Cloud use xxx.a1.typesense.net
                            'port' => $config[ApmConfigParameter::TYPESENSE_PORT],      // For Typesense Cloud use 443
                            'protocol' => $config[ApmConfigParameter::TYPESENSE_PROTOCOL],      // For Typesense Cloud use https
                        ],
                    ],
                    'connection_timeout_seconds' => 1,
                ]
            );
        } catch (ConfigError $e) {
            $logger->error("Typesense configuration exception: " . $e->getMessage());
            return false;
        }
    }
}