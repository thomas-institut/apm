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

    public function search(Request $request, Response $response): Response
    {

        // Arrays as containers for queried data
        $titles = [];
        $pages = [];
        $columns = [];
        $transcribers = [];
        $pageIDs = [];
        $docIDs = [];
        $transcripts = [];

        // Array, which will be contained in the api response
        $matches = [];

        // Status variable for communicating errors – has no effect right now?
        $status = 'OK';

        // Get user input and make it lower case to make it fit for the getContext function (?) – get keywordLen for varying query type
        $keyword = strtolower($_POST['searchText']);
        $cSize = $_POST['sliderVal'];
        $docName = $_POST['docName'];
        $keywordLen = strlen($keyword);

        /* Remove disturbing whitespace before, after or in between keywords
        This is necessary for a clean search and adequate calculation of the context with the getContext-function */

        $keyword = preg_replace('!\s+!', ' ', $keyword); // Reduce multiple blanks following each other to one
        if (substr($keyword, -1) == " ") { // Remove whitespace at the end of the keyword
                $keyword = substr($keyword, 0, -1);
            }
        if (substr($keyword, 0, 1) == " ") { // Remove whitespace at the beginning of the keyword
                $keyword = substr($keyword, 1);
            }

        // Get current time
        $now = TimeString::now();

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

        // Set the name of the index, that should be queried
        $indexName = 'transcripts';

        // Choose query type
        if ($keywordLen < 4) {
            $queryAlg = 'match';
        }
        else {
            $queryAlg = 'match_phrase_prefix';
        }

        // Search for keyword in the transcripts, which are indexed in OpenSearch
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

        // Count the number of matches
        $numMatches = $query['hits']['total']['value'];

        // If there are any matches, collect them all in an ordered array
        if ($numMatches !== 0) {
            for ($i = 0; $i < $numMatches; $i++) {

                // Get document title, page number, transcriber, transcript, docID, pageID and the keyword frequency of every matched column in the OpenSearch index
                $titles[$i] = $query['hits']['hits'][$i]['_source']['title'];
                $pages[$i] = $query['hits']['hits'][$i]['_source']['page'];
                $columns[$i] = $query['hits']['hits'][$i]['_source']['column'];
                $transcribers[$i] = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcripts[$i] = $query['hits']['hits'][$i]['_source']['transcript'];
                $docIDs[$i] = $query['hits']['hits'][$i]['_source']['docID'];
                $pageIDs[$i] = $query['hits']['hits'][$i]['_id'];

                // Get all keyword positions in the current column (measured in words)
                // and sort the keywordPositions to have the positions in ascending order like they appear in the manuscript (if there is more than one occurence)
                $keywordPositionsLC = $this->getKeywordPositions($transcripts[$i], $keyword);
                $keywordPositionsUC = $this->getKeywordPositions($transcripts[$i], ucfirst($keyword));
                $keywordPositions = array_merge($keywordPositionsLC, $keywordPositionsUC);
                sort($keywordPositions);

                // Get keyword frequency in current column
                $keywordFreq = count($keywordPositions);

                // Get case sensitive keywords and their positions in the transcript for every occurence of the searched keyword
                $csKeywordsWithPos = $this->getCaseSensitiveKeywordsWithPositions($keyword, $transcripts[$i], $keywordFreq);

                // Get context of every occurence of the keyword and append it to the $keywordsInContext array
                $keywordsInContext = [];

                foreach ($keywordPositions as $pos) {
                    $keywordInContext = $this->getContext($transcripts[$i], $pos, $cSize);
                    $keywordsInContext[] = $keywordInContext;
                }

                // Add data of every match to the matches array, which will become an array of arrays – each array holds the data of a match
                if ($docName == 'Search in all documents...') {
                    $matches[] = [
                        'title' => $titles[$i],
                        'page' => $pages[$i],
                        'column' => $columns[$i],
                        'transcriber' => $transcribers[$i],
                        'pageID' => $pageIDs[$i],
                        'docID' => $docIDs[$i],
                        'transcript' => $transcripts[$i],
                        'keywordFreq' => $keywordFreq,
                        'csKeywordsWithPos' => $csKeywordsWithPos,
                        'keywordsInContext' => $keywordsInContext
                    ];
                }
                else {
                    if ($titles[$i] == $docName) {
                        $matches[] = [
                            'title' => $titles[$i],
                            'page' => $pages[$i],
                            'column' => $columns[$i],
                            'transcriber' => $transcribers[$i],
                            'pageID' => $pageIDs[$i],
                            'docID' => $docIDs[$i],
                            'transcript' => $transcripts[$i],
                            'keywordFreq' => $keywordFreq,
                            'csKeywordsWithPos' => $csKeywordsWithPos,
                            'keywordsInContext' => $keywordsInContext
                        ];
                    }
                }
            }
        }

        // print_r($matches);

        return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $matches, 'serverTime' => $now, 'status' => $status]);
    }

    private function getCaseSensitiveKeywordsWithPositions ($keyword, $transcript, $keywordFreq) {

        // Create an array $csKeywordsWithPos, which contains arrays of the form [case sensitive keyword, position in transcript] and a position index $pos
        $csKeywordsWithPos = [];
        $pos = 0;
        $shift = 0;

        // Iterate $keywordFreq times
        for ($j=0; $j < $keywordFreq; $j++) {

            // First time, get the whole transcript, in every iteration get a sliced version, which excludes preceding occurences of the keyword
            $transcript = substr($transcript, $shift);

            // Get position of next lower case occurence and next upper case occurence of the keyword
            $lowerCasePos = strpos($transcript, $keyword);
            $upperCasePos = strpos($transcript, ucfirst($keyword));

            // Check if next occurence of the keyword is lower case or upper case
            if (($lowerCasePos !== false and $lowerCasePos < $upperCasePos) or $upperCasePos == false) {

                // Append nearest uncapitalized keyword with its position to $csKeywordsWithPos array
                $csKeywordsWithPos[$j] = [$keyword, $pos + $lowerCasePos];

                // Calculate shift for slicing transcript
                $shift = $lowerCasePos + strlen($keyword);

                // Calculate new $pos relative to whole transcript
                $pos = $pos + $lowerCasePos + strlen($keyword);
            }
            else {

                // Append nearest capitalized keyword with its position to $csKeywordsWithPos array
                $csKeywordsWithPos[$j] = [ucfirst($keyword), $pos + $upperCasePos];

                // Calculate shift for slicing transcript
                $shift = $upperCasePos + strlen($keyword);

                // Calculate new $pos relative to whole transcript
                $pos = $pos + $upperCasePos + strlen($keyword);
            }
        }

        return $csKeywordsWithPos;
    }

    private function getKeywordPositions ($transcript, $keyword): array {

        $keywordPositions = [];
        $words = explode(" ", $transcript);

        for ($i=0; $i<count($words); $i++) {
            if (substr_count($words[$i], $keyword) !== 0) {
                $keywordPositions[] = $i;
            }
        }
        return $keywordPositions;
    }

    // Function to get the surrounding context of a keyword
    private function getContext ($transcript, $keywordPos, $cSize = 100): string
    {
        $words = explode(" ", $transcript);
        $numWords = count($words);
        $precWords = array_slice($words, 0, $keywordPos);
        $sucWords = array_slice($words, $keywordPos+1, $numWords);
        $numPrecWords = count($precWords);
        $numSucWords = count($sucWords);
        $keywordInContext = $words[$keywordPos];

        for ($i=0; ($i<$cSize) and ($i<$numPrecWords); $i++) {
            $keywordInContext = array_reverse($precWords)[$i] . " " . $keywordInContext;
        }

        for ($i=0; ($i<$cSize) and ($i<$numSucWords); $i++) {
            $keywordInContext = $keywordInContext . " " . $sucWords[$i];
        }

        return $keywordInContext;
    }
}

