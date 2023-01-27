<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;
use function DI\string;

// Can this function be moved to another place?
function sortByLength ($a, $b) {
    return strlen($b)-strlen($a);
}

class ApiSearch extends ApiController
{
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    // Function to search in an OpenSearch-Index – returns an api response to js
    public function search(Request $request, Response $response): Response
    {
        // Name of the index, that should be queried and informative variables for the API response
        $index_name = 'transcripts';
        $status = 'OK';
        $now = TimeString::now();

        // Get all user input!
        $searched_phrase = $this->removeBlanks(strtolower($_POST['searched_phrase'])); // Lower-case and without additional blanks
        $doc_title = $_POST['title'];
        $transcriber = $_POST['transcriber'];
        $radius = $_POST['radius'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);

        // Sort searched phrase by length of keywords - longest will be queried via OpenSearch
        $keywords = explode(" ", $searched_phrase);
        usort($keywords, "APM\\Api\\sortByLength");
        $searched_phrase = implode(" ", $keywords);

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searched_phrase' => $searched_phrase,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }
        
        // Tokenization and lemmatization of searched phrase with python
        exec("python3 ../python/Lemmatizer_Query.py $searched_phrase", $tokens_and_lemmata, $retval);

        // Log output from exec-function
        $this->logger->debug('output', [$tokens_and_lemmata, $retval]);

        // Tokens, lemmata and language of the searched phrase
        $lang = $tokens_and_lemmata[1];
        $lemmata = explode("#", $tokens_and_lemmata[3]);

        if ($lemmatize) {
            $tokens_queried = explode("#", $tokens_and_lemmata[2]);
            $token_for_query = $lemmata[0];
        }
        else {
            $tokens_queried = explode(" ", $searched_phrase);
            $token_for_query = $tokens_queried[0];
        }

        // Count tokens
        $num_tokens = count($tokens_queried);

        // Query index for the first token in searched_phrase – additional tokens will be handled below
        try {
            $query = $this->makeOpenSearchQuery($client, $index_name, $doc_title, $transcriber, $token_for_query, $lemmatize);
        } catch (\Exception $e) {
            $status = "OpenSearch query problem";
            return $this->responseWithJson($response,
                [
                    'searched_phrase' => $searched_phrase,
                    'matches' => [],
                    'serverTime' => $now,
                    'status' => $status,
                    // Pass the error message to JS
                    'errorData' => $e->getMessage()
                ]);
        }

        // Get all information about the matched columns, including passages with the matched token as lists of tokens
        $data = $this->structureData($query, $token_for_query, $tokens_queried, $lemmata, $radius, $lemmatize);

        // If there is more than one token in the searched phrase, filter out all columns and passages, which do not match all tokens
        if ($num_tokens !== 1) {
            for ($i=1; $i<$num_tokens; $i++) {
                $data = $this->filterData($data, $tokens_queried[$i], $lemmata[$i], $lemmatize);
            }
        }

        // Get total number of matched passages
        $num_passages = 0;
        foreach ($data as $matched_column) {
            $num_passages = $num_passages + $matched_column['num_passages'];
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'searched_phrase' => $searched_phrase,
            'lang' => $lang,
            'num_passages_total' => $num_passages,
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    private function removeBlanks ($searched_phrase) {

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
    private function instantiateClient ()
    {
        // Load authentication data from config-file
        $config = $this->systemManager->getConfig();

        $client = (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        return $client;
    }

    // Function to query a given OpenSearch-index
    private function makeOpenSearchQuery ($client, $index_name, $doc_title, $transcriber, $token_for_query, $lemmatize) {

        // Check lemmatize (boolean) to determine the area of the query
        if ($lemmatize) {
            $area_of_query = 'transcript_lemmata';
        }
        else {
            $area_of_query = 'transcript_tokens';
        }

        // Search in all indexed columns
        if ($doc_title === "" and $transcriber === "") {

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'query_string' => [
                                "query" => $token_for_query,
                                "default_field" => $area_of_query,
                                "analyze_wildcard" => true,
                                "allow_leading_wildcard" => true
                            ]
                        ]
                    ]
            ]);
        }

        // Search only in specific columns, specified by transcriber or title
        elseif ($transcriber === "") {

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match_phrase_prefix' => [
                                    'title' => [
                                        "query" => $doc_title
                                    ]
                                ]
                            ],
                            'must' => [
                                'query_string' => [
                                    "query" => $token_for_query,
                                    "default_field" => $area_of_query,
                                    "analyze_wildcard" => true,
                                    "allow_leading_wildcard" => true
                                ]
                            ]
                        ]
                    ]
                ]
            ]);
        }

        elseif ($doc_title === "") {

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match_phrase_prefix' => [
                                    'transcriber' => [
                                        "query" => $transcriber
                                    ]
                                ]
                            ],
                            'must' => [
                                'query_string' => [
                                    "query" => $token_for_query,
                                    "default_field" => $area_of_query,
                                    "analyze_wildcard" => true,
                                    "allow_leading_wildcard" => true
                                ]
                            ]
                        ]
                    ]
                ]
            ]);
        }
        // Transcriber AND title are given
        else {

            $query = $client->search([
                'index' => $index_name,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match_phrase_prefix' => [
                                    'title' => [
                                        "query" => $doc_title
                                    ]
                                ]
                            ],
                            'should' => [
                                'match_phrase_prefix' => [
                                    'transcriber' => [
                                        "query" => $transcriber,
                                    ]
                                ]
                            ],
                            "minimum_should_match" => 1,
                            'must' => [
                                'query_string' => [
                                    "query" => $token_for_query,
                                    "default_field" => $area_of_query,
                                    "analyze_wildcard" => true,
                                    "allow_leading_wildcard" => true
                                ]
                            ]
                        ]
                    ]
                ]
            ]);
        }

        return $query;
    }

    // Get all information about matches, specified for a single document or all documents
    private function structureData ($query, $token, $tokens_queried, $lemmata, $radius, $lemmatize) {

        // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
        $filter = $this->getFilterType($token);
        $token = str_replace("*", "", $token);


        // Variable to collect all relevant data in
        $data = [];

        // Get number of matched columns
        $num_columns = $query['hits']['total']['value'];

        // If there are any matched columns, collect them all in an ordered array, using the arrays declared at the beginning of the function
        if ($num_columns !== 0) {
            for ($i = 0; $i<$num_columns; $i++) {

                // Get data of every matched column in the OpenSearch index
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

                // Get all lower-case and upper-case token positions (lemmatized or unlemmatized) in the current column (measured in words)
                if ($lemmatize) {
                    $pos_lower = $this->getPositions($transcript_lemmatized, $lemmata[0], $filter);
                    $pos_upper = $this->getPositions($transcript_lemmatized, ucfirst($lemmata[0]), $filter);
                } else {
                    $pos_lower = $this->getPositions($transcript_tokenized, $token, $filter);
                    $pos_upper = $this->getPositions($transcript_tokenized, ucfirst($token), $filter);
                }

                // Merge positions to one array without duplicates
                $pos_all = array_unique(array_merge($pos_lower, $pos_upper));
                sort($pos_all);


                // FUTURE TASK - Remove positions which are very close to other positions to display them in ONE passage
//                for ($k=0; $k<(count($pos_all)-1); $k++) {
//                    if (($pos_all[$k+1]-$pos_all[$k])<$radius) {
//                        unset($pos_all[$k]);
//                        $pos_all = array_values($pos_all);
//                    }
//                }
//
//                if (count($pos_all) == 2 && ($pos_all[1]-$pos_all[0])<$radius) {
//                        unset($pos_all[0]);
//                        $pos_all = array_values($pos_all);
//                }

                // Arrays to store matched passages and tokens in them as well as passage-coordinates and matched tokens
                $passage_tokenized = [];
                $passage_lemmatized = [];
                $passage_coordinates = [];
                $tokens_matched = [];

                // Variable to store previous position of matched token in it – used in the foreach-loop
                $prev_pos = 0;

                // Get all passages, which contain the matched token, as a list of tokens (and lemmata)
                $counter = 0;
                foreach ($pos_all as $pos) {
                    if ($counter === 0 or ($pos-$prev_pos)>$radius) { // This checks, if the token at the actual position is not already contained in the previous passage
                        $passage_info = $this->getPassage($transcript_tokenized, $pos, $radius);
                        $passage_tokenized[] = $passage_info['passage'];
                        if ($lemmatize) {
                            $passage_info = $this->getPassage($transcript_lemmatized, $pos, $radius);
                            $passage_lemmatized[] = $passage_info['passage'];
                        }
                        $passage_coordinates[] = [$passage_info['start'], $passage_info['end']];

                        // Create an array of all matched tokens in the current passage - used for highlighting keywords in js
                        $tokens_matched[] = [$transcript_tokenized[$pos]];
                        foreach ($passage_tokenized[$counter] as $word) {
                                if ($filter === 'match_prefix') {
                                    # if (substr_count($current_token, $token) !== 0)
                                    if (strpos($word, $token) === 0 or strpos($word, ucfirst($token)) === 0) {
                                        $tokens_matched[$counter][] = $word;
                                    }
                                }
                                elseif ($filter === 'match_body') {
                                    if (strpos($word, $token) !== false and strpos($word, $token) != 0
                                        and strpos($word, $token) != strlen($word)-strlen($token)) {
                                        $tokens_matched[$counter][] = $word;
                                    }
                                }
                                elseif ($filter === 'match_suffix') {
                                    if (strpos($word, $token) !== false and strpos($word, $token) == strlen($word)-strlen($token)) {
                                        $tokens_matched[$counter][] = $word;
                                    }
                                }
                                // If query algorithm is match, add a position to the positions-array, if the token in transcript is identical to the argument-token
                                elseif ($filter = 'match_exact') {
                                    if ($word == $token) {
                                        $tokens_matched[$counter][] = $word;
                                    }
                                }
                            }

                        // Remove duplicates from the array in the tokens_matched array and adjust the keys of the array
                        $tokens_matched[$counter] = array_values(array_unique($tokens_matched[$counter]));

                        // Refresh variables
                        $prev_pos = $pos;
                        $counter++;
                    }
                }

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
                    'tokens_queried' => $tokens_queried,
                    'lemmata' => $lemmata,
                    'filters' => [$filter],
                    'tokens_matched' => $tokens_matched,
                    'num_passages' => $num_passages,
                    'passage_coordinates' => $passage_coordinates,
                    'passage_tokenized' => $passage_tokenized,
                    'passage_lemmatized' => $passage_lemmatized,
                    'lemmatize' => $lemmatize
                ];
            }

            // Bring information in alphabetical and numerical order
            array_multisort($data);
        }

        return $data;
    }

    // Function to get results with match of multiple keywords
    private function filterData ($data, $token_unlemmatized, $token_lemmatized, $lemmatize) {

        if ($lemmatize) {

            // First, remove all passage_tokenized from $data, which do not match the additional keyword
            foreach ($data as $i => $column) {

                foreach ($column['passage_lemmatized'] as $j => $passage_lemmatized) {

                    foreach ($passage_lemmatized as $k => $token) {

                        // Add matched tokens to data-array and make the tokens_matched-slot unique (no doubles)
                        if ($token === $token_lemmatized) {
                            $data[$i]['tokens_matched'][$j][] = $column['passage_tokenized'][$j][$k];
                            $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                        }
                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data
                    // Also adjust the num_passages in $data
                    if (in_array($token_lemmatized, $data[$i]['passage_lemmatized'][$j]) === false) {
                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['tokens_matched'][$j]);
                        $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                    }
                }
            }
        }
        else { // No lemmatization

            // Get filter type and clear keyword from asterisks
            $filter = $this->getFilterType($token_unlemmatized);
            $token_unlemmatized= str_replace("*", "", $token_unlemmatized);

            // CAN THE FOLLOWING CODE BECOME SHORTER!?

            // First, remove all passage_tokenized from $data, which do not match the token
            foreach ($data as $i => $column) {

                // Write filter type into data
                $data[$i]['filters'][] = $filter;

                foreach ($column['passage_tokenized'] as $j => $passage_tokenized) {
                    $passage_string = " ";   // Creates a string, which stores full context in it – needed for checking for keyword

                    foreach ($passage_tokenized as $k => $token) {

                        $passage_string = $passage_string . $token . " "; // Append token to passage-string for later checks

                        // Add matched tokens to data-array and make the tokens_matched-slot unique (no doubles)
                        if ($filter === 'match_exact') {
                            if ($token === $token_unlemmatized or $token === ucfirst($token_unlemmatized)) {
                                $data[$i]['tokens_matched'][$j][] = $passage_tokenized[$k];
                                $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                            }
                        }
                        elseif ($filter === 'match_prefix') {
                            if (strpos($token, $token_unlemmatized) === 0 or strpos($token, ucfirst($token_unlemmatized)) === 0) {
                                $data[$i]['tokens_matched'][$j][] = $passage_tokenized[$k];
                                $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                            }
                        }
                        elseif ($filter === 'match_body') {
                            if (strpos($token, $token_unlemmatized) !== false and strpos($token, $token_unlemmatized) != 0
                                and strpos($token, $token_unlemmatized) !== strlen($token)-strlen($token_unlemmatized)) {
                                $data[$i]['tokens_matched'][$j][] = $passage_tokenized[$k];
                                $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                            }
                        }
                        elseif ($filter === 'match_suffix') {
                            if (strpos($token, $token_unlemmatized) !== false and strpos($token, $token_unlemmatized) == strlen($token)-strlen($token_unlemmatized)) {
                                $data[$i]['tokens_matched'][$j][] = $passage_tokenized[$k];
                                $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                            }
                        }
                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data
                    // Also adjust the num_passages in $data
                        if ($filter === 'match_exact') {
                            $token_full = " " . $token_unlemmatized . " ";
                            $token_full_uc = " " . ucfirst($token_unlemmatized) . " ";
                            if (strpos($passage_string, $token_full) === false && strpos($passage_string, $token_full_uc) === false) {
                                unset($data[$i]['passage_tokenized'][$j]);
                                unset($data[$i]['passage_lemmatized'][$j]);
                                unset($data[$i]['tokens_matched'][$j]);
                                unset($data[$i]['passage_coordinates'][$j]);
                                $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                            }
                        }
                        elseif ($filter === 'match_prefix') {
                            $token_prefix = " " . $token_unlemmatized;
                            $token_prefix_uc = " " . ucfirst($token_unlemmatized);
                            if (strpos($passage_string, $token_prefix) === false && strpos($passage_string, $token_prefix_uc) === false) {
                                unset($data[$i]['passage_tokenized'][$j]);
                                unset($data[$i]['passage_lemmatized'][$j]);
                                unset($data[$i]['tokens_matched'][$j]);
                                unset($data[$i]['passage_coordinates'][$j]);
                                $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                            }
                        }
                        elseif ($filter === 'match_body') {
                            $pos = strpos($passage_string, $token_unlemmatized);
                            $token_length = strlen($token_unlemmatized);
                            if ($pos === false or $passage_string[$pos-1] === " " or $passage_string[$pos+$token_length] === " ") {
                                unset($data[$i]['passage_tokenized'][$j]);
                                unset($data[$i]['passage_lemmatized'][$j]);
                                unset($data[$i]['tokens_matched'][$j]);
                                unset($data[$i]['passage_coordinates'][$j]);
                                $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                            }
                        }
                        elseif ($filter === 'match_suffix') {
                            $token_suffix = $token_unlemmatized . " ";
                            if (strpos($passage_string, $token_suffix) === false) {
                                unset($data[$i]['passage_tokenized'][$j]);
                                unset($data[$i]['passage_lemmatized'][$j]);
                                unset($data[$i]['tokens_matched'][$j]);
                                unset($data[$i]['passage_coordinates'][$j]);
                                $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                            }
                        }
                }
            }
        }

        // Second, unset all columns, which do not anymore have any passage_tokenized
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

            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    private function getFilterType (string $token): string {

        // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
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
            $filter = 'match_exact';
        }

        return $filter;
    }

    // Function to get all the positions of a given keyword in a transcribed column
    private function getPositions ($tokens, $token, $filter): array {

        // Array, which will be returned
        $positions = [];

        // Check every token of the list of tokens (which may be lemmatized), if it matches the token, which was given as an argument
        for ($i=0; $i<count($tokens); $i++) {

            $current_token = $tokens[$i];

            // If query algorithm is phrase match, add a position to the positions-array,
            // if token in transcript contains the argument-token as a substring
            if ($filter === 'match_prefix') {
                # if (substr_count($current_token, $token) !== 0)
                if (strpos($current_token, $token) === 0 or strpos($current_token, ucfirst($token)) === 0) {
                    $positions[] = $i;
                }
            }
            elseif ($filter === 'match_body') {
                if (strpos($current_token, $token) !== false and strpos($current_token, $token) != 0
                    and strpos($current_token, $token) !== strlen($current_token)-strlen($token)) {
                    $positions[] = $i;
                }
            }
            elseif ($filter === 'match_suffix') {
                if (strpos($current_token, $token) !== false and strpos($current_token, $token) == strlen($current_token)-strlen($token)) {
                    $positions[] = $i;
                }
            }
            // If query algorithm is match, add a position to the positions-array, if the token in transcript is identical to the argument-token
            elseif ($filter = 'match_exact') {
                if ($current_token == $token) {
                    $positions[] = $i;
                }
            }
        }

        return $positions;
    }

    // Function to get a given keyword in its context in a given transcript
    private function getPassage ($tokens, $pos, $radius = 100): array
    {
        // Get total number of words in the transcript
        $num_tokens = count($tokens);

        // Get a list of all preceding and all succeeding words of the token at pos – get the sizes of these lists
        $prec_tokens = array_slice($tokens, 0, $pos);
        $suc_tokens = array_slice($tokens, $pos+1, $num_tokens);
        $num_prec_tokens = count($prec_tokens);
        $num_suc_tokens = count($suc_tokens);

        // Get the matched token at the given position into an array and use this array in the next step to collect the passage in it
        $passage = [$tokens[$pos]];
        $passage_start = 0;
        $passage_end = 0;

        // Add as many preceding tokens to the passage-array, as the total number of preceding tokens and the desired context size allows
        for ($i=0; ($i<$radius) and ($i<$num_prec_tokens); $i++) {
            array_unshift($passage, array_reverse($prec_tokens)[$i]);
            $passage_start = $pos - $i - 1;
        }

        // Add as many succeeding words to the keywordInContext-array, as the total number of succeeding words and the desired context size allows
        for ($i=0; ($i<$radius) and ($i<$num_suc_tokens); $i++) {
            $passage[] = $suc_tokens[$i];
            $passage_end = $pos + $i + 1;
        }

        // If first token of the passage is punctuation, remove it
        if (empty($passage[0]) or strpos(".,:;- –]/", $passage[0]) !== false) {
            array_shift($passage);
        }

        return ['passage' => $passage, 'start' => $passage_start, 'end' => $passage_end];
    }

    // Function to get a full list of i. e. titles or transcribers values in the index
    private function getListFromIndex ($client, $index_name, $category) { // $category can be 'title' or 'transcriber'

        // Array to return
        $values = [];

        // Make a match_all query
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

        return $values;
    }

    // ApiCall – Function to get all doc titles
    public function getTitles (Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();
        $index_name = 'transcripts';

        // Instantiae OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
        }

        // Get a list of all titles
        $titles =  $this->getListFromIndex($client, $index_name, 'title');

        // Api Response
        return $this->responseWithJson($response, [
            'titles' => $titles,
            'serverTime' => $now,
            'status' => $status]);
    }

    // API Call – Function to get all transcribers
    public function getTranscribers (Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();
        $index_name = 'transcripts';

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
        }

        // Get a list of all transcribers
        $transcribers =  $this->getListFromIndex($client, $index_name, 'transcriber');

        // Api Response
        return $this->responseWithJson($response, [
            'transcribers' => $transcribers,
            'serverTime' => $now,
            'status' => $status]);
    }
}
