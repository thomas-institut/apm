<?php
namespace APM\Api;

use phpDocumentor\Reflection\Types\Null_;
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
                    'match' => [
                        'transcript' => [
                            "query" => $keyword,
                            "analyzer" => "standard"
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

                $results[$i] = ['title' => $titles[$i], 'page' => $pages[$i], 'transcriber' => $transcribers[$i], 'pageID' => $pageIDs[$i], 'docID' => $docIDs[$i], 'transcript' => $transcripts[$i]];
            }
        }

        print_r ($results[0]);
        echo ($numMatches);

        $test = "Hello John, Hey";
        $pos = strpos($test, "john");
        echo($pos == true);
        return true;
    }

    search('intellegere');


