<?php
namespace APM\Api;

use phpDocumentor\Reflection\Types\Null_;
use phpDocumentor\Reflection\Types\This;
use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

set_time_limit(5); // Script should not run longer than 5 seconds - does this work like this?



function search($word)
    {

        // Arrays for structuring queried data
        $titles = [];
        $pages = [];
        $transcribers = [];
        $pageIDs = [];
        $docIDs = [];
        $transcripts = [];

        $results = [];

        // Variable for communicating errors
        $status = 'OK';

        // Get user input and current time
        $keyword = $word;

        // Choose query type
        if (strlen($keyword) < 4) {
            $queryAlg = 'match';
        }
        else {
            $queryAlg = 'match_phrase_prefix';
        }

        // Setup OpenSearch php client
        try {
            $client = (new \OpenSearch\ClientBuilder())
                ->setHosts(['https://localhost:9200'])
                ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return false;
        }

        // Set the name of the index
        $indexName = 'transcripts';

        // Query the index
        $query = $client->search([
            'index' => $indexName,
            'body' => [
                'size' => 10000,
                'query' => [
                    $queryAlg => [
                        'transcript' => [
                            "query" => $keyword
                            // "analyzer" => "standard"
                        ]
                    ]
                ]
            ]
        ]);

        $numMatches = $query['hits']['total']['value'];

        // Collect all matches in an ordered array
        if ($numMatches != 0) {
            for ($i = 0; $i < $numMatches; $i++) {
                $titles[$i] = $query['hits']['hits'][$i]['_source']['title'];
                $pages[$i] = $query['hits']['hits'][$i]['_source']['page'];
                $transcribers[$i] = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcripts[$i] = $query['hits']['hits'][$i]['_source']['transcript'];
                $docIDs[$i] = $query['hits']['hits'][$i]['_source']['docID'];
                $pageIDs[$i] = $query['hits']['hits'][$i]['_id'];
                $keywordFreq = substr_count ($transcripts[$i], $keyword) + substr_count ($transcripts[$i], ucfirst($keyword));

                // Create an array $csKeywordsWithPos with pairs in the following form [case sensitive keyword, position in transcript]
                $csKeywordsWithPos = getCaseSensitiveKeywordsWithPositions($keyword, $transcripts[$i], $keywordFreq);

                // Get all keyword positions in the current column (measured in words)
                $keywordPositions = getKeywordPositions($transcripts[$i], $keyword);

                // Get context of every occurence of the keyword
                $keywordsInContext = [];

                foreach ($keywordPositions as $pos) {
                    $keywordInContext = getContext2($transcripts[$i], $pos);
                    $keywordsInContext[] = $keywordInContext;
                }

                $results[$i] = [
                    'title' => $titles[$i],
                    'page' => $pages[$i],
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

        // print_r($results);
        // echo ($numMatches);

        return true;
    }

function getCaseSensitiveKeywordsWithPositions ($keyword, $transcript, $keywordFreq) {

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

function getKeywordPositions ($transcript, $keyword): array {

    $keywordPositions = [];
    $words = explode(" ", $transcript);

    for ($i=0; $i<count($words); $i++) {
        if (strpos($words[$i], $keyword) !== false) {
            $keywordPositions[] = $i;
        }
    }
    print_r($keywordPositions);
    return $keywordPositions;
}

function array_search_partial($arr, $keyword) {
    foreach($arr as $index => $string) {
        if (strpos($string, $keyword) !== FALSE)
            return $index;
    }
    return false;
}

function getContext2 ($transcript, $keywordPos, $cSize = 10): string
{
    $words = explode(" ", $transcript);
    // $keywordPos = array_search_partial($words, $keyword);
    $numWords = count($words);
    $numPrecWords = $keywordPos;
    $numSucWords = $numWords - $keywordPos;
    $precWords = array_slice($words, 0, $keywordPos);
    $sucWords = array_slice($words, $keywordPos+1, $numWords);
    $keywordInContext = $words[$keywordPos];

    for ($i=0; ($i<$cSize) and ($i<$numPrecWords); $i++) {
        $keywordInContext = array_reverse($precWords)[$i] . " " . $keywordInContext;
    }

    for ($i=0; ($i<$cSize) and ($i<$numSucWords); $i++) {
        $keywordInContext = $keywordInContext . " " . $sucWords[$i];
    }

    print_r ($keywordInContext . "-------------------------------------");

    return $keywordInContext;
}

function getContext ($transcript, $pos, $cSize = 100): string
{

    // Get position of the keyword
    // $pos = strpos($transcript, $keyword);

    $preChars = ""; // Will hold the preceding characters (words) of the keyword
    $sucChars = ""; // Will hold the succeeding characters (words) of the keyword
    $numPreChars = $pos;
    $numSucChars = strlen($transcript)-$pos;

    // Get the characters (words) that precede the keyword
    for ($i=1; $i<$cSize; $i++) {

        // Get next character, if there is one
        if ($i<$numPreChars) {
            $char = $transcript[$pos-$i];
        }
        else {
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
            break;
        }

        // Stop getting more context, if some preceding characters have already been catched and the current character is a period
        if ($i>($cSize*0.2) && $char== ".") {
            if (substr($preChars, -1) == " ") { // remove blank space at the end of $prechars, if necessary
                $preChars = substr($preChars, 0, -1);
            }
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
            break;
        }

        // Stop getting more context, if many preceding characters have already been catched and the current character is whitespace or colons
        if ($i>($cSize*0.7) and ($char == " " or $char == ":")) {
            $preChars = $preChars . "...";
            $preChars = strrev($preChars); // Reverse string to have characters (words) in right order
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

    return $preChars . $sucChars;
}


search('philosophum');


