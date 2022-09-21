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
        // Set the name of the index, that should be queried
        $indexName = 'transcripts';

        $status = 'OK';
        $now = TimeString::now();

        // Get all the user input and convert keyword to lower-case for better handling in following code (esp. for the getPositionsOfKeyword-function)
        $searchString = strtolower($_POST['searchText']);
        $cSize = $_POST['radius'];
        $docName = $_POST['title'];
        $transcriber = $_POST['transcriber'];
        $lemmatize = filter_var($_POST['lemmatize'], FILTER_VALIDATE_BOOLEAN);

        // Remove additional blanks before, after or in between keywords – necessary for a clean search and position/context-handling, also in js (?)
        $searchString = $this->removeBlanks($searchString);

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searchString' => $searchString,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }

        // Explode all keywords inside the search string to an array – get the main keyword
        // $keywords = explode(" ", $searchString);

        // Lemmatize keywords
        exec("python3 /home/lukas/Lemmatization/Lemmatize_la_transcript.py $searchString", $output);
        $keywords = explode("#", $output[0]);
        $keywordsLemmata = explode("#", $output[1]);
        $numKeywords = count($keywords);

        // $lemmatize = true;
        if ($lemmatize) {
            $mainKeyword = $keywordsLemmata[0];
            $queryAlg = 'match';
        }
        else {
            $mainKeyword = $keywords[0];
            // Choose query algorithm for OpenSearch-Query, depending on the length of the keyword
            $queryAlg=$this->chooseQueryAlg($mainKeyword);
        }

        // Query index
        try {
            $query = $this->queryIndex($client, $indexName, $docName, $transcriber, $mainKeyword, $queryAlg, $lemmatize);
        } catch (\Exception $e) {
            $status = "Opensearch query problem";
            
            return $this->responseWithJson($response,
                [
                    'searchString' => $searchString,
                    'matches' => [],
                    'serverTime' => $now,
                    'status' => $status,
                    // Pass the error message to JS
                    'errorData' => $e->getMessage()
                ]);
        }

        // Get all information about the matches
        $data = $this->getInfoAboutMatches($query, $keywords, $keywordsLemmata, $queryAlg, $cSize, $lemmatize);

        // If there is more than one keyword, extract all columns, which do match all the keywords
        if ($numKeywords !== 1) {
            for ($i=1; $i<$numKeywords; $i++) {
                $data = $this->extractMultiMatchColumns($data, $keywords[$i], $keywordsLemmata[$i], $lemmatize);
            }
        }

        // Get total number of matches
        $numMatchedPassages = 0;
        foreach ($data as $matchedColumn) {
            $numMatchedPassages = $numMatchedPassages + $matchedColumn['keywordFreq'];
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'searchString' => $searchString,
            'numMatchedPassages' => $numMatchedPassages,
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    private function removeBlanks ($string) {

        // Reduce multiple blanks following each other anywhere in the keyword to one single blank
        $string = preg_replace('!\s+!', ' ', $string);

        // Remove blank at the end of the keyword
        if (substr($string, -1) == " ") {
            $string = substr($string, 0, -1);
        }

        // Remove blank at the beginning of the keyword
        if (substr($string, 0, 1) == " ") {
            $string = substr($string, 1);
        }

        return $string;
    }

    // Function, which instantiates OpenSearch client
    private function instantiateClient ()
    {
        // Load authetication data from config-file
        $config = $this->systemManager->getConfig();

        $client = (new ClientBuilder())
            ->setHosts($config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($config[ApmConfigParameter::OPENSEARCH_USER], $config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        return $client;
    }

    // Function to choose the query algorithm from OpenSearch
    private function chooseQueryAlg ($keyword): string
    {
        $keywordLen = strlen($keyword);
        if ($keywordLen < 4) {
            return 'match';
        }
        else {
            return 'match_phrase_prefix';
        }
    }

    // Function to query a given OpenSearch-index
    private function queryIndex ($client, $indexName, $docName, $transcriber, $keyword, $queryAlg, $lemmatize) {

        if ($lemmatize) {
            $searchArea = 'transcript_lemmata';
        }
        else {
            $searchArea = 'transcript_tokens';
        }

        // Search in all indexed columns
        if ($docName === "" and $transcriber === "") {

            $query = $client->search([
                'index' => $indexName,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        $queryAlg => [
                            $searchArea => [
                                "query" => $keyword
                            ]
                        ]
                    ]
                ]
            ]);
        }

        // Search only in the specific columns, specified by transcriber or title
        elseif ($transcriber === "") {

            $query = $client->search([
                'index' => $indexName,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match_phrase_prefix' => [
                                    'title' => [
                                        "query" => $docName
                                    ]
                                ]
                            ],
                            'must' => [
                                $queryAlg => [
                                    $searchArea => [
                                        "query" => $keyword
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]);
        }

        elseif ($docName === "") {

            $query = $client->search([
                'index' => $indexName,
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
                                $queryAlg => [
                                    $searchArea => [
                                        "query" => $keyword
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
                'index' => $indexName,
                'body' => [
                    'size' => 20000,
                    'query' => [
                        'bool' => [
                            'filter' => [
                                'match_phrase_prefix' => [
                                    'title' => [
                                        "query" => $docName
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
                                $queryAlg => [
                                    $searchArea => [
                                        "query" => $keyword
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
    private function getInfoAboutMatches ($query, $keywords, $keywordsLemmata, $queryAlg, $cSize, $lemmatize) {

        $data = [];
        $numMatchedColumns = $query['hits']['total']['value'];

        // If there are any matched columns, collect them all in an ordered array, using the arrays declared at the beginning of the function
        if ($numMatchedColumns !== 0) {
            for ($i = 0; $i < $numMatchedColumns; $i++) {

                // Get document title, page number, column number, transcriber, transcript, docID and pageID
                // of every matched column in the OpenSearch index
                $title = $query['hits']['hits'][$i]['_source']['title'];
                $page = $query['hits']['hits'][$i]['_source']['page'];
                $column = $query['hits']['hits'][$i]['_source']['column'];
                $transcriber = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcript = $query['hits']['hits'][$i]['_source']['transcript'];
                $docID = $query['hits']['hits'][$i]['_source']['docID'];
                $pageID = $query['hits']['hits'][$i]['_id'];
                $tokens = $query['hits']['hits'][$i]['_source']['transcript_tokens'];
                $lemmata = $query['hits']['hits'][$i]['_source']['transcript_lemmata'];

                // Make a list of words out of the transcript, which is used in following functions
                // Therefore every line break in the transcript has to be replaced by a blank, hyphened words disappear
                // Sometimes, I think, there are two words treated as one, but this does not disturb anything until now
                // $cleanTranscript = str_replace("\n", " ", $transcript);
                // $cleanTranscript = str_replace("- ", "", $cleanTranscript);
                // $tokens = explode(" ", $cleanTranscript);

                // Get all lower-case and all upper-case keyword positions in the current column (measured in words)
                if ($lemmatize) {
                    $keywordPositionsLC = $this->getPositionsOfKeyword($lemmata, $keywordsLemmata[0], $queryAlg);
                    $keywordPositionsUC = $this->getPositionsOfKeyword($lemmata, ucfirst($keywordsLemmata[0]), $queryAlg);
                } else {
                    $keywordPositionsLC = $this->getPositionsOfKeyword($tokens, $keywords[0], $queryAlg);
                    $keywordPositionsUC = $this->getPositionsOfKeyword($tokens, ucfirst($keywords[0]), $queryAlg);
                }


                // Sort the keywordPositions to have them in ascending order like they appear in the manuscript –
                // this, of course, is only effective if there is more than one occurence of the keyword in the column

                // First, check if the keywordPostions in the arrays are the same (this is the case in hebrew and arabic,
                // because there are no upper-case letters) – if so, just take keywordPositionsLC as full array of keywordPositions
                if ($keywordPositionsLC === $keywordPositionsUC) {
                    $keywordPositions = $keywordPositionsLC;
                }
                else {
                    $keywordPositions = array_merge($keywordPositionsLC, $keywordPositionsUC);
                    sort($keywordPositions);
                }

                // Get total keyword frequency in matched column
                $keywordFreq = count($keywordPositions);

                // Get surrounding context of every occurence of the keyword in the matched column as a string
                // and append it to the keywordsInContext-array
                $keywordsInContext = [];
                $lemmataInContext = [];
                $keywordPosInContext = [];
                $keywordsUnlemmatized = [];

                foreach ($keywordPositions as $keywordPos) {
                    $keywordInContext = $this->getContextOfKeyword($tokens, $keywordPos, $cSize);
                    $lemmaInContext = $this->getContextOfKeyword($lemmata, $keywordPos, $cSize);
                    $keywordsInContext[] = $keywordInContext[0];
                    $lemmataInContext[] = $lemmaInContext[0];
                    $keywordPosInContext[] = $keywordInContext[1];
                    $keywordsUnlemmatized[] = $keywordInContext[2];
                }

                // Add all information about the matched column to the matches array, which will become an array of arrays –
                // each array contains the information about a single column.

                // The check for keywordFreq seems redundant, but is necessary, because the getPositionsOfKeyword-functions is more strict than the query
                // in OpenSearch. It could be, that keywordFreq is indeed 0 for a column, which does contain a match according to the OpenSearch-algorithm.
                // This is because the latter matches words wih hyphens, i. e. "res-", if the searched keyword is actually "res" –
                // in the getPositionsOfKeyword-function this is handled differently and not treated as a match.

                // Collect matches in all columns
                if ($keywordFreq !== 0) {
                    $data[] = [
                        'title' => $title,
                        'page' => $page,
                        'column' => $column,
                        'transcriber' => $transcriber,
                        'pageID' => $pageID,
                        'docID' => $docID,
                        'transcript' => $transcript,
                        'transcript_tokens' => $tokens,
                        'transcript_lemmata' => $lemmata,
                        'keywords' => $keywords,
                        'keywords_lemmata' => $keywordsLemmata,
                        'keywords_unlemmatized' => $keywordsUnlemmatized,
                        'keywordFreq' => $keywordFreq,
                        'keywordsInContext' => $keywordsInContext,
                        'lemmataInContext' => $lemmataInContext,
                        'keywordPosInContext' => $keywordPosInContext,
                        'lemmatize' => $lemmatize
                    ];
                }
            }

            // Bring the information by title in alphabetical, and by page and colum in ascending order
            array_multisort($data);

            return $data;
        }
        return $data;
    }

    // Function to get results with match of multiple keywords
    private function extractMultiMatchColumns ($data, $keyword, $lemma, $lemmatize) {

        // First, remove all keywordsInContext from $data, which do not match the keyword
        foreach ($data as $i=>$matchedColumn) {
            foreach ($matchedColumn['keywordsInContext'] as $j=>$keywordInContext) {

                // Make a string, which stores full context in it – needed for checking for keyword
                $contextString = "";
                foreach ($keywordInContext as $k=>$string) {
                    $contextString = $contextString . " " . $string;

                    // Add new keywordPos to keyPosInContext-array, if one of the additional keywords matches
                    if (strpos($string, $keyword) !== false) {
                        $data[$i]['keywordPosInContext'][] = $k;
                        $data[$i]['keywords_unlemmatized'][] = $keywordInContext[$k];
                        // $data[$i]['keywordFreq'] = $data[$i]['keywordFreq'] + 1;
                    }

                }

                // If the keyword is not in the contextString, remove keywordsInContext, keywordPosInContext from $data
                // Adjust the keywordFreq in $data
                if (strpos($contextString, $keyword) === false && strpos($contextString, ucfirst($keyword)) === false) {
                    unset($data[$i]['keywordsInContext'][$j]);
                    unset($data[$i]['keywordPosInContext'][$j]);
                    $data[$i]['keywordFreq'] = $data[$i]['keywordFreq'] - 1;
                }
            }
        }

        // Second, unset all columns, which not anymore have keywordsInContext
        foreach ($data as $i=>$matchedColumn) {
            if ($matchedColumn['keywordsInContext'] === []) {
                unset ($data[$i]);
            }

            // Reset the keys of the remaining arrays
            else {
                $data[$i]['keywordsInContext'] = array_values($matchedColumn['keywordsInContext']);
                $data[$i]['keywordPosInContext'] = array_values($matchedColumn['keywordPosInContext']);
            }
        }

        // Reset keys of $data and return the array
        return array_values($data);
    }

    // Function to get all the positions of a given keyword in a transcripted column (full match or phrase match, measured in words)
    private function getPositionsOfKeyword ($tokens, $keyword, $queryAlg): array {

        // Array, which will be returned
        $keywordPositions = [];

        // Check every word of the list of words, if it matches the keyword
        for ($i=0; $i<count($tokens); $i++) {

            // First, clean the word by erasing some special characters
            // $cleanWord = str_replace( array( '.', ',', ';', ':', "'"), '', $tokens[$i]);
            $token = $tokens[$i];

            // If query algorithm is phrase match, add position of a word to the keywordPositions-array,
            // if it contains the searched keyword as a substring
            if ($queryAlg == 'match_phrase_prefix') {
                if (substr_count($token, $keyword) !== 0) {
                    $keywordPositions[] = $i;
                }
            }

            // If query algoritm is match, add position of a word to the keywordPositions-array,
            // if word in transcript is identical to the searched keyword – this is the place, where words with hyphens won't match!
            elseif ($queryAlg = 'match') {
                if ($token == $keyword) {
                    $keywordPositions[] = $i;
                }
            }
        }

        return $keywordPositions;
    }

    // Function to get the surrounding context of a given keyword (via keywordPosition) in a given transcript
    private function getContextOfKeyword ($tokens, $keywordPos, $cSize = 100): array
    {
        // Get total number of words in the transcript
        $numWords = count($tokens);

        // Get a list of all preceding and all succeeding words of the keyword at keywordPosition – get the sizes of these lists
        $precWords = array_slice($tokens, 0, $keywordPos);
        $sucWords = array_slice($tokens, $keywordPos+1, $numWords);
        $numPrecWords = count($precWords);
        $numSucWords = count($sucWords);

        // Get the keyword at the given keywordPosition into an array and use this array in the next step to add the context to it
        // Declare variable, which holds the keyword position relative to the total number of words in the keywordInContext-array
        $keywordUnlemmatized = $tokens[$keywordPos];
        $keywordInContext = [$keywordUnlemmatized];
        $keywordPosInContext = 0;

        // Add as many preceding words to the keywordInContext-array, as the total number of preceding words and the desired context size allows
        for ($i=0; ($i<$cSize) and ($i<$numPrecWords); $i++) {
            array_unshift($keywordInContext, array_reverse($precWords)[$i]);
            $keywordPosInContext = $keywordPosInContext + 1;
        }

        // Add as many succeeding words to the keywordInContext-array, as the total number of succeeding words and the desired context size allows
        for ($i=0; ($i<$cSize) and ($i<$numSucWords); $i++) {
            $keywordInContext[] = $sucWords[$i];
        }

        // Remove blanks before punctuation
        /*$keywordInContext = str_replace(" .", ".", $keywordInContext);
        $keywordInContext = str_replace(" ,", ",", $keywordInContext);
        $keywordInContext = str_replace(" [ ", "[", $keywordInContext);
        $keywordInContext = str_replace(" ] ", "]", $keywordInContext);*/

        return [$keywordInContext, $keywordPosInContext, $keywordUnlemmatized];
    }

    // Function to get a full list of i. e. titles or transcribers values in the index – i. e. set the $category argument to 'title'
    private function getListFromIndex ($client, $indexName, $category) {

        // Array to return
        $values = [];

        // Make a match_all query
        $query = $client->search([
            'index' => $indexName,
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
        $indexName = 'transcripts';

        // Instantiae OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
        }

        // Get a list of all titles
        $titles =  $this->getListFromIndex($client, $indexName, 'title');

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
        $indexName = 'transcripts';

        // Instantiate OpenSearch client
        try {
            $client = $this->instantiateClient();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['serverTime' => $now, 'status' => $status]);
        }

        // Get a list of all transcribers
        $transcribers =  $this->getListFromIndex($client, $indexName, 'transcriber');

        // Api Response
        return $this->responseWithJson($response, [
            'transcribers' => $transcribers,
            'serverTime' => $now,
            'status' => $status]);
    }
}
