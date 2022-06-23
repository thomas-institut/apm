<?php
namespace APM\Api;

use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

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

        // Get user input and make it lower case to make it fit for the getContext function (?)
        $keyword = strtolower($_POST['searchText']);

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

        // Search for keyword in three chosen fields of the OpenSearch index
        $query = $client->search([
            'index' => $indexName,
            'body' => [
                'size' => 10000,
                'query' => [
                    'match_phrase_prefix' => [
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
                $keywordFreq = substr_count ($transcripts[$i], $keyword) + substr_count ($transcripts[$i], ucfirst($keyword));

                // Get case sensitive keywords and their positions in the transcript for every occurence of the searched keyword
                $csKeywordsWithPos = $this->getCaseSensitiveKeywordsWithPositions($keyword, $transcripts[$i], $keywordFreq);

                // Get context of every occurence of the keyword and append it to the $keywordsInContext array
                $keywordsInContext = [];

                foreach ($csKeywordsWithPos as $csKeywordWithPos) {
                    $keywordInContext = $this->getContext($transcripts[$i], $csKeywordWithPos[1]);
                    $keywordsInContext[] = $keywordInContext;
                }

                // Add data of every match to the matches array, which will become an array of arrays – each array holds the data of a match
                $matches[$i] = [
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

        return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $matches, 'serverTime' => $now, 'status' => $status]);
    }

    private function getCaseSensitiveKeywordsWithPositions ($keyword, $transcript, $keywordFreq) {

        // Create an array $csKeywordsWithPos, which contains arrays of the form [case sensitive keyword, position in transcript] and a position index $pos
        $csKeywordsWithPos = [];
        $pos = 0;

        // Iterate $keywordFreq times
        for ($j=0; $j < $keywordFreq; $j++) {

            // First time, get the whole transcript, in every iteration get a sliced version, which excludes preceding occurences of the keyword
            $transcript = substr($transcript, $pos);

            // Get position of next lower case occurence and next upper case occurence of the keyword
            $lowerCasePos = strpos($transcript, $keyword);
            $upperCasePos = strpos($transcript, ucfirst($keyword));

            // Check if next occurence of the keyword is lower case or upper case
            if ($lowerCasePos !== false and $lowerCasePos < $upperCasePos or $upperCasePos == false) {

                // Append nearest uncapitalized keyword with its position to $csKeywordsWithPos array
                $csKeywordsWithPos[$j] = [$keyword, $pos + $lowerCasePos];

                // Calculate offset for slicing transcript
                $pos = $pos + $lowerCasePos + strlen($keyword);
            }
            else {

                // Append nearest capitalized keyword with its position to $csKeywordsWithPos array
                $csKeywordsWithPos[$j] = [ucfirst($keyword), $pos + $upperCasePos];

                // Calculate offset for slicing transcript
                $pos = $pos + $upperCasePos + strlen($keyword);
            }
        }

        return $csKeywordsWithPos;
    }

    // Function to get the surrounding context of a keyword
    private function getContext ($transcript, $pos, $cSize = 100): string
    {

        // Get position of the keyword
        // $pos = strpos($transcript, $keyword);

        $preChars = ""; // Will hold the preceding characters (words) of the keyword
        $sucChars = ""; // Will hold the succeeding characters (words) of the keyword
        $numPreChars = $pos-1;
        $numSucChars = strlen($transcript)-$pos;

        // Get the characters (words) that precede the keyword
        for ($i=1; $i<$cSize; $i++) {

            // Get next character, if there is one
            if ($i<$numPreChars) {
              $char = $transcript[$pos-$i];
              }
              else {
                 break;
             }

            // Stop getting more context, if some preceding characters have already been catched and the current character is a period
            if ($i>($cSize*0.2) && $char== ".") {
                if (substr($preChars, -1) == " ") { // remove blank space at the end of $prechars, if necessary
                    $preChars = substr($preChars, 0, -1);
                }
                break;
            }

            // Stop getting more context, if many preceding characters have already been catched and the current character is whitespace or colons
            if ($i>($cSize*0.7) and ($char == " " or $char == ":")) {
                $preChars = $preChars . "...";
                break;
            }

            // Append new character to preceding context
            $preChars = $preChars . $char;
        }

        // Get the words, that succeed the keyword (including itself)
        for ($i=0; $i<$cSize; $i++) {

            // Get the next character, if there is one
            if ($i<$numSucChars) {
                $char = $transcript[$pos+$i];
            }
            else {
                break;
            }


            // Stop getting more context, if many succeeding characters are already catched and the current character is whitespace. colons or comma
            if ($i>($cSize*0.7) and ($char == " " or $char  == ":" or $char == ",")) {
                $sucChars = $sucChars . "...";
                break;
            }

            // Append new character to succeeding context
            $sucChars = $sucChars . $char;

            // Stop getting more context, if some succeeding characters are already catched and the current character is a period
            if ($i>($cSize*0.2) and $char == ".") {
                break;
            }

        }

        // Unite the preceding and following words
        $keywordWithContext = strrev($preChars) . $sucChars;

        return $keywordWithContext;
    }
}

