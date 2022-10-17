<?php
namespace APM\Api;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;
use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;
use function DI\string;

// set_time_limit(5); // Script should not run longer than 5 seconds - does this work like this?

class ApiSearch extends ApiController
{
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    // Function to search in an OpenSearch-Index, which gives back an api response to js
    public function search(Request $request, Response $response): Response
    {
        // Set the name of the index, that should be queried and make status and now variables for the API response
        $index_name = 'transcripts';
        $status = 'OK';
        $now = TimeString::now();

        // Get user input
        $searched_phrase = strtolower($_POST['searchText']);
        $doc_title = $_POST['title'];
        $transcriber = $_POST['transcriber'];
        $radius = $_POST['radius'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);
        // Remove additional blanks before, after or in between keywords – necessary for a clean search
        $searched_phrase = $this->removeBlanks($searched_phrase);

        // ATTEMPTS TO SOLVE STRANGE HEBREW ERROR ON THE COMPUTER IN THE OFFICE
        //$searched_phrase = "\\u05d0\\u05d3\\u05dd";
        //$searched_phrase = json_decode('{"b": "\u05d0\u05d3\u05dd"}');
        //$searched_phrase=json_decode('"'.$searched_phrase.'"');

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searched_phrase' => $searched_phrase,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }
        
        // Tokenzize and lemmatize search phrase in Python
        exec("python3 ../python/Lemmatizer_Query.py $searched_phrase", $tokens_and_lemmata);

        $tokens_queried = explode("#", $tokens_and_lemmata[0]);
        $lemmata = explode("#", $tokens_and_lemmata[1]);


        $num_tokens = count($tokens_queried);

        // Get the lemmatized or unlemmatized token for the query, depending on user choice for lemmatization
        if ($lemmatize) {
            $token_for_query = $lemmata[0];
            $query_algorithm = 'match';
        }
        else {
            $token_for_query = $tokens_queried[0];
            // Choose query algorithm for OpenSearch-Query, depending on the length of the keyword
            $query_algorithm=$this->chooseQueryAlgorithm($token_for_query);
        }

        // Query index for the first token in searched_phrase – other tokens will be handled below
        try {
            $query = $this->queryIndex($client, $index_name, $doc_title, $transcriber, $token_for_query, $query_algorithm, $lemmatize);
        } catch (\Exception $e) {
            $status = "Opensearch query problem";
            
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

        // Get all information about the matched columns, including passages with the matched keyword as lists of words
        $data = $this->evaluateData($query, $tokens_queried, $lemmata, $query_algorithm, $radius, $lemmatize);

        // If there is more than one tokens_searched, extract all columns, which do match all the other tokens
        if ($num_tokens !== 1) {
            for ($i=1; $i<$num_tokens; $i++) {
                $data = $this->evaluateDataForAdditionalTokens($data, $tokens_queried[$i], $lemmata[$i], $lemmatize);
            }
        }

        // Get total number of matched passages
        $num_passages = 0;
        foreach ($data as $matched_column) {
            $num_passages = $num_passages + $matched_column['num_passages'];
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'tokens_and_lemmata' => $tokens_and_lemmata,
            'searched_phrase' => $searched_phrase,
            'num_passages_total' => $num_passages,
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    private function removeBlanks ($searched_phrase) {

        // Reduce multiple blanks following each other anywhere in the keyword to one single blank
        $string = preg_replace('!\s+!', ' ', $searched_phrase);

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

    // Function to choose the query algorithm from OpenSearch
    private function chooseQueryAlgorithm ($token): string
    {
        $token_length = strlen($token);
        if ($token_length < 4) {
            return 'match';
        }
        else {
            return 'match_phrase_prefix';
        }
    }

    // Function to query a given OpenSearch-index
    private function queryIndex ($client, $index_name, $doc_title, $transcriber, $token_for_query, $query_algorithm, $lemmatize) {

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
                        $query_algorithm => [
                            $area_of_query => [
                                "query" => $token_for_query
                            ]
                        ]
                    ]
                ]
            ]);
        }

        // Search only in the specific columns, specified by transcriber or title
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
                                $query_algorithm => [
                                    $area_of_query => [
                                        "query" => $token_for_query
                                    ]
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
                                $query_algorithm => [
                                    $area_of_query => [
                                        "query" => $token_for_query
                                    ]
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
                                $query_algorithm => [
                                    $area_of_query => [
                                        "query" => $token_for_query
                                    ]
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
    private function evaluateData ($query, $tokens_queried, $lemmata, $query_algorithm, $radius, $lemmatize) {

        $data = [];
        $num_columns = $query['hits']['total']['value'];

        // If there are any matched columns, collect them all in an ordered array, using the arrays declared at the beginning of the function
        if ($num_columns !== 0) {
            for ($i = 0; $i<$num_columns; $i++) {

                // Get document title, page number, column number, transcriber, transcript, docID and pageID
                // of every matched column in the OpenSearch index
                $title = $query['hits']['hits'][$i]['_source']['title'];
                $page = $query['hits']['hits'][$i]['_source']['page'];
                $column = $query['hits']['hits'][$i]['_source']['column'];
                $transcriber = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcript = $query['hits']['hits'][$i]['_source']['transcript'];
                $docID = $query['hits']['hits'][$i]['_source']['docID'];
                $pageID = $query['hits']['hits'][$i]['_id'];
                $transcript_tokenized = $query['hits']['hits'][$i]['_source']['transcript_tokens'];
                $transcript_lemmatized = $query['hits']['hits'][$i]['_source']['transcript_lemmata'];

                // Get all lower-case and upper-case token positions (lemmatized or unlemmatized) in the current column (measured in words)
                if ($lemmatize) {
                    $pos_lower = $this->getPositions($transcript_lemmatized, $lemmata[0], $query_algorithm);
                    $pos_upper = $this->getPositions($transcript_lemmatized, ucfirst($lemmata[0]), $query_algorithm);
                } else {
                    $pos_lower = $this->getPositions($transcript_tokenized, $tokens_queried[0], $query_algorithm);
                    $pos_upper = $this->getPositions($transcript_tokenized, ucfirst($tokens_queried[0]), $query_algorithm);
                }

                // First, check if the keywordPostions in the arrays are the same (this is the case in hebrew and arabic,
                // because there are no upper-case letters) – if so, just take keywordPositionsLC as full array of keywordPositions
                if ($pos_lower === $pos_upper) {
                    $pos_all = $pos_lower;
                }
                else {
                    $pos_all = array_merge($pos_lower, $pos_upper);
                    sort($pos_all);
                }

                // Get surrounding context of every occurrence of the keyword in the matched column as a string
                // and append it to...
                $passage_tokenized = [];
                $passage_lemmatized = [];
                $tokens_matched = [];

                // Variable to store previous position of matched token in it – used in the foreach-loop
                $prev_pos = 0;

                // Get all passages, which contain the matched token, as a list of tokens (and lemmata)
                foreach ($pos_all as $pos) {
                    if ($pos-$prev_pos>$radius) { // This checks, if the token at the actual position is not already contained in the previous passage
                        $passage_tokenized[] = $this->getPassage($transcript_tokenized, $pos, $radius);
                        if ($lemmatize) {
                            $passage_lemmatized[] = $this->getPassage($transcript_lemmatized, $pos, $radius);
                        }
                        $tokens_matched[] = [$transcript_tokenized[$pos]];
                        $prev_pos = $pos;
                    }
                }

                // Get total keyword frequency in matched column
                $num_passages = count($passage_tokenized);


                // Collect matches in all columns
                $data[] = [
                    'title' => $title,
                    'page' => $page,
                    'column' => $column,
                    'transcriber' => $transcriber,
                    'pageID' => $pageID,
                    'docID' => $docID,
                    'transcript' => $transcript,
                    'transcript_tokenized' => $transcript_tokenized,
                    'transcript_lemmatized' => $transcript_lemmatized,
                    'tokens_queried' => $tokens_queried,
                    'lemmata' => $lemmata,
                    'tokens_matched' => $tokens_matched,
                    'num_passages' => $num_passages,
                    'passage_tokenized' => $passage_tokenized,
                    'passage_lemmatized' => $passage_lemmatized,
                    'lemmatize' => $lemmatize
                ];
            }

            // Bring the information by title in alphabetical, and by page and colum in ascending order
            array_multisort($data);
        }

        return $data;
    }

    // Function to get results with match of multiple keywords
    private function evaluateDataForAdditionalTokens ($data, $token_unlemmatized, $token_lemmatized, $lemmatize) {

        if ($lemmatize) {
            // First, remove all passage_tokenized from $data, which do not match the keyword
            foreach ($data as $i => $column) {
                foreach ($column['passage_lemmatized'] as $j => $passage_lemmatized) {

                    // Make a string, which stores full passage in it
                    $passage_string = "";

                    foreach ($passage_lemmatized as $k => $token) {
                        $passage_string = $passage_string . " " . $token;

                        // Add matched token to data-array and make the tokens_matched-slot unique (no doubles)
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
            // First, remove all passage_tokenized from $data, which do not match the token
            foreach ($data as $i => $column) {
                foreach ($column['passage_tokenized'] as $j => $passage_tokenized) {

                    // Make a string, which stores full context in it – needed for checking for keyword
                    $passage_string = "";
                    foreach ($passage_tokenized as $k => $token) {
                        $passage_string = $passage_string . " " . $token;

                        // Add new keywordPos to keyPosInContext-array, if the additional keyword matches
                        if (strpos($token, $token_unlemmatized) !== false or strpos($token, ucfirst($token_unlemmatized)) !== false) {
                            $data[$i]['tokens_matched'][$j][] = $passage_tokenized[$k];
                            $data[$i]['tokens_matched'][$j] = array_unique($data[$i]['tokens_matched'][$j]);
                        }

                    }

                    // If the token is not in the passage, remove passage_tokenized, passage_lemmatized and tokens_matched from $data
                    // Also adjust the num_passages in $data
                    if (strpos($passage_string, $token_unlemmatized) === false && strpos($passage_string, ucfirst($token_unlemmatized)) === false) {
                        unset($data[$i]['passage_tokenized'][$j]);
                        unset($data[$i]['passage_lemmatized'][$j]);
                        unset($data[$i]['tokens_matched'][$j]);
                        $data[$i]['num_passages'] = $data[$i]['num_passages'] - 1;
                    }
                }
            }
        }

        // Second, unset all columns, which not anymore have any passage_tokenized
        foreach ($data as $i=>$column) {
            if ($column['passage_tokenized'] === []) {
                unset ($data[$i]);
            }

            // Reset the keys of the remaining arrays
            else {
                $data[$i]['passage_tokenized'] = array_values($column['passage_tokenized']);
                $data[$i]['passage_lemmatized'] = array_values($column['passage_lemmatized']);
                $data[$i]['tokens_matched'] = array_values($column['tokens_matched']);
            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    // Function to get all the positions of a given keyword in a transcripted column (full match or phrase match, measured in words)
    private function getPositions ($transcript_tokenized, $token, $query_algorithm): array {

        // Array, which will be returned
        $positions = [];

        // Check every token of the list of tokens (which may be lemmatized), if it matches the token, which was given as an argument
        for ($i=0; $i<count($transcript_tokenized); $i++) {

            $current_token = $transcript_tokenized[$i];

            // If query algorithm is phrase match, add a position to the positions-array,
            // if token in transcript contains the argument-token as a substring
            if ($query_algorithm == 'match_phrase_prefix') {
                if (substr_count($current_token, $token) !== 0) {
                    $positions[] = $i;
                }
            }

            // If query algorithm is match, add a position to the positions-array, if the token in transcript is identical to the argument-token
            elseif ($query_algorithm = 'match') {
                if ($current_token == $token) {
                    $positions[] = $i;
                }
            }
        }

        return $positions;
    }

    // Function to get the surrounding context of a given keyword (via keywordPosition) in a given transcript
    private function getPassage ($transcript_tokenized, $pos, $radius = 100): array
    {
        // Get total number of words in the transcript
        $num_tokens = count($transcript_tokenized);

        // Get a list of all preceding and all succeeding words of the token at pos – get the sizes of these lists
        $prec_tokens = array_slice($transcript_tokenized, 0, $pos);
        $suc_tokens = array_slice($transcript_tokenized, $pos+1, $num_tokens);
        $num_prec_tokens = count($prec_tokens);
        $num_suc_tokens = count($suc_tokens);

        // Get the matched token at the given position into an array and use this array in the next step to add the context to it
        $passage = [$transcript_tokenized[$pos]];

        // Add as many preceding tokens to the passage-array, as the total number of preceding tokens and the desired context size allows
        for ($i=0; ($i<$radius) and ($i<$num_prec_tokens); $i++) {
            array_unshift($passage, array_reverse($prec_tokens)[$i]);
        }

        // Add as many succeeding words to the keywordInContext-array, as the total number of succeeding words and the desired context size allows
        for ($i=0; ($i<$radius) and ($i<$num_suc_tokens); $i++) {
            $passage[] = $suc_tokens[$i];
        }

        // If first token of the passage is punctuation, remove it
        if (empty($passage[0]) or strpos(".,:-–]/", $passage[0]) !== false) {
            array_shift($passage);
        }

        return $passage;
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
