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

        // Status variable for communicating errors in the api response – has no effect right now?
        $status = 'OK';
        // Get current time, which will be returned in the api response
        $now = TimeString::now();

        // Get all the user input and convert keyword to lower-case for better handling in following code (esp. for the getPositionsOfKeyword-function)
        $keyword = strtolower($_POST['searchText']);
        $cSize = $_POST['sliderVal'];
        $docName = $_POST['docName'];

        // Remove additional blanks before, after or in between keywords – necessary for a clean search and position/context-handling, also in js (?)
        $keyword = $this->removeAdditionalBlanks($keyword);

        // Instantiate OpenSearch client
        try {
            $client = (new \OpenSearch\ClientBuilder())
                ->setHosts(['https://localhost:9200'])
                ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => [], 'serverTime' => $now, 'status' => $status]);
        }

        // Choose query algorithm, depending on the length of the keyword
        $keywordLen = strlen($keyword);

        if ($keywordLen < 4) {
            $queryAlg = 'match';
        }
        else {
            $queryAlg = 'match_phrase_prefix';
        }

        // Query all columns of the index!
        $query = $this->queryIndex($client, $indexName, $keyword, $queryAlg);

        // Get all information about the matches
        $info = $this->getInfoAboutMatches($query, $docName, $keyword, $queryAlg, $cSize);

        return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $info, 'serverTime' => $now, 'status' => $status]);
    }

    // Function to query a given OpenSearch-index
    private function queryIndex ($client, $indexName, $keyword, $queryAlg) {
        
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

        return $query;
    }

    // Get all information about matches, specified for a single document or all documents
    private function getInfoAboutMatches ($query, $docName, $keyword, $queryAlg, $cSize) {

        $info = [];
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

                // Make a list of words out of the transcript, which is used in following functions
                // Therefore every line break in the transcript has to be replaced by a blank
                // Sometimes, I think, there are two words treated as one, but this does not disturb anything until now
                $cleanTranscript = str_replace("\n", " ", $transcript);
                $words = explode(" ", $cleanTranscript);

                // Get all lower-case and all upper-case keyword positions in the current column (measured in words)
                $keywordPositionsLC = $this->getPositionsOfKeyword($words, $keyword, $queryAlg);
                $keywordPositionsUC = $this->getPositionsOfKeyword($words, ucfirst($keyword), $queryAlg);

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
                    $keywordInContext = $this->getContextOfKeyword($words, $keywordPos, $cSize);
                    $keywordsInContext[] = $keywordInContext[0];
                    $keywordPosInContext[] = $keywordInContext[1];
                }

                // Add all information about the matched column to the matches array, which will become an array of arrays –
                // each array contains the information about a single column.

                // The check for keywordFreq seems redundant, but is necessary, because the getPositionsOfKeyword-functions is more strict than the query
                // in OpenSearch. It could be, that keywordFreq is 0 for a column, which does contain a match according to the OpenSearch-algorithm.
                // This is because the latter matches words wih hyphens, i. e. "res-", if the searched keyword is actually "res" –
                // in the getPositionsOfKeyword-function this is corrected and not treated as a match.

                // Collect matches in all columns
                if ($docName == 'Search in all documents...' and $keywordFreq !== 0) {
                    $info[] = [
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
                    $info[] = [
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
            return $info;
        }
        return $info;
    }

    // Function to get all the positions of a given keyword in a transcripted column (full match or phrase match, measured in words)
    private function getPositionsOfKeyword ($words, $keyword, $queryAlg): array {

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
    private function getContextOfKeyword ($words, $keywordPos, $cSize = 100): array
    {
        // Get total number of words in the transcript
        $numWords = count($words);

        // Get a list of all preceding and all succeeding words of the keyword at keywordPosition – get the sizes of these lists
        $precWords = array_slice($words, 0, $keywordPos);
        $sucWords = array_slice($words, $keywordPos+1, $numWords);
        $numPrecWords = count($precWords);
        $numSucWords = count($sucWords);

        // Get the keyword at the given keywordPosition into an array and use this array in the next step to add the context to it
        // Declare variable, which holds the keyword position relative to the total number of words in the keywordInContext-array
        $keywordInContext = [$words[$keywordPos]];
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

        return [$keywordInContext, $keywordPosInContext];
    }

    private function removeAdditionalBlanks ($string) {

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
}

