<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
use APM\System\Cache\CacheKey;
use APM\System\Lemmatizer;
use APM\System\SystemManager;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;

class ApiSearch extends ApiController
{

    const CLASS_NAME = 'Search';
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws KeyNotInCacheException
     */

    // Function to search in an OpenSearch-Index – returns an api response to js
    public function search(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        // Name of the index, that should be queried and informative variables for the API response
        // Informative variables for the API response
        $status = 'OK';
        $now = TimeString::now();

        $this->profiler->start();

        // Get all user input!
        $corpus = $_POST['corpus'];
        $searched_phrase = $this->removeBlanks(strtolower($_POST['searched_phrase'])); // Lower-case and without additional blanks
        $title = $_POST['title'];
        $creator = $_POST['creator'];
        $keywordDistance = $_POST['keywordDistance'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);
        $lang = $_POST['lang'] ?? 'detect';

        // Name of the index to query
        $index_name = $this->getIndexName($corpus, $lang);

        // Log query
        $this->logger->debug("Input parameters", [ 'text' => $searched_phrase, 'keywordDistance' => $keywordDistance, 'lang' => $lang, 'lemmatize' => $lemmatize]);

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateOpenSearchClient($this->systemManager);
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searched_phrase' => $searched_phrase,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }

        $this->profiler->lap("Setup");

        // If wished, lemmatize searched keywords
        if ($lemmatize) {
            $tokensForQuery = $this->getLemmata($searched_phrase, $lang);
        }
        else {
            $tokensForQuery = explode(" ", $searched_phrase);
        }

        $this->logger->debug($tokensForQuery[0]);
        //$this->logger->debug($tokensForQuery[1]);

        $lemmata = $tokensForQuery;

        // Count tokens
        $numTokens = count($tokensForQuery);

        $this->profiler->lap("Lemmatization");

        // Query index
        try {
            $query = $this->makeOpenSearchQuery($client, $index_name, $lang,  $title, $creator, $tokensForQuery, $lemmatize, $corpus);
        } catch (\Exception $e) {
            $status = "OpenSearch query problem";
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

        $this->profiler->lap("Opensearch query");

        // Get all information about the matched entries, including passages with the matched token as lists of tokens
        $data = $this->getData($query, $tokensForQuery[0], $tokensForQuery, $lemmata, $keywordDistance, $lemmatize, $corpus);

        $this->profiler->lap("getData");

        $this->logger->debug(count($data));

        // Until now, there was no check, if the queried keywords are close enough to each other, depending on the keywordDistance value
        // So, if there is more than one token in the searched phrase, now filter out all columns and passages, which do not match all tokens in the desired way
        if ($numTokens !== 1) {
            for ($i=1; $i<$numTokens; $i++) {
                $data = $this->filterData($data, $tokensForQuery[$i], $lemmata[$i], $lemmatize);
            }
        }

        // Crop data if there are more than 999 passages matched
        $num_passages_total = $this->getnumPassages($data);
        $max_passages = 999;
        $cropped = false;
        $num_passages_cropped = $num_passages_total;

        if ($num_passages_total>$max_passages) {
            $data = $this->cropData($data, $max_passages);
            $num_passages_cropped = $this->getNumPassages($data);
            $cropped = true;
        }

        $this->profiler->stop();
        $this->logTimeProfile();

        // ApiResponse
        return $this->responseWithJson($response, [
            'index' => $index_name,
            'searched_phrase' => $searched_phrase,
            'lang' => $lang,
            'num_passages_total' => $num_passages_total,
            'cropped' => $cropped,
            'num_passages_cropped' => $num_passages_cropped,
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    // Get lemmata of words from cache or run lemmatizer
    private function getLemmata (string $searched_phrase, $lang): array {

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
            $this->logger->debug(count($tokensToLemmatize) . " tokens not in cache, need to run lemmatizer", $tokensToLemmatize);
            $phrase = implode(' ', $tokensToLemmatize);
            $tokens_and_lemmata = Lemmatizer::runLemmatizer($lang, $phrase);
            $lemmata = $tokens_and_lemmata['lemmata'];
            foreach ($lemmata as $i => $lemma) {
                $cacheKey = $this->getLemmaCacheKey($tokensToLemmatize[$i]);
                $cache->set($cacheKey, $lemma);

                $lemma = explode(" ", $lemma); // check if it is a complex lemma, e. g. article + noun in arabic/hebrew
                foreach ($lemma as $complexLemmaPart) {
                    $tokensForQuery[] = $complexLemmaPart;
                }
                $this->logger->debug("Cached lemma '$lemma' for token '$tokensToLemmatize[$i]' with cache key '$cacheKey'");
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


    // Get full number of passages stored in data-array
    private function getNumPassages(array $data): int {

        $num_passages_total = 0;
        foreach ($data as $matched_column) {
            $num_passages_total = $num_passages_total + $matched_column['num_passages'];
        }

        return $num_passages_total;
    }

    private function cropData (array $data, int $max_passages): array {

            $num_passages_cropped = 0;
            foreach ($data as $i=>$matched_column) {
                if ($num_passages_cropped > $max_passages) {
                    $data = array_slice($data,0, $i);
                    break;
                }
                $num_passages_cropped = $num_passages_cropped + $matched_column['num_passages'];
            }

        return  $data;
    }

    private function getIndexName(string $corpus, string $lang): string {
        if ($lang != 'jrb') {
            $index_name = $corpus . '_' . $lang;
        }
        else {
            $index_name = $corpus . '_he';
        }

        return $index_name;
    }

    private  function getLemmaCacheKey($word): string
    {
        return CacheKey::ApiSearchLemma . $word;
    }

    private function removeBlanks ($searched_phrase): array|string|null
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

    // Function, which instantiates OpenSearch client
    static private function instantiateOpenSearchClient ($systemManager): Client
    {
        // Load authentication data from config-file
        $config = $systemManager->getConfig();

        return (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();
    }

    // Function to query a given OpenSearch-index
    private function makeOpenSearchQuery ($client, $index_name, $lang, $title, $creator, $tokens, $lemmatize, $corpus) {

        $this->logger->debug("Making opensearch query", [ 'index' => $index_name, 'tokens' => $tokens, 'title' => $title, 'creator' => $creator]);

        // Check lemmatize (boolean) and corpus to determine the target of the query
        if ($lemmatize) {
            if ($corpus === 'transcriptions') {
                $area_of_query = 'transcription_lemmata';
            }
            else {
                $area_of_query = 'edition_lemmata';
            }
        }
        else {
            if ($corpus === 'transcriptions') {
                $area_of_query = 'transcription_tokens';
            }
            else {
                $area_of_query = 'edition_tokens';
            }        }

        $mustConditions = [];

        $mustConditions[] = [ 'match' => ['lang' => $lang]];

        foreach ($tokens as $token) {
            if ($lemmatize) {
                // MODIFY HERE FOR HANDLING OF COMPLEX LEMMATA
                $mustConditions[] = ['match' => [
                    $area_of_query => " " . $token . " " // complex tokens are lemmatized as strings of lemmata, separated by blanks
                ]];
            } else {
                $mustConditions[] = ['wildcard' => [
                    $area_of_query => $token
                ]];
            }
        }

        if ($creator !== '') {
            $mustConditions[] = [ 'match_phrase' => [
                'creator' => [
                    "query" => $creator
                ]
            ]];
        }

        if ($title !== '') {
            $mustConditions[] = [ 'match_phrase' => [
                'title' => [
                    "query" => $title
                ]
            ]];
        }

        return $client->search([
            'index' => $index_name,
            'body' => [
                'size' => 20000,
                'query' => [
                    'bool' => [
                        'must' => $mustConditions
                    ]
                ]
            ]
        ]);
    }

    // Get all information about matches, specified for a single document or all documents
    private function getData (array $query, string $token, array $tokens_for_query, array $lemmata, int $keywordDistance, bool $lemmatize, string $corpus): array {

        // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
        $filter = $this->getFilterType($token);
        $token = str_replace("*", "", $token);

        // Variable to collect all relevant data in
        $data = [];

        // Get number of matched columns
        $num_matches = $query['hits']['total']['value'];

        // If there are any matched columns, collect them all in an ordered and nested array of columns
        if ($num_matches !== 0) {
            for ($i = 0; $i<$num_matches; $i++) {

                if ($corpus === 'transcriptions') {
                    // Get all relevant column-data
                    $page = $query['hits']['hits'][$i]['_source']['page'];
                    $seq = $query['hits']['hits'][$i]['_source']['seq'];
                    $foliation = $query['hits']['hits'][$i]['_source']['foliation'];
                    $column = $query['hits']['hits'][$i]['_source']['column'];
                    $docID = $query['hits']['hits'][$i]['_source']['docID'];
                    $pageID = $query['hits']['hits'][$i]['_source']['pageID'];
                    $openSearchID = $query['hits']['hits'][$i]['_id'];
                    $text_tokenized = $query['hits']['hits'][$i]['_source']['transcription_tokens'];
                    $text_lemmatized = $query['hits']['hits'][$i]['_source']['transcription_lemmata'];
                    $score = $query['hits']['hits'][$i]['_score'];
                }
                else {
                    // Get all relevant column-data
                    $table_id = $query['hits']['hits'][$i]['_source']['table_id'];
                    $chunk = $query['hits']['hits'][$i]['_source']['chunk'];
                    $text_tokenized = $query['hits']['hits'][$i]['_source']['edition_tokens'];
                    $text_lemmatized = $query['hits']['hits'][$i]['_source']['edition_lemmata'];
                    $score = $query['hits']['hits'][$i]['_score'];
                }

                $title = $query['hits']['hits'][$i]['_source']['title'];
                $creator = $query['hits']['hits'][$i]['_source']['creator'];

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


                if (count($pos_all) == 2 && ($pos_all[1]-$pos_all[0])<$keywordDistance) {
                        unset($pos_all[0]);
                        $pos_all = array_values($pos_all);
                }

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
                        'openSearchID' => $openSearchID,
                        'docID' => $docID,
                        'text_tokenized' => $text_tokenized,
                        'text_lemmatized' => $text_lemmatized,
                        'tokens_for_query' => $tokens_for_query,
                        'lemmata' => $lemmata,
                        'filters' => [$filter],
                        'tokens_matched' => $tokens_matched,
                        'num_passages' => $num_passages,
                        'passage_coordinates' => $passage_coordinates,
                        'passage_tokenized' => $passage_tokenized,
                        'passage_lemmatized' => $passage_lemmatized,
                        'lemmatize' => $lemmatize,
                        'score' => $score
                    ];
                }
                else {
                    $data[] = [
                        'title' => $title,
                        'positions' => $pos_all,
                        'chunk' => $chunk,
                        'creator' => $creator,
                        'table_id' => $table_id,
                        'text_tokenized' => $text_tokenized,
                        'text_lemmatized' => $text_lemmatized,
                        'tokens_for_query' => $tokens_for_query,
                        'lemmata' => $lemmata,
                        'filters' => [$filter],
                        'tokens_matched' => $tokens_matched,
                        'num_passages' => $num_passages,
                        'passage_coordinates' => $passage_coordinates,
                        'passage_tokenized' => $passage_tokenized,
                        'passage_lemmatized' => $passage_lemmatized,
                        'lemmatize' => $lemmatize,
                        'score' => $score
                    ];
                }

            }

            // Bring information in alphabetical and numerical order
            array_multisort($data);
        }

        return $data;
    }

    // Function to filter out data, which do not match additional tokens in the searched phrase
    private function filterData (array $data, string $token_plain, string $lemma, bool $lemmatize): array {

        if ($lemmatize) { // Lemmatization requested

            // Remove all passages from $data, which do not match the additional keyword
            foreach ($data as $i => $match) {
                foreach ($match['passage_lemmatized'] as $j => $passage) {
                    foreach ($passage as $k => $token) {

                        // Add matched tokens to tokens_matched array and make it unique
                        if ((str_contains($token, " " . $lemma . " ") or $token === $lemma) and strlen($lemma) > 2) { // filter out matches of single character lemmata like articles
                            $data[$i]['tokens_matched'][] = $match['passage_tokenized'][$j][$k];
                            $data[$i]['tokens_matched'] = array_unique($data[$i]['tokens_matched']);
                        }
                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data and adjust the num_passages in $data
                    $noMatch = true;
                    foreach ($passage as $token) {
                        if (str_contains($token, " " . $lemma . " ") or $token === $lemma) {
                            $noMatch = false;
                        }
                    }

                    if ($noMatch) {
                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['passage_coordinates'][$j]);
                        unset($data[$i]['positions'][$j]);
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

                    $num_matched_tokens =  count($data[$i]['tokens_matched']);

                        foreach ($passage as $k => $token) {

                            if ($this->isMatching($token, $token_plain, $filter)) {
                                $data[$i]['tokens_matched'][] = $passage[$k];
                            }
                        }

                        // If there was no matching token in a passage, remove it
                    if ($num_matched_tokens === count($data[$i]['tokens_matched'])) {

                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['passage_coordinates'][$j]);
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
                $data[$i]['positions'] = array_values($match['positions']);
            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    // Function, to check if $needle is matching $token in one of four different modes
    private function isMatching (string $token, string $needle, string $filter): bool {

        $needleForLemmataCheck = " " . $needle . " ";

        if ($filter === 'match_full') {
            // MODIFY HERE FOR HANDLING OF COMPLEX LEMMATA
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

    // Function to return needed search algorithm based on the asterisks contained in the queried token
    private function getFilterType (string $token): string {

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

    // Function to get all positions of a given token (plain or lemma) in a transcript
    private function getPositions (array $transcript, string $token, string $filter): array {

        // Array, which will be returned
        $positions = [];

        // Check every token in the transcript (which may be lemmatized), if it matches the queried token
        for ($i=0; $i<count($transcript); $i++) {

            $current_token = $transcript[$i];

            // Depending on the filter algorithm, append all positions of the queried token in the transcript to the positions array
            if ($current_token !== null && $this->isMatching($current_token, $token, $filter)) {
                $positions[] = $i;
            }
        }

        return $positions;
    }

    // Function to cut out a passage of a transcript
    private function getPassage (array $transcript, int $pos, int $keywordDistance): array {

        // Store the token at the given position into an array and use this array in the next steps to collect the passage in it
        $passage = [$transcript[$pos]];

        // Variables to store passage borders in
        $passage_start = 0;
        $passage_end = 0;

        // Get total number of tokens in the transcript (could be lemmatized)
        $num_tokens = count($transcript);

        // Get a list of all preceding and all succeeding tokens of the token at pos and count these tokens
        $prec_tokens = array_slice($transcript, 0, $pos);
        $suc_tokens = array_slice($transcript, $pos+1, $num_tokens);
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

    // Function to get a full list of i. e. titles or transcribers values in the index
    static private function getAllEntriesFromIndex ($client, string $queryKey): array { // $queryKey can be 'transcription' or 'transcriber' or 'editor' or 'edition'

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

            $query = $client->search([
                'index' => $index_name,
                'size' => 20000,
                'body' => [
                    "query" => [
                        "match_all" => [
                            "boost" => 1.0
                        ]
                    ],
                ]
            ]);


            // Append every value of the queried field to the $values-array, if not already done before (no duplicates)
            foreach ($query['hits']['hits'] as $match) {
                $value = $match['_source'][$queryKey];
                if (in_array($value, $values) === false) {
                    $values[] = $value;
                }
            }
        }

        return $values;
    }

    static public function updateDataCache (SystemManager $systemManager, string $whichindex) {

        $cache = $systemManager->getSystemDataCache();

        // Instantiate OpenSearch client
        try {
            $client = self::instantiateOpenSearchClient($systemManager);
        } catch (Exception $e) {
            return false;
        }
        
        if ($whichindex === 'transcriptions')
        {
            $transcriptions = self::getAllEntriesFromIndex($client, 'transcription');
            $transcribers = self::getAllEntriesFromIndex($client, 'transcriber');
            $cache->set(CacheKey::ApiSearchTranscriptions, serialize($transcriptions));
            $cache->set(CacheKey::ApiSearchTranscribers, serialize($transcribers));
            
        }
        else if ($whichindex === 'editions') {
            $editions = self::getAllEntriesFromIndex($client, 'edition');
            $editors = self::getAllEntriesFromIndex($client, 'editor');
            $cache->set(CacheKey::ApiSearchEditions, serialize($editions));
            $cache->set(CacheKey::ApiSearchEditors, serialize($editors));
        }
        
        return true;
    }

    // ApiCall – Function to get all doc titles
    public function getTranscriptionTitles(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchTranscriptions, 'transcription');
    }

    public function getTranscribers(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchTranscribers, 'transcriber');
    }

    public function getEditionTitles(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchEditions, 'edition');
    }

    public function getEditors(Request $request, Response $response): Response
    {
        return $this->getDataFromCacheOrIndex($request, $response, CacheKey::ApiSearchEditors, 'editor');
    }

    private function getDataFromCacheOrIndex(Request $request, Response $response, string $cacheKey, string $queryKey): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $cache = $this->systemManager->getSystemDataCache();
        $status = 'OK';
        $now = TimeString::now();

        // Get data from cache, if data is not cached, get data from open search index and set the cache
        try {
            $data = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException $e) {
            // Instantiate OpenSearch client
            try {
                $client = $this->instantiateOpenSearchClient($this->systemManager);
            } catch (Exception $e) {
                $status = 'Connecting to OpenSearch server failed.';
                return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
            }

            // Get a list of all items
            $data = self::getAllEntriesFromIndex($client, $queryKey);

            // Set cache
            $cache->set($cacheKey, serialize($data));
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
