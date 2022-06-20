<?php
namespace APM\Api;

use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

set_time_limit(5); // Script should not run longer than 5 seconds - does this work like this?

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

        // Get user input and current time
        $keyword = $_POST['searchText'];
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
                    'multi_match' => [
                        'query' => $keyword,
                        'fields' => ['title', 'transcriber', 'transcript']
                    ]
                ]
            ]
        ]);

        // Count the number of matches
        $numMatches = $query['hits']['total']['value'];

        // If there are any matches, collect them all in an ordered array
        if ($numMatches != 0) {
            for ($i = 0; $i < $numMatches; $i++) {

                // Get title, page number, transcriber, transcript, docID and pageID of every matched entry in the OpenSearch index
                $titles[$i] = $query['hits']['hits'][$i]['_source']['title'];
                $pages[$i] = $query['hits']['hits'][$i]['_source']['page'];
                $columns[$i] = $query['hits']['hits'][$i]['_source']['column'];
                $transcribers[$i] = $query['hits']['hits'][$i]['_source']['transcriber'];
                $transcripts[$i] = $query['hits']['hits'][$i]['_source']['transcript'];
                $docIDs[$i] = $query['hits']['hits'][$i]['_source']['docID'];
                $pageIDs[$i] = $query['hits']['hits'][$i]['_id'];

                // Get context of match, if it is a match in the transcript
                $matchWithContext = "";
                if (strpos($transcripts[$i], $keyword) !== false) {
                    $transcript = $transcripts[$i];
                    $matchWithContext = $this->getContext($transcript, $keyword);
                }

                // Add data of every match to the matches array, which will become an array of arrays – each array holds the data of a match
                $matches[$i] = ['title' => $titles[$i], 'page' => $pages[$i], 'column' => $columns[$i], 'transcriber' => $transcribers[$i], 'pageID' => $pageIDs[$i], 'docID' => $docIDs[$i], 'transcript' => $transcripts[$i], 'context' => $matchWithContext];
            }
        }

        return $this->responseWithJson($response, ['searchString' => $keyword,  'matches' => $matches, 'serverTime' => $now, 'status' => $status]);
    }

    private function getContext ($transcript, $keyword) {
        $pos = strpos($transcript, $keyword);
        $precedingWords = "";
        $followingWords = "";

        for ($i=0; $i<80; $i++) {
            $precedingWords = $precedingWords . $transcript[$pos-($i+1)];
            $followingWords = $followingWords . $transcript[$pos+$i];
        }

        $keywordWithContext = strrev($precedingWords) . $followingWords;
        return $keywordWithContext;
    }
}

