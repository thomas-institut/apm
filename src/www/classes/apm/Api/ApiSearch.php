<?php
namespace APM\Api;

use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;
use function DI\string;

require '/home/lukas/apm/vendor/autoload.php';

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

        // Array, which will be returned in the api response
        $matches = [];
        // Status variable for communicating errors in the api response – has no effect right now?
        $status = 'OK';
        // Get current time, which will be returned in the api response
        $now = TimeString::now();

        // Get all the user input and convert keyword to lower-case for better handling in following code (esp. for the getKeywordPositions-function)
        $keyword = strtolower($_POST['searchText']);
        $cSize = $_POST['sliderVal'];
        $docName = $_POST['docName'];

        // Get length of keyword for choosing the right query algorithm
        $keywordLen = strlen($keyword);

        /* Remove additional whitespace before, after or in between keywords – this is necessary for a clean search
        and an adequate calculation of the surrounding context of the keyword with the getContext-function */

        // Reduce multiple blanks following each other anywhere in the keyword to one single blank
        $keyword = preg_replace('!\s+!', ' ', $keyword);

        // Remove blank at the end of the keyword
        if (substr($keyword, -1) == " ") {
                $keyword = substr($keyword, 0, -1);
            }

        // Remove blank at the beginning of the keyword
        if (substr($keyword, 0, 1) == " ") {
                $keyword = substr($keyword, 1);
            }

        // Instantiate OpenSearch client
        try {
            $client = (new \OpenSearch\ClientBuilder())
                ->setHosts(['https://localhost:9200'])
                ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $matches, 'serverTime' => $now, 'status' => $status]);
        }

        // Choose query algorithm, depending on the length of the keyword
        if ($keywordLen < 4) {
            $queryAlg = 'match';
        }
        else {
            $queryAlg = 'match_phrase_prefix';
        }

        // Query all columns in the index!
        $query = $client->search([
            'index' => $indexName,
            'body' => [
                'size' => 10000,
                'query' => [
                    $queryAlg => [
                        'transcript' => [
                            "query" => $keyword
                            // "analyzer" => "standard"
                            // "slop" => 0
                            // "max_expansions" => 10
                            ]
                    ]
                ]
            ]
        ]);

        // Count the number of matched columns
        $numMatches = $query['hits']['total']['value'];

        // If there are any matched columns, collect them all in an ordered array, using the arrays declared at the beginning of the function
        if ($numMatches !== 0) {
            for ($i = 0; $i < $numMatches; $i++) {

                // Get document title, page number, column number, transcriber, transcript, docID and pageID
                // of every matched column in the OpenSearch index
                $title = $query['hits']['hits'][$i]['_source']['title'];
                $page = $query['hits']['hits'][$i]['_source']['page'];
                $column = $query['hits']['hits'][$i]['_source']['column'];
                $transcriber = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcript = $query['hits']['hits'][$i]['_source']['transcript'];
                $docID = $query['hits']['hits'][$i]['_source']['docID'];
                $pageID = $query['hits']['hits'][$i]['_id'];

                // Make a list of words out of the transcript, which is used in following functions
                // Therefore every line break in the transcript has to be replaced by a blank
                $cleanTranscript = str_replace("\n", " ", $transcript);
                $words = explode(" ", $cleanTranscript);

                // Get all lower-case and all upper-case keyword positions in the current column (measured in words)
                $keywordPositionsLC = $this->getKeywordPositions($words, $keyword, $queryAlg);
                $keywordPositionsUC = $this->getKeywordPositions($words, ucfirst($keyword), $queryAlg);

                // Sort the keywordPositions to have them in ascending order like they appear in the manuscript –
                // this, of course, is only effective if there is more than one occurence of the keyword in the column
                $keywordPositions = array_merge($keywordPositionsLC, $keywordPositionsUC);
                sort($keywordPositions);

                // Get total keyword frequency in matched column
                $keywordFreq = count($keywordPositions);

                // Get surrounding context of every occurence of the keyword in the matched column as a string
                // and append it to the keywordsInContext-array
                $keywordsInContext = [];
                $keywordPosInContext = [];

                foreach ($keywordPositions as $keywordPos) {
                    $keywordInContext = $this->getContext($words, $keywordPos, $cSize);
                    $keywordsInContext[] = $keywordInContext[0];
                    $keywordPosInContext[] = $keywordInContext[1];
                }

                // Add all information about the matched column to the matches array, which will become an array of arrays –
                // each array contains the information about a single column.

                // The check for keywordFreq seems redundant, but is necessary, because the getKeywordPositions-functions is more strict than the query
                // in OpenSearch. It could be, that keywordFreq is 0 for a column, which does contain a match according to the OpenSearch-algorithm.
                // This is because the latter matches words wih hyphens, i. e. "res-", if the searched keyword is actually "res" –
                // in the getKeywordPositions-function this is corrected and not treated as a match.

                // Collect matches in all columns
                if ($docName == 'Search in all documents...' and $keywordFreq !== 0) {
                    $matches[] = [
                        'title' => $title,
                        'page' => $page,
                        'column' => $column,
                        'transcriber' => $transcriber,
                        'pageID' => $pageID,
                        'docID' => $docID,
                        'transcript' => $transcript,
                        'keywordFreq' => $keywordFreq,
                        'keywordsInContext' => $keywordsInContext,
                        'keywordPosInContext' => $keywordPosInContext
                    ];
                }
                // Collect matched columns only for a specified document title
                elseif ($title == $docName and $keywordFreq !== 0) {
                        $matches[] = [
                            'title' => $title,
                            'page' => $page,
                            'column' => $column,
                            'transcriber' => $transcriber,
                            'pageID' => $pageID,
                            'docID' => $docID,
                            'transcript' => $transcript,
                            'keywordFreq' => $keywordFreq,
                            'keywordsInContext' => $keywordsInContext,
                            'keywordPosInContext' => $keywordPosInContext
                        ];
                }
            }
        }

        return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $matches, 'serverTime' => $now, 'status' => $status]);
    }

    // Function to get all the positions of a given keyword in a transcripted column (full match or phrase match, measured in words)
    private function getKeywordPositions ($words, $keyword, $queryAlg): array {

        // Array, which will be returned
        $keywordPositions = [];

        // Check every word of the list of words, if it matches the keyword
        for ($i=0; $i<count($words); $i++) {

            // First, clean the word by erasing some special characters
            $cleanWord = str_replace( array( '.', ',', ';', ':', "'"), '', $words[$i]);

            // If query algorithm is phrase match, add position of a word to the keywordPositions-array,
            // if it contains the searched keyword as a substring
            if ($queryAlg == 'match_phrase_prefix') {
                if (substr_count($cleanWord, $keyword) !== 0) {
                    $keywordPositions[] = $i;
                }
            }

            // If query algoritm is match, add position of a word to the keywordPositions-array,
            // if word in transcript is identical to the searched keyword – this is the place, where words with hyphens won't match!
            elseif ($queryAlg = 'match') {
                if ($cleanWord == $keyword) {
                    $keywordPositions[] = $i;
                }
            }
        }

        return $keywordPositions;
    }

    // Function to get the surrounding context of a given keyword (via keywordPosition) in a given transcript
    private function getContext ($words, $keywordPos, $cSize = 100): array
    {
        // Get total number of words in the transcript
        $numWords = count($words);

        // Get a list of all preceding and all succedding words of the keyword at keywordPosition – get the sizes of these lists
        $precWords = array_slice($words, 0, $keywordPos);
        $sucWords = array_slice($words, $keywordPos+1, $numWords);
        $numPrecWords = count($precWords);
        $numSucWords = count($sucWords);

        // Get the keyword at the given keywordPosition and use this string in the next step to add context to it
        $keywordInContext = $words[$keywordPos];

        // Add as many preceding words to the keywordInContext-string, as the total number of preceding words and the desired context size allows
        $keywordPosInContext = 0;

        for ($i=0; ($i<$cSize) and ($i<$numPrecWords); $i++) {
            $keywordInContext = array_reverse($precWords)[$i] . " " . $keywordInContext;
            $keywordPosInContext = $keywordPosInContext + 1;
        }

        // Add as many succeeding words to the keywordInContext-string, as the total number of succeeding words and the desired context size allows
        for ($i=0; ($i<$cSize) and ($i<$numSucWords); $i++) {
            $keywordInContext = $keywordInContext . " " . $sucWords[$i];
        }

        return [$keywordInContext, $keywordPosInContext];
    }
}

