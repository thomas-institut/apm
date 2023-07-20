<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
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

    const LEMMATA_CACHE_PREFIX = 'SearchLemma_';
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
        $doc_title = $_POST['title'];
        $transcriber = $_POST['transcriber'];
        $radius = $_POST['radius'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);
        $lang = $_POST['lang'] ?? 'detect';

        // Name of the index to query
        if ($lang != 'jrb') {
            $index_name = $corpus . '_' . $lang;
        }
        else {
            $index_name = $corpus . '_he';
        }

        $this->logger->debug("Input parameters", [ 'text' => $searched_phrase, 'radius' => $radius, 'lang' => $lang, 'lemmatize' => $lemmatize]);

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient($this->systemManager);
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searched_phrase' => $searched_phrase,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }

        $this->profiler->lap("Setup");
        $tokensForQuery = [];

        if ($lemmatize) {
            // Lemmatization in python is very slow, so we need to cache it as much as possible
            $cache = $this->systemManager->getSystemDataCache();
            $searchTokens = explode(' ', $searched_phrase);
            $tokensToLemmatizeWithPython = [];

            foreach($searchTokens as $token) {
                $cacheKey = $this->getLemmaCacheKey($token);
                if ($cache->isInCache($cacheKey)) {
                    $tokensForQuery[] = $cache->get($cacheKey);
                } else {
                    $tokensToLemmatizeWithPython[] = $token;
                }
            }
            if (count($tokensToLemmatizeWithPython) > 0) {
                $this->logger->debug(count($tokensToLemmatizeWithPython) . " tokens not in cache, need to run python lemmatizer", $tokensToLemmatizeWithPython);
                $phrase = implode(' ', $tokensToLemmatizeWithPython);
                exec("python3 ../python/Lemmatizer_Query.py $lang $phrase", $tokens_and_lemmata, $returnValue);
                // Log output from exec-function
                $this->logger->debug('output', [$tokens_and_lemmata, $returnValue]);
                $lang = $tokens_and_lemmata[0];
                $lemmata = explode("#", $tokens_and_lemmata[2]);
                foreach ($lemmata as $i => $lemma) {
                    $tokensForQuery[] = $lemma;
                    $cache->set($this->getLemmaCacheKey($tokensToLemmatizeWithPython[$i]), $lemma);
                }
            }
        }
        else {
            $tokensForQuery = explode(" ", $searched_phrase);
        }
        $lemmata = $tokensForQuery;

        // Count tokens
        $numTokens = count($tokensForQuery);

        $this->profiler->lap("Lemmatization");

        // Query index for the first token in tokens_for_query – additional tokens will be handled below
        try {
            $query = $this->makeOpenSearchQuery($client, $index_name, $lang,  $doc_title, $transcriber, $tokensForQuery, $lemmatize);
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

        // Get all information about the matched columns, including passages with the matched token as lists of tokens
        $data = $this->getData($query, $tokensForQuery[0], $tokensForQuery, $lemmata, $radius, $lemmatize);

        $this->profiler->lap("getData");

        // Until now, only the first token in the searched phrase was handled
        // So, if there is more than one token in the searched phrase, now filter out all columns and passages, which do not match all tokens
        if ($numTokens !== 1) {
            for ($i=1; $i<$numTokens; $i++) {
                $data = $this->filterData($data, $tokensForQuery[$i], $lemmata[$i], $lemmatize);
            }
        }

        // Get total and cropped number of matched passages
        $num_passages_total = 0;
        $max_results = 999;
        $cropped = false;

        foreach ($data as $matched_column) {
            $num_passages_total = $num_passages_total + $matched_column['num_passages'];
        }

        if ($num_passages_total > $max_results) {
            $num_passages_cropped = 0;
            foreach ($data as $i=>$matched_column) {
                if ($num_passages_cropped > $max_results) {
                    $data = array_slice($data,0, $i);
                    $cropped = true;
                    break;
                }
                $num_passages_cropped = $num_passages_cropped + $matched_column['num_passages'];
            }
        }
        else {
            $num_passages_cropped = $num_passages_total;
        }

//        if (sizeof($data) > 200) {
//            $data = array_slice($data, 0, 200);
//            $cropped = true;
//            // Get total number of matched passages in cropped data
//            foreach ($data as $matched_column) {
//                $num_passages_cropped = $num_passages_cropped + $matched_column['num_passages'];
//            }
//        }
//        else {
//            $num_passages_cropped = $num_passages_total;
//        }

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

    private  function getLemmaCacheKey($word): string
    {
        return self::LEMMATA_CACHE_PREFIX . $word;
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
    static private function instantiateClient ($systemManager): Client
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
    private function makeOpenSearchQuery ($client, $index_name, $lang, $doc_title, $transcriber, $tokens, $lemmatize) {

        $this->logger->debug("Making opensearch query", [ 'index' => $index_name, 'tokens' => $tokens, 'doc' => $doc_title, 'transcriber' => $transcriber]);
//        $first_token_for_query = $tokens[0];
        // Check lemmatize (boolean) to determine the area of the query
        if ($lemmatize) {
            $area_of_query = 'transcript_lemmata';
        }
        else {
            $area_of_query = 'transcript_tokens';
        }

        $mustConditions = [];

        $mustConditions[] = [ 'match' => ['lang' => $lang]];
        foreach ($tokens as $token) {
            $mustConditions[] = [ 'wildcard' => [
                $area_of_query => $token
            ]];
        }

        if ($transcriber !== '') {
            $mustConditions[] = [ 'match_phrase_prefix' => [
                'transcriber' => [
                    "query" => $transcriber
                ]
            ]];
        }

        if ($doc_title !== '') {
            $mustConditions[] = [ 'match_phrase_prefix' => [
                'title' => [
                    "query" => $doc_title
                ]
            ]];
        }

        // Search in all indexed columns
//        if ($doc_title === "" and $transcriber === "") {
//            $query = $client->search([
//                'index' => $index_name,
//                'body' => [
//                    'from' => 0,
//                    'size' => 20000,
//                    'query' => [
//                        'bool' => [
//                            'must' => $mustConditions
////                            'must' => [
////                                'query_string' => [
////                                    "query" => $first_token_for_query,
////                                    "default_field" => $area_of_query,
////                                    "analyze_wildcard" => true,
////                                    "allow_leading_wildcard" => true
////                                ]
////                            ]
//                        ]
//                    ]
//                ]
//            ]);
//        }
//
//        // Search only in specific columns, specified by transcriber or title
//        elseif ($transcriber === "") {
//
//            $query = $client->search([
//                'index' => $index_name,
//                'body' => [
//                    'size' => 20000,
//                    'query' => [
//                        'bool' => [
//                            'filter' => [
//                                'match_phrase_prefix' => [
//                                    'title' => [
//                                        "query" => $doc_title
//                                    ]
//                                ]
//                            ],
//                            'must' => [
//                                'query_string' => [
//                                    "query" => $first_token_for_query,
//                                    "default_field" => $area_of_query,
//                                    "analyze_wildcard" => true,
//                                    "allow_leading_wildcard" => true
//                                ]
//                            ]
//                        ]
//                    ]
//                ]
//            ]);
//        }
//
//        elseif ($doc_title === "") {
//
//            $query = $client->search([
//                'index' => $index_name,
//                'body' => [
//                    'size' => 20000,
//                    'query' => [
//                        'bool' => [
//                            'filter' => [
//                                'match_phrase_prefix' => [
//                                    'transcriber' => [
//                                        "query" => $transcriber
//                                    ]
//                                ]
//                            ],
//                            'must' => [
//                                'query_string' => [
//                                    "query" => $first_token_for_query,
//                                    "default_field" => $area_of_query,
//                                    "analyze_wildcard" => true,
//                                    "allow_leading_wildcard" => true
//                                ]
//                            ]
//                        ]
//                    ]
//                ]
//            ]);
//        }
//        // Transcriber AND title are given
//        else {
//
//            $query = $client->search([
//                'index' => $index_name,
//                'body' => [
//                    'size' => 20000,
//                    'query' => [
//                        'bool' => [
//                            'filter' => [
//                                'match_phrase_prefix' => [
//                                    'title' => [
//                                        "query" => $doc_title
//                                    ]
//                                ]
//                            ],
//                            'should' => [
//                                'match_phrase_prefix' => [
//                                    'transcriber' => [
//                                        "query" => $transcriber,
//                                    ]
//                                ]
//                            ],
//                            "minimum_should_match" => 1,
//                            'must' => [
//                                'query_string' => [
//                                    "query" => $first_token_for_query,
//                                    "default_field" => $area_of_query,
//                                    "analyze_wildcard" => true,
//                                    "allow_leading_wildcard" => true
//                                ]
//                            ]
//                        ]
//                    ]
//                ]
//            ]);
//        }

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
    private function getData (array $query, string $token, array $tokens_for_query, array $lemmata, int $radius, bool $lemmatize): array {

        // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
        $filter = $this->getFilterType($token);
        $token = str_replace("*", "", $token);

        // Variable to collect all relevant data in
        $data = [];

        // Get number of matched columns
        $num_columns = $query['hits']['total']['value'];

//        $num_columns = count($query['hits']['hits']);

        // If there are any matched columns, collect them all in an ordered and nested array of columns
        if ($num_columns !== 0) {
            for ($i = 0; $i<$num_columns; $i++) {

                // Get all relevant column-data
                $title = $query['hits']['hits'][$i]['_source']['title'];
                $page = $query['hits']['hits'][$i]['_source']['page'];
                $seq = $query['hits']['hits'][$i]['_source']['seq'];
                $foliation = $query['hits']['hits'][$i]['_source']['foliation'];
                $column = $query['hits']['hits'][$i]['_source']['column'];
                $transcriber = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcript = $query['hits']['hits'][$i]['_source']['transcript'];
                $docID = $query['hits']['hits'][$i]['_source']['docID'];
                $pageID = $query['hits']['hits'][$i]['_id'];
                $transcript_tokenized = $query['hits']['hits'][$i]['_source']['transcript_tokens'];
                $transcript_lemmatized = $query['hits']['hits'][$i]['_source']['transcript_lemmata'];
                $score = $query['hits']['hits'][$i]['_score'];

                // Get all lower-case and upper-case token positions (lemmatized or unlemmatized) in the current column (measured in words)
                if ($lemmatize) {
                    $pos_lower = $this->getPositions($transcript_lemmatized, $lemmata[0], $filter);
                    $pos_upper = $this->getPositions($transcript_lemmatized, ucfirst($lemmata[0]), $filter);
                } else {
                    $pos_lower = $this->getPositions($transcript_tokenized, $token, $filter);
                    $pos_upper = $this->getPositions($transcript_tokenized, ucfirst($token), $filter);
                }

                // Merge positions to one ordered array without duplicates
                $pos_all = array_unique(array_merge($pos_lower, $pos_upper));
                sort($pos_all);


                if (count($pos_all) == 2 && ($pos_all[1]-$pos_all[0])<$radius) {
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
                        $passage_data = $this->getPassage($transcript_tokenized, $pos, $radius);
                        $passage_tokenized[] = $passage_data['passage'];

                        if ($lemmatize) {
                            $passage_data = $this->getPassage($transcript_lemmatized, $pos, $radius);
                            $passage_lemmatized[] = $passage_data['passage'];
                        }

                        $passage_coordinates[] = [$passage_data['start'], $passage_data['end']];

                        // Collect all matched tokens contained in the current passage in an array – will be used for highlighting keywords in js
                        $tokens_matched[] = $transcript_tokenized[$pos];
                }

                // Remove duplicates from the tokens_matched array – also adjust the keys
                $tokens_matched = array_values(array_unique($tokens_matched));

                // Get number of matched passages in the matched column
                $num_passages = count($passage_tokenized);

            // Collect data
                $data[] = [
                    'title' => $title,
                    'page' => $page,
                    'seq' => $seq,
                    'positions' => $pos_all,
                    'foliation' => $foliation,
                    'column' => $column,
                    'transcriber' => $transcriber,
                    'pageID' => $pageID,
                    'docID' => $docID,
                    'transcript' => $transcript,
                    'transcript_tokenized' => $transcript_tokenized,
                    'transcript_lemmatized' => $transcript_lemmatized,
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

            // Bring information in alphabetical and numerical order
            array_multisort($data);
        }

        return $data;
    }

    // Function to filter out data, which do not match additional tokens in the searched phrase
    private function filterData (array $data, string $token_plain, string $lemma, bool $lemmatize): array {

        if ($lemmatize) { // Lemmatization requested

            // Remove all passages from $data, which do not match the additional keyword
            foreach ($data as $i => $column) {
                foreach ($column['passage_lemmatized'] as $j => $passage) {
                    foreach ($passage as $k => $token) {

                        // Add matched tokens to tokens_matched array and make it unique
                        if ($token === $lemma) {
                            $data[$i]['tokens_matched'][] = $column['passage_tokenized'][$j][$k];
                            $data[$i]['tokens_matched'] = array_unique($data[$i]['tokens_matched']);
                        }
                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data and adjust the num_passages in $data
                    if (in_array($lemma, $passage) === false) {
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
            foreach ($data as $i => $column) {

                $data[$i]['filters'][] = $filter;

                foreach ($column['passage_tokenized'] as $j => $passage) {

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
        foreach ($data as $i=>$column) {
            if ($column['passage_tokenized'] === []) {
                unset ($data[$i]);
            }

            // Reset the keys of the remaining arrays
            else {
                $data[$i]['passage_tokenized'] = array_values($column['passage_tokenized']);
                $data[$i]['passage_lemmatized'] = array_values($column['passage_lemmatized']);
                $data[$i]['tokens_matched'] = array_values($column['tokens_matched']);
                $data[$i]['passage_coordinates'] = array_values($column['passage_coordinates']);
                $data[$i]['positions'] = array_values($column['positions']);
            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    // Function, to check if $needle is matching $token in one of four different modes
    private function isMatching (string $token, string $needle, string $filter): bool {

        if ($filter === 'match_full') {

                if ($token === $needle or $token === ucfirst($needle)) {
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
            if ($this->isMatching($current_token, $token, $filter)) {
                $positions[] = $i;
            }
        }

        return $positions;
    }

    // Function to cut out a passage of a transcript
    private function getPassage (array $transcript, int $pos, int $radius): array {

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

        // Add as many preceding tokens to the passage-array, as the total number of preceding tokens and the radius size allow
        for ($i=0; $i<$radius and $i<$num_prec_tokens; $i++) {
            array_unshift($passage, array_reverse($prec_tokens)[$i]);
            $passage_start = $pos - $i - 1;
        }

        // Add as many succeeding words to the passage-array, as the total number of succeeding tokens and the radius size allow
        for ($i=0; $i<$radius and $i<$num_suc_tokens; $i++) {
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
    static private function getListFromIndex ($client, $category) { // $category can be 'title' or 'transcriber'

        $index_names = ['transcriptions_la', 'transcriptions_ar', 'transcriptions_he'];

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
            foreach ($query['hits']['hits'] as $column) {
                $value = $column['_source'][$category];
                if (in_array($value, $values) === false) {
                    $values[] = $value;
                }
            }
        }

        return $values;
    }

    static public function updateDataCache (SystemManager $systemManager) {

        $cache = $systemManager->getSystemDataCache();

        // Instantiate OpenSearch client
        try {
            $client = self::instantiateClient($systemManager);
        } catch (Exception $e) {
            return false;
        }

        // Get a list of all titles
        $titles = self::getListFromIndex($client, 'title');
        $transcribers = self::getListFromIndex($client, 'transcriber');

        // Set cache
        $cache->set('Titles', serialize($titles));
        $cache->set('Transcribers', serialize($transcribers));

        return true;
    }

    // ApiCall – Function to get all doc titles
    public function getTitles (Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $cache = $this->systemManager->getSystemDataCache();
        $status = 'OK';
        $now = TimeString::now();

        // Get data from cache, if data is not cached, get data from open search index and set the cache
        try {

            $titles = unserialize($cache->get('Titles'));

        } catch (KeyNotInCacheException $e) {

            // Instantiate OpenSearch client
            try {
                $client = $this->instantiateClient($this->systemManager);
            } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
                $status = 'Connecting to OpenSearch server failed.';
                return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
            }

            // Get a list of all titles
            $titles = $this->getListFromIndex($client, 'title');

            // Set cache
            $cache->set('Titles', serialize($titles));

        }

        // Api Response
        return $this->responseWithJson($response, [
            'titles' => $titles,
            'serverTime' => $now,
            'status' => $status]);
    }

    // API Call – Function to get all transcribers
    public function getTranscribers (Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $cache = $this->systemManager->getSystemDataCache();
        $status = 'OK';
        $now = TimeString::now();

        // Get data from cache, if data is not cached, get data from open search index and set the cache
        try {

            $transcribers = unserialize($cache->get('Transcribers'));

        } catch (KeyNotInCacheException $e) {

            // Instantiate OpenSearch client
            try {
                $client = $this->instantiateClient($this->systemManager);
            } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
                $status = 'Connecting to OpenSearch server failed.';
                return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
            }

            // Get a list of all transcribers
            $transcribers = $this->getListFromIndex($client, 'transcriber');

            // Set cache
            $cache->set('Transcribers', serialize($transcribers));

    }
        // Api Response
        return $this->responseWithJson($response, [
            'transcribers' => $transcribers,
            'serverTime' => $now,
            'status' => $status]);
    }
}
